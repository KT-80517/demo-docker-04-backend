const { randomUUID } = require('crypto');

/**
 * Stores todos in a MySQL table. Exposes exactly the same methods and return
 * shapes as JsonTodoRepository, so the rest of the app doesn't care which one
 * is in use. Schema: db/schema.sql (also created automatically by init()).
 */
class MysqlTodoRepository {
  constructor(options) {
    // Required lazily so the JSON setup works without touching mysql2.
    const mysql = require('mysql2/promise');
    this.pool = mysql.createPool({ ...options, waitForConnections: true, connectionLimit: 10 });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id          CHAR(36)     NOT NULL PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        description TEXT         NULL,
        completed   BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at  DATETIME(3)  NOT NULL,
        updated_at  DATETIME(3)  NOT NULL
      )
    `);
  }

  static #toTodo(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: Boolean(row.completed),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  async findAll({ completed } = {}) {
    const [rows] =
      completed === undefined
        ? await this.pool.query('SELECT * FROM todos ORDER BY created_at')
        : await this.pool.query('SELECT * FROM todos WHERE completed = ? ORDER BY created_at', [completed]);
    return rows.map(MysqlTodoRepository.#toTodo);
  }

  async findById(id) {
    const [rows] = await this.pool.query('SELECT * FROM todos WHERE id = ?', [id]);
    return rows.length ? MysqlTodoRepository.#toTodo(rows[0]) : null;
  }

  async create({ title, description = null, completed = false }) {
    const id = randomUUID();
    const now = new Date();
    await this.pool.query(
      'INSERT INTO todos (id, title, description, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title, description, completed, now, now]
    );
    return this.findById(id);
  }

  async update(id, changes) {
    const columns = { title: 'title', description: 'description', completed: 'completed' };
    const sets = [];
    const values = [];
    for (const [key, column] of Object.entries(columns)) {
      if (key in changes) {
        sets.push(`${column} = ?`);
        values.push(changes[key]);
      }
    }
    sets.push('updated_at = ?');
    values.push(new Date(), id);

    const [result] = await this.pool.query(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`, values);
    return result.affectedRows ? this.findById(id) : null;
  }

  async delete(id) {
    const [result] = await this.pool.query('DELETE FROM todos WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = MysqlTodoRepository;
