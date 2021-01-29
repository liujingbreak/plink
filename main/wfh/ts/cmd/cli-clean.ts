import {CliExtension, GlobalOptions, initConfigAsync} from '../index';

const cliExt: CliExtension = (program) => {
  const cmd = program.command('upgrade [package...]')
  .description('Hellow command description')
  .option('-f, --file <spec>', 'run single file')
  .action(async (packages: string[]) => {
    await initConfigAsync(cmd.opts() as GlobalOptions);
    // TODO
  });
};

export default cliExt;
