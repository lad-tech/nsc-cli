const cleanupAndExit = async () => {
  console.log('Shutdown');
  // TODO Описать отключение сервисов

  console.log('Finished cleanup, exiting');
  process.exit(0);
};


function handleSignal(signal: string) {
  return function() {
   console.log(`${signal} received`);
    cleanupAndExit();
  };
}

function handleFatalError(message: string) {
  return function(err: any) {
    console.log(message, err);
    process.exit(1);
  };
}

process.on('SIGINT', handleSignal('SIGINT'));
process.on('SIGQUIT', handleSignal('SIGQUIT'));
process.on('SIGTERM', handleSignal('SIGTERM'));
process.on('uncaughtException', handleFatalError('Uncaught exception'));
process.on('unhandledRejection', handleFatalError('Unhandled rejection'));
