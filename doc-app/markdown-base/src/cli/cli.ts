import {CliExtension} from '@wfh/plink';
import * as cliMarkdownServer0 from './cli-startMarkdownServer';

const cliExt: CliExtension = (program) => {
  const cmdStartMarkdown = program.command('start-markdown-server')
    .alias('smds')
    .argument('[port]', 'API server port', '8989')
    .option('--static-dev', 'Whether proxy to dev server of static resource')
    .description('Start Markdown server')
    .action((port: string) => {
      void (require('./cli-startMarkdownServer') as typeof cliMarkdownServer0)
        .startServer(Number(port), cmdStartMarkdown.opts().staticDev);
    });
};

export default cliExt;
