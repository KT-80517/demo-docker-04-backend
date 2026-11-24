const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const request = require('supertest');

const createApp = require('../src/app');
const JsonTodoRepository = require('../src/repositories/json.repository');

let dir, repo, app;

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-test-'));
  repo = new JsonTodoRepository({ filePath: path.join(dir, 'todos.json') });
  await repo.init();
  app = createApp(repo, { dataSource: 'json' });
});

after(async () => {
  await repo.close();
  await fs.rm(dir, { recursive: true, force: true });
});

test('full CRUD lifecycle', async () => {
  const created = await request(app).post('/api/todos').send({ title: '  Buy milk ' }).expect(201);
  assert.equal(created.body.title, 'Buy milk');
  assert.equal(created.body.completed, false);
  assert.equal(created.headers.location, `/api/todos/${created.body.id}`);
  const { id } = created.body;

  await request(app).get(`/api/todos/${id}`).expect(200);

  const patched = await request(app).patch(`/api/todos/${id}`).send({ completed: true }).expect(200);
  assert.equal(patched.body.completed, true);
  assert.equal(patched.body.title, 'Buy milk');

  const done = await request(app).get('/api/todos?completed=true').expect(200);
  assert.deepEqual(done.body.map((t) => t.id), [id]);

  const put = await request(app).put(`/api/todos/${id}`).send({ title: 'Buy oat milk' }).expect(200);
  assert.equal(put.body.completed, false, 'PUT resets omitted fields');

  await request(app).delete(`/api/todos/${id}`).expect(204);
  await request(app).get(`/api/todos/${id}`).expect(404);

  const stored = JSON.parse(await fs.readFile(repo.filePath, 'utf8'));
  assert.deepEqual(stored, []);
});

test('concurrent creates are all persisted', async () => {
  await Promise.all(
    Array.from({ length: 20 }, (_, i) => request(app).post('/api/todos').send({ title: `t${i}` }).expect(201))
  );
  const stored = JSON.parse(await fs.readFile(repo.filePath, 'utf8'));
  assert.equal(stored.length, 20);
});

test('validation errors', async () => {
  await request(app).post('/api/todos').send({}).expect(400);
  await request(app).post('/api/todos').send({ title: 'x', completed: 'yes' }).expect(400);
  await request(app)
    .post('/api/todos')
    .set('Content-Type', 'application/json')
    .send('{bad json')
    .expect(400);
  await request(app).get('/api/todos?completed=maybe').expect(400);
});

test('404s', async () => {
  await request(app).patch('/api/todos/nope').send({ title: 'x' }).expect(404);
  await request(app).delete('/api/todos/nope').expect(404);
  await request(app).get('/api/nothing').expect(404);
});
