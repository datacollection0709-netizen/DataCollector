import { app } from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Attribute 3 Data Collection Backend Server Active`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🩺 Health: http://localhost:${config.port}/health`);
  console.log(`🛡️  Environment: ${config.nodeEnv}`);
  console.log(`====================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
