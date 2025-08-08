import { Connection } from './csv-parser';
import { VectorStorage } from './vector-storage';
import { ConnectionVectors } from './vector-schema';
import { db } from '../../firebase.config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { ProfileData } from './profile-parser';

interface ExperienceRecord {
  title?: string;
  company?: string;
  duration?: string;
  description?: string;
  industry?: string;
  start?: { year?: number; month?: number; day?: number };
  end?: { year?: number; month?: number; day?: number };
}

interface EducationRecord {
  degree?: string;
  institution?: string;
  schoolName?: string;
  field?: string;
  fieldOfStudy?: string;
  start?: { year?: number; month?: number; day?: number };
  end?: { year?: number; month?: number; day?: number };
}

export interface EnrichedConnection {
  // From CSV base
  name: string;
  url?: string;
  company?: string;
  position?: string;
  email?: string;
  location?: string;
  industry?: string;
  // Enhanced fields for better embedding generation
  skills?: string[];
  experiences?: ExperienceRecord[];
  locationInfo?: {
    city?: string;
    country?: string;
    region?: string;
  };
  network?: {
    mutualConnections?: string;
    alumni?: string;
    referrals?: string;
  };
  goal?: {
    interests?: string;
    aspirations?: string;
    careerObjectives?: string;
  };
  educations?: EducationRecord[];
  summary?: string;
}

// Payload containing only the vector fields of ConnectionVectors
export type ConnectionVectorPayload = Pick<ConnectionVectors,
  'skillsVector' | 'experienceVector' | 'companyVector' | 'locationVector' |
  'networkVector' | 'goalVector' | 'educationVector' | 'summaryVector'
>;

export class DataPopulation {
  
  // Step 3: Generate embeddings from existing Firestore data (test-connections collection)
  static async generateEmbeddingsFromFirestore(userId: string): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`🔄 Starting embedding generation from Firestore for user: ${userId}`);
    
    try {
      // Get all connections from test-connections collection
      const testConnectionsRef = collection(db, 'test-connections');
      const q = query(testConnectionsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      console.log(`📊 [generateEmbeddingsFromFirestore] Found ${querySnapshot.size} connections in test-connections for user ${userId}`);
      
      if (querySnapshot.size === 0) {
        console.log('⚠️ No connections found in test-connections collection');
        return { success: 0, failed: 0, errors: ['No connections found in test-connections'] };
      }
      
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      // Process each connection from profileCache
      for (const doc of querySnapshot.docs) {
        try {
          const connectionData = doc.data() as Connection;
          console.log(`🔄 [generateEmbeddingsFromFirestore] Processing doc ${doc.id} name=${connectionData.name}`);
          
          // Enrich the connection data
          const enrichedConnection = this.enrichConnection(connectionData);
          console.log(`🧩 [generateEmbeddingsFromFirestore] Enriched sizes: skills=${enrichedConnection.skills?.length || 0}, exp=${enrichedConnection.experiences?.length || 0}, edu=${enrichedConnection.educations?.length || 0}`);
          
          // Generate embeddings for this connection
          const embeddings = await this.generateConnectionEmbeddings(enrichedConnection, userId);
          console.log(`📐 [generateEmbeddingsFromFirestore] Got vectors for ${doc.id}:` , Object.keys(embeddings));
          
          // Store embeddings in connection_vectors collection
          await VectorStorage.storeConnectionVectors({
            connectionId: doc.id, // Use the same ID as in profileCache
            userId,
            originalConnection: connectionData as unknown as Record<string, unknown>,
            ...embeddings,
            skills: this.extractSkills(connectionData),
            companies: this.extractCompanies(connectionData),
            locations: this.extractLocations(connectionData),
            jobTitles: this.extractJobTitles(connectionData),
            industries: this.extractIndustries(connectionData),
            education: this.extractEducations(connectionData),
            summaries: connectionData.summary ? [connectionData.summary] : [],
            lastUpdated: new Date(),
            isActive: true
          });
          
          successCount++;
          console.log(`✅ [generateEmbeddingsFromFirestore] Stored vectors for: ${doc.id}`);
          
        } catch (error) {
          failedCount++;
          const errorMsg = `Failed to process ${doc.data().name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ [generateEmbeddingsFromFirestore] ${errorMsg}`, error);
        }
      }
      
      console.log(`🎉 Embedding generation completed: ${successCount} success, ${failedCount} failed`);
      return { success: successCount, failed: failedCount, errors };
      
    } catch (error) {
      console.error('❌ Failed to generate embeddings from Firestore:', error);
      return { 
        success: 0, 
        failed: 0, 
        errors: [`Failed to access Firestore: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  // Generate embeddings for profiles saved in profileCache for a user
  static async generateEmbeddingsFromProfileCache(userId: string): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`🔄 [generateEmbeddingsFromProfileCache] Start for user: ${userId}`);
    try {
      const cacheRef = collection(db, 'profileCache');
      const q = query(cacheRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      console.log(`📊 [generateEmbeddingsFromProfileCache] Found ${snapshot.size} cached profiles for user ${userId}`);
      if (snapshot.size === 0) {
        console.log('⚠️ [generateEmbeddingsFromProfileCache] No cached profiles found for user');
        return { success: 0, failed: 0, errors: ['No cached profiles found'] };
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const docSnap of snapshot.docs) {
        try {
          const cached = docSnap.data() as { data?: ProfileData; url?: string };
          const profile: ProfileData = (cached.data || ({} as ProfileData));
          const url: string | undefined = cached.url;
          console.log(`🔎 [generateEmbeddingsFromProfileCache] Doc ${docSnap.id} url=${url}`);
          const enriched = this.mapProfileDataToEnrichedConnection(profile, url);
          console.log(`🧩 [generateEmbeddingsFromProfileCache] Enriched ${docSnap.id}: skills=${enriched.skills?.length || 0}, exp=${enriched.experiences?.length || 0}, edu=${enriched.educations?.length || 0}`);

          const embeddings = await this.generateConnectionEmbeddings(enriched, userId);
          console.log(`📐 [generateEmbeddingsFromProfileCache] Got vectors for ${docSnap.id}:`, Object.keys(embeddings));

          await VectorStorage.storeConnectionVectors({
            connectionId: docSnap.id,
            userId,
            originalConnection: enriched as unknown as Record<string, unknown>,
            ...embeddings,
            skills: this.extractSkills(enriched as unknown as EnrichedConnection),
            companies: this.extractCompanies(enriched),
            locations: this.extractLocations(enriched),
            jobTitles: this.extractJobTitles(enriched),
            industries: this.extractIndustries(enriched),
            education: this.extractEducations(enriched),
            summaries: enriched.summary ? [enriched.summary] : [],
            lastUpdated: new Date(),
            isActive: true
          });

          success++;
          console.log(`✅ [generateEmbeddingsFromProfileCache] Stored vectors for ${docSnap.id} name=${enriched.name}`);
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(msg);
          console.error(`❌ [generateEmbeddingsFromProfileCache] Failed for ${docSnap.id}:`, err);
        }
      }

      return { success, failed, errors };
    } catch (error) {
      console.error('❌ [generateEmbeddingsFromProfileCache] Failed to read profileCache:', error);
      return { success: 0, failed: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  // Map ProfileData (from profileCache) to EnrichedConnection
  private static mapProfileDataToEnrichedConnection(profile: ProfileData, url?: string): EnrichedConnection {
    const fullName = profile.name || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || url || 'Unknown';

    // Experiences from positions/fullPositions/legacy experience
    const experiences: ExperienceRecord[] = [];
    type PositionLike = {
      title?: string;
      companyName?: string;
      description?: string;
      companyIndustry?: string;
      start?: { year?: number; month?: number; day?: number };
      end?: { year?: number; month?: number; day?: number };
    };
    type LegacyExperienceLike = { title?: string; company?: string; duration?: string };
    const positions = (profile.position || []) as PositionLike[];
    const fullPositions = (profile.fullPositions || []) as PositionLike[];
    const legacyExperience = (profile.experience || []) as LegacyExperienceLike[];

    positions.forEach((p) => {
      experiences.push({
        title: p.title,
        company: p.companyName,
        description: p.description,
        industry: p.companyIndustry,
        start: p.start,
        end: p.end
      });
    });
    fullPositions.forEach((p) => {
      experiences.push({
        title: p.title,
        company: p.companyName,
        description: p.description,
        industry: p.companyIndustry,
        start: p.start,
        end: p.end
      });
    });
    legacyExperience.forEach((e) => {
      experiences.push({
        title: e.title,
        company: e.company,
        duration: e.duration
      });
    });

    // Educations
    const educations: EducationRecord[] = (profile.educations || []).map((ed) => ({
      degree: ed.degree,
      institution: ed.schoolName,
      field: ed.fieldOfStudy,
      start: ed.start,
      end: ed.end
    }));

    // Skills
    const skills: string[] = [];
    if (Array.isArray(profile.skills)) skills.push(...profile.skills);
    if (Array.isArray(profile.skillsDetailed)) skills.push(...profile.skillsDetailed.map(s => s.name));

    // Pick a current position/company for top-level fields if available
    const current = positions[0] || fullPositions[0] || null;

    // Location text
    const locationText = profile.geo?.full || profile.location || '';

    const enriched: EnrichedConnection = {
      name: fullName.trim(),
      url,
      company: current?.companyName,
      position: current?.title,
      location: locationText,
      industry: current?.companyIndustry,
      skills: Array.from(new Set(skills)).filter(Boolean),
      experiences,
      educations,
      summary: profile.summary || profile.headline
    };

    return enriched;
  }
  
  // Convert LinkedIn CSV connections to enriched format for embeddings
  static enrichConnections(connections: Connection[]): EnrichedConnection[] {
    return connections.map((connection) => {
      const enriched: EnrichedConnection = {
        ...connection,
        // Extract skills from position/company
        skills: this.extractSkills(connection),
        // Normalize to experiences[]
        experiences: [
          {
            title: connection.position || '',
            company: connection.company || '',
            duration: this.estimateDuration(connection)
          }
        ].filter(e => e.title || e.company),
        // Structure location data
        locationInfo: this.parseLocation(connection.location || ''),
        // Structure network data (placeholder - would come from LinkedIn API)
        network: {
          mutualConnections: this.estimateMutualConnections(connection),
          alumni: this.extractAlumni(connection),
          referrals: '0'
        },
        // Structure goal data (placeholder - would be inferred)
        goal: {
          interests: this.inferInterests(connection),
          aspirations: this.inferAspirations(connection),
          careerObjectives: this.inferCareerObjectives(connection)
        },
        // Normalize to educations[]
        educations: [
          {
            degree: this.extractDegree(connection),
            institution: this.extractInstitution(connection),
            field: this.extractField(connection)
          }
        ]
      };
      
      return enriched;
    });
  }

  // Enrich a single connection
  private static enrichConnection(connection: Connection): EnrichedConnection {
    return {
      ...connection,
      skills: this.extractSkills(connection),
      experiences: [
        {
          title: connection.position || '',
          company: connection.company || '',
          duration: this.estimateDuration(connection)
        }
      ].filter(e => e.title || e.company),
      locationInfo: this.parseLocation(connection.location || ''),
      network: {
        mutualConnections: this.estimateMutualConnections(connection),
        alumni: this.extractAlumni(connection),
        referrals: '0'
      },
      goal: {
        interests: this.inferInterests(connection),
        aspirations: this.inferAspirations(connection),
        careerObjectives: this.inferCareerObjectives(connection)
      },
      educations: [
        {
          degree: this.extractDegree(connection),
          institution: this.extractInstitution(connection),
          field: this.extractField(connection)
        }
      ]
    };
  }

  // Generate embeddings and store in Firestore (for CSV upload flow)
  static async populateFirestoreWithEmbeddings(
    connections: Connection[], 
    userId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`🔄 Starting data population for ${connections.length} connections...`);
    
    const enrichedConnections = this.enrichConnections(connections);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const connection of enrichedConnections) {
      try {
        // Generate embeddings for this connection
        const embeddings = await this.generateConnectionEmbeddings(connection, userId);
        
        // Store in Firestore
        await VectorStorage.storeConnectionVectors({
          connectionId: connection.url || `connection-${Date.now()}-${Math.random()}`,
          userId,
          originalConnection: connection as unknown as Record<string, unknown>,
          ...embeddings,
          skills: this.extractSkills(connection),
          companies: this.extractCompanies(connection),
          locations: this.extractLocations(connection),
          jobTitles: this.extractJobTitles(connection),
          industries: this.extractIndustries(connection),
          education: this.extractEducations(connection),
          summaries: connection.summary ? [connection.summary] : [],
          lastUpdated: new Date(),
          isActive: true
        });
        
        successCount++;
        console.log(`✅ Stored embeddings for: ${connection.name}`);
        
      } catch (error) {
        failedCount++;
        const errorMsg = `Failed to process ${connection.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`🎉 Data population completed: ${successCount} success, ${failedCount} failed`);
    return { success: successCount, failed: failedCount, errors };
  }

  private static async generateConnectionEmbeddings(
    connection: EnrichedConnection, 
    userId: string
  ): Promise<ConnectionVectorPayload> {
    try {
      // Use environment variable with correct port as fallback
      const baseUrl = 'http://localhost:3000'; // Force localhost:3000 for embedding generation
      console.log(`🌐 [generateConnectionEmbeddings] POST ${baseUrl}/api/generate-embeddings for user=${userId} name=${connection.name}`);
      const response = await fetch(`${baseUrl}/api/generate-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionData: connection, userId })
      });

      console.log(`🛰️ [generateConnectionEmbeddings] Response status=${response.status}`);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error('🛰️ [generateConnectionEmbeddings] Non-OK response body:', text);
        throw new Error(`Embedding generation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`📦 [generateConnectionEmbeddings] Result keys:`, Object.keys(result || {}));
      // If API did not return embeddings, fall back locally
      if (!result || !result.embeddings) {
        return this.generateFallbackEmbeddings(connection);
      }
      return {
        skillsVector: { vector: result.embeddings.skills, dimension: 1536, model: 'text-embedding-3-small', timestamp: new Date() },
        experienceVector: { vector: result.embeddings.experience, dimension: 1536, model: 'text-embedding-3-small', timestamp: new Date() },
        companyVector: { vector: result.embeddings.company, dimension: 1536, model: 'text-embedding-3-small', timestamp: new Date() },
        locationVector: { vector: result.embeddings.location, dimension: 1536, model: 'text-embedding-3-small', timestamp: new Date() },
        networkVector: { vector: result.embeddings.network, dimension: 1536, model: 'text-embedding-3-small', timestamp: new Date() },
        goalVector: { vector: result.embeddings.goal, dimension: 1536, model: 'text-embedding-3-small', timestamp: new Date() },
        educationVector: { vector: result.embeddings.education, dimension: 1536, model: 'text-embedding-3-small', timestamp: new Date() },
        summaryVector: { vector: result.embeddings.summary, dimension: 1536, model: 'text-embedding-3-small', timestamp: new Date() }
      };
    } catch (error) {
      console.error('Embedding generation failed:', error);
      // Return fallback embeddings
      return this.generateFallbackEmbeddings(connection);
    }
  }

  // Generate fallback embeddings when Azure is not available
  private static generateFallbackEmbeddings(connection: EnrichedConnection): ConnectionVectorPayload {
    const fallbackVector = new Array(1536).fill(0);
    
    // Simple hash-based embedding for fallback
    const text = `${connection.name} ${connection.position} ${connection.company} ${connection.location}`;
    for (let i = 0; i < Math.min(text.length, 1536); i++) {
      fallbackVector[i] = (text.charCodeAt(i) % 200 - 100) / 100;
    }

    return {
      skillsVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() },
      experienceVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() },
      companyVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() },
      locationVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() },
      networkVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() },
      goalVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() },
      educationVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() },
      summaryVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() }
    };
  }

  // Helper methods for data enrichment
  private static extractSkills(connection: Connection | EnrichedConnection): string[] {
    const skills: string[] = [];
    if (connection.position) {
      // Extract common tech skills from position
      const position = connection.position.toLowerCase();
      const techSkills = ['react', 'javascript', 'python', 'java', 'node', 'typescript', 'angular', 'vue', 'aws', 'docker', 'kubernetes'];
      techSkills.forEach(skill => {
        if (position.includes(skill)) skills.push(skill);
      });
    }
    return skills;
  }

  private static extractCompanies(connection: Connection | EnrichedConnection): string[] {
    const companies: string[] = [];
    const experiences: ExperienceRecord[] = (connection as EnrichedConnection).experiences || [];
    experiences.forEach(e => { if (e?.company) companies.push(String(e.company)); });
    if (connection.company) companies.push(connection.company);
    return companies.filter(Boolean);
  }

  private static extractLocations(connection: Connection | EnrichedConnection): string[] {
    const locations: string[] = [];
    if (connection.location) locations.push(connection.location);
    return locations.filter(Boolean);
  }

  private static extractJobTitles(connection: Connection | EnrichedConnection): string[] {
    const titles: string[] = [];
    const experiences: ExperienceRecord[] = (connection as EnrichedConnection).experiences || [];
    experiences.forEach(e => { if (e?.title) titles.push(String(e.title)); });
    if (connection.position) titles.push(connection.position);
    return titles.filter(Boolean);
  }

  private static extractIndustries(connection: Connection | EnrichedConnection): string[] {
    const industries: string[] = [];
    const experiences: ExperienceRecord[] = (connection as EnrichedConnection).experiences || [];
    experiences.forEach(e => { if (e?.industry) industries.push(String(e.industry)); });
    const industry = (connection as { industry?: string }).industry;
    if (industry) industries.push(String(industry));
    return industries.filter(Boolean);
  }

  private static extractEducations(connection: Connection | EnrichedConnection): string[] {
    const educations: string[] = [];
    const list: EducationRecord[] = (connection as EnrichedConnection).educations || [];
    list.forEach(ed => {
      const start = ed.start?.year ? `${ed.start.year}-${ed.start.month || ''}` : '';
      const end = ed.end?.year ? `${ed.end.year}-${ed.end.month || ''}` : '';
      const duration = start || end ? `${start} to ${end}`.trim() : '';
      const piece = `${ed.degree || ''} ${ed.institution || ed.schoolName || ''} ${ed.field || ed.fieldOfStudy || ''} ${duration}`.trim();
      if (piece) educations.push(piece);
    });
    return educations.filter(Boolean);
  }

  private static estimateDuration(connection: Connection): string {
    // Placeholder - would be extracted from LinkedIn data
    return '2-5 years';
  }

  private static estimateCompanySize(connection: Connection): string {
    // Placeholder - would be extracted from LinkedIn data
    return '100-500';
  }

  private static parseLocation(location: string): { city?: string; country?: string; region?: string } {
    if (!location) return {};
    
    const parts = location.split(',').map(part => part.trim());
    return {
      city: parts[0] || '',
      country: parts[parts.length - 1] || '',
      region: parts.length > 2 ? parts[1] : ''
    };
  }

  private static estimateMutualConnections(connection: Connection): string {
    // Placeholder - would come from LinkedIn API
    return Math.floor(Math.random() * 50).toString();
  }

  private static extractAlumni(connection: Connection): string {
    // Placeholder - would be extracted from LinkedIn data
    return '';
  }

  private static inferInterests(connection: Connection): string {
    // Infer interests from position and company
    const position = connection.position?.toLowerCase() || '';
    if (position.includes('ai') || position.includes('ml')) return 'AI/ML';
    if (position.includes('frontend') || position.includes('ui')) return 'Frontend Development';
    if (position.includes('backend') || position.includes('api')) return 'Backend Development';
    return 'Technology';
  }

  private static inferAspirations(connection: Connection): string {
    // Infer aspirations from position
    const position = connection.position?.toLowerCase() || '';
    if (position.includes('senior') || position.includes('lead')) return 'Technical Leadership';
    if (position.includes('architect')) return 'System Architecture';
    return 'Career Growth';
  }

  private static inferCareerObjectives(connection: Connection): string {
    // Infer career objectives
    return 'Build impactful products';
  }

  private static extractDegree(connection: Connection): string {
    // Placeholder - would be extracted from LinkedIn data
    return 'BS Computer Science';
  }

  private static extractInstitution(connection: Connection): string {
    // Placeholder - would be extracted from LinkedIn data
    return 'University';
  }

  private static extractField(connection: Connection): string {
    // Placeholder - would be extracted from LinkedIn data
    return 'Computer Science';
  }
} 