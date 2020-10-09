import {CliExtension, GlobalOptions, initConfigAsync} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('jasmine [package...]')
  .description('run jasmine test spec from specific packages')
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
    // TODO
  });
};

export default cliExt;
