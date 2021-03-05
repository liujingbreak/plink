import {CliExtension} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program) => {
  program.command('scan-tran <directory> [metadata-dir]')
  .description('Can string literals, template expressions, JSX text from specific TS[X], JS[X] files, generate a temporary i18n metadata files',
    {
      directory: 'Target directory to be scanned',
      'metadata-dir': 'output directory of metadata JSON files, default is <pkg dir>/ts/i18n'
    })
  .action(async (dir: string, output?: string) => {
    await (await import('./cli-scan-tran')).scanTran(dir, output);
  });

};

export default cliExt;
