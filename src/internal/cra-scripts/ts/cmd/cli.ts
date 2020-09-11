#!/usr/bin/env node
// import 'dr-comp-package/register';
// import commander, {Command} from 'commander';
import {CliExtension} from 'dr-comp-package/wfh/dist/cmd/types';
// import pk from '../../package.json';
// import chalk from 'chalk';
// import {spawn} from 'dr-comp-package/wfh/dist/process-utils';
// import fs from 'fs-extra';
// import Path from 'path';

// export const program: commander.Command = new Command().name('crae');

const cli: CliExtension = (program, withGlobalOptions) => {
  // program.version(pk.version);
  // program.description(chalk.cyanBright(
  //   'Enhance create-react-app for monorepo project structure and provide other opinionated project architecture'));

  const genCmd = program.command('cra-gen <dir>')
  .description('Generate a sample package in specific directory')
  .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
  .action(async (dir: string) => {
    (await import('../cmd')).genPackage(dir, genCmd.opts().dryRun);
    // fs.mkdirpSync(dir);
    // fs.copyFileSync(Path.resolve(__dirname, 'tmpl-.npmrc'), Path.resolve(dir, '.npmrc'));
    // (await import('./cli-init')).default();
  });

  const buildCmd = program.command('cra-build <type> <package-name>')
  .description('Based on react-scripts build command')
  .option('--dev', 'development mod', false)
  .action(async (type: string, packageName: string) => {
    // TODO
    // tslint:disable-next-line: no-console
    console.log(buildCmd.opts().dev);
  });

  // program.parseAsync(process.argv)
  // .catch(e => {
  //   console.error(e);
  //   process.exit(1);
  // });
};

export {cli as default};

