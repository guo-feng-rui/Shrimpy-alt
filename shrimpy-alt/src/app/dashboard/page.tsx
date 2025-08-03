'use client';

import { useState, useEffect } from 'react';
import { auth } from '../../../firebase.config';
import { signOut, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { getUserDisplayName } from '@/lib/utils';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        // Redirect to login page if not authenticated
        router.push('/login');
      } else {
        // Show quick start guide when user first visits
        setShowQuickStart(true);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
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
    return null; // Will be redirected to login page
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
                           <h4 className="font-semibold text-lg">Upload Data</h4>
                           <p className="text-gray-600">
                             Upload the CSV file and our AI will analyze your network
                           </p>
                         </div>
                       </div>
                       
                       <div className="flex items-start space-x-4">
                         <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                           3
                         </div>
                         <div>
                           <h4 className="font-semibold text-lg">Create Mission</h4>
                           <p className="text-gray-600">
                             Describe your goals or needs, and AI will recommend the most suitable contacts
                           </p>
                         </div>
                       </div>
                       
                       <div className="flex items-start space-x-4">
                         <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                           4
                         </div>
                         <div>
                           <h4 className="font-semibold text-lg">Get Recommendations</h4>
                           <p className="text-gray-600">
                             Get a ranked list of weak tie recommendations in 30 seconds
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
                         onClick={() => setShowQuickStart(false)}
                       >
                         Got it!
                       </Button>
                     </div>
                   </div>
                 </DialogContent>
               </Dialog>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, <span className="font-bold">{getUserDisplayName(user)}</span>!</h2>
          <p className="text-gray-600">Start analyzing your LinkedIn network and discover the most valuable weak ties</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Upload CSV Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <CardTitle>Upload LinkedIn Data</CardTitle>
              <CardDescription>
                Upload your LinkedIn connections CSV file and we&apos;ll analyze your network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => router.push('/upload')}>
                Start Upload
              </Button>
            </CardContent>
          </Card>

          {/* Mission Analysis Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle>Mission Analysis</CardTitle>
              <CardDescription>
                Enter your goals or tasks, and AI will recommend the most suitable contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" onClick={() => router.push('/mission')}>
                Create Mission
              </Button>
            </CardContent>
          </Card>

          {/* Recommendations Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <CardTitle>View Recommendations</CardTitle>
              <CardDescription>
                View the weak tie recommendations generated based on your mission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" onClick={() => router.push('/recommendations')}>
                View Results
              </Button>
            </CardContent>
          </Card>
                 </div>
       </div>
     </div>
   );
 } 