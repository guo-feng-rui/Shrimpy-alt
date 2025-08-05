import { db } from '../../firebase.config';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

export interface TestConnection {
  id: string;
  name: string;
  company: string;
  position: string;
  location: string;
  skills: string[];
  education: string;
  industry: string;
}

export const testConnections: TestConnection[] = [
  {
    id: 'john-doe-123',
    name: 'John Doe',
    company: 'Tech Corp',
    position: 'Senior React Developer',
    location: 'Taipei Taiwan',
    skills: ['React', 'TypeScript', 'Node.js', 'Frontend Development'],
    education: 'BS Computer Science, Stanford University',
    industry: 'Technology'
  },
  {
    id: 'jane-smith-456',
    name: 'Jane Smith',
    company: 'Startup Inc',
    position: 'Frontend Engineer',
    location: 'San Francisco CA',
    skills: ['React', 'Vue.js', 'JavaScript', 'UI/UX'],
    education: 'MS Computer Science, MIT',
    industry: 'Technology'
  },
  {
    id: 'mike-johnson-789',
    name: 'Mike Johnson',
    company: 'Big Corp',
    position: 'Backend Developer',
    location: 'New York NY',
    skills: ['Python', 'Django', 'PostgreSQL', 'API Development'],
    education: 'BS Software Engineering, NYU',
    industry: 'Finance'
  },
  {
    id: 'sarah-wilson-101',
    name: 'Sarah Wilson',
    company: 'AI Startup',
    position: 'ML Engineer',
    location: 'Austin TX',
    skills: ['Python', 'TensorFlow', 'Machine Learning', 'Data Science'],
    education: 'PhD Computer Science, Stanford University',
    industry: 'Technology'
  },
  {
    id: 'david-brown-202',
    name: 'David Brown',
    company: 'Consulting Co',
    position: 'DevOps Engineer',
    location: 'Seattle WA',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
    education: 'BS Information Technology, University of Washington',
    industry: 'Consulting'
  }
];

export async function setupTestData(userId: string): Promise<void> {
  try {
    console.log('📊 Setting up test data for user:', userId);
    
    // Add test connections to test-connections collection (not profileCache)
    for (const connection of testConnections) {
      const docRef = doc(db, 'test-connections', connection.id);
      await setDoc(docRef, {
        ...connection,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✅ Added test connection: ${connection.name}`);
    }
    
    console.log('✅ Test data setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    throw error;
  }
}

export async function clearTestData(): Promise<void> {
  try {
    console.log('🧹 Clearing test data...');
    
    // Clear test-connections collection
    const testConnectionsRef = collection(db, 'test-connections');
    const testConnectionsDocs = await getDocs(testConnectionsRef);
    
    for (const doc of testConnectionsDocs.docs) {
      await doc.ref.delete();
    }
    
    // Clear connection_vectors
    const vectorsRef = collection(db, 'connection_vectors');
    const vectorsDocs = await getDocs(vectorsRef);
    
    for (const doc of vectorsDocs.docs) {
      await doc.ref.delete();
    }
    
    console.log('✅ Test data cleared');
  } catch (error) {
    console.error('❌ Failed to clear test data:', error);
    throw error;
  }
} 