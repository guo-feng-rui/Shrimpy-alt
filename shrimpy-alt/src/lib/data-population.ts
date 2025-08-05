import { Connection } from './csv-parser';
import { VectorStorage } from './vector-storage';
import { ConnectionVectors } from './vector-schema';
import { db } from '../../firebase.config';
import { collection, getDocs, query, where } from 'firebase/firestore';

export interface EnrichedConnection extends Connection {
  // Enhanced fields for better embedding generation
  skills?: string[];
  experience?: {
    title?: string;
    company?: string;
    duration?: string;
  };
  company?: {
    name?: string;
    industry?: string;
    size?: string;
  };
  location?: {
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
  education?: {
    degree?: string;
    institution?: string;
    field?: string;
  };
}

export class DataPopulation {
  
  // Step 3: Generate embeddings from existing Firestore data (test-connections collection)
  static async generateEmbeddingsFromFirestore(userId: string): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`🔄 Starting embedding generation from Firestore for user: ${userId}`);
    
    try {
      // Get all connections from test-connections collection
      const testConnectionsRef = collection(db, 'test-connections');
      const q = query(testConnectionsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      console.log(`📊 Found ${querySnapshot.size} connections in test-connections`);
      
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
          console.log(`🔄 Processing connection: ${connectionData.name}`);
          
          // Enrich the connection data
          const enrichedConnection = this.enrichConnection(connectionData);
          
          // Generate embeddings for this connection
          const embeddings = await this.generateConnectionEmbeddings(enrichedConnection, userId);
          
          // Store embeddings in connection_vectors collection
          await VectorStorage.storeConnectionVectors({
            connectionId: doc.id, // Use the same ID as in profileCache
            userId,
            originalConnection: connectionData,
            ...embeddings,
            skills: this.extractSkills(connectionData),
            companies: [connectionData.company || ''],
            locations: [connectionData.location || ''],
            jobTitles: [connectionData.position || ''],
            industries: [connectionData.industry || ''],
            education: [this.extractInstitution(connectionData) || ''],
            lastUpdated: new Date(),
            isActive: true
          });
          
          successCount++;
          console.log(`✅ Generated and stored embeddings for: ${connectionData.name}`);
          
        } catch (error) {
          failedCount++;
          const errorMsg = `Failed to process ${doc.data().name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
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
  
  // Convert LinkedIn CSV connections to enriched format for embeddings
  static enrichConnections(connections: Connection[], userId: string): EnrichedConnection[] {
    return connections.map((connection, index) => {
      const enriched: EnrichedConnection = {
        ...connection,
        // Extract skills from position/company
        skills: this.extractSkills(connection),
        // Structure experience data
        experience: {
          title: connection.position || '',
          company: connection.company || '',
          duration: this.estimateDuration(connection)
        },
        // Structure company data
        company: {
          name: connection.company || '',
          industry: connection.industry || '',
          size: this.estimateCompanySize(connection)
        },
        // Structure location data
        location: this.parseLocation(connection.location || ''),
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
        // Structure education data (placeholder - would come from LinkedIn)
        education: {
          degree: this.extractDegree(connection),
          institution: this.extractInstitution(connection),
          field: this.extractField(connection)
        }
      };
      
      return enriched;
    });
  }

  // Enrich a single connection
  private static enrichConnection(connection: Connection): EnrichedConnection {
    return {
      ...connection,
      skills: this.extractSkills(connection),
      experience: {
        title: connection.position || '',
        company: connection.company || '',
        duration: this.estimateDuration(connection)
      },
      company: {
        name: connection.company || '',
        industry: connection.industry || '',
        size: this.estimateCompanySize(connection)
      },
      location: this.parseLocation(connection.location || ''),
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
      education: {
        degree: this.extractDegree(connection),
        institution: this.extractInstitution(connection),
        field: this.extractField(connection)
      }
    };
  }

  // Generate embeddings and store in Firestore (for CSV upload flow)
  static async populateFirestoreWithEmbeddings(
    connections: Connection[], 
    userId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`🔄 Starting data population for ${connections.length} connections...`);
    
    const enrichedConnections = this.enrichConnections(connections, userId);
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
          originalConnection: connection,
          ...embeddings,
          skills: this.extractSkills(connection),
          companies: [connection.company || ''],
          locations: [connection.location || ''],
          jobTitles: [connection.position || ''],
          industries: [connection.industry || ''],
          education: [this.extractInstitution(connection) || ''],
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

  // Generate embeddings for a single connection
  private static async generateConnectionEmbeddings(
    connection: EnrichedConnection, 
    userId: string
  ): Promise<Partial<ConnectionVectors>> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/generate-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionData: connection, userId })
      });

      if (!response.ok) {
        throw new Error(`Embedding generation failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        skillsVector: { vector: result.embeddings.skills, dimension: 1536, model: 'text-embedding-ada-002', timestamp: new Date() },
        experienceVector: { vector: result.embeddings.experience, dimension: 1536, model: 'text-embedding-ada-002', timestamp: new Date() },
        companyVector: { vector: result.embeddings.company, dimension: 1536, model: 'text-embedding-ada-002', timestamp: new Date() },
        locationVector: { vector: result.embeddings.location, dimension: 1536, model: 'text-embedding-ada-002', timestamp: new Date() },
        networkVector: { vector: result.embeddings.network, dimension: 1536, model: 'text-embedding-ada-002', timestamp: new Date() },
        goalVector: { vector: result.embeddings.goal, dimension: 1536, model: 'text-embedding-ada-002', timestamp: new Date() },
        educationVector: { vector: result.embeddings.education, dimension: 1536, model: 'text-embedding-ada-002', timestamp: new Date() }
      };
    } catch (error) {
      console.error('Embedding generation failed:', error);
      // Return fallback embeddings
      return this.generateFallbackEmbeddings(connection);
    }
  }

  // Generate fallback embeddings when Azure is not available
  private static generateFallbackEmbeddings(connection: EnrichedConnection): Partial<ConnectionVectors> {
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
      educationVector: { vector: fallbackVector, dimension: 1536, model: 'fallback', timestamp: new Date() }
    };
  }

  // Helper methods for data enrichment
  private static extractSkills(connection: Connection): string[] {
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