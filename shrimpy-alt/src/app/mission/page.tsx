'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDisplayName } from '@/lib/utils';

export default function MissionPage() {
  const [mission, setMission] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mission.trim()) {
      setError('Please describe your mission or goal');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would typically save the mission and process the connections
      // For now, we'll redirect to a placeholder recommendations page
      router.push('/recommendations');
      
    } catch (err) {
      setError('Failed to process mission. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Weak-Tie Activator</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                ← Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Your Mission</h2>
          <p className="text-gray-600">Describe what you're trying to achieve and we'll find the best connections to help</p>
        </div>

        <div className="space-y-6">
          {/* Mission Form */}
          <Card>
            <CardHeader>
              <CardTitle>What's your mission?</CardTitle>
              <CardDescription>
                Be specific about your goals, needs, or what you're trying to accomplish. 
                The more detailed you are, the better our AI can match you with the right connections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="mission" className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your mission or goal
                  </label>
                  <textarea
                    id="mission"
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    placeholder="e.g., I'm looking to break into product management and need connections who can help me understand the role, provide mentorship, or refer me to opportunities..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isProcessing}
                  />
                </div>

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

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => router.push('/dashboard')}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!mission.trim() || isProcessing}
                    className="min-w-[120px]"
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      'Get Recommendations'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Example Missions</CardTitle>
              <CardDescription>
                Here are some examples to help you write your mission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Career Transition</h4>
                  <p className="text-blue-800 text-sm">
                    "I'm a software engineer looking to transition into data science. I need connections who work in data science roles, can provide guidance on the transition, or know of opportunities in the field."
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Business Development</h4>
                  <p className="text-green-800 text-sm">
                    "I'm launching a SaaS product for small businesses and need connections who can help with sales, marketing, or potential partnerships in the B2B space."
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Industry Knowledge</h4>
                  <p className="text-purple-800 text-sm">
                    "I want to learn more about the fintech industry and need connections who work in fintech companies, can share insights about the sector, or know about upcoming trends."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 