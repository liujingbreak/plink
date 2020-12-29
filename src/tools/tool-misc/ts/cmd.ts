import {CliExtension, GlobalOptions, initConfigAsync} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('gen-redux <path>')
  .description('Generate a Redux-toolkt & Redux-observable slice file')
  .option('--tsd', 'Support generating Typescript tsd file', false)
  .action(async (targetFile: string[]) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
  });
};

export default cliExt;
