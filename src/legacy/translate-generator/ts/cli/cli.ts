import {CliExtension} from '@wfh/plink/wfh/dist';
import plink from '__plink';

const cliExt: CliExtension = (program) => {
  const scanCmd = program.command('scan-tran <locale> [pkg-name]')
  .description('Scan string literals, template expressions, JSX text from specific TS[X], JS[X] files, generate a temporary i18n metadata files',
    {
      locale: 'e.g. "zh", "zh_CN", "zh-CN"...',
      'pkg-name': 'linked (source) package name, will scann package directory for js files,' +
      ' metadata output directory is <pkg dir>/ts/i18n'
    })
  .option('-d,--dir <JS directory>',
    'JS file directory to be scanned, you may specify either [pkg-name] or "-d <JS directory>" as input file directory')
  .option('-r,--root-dir <dir>', 'the root dir of input file directory, to calculate relative path of output metadata file, default is same as "-d"')
  .option('-m,--metadata-dir <metadata-dir>',  'output directory of metadata JSON files, default is <pkg dir>/ts/i18n')
  .option('--exclude-js', 'exclude JS, JSX files', true)
  .action(async (locale: string, pkgName?: string) => {
    if (pkgName == null && scanCmd.opts().dir == null) {
      plink.logger.error('[pkg-name] and "-d" can not be both empty');
    }

    await (await import('./cli-scan-tran')).scanTran(locale,
      pkgName, scanCmd.opts().rootDir, scanCmd.opts().dir, scanCmd.opts().metadataDir, scanCmd.opts().excludeJs);
  });

};

export default cliExt;
