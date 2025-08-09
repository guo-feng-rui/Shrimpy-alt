'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../../../firebase.config';
import { signOut, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { getUserDisplayName } from '@/lib/utils';
import { parseLinkedInCSV, validateConnections, getCSVPreview, generateSampleCSV, type Connection, type ParseResult } from '@/lib/csv-parser';
import { enrichConnectionData, testProfileParsing } from '@/lib/profile-parser';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';

import { storeConnections, getUserConnections, getConnectionStats, type StoredConnection } from '@/lib/firestore';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [previewData, setPreviewData] = useState<Connection[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [enrichedConnections, setEnrichedConnections] = useState<Connection[]>([]);
  const [storedConnections, setStoredConnections] = useState<StoredConnection[]>([]);
  const [connectionStats, setConnectionStats] = useState<{
    total: number;
    enriched: number;
    openToWork: number;
    hiring: number;
    byCompany: Record<string, number>;
    bySkills: Record<string, number>;
  } | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [input, setInput] = useState('');
  const router = useRouter();

  // Use the official useChat hook for proper streaming
  const { messages, sendMessage, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper function to add assistant message (for search results)
  const addAssistantMessage = (text: string) => {
    const assistantMessage = {
      id: Date.now().toString(),
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: text }],
    };
    setMessages(prev => [...prev, assistantMessage as any]);
  };

  // Helper function to generate AI-powered match reasoning
  const generateMatchReasons = async (searchQuery: string, breakdown: Record<string, number>, connection: Record<string, unknown>, matchedVectors: string[] = [], score: number) => {
    try {
      console.log('🤖 Generating AI reasoning for:', connection.name);
      
      const response = await fetch('/api/generate-match-reasoning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery,
          connection,
          breakdown,
          matchedVectors,
          overallScore: score
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.reasoning;
      } else {
        console.error('🤖 Failed to generate AI reasoning:', response.statusText);
        return `This connection matches your search with a ${Math.round(score)}% score based on profile analysis.`;
      }
    } catch (error) {
      console.error('🤖 Error generating AI reasoning:', error);
      return `This connection matches your search with a ${Math.round(score)}% score based on profile analysis.`;
    }
  };

  // Helper function to format search results with AI-generated reasoning
  const formatSearchResults = async (results: Array<Record<string, unknown>>, searchQuery: string) => {
    const formattedResults = await Promise.all(
      results.map(async (result) => {
        const connection = result.connection as Record<string, unknown>;
        const breakdown = result.breakdown as Record<string, number>;
        const matchedVectors = result.matchedVectors as string[] || [];
        const score = (((result.weightedScore as number) || (result.score as number)) * 100).toFixed(1);
        
        // Extract LinkedIn URL if available
        const linkedinUrl = connection.url || connection.profileUrl || connection.linkedinUrl;
        const nameWithLink = linkedinUrl 
          ? `**[${connection.name}](${linkedinUrl})**` 
          : `**${connection.name}**`;
        
        // Generate AI-powered match reasoning
        const matchReasons = await generateMatchReasons(
          searchQuery, 
          breakdown, 
          connection, 
          matchedVectors, 
          parseFloat(score)
        );
        
        return `${nameWithLink} (${score}% match):\n   ${matchReasons}`;
      })
    );
    
    return formattedResults.join('\n\n');
  };

  // AI-powered intent classification and search
  const classifyGoalAndSearch = async (messageContent: string, userId: string) => {
    try {
      console.log('🔍 Performing search for:', messageContent);
      console.time('🔍 Total search time');
      
      // Perform semantic search
      const searchResponse = await fetch(`/api/search-connections?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-test-token'
        },
        body: JSON.stringify({ 
          query: messageContent, 
          userId, 
          limit: 5,
          goal: {
            type: 'general',
            description: 'General networking',
            keywords: [],
            preferences: {}
          }
        })
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log('🔍 Search results:', searchData.results.length, 'connections found');
        
        if (searchData.results.length > 0) {
          const resultsText = await formatSearchResults(searchData.results, messageContent);
          console.log('🔍 Sending search results to chat:', resultsText.substring(0, 100) + '...');
          
          // Provide intelligent response based on results
          const topResult = searchData.results[0];
          const topScore = topResult.weightedScore * 100;
          
          let responseText = '';
          if (topScore > 70) {
            responseText = `🎯 **Great match!** I found ${searchData.results.length} relevant connections for your query:\n\n${resultsText}\n\n**Top match:** ${topResult.connection?.name} (${topScore.toFixed(1)}% match) - ${topResult.connection?.position} at ${topResult.connection?.company}`;
          } else if (topScore > 30) {
            responseText = `🔍 **Found some matches!** I found ${searchData.results.length} connections that might be relevant:\n\n${resultsText}\n\nWhile the match scores are moderate, these connections could still be valuable for your network.`;
          } else {
            responseText = `🔍 **Limited matches found.** I found ${searchData.results.length} connections, but the relevance scores are low:\n\n${resultsText}\n\nConsider broadening your search terms or uploading more connections data.`;
          }
          
          addAssistantMessage(responseText);
          console.timeEnd('🔍 Total search time');
          console.log('🔍 Search results sent to chat successfully');
        } else {
          console.log('🔍 No search results found, sending no results message');
          addAssistantMessage(`🔍 **No matches found** for your query. This could be because:\n\n• Your search terms are too specific\n• You haven't uploaded your LinkedIn connections yet\n• The connections don't match your criteria\n\n**Try:**\n• Broader search terms (e.g., "developers" instead of "React developers")  \n• Upload your LinkedIn connections first\n• Check if your connections have the skills/locations you're looking for`);
          console.timeEnd('🔍 Total search time');
        }
      } else {
        console.error('Search API failed:', searchResponse.status);
        console.timeEnd('🔍 Total search time');
        addAssistantMessage(`❌ **Search failed.** Please try again or contact support if the issue persists.`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      console.timeEnd('🔍 Total search time');
      addAssistantMessage(`❌ **Search failed.** Please try again or contact support if the issue persists.`);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Messages count:', messages.length);
  }, [messages.length]);
  

  const loadStoredData = useCallback(async () => {
    if (!user) return;
    
    try {
      // Temporarily skip loading connections and stats to avoid Firebase index errors
      console.log('📊 Skipping connection stats load (index building)');
      setStoredConnections([]);
      setConnectionStats({
        total: 0,
        enriched: 0,
        openToWork: 0,
        hiring: 0,
        byCompany: {},
        bySkills: {}
      });
    } catch (err) {
      console.error('Error loading stored data:', err);
      // Set default values to prevent UI errors
      setStoredConnections([]);
      setConnectionStats({
        total: 0,
        enriched: 0,
        openToWork: 0,
        hiring: 0,
        byCompany: {},
        bySkills: {}
      });
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        router.push('/login');
      } else {
        // Only show Quick Start Guide once per session
        const hasSeenQuickStart = sessionStorage.getItem('hasSeenQuickStart');
        if (!hasSeenQuickStart) {
        setShowQuickStart(true);
          sessionStorage.setItem('hasSeenQuickStart', 'true');
        }
        
        // Add welcome message - do this differently to avoid it appearing as user message
        if (messages.length === 0) {
          // We'll let the first user interaction trigger the welcome, not send it automatically
        }
        
        // Test profile parsing on load
        testProfileParsing();
        
        // Load stored connections and stats
        loadStoredData();
      }
    });

    return () => unsubscribe();
  }, [router, messages.length, loadStoredData]);



  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      setError(null);
      parseCSV(droppedFile);
    } else {
      setError('Please upload a valid CSV file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        console.log('=== CSV PARSING DEBUG ===');
        console.log('File name:', file.name);
        console.log('File size:', file.size);
        console.log('CSV content length:', csv.length);
        
        const result = parseLinkedInCSV(csv);
        const { valid } = validateConnections(result.connections);
        
        setParseResult(result);
        setConnections(valid);
        setPreviewData(getCSVPreview(valid, 5));
        
        if (result.errors.length > 0) {
          setError(`Parsed with ${result.errors.length} errors. ${result.validCount} valid connections found.`);
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('CSV parsing error:', err);
        setError('Error parsing CSV file. Please ensure it\'s a valid LinkedIn connections export.');
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!file || connections.length === 0) {
      setError('Please select a valid CSV file with connections');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSuccess(true);
      
      // Start automatic enrichment
      addAssistantMessage(`✅ Upload successful! ${connections.length} connections uploaded. Now automatically enriching profiles with detailed data...`);

      // Automatically enrich connections
      await handleEnrichConnections();
      
      // Store enriched connections in Firestore
      if (user) {
        try {
          await storeConnections(user.uid, enrichedConnections);
          addAssistantMessage(`💾 Data stored securely in the cloud! Your connections are now searchable and will persist across sessions.`);
          
          // Load stored connections and stats
          await loadStoredData();
        } catch (err) {
          console.error('Storage error:', err);
          addAssistantMessage(`⚠️ Data uploaded but storage failed. Your connections are still available for this session.`);
        }
      }
      
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleCSV = generateSampleCSV();
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-linkedin-connections.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleEnrichConnections = async () => {
    if (connections.length === 0) {
      setError('No connections to enrich. Please upload your LinkedIn data first.');
      return;
    }

    if (!user?.uid) {
      setError('Please make sure you are logged in to enrich profiles.');
      return;
    }

    setIsEnriching(true);
    setEnrichmentProgress(0);
    setError(null);

    try {
      // Filter connections that have URLs
      const connectionsWithUrls = connections.filter(conn => conn.url);
      
      if (connectionsWithUrls.length === 0) {
        setError('No connections with LinkedIn URLs found. Cannot enrich profiles.');
        setIsEnriching(false);
        return;
      }

      addAssistantMessage(`🔍 Starting to enrich ${connectionsWithUrls.length} connections with detailed profile data...`);

      // Enrich connections with progress updates
      const enriched = [];
      const batchSize = 3;
      
      for (let i = 0; i < connectionsWithUrls.length; i += batchSize) {
        const batch = connectionsWithUrls.slice(i, i + batchSize);
        
        // Process batch with delays only for API calls
        for (let j = 0; j < batch.length; j++) {
          const connection = batch[j];
          const result = await enrichConnectionData(connection, user?.uid);
          enriched.push(result.connection);
          
          // Update progress
          const currentProgress = Math.round(((i + j + 1) / connectionsWithUrls.length) * 100);
          setEnrichmentProgress(currentProgress);
          
          // Only add delay if it was an API call (not cache hit)
          if (!result.wasFromCache && j < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Add shorter delay between batches for cache hits
        if (i + batchSize < connectionsWithUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 2000ms
        }
      }
      
      setEnrichedConnections(enriched);
      setEnrichmentProgress(100);

      const successfulEnrichments = enriched.filter(conn => conn.enriched).length;
      
      addAssistantMessage(`✅ Successfully enriched ${successfulEnrichments} out of ${connectionsWithUrls.length} connections! You now have detailed profile data including skills, experience, and locations.`);

    } catch (err) {
      console.error('Enrichment error:', err);
      setError('Failed to enrich connections. Please try again.');
      addAssistantMessage('❌ Failed to enrich connections. This might be due to API rate limits or network issues. You can still use your basic connection data.');
    } finally {
      setIsEnriching(false);
    }
  };

  const resetUploadDialog = () => {
    setFile(null);
    setConnections([]);
    setPreviewData([]);
    setEnrichedConnections([]);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    setIsUploading(false);
    setIsDragOver(false);
    setParseResult(null);
  };




  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Weak-Tie Activator</h1>
              </div>
            </div>
            
                         <div className="flex items-center space-x-4">
               <div className="flex items-center">
               <Dialog open={showQuickStart} onOpenChange={setShowQuickStart}>
                 <DialogTrigger asChild>
                   <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                     <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     Quick Start
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-2xl">
                   <DialogHeader>
                     <DialogTitle className="text-2xl font-bold">Quick Start Guide</DialogTitle>
                     <DialogDescription>
                       Follow these steps to start using Weak-Tie Activator
                     </DialogDescription>
                   </DialogHeader>
                   <div className="space-y-6">
                     <div className="space-y-4">
                       <div className="flex items-start space-x-4">
                         <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                           1
                         </div>
                         <div>
                           <h4 className="font-semibold text-lg">Export LinkedIn Connections</h4>
                           <p className="text-gray-600">
                             Export your LinkedIn connections list as a CSV file
                           </p>
                         </div>
                       </div>
                       
                       <div className="flex items-start space-x-4">
                         <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                           2
                         </div>
                         <div>
                                 <h4 className="font-semibold text-lg">Upload & Enrich</h4>
                           <p className="text-gray-600">
                                   Upload the CSV file and we&apos;ll automatically enrich profiles with detailed data
                           </p>
                         </div>
                       </div>
                       
                       <div className="flex items-start space-x-4">
                         <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                           3
                         </div>
                         <div>
                          <h4 className="font-semibold text-lg">Chat with AI</h4>
                           <p className="text-gray-600">
                            Describe your goals in the chat and get personalized recommendations
                           </p>
                         </div>
                       </div>
                     </div>
                     
                     <div className="bg-blue-50 p-4 rounded-lg">
                       <h5 className="font-semibold text-blue-900 mb-2">💡 Pro Tips:</h5>
                       <ul className="text-sm text-blue-800 space-y-1">
                         <li>• Make sure your CSV file includes connection names and companies</li>
                         <li>• Be specific about your mission goals for better recommendations</li>
                         <li>• Review and reach out to your top recommendations within 24 hours</li>
                       </ul>
                     </div>
                     
                     <div className="flex justify-end">
                       <Button 
                         variant="outline" 
                           onClick={() => {
                             setShowQuickStart(false);
                             // Ensure the session storage is set to prevent reopening
                             sessionStorage.setItem('hasSeenQuickStart', 'true');
                           }}
                       >
                         Got it!
                       </Button>
                     </div>
                   </div>
                 </DialogContent>
               </Dialog>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="ml-2 text-gray-500 hover:text-gray-700"
                   onClick={() => {
                     sessionStorage.removeItem('hasSeenQuickStart');
                     setShowQuickStart(true);
                   }}
                   title="Reset Quick Start Guide"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                   </svg>
                 </Button>
               </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                 {user.photoURL && (
                   <img 
                     src={user.photoURL} 
                     alt="User avatar" 
                     className="w-8 h-8 rounded-full"
                   />
                 )}
                    <span className="text-sm text-gray-700 font-bold">{getUserDisplayName(user)}</span>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                 onClick={handleSignOut}
                    className="flex items-center space-x-2 text-red-600 focus:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
             </div>
          </div>
        </div>
      </nav>

      {/* Main Layout - Three Panels */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Sources/Actions */}
        <div className="w-80 bg-white border-r border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sources</h2>
          
          <div className="space-y-4">
            <Button 
              onClick={() => {
                resetUploadDialog();
                setShowUploadDialog(true);
              }}
              className="w-full justify-start"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload LinkedIn Data
            </Button>
            
                         <Button 
               onClick={() => router.push('/recommendations')}
               className="w-full justify-start"
               variant="outline"
             >
               <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
               </svg>
               View Recommendations
                         </Button>
          </div>

                     {(connections.length > 0 || storedConnections.length > 0) && (
             <div className="mt-6">
               <h3 className="text-sm font-medium text-gray-700 mb-2">Your Network</h3>
               <div className="space-y-3">
                 {connections.length > 0 && (
                   <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                     <div className="flex items-center">
                       <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <span className="text-sm text-green-800">{connections.length} connections loaded</span>
                     </div>
                   </div>
                 )}
                 
                 {enrichedConnections.length > 0 && (
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                     <div className="flex items-center">
                       <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                       </svg>
                       <span className="text-sm text-blue-800">
                         {enrichedConnections.filter(conn => conn.enriched).length} profiles enriched
                       </span>
                     </div>
                   </div>
                 )}
                 
                 {storedConnections.length > 0 && (
                   <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                     <div className="flex items-center">
                       <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                       </svg>
                       <span className="text-sm text-purple-800">{storedConnections.length} stored connections</span>
                     </div>
                   </div>
                 )}
                 
                 {connectionStats && (
                   <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                     <div className="space-y-2">
                       <div className="flex justify-between text-xs">
                         <span>Total:</span>
                         <span className="font-medium">{connectionStats.total}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                         <span>Enriched:</span>
                         <span className="font-medium">{connectionStats.enriched}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                         <span>Open to Work:</span>
                         <span className="font-medium">{connectionStats.openToWork}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                         <span>Hiring:</span>
                         <span className="font-medium">{connectionStats.hiring}</span>
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {isEnriching && (
                   <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                     <div className="flex items-center mb-2">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                       <span className="text-sm text-yellow-800">Enriching profiles...</span>
                     </div>
                     <div className="w-full bg-yellow-200 rounded-full h-2">
                       <div 
                         className="bg-yellow-600 h-2 rounded-full transition-all duration-300" 
                         style={{ width: `${enrichmentProgress}%` }}
                       ></div>
                     </div>
                     <div className="flex justify-between text-xs text-yellow-700 mt-1">
                       <span>Progress</span>
                       <span>{enrichmentProgress}%</span>
                     </div>
                   </div>
                 )}
               </div>
             </div>
           )}
        </div>

        {/* Center Panel - Chat Interface */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              {/* Welcome Message */}
              {showWelcome && (
                <div className="mb-6 text-left">
                  <div className="inline-block max-w-3xl rounded-lg px-4 py-3 bg-gray-100 text-gray-900">
                    <div className="text-sm prose prose-sm max-w-none">
                      <ReactMarkdown>
                        {`Welcome to **Weak-Tie Activator**, ${user ? getUserDisplayName(user) : 'there'}! 🚀

I'm here to help you discover and activate your most valuable connections. Here's how to get started:

1. **Upload your LinkedIn data** - Export and upload your connections CSV
2. **Automatic enrichment** - I'll enhance profiles with detailed information  
3. **Set your goals** - Tell me what you're looking for and get personalized recommendations

Ready to unlock the power of your network? Let's start!`}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              
              {messages.map((message, index) => (
                  <div key={`${message.id ?? 'msg'}-${index}`} className={`mb-6 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-3xl rounded-lg px-4 py-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                      <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>
                          {message.parts?.map(part => part.type === 'text' ? part.text : '').join('') || ''}
                        </ReactMarkdown>
                  </div>
                </div>
                  </div>
                )
              )}
              
              {/* Auto-scroll target */}
              <div ref={messagesEndRef} />
              
                             {false && (
                <div className="mb-6 text-left">
                  <div className="inline-block bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="animate-pulse delay-100">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="animate-pulse delay-200">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-200 p-6">
            <div className="max-w-4xl mx-auto">
                             <form onSubmit={async (e) => {
                 e.preventDefault();
                 console.log('Form submitted, input:', input);
                 if (input.trim()) {
                   console.log('Sending message...');
                                        setShowWelcome(false);
                     
                                         const inputText = input;
                    setInput('');
                     
                     // Use AI to classify the intent via API
                     try {
                       console.log('🤖 Calling intent classification API...');
                       const controller = new AbortController();
                       const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                       
                       const intentResponse = await fetch('/api/classify-intent', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ message: inputText }),
                         signal: controller.signal
                       });
                       
                       clearTimeout(timeoutId);
                       console.log('🤖 Intent response status:', intentResponse.status);
                       
                       if (intentResponse.ok) {
                         const intentData = await intentResponse.json();
                         const intent = intentData.intent;
                         console.log('🤖 AI Intent classification:', intent);
                         
                         if (intent.isSearchQuery) {
                           console.log('🔍 AI detected search query - performing search ONLY');
                           // For search queries, manually add user message and then search results
                           const userMessage = {
                             id: Date.now().toString(),
                             role: 'user' as const,
                             parts: [{ type: 'text' as const, text: inputText }],
                           };
                           setMessages(prev => [...prev, userMessage as any]);
                           
                           // Then perform search and add results as assistant message
                           try {
                             // Use requestAnimationFrame for minimal delay to ensure UI updates
                             requestAnimationFrame(async () => {
                               try {
                                 await classifyGoalAndSearch(inputText, 'ygSb7rjydShbQTAGwmQw9I1bGbC2');
                               } catch (searchError) {
                                 console.error('❌ Search failed:', searchError);
                                 addAssistantMessage('Sorry, I encountered an error while searching. Please try again.');
                               }
                             });
                           } catch (error) {
                             console.error('❌ Search setup failed:', error);
                           }
                         } else {
                           console.log('💬 AI detected chat query - sending to AI');
                           // For chat queries, use sendMessage for proper streaming
                           sendMessage({
                             parts: [{ type: 'text', text: inputText }],
                           });
                         }
                       } else {
                         console.log('❌ Intent classification failed, defaulting to chat');
                         sendMessage({
                           parts: [{ type: 'text', text: inputText }],
                         });
                       }
                     } catch (error) {
                       console.error('❌ Error in intent classification:', error);
                       if (error instanceof Error && error.name === 'AbortError') {
                         console.log('⏰ Intent classification timed out, falling back to chat');
                       } else {
                         console.log('💬 Fallback: sending to chat due to intent classification error');
                       }
                       sendMessage({
                         parts: [{ type: 'text', text: inputText }],
                       });
                     }
                 } else {
                   console.log('Input is empty, not sending');
                 }
               }} className="flex space-x-4">
                <input
                  type="text"
                  value={input}
                    onChange={(e) => setInput(e.target.value)}
                  placeholder="Start typing..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button 
                  type="submit" 
                    disabled={!input?.trim()}
                  className="px-6"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Panel - Tools */}
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Studio</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => {
                    setShowWelcome(false);
                    sendMessage({
                      parts: [{ type: 'text', text: 'How do I upload my LinkedIn connections?' }],
                    });
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How to upload data
                </Button>
                
                                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="w-full justify-start"
                     onClick={() => {
                       setShowWelcome(false);
                       sendMessage({
                         parts: [{ type: 'text', text: 'What should I include in my mission?' }],
                       });
                     }}
                   >
                     <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                     Mission tips
                   </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tools</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={downloadSampleCSV}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Sample CSV
              </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
                         <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                           <DialogHeader>
                   <DialogTitle className="text-2xl font-bold">Upload LinkedIn Connections</DialogTitle>
                   <DialogDescription>
                     Upload your LinkedIn connections CSV file to analyze your network. Profiles will be automatically enriched with detailed data.
                   </DialogDescription>
                 </DialogHeader>
          
          {/* Help Section */}
          <div className="mb-6 p-4 border-blue-200 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">How to Export LinkedIn Connections</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>1. Go to LinkedIn Settings → Data Privacy → Get a copy of your data</p>
              <p>2. Select &quot;Connections&quot; and request your data</p>
              <p>3. Download the CSV file from the email and upload it here</p>
            </div>
          </div>

          {success ? (
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-green-900 mb-2">Upload Successful!</h3>
              <p className="text-green-700 mb-4">
                {connections.length} connections uploaded successfully. You can now chat with me about your goals!
              </p>
              <div className="animate-pulse">
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : file 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {connections.length} connections found
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFile(null);
                        setConnections([]);
                        setPreviewData([]);
                        setError(null);
                      }}
                    >
                      Change File
              </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">Upload your LinkedIn connections</p>
                      <p className="text-sm text-gray-600">
                        Export your connections from LinkedIn and upload the CSV file here
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button asChild>
                        <span>Choose File</span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}

              {/* Preview Data */}
              {previewData.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Preview ({connections.length} total connections)</h4>
                                             <div className="overflow-x-auto">
                             <table className="w-full text-sm">
                               <thead>
                                 <tr className="border-b">
                                   <th className="text-left py-2">Name</th>
                                   <th className="text-left py-2">Company</th>
                                   <th className="text-left py-2">Position</th>
                                   <th className="text-left py-2">URL</th>
                                 </tr>
                               </thead>
                               <tbody>
                                  {previewData.map((connection, index) => (
                                   <tr key={`${connection.url ?? connection.name ?? 'row'}-${index}`} className="border-b">
                                     <td className="py-2">{connection.name}</td>
                                     <td className="py-2">{connection.company || '-'}</td>
                                     <td className="py-2">{connection.position || '-'}</td>
                                     <td className="py-2">
                                       {connection.url ? (
                                         <a 
                                           href={connection.url} 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           className="text-blue-600 hover:text-blue-800 underline"
                                         >
                                           View Profile
                                         </a>
                                       ) : '-'}
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                  {connections.length > 5 && (
                    <p className="text-sm text-gray-600">
                      Showing first 5 of {connections.length} connections
                    </p>
                  )}
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Uploading connections...</span>
                    <span className="text-sm text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadSampleCSV}
                  disabled={isUploading}
                >
                  Download Sample CSV
                </Button>
                <div className="flex space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUploadDialog(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                                           <Button 
                           onClick={handleUpload}
                           disabled={!file || connections.length === 0 || isUploading}
                           className="min-w-[120px]"
                         >
                           {isUploading ? (
                             <div className="flex items-center">
                               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                               Uploading & Enriching...
                             </div>
                           ) : (
                             'Upload & Enrich'
                           )}
              </Button>
                 </div>
       </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
     </div>
   );
 } 