import app from './app.js';

const server = app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => {
  console.log(`VisioAccess API lista en puerto ${server.address().port}`);
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => { server.close(); setTimeout(() => process.exit(1), 10000).unref(); });
}
