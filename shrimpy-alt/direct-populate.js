// Direct population of test data to fix the search issue
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

// Firebase config (from .env.local)
const firebaseConfig = {
  apiKey: "AIzaSyCKI8O6Ed-BsXEXHXogUhSiugqvgxG7N9Q",
  projectId: "shrimpy-alt-weak-ties",
  authDomain: "shrimpy-alt-weak-ties",
  storageBucket: "shrimpy-alt-weak-ties.firebasestorage.app",
  messagingSenderId: "52954137892",
  appId: "1:52954137892:web:42ced7d29e5a01085e5fb1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simple test data with mock embeddings
const testConnections = [
  {
    id: 'john-doe-nyc',
    name: 'John Doe',
    company: 'StartupCorp NYC',
    position: 'Business Development Partner',
    location: 'New York City',
    skills: ['Business Development', 'Partnerships', 'Strategy']
  },
  {
    id: 'jane-austin',
    name: 'Jane Smith',
    company: 'Austin Tech',
    position: 'Software Engineer',
    location: 'Austin, Texas',
    skills: ['React', 'JavaScript', 'Node.js']
  },
  {
    id: 'mike-developer',
    name: 'Mike Johnson',
    company: 'DevCorp',
    position: 'Senior React Developer',
    location: 'San Francisco',
    skills: ['React', 'TypeScript', 'Frontend']
  }
];

function createMockVector(seed, size = 1536) {
  const vector = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff;
  }
  
  for (let i = 0; i < size; i++) {
    hash = ((hash * 1664525) + 1013904223) & 0xffffffff;
    vector.push((hash / 0xffffffff) * 0.1);
  }
  return vector;
}

async function populateDirectly() {
  console.log('🔄 Directly populating Firestore with test data...');
  
  try {
    for (const conn of testConnections) {
      const timestamp = new Date();
      const baseEmbedding = {
        dimension: 1536,
        model: 'mock-embedding',
        timestamp
      };
      
      const connectionVector = {
        connectionId: conn.id,
        userId: 'test-user',
        originalConnection: conn,
        
        // Mock embeddings based on connection data
        skillsVector: { ...baseEmbedding, vector: createMockVector(conn.skills.join(' ')) },
        experienceVector: { ...baseEmbedding, vector: createMockVector(conn.position) },
        companyVector: { ...baseEmbedding, vector: createMockVector(conn.company) },
        locationVector: { ...baseEmbedding, vector: createMockVector(conn.location) },
        networkVector: { ...baseEmbedding, vector: createMockVector(conn.name) },
        goalVector: { ...baseEmbedding, vector: createMockVector('general networking') },
        educationVector: { ...baseEmbedding, vector: createMockVector('university') },
        
        // Metadata
        skills: conn.skills,
        companies: [conn.company],
        locations: [conn.location],
        jobTitles: [conn.position],
        industries: ['Technology'],
        education: ['University'],
        
        lastUpdated: timestamp,
        isActive: true
      };
      
      await setDoc(doc(db, 'connection_vectors', conn.id), connectionVector);
      console.log(`✅ Added: ${conn.name} - ${conn.position} in ${conn.location}`);
    }
    
    console.log('🎉 Successfully populated test data!');
    console.log('📊 You can now test searches like:');
    console.log('   • "business partner in NYC"');
    console.log('   • "software engineer in Austin"');
    console.log('   • "React developer"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

populateDirectly();