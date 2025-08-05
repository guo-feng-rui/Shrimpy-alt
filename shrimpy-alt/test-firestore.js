import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// Firebase config (you'll need to add your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "shrimpy-alt-weak-ties.firebaseapp.com",
  projectId: "shrimpy-alt-weak-ties",
  storageBucket: "shrimpy-alt-weak-ties.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestData() {
  try {
    console.log('🔄 Adding test data to profileCache...');
    
    const testConnections = [
      {
        name: 'John Doe',
        position: 'Senior React Developer',
        company: 'Tech Corp',
        location: 'Taipei Taiwan',
        industry: 'Technology',
        userId: 'test-user',
        url: 'john-doe-123'
      },
      {
        name: 'Jane Smith',
        position: 'Frontend Engineer',
        company: 'Startup Inc',
        location: 'San Francisco CA',
        industry: 'Technology',
        userId: 'test-user',
        url: 'jane-smith-456'
      },
      {
        name: 'Mike Johnson',
        position: 'Backend Developer',
        company: 'Big Corp',
        location: 'New York NY',
        industry: 'Finance',
        userId: 'test-user',
        url: 'mike-johnson-789'
      }
    ];
    
    for (const connection of testConnections) {
      await addDoc(collection(db, 'profileCache'), connection);
      console.log(`✅ Added: ${connection.name}`);
    }
    
    console.log('🎉 Test data added successfully!');
    
    // Verify the data was added
    const q = query(collection(db, 'profileCache'), where('userId', '==', 'test-user'));
    const querySnapshot = await getDocs(q);
    console.log(`📊 Found ${querySnapshot.size} connections for test-user`);
    
  } catch (error) {
    console.error('❌ Failed to add test data:', error);
  }
}

addTestData(); 