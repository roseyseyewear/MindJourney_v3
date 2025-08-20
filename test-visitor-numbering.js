// Test script for visitor numbering system
// This simulates concurrent users starting experiments simultaneously

const API_BASE = 'http://localhost:5000'; // Adjust if needed

async function makeRequest(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  return response.json();
}

async function createSession(experimentId, userId = null) {
  try {
    const sessionData = {
      experimentId,
      currentLevel: 1,
      branchingPath: 'default',
    };
    
    if (userId) {
      sessionData.userId = userId;
    }
    
    const session = await makeRequest('POST', '/api/session', sessionData);
    console.log(`✅ Session created: ${session.id} - Visitor #${session.visitorNumber}`);
    return session;
  } catch (error) {
    console.error('❌ Error creating session:', error);
    return null;
  }
}

async function getActiveExperiment() {
  try {
    const experiment = await makeRequest('GET', '/api/experiment');
    return experiment;
  } catch (error) {
    console.error('❌ Error fetching experiment:', error);
    return null;
  }
}

async function testConcurrentSessions(numberOfSessions = 10) {
  console.log(`🚀 Testing ${numberOfSessions} concurrent session creations...`);
  
  // Get active experiment
  const experiment = await getActiveExperiment();
  if (!experiment) {
    console.error('❌ No active experiment found');
    return;
  }
  
  console.log(`📊 Using experiment: ${experiment.title} (ID: ${experiment.id})`);
  
  // Create multiple sessions concurrently
  const promises = [];
  for (let i = 0; i < numberOfSessions; i++) {
    promises.push(createSession(experiment.id));
  }
  
  console.log('⏳ Creating sessions concurrently...');
  const startTime = Date.now();
  
  try {
    const sessions = await Promise.all(promises);
    const endTime = Date.now();
    
    // Filter out failed sessions
    const successfulSessions = sessions.filter(s => s && s.visitorNumber);
    const failedSessions = sessions.filter(s => !s || !s.visitorNumber);
    
    console.log(`\n📈 Results (${endTime - startTime}ms):`);
    console.log(`✅ Successful sessions: ${successfulSessions.length}`);
    console.log(`❌ Failed sessions: ${failedSessions.length}`);
    
    if (successfulSessions.length > 0) {
      // Check for duplicate visitor numbers
      const visitorNumbers = successfulSessions.map(s => s.visitorNumber);
      const uniqueNumbers = new Set(visitorNumbers);
      
      console.log(`\n🔢 Visitor Numbers:`);
      console.log(`Assigned: [${visitorNumbers.sort((a, b) => a - b).join(', ')}]`);
      console.log(`Unique: ${uniqueNumbers.size}/${successfulSessions.length}`);
      
      if (uniqueNumbers.size === successfulSessions.length) {
        console.log(`✅ SUCCESS: All visitor numbers are unique!`);
      } else {
        console.log(`❌ FAILURE: Duplicate visitor numbers detected!`);
        
        // Find duplicates
        const seen = new Set();
        const duplicates = [];
        for (const num of visitorNumbers) {
          if (seen.has(num)) {
            duplicates.push(num);
          } else {
            seen.add(num);
          }
        }
        console.log(`🔍 Duplicates: [${duplicates.join(', ')}]`);
      }
      
      // Check sequential numbering
      const sortedNumbers = [...visitorNumbers].sort((a, b) => a - b);
      const isSequential = sortedNumbers.every((num, i) => 
        i === 0 || num === sortedNumbers[i - 1] + 1
      );
      
      if (isSequential) {
        console.log(`✅ SUCCESS: Numbers are sequential!`);
      } else {
        console.log(`⚠️  WARNING: Numbers are not sequential (this may be expected if other tests ran)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (process.argv[2] === 'test') {
  const numberOfSessions = parseInt(process.argv[3]) || 5;
  testConcurrentSessions(numberOfSessions);
} else {
  console.log('Usage: node test-visitor-numbering.js test [number_of_sessions]');
  console.log('Example: node test-visitor-numbering.js test 10');
}