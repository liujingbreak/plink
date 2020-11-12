/// <reference path="./cfont.d.ts" />
// tslint:disable: max-line-length
import commander from 'commander';
import chalk from 'chalk';
// import * as store from '../store';
import * as tp from './types';
import * as pkgMgr from '../package-mgr';
// import '../tsc-packages-slice';
import {packages4Workspace} from '../package-mgr/package-list-helper';
import * as _ from 'lodash';
import { isDrcpSymlink, sexyFont, getRootDir, boxString } from '../utils/misc';
import _scanNodeModules from '../utils/symlinks';
import fs from 'fs';
import Path from 'path';
import semver from 'semver';
// import Path from 'path';
const pk = require('../../../package');
// const WIDTH = 130;

const arrayOptionFn = (curr: string, prev: string[] | undefined) => {
  if (prev)
    prev.push(curr);
  return prev;
};

export async function drcpCommand(startTime: number) {
  process.title = 'Plink - command line';
  // const {stateFactory}: typeof store = require('../store');
  await import('./cli-slice');
  // stateFactory.configureStore();


  let cliExtensions: string[] | undefined;
  const program = new commander.Command('plink')
  .action(args => {
    // tslint:disable-next-line: no-console
    console.log(sexyFont('PLink').string);
    // tslint:disable-next-line: no-console
    console.log(program.helpInformation());
    // tslint:disable-next-line: no-console
    console.log(`\nversion: ${pk.version} ${isDrcpSymlink ? chalk.yellow('(symlinked)') : ''} `);
    if (cliExtensions && cliExtensions.length > 0) {
      // tslint:disable-next-line: no-console
      console.log(`Found ${cliExtensions.length} command line extension` +
      `${cliExtensions.length > 1 ? 's' : ''}: ${cliExtensions.join(', ')}`);
    }
  });

  program.version(pk.version, '-v, --vers', 'output the current version');
  subDrcpCommand(program);
  if (process.env.PLINK_SAFE !== 'true') {
    cliExtensions = loadExtensionCommand(program);
  } else {
    // tslint:disable-next-line: no-console
    console.log('Value of environment varaible "PLINK_SAFE" is true, skip loading extension');
  }

  try {
    await program.parseAsync(process.argv, {from: 'node'});
  } catch (e) {
    console.error(chalk.redBright(e), e.stack);
    process.exit(1);
  }
}

function subDrcpCommand(program: commander.Command) {
  /**
   * command init
   */
  const initCmd = program.command('init [workspace-directory]')
  .description('Initialize workspace directory, generate basic configuration files for project and component packages')
  .option('-f, --force', 'Force run "npm install" in specific workspace directory', false)
  // .option('--yarn', 'Use Yarn to install component peer dependencies instead of using NPM', false)
  .option('--production', 'Add "--production" or "--only=prod" command line argument to "yarn/npm install"', false)
  .action(async (workspace: string) => {
    // tslint:disable-next-line: no-console
    console.log(sexyFont('PLink').string);
    await (await import('./cli-init')).default(initCmd.opts() as any, workspace);
  });
  withGlobalOptions(initCmd);

  const updateDirCmd = program.command('update-dir')
  .description('Run this command to sync internal state, after moved whole workspace directory.\n' +
  'Because we store absolute path info of each package in internal state, these information becomes invalid once you rename or moved directory')
  .action(async (workspace: string) => {
    await (await import('./cli-ls')).checkDir(updateDirCmd.opts() as any);
  });
  withGlobalOptions(updateDirCmd);

  /**
   * command project
   */
  program.command('project [add|remove] [project-dir...]')
  .description('Associate, disassociate or list associated project folders')
  .action(async (action: 'add'|'remove'|undefined, projectDir: string[]) => {
    // tslint:disable-next-line: no-console
    console.log(sexyFont('PLink').string);
    (await import('./cli-project')).default(action, projectDir);
  });

  /**
   * command lint
   */
  const lintCmd = program.command('lint [package...]')
  .description('source code style check')
  .option('--pj <project1,project2...>', 'lint only TS code from specific project', arrayOptionFn, [])
  .option('--fix', 'Run eslint/tslint fix, this could cause your source code being changed unexpectedly', false)
  .action(async packages => {
    await (await import('./cli-lint')).default(packages, lintCmd.opts() as any);
  });
  withGlobalOptions(lintCmd);
  lintCmd.usage(lintCmd.usage() +
    hl('\ndrcp lint --pj <project-dir..> [--fix]') + ' Lint TS files from specific project directory\n' +
    hl('\ndrcp lint <component-package..> [--fix]') + ' Lint TS files from specific component packages');

  /**
   * command clean
   */
  program.command('clean-symlinks')
  .description('Clean symlinks from node_modules, always do this before run "npm install" in root directory')
  // .option('--only-symlink', 'Clean only symlinks, not dist directory', false)
  .action(async () => {
    const scanNodeModules: typeof _scanNodeModules = require('../utils/symlinks').default;
    await scanNodeModules('all');
  });

  /**
   * command ls
   */
  const listCmd = program.command('ls').alias('list')
  .option('-j, --json', 'list linked dependencies in form of JSON', false)
  .description('If you want to know how many packages will actually run, this command prints out a list and the priorities, including installed packages')
  .action(async () => {
    await (await import('./cli-ls')).default(listCmd.opts() as any);
  });
  withGlobalOptions(listCmd);

  /**
   * command run
   */
  const runCmd = program.command('run <target> [arguments...]')
  .description('Run specific module\'s exported function\n')
  .action(async (target: string, args: string[]) => {
    const config = await (await import('../config')).default;
    await config.init(runCmd.opts() as tp.GlobalOptions);
    const logConfig = await (await import('../log-config')).default;
    logConfig(config());
    await (await import('../package-runner')).runSinglePackage({target, args});
  });
  withGlobalOptions(runCmd);
  runCmd.usage(runCmd.usage() + '\n' + chalk.green('plink run <target> [arguments...]\n') +
  `e.g.\n  ${chalk.green('plink run forbar-package/dist/file#function argument1 argument2...')}\n` +
  'execute exported function of TS/JS file from specific package or path\n\n' +
  '<target> - JS or TS file module path which can be resolved by Node.js (ts-node) followed by "#" and exported function name,\n' +
  'e.g. \n' +
  chalk.green('package-name/dist/foobar.js#myFunction') +
  ', function can be async which returns Promise\n' +
  chalk.green('node_modules/package-dir/dist/foobar.ts#myFunction') +
  ', relative or absolute path\n');

  /**
   * tsc command
   */
  const tscCmd = program.command('tsc [package...]')
  .description('Run Typescript compiler')
  .option('-w, --watch', 'Typescript compiler watch mode', false)
  .option('--pj, --project <project-dir,...>', 'Compile only specific project directory', (v, prev) => {
    prev.push(...v.split(',')); return prev;
  }, [] as string[])
  // .option('--ws,--workspace <workspace-dir>', 'only include those linked packages which are dependency of specific workspaces',
  //   arrayOptionFn, [])
  .option('--jsx', 'includes TSX file', false)
  .option('--ed, --emitDeclarationOnly', 'Typescript compiler option: --emitDeclarationOnly.\nOnly emit ‘.d.ts’ declaration files.', false)
  .option('--source-map <inline|file>', 'Source map style: "inline" or "file"', 'inline')
  .action(async (packages: string[]) => {
    const opt = tscCmd.opts();

    const config = await (await import('../config')).default;
    await config.init(runCmd.opts() as tp.GlobalOptions);
    const logConfig = await (await import('../log-config')).default;
    logConfig(config());
    const tsc = await import('../ts-cmd');
    // await tsc.tsc({
    //   package: packages,
    //   project: opt.project,
    //   watch: opt.watch,
    //   sourceMap: opt.sourceMap,
    //   jsx: opt.jsx,
    //   ed: opt.emitDeclarationOnly
    // }).toPromise();
    await tsc.tsc({
      package: packages,
      project: opt.project,
      watch: opt.watch,
      sourceMap: opt.sourceMap,
      jsx: opt.jsx,
      ed: opt.emitDeclarationOnly
    });
  });
  withGlobalOptions(tscCmd);
  tscCmd.usage(tscCmd.usage() + '\n' + 'Run gulp-typescript to compile Node.js side Typescript files.\n\n' +
  'It compiles \n  "<package-directory>/ts/**/*.ts" to "<package-directory>/dist",\n' +
  '  or\n  "<package-directory>/isom/**/*.ts" to "<package-directory>/isom"\n for all @wfh packages.\n' +
  'I suggest to put Node.js side TS code in directory `ts`, and isomorphic TS code (meaning it runs in ' +
  'both Node.js and Browser) in directory `isom`.\n' +
  hlDesc('plink tsc\n') + 'Compile linked packages that are dependencies of current workspace (you shall run this command only in a workspace directory)\n' +
  hlDesc('plink tsc <package..>\n') + ' Only compile specific packages by providing package name or short name\n' +
  hlDesc('plink tsc [package...] -w\n') + ' Watch packages change and compile when new typescript file is changed or created\n\n');

  /**
   * Bump command
   */
  const bumpCmd = program.command('bump [package...]')
    .description('bump package.json version number for specific package, same as "npm version" does')
    .option<string[]>('--pj, --project <project-dir,...>', 'only bump component packages from specific project directory',
      (value, prev) => {
        prev.push(...value.split(',')); return prev;
      }, [])
    .option('-i, --incre-version <major | minor | patch | premajor | preminor | prepatch | prerelease>',
      'version increment, valid values are: major, minor, patch, prerelease', 'patch')
    .action(async (packages: string[]) => {
      (await import('./cli-bump')).default({...bumpCmd.opts() as tp.BumpOptions, packages});
    });
  withGlobalOptions(bumpCmd);
  // bumpCmd.usage(bumpCmd.usage() + '\n' + hl('plink bump <package> ...') + ' to recursively bump package.json from multiple directories\n' +
  //   hl('plink bump <dir> -i minor') + ' to bump minor version number, default is patch number');

  /**
   * Pack command
   */
  const packCmd = program.command('pack [package...]')
    .description('npm pack every pakage into tarball files')
    .option('--dir <package directory>', 'pack packages by specifying directories', arrayOptionFn, [])
    .option('-w,--workspace <workspace-dir>', 'pack packages which are linked as dependency of specific workspaces',
      arrayOptionFn, [])
    .option('--pj, --project <project-dir>',
      'project directories to be looked up for all packages which need to be packed to tarball files',
      arrayOptionFn, [])
    .action(async (packages: string[]) => {
      await (await import('./cli-pack')).pack({...packCmd.opts() as tp.PackOptions, packages});
    });
  withGlobalOptions(packCmd);
  packCmd.usage(packCmd.usage() + '\nBy default, run "npm pack" for each linked package which are dependencies of current workspace');

  /**
   * Pack command
   */
  const publishCmd = program.command('publish [package...]')
    .description('run npm publish')
    .option('--dir <package directory>', 'publish packages by specifying directories', arrayOptionFn, [])
    .option<string[]>('--pj, --project <project-dir,...>',
    'project directories to be looked up for all packages which need to be packed to tarball files',
      (value, prev) => {
        prev.push(...value.split(',')); return prev;
      }, [])
    .option('-w,--workspace <workspace-dir>', 'publish packages which are linked as dependency of specific workspaces',
      arrayOptionFn, [])
    .option('--public', 'same as "npm publish" command option "--access public"', false)
    .action(async (packages: string[]) => {
      await (await import('./cli-pack')).publish({...publishCmd.opts() as tp.PublishOptions, packages});
    });
  withGlobalOptions(publishCmd);
}

function loadExtensionCommand(program: commander.Command): string[] {
  // const {getState} = require('./cli-slice') as typeof cliStore;
  const {getState: getPkgState, workspaceKey} = require('../package-mgr') as typeof pkgMgr;
  const ws = getPkgState().workspaces.get(workspaceKey(process.cwd()));
  if (ws == null)
    return [];

  const origPgmCommand = program.command;

  let filePath: string | null = null;

  // const cmdInfoPacks = new Array<Parameters<typeof cliStore.cliActionDispatcher.updateLoadedCmd>[0] extends (infer I)[] ? I : unknown>(1);
  const loadedCmdMap = new Map<string, string>();

  program.command = function(this: typeof program, nameAndArgs: string, ...restArgs: any[]) {
    const cmdName = /^\S+/.exec(nameAndArgs)![0];
    if (loadedCmdMap.has(cmdName)) {
      throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${loadedCmdMap.get(cmdName)}"`);
    }
    loadedCmdMap.set(cmdName, filePath!);
    // cmdInfoPacks[0] = {cmd: cmdName, file: filePath!};
    // cliStore.cliActionDispatcher.updateLoadedCmd(cmdInfoPacks);
    // tslint:disable-next-line: no-console
    // console.log(`Loading command "${cmdName}" from extension ${filePath}`);
    return origPgmCommand.call(this, nameAndArgs, ...restArgs);
  } as any;

  const availables: string[] = [];
  for (const pk of packages4Workspace()) {
    const dr = pk.json.dr;
    if (dr == null || dr.cli == null)
      continue;
    const [pkgFilePath, funcName] = (dr.cli as string).split('#');
    // if (!_.has(ws.originInstallJson.dependencies, extension.pkName) && !_.has(ws.originInstallJson.devDependencies, extension.pkName))
    //   continue;

    availables.push(pk.name);

    try {
      filePath = require.resolve(pk.name + '/' + pkgFilePath);
    } catch (e) {}

    if (filePath != null) {
      try {
        const subCmdFactory: tp.CliExtension = funcName ? require(filePath)[funcName] :
          require(filePath);
        subCmdFactory(program, withGlobalOptions);
      } catch (e) {
        // tslint:disable-next-line: no-console
        console.error(`Failed to load command line extension in package ${pk.name}: "${e.message}"`);
      }
    }
  }
  return availables;
}

function hl(text: string) {
  return chalk.green(text);
}

function hlDesc(text: string) {
  return chalk.green(text);
}

export function withGlobalOptions(program: commander.Command): commander.Command {
  program.option('-c, --config <config-file>',
    hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'),
    (value, prev) => { prev.push(...value.split(',')); return prev;}, [] as string[])
  .option('--prop <property-path=value as JSON | literal>',
    hlDesc('<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n') +
    '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
    '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
    '--prop arraylike.prop[0]=foobar\n' +
    '--prop ["@wfh/foo.bar","prop",0]=true',
    arrayOptionFn, [] as string[]);
  // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));

  return program;
}

let versionChecked = false;
process.on('beforeExit', () => {
  if (versionChecked)
    return;
  versionChecked = true;
  checkPlinkVersion();
});

function checkPlinkVersion() {
  const pkjson = Path.resolve(getRootDir(), 'package.json');
  if (fs.existsSync(pkjson)) {
    const json = JSON.parse(fs.readFileSync(pkjson, 'utf8'));
    let depVer: string = json.dependencies && json.dependencies['@wfh/plink'] ||
      json.devDependencies && json.devDependencies['@wfh/plink'];
    if (depVer.endsWith('.tgz')) {
      const matched = /-(\d+\.\d+\.[^.]+)\.tgz$/.exec(depVer);
      if (matched == null)
        return;
      depVer = matched[1];
    }
    if (depVer && !semver.satisfies(pk.version, depVer)) {
      // tslint:disable-next-line: no-console
      console.log(boxString(`Please run commands to re-install local Plink v${pk.version}, required is v${depVer}:\n\n` +
        '  plink clean-symlinks\n  npm i\n  npm dedupe'));
    }
  }
}

