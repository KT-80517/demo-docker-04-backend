const config = require('./config');
const createApp = require('./app');
const { createRepository } = require('./repositories');

async function main() {
  const repo = await createRepository(config.dataSource);
  const app = createApp(repo, { dataSource: config.dataSource, corsOrigin: config.corsOrigin });

  const server = app.listen(config.port, () => {
    console.log(`ToDo API listening on http://localhost:${config.port} (data source: ${config.dataSource})`);
  });

  const shutdown = () => {
    server.close(async () => {
      await repo.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
