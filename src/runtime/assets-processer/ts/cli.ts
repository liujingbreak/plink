import {CliExtension, prepareLazyNodeInjector, initConfig, GlobalOptions} from '@wfh/plink/wfh/dist';
import Path from 'path';
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
  const unzipCmd = program.command('unzip <zipFileDirectory>')
  .description('Extract all zip files from specific directory')
  .requiredOption('-d,--dest <dir>', 'destination directory')
  .action(async (zipFileDirectory: string) => {
    initConfig(defaultCfg);
    prepareLazyNodeInjector();
    const {forkExtractExstingZip} = await import('@wfh/assets-processer/dist/fetch-remote');
    await forkExtractExstingZip(zipFileDirectory, Path.resolve(unzipCmd.opts().dest), true);
  });
  withGlobalOptions(unzipCmd);
};

export default cliExt;
