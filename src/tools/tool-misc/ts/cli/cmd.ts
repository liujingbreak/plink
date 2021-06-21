import {CliExtension, cliPackageArgDesc} from '@wfh/plink';
// import {cliPackageArgDesc}
import {CBOptions, generate} from './cli-gcmd';

const cliExt: CliExtension = (program) => {
  const cmd = program.command('gcmd <package-name> <command-name>')
  .alias('gen-command')
  .description('Bootstrap a Plink command line implementation in specific package')
  // .option('--for-template <templateName>', 'Create a template generator command', false)
  .option('-d, --dry-run', 'Dryrun', false)
  .action(async (packageName: string, cmdName: string) => {
    await generate(packageName, cmdName, cmd.opts() as CBOptions);
  });
  cmd.usage(cmd.usage() + '\ne.g.\n  plink gcmd my-package my-command');

  const settingCmd = program.command('gsetting <package-name...>').alias('gen-setting')
  .option('-d, --dry-run', 'Dryrun', false)
  .description('Bootstrap a package setting file', {
    'package-name': cliPackageArgDesc
  })
  .action(async (packageNames: string[]) => {
    await (await import('./cli-gsetting')).generateSetting(packageNames, settingCmd.opts() as any);
  });

  const cfgCmd = program.command('gcfg <file>').alias('gen-config')
  .option('-d, --dry-run', 'Dryrun', false)
  // .option('-t, --type <file-type>', 'Configuation file type, valid types are "ts", "yaml", "json"', 'ts')
  .description('Generate a workspace configuration file (Typescript file), used to override package settings', {
    file: 'Output configuration file path (with or without suffix name ".ts"), e.g. "conf/foobar.prod"'
  })
  .action(async (file: string) => {
    await (await import('./cli-gcfg')).generateConfig(file, cfgCmd.opts() as any);
  });

  const genCraCmd = program.command('cra-gen-pkg <path>')
    .description('For create-react-app project, generate a sample package', {path: 'package directory in relative or absolute path'})
    .option('--comp <name>', 'Sample component name', 'sample')
    .option('--feature <name>', 'Sample feature directory and slice name', 'sampleFeature')
    .option('--output <dir-name>', 'This option changes "appBuild" values in config-override.ts,' +
      ' internally create-react-app changes Webpack configure property `output.path` according to this value (' +
      ' you may also use environment variable "BUILD_PATH" for create-react-app version above 4.0.3)')
    .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
    .action(async (dir: string) => {
      (await import('./cli-cra-gen')).genPackage(dir, genCraCmd.opts().comp,
        genCraCmd.opts().feature, genCraCmd.opts().output, genCraCmd.opts().dryRun);
    });

  const genCraCompCmd = program.command('cra-gen-comp <dir> <componentName...>')
    .description('For create-react-app project, generate sample components', {
      dir: 'directory'
    })
    .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
    .option('--conn <Redux-slice-file>', 'Connect component to Redux store via React-redux')
    // .option('--internal-slice,--is', 'Use a lightweiht Redux-toolkit + redux-observable like tool to manage component internal state,' +
    //   ' useful for implementing complex component which might have bigc state and async side effects')
    .action(async (dir: string, compNames: string[]) => {
      (await import('./cli-cra-gen')).genComponents(dir, compNames, {
        connectedToSlice: genCraCompCmd.opts().conn,
        dryrun: genCraCompCmd.opts().dryRun
      });
    });
  genCraCompCmd.usage(genCraCompCmd.usage() + '\ne.g.\n  plink cra-gen-comp --conn ../packages/foobar/components Toolbar Layout Profile');

  const genCraSliceCmd = program.command('cra-gen-slice <dir> <sliceName...>')
    .description('For create-react-app project, generate a sample Redux-toolkit Slice file (with Redux-observable epic)', {
      dir: 'directory'
    })
    .option('--internal', 'A Redux Slice for managing individual component internal state, useful for complicated component', false)
    .option('--tiny', 'A RxJS based tiny Slice for managing individual component internal state, useful for complicated component', false)
    .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
    .action(async (dir: string, sliceName: string[]) => {
      (await import('./cli-cra-gen')).genSlice(dir, sliceName, genCraSliceCmd.opts() as any);
    });

  program.command('install-eslint')
  .description('Install eslint to current project')
  .action(async () => {

  });

};

export default cliExt;
