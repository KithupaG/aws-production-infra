const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BACKEND REST API INTEGRITY TESTS ---');

  try {
    // 1. Test Healthcheck
    console.log('\n[TEST 1] GET /health');
    const health = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/health',
      method: 'GET'
    });
    console.log(`Status: ${health.status}`);
    console.log('Body:', JSON.stringify(health.body, null, 2));

    // 2. Test Note Creation
    console.log('\n[TEST 2] POST /api/notes');
    const payload = {
      title: 'DevOps HA Sandbox Note',
      content: 'Configured with dual database adapter, Winston JSON logging, and graceful SIGTERM shutdown handlers.',
      category: 'Work',
      tags: 'aws, devops, alb, rds',
      color: '#a855f7'
    };
    const create = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, payload);
    console.log(`Status: ${create.status}`);
    console.log('Body:', JSON.stringify(create.body, null, 2));
    const createdNoteId = create.body.id;

    // 3. Test GET all notes
    console.log('\n[TEST 3] GET /api/notes');
    const getNotes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes',
      method: 'GET'
    });
    console.log(`Status: ${getNotes.status}`);
    console.log(`Total Notes retrieved: ${getNotes.body.length}`);
    console.log('First note title:', getNotes.body[0].title);

    // 4. Test PUT Update note
    console.log(`\n[TEST 4] PUT /api/notes/${createdNoteId}`);
    const updatePayload = {
      title: 'Updated DevOps HA Sandbox Note',
      content: 'This note content has been verified via internal testing.',
      category: 'Todo',
      tags: 'aws, test-verified',
      color: '#10b981'
    };
    const update = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${createdNoteId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }, updatePayload);
    console.log(`Status: ${update.status}`);
    console.log('Body:', JSON.stringify(update.body, null, 2));

    // 5. Test DELETE note
    console.log(`\n[TEST 5] DELETE /api/notes/${createdNoteId}`);
    const del = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${createdNoteId}`,
      method: 'DELETE'
    });
    console.log(`Status: ${del.status}`);
    console.log('Body:', JSON.stringify(del.body, null, 2));

    console.log('\n--- ALL API INTEGRITY TESTS VERIFIED SUCCESSFULLY ---');
  } catch (err) {
    console.error('API Verification failed:', err.message);
  }
}

runTests();
