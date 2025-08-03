'use client';

import { useState, useEffect } from 'react';
import { auth } from '../../../firebase.config';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { getUserDisplayName } from '@/lib/utils';

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        // Redirect to dashboard after successful login
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      console.log('Login successful:', result.user.email);
    } catch (error: any) {
      console.error('Login error details:', error);
      
      switch (error.code) {
        case 'auth/configuration-not-found':
          setError('Firebase authentication configuration not found. Please ensure Google authentication is enabled in Firebase Console.');
          break;
        case 'auth/popup-closed-by-user':
          setError('Login window was closed, please try again');
          break;
        case 'auth/popup-blocked':
          setError('Login window was blocked by browser, please allow popups and try again');
          break;
        case 'auth/cancelled-popup-request':
          setError('Login request was cancelled');
          break;
        case 'auth/unauthorized-domain':
          setError('Current domain is not authorized. Please add localhost to authorized domains in Firebase Console.');
          break;
        default:
          setError(`Login failed: ${error.message} (code: ${error.code})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signOut(auth);
      console.log('Sign out successful');
      router.push('/login');
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(`Sign out failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome to Weak-Tie Activator</CardTitle>
            <CardDescription className="text-gray-600">
              Connect your LinkedIn network and discover the most valuable weak ties
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-red-800">Login Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            )}
            
            {!user ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Sign in with your Google account to get started</p>
                  <Button 
                    onClick={signIn}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 h-12 text-lg"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                      </div>
                    )}
                  </Button>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center mb-3">
                    {user.photoURL && (
                      <img 
                        src={user.photoURL} 
                        alt="User avatar" 
                        className="w-12 h-12 rounded-full mr-3"
                      />
                    )}
                    <div className="text-left">
                      <p className="font-semibold text-green-800">✅ Signed in</p>
                      <p className="text-sm text-green-600 font-bold">{getUserDisplayName(user)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Go to Dashboard
                  </Button>
                  
                  <Button 
                    onClick={signOutUser}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? 'Signing out...' : 'Sign out'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            © 2024 Weak-Tie Activator. Let weak ties create value for you.
          </p>
        </div>
      </div>
    </div>
  );
} 