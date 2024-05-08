process.on('uncaughtException', (error, origin) => {
  console.error('uncaughtException');
  console.error('error', error);
  console.error('origin', origin);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection');
  console.error('reason', reason);
  console.error('promise', promise);
});
