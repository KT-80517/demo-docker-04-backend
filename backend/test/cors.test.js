const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');

const repo = { findAll: async () => [] };

test('allows any origin by default', async () => {
  const res = await request(createApp(repo, { corsOrigin: '*' }))
    .get('/api/todos')
    .set('Origin', 'http://anywhere.test');
  assert.equal(res.headers['access-control-allow-origin'], '*');
});

test('echoes only listed origins', async () => {
  const app = createApp(repo, { corsOrigin: 'http://localhost:5173, http://localhost:8080/' });

  const ok = await request(app).get('/api/todos').set('Origin', 'http://localhost:8080').expect(200);
  assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:8080');
  assert.match(ok.headers.vary, /Origin/);

  const blocked = await request(app).get('/api/todos').set('Origin', 'http://evil.test');
  assert.equal(blocked.headers['access-control-allow-origin'], undefined);
});

test('answers preflight requests', async () => {
  const res = await request(createApp(repo, { corsOrigin: 'http://localhost:8080' }))
    .options('/api/todos/123')
    .set('Origin', 'http://localhost:8080')
    .set('Access-Control-Request-Method', 'PATCH')
    .set('Access-Control-Request-Headers', 'Content-Type')
    .expect(204);
  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:8080');
  assert.match(res.headers['access-control-allow-methods'], /PATCH/);
  assert.match(res.headers['access-control-allow-headers'], /Content-Type/);
});
