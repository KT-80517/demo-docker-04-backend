require('dotenv').config({ quiet: true });
const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 3000,

  // Origins allowed to call the API from a browser: "*" or a comma-separated list.
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Which data source to use: "json" (default) or "mysql".
  dataSource: (process.env.DATA_SOURCE || 'json').toLowerCase(),

  json: {
    filePath: path.resolve(
      process.env.JSON_DB_PATH || path.join(__dirname, '..', 'data', 'todos.json')
    ),
  },

  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'todo_app',
  },
};
