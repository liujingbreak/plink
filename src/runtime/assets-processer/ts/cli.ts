import {CliExtension, prepareLazyNodeInjector, initConfig, GlobalOptions} from '@wfh/plink/wfh/dist';


const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('zip <srcDir> <destZipFile>')
  .description('Create zip file in 64 zip mode')
  .option('-e, --exclude <regex>', 'exclude files')
  .action(async (srcDir: string, destZipFile: string) => {
    const defaultCfg: GlobalOptions = {config: [], prop: []};
    initConfig(defaultCfg);
    prepareLazyNodeInjector();
    const {zipDir} = await import('./remote-deploy');
    await zipDir(srcDir, destZipFile, cmd.opts().exclude);
  });
};

export default cliExt;
