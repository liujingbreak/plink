/// <reference path="./cfont.d.ts" />
/* eslint-disable max-len */
import commander from 'commander';
import chalk from 'chalk';
import * as op from 'rxjs/operators';
import * as tp from './types';
import * as pkgMgr from '../package-mgr';
// import '../tsc-packages-slice';
import {packages4Workspace} from '../package-mgr/package-list-helper';
import * as _ from 'lodash';
import { isDrcpSymlink, sexyFont, getRootDir, boxString, plinkEnv } from '../utils/misc';
import * as _symlinks from '../utils/symlinks';
import fs from 'fs';
import Path from 'path';
import semver from 'semver';
import {CommandOverrider, withCwdOption} from './override-commander';
import {initInjectorForNodePackages} from '../package-runner';
import {hlDesc, arrayOptionFn} from './utils';
import {getLogger} from 'log4js';
import {CliOptions as TsconfigCliOptions} from './cli-tsconfig-hook';
import * as _cliWatch from './cli-watch';
const pk = require('../../../package.json') as {version: string};
// const WIDTH = 130;
const log = getLogger('plink.cli');

export const cliPackageArgDesc = 'Single or multiple package names, the "scope" name part can be omitted,' +
'if the scope name (the part between "@" "/") are listed configuration property "packageScopes"';

export async function createCommands(startTime: number) {
  process.title = 'Plink';
  // const {stateFactory}: typeof store = require('../store');
  await import('./cli-slice');
  // stateFactory.configureStore();


  let cliExtensions: string[] | undefined;
  const program = new commander.Command('plink')
  .description(chalk.cyan('A pluggable monorepo and multi-repo management tool'))
  .action((args: string[]) => {
    // eslint-disable-next-line no-console
    console.log(sexyFont('PLink').string);
    // eslint-disable-next-line no-console
    console.log(program.helpInformation());

    if (wsState == null) {
      const wsDirs = [...pkgMgr.getState().workspaces.keys()];
      if (wsDirs.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`More commands are available in worktree space directories: [${wsDirs.map(item => chalk.cyan(item)).join(', ')}]\n` +
          `Try commands:\n${wsDirs.map(dir => '  plink --cwd ' + dir).join('\n')}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`\nversion: ${pk.version} ${isDrcpSymlink ? chalk.yellow('(symlinked)') : ''} `);
    if (cliExtensions && cliExtensions.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Found ${cliExtensions.length} command line extension` +
      `${cliExtensions.length > 1 ? 's' : ''}: ${cliExtensions.map(pkg => chalk.blue(pkg)).join(', ')}`);
    }
    // eslint-disable-next-line no-console
    console.log('\n', chalk.bgRed('Please determine a sub command listed above'));
    checkPlinkVersion();
    process.nextTick(() => process.exit(1));
  });
  program.addHelpText('before', sexyFont('PLink').string);
  withCwdOption(program);

  program.version(pk.version, '-v, --vers', 'output the current version');
  program.addHelpCommand('help [command]', 'show help information, same as "-h". ');

  const overrider = new CommandOverrider(program);
  let wsState: pkgMgr.WorkspaceState | undefined;

  if (process.env.PLINK_SAFE !== 'true') {
    const {getState: getPkgState, workspaceKey} = require('../package-mgr') as typeof pkgMgr;
    wsState = getPkgState().workspaces.get(workspaceKey(plinkEnv.workDir));
    if (wsState != null) {
      overrider.forPackage(null, program => {
        overrider.nameStyler = str => chalk.green(str);
        spaceOnlySubCommands(program);
        overrider.nameStyler = undefined;
        subComands(program);
      });
    } else {
      overrider.forPackage(null, subComands);
    }
  } else {
    overrider.forPackage(null, subComands);
  }

  if (process.env.PLINK_SAFE !== 'true') {
    overrider.nameStyler = str => chalk.cyan(str);
    cliExtensions = loadExtensionCommand(program, wsState, overrider);
    overrider.nameStyler = undefined;
  } else {
    // eslint-disable-next-line no-console
    console.log('Value of environment varaible "PLINK_SAFE" is true, skip loading extension');
  }

  overrider.appendGlobalOptions(false);
  try {
    await program.parseAsync(process.argv, {from: 'node'});
  } catch (e) {
    log.error('Failed to execute command due to: ' + chalk.redBright((e as Error).message), e);
    if ((e as Error).stack) {
      log.error((e as Error).stack);
    }
    process.exit(1);
  }
}

function subComands(program: commander.Command) {
  /** command init
   */
  const initCmd = program.command('init [work-directory]').alias('sync')
    .description('Initialize and update work directory, generate basic configuration files for project and component packages,' +
      ' calculate hoisted transitive dependencies, and run "npm install" in current directory.',
      {
        'work-directory': 'A relative or abosolute directory path, use "." to determine current directory,\n  ommitting this argument meaning:\n' +
          '  - If current directory is already a "work directory", update it.\n' +
          '  - If current directory is not a work directory (maybe at repo\'s root directory), update the latest updated work' +
          ' directory.'
      })
    .option('-f, --force', 'Force run "npm install" in specific workspace directory, this is not same as npm install option "-f" ', false)
    // .option('--lint-hook, --lh', 'Create a git push hook for code lint', false)
    .action(async (workspace?: string) => {
      // eslint-disable-next-line no-console
      console.log(sexyFont('PLink').string);
      (await import('./cli-init')).default(initCmd.opts() as tp.InitCmdOptions & tp.NpmCliOption, workspace);
    });
  addNpmInstallOption(initCmd);

  /**
   * command project
   */
  program.command('project [add|remove] [dir...]')
    .description('Associate, disassociate or list associated project folders, Plink will' +
      ' scan source code directories from associated projects', {
        'add|remove': 'Specify whether Associate to a project or Disassociate from a project',
        dir: 'Specify target project repo directory (absolute path or relative path to current directory)' +
          ', specify multiple project by seperating them with space character'
      })
    .action(async (action: 'add'|'remove'|undefined, projectDir: string[]) => {
      // eslint-disable-next-line no-console
      console.log(sexyFont('PLink').string);
      (await import('./cli-project')).default({isSrcDir: false}, action, projectDir);
    });

  program.command('src [add|remove] [dir...]')
    .description('Associate, disassociate or list source directories, Plink will' +
      ' scan source code directories for packages', {
        'add|remove': 'Specify whether associate to a directory or disassociate from a directory',
        dir: 'specify multiple directories by seperating them with space character'
      })
      .action(async (action: 'add'|'remove'|undefined, dirs: string[]) => {
        // eslint-disable-next-line no-console
        console.log(sexyFont('PLink').string);
        (await import('./cli-project')).default({isSrcDir: true}, action, dirs);
      });

  /**
   * command lint
   */
  // const lintCmd = program.command('lint [package...]')
  //   .description('source code style check', {
  //     package: cliPackageArgDesc
  //   })
  //   .option('--pj <project1,project2...>', 'lint only TS code from specific project', arrayOptionFn, [])
  //   .option('--fix', 'Run eslint/tslint fix, this could cause your source code being changed unexpectedly', false)
  //   .action(async packages => {
  //     await (await import('./cli-lint')).default(packages, lintCmd.opts() as any);
  //   });

  // lintCmd.usage(lintCmd.usage() +
  //   hl('\ndrcp lint --pj <project-dir..> [--fix]') + ' Lint TS files from specific project directory\n' +
  //   hl('\ndrcp lint <component-package..> [--fix]') + ' Lint TS files from specific component packages');

  /**
   * command clean
   */
  program.command('cs').alias('clear-symlinks')
    .description('Clear symlinks from node_modules')
    // .option('--only-symlink', 'Clean only symlinks, not dist directory', false)
    .action(async () => {
      const scanNodeModules = (require('../utils/symlinks') as typeof _symlinks).default;
      const editor = await import('../editor-helper');
      editor.dispatcher.clearSymlinks();
      await editor.getAction$('clearSymlinksDone').pipe(op.take(1)).toPromise();
      await scanNodeModules(undefined, 'all');
    });

  /**
   * command upgrade
   */
  const upgradeCmd = program.command('upgrade')
    .alias('install')
    .description('Reinstall local Plink along with other dependencies.' +
      ' (Unlike "npm install" which does not work with node_modules that might contain symlinks)')
    .action(async () => {
      skipVersionCheck = true;
      await (await import('./cli-link-plink')).reinstallWithLinkedPlink(upgradeCmd.opts() as tp.NpmCliOption);
    });
  addNpmInstallOption(upgradeCmd);
  // program.command('dockerize <workspace-dir>')
  // .description(chalk.gray('[TBI] Generate Dockerfile for specific workspace directory, and generate docker image'));

  // program.command('pkg <workspace-dir>')
  // .description(chalk.gray('[TBI] Use Pkg (https://github.com/vercel/pkg) to package Node.js project into an executable '));

  /**
   * command ls
   */
  const listCmd = program.command('ls').alias('list')
    .option('-j, --json', 'list linked dependencies in form of JSON', false)
    .option('--hoist', 'list hoisted transitive Dependency information', false)
    .description('If you want to know how many packages will actually run, this command prints out a list and the priorities, including installed packages')
    .action(async () => {
      await (await import('./cli-ls')).default(listCmd.opts() as any);
    });

  const addCmd = program.command('add <dependency...>')
    .description('Add dependency to package.json file, with option "--dev" to add as "devDependencies", ' +
      'without option "--to" this command adds dependency to current worktree space\'s package.json file',
      {
        dependency: 'dependency package name in form of "<a linked package name without scope part>", "<package name>@<version>", '
      })
    .option('--to <pkg name | worktree dir | pkg dir>', 'add dependency to the package.json of specific linked source package by name or directory, or a worktree space directory')
    .action(async (packages: string[]) => {
      await (await import('./cli-add-package')).addDependencyTo(packages, addCmd.opts().to, addCmd.opts().dev);
    });

  const tsconfigCmd = program.command('tsconfig')
    .description('List tsconfig.json, jsconfig.json files which will be updated automatically by Plink, (a monorepo means there are node packages which are symlinked from real source code directory' +
      ', if you have customized tsconfig.json file, this command helps to update "compilerOptions.paths" properties)')
    .option('--hook <file>', 'add tsconfig/jsconfig file to Plink\'s automatic updating file list', arrayOptionFn, [])
    .option('--unhook <file>', 'remove tsconfig/jsconfig file from Plink\'s automatic updating file list', arrayOptionFn, [])
    .option('--clear,--unhook-all', 'remove all tsconfig files from from Plink\'s automatic updating file list', false)
    .action(async () => {
      (await import('./cli-tsconfig-hook')).doTsconfig(tsconfigCmd.opts() as TsconfigCliOptions);
    });

  /**
   * Bump command
   */
  const bumpCmd = program.command('bump [package...]')
    .description('bump package.json version number for specific package, same as "npm version" does',
      {package: cliPackageArgDesc})
    .option<string[]>('--pj, --project <project-dir,...>', 'only bump component packages from specific project directory',
      (value, prev) => {
        prev.push(...value.split(','));
        return prev;
      }, [])
    .option('-i, --incre-version <value>',
      'version increment, valid values are: major, minor, patch, prerelease', 'patch')
    .action(async (packages: string[]) => {
      await (await import('./cli-bump')).default({...bumpCmd.opts() as tp.BumpOptions, packages});
    });
  // withGlobalOptions(bumpCmd);
  // bumpCmd.usage(bumpCmd.usage() + '\n' + hl('plink bump <package> ...') + ' to recursively bump package.json from multiple directories\n' +
  //   hl('plink bump <dir> -i minor') + ' to bump minor version number, default is patch number');

  /**
   * Pack command
   */
  const packCmd = program.command('pack [package...]')
    .description('npm pack pakage into tarball files and change version value from related package.json', {package: cliPackageArgDesc})
    .option('--dir <package directory>', 'pack packages by specifying directories', arrayOptionFn, [])
    .option('-w,--workspace <workspace-dir>', 'pack packages which are linked as dependency of specific workspaces',
      arrayOptionFn, [])
    .option('--pj, --project <project-dir>',
      'project directories to be looked up for all packages which need to be packed to tarball files',
      arrayOptionFn, [])
    .option('--tar-dir <dir>', 'directory to save tar files', Path.join(getRootDir(), 'tarballs'))
    .option('--jf, --json-file <pkg-json-file>', 'the package.json file in which "devDependencies", "dependencies" should to be changed according to packed file, ' + 
      'by default package.json files in all work spaces will be checked and changed')
    .action(async (packages: string[]) => {
      await (await import('./cli-pack')).pack({...packCmd.opts() as tp.PackOptions, packages});
    });
  // withGlobalOptions(packCmd);
  packCmd.usage(packCmd.usage() + '\nBy default, run "npm pack" for each linked package which are dependencies of current workspace');

  /**
   * Pack command
   */
  const publishCmd = program.command('publish [package...]')
    .description('run npm publish', {package: cliPackageArgDesc})
    .option('--dir <package directory>', 'publish packages by specifying directories', arrayOptionFn, [])
    .option<string[]>('--pj, --project <project-dir,...>',
    'project directories to be looked up for all packages which need to be packed to tarball files',
      (value, prev) => {
        prev.push(...value.split(',')); return prev;
      }, [] as string[])
    .option('-w,--workspace <workspace-dir>', 'publish packages which are linked as dependency of specific workspaces',
      arrayOptionFn, [])
    .option('--public', 'same as "npm publish" command option "--access public"', false)
    .action(async (packages: string[]) => {
      await (await import('./cli-pack')).publish({...publishCmd.opts() as tp.PublishOptions, packages});
    });


  const analysisCmd = program.command('analyze [pkg-name...]')
    .alias('analyse')
    .description('Use Typescript compiler to parse source code, list dependences by DFS algarithm, result information includes' +
      ': cyclic dependecies, unresolvable dependencies, external dependencies, dependencies are not under target directory.', {
      'pkg-name': 'the name of target source package, the package must be Plink compliant package, this command will only ' +
        'scan special source code directory like "ts/" and "isom/" of target package'
      })
    .option('-x <regexp>', 'Ingore "module name" that matches specific Regular Experssion', '\.(less|scss|css)$')
    .option('-d, --dir <directory>',
      '(multiple) determine target directory, scan JS/JSX/TS/TSX files under target directory', arrayOptionFn, [])
    .option('-f, --file <file>',
      '(multiple) determine target TS/JS(X) files (multiple file with more options "-f <file> -f <glob>")', arrayOptionFn, [])
    .option('-j', 'Show result in JSON', false)
    .option('--tsconfig <file>', 'Use "compilerOptions.paths" property to resolve ts/js file module')
    .option('--alias <alias-express>', 'a JSON express, e.g. --alias \'["^@/(.+)$","src/$1"]\'', arrayOptionFn, [])
    .action(async (packages: string[]) => {
      return (await import('./cli-analyze')).default(packages, analysisCmd.opts() as tp.AnalyzeOptions);
    });

  analysisCmd.usage(analysisCmd.usage() + '\n' +
    'e.g.\n  ' + chalk.blue('plink analyze -f "packages/foobar1/**/*" -f packages/foobar2/ts/main.ts\n  ' +
    'plink analyze -d packages/foobar1/src -d packages/foobar2/ts'));

  const watchCmd = program.command('watch [package...]')
  .description('Watch package source code file changes (files referenced in .npmignore will be ignored) and update Plink state, ' +
  'automatically install transitive dependency', {
    package: cliPackageArgDesc})
  .option('--cp, --copy <directory>', 'copy package files to specific directory, mimic behavior of "npm install <pkg>", but this won\'t install dependencies')
  .action((pkgs: string[]) => {
    const {cliWatch} = require('./cli-watch') as typeof _cliWatch;
    cliWatch(pkgs, watchCmd.opts());
  });

  const updateDirCmd = program.command('update-dir')
    .description('Run this command to sync internal state when whole workspace directory is renamed or moved.\n' +
    'Because we store absolute path info of each package in internal state, and it will become invalid after you rename or move directory')
    .action(async (workspace: string) => {
      (await import('./cli-ls')).checkDir(updateDirCmd.opts() as tp.GlobalOptions);
    });
}

function spaceOnlySubCommands(program: commander.Command) {
  /**
   * tsc command
   */
  const tscCmd = program.command('tsc [package...]')
    .description('Run Typescript compiler to compile source code for target packages, ' +
    'which have been linked to current work directory', {package: cliPackageArgDesc})
    .option('-w, --watch', 'Typescript compiler watch mode', false)
    .option('--pj, --project <project-dir,...>', 'Compile only specific project directory', (v, prev) => {
      prev.push(...v.split(',')); return prev;
    }, [] as string[])
    // .option('--ws,--workspace <workspace-dir>', 'only include those linked packages which are dependency of specific workspaces',
    //   arrayOptionFn, [])
    .option('--tsx,--jsx', 'includes TSX file', false)
    .option('--ed, --emitDeclarationOnly', 'Typescript compiler option: --emitDeclarationOnly.\nOnly emit ‘.d.ts’ declaration files.', false)
    .option('--source-map <inline|file>', 'Source map style: "inline" or "file"', 'inline')
    .option('--merge,--merge-tsconfig <file>', 'Merge compilerOptions "baseUrl" and "paths" from specified tsconfig file')
    .option('--copath, --compiler-options-paths <pathMapJson>',
      'Add more "paths" property to compiler options. ' +
      '(e.g. --copath \'{\"@/*":["/Users/worker/ocean-ui/src/*"]}\')', (v, prev) => {
      prev.push(...v.split(',')); return prev;
    }, [] as string[])
    .option('--co <JSON-string>',
      `Partial compiler options to be merged (except "baseUrl"), "paths" must be relative to ${Path.relative(process.cwd(), plinkEnv.workDir) || 'current directory'}`)
    .action(async (packages: string[]) => {
      const opt = tscCmd.opts();
      const tsc = await import('../ts-cmd');

      await tsc.tsc({
        package: packages,
        project: opt.project,
        watch: opt.watch,
        sourceMap: opt.sourceMap,
        jsx: opt.jsx,
        ed: opt.emitDeclarationOnly,
        pathsJsons: opt.compilerOptionsPaths,
        mergeTsconfig: opt.mergeTsconfig,
        compilerOptions: opt.co ? JSON.parse(opt.co) : undefined
      });
    });

  tscCmd.usage(tscCmd.usage() +
    '\nIt compiles \n  "<package-directory>/ts/**/*.ts" to "<package-directory>/dist",\n' +
    '  or\n  "<package-directory>/isom/**/*.ts" to "<package-directory>/isom"\n for all @wfh packages.\n' +
    'I suggest to put Node.js side TS code in directory `ts`, and isomorphic TS code (meaning it runs in ' +
    'both Node.js and Browser) in directory `isom`.\n\n' +
    hlDesc('plink tsc\n') + ' Compile linked packages that are dependencies of current workspace (you shall run this command only in a workspace directory)\n' +
    hlDesc('plink tsc <package..>\n') + ' Only compile specific packages by providing package name or short name\n' +
    hlDesc('plink tsc [package...] -w\n') + ' Watch packages change and compile when new typescript file is changed or created\n\n');

  program.command('setting [package]')
    .description('List packages setting and values', {package: 'package name, only list setting for specific package'})
    .action(async (pkgName: string) => {
      (await import('./cli-setting')).default(pkgName);
    });
    /** command run*/
  const runCmd = program.command('run <target> [arguments...]')
    .description('Run specific module\'s exported function\n')
    .action(async (target: string, args: string[]) => {
      await (await import('../package-runner')).runSinglePackage({target, args});
    });

  runCmd.usage(runCmd.usage() + '\n' + chalk.green('plink run <target> [arguments...]\n') +
    `e.g.\n  ${chalk.green('plink run ../packages/forbar-package/dist/file.js#function argument1 argument2...')}\n` +
    'execute exported function of TS/JS file from specific package or path\n\n' +
    '<target> - JS or TS file module path which can be resolved by Node.js (ts-node) followed by "#" and exported function name,\n');
    // 'e.g. \n' +
    // chalk.green('package-name/dist/foobar.js#myFunction') +
    // ', function can be async which returns Promise\n' +
    // chalk.green('node_modules/package-dir/dist/foobar.ts#myFunction') +
    // ', relative or absolute path\n');


}

function loadExtensionCommand(program: commander.Command, ws: pkgMgr.WorkspaceState | undefined, overrider: CommandOverrider): string[] {
  if (ws == null)
    return [];
  initInjectorForNodePackages();
  const availables: string[] = [];
  for (const pk of packages4Workspace()) {
    const dr = pk.json.dr || pk.json.plink;
    if (dr == null || dr.cli == null)
      continue;
    const [pkgFilePath, funcName] = (dr.cli as string).split('#');

    availables.push(pk.name);

    try {
      overrider.forPackage(pk, pkgFilePath, funcName);
    } catch (e) {
      // eslint-disable-next-line no-console
      log.warn(`Failed to load command line extension in package ${pk.name}: "${(e as Error).message}"`, e);
    }
  }
  return availables;
}

function addNpmInstallOption(cmd: commander.Command) {
  cmd.option('--cache <npm-cache>', 'same as npm install option "--cache"')
  .option('--ci, --use-ci', 'Use "npm ci" instead of "npm install" to install dependencies', false)
  .option('--offline', 'same as npm option "--offline" during executing npm install/ci ', false)
  // .option('--yarn', 'Use Yarn to install component peer dependencies instead of using NPM', false)
  .option('--production', 'Add "--production" or "--only=prod" command line argument to "yarn/npm install"', false);
}


let skipVersionCheck = false;
process.on('beforeExit', () => {
  if (skipVersionCheck)
    return;
  skipVersionCheck = true;
  if (process.send == null) {
    // process is not a forked child process
    checkPlinkVersion();
  }
});

function checkPlinkVersion() {
  const pkjson = Path.resolve(getRootDir(), 'package.json');
  if (fs.existsSync(pkjson)) {
    const json = JSON.parse(fs.readFileSync(pkjson, 'utf8')) as {dependencies?: {[p: string]: string | undefined}; devDependencies?: {[p: string]: string | undefined}};
    let depVer = json.dependencies && json.dependencies['@wfh/plink'] ||
      json.devDependencies && json.devDependencies['@wfh/plink'];
    if (depVer == null) {
      // eslint-disable-next-line no-console
      console.log(boxString('Don\'t forget to add @wfh/plink in package.json as dependencies'));
      return;
    }
    if (depVer.endsWith('.tgz')) {
      const matched = /-(\d+\.\d+\.[^]+?)\.tgz$/.exec(depVer);
      if (matched == null)
        return;
      depVer = matched[1];
    }
    if (depVer && !semver.satisfies(pk.version, depVer)) {
      // eslint-disable-next-line no-console
      console.log(boxString(`Local installed Plink version ${chalk.cyan(pk.version)} does not match dependency version ${chalk.green(depVer)} in package.json, ` +
        `run command "${chalk.green('plink upgrade')}" to upgrade or downgrade to expected version`));
    }
  }
}

