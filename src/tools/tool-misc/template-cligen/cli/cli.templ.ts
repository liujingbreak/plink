import {CliExtension, GlobalOptions, initConfig} from '@wfh/plink/wfh/dist';

const cliExt: CliExtension = (program, withGlobalOptions) => {
  const cmd = program.command('$__foobar__$ [argument1...]')
  .description('$__foobar__$ description')
  .option('-f, --file <spec>', 'sample option')
  .action(async (argument1: string[]) => {
    // If you want to utilize Plink's configuration system
    initConfig(cmd.opts() as GlobalOptions);
    // TODO
    (await import('./cli-$__foobar__')).default(argument1, cmd.opts());
  });
  // If you want to utilize Plink's configuration system
  withGlobalOptions(cmd);
};

export default cliExt;
