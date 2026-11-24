const express = require('express');
const { parseTodo } = require('../middleware/validate');

function todosRouter(repo) {
  const router = express.Router();

  // GET /api/todos?completed=true|false
  router.get('/', async (req, res) => {
    const { completed } = req.query;
    const filter = {};
    if (completed === 'true') filter.completed = true;
    else if (completed === 'false') filter.completed = false;
    else if (completed !== undefined) {
      return res.status(400).json({ error: 'completed must be "true" or "false"' });
    }
    res.json(await repo.findAll(filter));
  });

  router.get('/:id', async (req, res) => {
    const todo = await repo.findById(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  });

  router.post('/', async (req, res) => {
    const todo = await repo.create(parseTodo(req.body));
    res.status(201).location(`${req.baseUrl}/${todo.id}`).json(todo);
  });

  // PUT replaces the editable fields; PATCH updates only the fields sent.
  router.put('/:id', async (req, res) => {
    const data = parseTodo(req.body);
    const todo = await repo.update(req.params.id, {
      description: null,
      completed: false,
      ...data,
    });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  });

  router.patch('/:id', async (req, res) => {
    const todo = await repo.update(req.params.id, parseTodo(req.body, { partial: true }));
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  });

  router.delete('/:id', async (req, res) => {
    const deleted = await repo.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Todo not found' });
    res.status(204).end();
  });

  return router;
}

module.exports = todosRouter;
