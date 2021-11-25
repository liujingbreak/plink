import {CliExtension} from '@wfh/plink';
// import Path from 'path';
import * as _unzip from './cli-unzip';

const cliExt: CliExtension = (program) => {
  // ------- zip -------
  const cmd = program.command('zip <srcDir> <destZipFile>')
  .description('Create zip file in 64 zip mode')
  .option('-e, --exclude <regex>', 'exclude files')
  .action(async (srcDir: string, destZipFile: string) => {
    // prepareLazyNodeInjector();
    const {zipDir} = await import('./remote-deploy');
    await zipDir(srcDir, destZipFile, cmd.opts().exclude);
  });

  // -------- listzip --------
  program.command('listzip <file>')
  .description('List zip file content and size')
  .action(async file => {
    const {listZip} = require('./cli-unzip') as typeof _unzip;
    await listZip(file);
  });

  // -------- unzip --------
  program.command('unzip <zipFile> [destination_dir]')
  .description('Extract zip files to specific directory')
  // .requiredOption('-d,--dest <dir>', 'destination directory')
  .action(async (zipFile: string, destDir?: string) => {
    // prepareLazyNodeInjector();
    const {unZip} = await import('./cli-unzip');
    await unZip(zipFile, destDir);
  });

};

export default cliExt;
