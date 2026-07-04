/**
 * Test script for prediction notification integration
 * Tests that predictions trigger WebSocket notifications
 */

const http = require('http');

const serverUrl = 'http://localhost:3000';
const testMatch = {
  team_home: 'Real Madrid',
  team_away: 'Barcelona',
  league: 'FC 25. Champions League'
};

console.log('🧪 Testing Prediction Notification Integration');
console.log('Server:', serverUrl);
console.log('Test Match:', testMatch);
console.log('');

// Test single prediction
function testSinglePrediction() {
  console.log('📡 Testing single prediction notification...');
  
  const postData = JSON.stringify(testMatch);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/prediction',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Single prediction response:', res.statusCode);
          console.log('   Match:', response.prediction?.match);
          console.log('   Family:', response.prediction?.family);
          console.log('   Confidence:', response.prediction?.predictions?.['1x2']?.confidence);
          console.log('');
          resolve(response);
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout after 10s'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Test batch prediction
function testBatchPrediction() {
  console.log('📡 Testing batch prediction notification...');
  
  const batchData = {
    matches: [
      {
        team_home: 'Chelsea',
        team_away: 'Liverpool',
        league: 'FC 25. Championnat d\'Angleterre'
      },
      {
        team_home: 'PSG',
        team_away: 'Marseille',
        league: 'FC 25. Championnat d\'Espagne'
      }
    ]
  };
  
  const postData = JSON.stringify(batchData);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/prediction/batch',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Batch prediction response:', res.statusCode);
          console.log('   Total:', response.batch?.total);
          console.log('   Successful:', response.batch?.successful);
          console.log('   Predictions:', response.batch?.predictions?.length);
          console.log('');
          resolve(response);
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout after 10s'));
    });
    
    req.write(postData);
    req.end();
  });
}

// Test WebSocket connection
function testWebSocketConnection() {
  console.log('🔌 Testing WebSocket connection...');
  
  const WebSocket = require('ws');
  const ws = new WebSocket('ws://localhost:3000/ws/notifications');
  
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      console.log('');
      ws.close();
      resolve();
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      console.log('');
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket closed');
    });
    
    ws.on('message', (data) => {
      console.log('📨 WebSocket message:', data.toString());
    });
    
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket connection timeout'));
      }
    }, 5000);
  });
}

// Run tests
async function runTests() {
  try {
    // Test WebSocket connection
    await testWebSocketConnection();
    
    // Test single prediction
    await testSinglePrediction();
    
    // Test batch prediction
    await testBatchPrediction();
    
    console.log('✅ All tests completed successfully!');
    console.log('');
    console.log('📝 Manual verification steps:');
    console.log('1. Open browser to http://localhost:3000/coupon.html');
    console.log('2. Click notification bell icon (top-right)');
    console.log('3. Generate a prediction');
    console.log('4. Check notification panel for prediction notification');
    console.log('5. Verify notification shows confidence and family');
    console.log('');
    console.log('🔔 Expected notification behavior:');
    console.log('- Notification appears in panel');
    console.log('- Badge counter increments');
    console.log('- Browser notification (if permission granted)');
    console.log('- Sound plays (if sound file exists)');
    console.log('- Vibration on mobile (if supported)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('- Ensure server is running: node server.js');
    console.log('- Check WebSocket server is initialized');
    console.log('- Verify prediction API is accessible');
    console.log('- Check browser console for errors');
    process.exit(1);
  }
}

// Check if ws module is available
try {
  require('ws');
  runTests();
} catch (error) {
  console.error('❌ ws module not installed');
  console.log('💡 Install with: npm install ws');
  process.exit(1);
}
