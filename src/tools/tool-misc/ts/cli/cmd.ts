import {CliExtension, cliPackageArgDesc} from '@wfh/plink';
// import {cliPackageArgDesc}
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

  const settingCmd = program.command('gsetting <package-name...>').alias('gen-setting')
  .option('-d, --dry-run', 'Dryrun', false)
  .description('Generate a package setting file', {
    'package-name': cliPackageArgDesc
  })
  .action(async (packageNames: string[]) => {
    await (await import('./cli-gsetting')).generateSetting(packageNames, settingCmd.opts() as any);
  });

  const cfgCmd = program.command('gcfg <file>').alias('gen-config')
  .option('-d, --dry-run', 'Dryrun', false)
  // .option('-t, --type <file-type>', 'Configuation file type, valid types are "ts", "yaml", "json"', 'ts')
  .description('Generate a workspace configuration file (Typescript file), used to override package settings', {
    file: 'Output configuration file path (with or without suffix name ".ts"), e.g. "../conf/foobar.prod"'
  })
  .action(async (file: string) => {
    await (await import('./cli-gcfg')).generateConfig(file, cfgCmd.opts() as any);
  });

};

export default cliExt;
