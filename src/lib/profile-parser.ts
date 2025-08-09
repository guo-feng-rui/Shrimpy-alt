export interface ProfileData {
  // Basic identity
  id?: number;
  urn?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  isPremium?: boolean;
  
  // Profile media
  profilePicture?: string;
  profilePictures?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  
  // Basic info
  headline?: string;
  summary?: string;
  
  // Location
  location?: string;
  geo?: {
    country?: string;
    city?: string;
    full?: string;
    countryCode?: string;
  };
  
  // Legacy fields for backward compatibility
  company?: string;
  
  // Rich education data
  educations?: Array<{
    start?: {
      year: number;
      month: number;
      day: number;
    };
    end?: {
      year: number;
      month: number;
      day: number;
    };
    fieldOfStudy?: string;
    degree?: string;
    grade?: string;
    schoolName?: string;
    description?: string;
    activities?: string;
    url?: string;
    schoolId?: string;
    logo?: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  }>;
  
  // Rich skills data
  skills?: string[];
  skillsDetailed?: Array<{
    name: string;
    passedSkillAssessment: boolean;
  }>;
  
  // Rich experience data
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
  }>;
  position?: Array<{
    companyId?: number;
    companyName?: string;
    companyUsername?: string;
    companyURL?: string;
    companyLogo?: string;
    companyIndustry?: string;
    companyStaffCountRange?: string;
    title?: string;
    multiLocaleTitle?: { [key: string]: string };
    multiLocaleCompanyName?: { [key: string]: string };
    location?: string;
    locationType?: string;
    description?: string;
    employmentType?: string;
    start?: {
      year: number;
      month: number;
      day: number;
    };
    end?: {
      year: number;
      month: number;
      day: number;
    };
  }>;
  fullPositions?: Array<{
    companyId?: number;
    companyName?: string;
    companyUsername?: string;
    companyURL?: string;
    companyLogo?: string;
    companyIndustry?: string;
    companyStaffCountRange?: string;
    title?: string;
    multiLocaleTitle?: { [key: string]: string };
    multiLocaleCompanyName?: { [key: string]: string };
    location?: string;
    locationType?: string;
    description?: string;
    employmentType?: string;
    start?: {
      year: number;
      month: number;
      day: number;
    };
    end?: {
      year: number;
      month: number;
      day: number;
    };
  }>;
  
  // Rich certifications data
  certifications?: Array<{
    name?: string;
    start?: {
      year: number;
      month: number;
      day: number;
    };
    end?: {
      year: number;
      month: number;
      day: number;
    };
    authority?: string;
    company?: {
      name?: string;
      universalName?: string;
      logo?: string;
      staffCountRange?: any;
      headquarter?: any;
    };
    timePeriod?: {
      start?: {
        year: number;
        month: number;
        day: number;
      };
      end?: {
        year: number;
        month: number;
        day: number;
      };
    };
  }>;
  
  // Projects
  projects?: any;
  
  // Locale and internationalization
  supportedLocales?: Array<{
    country: string;
    language: string;
  }>;
  multiLocaleFirstName?: { [key: string]: string };
  multiLocaleLastName?: { [key: string]: string };
  multiLocaleHeadline?: { [key: string]: string };
  
  // Original fields
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
  wasFromCache?: boolean;
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
            data: cachedData,
            wasFromCache: true
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
    
    // Parse the response data into our comprehensive format
    const profileData: ProfileData = {
      url: profileUrl,
      
      // Basic identity
      id: result.id,
      urn: result.urn,
      username: result.username,
      firstName: result.firstName,
      lastName: result.lastName,
      name: result.name?.default ? `${result.name.default.first} ${result.name.default.last}` : 
            result.name?.i18n?.en ? `${result.name.i18n.en.first} ${result.name.i18n.en.last}` : 
            `${result.firstName || ''} ${result.lastName || ''}`.trim(),
      isPremium: result.isPremium,
      
      // Profile media
      profilePicture: result.profilePicture,
      profilePictures: result.profilePictures || [],
      
      // Basic info
      headline: result.headline?.default || result.headline?.i18n?.en || result.headline || '',
      summary: result.summary || '',
      
      // Location
      location: result.geo?.full || result.location?.full || result.location?.city || '',
      geo: result.geo || {},
      
      // Legacy fields for backward compatibility
      company: result.position?.[0]?.companyName || result.positions?.[0]?.company?.name || '',
      
      // Rich education data
      educations: result.educations || result.education || [],
      
      // Rich skills data
      skills: result.skills?.map((skill: any) => typeof skill === 'string' ? skill : skill.name) || [],
      skillsDetailed: result.skills || [],
      
      // Rich experience data
      experience: result.position?.map((pos: any) => ({
        title: pos.title || '',
        company: pos.companyName || '',
        duration: pos.start && pos.end ? 
          `${pos.start.year || ''}-${pos.end.year || ''}` : 
          pos.start ? `Since ${pos.start.year || ''}` : ''
      })) || result.positions?.map((pos: any) => ({
        title: pos.title || '',
        company: pos.company?.name || '',
        duration: pos.start && pos.end ? 
          `${pos.start.year || ''}-${pos.end.year || ''}` : 
          pos.start ? `Since ${pos.start.year || ''}` : ''
      })) || [],
      position: result.position || [],
      fullPositions: result.fullPositions || result.position || [],
      
      // Rich certifications data
      certifications: result.certifications || [],
      
      // Projects
      projects: result.projects || {},
      
      // Locale and internationalization
      supportedLocales: result.supportedLocales || [],
      multiLocaleFirstName: result.multiLocaleFirstName || {},
      multiLocaleLastName: result.multiLocaleLastName || {},
      multiLocaleHeadline: result.multiLocaleHeadline || {},
      
      // Original fields
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
      data: profileData,
      wasFromCache: false
    };

  } catch (error) {
    console.error('Profile fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile data'
    };
  }
}

export async function enrichConnectionData(connection: any, passedUserId?: string): Promise<{connection: any, wasFromCache: boolean}> {
  if (!connection.url) {
    return { connection, wasFromCache: false };
  }

  try {
    const profileResult = await fetchLinkedInProfile(connection.url, passedUserId);
    
         if (profileResult.success && profileResult.data) {
       return {
         connection: {
         ...connection,
         enriched: true,
         
         // Basic identity
         profileId: profileResult.data.id,
         urn: profileResult.data.urn,
         username: profileResult.data.username,
         firstName: profileResult.data.firstName,
         lastName: profileResult.data.lastName,
         isPremium: profileResult.data.isPremium,
         
         // Profile media
         profilePicture: profileResult.data.profilePicture,
         profilePictures: profileResult.data.profilePictures,
         
         // Basic info
         headline: profileResult.data.headline,
         summary: profileResult.data.summary,
         
         // Location
         location: profileResult.data.location,
         geo: profileResult.data.geo,
         
         // Rich education data
         educations: profileResult.data.educations,
         
         // Rich skills data
         skills: profileResult.data.skills,
         skillsDetailed: profileResult.data.skillsDetailed,
         
         // Rich experience data
         experience: profileResult.data.experience,
         position: profileResult.data.position,
         fullPositions: profileResult.data.fullPositions,
         
         // Rich certifications data
         certifications: profileResult.data.certifications,
         
         // Projects
         projects: profileResult.data.projects,
         
         // Locale and internationalization
         supportedLocales: profileResult.data.supportedLocales,
         multiLocaleFirstName: profileResult.data.multiLocaleFirstName,
         multiLocaleLastName: profileResult.data.multiLocaleLastName,
         multiLocaleHeadline: profileResult.data.multiLocaleHeadline,
         
         // Original fields
         flags: profileResult.data.flags,
         languages: profileResult.data.languages,
         recommendations: profileResult.data.recommendations
       },
       wasFromCache: profileResult.wasFromCache || false
       };
    } else {
      console.warn(`Failed to enrich profile for ${connection.name}:`, profileResult.error);
      return { connection, wasFromCache: false };
    }
  } catch (error) {
    console.error(`Error enriching profile for ${connection.name}:`, error);
    return { connection, wasFromCache: false };
  }
}

export async function enrichConnectionsBatch(connections: any[], batchSize: number = 5): Promise<any[]> {
  const enrichedConnections = [];
  
  for (let i = 0; i < connections.length; i += batchSize) {
    const batch = connections.slice(i, i + batchSize);
    
    // Process batch with delays only for API calls
    for (let j = 0; j < batch.length; j++) {
      const result = await enrichConnectionData(batch[j]);
      enrichedConnections.push(result.connection);
      
      // Only add delay if it was an API call (not cache hit)
      if (!result.wasFromCache && j < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Add delay between batches
    if (i + batchSize < connections.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced delay
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
    summary: sampleResponse.summary || '',
    skills: sampleResponse.skills || [],
    educations: [],
    experience: sampleResponse.positions?.map((pos: any) => ({
      title: pos.title,
      company: pos.company?.name || '',
      duration: pos.start && pos.end ? `${pos.start} - ${pos.end}` : pos.start ? `Since ${pos.start}` : ''
    })) || [],
    position: [],
    flags: sampleResponse.flags || {},
    languages: sampleResponse.languages || [],
    recommendations: sampleResponse.recommendations || { given: 0, received: 0 }
  };

  
  return profileData;
}

 