import runWithPreserveSymlink from './fork-for-preserve-symlink';

void runWithPreserveSymlink('@wfh/plink/wfh/dist/_app-server.js', {stateExitAction: 'none', handleShutdownMsg: true});
