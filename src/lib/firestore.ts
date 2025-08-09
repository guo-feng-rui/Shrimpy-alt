import { db } from '../../firebase.config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

export interface StoredConnection {
  id: string;
  userId: string;
  name: string;
  url?: string;
  company?: string;
  position?: string;
  email?: string;
  location?: string;
  industry?: string;
  // Enriched data
  headline?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
  }>;
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
  summary?: string;
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
  enriched: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ConnectionIndex {
  id: string;
  userId: string;
  connectionId: string;
  // Searchable fields
  name: string;
  company?: string;
  position?: string;
  location?: string;
  skills?: string[];
  headline?: string;
  // Index metadata
  isEnriched: boolean;
  isOpenToWork?: boolean;
  isHiring?: boolean;
  createdAt: Timestamp;
}

export async function storeConnections(userId: string, connections: any[]): Promise<void> {
  const batch = writeBatch(db);
  
  for (const connection of connections) {
    const connectionId = connection.url ? 
      connection.url.split('/in/')[1]?.split('/')[0] || 
      connection.name.toLowerCase().replace(/\s+/g, '-') :
      connection.name.toLowerCase().replace(/\s+/g, '-');
    
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionData: StoredConnection = {
      id: connectionId,
      userId,
      name: connection.name,
      url: connection.url,
      company: connection.company,
      position: connection.position,
      email: connection.email,
      location: connection.location,
      industry: connection.industry,
      headline: connection.headline,
      skills: connection.skills || [],
      experience: connection.experience || [],
      educations: connection.educations || [],
      summary: connection.summary,
      flags: connection.flags,
      languages: connection.languages,
      recommendations: connection.recommendations,
      enriched: connection.enriched || false,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    batch.set(connectionRef, connectionData);
    
    // Create search index
    const indexRef = doc(db, 'connectionIndexes', connectionId);
    const indexData: ConnectionIndex = {
      id: connectionId,
      userId,
      connectionId,
      name: connection.name.toLowerCase(),
      company: connection.company?.toLowerCase(),
      position: connection.position?.toLowerCase(),
      location: connection.location?.toLowerCase(),
      skills: connection.skills?.map((skill: string) => skill.toLowerCase()),
      headline: connection.headline?.toLowerCase(),
      isEnriched: connection.enriched || false,
      isOpenToWork: connection.flags?.isOpenToWork,
      isHiring: connection.flags?.isHiring,
      createdAt: serverTimestamp() as Timestamp,
    };
    
    batch.set(indexRef, indexData);
  }
  
  await batch.commit();
  
}

export async function getUserConnections(userId: string): Promise<StoredConnection[]> {
  const connectionsRef = collection(db, 'connections');
  const q = query(
    connectionsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as StoredConnection);
}

export async function searchConnections(
  userId: string, 
  searchTerm: string,
  filters?: {
    isEnriched?: boolean;
    isOpenToWork?: boolean;
    isHiring?: boolean;
    skills?: string[];
    location?: string;
  }
): Promise<StoredConnection[]> {
  const indexesRef = collection(db, 'connectionIndexes');
  let q = query(
    indexesRef,
    where('userId', '==', userId)
  );
  
  // Apply filters
  if (filters?.isEnriched !== undefined) {
    q = query(q, where('isEnriched', '==', filters.isEnriched));
  }
  if (filters?.isOpenToWork !== undefined) {
    q = query(q, where('isOpenToWork', '==', filters.isOpenToWork));
  }
  if (filters?.isHiring !== undefined) {
    q = query(q, where('isHiring', '==', filters.isHiring));
  }
  
  const snapshot = await getDocs(q);
  const indexes = snapshot.docs.map(doc => doc.data() as ConnectionIndex);
  
  // Filter by search term (client-side for now, could be optimized with Firestore search)
  const filteredIndexes = indexes.filter(index => {
    const searchLower = searchTerm.toLowerCase();
    return (
      index.name.includes(searchLower) ||
      index.company?.includes(searchLower) ||
      index.position?.includes(searchLower) ||
      index.location?.includes(searchLower) ||
      index.headline?.includes(searchLower) ||
      index.skills?.some(skill => skill.includes(searchLower))
    );
  });
  
  // Get full connection data
  const connectionIds = filteredIndexes.map(index => index.connectionId);
  const connections: StoredConnection[] = [];
  
  for (const connectionId of connectionIds) {
    const connectionRef = doc(db, 'connections', connectionId);
    const connectionDoc = await getDocs(query(collection(db, 'connections'), where('id', '==', connectionId)));
    if (!connectionDoc.empty) {
      connections.push(connectionDoc.docs[0].data() as StoredConnection);
    }
  }
  
  return connections;
}

export async function getConnectionStats(userId: string): Promise<{
  total: number;
  enriched: number;
  openToWork: number;
  hiring: number;
  byCompany: Record<string, number>;
  bySkills: Record<string, number>;
}> {
  const indexesRef = collection(db, 'connectionIndexes');
  const q = query(indexesRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const indexes = snapshot.docs.map(doc => doc.data() as ConnectionIndex);
  
  const stats = {
    total: indexes.length,
    enriched: indexes.filter(i => i.isEnriched).length,
    openToWork: indexes.filter(i => i.isOpenToWork).length,
    hiring: indexes.filter(i => i.isHiring).length,
    byCompany: {} as Record<string, number>,
    bySkills: {} as Record<string, number>,
  };
  
  // Count by company
  indexes.forEach(index => {
    if (index.company) {
      stats.byCompany[index.company] = (stats.byCompany[index.company] || 0) + 1;
    }
  });
  
  // Count by skills
  indexes.forEach(index => {
    if (index.skills) {
      index.skills.forEach(skill => {
        stats.bySkills[skill] = (stats.bySkills[skill] || 0) + 1;
      });
    }
  });
  
  return stats;
}

export async function updateConnection(
  connectionId: string, 
  updates: Partial<StoredConnection>
): Promise<void> {
  const connectionRef = doc(db, 'connections', connectionId);
  const indexRef = doc(db, 'connectionIndexes', connectionId);
  
  const batch = writeBatch(db);
  
  // Update connection
  batch.update(connectionRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  
  // Update index if relevant fields changed
  const indexUpdates: Partial<ConnectionIndex> = {};
  if (updates.name) indexUpdates.name = updates.name.toLowerCase();
  if (updates.company) indexUpdates.company = updates.company.toLowerCase();
  if (updates.position) indexUpdates.position = updates.position.toLowerCase();
  if (updates.location) indexUpdates.location = updates.location.toLowerCase();
  if (updates.skills) indexUpdates.skills = updates.skills.map((skill: string) => skill.toLowerCase());
  if (updates.headline) indexUpdates.headline = updates.headline.toLowerCase();
  if (updates.enriched !== undefined) indexUpdates.isEnriched = updates.enriched;
  if (updates.flags?.isOpenToWork !== undefined) indexUpdates.isOpenToWork = updates.flags.isOpenToWork;
  if (updates.flags?.isHiring !== undefined) indexUpdates.isHiring = updates.flags.isHiring;
  
  if (Object.keys(indexUpdates).length > 0) {
    batch.update(indexRef, indexUpdates);
  }
  
  await batch.commit();
} 