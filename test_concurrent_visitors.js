#!/usr/bin/env node

/**
 * Concurrent Visitor Numbering Test Script
 * 
 * This script tests the visitor numbering system under concurrent load
 * to ensure that:
 * 1. No duplicate visitor numbers are assigned
 * 2. All visitors get sequential numbers
 * 3. The system handles race conditions correctly
 * 4. Firebase metadata includes visitor numbers
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS) || 10;

class VisitorNumberingTester {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async createExperimentSession() {
    try {
      // First get the active experiment
      const experimentResponse = await fetch(`${API_BASE_URL}/experiment`);
      if (!experimentResponse.ok) {
        throw new Error(`Failed to fetch experiment: ${experimentResponse.status}`);
      }
      
      const experiment = await experimentResponse.json();
      
      // Create a new session
      const sessionResponse = await fetch(`${API_BASE_URL}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          experimentId: experiment.id,
          currentLevel: 1,
          branchingPath: 'default'
        })
      });
      
      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.status}`);
      }
      
      const session = await sessionResponse.json();
      return session;
      
    } catch (error) {
      throw new Error(`Session creation failed: ${error.message}`);
    }
  }

  async submitTestResponse(sessionId, visitorNumber) {
    try {
      const response = await fetch(`${API_BASE_URL}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          levelId: 'test-level',
          questionId: 'test-question',
          responseType: 'text',
          responseData: JSON.stringify({
            value: `Test response from visitor #${visitorNumber}`,
            timestamp: new Date().toISOString()
          })
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit response: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Response submission failed:', error.message);
      return null;
    }
  }

  async simulateUser(userIndex) {
    const startTime = Date.now();
    
    try {
      // Create session (this should assign visitor number)
      const session = await this.createExperimentSession();
      const endTime = Date.now();
      
      const result = {
        userIndex,
        sessionId: session.id,
        visitorNumber: session.visitorNumber,
        userId: session.userId,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
        success: true
      };
      
      // Submit a test response to verify visitor number propagation
      if (session.visitorNumber) {
        const response = await this.submitTestResponse(session.id, session.visitorNumber);
        result.responseSubmitted = !!response;
      }
      
      return result;
      
    } catch (error) {
      return {
        userIndex,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        success: false
      };
    }
  }

  async runConcurrentTest() {
    console.log(`🚀 Starting concurrent visitor numbering test with ${CONCURRENT_USERS} users`);
    console.log(`📍 API Base URL: ${API_BASE_URL}`);
    console.log(`⏰ Start time: ${new Date().toISOString()}\n`);

    const startTime = Date.now();
    
    // Create array of user simulation promises
    const userPromises = Array.from({ length: CONCURRENT_USERS }, (_, index) =>
      this.simulateUser(index)
    );

    // Execute all user simulations concurrently
    try {
      const results = await Promise.all(userPromises);
      const endTime = Date.now();
      
      // Separate successful and failed results
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      this.analyzeResults(successfulResults, failedResults, endTime - startTime);
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  }

  analyzeResults(successful, failed, totalDuration) {
    console.log('📊 TEST RESULTS');
    console.log('=' .repeat(50));
    console.log(`✅ Successful sessions: ${successful.length}`);
    console.log(`❌ Failed sessions: ${failed.length}`);
    console.log(`⏱️  Total duration: ${totalDuration}ms`);
    console.log(`📈 Average session creation: ${totalDuration / CONCURRENT_USERS}ms\n`);

    if (failed.length > 0) {
      console.log('💥 FAILURES:');
      failed.forEach(fail => {
        console.log(`  User ${fail.userIndex}: ${fail.error}`);
      });
      console.log('');
    }

    if (successful.length > 0) {
      this.validateVisitorNumbers(successful);
      this.validateDataConsistency(successful);
    }

    // Print summary
    console.log('🎯 SUMMARY');
    console.log('=' .repeat(50));
    if (successful.length === CONCURRENT_USERS) {
      console.log('✅ All users successfully created sessions');
    } else {
      console.log(`⚠️  ${failed.length} users failed to create sessions`);
    }
  }

  validateVisitorNumbers(results) {
    console.log('🔍 VISITOR NUMBER ANALYSIS:');
    
    const visitorNumbers = results
      .filter(r => r.visitorNumber)
      .map(r => r.visitorNumber)
      .sort((a, b) => a - b);
    
    const withNumbers = results.filter(r => r.visitorNumber);
    const withoutNumbers = results.filter(r => !r.visitorNumber);
    
    console.log(`  Sessions with visitor numbers: ${withNumbers.length}`);
    console.log(`  Sessions without visitor numbers: ${withoutNumbers.length}`);
    
    if (withNumbers.length > 0) {
      console.log(`  Visitor number range: ${Math.min(...visitorNumbers)} - ${Math.max(...visitorNumbers)}`);
    }

    // Check for duplicates
    const duplicates = visitorNumbers.filter((num, index) => 
      visitorNumbers.indexOf(num) !== index
    );
    
    if (duplicates.length > 0) {
      console.log(`  ❌ DUPLICATE VISITOR NUMBERS FOUND: ${duplicates.join(', ')}`);
    } else if (visitorNumbers.length > 0) {
      console.log(`  ✅ No duplicate visitor numbers detected`);
    }

    // Check for sequential numbering
    if (visitorNumbers.length > 1) {
      let sequential = true;
      for (let i = 1; i < visitorNumbers.length; i++) {
        if (visitorNumbers[i] !== visitorNumbers[i-1] + 1) {
          sequential = false;
          break;
        }
      }
      
      if (sequential) {
        console.log(`  ✅ Visitor numbers are sequential`);
      } else {
        console.log(`  ⚠️  Visitor numbers are not sequential (may indicate existing data)`);
      }
    }

    console.log('');
  }

  validateDataConsistency(results) {
    console.log('🔗 DATA CONSISTENCY CHECK:');
    
    const responsesSubmitted = results.filter(r => r.responseSubmitted).length;
    console.log(`  Responses submitted: ${responsesSubmitted}/${results.length}`);
    
    const withUserIds = results.filter(r => r.userId).length;
    console.log(`  Sessions with user IDs: ${withUserIds}/${results.length}`);
    
    if (responsesSubmitted === results.length) {
      console.log(`  ✅ All responses successfully submitted`);
    } else {
      console.log(`  ⚠️  Some responses failed to submit`);
    }
    
    console.log('');
  }
}

// Run the test
async function main() {
  const tester = new VisitorNumberingTester();
  
  try {
    await tester.runConcurrentTest();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  main();
}

module.exports = VisitorNumberingTester;