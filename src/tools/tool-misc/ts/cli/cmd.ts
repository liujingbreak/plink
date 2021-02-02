import {CliExtension} from '@wfh/plink';
import {CBOptions, generate} from './cli-gcmd';

const cliExt: CliExtension = (program) => {
  const cmd = program.command('gcmd <package-name> <command-name>')
  .alias('gen-command')
  .description('Generate a Plink command line implementation in specific package')
  // .option('--for-template <templateName>', 'Create a template generator command', false)
  .option('-d, --dry-run', 'Dryrun', false)
  .action(async (packageName: string, cmdName: string) => {
    await generate(packageName, cmdName, cmd.opts() as CBOptions);
  });
  cmd.usage(cmd.usage() + '\ne.g.\n  plink gcmd my-package my-command');
};

export default cliExt;
