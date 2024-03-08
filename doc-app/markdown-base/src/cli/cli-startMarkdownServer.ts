import {config, runServer, exitHooks} from '@wfh/plink';

export async function startServer(port: number, connectToDevServer = false) {
  config.set('port', port);
  if (connectToDevServer) {
    config.change(setting => {
      setting['@wfh/markdown-base'].markdownDevServer = 'http://localhost:14333';
    });
  }
  const {started, shutdown} = runServer();
  exitHooks.push(shutdown);
  await started;
  // eslint-disable-next-line no-console
  console.log('Markdown server is started');
}
