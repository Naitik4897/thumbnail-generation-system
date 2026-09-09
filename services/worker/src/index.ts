import { createThumbnailWorker } from './worker';

console.log('🔄 Initializing Background Thumbnail Processing Worker...');
const worker = createThumbnailWorker();

const handleShutdown = async () => {
  console.log('\n🛑 Gracefully shutting down worker...');
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
