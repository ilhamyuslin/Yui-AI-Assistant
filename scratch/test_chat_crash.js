
require('dotenv').config();
const { app } = require('../src/server/apiServer');
const http = require('http');

const server = http.createServer(app);
server.listen(3001, () => {
  console.log('Test server listening on 3001');
  
  // Test /api/chat/history (will fail auth but should return 401, not 502)
  http.get('http://localhost:3001/api/chat/history', (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', (d) => console.log('Data:', d.toString()));
    process.exit(0);
  }).on('error', (e) => {
    console.error('Error:', e);
    process.exit(1);
  });
});
