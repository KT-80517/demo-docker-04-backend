/**
 * Data-source factory. To switch storage, set DATA_SOURCE in .env.
 * To add a new source, write a class with the same methods as
 * JsonTodoRepository (init, findAll, findById, create, update, delete, close)
 * and register it below.
 */
const config = require('../config');

const sources = {
  json: () => new (require('./json.repository'))(config.json),
  mysql: () => new (require('./mysql.repository'))(config.mysql),
};

async function createRepository(type = config.dataSource) {
  const factory = sources[type];
  if (!factory) {
    throw new Error(`Unknown DATA_SOURCE "${type}". Use one of: ${Object.keys(sources).join(', ')}`);
  }
  const repo = factory();
  await repo.init();
  return repo;
}

module.exports = { createRepository };
