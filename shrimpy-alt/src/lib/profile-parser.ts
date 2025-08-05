export interface ProfileData {
  name?: string;
  headline?: string;
  location?: string;
  company?: string;
  position?: string;
  education?: string[];
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
  }>;
  summary?: string;
  url: string;
  flags?: {
    isCreator?: boolean;
    isOpenToWork?: boolean;
    isHiring?: boolean;
  };
  languages?: string[];
  recommendations?: {
    given: number;
    received: number;
  };
}

export interface ProfileParseResult {
  success: boolean;
  data?: ProfileData;
  error?: string;
}

import { getCachedProfile, setCachedProfile, clearUserCache } from './firestore-cache';
import { auth } from '../../firebase.config';

// Store API key securely - in production, this should be in environment variables
const RAPIDAPI_KEY = '167d5183cdmshf414e4355837b7bp1dcec7jsn937839944017';
const RAPIDAPI_HOST = 'li-data-scraper.p.rapidapi.com';

export async function fetchLinkedInProfile(profileUrl: string, passedUserId?: string): Promise<ProfileParseResult> {
  try {
    // Validate URL
    if (!profileUrl || !profileUrl.includes('linkedin.com/in/')) {
      return {
        success: false,
        error: 'Invalid LinkedIn profile URL'
      };
    }

    // Get user ID for cache - prefer passed userId, fallback to auth
    let userId = passedUserId || auth.currentUser?.uid;
    
    // If no user immediately available, wait a bit for auth state
    if (!userId) {
      await new Promise(resolve => setTimeout(resolve, 100));
      userId = auth.currentUser?.uid;
    }
    
    if (!userId) {
      console.warn('No user ID available for caching - proceeding without cache');
    }

    // Check Firestore cache first
    if (userId) {
      try {
        const cachedData = await getCachedProfile(userId, profileUrl);
        if (cachedData) {
          return {
            success: true,
            data: cachedData
          };
        }
      } catch (cacheError) {
        console.warn('Cache read failed, proceeding with API call:', cacheError);
      }
    }

    // Encode the URL for the API call
    const encodedUrl = encodeURIComponent(profileUrl);
    const apiUrl = `https://li-data-scraper.p.rapidapi.com/get-profile-data-by-url?url=${encodedUrl}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Parse the response and extract relevant data based on the actual API structure
    const profileData: ProfileData = {
      url: profileUrl,
      name: result.name?.default ? `${result.name.default.first} ${result.name.default.last}` : result.name?.i18n?.en ? `${result.name.i18n.en.first} ${result.name.i18n.en.last}` : '',
      headline: result.headline?.default || result.headline?.i18n?.en || '',
      location: result.location?.full || result.location?.city || '',
      company: result.positions?.[0]?.company?.name || '',
      position: result.positions?.[0]?.title || '',
      summary: result.summary || '',
      skills: result.skills || [],
      education: result.education?.map((edu: any) => edu.school) || [],
      experience: result.positions?.map((pos: any) => ({
        title: pos.title,
        company: pos.company?.name || '',
        duration: pos.start && pos.end ? `${pos.start} - ${pos.end}` : pos.start ? `Since ${pos.start}` : ''
      })) || [],
      flags: result.flags || {},
      languages: result.languages || [],
      recommendations: result.recommendations || { given: 0, received: 0 }
    };

    // Store in Firestore cache
    if (userId) {
      try {
        await setCachedProfile(userId, profileUrl, profileData);
      } catch (cacheError) {
        console.warn('Cache write failed, but continuing:', cacheError);
      }
    }

    return {
      success: true,
      data: profileData
    };

  } catch (error) {
    console.error('Profile fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile data'
    };
  }
}

export async function enrichConnectionData(connection: any, passedUserId?: string): Promise<any> {
  if (!connection.url) {
    return connection;
  }

  try {
    const profileResult = await fetchLinkedInProfile(connection.url, passedUserId);
    
         if (profileResult.success && profileResult.data) {
       return {
         ...connection,
         enriched: true,
         headline: profileResult.data.headline,
         location: profileResult.data.location,
         skills: profileResult.data.skills,
         experience: profileResult.data.experience,
         education: profileResult.data.education,
         summary: profileResult.data.summary,
         flags: profileResult.data.flags,
         languages: profileResult.data.languages,
         recommendations: profileResult.data.recommendations
       };
    } else {
      console.warn(`Failed to enrich profile for ${connection.name}:`, profileResult.error);
      return connection;
    }
  } catch (error) {
    console.error(`Error enriching profile for ${connection.name}:`, error);
    return connection;
  }
}

export async function enrichConnectionsBatch(connections: any[], batchSize: number = 5): Promise<any[]> {
  const enrichedConnections = [];
  
  for (let i = 0; i < connections.length; i += batchSize) {
    const batch = connections.slice(i, i + batchSize);
    
    // Process batch with delays to respect API rate limits
    const batchPromises = batch.map(async (connection, index) => {
      // Add delay between requests to avoid rate limiting
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return await enrichConnectionData(connection);
    });
    
    const batchResults = await Promise.all(batchPromises);
    enrichedConnections.push(...batchResults);
    
    // Add delay between batches
    if (i + batchSize < connections.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return enrichedConnections;
}

// Test function to verify parsing with sample data
export function testProfileParsing() {
  const sampleResponse = {
    "id": "ACoAAA8BYqEBCGLg_vT_ca6mMEqkpp9nVffJ3hc",
    "username": "williamhgates",
    "name": {
      "default": { "first": "Bill", "last": "Gates" },
      "i18n": { "en": { "first": "Bill", "last": "Gates" } }
    },
    "headline": {
      "default": "Co-chair, Bill & Melinda Gates Foundation",
      "i18n": { "en": "Co-chair, Bill & Melinda Gates Foundation" }
    },
    "flags": {
      "isCreator": true,
      "isOpenToWork": false,
      "isHiring": false
    },
    "summary": "Co-chair of the Bill & Melinda Gates Foundation…",
    "location": {
      "country": "United States",
      "city": "Seattle, Washington",
      "full": "Seattle, Washington, United States"
    },
    "positions": [
      {
        "company": {
          "name": "Bill & Melinda Gates Foundation",
          "alias": "bill-&-melinda-gates-foundation",
          "industry": "Non-profit Organization Management"
        },
        "title": "Co-chair",
        "start": "2000-01",
        "end": null
      }
    ],
    "education": [
      { "school": "Harvard University", "start": "1973", "end": "1975" },
      { "school": "Lakeside School" }
    ],
    "skills": ["Philanthropy", "Software Engineering"],
    "languages": ["English"],
    "recommendations": {
      "given": 0,
      "received": 0
    }
  };

  // Simulate the parsing logic
  const profileData: ProfileData = {
    url: "https://www.linkedin.com/in/williamhgates/",
    name: sampleResponse.name?.default ? `${sampleResponse.name.default.first} ${sampleResponse.name.default.last}` : '',
    headline: sampleResponse.headline?.default || '',
    location: sampleResponse.location?.full || '',
    company: sampleResponse.positions?.[0]?.company?.name || '',
    position: sampleResponse.positions?.[0]?.title || '',
    summary: sampleResponse.summary || '',
    skills: sampleResponse.skills || [],
    education: sampleResponse.education?.map((edu: any) => edu.school) || [],
    experience: sampleResponse.positions?.map((pos: any) => ({
      title: pos.title,
      company: pos.company?.name || '',
      duration: pos.start && pos.end ? `${pos.start} - ${pos.end}` : pos.start ? `Since ${pos.start}` : ''
    })) || [],
    flags: sampleResponse.flags,
    languages: sampleResponse.languages,
    recommendations: sampleResponse.recommendations
  };

  
  return profileData;
}

 