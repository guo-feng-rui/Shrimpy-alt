import { db } from '../../firebase.config';
import { collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { ProfileData } from './profile-parser';

const CACHE_COLLECTION = 'profileCache';
const CACHE_EXPIRY_DAYS = 30; // 30 days
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

interface CachedProfile {
  data: ProfileData;
  timestamp: Timestamp;
  expiresAt: Timestamp;
  userId: string;
  url: string;
}

// Generate a cache key from user ID and profile URL
function getCacheKey(userId: string, profileUrl: string): string {
  // Create a safe document ID by replacing special characters
  const safeUrl = profileUrl.replace(/[\/\?#&=]/g, '_');
  const cacheKey = `${userId}_${safeUrl}`;

  return cacheKey;
}

// Helper function to remove undefined values from an object
function cleanUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

// Store profile in Firestore cache
export async function setCachedProfile(userId: string, profileUrl: string, profileData: ProfileData): Promise<void> {
  try {
    const cacheKey = getCacheKey(userId, profileUrl);
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + CACHE_EXPIRY_MS);
    
    // Clean any undefined values from the profile data
    const cleanedProfileData = cleanUndefinedValues(profileData);

    const cachedData: CachedProfile = {
      data: cleanedProfileData,
      timestamp: now,
      expiresAt: expiresAt,
      userId: userId,
      url: profileUrl
    };
    
    await setDoc(doc(db, CACHE_COLLECTION, cacheKey), cachedData);
  
  } catch (error) {
    console.error('Error caching profile:', error);
    // Don't throw - caching failure shouldn't break the app
  }
}

// Get profile from Firestore cache
export async function getCachedProfile(userId: string, profileUrl: string): Promise<ProfileData | null> {
  try {
    const cacheKey = getCacheKey(userId, profileUrl);
    const docRef = doc(db, CACHE_COLLECTION, cacheKey);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
    
      return null;
    }
    
    const cached = docSnap.data() as CachedProfile;
    const now = Timestamp.now();
    
    // Check if cache has expired
    if (cached.expiresAt.toMillis() < now.toMillis()) {
  
      // Delete expired cache
      await deleteDoc(docRef);
      return null;
    }
    

  
    return cached.data;
  } catch (error) {
    console.error('Error getting cached profile:', error);
    return null;
  }
}

// Clear all cache for a user
export async function clearUserCache(userId: string): Promise<void> {
  try {
    const q = query(collection(db, CACHE_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

  } catch (error) {
    console.error('Error clearing user cache:', error);
  }
}



// Get cache statistics for a user
export async function getUserCacheStats(userId: string): Promise<{
  totalCached: number;
  validCached: number;
  expiredCached: number;
}> {
  try {
    const q = query(collection(db, CACHE_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const now = Timestamp.now();
    let validCount = 0;
    let expiredCount = 0;
    let oldestTimestamp: Timestamp | undefined = undefined;
    let newestTimestamp: Timestamp | undefined = undefined;
    
    querySnapshot.forEach(doc => {
      const cached = doc.data() as CachedProfile;
      
      if (cached.expiresAt.toMillis() < now.toMillis()) {
        expiredCount++;
      } else {
        validCount++;
      }
      
      if (!oldestTimestamp || cached.timestamp.toMillis() < oldestTimestamp.toMillis()) {
        oldestTimestamp = cached.timestamp;
      }
      
      if (!newestTimestamp || cached.timestamp.toMillis() > newestTimestamp.toMillis()) {
        newestTimestamp = cached.timestamp;
      }
    });
    
    return {
      totalCached: querySnapshot.size,
      validCached: validCount,
      expiredCached: expiredCount
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalCached: 0,
      validCached: 0,
      expiredCached: 0
    };
  }
}

// Clean up expired cache entries for all users (can be run periodically)
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const now = Timestamp.now();
    const q = query(collection(db, CACHE_COLLECTION), where('expiresAt', '<', now));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    

    return querySnapshot.size;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return 0;
  }
}