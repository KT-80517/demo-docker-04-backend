const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

/**
 * Stores todos in a single JSON file.
 *
 * Writes are serialized through a promise chain so concurrent requests can't
 * clobber each other, and each write goes to a temp file first and is then
 * renamed, so a crash mid-write never leaves a half-written file behind.
 */
class JsonTodoRepository {
  constructor({ filePath }) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, '[]\n');
    }
  }

  async #read() {
    const raw = await fs.readFile(this.filePath, 'utf8');
    return raw.trim() ? JSON.parse(raw) : [];
  }

  async #write(todos) {
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(todos, null, 2) + '\n');
    await fs.rename(tmp, this.filePath);
  }

  // Run a read-modify-write operation exclusively.
  #exclusive(fn) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {});
    return run;
  }

  async findAll({ completed } = {}) {
    const todos = await this.#read();
    return completed === undefined ? todos : todos.filter((t) => t.completed === completed);
  }

  async findById(id) {
    const todos = await this.#read();
    return todos.find((t) => t.id === id) || null;
  }

  create({ title, description = null, completed = false }) {
    return this.#exclusive(async () => {
      const todos = await this.#read();
      const now = new Date().toISOString();
      const todo = { id: randomUUID(), title, description, completed, createdAt: now, updatedAt: now };
      todos.push(todo);
      await this.#write(todos);
      return todo;
    });
  }

  update(id, changes) {
    return this.#exclusive(async () => {
      const todos = await this.#read();
      const index = todos.findIndex((t) => t.id === id);
      if (index === -1) return null;
      todos[index] = { ...todos[index], ...changes, updatedAt: new Date().toISOString() };
      await this.#write(todos);
      return todos[index];
    });
  }

  delete(id) {
    return this.#exclusive(async () => {
      const todos = await this.#read();
      const remaining = todos.filter((t) => t.id !== id);
      if (remaining.length === todos.length) return false;
      await this.#write(remaining);
      return true;
    });
  }

  async close() {
    await this.queue;
  }
}

module.exports = JsonTodoRepository;
