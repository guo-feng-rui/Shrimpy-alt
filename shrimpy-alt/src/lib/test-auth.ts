import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validate required environment variables
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Firebase configuration missing. Please set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables.');
}

// Initialize Firebase for testing
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export interface TestAuthResult {
  user: User;
  token: string;
  userId: string;
}

export async function authenticateForTesting(): Promise<TestAuthResult> {
  try {
    console.log('🔐 Authenticating for testing...');
    
    // Sign in anonymously
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    // Get the ID token
    const token = await user.getIdToken();
    
    console.log('✅ Test authentication successful');
    console.log(`   User ID: ${user.uid}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
    return {
      user,
      token,
      userId: user.uid
    };
  } catch (error) {
    console.error('❌ Test authentication failed:', error);
    throw error;
  }
}

export async function signOutForTesting(): Promise<void> {
  try {
    await auth.signOut();
    console.log('✅ Test sign out successful');
  } catch (error) {
    console.error('❌ Test sign out failed:', error);
    throw error;
  }
}

export function getTestAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
} 