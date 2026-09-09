import { createServer } from './server';
import { env } from './config/env';

const { httpServer } = createServer();

httpServer.listen(env.PORT, () => {
  console.log(`🚀 [API Server] Running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
  console.log(`📡 [Socket.io] Realtime Gateway active`);
});
