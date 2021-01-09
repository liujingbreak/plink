import {CliExtension, prepareLazyNodeInjector, initConfig, GlobalOptions} from '@wfh/plink/wfh/dist';
// import Path from 'path';
import * as _unzip from './cli-unzip';

const defaultCfg: GlobalOptions = {config: [], prop: []};

const cliExt: CliExtension = (program, withGlobalOptions) => {
  // ------- zip -------
  const cmd = program.command('zip <srcDir> <destZipFile>')
  .description('Create zip file in 64 zip mode')
  .option('-e, --exclude <regex>', 'exclude files')
  .action(async (srcDir: string, destZipFile: string) => {
    initConfig(defaultCfg);
    prepareLazyNodeInjector();
    const {zipDir} = await import('./remote-deploy');
    await zipDir(srcDir, destZipFile, cmd.opts().exclude);
  });

  // -------- listzip --------
  program.command('listzip <file>')
  .description('List zip file content and size')
  .action(async file => {
    const {listZip}: typeof _unzip = require('./cli-unzip');
    await listZip(file);
  });

  // -------- unzip --------
  const unzipCmd = program.command('unzip <zipFile> [destination_dir]')
  .description('Extract zip files to specific directory')
  // .requiredOption('-d,--dest <dir>', 'destination directory')
  .action(async (zipFile: string, destDir?: string) => {
    initConfig(defaultCfg);
    prepareLazyNodeInjector();
    const {unZip} = await import('./cli-unzip');
    await unZip(zipFile, destDir);
  });
  withGlobalOptions(unzipCmd);
};

export default cliExt;
