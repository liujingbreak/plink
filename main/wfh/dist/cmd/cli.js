"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommands = exports.cliPackageArgDesc = void 0;
/// <reference path="./cfont.d.ts" />
/* eslint-disable max-len */
const commander_1 = __importDefault(require("commander"));
const chalk_1 = __importDefault(require("chalk"));
const op = __importStar(require("rxjs/operators"));
// import * as tp from './types';
const pkgMgr = __importStar(require("../package-mgr"));
// import '../tsc-packages-slice';
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const misc_1 = require("../utils/misc");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const override_commander_1 = require("./override-commander");
const package_runner_1 = require("../package-runner");
const utils_1 = require("./utils");
const log4js_1 = require("log4js");
const pk = require('../../../package.json');
// const WIDTH = 130;
const log = (0, log4js_1.getLogger)('plink.cli');
exports.cliPackageArgDesc = 'Single or multiple package names, the "scope" name part can be omitted,' +
    'if the scope name (the part between "@" "/") are listed configuration property "packageScopes"';
async function createCommands(startTime) {
    process.title = 'Plink';
    // const {stateFactory}: typeof store = require('../store');
    await Promise.resolve().then(() => __importStar(require('./cli-slice')));
    // stateFactory.configureStore();
    let cliExtensions;
    const program = new commander_1.default.Command('plink')
        .description(chalk_1.default.cyan('A pluggable monorepo and multi-repo management tool'))
        .action((args) => {
        // eslint-disable-next-line no-console
        console.log((0, misc_1.sexyFont)('PLink').string);
        // eslint-disable-next-line no-console
        console.log(program.helpInformation());
        if (wsState == null) {
            const wsDirs = [...pkgMgr.getState().workspaces.keys()];
            if (wsDirs.length > 0) {
                // eslint-disable-next-line no-console
                console.log(`More commands are available in worktree space directories: [${wsDirs.map(item => chalk_1.default.cyan(item)).join(', ')}]\n` +
                    `Try commands:\n${wsDirs.map(dir => '  plink --space ' + dir).join('\n')}`);
            }
        }
        // eslint-disable-next-line no-console
        console.log(`\nversion: ${pk.version} ${misc_1.isDrcpSymlink ? chalk_1.default.yellow('(symlinked)') : ''} `);
        if (cliExtensions && cliExtensions.length > 0) {
            // eslint-disable-next-line no-console
            console.log(`Found ${cliExtensions.length} command line extension` +
                `${cliExtensions.length > 1 ? 's' : ''}: ${cliExtensions.map(pkg => chalk_1.default.blue(pkg)).join(', ')}`);
        }
        // eslint-disable-next-line no-console
        console.log('\n', chalk_1.default.bgRed('Please determine a sub command listed above'));
        checkPlinkVersion();
        process.nextTick(() => process.exit(1));
    });
    program.addHelpText('before', (0, misc_1.sexyFont)('PLink').string);
    (0, override_commander_1.withCwdOption)(program);
    program.version(pk.version, '-v, --vers', 'output the current version');
    program.addHelpCommand('help [command]', 'show help information, same as "-h". ');
    const overrider = new override_commander_1.CommandOverrider(program);
    let wsState;
    if (process.env.PLINK_SAFE !== 'true') {
        const { getState: getPkgState, workspaceKey } = require('../package-mgr');
        wsState = getPkgState().workspaces.get(workspaceKey(misc_1.plinkEnv.workDir));
        if (wsState != null) {
            overrider.forPackage(null, program => {
                overrider.nameStyler = str => chalk_1.default.green(str);
                spaceOnlySubCommands(program);
                overrider.nameStyler = undefined;
                subComands(program);
            });
        }
        else {
            overrider.forPackage(null, subComands);
        }
    }
    else {
        overrider.forPackage(null, subComands);
    }
    if (process.env.PLINK_SAFE !== 'true') {
        overrider.nameStyler = str => chalk_1.default.cyan(str);
        cliExtensions = loadExtensionCommand(program, wsState, overrider);
        overrider.nameStyler = undefined;
    }
    else {
        // eslint-disable-next-line no-console
        console.log('Value of environment varaible "PLINK_SAFE" is true, skip loading extension');
    }
    overrider.appendGlobalOptions(false);
    try {
        await program.parseAsync(process.argv, { from: 'node' });
    }
    catch (e) {
        log.error('Failed to execute command due to: ' + chalk_1.default.redBright(e.message), e);
        if (e.stack) {
            log.error(e.stack);
        }
        process.exit(1);
    }
}
exports.createCommands = createCommands;
let skipVersionCheck = false;
function subComands(program) {
    process.on('beforeExit', () => {
        if (skipVersionCheck)
            return;
        skipVersionCheck = true;
        if (process.send == null) {
            // process is not a forked child process
            checkPlinkVersion();
        }
    });
    /** command init
     */
    const initCmd = program.command('init [work-directory]').alias('sync')
        .description('Initialize and update work directory, generate basic configuration files for project and component packages,' +
        ' calculate hoisted transitive dependencies, and run "npm install" in current directory.' +
        ' (All NPM config environment variables will affect dependency installation, see https://docs.npmjs.com/cli/v7/using-npm/config#environment-variables)', {
        'work-directory': 'A relative or abosolute directory path, use "." to determine current directory,\n  ommitting this argument meaning:\n' +
            '  - If current directory is already a "work directory", update it.\n' +
            '  - If current directory is not a work directory (maybe at repo\'s root directory), update the latest updated work' +
            ' directory.'
    })
        .option('-f, --force', 'Force run "npm install" in specific workspace directory, this is not same as npm install option "-f" ', false)
        // .option('--lint-hook, --lh', 'Create a git push hook for code lint', false)
        .action(async (workspace) => {
        // eslint-disable-next-line no-console
        console.log((0, misc_1.sexyFont)('PLink').string);
        (await Promise.resolve().then(() => __importStar(require('./cli-init')))).default(initCmd.opts(), workspace);
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
        .action(async (action, projectDir) => {
        // eslint-disable-next-line no-console
        console.log((0, misc_1.sexyFont)('PLink').string);
        (await Promise.resolve().then(() => __importStar(require('./cli-project')))).default({ isSrcDir: false }, action, projectDir);
    });
    program.command('src [add|remove] [dir...]')
        .description('Associate, disassociate or list source directories, Plink will' +
        ' scan source code directories for packages', {
        'add|remove': 'Specify whether associate to a directory or disassociate from a directory',
        dir: 'specify multiple directories by seperating them with space character'
    })
        .action(async (action, dirs) => {
        // eslint-disable-next-line no-console
        console.log((0, misc_1.sexyFont)('PLink').string);
        (await Promise.resolve().then(() => __importStar(require('./cli-project')))).default({ isSrcDir: true }, action, dirs);
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
        const scanNodeModules = require('../utils/symlinks').default;
        const editor = await Promise.resolve().then(() => __importStar(require('../editor-helper')));
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
        ' Unlike "npm install" which does not work with node_modules that might contain symlinks.' +
        ' (All NPM config environment variables will affect dependency installation, see https://docs.npmjs.com/cli/v7/using-npm/config#environment-variables)')
        .action(async () => {
        skipVersionCheck = true;
        await (await Promise.resolve().then(() => __importStar(require('./cli-link-plink')))).reinstallWithLinkedPlink(upgradeCmd.opts());
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
        await (await Promise.resolve().then(() => __importStar(require('./cli-ls')))).default(listCmd.opts());
    });
    const addCmd = program.command('add <dependency...>')
        .description('Add dependency to package.json file, with option "--dev" to add as "devDependencies", ' +
        'without option "--to" this command adds dependency to current worktree space\'s package.json file', {
        dependency: 'dependency package name in form of "<a linked package name without scope part>", "<package name>@<version>", '
    })
        .option('--to <pkg name | worktree dir | pkg dir>', 'add dependency to the package.json of specific linked source package by name or directory, or a worktree space directory')
        .action(async (packages) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-add-package')))).addDependencyTo(packages, addCmd.opts().to, addCmd.opts().dev);
    });
    const tsconfigCmd = program.command('tsconfig')
        .description('List tsconfig.json, jsconfig.json files which will be updated automatically by Plink, (a monorepo means there are node packages which are symlinked from real source code directory' +
        ', if you have customized tsconfig.json file, this command helps to update "compilerOptions.paths" properties)')
        .option('--hook <file>', 'add tsconfig/jsconfig file to Plink\'s automatic updating file list', utils_1.arrayOptionFn, [])
        .option('--unhook <file>', 'remove tsconfig/jsconfig file from Plink\'s automatic updating file list', utils_1.arrayOptionFn, [])
        .option('--clear,--unhook-all', 'remove all tsconfig files from from Plink\'s automatic updating file list', false)
        .action(async () => {
        (await Promise.resolve().then(() => __importStar(require('./cli-tsconfig-hook')))).doTsconfig(tsconfigCmd.opts());
    });
    /**
     * Bump command
     */
    const bumpCmd = program.command('bump [package...]')
        .description('bump package.json version number for specific package, same as "npm version" does', { package: exports.cliPackageArgDesc })
        .option('--pj, --project <project-dir,...>', 'only bump component packages from specific project directory', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
    }, [])
        .option('-i, --incre-version <value>', 'version increment, valid values are: major, minor, patch, prerelease', 'patch')
        .action(async (packages) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-bump')))).default(Object.assign(Object.assign({}, bumpCmd.opts()), { packages }));
    });
    // withGlobalOptions(bumpCmd);
    // bumpCmd.usage(bumpCmd.usage() + '\n' + hl('plink bump <package> ...') + ' to recursively bump package.json from multiple directories\n' +
    //   hl('plink bump <dir> -i minor') + ' to bump minor version number, default is patch number');
    /**
     * Pack command
     */
    const packCmd = program.command('pack [package...]')
        .description('npm pack pakage into tarball files and change version value from related package.json', { package: exports.cliPackageArgDesc })
        .option('--dir <package directory>', 'pack packages by specifying directories', utils_1.arrayOptionFn, [])
        .option('-w,--workspace <workspace-dir>', 'pack packages which are linked as dependency of specific workspaces', utils_1.arrayOptionFn, [])
        .option('--pj, --project <project-dir>', 'project directories to be looked up for all packages which need to be packed to tarball files', utils_1.arrayOptionFn, [])
        .option('--tar-dir <dir>', 'directory to save tar files', path_1.default.join((0, misc_1.getRootDir)(), 'tarballs'))
        .option('--jf, --json-file <pkg-json-file>', 'the package.json file in which "devDependencies", "dependencies" should to be changed according to packed file, ' +
        'by default package.json files in all work spaces will be checked and changed')
        .action(async (packages) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-pack')))).pack(Object.assign(Object.assign({}, packCmd.opts()), { packages }));
    });
    // withGlobalOptions(packCmd);
    packCmd.usage(packCmd.usage() + '\nBy default, run "npm pack" for each linked package which are dependencies of current workspace');
    /**
     * Pack command
     */
    const publishCmd = program.command('publish [package...]')
        .description('run npm publish', { package: exports.cliPackageArgDesc })
        .option('--dir <package directory>', 'publish packages by specifying directories', utils_1.arrayOptionFn, [])
        .option('--pj, --project <project-dir,...>', 'project directories to be looked up for all packages which need to be packed to tarball files', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
    }, [])
        .option('-w,--workspace <workspace-dir>', 'publish packages which are linked as dependency of specific workspaces', utils_1.arrayOptionFn, [])
        .option('--public', 'same as "npm publish" command option "--access public"', false)
        .action(async (packages) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-pack')))).publish(Object.assign(Object.assign({}, publishCmd.opts()), { packages }));
    });
    const analysisCmd = program.command('analyze [pkg-name...]')
        .alias('analyse')
        .description('Use Typescript compiler to parse source code, list dependences by DFS algarithm, result information includes' +
        ': cyclic dependecies, unresolvable dependencies, external dependencies, dependencies are not under target directory.', {
        'pkg-name': 'the name of target source package, the package must be Plink compliant package, this command will only ' +
            'scan special source code directory like "ts/" and "isom/" of target package'
    })
        .option('-x <regexp>', 'Ingore "module name" that matches specific Regular Experssion', '\.(less|scss|css)$')
        .option('-d, --dir <directory>', '(multiple) determine target directory, scan JS/JSX/TS/TSX files under target directory', utils_1.arrayOptionFn, [])
        .option('-f, --file <file>', '(multiple) determine target TS/JS(X) files (multiple file with more options "-f <file> -f <glob>")', utils_1.arrayOptionFn, [])
        .option('-j', 'Show result in JSON', false)
        .option('--tsconfig <file>', 'Use "compilerOptions.paths" property to resolve ts/js file module')
        .option('--alias <alias-express>', 'multiple JSON express, e.g. --alias \'"^@/(.+)$","src/$1"\'', utils_1.arrayOptionFn, [])
        .action(async (packages) => {
        return (await Promise.resolve().then(() => __importStar(require('./cli-analyze')))).default(packages, analysisCmd.opts());
    });
    analysisCmd.usage(analysisCmd.usage() + '\n' +
        'e.g.\n  ' + chalk_1.default.blue('plink analyze -f "packages/foobar1/**/*" -f packages/foobar2/ts/main.ts\n  ' +
        'plink analyze -d packages/foobar1/src -d packages/foobar2/ts'));
    const watchCmd = program.command('watch')
        .description('Watch package source code file changes (files referenced in .npmignore will be ignored) and update Plink state, ' +
        'automatically install transitive dependency')
        .argument('[package...]', exports.cliPackageArgDesc, [])
        .option('--cp, --copy <directory>', 'copy package files to specific directory, mimic behavior of "npm install <pkg>", but this won\'t install dependencies')
        .action((pkgs) => {
        const { cliWatch } = require('./cli-watch');
        cliWatch(pkgs, watchCmd.opts());
    });
    const updateDirCmd = program.command('update-dir')
        .description('Run this command to sync internal state when whole workspace directory is renamed or moved.\n' +
        'Because we store absolute path info of each package in internal state, and it will become invalid after you rename or move directory')
        .action(async (workspace) => {
        (await Promise.resolve().then(() => __importStar(require('./cli-ls')))).checkDir(updateDirCmd.opts());
    });
}
function spaceOnlySubCommands(program) {
    /**
     * tsc command
     */
    const tscCmd = program.command('tsc [package...]')
        .description('Run Typescript compiler to compile source code for target packages, ' +
        'which have been linked to current work directory', { package: exports.cliPackageArgDesc })
        .option('-w, --watch', 'Typescript compiler watch mode', false)
        .option('--pj, --project <project-dir,...>', 'Compile only specific project directory', (v, prev) => {
        prev.push(...v.split(','));
        return prev;
    }, [])
        // .option('--ws,--workspace <workspace-dir>', 'only include those linked packages which are dependency of specific workspaces',
        //   arrayOptionFn, [])
        .option('--tsx,--jsx', 'includes TSX file', false)
        .option('--ed, --emitDeclarationOnly', 'Typescript compiler option: --emitDeclarationOnly.\nOnly emit ‘.d.ts’ declaration files.', false)
        .option('--source-map <inline|file>', 'Source map style: "inline" or "file"', 'inline')
        .option('--merge,--merge-tsconfig <file>', 'Merge compilerOptions "baseUrl" and "paths" from specified tsconfig file')
        .option('--copath, --compiler-options-paths <pathMapJson>', 'Add more "paths" property to compiler options. ' +
        '(e.g. --copath \'{\"@/*":["/Users/worker/ocean-ui/src/*"]}\')', (v, prev) => {
        prev.push(...v.split(','));
        return prev;
    }, [])
        .option('--co <JSON-string>', `Partial compiler options to be merged (except "baseUrl"), "paths" must be relative to ${path_1.default.relative(process.cwd(), misc_1.plinkEnv.workDir) || 'current directory'}`)
        .action(async (packages) => {
        const opt = tscCmd.opts();
        const tsc = await Promise.resolve().then(() => __importStar(require('../ts-cmd')));
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
        (0, utils_1.hlDesc)('plink tsc\n') + ' Compile linked packages that are dependencies of current workspace (you shall run this command only in a workspace directory)\n' +
        (0, utils_1.hlDesc)('plink tsc <package..>\n') + ' Only compile specific packages by providing package name or short name\n' +
        (0, utils_1.hlDesc)('plink tsc [package...] -w\n') + ' Watch packages change and compile when new typescript file is changed or created\n\n');
    program.command('setting [package]')
        .description('List packages setting and values', { package: 'package name, only list setting for specific package' })
        .action(async (pkgName) => {
        (await Promise.resolve().then(() => __importStar(require('./cli-setting')))).default(pkgName);
    });
    /** command run*/
    const runCmd = program.command('run <target> [arguments...]')
        .description('Run specific module\'s exported function\n')
        .action(async (target, args) => {
        await (await Promise.resolve().then(() => __importStar(require('../package-runner')))).runSinglePackage({ target, args });
    });
    runCmd.usage(runCmd.usage() + '\n' + chalk_1.default.green('plink run <target> [arguments...]\n') +
        `e.g.\n  ${chalk_1.default.green('plink run ../packages/forbar-package/dist/file.js#function argument1 argument2...')}\n` +
        'execute exported function of TS/JS file from specific package or path\n\n' +
        '<target> - JS or TS file module path which can be resolved by Node.js (ts-node) followed by "#" and exported function name,\n');
    // 'e.g. \n' +
    // chalk.green('package-name/dist/foobar.js#myFunction') +
    // ', function can be async which returns Promise\n' +
    // chalk.green('node_modules/package-dir/dist/foobar.ts#myFunction') +
    // ', relative or absolute path\n');
}
function loadExtensionCommand(program, ws, overrider) {
    if (ws == null)
        return [];
    (0, package_runner_1.initInjectorForNodePackages)();
    const availables = [];
    for (const pk of (0, package_list_helper_1.packages4Workspace)()) {
        const dr = pk.json.dr || pk.json.plink;
        if (dr == null || dr.cli == null)
            continue;
        const [pkgFilePath, funcName] = dr.cli.split('#');
        availables.push(pk.name);
        try {
            overrider.forPackage(pk, pkgFilePath, funcName);
        }
        catch (e) {
            // eslint-disable-next-line no-console
            log.warn(`Failed to load command line extension in package ${pk.name}: "${e.message}"`, e);
        }
    }
    return availables;
}
function addNpmInstallOption(cmd) {
    cmd.option('--cache <npm-cache>', 'same as npm install option "--cache"')
        .option('--ci, --use-ci', 'Use "npm ci" instead of "npm install" to install dependencies', false)
        // .option('--offline', 'same as npm option "--offline" during executing npm install/ci ', false)
        // .option('--yarn', 'Use Yarn to install component peer dependencies instead of using NPM', false)
        .option('--production', 'Add "--production" or "--only=prod" command line argument to "yarn/npm install"', false);
}
function checkPlinkVersion() {
    const pkjson = path_1.default.resolve((0, misc_1.getRootDir)(), 'package.json');
    if (fs_1.default.existsSync(pkjson)) {
        const json = JSON.parse(fs_1.default.readFileSync(pkjson, 'utf8'));
        let depVer = json.dependencies && json.dependencies['@wfh/plink'] ||
            json.devDependencies && json.devDependencies['@wfh/plink'];
        if (depVer == null) {
            // eslint-disable-next-line no-console
            console.log((0, misc_1.boxString)('Don\'t forget to add @wfh/plink in package.json as dependencies'));
            return;
        }
        if (depVer.endsWith('.tgz')) {
            const matched = /-(\d+\.\d+\.[^]+?)\.tgz$/.exec(depVer);
            if (matched == null)
                return;
            depVer = matched[1];
        }
        if (depVer && !semver_1.default.satisfies(pk.version, depVer)) {
            // eslint-disable-next-line no-console
            console.log((0, misc_1.boxString)(`Local installed Plink version ${chalk_1.default.cyan(pk.version)} does not match dependency version ${chalk_1.default.green(depVer)} in package.json, ` +
                `run command "${chalk_1.default.green('plink upgrade')}" to upgrade or downgrade to expected version`));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLDRCQUE0QjtBQUM1QiwwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLG1EQUFxQztBQUNyQyxpQ0FBaUM7QUFDakMsdURBQXlDO0FBQ3pDLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFFdEUsd0NBQXlGO0FBRXpGLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLDZEQUFxRTtBQUNyRSxzREFBOEQ7QUFDOUQsbUNBQThDO0FBQzlDLG1DQUFpQztBQUdqQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQXNCLENBQUM7QUFDakUscUJBQXFCO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxXQUFXLENBQUMsQ0FBQztBQUV0QixRQUFBLGlCQUFpQixHQUFHLHlFQUF5RTtJQUMxRyxnR0FBZ0csQ0FBQztBQUUxRixLQUFLLFVBQVUsY0FBYyxDQUFDLFNBQWlCO0lBQ3BELE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLDREQUE0RDtJQUM1RCx3REFBYSxhQUFhLEdBQUMsQ0FBQztJQUM1QixpQ0FBaUM7SUFHakMsSUFBSSxhQUFtQyxDQUFDO0lBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1NBQzdDLFdBQVcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxDQUFDLENBQUM7U0FDOUUsTUFBTSxDQUFDLENBQUMsSUFBYyxFQUFFLEVBQUU7UUFDekIsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBQSxlQUFRLEVBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEMsc0NBQXNDO1FBQ3RD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QUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztZQUMvRCxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDN0QsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUEsZ0JBQVMsRUFBQyxpRUFBaUUsQ0FBQyxDQUFDLENBQUM7WUFDMUYsT0FBTztTQUNSO1FBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzNCLE1BQU0sT0FBTyxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4RCxJQUFJLE9BQU8sSUFBSSxJQUFJO2dCQUNqQixPQUFPO1lBQ1QsTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyQjtRQUNELElBQUksTUFBTSxJQUFJLENBQUMsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNuRCxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGdCQUFTLEVBQUMsaUNBQWlDLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsZUFBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CO2dCQUN4SixnQkFBZ0IsZUFBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsK0NBQStDLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY2ZvbnQuZC50c1wiIC8+XG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICcuLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgaXNEcmNwU3ltbGluaywgc2V4eUZvbnQsIGdldFJvb3REaXIsIGJveFN0cmluZywgcGxpbmtFbnYgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF9zeW1saW5rcyBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQge0NvbW1hbmRPdmVycmlkZXIsIHdpdGhDd2RPcHRpb259IGZyb20gJy4vb3ZlcnJpZGUtY29tbWFuZGVyJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge2hsRGVzYywgYXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCB7Q2xpT3B0aW9ucyBhcyBUc2NvbmZpZ0NsaU9wdGlvbnN9IGZyb20gJy4vY2xpLXRzY29uZmlnLWhvb2snO1xuaW1wb3J0ICogYXMgX2NsaVdhdGNoIGZyb20gJy4vY2xpLXdhdGNoJztcbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG4vLyBjb25zdCBXSURUSCA9IDEzMDtcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY2xpJyk7XG5cbmV4cG9ydCBjb25zdCBjbGlQYWNrYWdlQXJnRGVzYyA9ICdTaW5nbGUgb3IgbXVsdGlwbGUgcGFja2FnZSBuYW1lcywgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQsJyArXG4naWYgdGhlIHNjb3BlIG5hbWUgKHRoZSBwYXJ0IGJldHdlZW4gXCJAXCIgXCIvXCIpIGFyZSBsaXN0ZWQgY29uZmlndXJhdGlvbiBwcm9wZXJ0eSBcInBhY2thZ2VTY29wZXNcIic7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21tYW5kcyhzdGFydFRpbWU6IG51bWJlcikge1xuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rJztcbiAgLy8gY29uc3Qge3N0YXRlRmFjdG9yeX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gIGF3YWl0IGltcG9ydCgnLi9jbGktc2xpY2UnKTtcbiAgLy8gc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG5cblxuICBsZXQgY2xpRXh0ZW5zaW9uczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoJ3BsaW5rJylcbiAgLmRlc2NyaXB0aW9uKGNoYWxrLmN5YW4oJ0EgcGx1Z2dhYmxlIG1vbm9yZXBvIGFuZCBtdWx0aS1yZXBvIG1hbmFnZW1lbnQgdG9vbCcpKVxuICAuYWN0aW9uKChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHByb2dyYW0uaGVscEluZm9ybWF0aW9uKCkpO1xuXG4gICAgaWYgKHdzU3RhdGUgPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd3NEaXJzID0gWy4uLnBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpXTtcbiAgICAgIGlmICh3c0RpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhgTW9yZSBjb21tYW5kcyBhcmUgYXZhaWxhYmxlIGluIHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yaWVzOiBbJHt3c0RpcnMubWFwKGl0ZW0gPT4gY2hhbGsuY3lhbihpdGVtKSkuam9pbignLCAnKX1dXFxuYCArXG4gICAgICAgICAgYFRyeSBjb21tYW5kczpcXG4ke3dzRGlycy5tYXAoZGlyID0+ICcgIHBsaW5rIC0tc3BhY2UgJyArIGRpcikuam9pbignXFxuJyl9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYFxcbnZlcnNpb246ICR7cGsudmVyc2lvbn0gJHtpc0RyY3BTeW1saW5rID8gY2hhbGsueWVsbG93KCcoc3ltbGlua2VkKScpIDogJyd9IGApO1xuICAgIGlmIChjbGlFeHRlbnNpb25zICYmIGNsaUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCAke2NsaUV4dGVuc2lvbnMubGVuZ3RofSBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uYCArXG4gICAgICBgJHtjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDEgPyAncycgOiAnJ306ICR7Y2xpRXh0ZW5zaW9ucy5tYXAocGtnID0+IGNoYWxrLmJsdWUocGtnKSkuam9pbignLCAnKX1gKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnXFxuJywgY2hhbGsuYmdSZWQoJ1BsZWFzZSBkZXRlcm1pbmUgYSBzdWIgY29tbWFuZCBsaXN0ZWQgYWJvdmUnKSk7XG4gICAgY2hlY2tQbGlua1ZlcnNpb24oKTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHByb2Nlc3MuZXhpdCgxKSk7XG4gIH0pO1xuICBwcm9ncmFtLmFkZEhlbHBUZXh0KCdiZWZvcmUnLCBzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICB3aXRoQ3dkT3B0aW9uKHByb2dyYW0pO1xuXG4gIHByb2dyYW0udmVyc2lvbihway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xuICBwcm9ncmFtLmFkZEhlbHBDb21tYW5kKCdoZWxwIFtjb21tYW5kXScsICdzaG93IGhlbHAgaW5mb3JtYXRpb24sIHNhbWUgYXMgXCItaFwiLiAnKTtcblxuICBjb25zdCBvdmVycmlkZXIgPSBuZXcgQ29tbWFuZE92ZXJyaWRlcihwcm9ncmFtKTtcbiAgbGV0IHdzU3RhdGU6IHBrZ01nci5Xb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcblxuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfU0FGRSAhPT0gJ3RydWUnKSB7XG4gICAgY29uc3Qge2dldFN0YXRlOiBnZXRQa2dTdGF0ZSwgd29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIHBrZ01ncjtcbiAgICB3c1N0YXRlID0gZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0RpcikpO1xuICAgIGlmICh3c1N0YXRlICE9IG51bGwpIHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHByb2dyYW0gPT4ge1xuICAgICAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHN0ciA9PiBjaGFsay5ncmVlbihzdHIpO1xuICAgICAgICBzcGFjZU9ubHlTdWJDb21tYW5kcyhwcm9ncmFtKTtcbiAgICAgICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHN1YkNvbWFuZHMocHJvZ3JhbSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgc3ViQ29tYW5kcyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHN1YkNvbWFuZHMpO1xuICB9XG5cbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gc3RyID0+IGNoYWxrLmN5YW4oc3RyKTtcbiAgICBjbGlFeHRlbnNpb25zID0gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbSwgd3NTdGF0ZSwgb3ZlcnJpZGVyKTtcbiAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdWYWx1ZSBvZiBlbnZpcm9ubWVudCB2YXJhaWJsZSBcIlBMSU5LX1NBRkVcIiBpcyB0cnVlLCBza2lwIGxvYWRpbmcgZXh0ZW5zaW9uJyk7XG4gIH1cblxuICBvdmVycmlkZXIuYXBwZW5kR2xvYmFsT3B0aW9ucyhmYWxzZSk7XG4gIHRyeSB7XG4gICAgYXdhaXQgcHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndiwge2Zyb206ICdub2RlJ30pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gZXhlY3V0ZSBjb21tYW5kIGR1ZSB0bzogJyArIGNoYWxrLnJlZEJyaWdodCgoZSBhcyBFcnJvcikubWVzc2FnZSksIGUpO1xuICAgIGlmICgoZSBhcyBFcnJvcikuc3RhY2spIHtcbiAgICAgIGxvZy5lcnJvcigoZSBhcyBFcnJvcikuc3RhY2spO1xuICAgIH1cbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cblxubGV0IHNraXBWZXJzaW9uQ2hlY2sgPSBmYWxzZTtcblxuZnVuY3Rpb24gc3ViQ29tYW5kcyhwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBwcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgKCkgPT4ge1xuICAgIGlmIChza2lwVmVyc2lvbkNoZWNrKVxuICAgICAgcmV0dXJuO1xuICAgIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICAgIGlmIChwcm9jZXNzLnNlbmQgPT0gbnVsbCkge1xuICAgICAgLy8gcHJvY2VzcyBpcyBub3QgYSBmb3JrZWQgY2hpbGQgcHJvY2Vzc1xuICAgICAgY2hlY2tQbGlua1ZlcnNpb24oKTtcbiAgICB9XG4gIH0pO1xuICAvKiogY29tbWFuZCBpbml0XG4gICAqL1xuICBjb25zdCBpbml0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdpbml0IFt3b3JrLWRpcmVjdG9yeV0nKS5hbGlhcygnc3luYycpXG4gICAgLmRlc2NyaXB0aW9uKCdJbml0aWFsaXplIGFuZCB1cGRhdGUgd29yayBkaXJlY3RvcnksIGdlbmVyYXRlIGJhc2ljIGNvbmZpZ3VyYXRpb24gZmlsZXMgZm9yIHByb2plY3QgYW5kIGNvbXBvbmVudCBwYWNrYWdlcywnICtcbiAgICAgICcgY2FsY3VsYXRlIGhvaXN0ZWQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMsIGFuZCBydW4gXCJucG0gaW5zdGFsbFwiIGluIGN1cnJlbnQgZGlyZWN0b3J5LicgK1xuICAgICAgJyAoQWxsIE5QTSBjb25maWcgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdpbGwgYWZmZWN0IGRlcGVuZGVuY3kgaW5zdGFsbGF0aW9uLCBzZWUgaHR0cHM6Ly9kb2NzLm5wbWpzLmNvbS9jbGkvdjcvdXNpbmctbnBtL2NvbmZpZyNlbnZpcm9ubWVudC12YXJpYWJsZXMpJyxcbiAgICAgIHtcbiAgICAgICAgJ3dvcmstZGlyZWN0b3J5JzogJ0EgcmVsYXRpdmUgb3IgYWJvc29sdXRlIGRpcmVjdG9yeSBwYXRoLCB1c2UgXCIuXCIgdG8gZGV0ZXJtaW5lIGN1cnJlbnQgZGlyZWN0b3J5LFxcbiAgb21taXR0aW5nIHRoaXMgYXJndW1lbnQgbWVhbmluZzpcXG4nICtcbiAgICAgICAgICAnICAtIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIGFscmVhZHkgYSBcIndvcmsgZGlyZWN0b3J5XCIsIHVwZGF0ZSBpdC5cXG4nICtcbiAgICAgICAgICAnICAtIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgZGlyZWN0b3J5IChtYXliZSBhdCByZXBvXFwncyByb290IGRpcmVjdG9yeSksIHVwZGF0ZSB0aGUgbGF0ZXN0IHVwZGF0ZWQgd29yaycgK1xuICAgICAgICAgICcgZGlyZWN0b3J5LidcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLWYsIC0tZm9yY2UnLCAnRm9yY2UgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5LCB0aGlzIGlzIG5vdCBzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi1mXCIgJywgZmFsc2UpXG4gICAgLy8gLm9wdGlvbignLS1saW50LWhvb2ssIC0tbGgnLCAnQ3JlYXRlIGEgZ2l0IHB1c2ggaG9vayBmb3IgY29kZSBsaW50JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlPzogc3RyaW5nKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWluaXQnKSkuZGVmYXVsdChpbml0Q21kLm9wdHMoKSAsIHdvcmtzcGFjZSk7XG4gICAgfSk7XG4gIGFkZE5wbUluc3RhbGxPcHRpb24oaW5pdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcHJvamVjdFxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdwcm9qZWN0IFthZGR8cmVtb3ZlXSBbZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZnJvbSBhc3NvY2lhdGVkIHByb2plY3RzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgQXNzb2NpYXRlIHRvIGEgcHJvamVjdCBvciBEaXNhc3NvY2lhdGUgZnJvbSBhIHByb2plY3QnLFxuICAgICAgICBkaXI6ICdTcGVjaWZ5IHRhcmdldCBwcm9qZWN0IHJlcG8gZGlyZWN0b3J5IChhYnNvbHV0ZSBwYXRoIG9yIHJlbGF0aXZlIHBhdGggdG8gY3VycmVudCBkaXJlY3RvcnkpJyArXG4gICAgICAgICAgJywgc3BlY2lmeSBtdWx0aXBsZSBwcm9qZWN0IGJ5IHNlcGVyYXRpbmcgdGhlbSB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJyB8ICdyZW1vdmUnIHwgdW5kZWZpbmVkLCBwcm9qZWN0RGlyOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiBmYWxzZX0sIGFjdGlvbiwgcHJvamVjdERpcik7XG4gICAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzcmMgW2FkZHxyZW1vdmVdIFtkaXIuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3Qgc291cmNlIGRpcmVjdG9yaWVzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZm9yIHBhY2thZ2VzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgYXNzb2NpYXRlIHRvIGEgZGlyZWN0b3J5IG9yIGRpc2Fzc29jaWF0ZSBmcm9tIGEgZGlyZWN0b3J5JyxcbiAgICAgICAgZGlyOiAnc3BlY2lmeSBtdWx0aXBsZSBkaXJlY3RvcmllcyBieSBzZXBlcmF0aW5nIHRoZW0gd2l0aCBzcGFjZSBjaGFyYWN0ZXInXG4gICAgICB9KVxuICAgICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJyB8ICdyZW1vdmUnIHwgdW5kZWZpbmVkLCBkaXJzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiB0cnVlfSwgYWN0aW9uLCBkaXJzKTtcbiAgICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIC8vIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgLy8gICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJywge1xuICAvLyAgICAgcGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2NcbiAgLy8gICB9KVxuICAvLyAgIC5vcHRpb24oJy0tcGogPHByb2plY3QxLHByb2plY3QyLi4uPicsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLy8gICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAvLyAgIC5hY3Rpb24oYXN5bmMgcGFja2FnZXMgPT4ge1xuICAvLyAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICAvLyAgIH0pO1xuXG4gIC8vIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgLy8gICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gIC8vICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY3MnKS5hbGlhcygnY2xlYXItc3ltbGlua3MnKVxuICAgIC5kZXNjcmlwdGlvbignQ2xlYXIgc3ltbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAgIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2Nhbk5vZGVNb2R1bGVzID0gKHJlcXVpcmUoJy4uL3V0aWxzL3N5bWxpbmtzJykgYXMgdHlwZW9mIF9zeW1saW5rcykuZGVmYXVsdDtcbiAgICAgIGNvbnN0IGVkaXRvciA9IGF3YWl0IGltcG9ydCgnLi4vZWRpdG9yLWhlbHBlcicpO1xuICAgICAgZWRpdG9yLmRpc3BhdGNoZXIuY2xlYXJTeW1saW5rcygpO1xuICAgICAgYXdhaXQgZWRpdG9yLmdldEFjdGlvbiQoJ2NsZWFyU3ltbGlua3NEb25lJykucGlwZShvcC50YWtlKDEpKS50b1Byb21pc2UoKTtcbiAgICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcyh1bmRlZmluZWQsICdhbGwnKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCB1cGdyYWRlXG4gICAqL1xuICBjb25zdCB1cGdyYWRlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGdyYWRlJylcbiAgICAuYWxpYXMoJ2luc3RhbGwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVpbnN0YWxsIGxvY2FsIFBsaW5rIGFsb25nIHdpdGggb3RoZXIgZGVwZW5kZW5jaWVzLicgK1xuICAgICAgJyBVbmxpa2UgXCJucG0gaW5zdGFsbFwiIHdoaWNoIGRvZXMgbm90IHdvcmsgd2l0aCBub2RlX21vZHVsZXMgdGhhdCBtaWdodCBjb250YWluIHN5bWxpbmtzLicgK1xuICAgICAgJyAoQWxsIE5QTSBjb25maWcgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdpbGwgYWZmZWN0IGRlcGVuZGVuY3kgaW5zdGFsbGF0aW9uLCBzZWUgaHR0cHM6Ly9kb2NzLm5wbWpzLmNvbS9jbGkvdjcvdXNpbmctbnBtL2NvbmZpZyNlbnZpcm9ubWVudC12YXJpYWJsZXMpJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGluay1wbGluaycpKS5yZWluc3RhbGxXaXRoTGlua2VkUGxpbmsodXBncmFkZUNtZC5vcHRzKCkgKTtcbiAgICB9KTtcbiAgYWRkTnBtSW5zdGFsbE9wdGlvbih1cGdyYWRlQ21kKTtcbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdkb2NrZXJpemUgPHdvcmtzcGFjZS1kaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKGNoYWxrLmdyYXkoJ1tUQkldIEdlbmVyYXRlIERvY2tlcmZpbGUgZm9yIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnksIGFuZCBnZW5lcmF0ZSBkb2NrZXIgaW1hZ2UnKSk7XG5cbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdwa2cgPHdvcmtzcGFjZS1kaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKGNoYWxrLmdyYXkoJ1tUQkldIFVzZSBQa2cgKGh0dHBzOi8vZ2l0aHViLmNvbS92ZXJjZWwvcGtnKSB0byBwYWNrYWdlIE5vZGUuanMgcHJvamVjdCBpbnRvIGFuIGV4ZWN1dGFibGUgJykpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxzXG4gICAqL1xuICBjb25zdCBsaXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdscycpLmFsaWFzKCdsaXN0JylcbiAgICAub3B0aW9uKCctaiwgLS1qc29uJywgJ2xpc3QgbGlua2VkIGRlcGVuZGVuY2llcyBpbiBmb3JtIG9mIEpTT04nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWhvaXN0JywgJ2xpc3QgaG9pc3RlZCB0cmFuc2l0aXZlIERlcGVuZGVuY3kgaW5mb3JtYXRpb24nLCBmYWxzZSlcbiAgICAuZGVzY3JpcHRpb24oJ0lmIHlvdSB3YW50IHRvIGtub3cgaG93IG1hbnkgcGFja2FnZXMgd2lsbCBhY3R1YWxseSBydW4sIHRoaXMgY29tbWFuZCBwcmludHMgb3V0IGEgbGlzdCBhbmQgdGhlIHByaW9yaXRpZXMsIGluY2x1ZGluZyBpbnN0YWxsZWQgcGFja2FnZXMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuZGVmYXVsdChsaXN0Q21kLm9wdHMoKSApO1xuICAgIH0pO1xuXG4gIGNvbnN0IGFkZENtZCA9IHByb2dyYW0uY29tbWFuZCgnYWRkIDxkZXBlbmRlbmN5Li4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdBZGQgZGVwZW5kZW5jeSB0byBwYWNrYWdlLmpzb24gZmlsZSwgd2l0aCBvcHRpb24gXCItLWRldlwiIHRvIGFkZCBhcyBcImRldkRlcGVuZGVuY2llc1wiLCAnICtcbiAgICAgICd3aXRob3V0IG9wdGlvbiBcIi0tdG9cIiB0aGlzIGNvbW1hbmQgYWRkcyBkZXBlbmRlbmN5IHRvIGN1cnJlbnQgd29ya3RyZWUgc3BhY2VcXCdzIHBhY2thZ2UuanNvbiBmaWxlJyxcbiAgICAgIHtcbiAgICAgICAgZGVwZW5kZW5jeTogJ2RlcGVuZGVuY3kgcGFja2FnZSBuYW1lIGluIGZvcm0gb2YgXCI8YSBsaW5rZWQgcGFja2FnZSBuYW1lIHdpdGhvdXQgc2NvcGUgcGFydD5cIiwgXCI8cGFja2FnZSBuYW1lPkA8dmVyc2lvbj5cIiwgJ1xuICAgICAgfSlcbiAgICAub3B0aW9uKCctLXRvIDxwa2cgbmFtZSB8IHdvcmt0cmVlIGRpciB8IHBrZyBkaXI+JywgJ2FkZCBkZXBlbmRlbmN5IHRvIHRoZSBwYWNrYWdlLmpzb24gb2Ygc3BlY2lmaWMgbGlua2VkIHNvdXJjZSBwYWNrYWdlIGJ5IG5hbWUgb3IgZGlyZWN0b3J5LCBvciBhIHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yeScpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hZGQtcGFja2FnZScpKS5hZGREZXBlbmRlbmN5VG8ocGFja2FnZXMsIGFkZENtZC5vcHRzKCkudG8sIGFkZENtZC5vcHRzKCkuZGV2KTtcbiAgICB9KTtcblxuICBjb25zdCB0c2NvbmZpZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjb25maWcnKVxuICAgIC5kZXNjcmlwdGlvbignTGlzdCB0c2NvbmZpZy5qc29uLCBqc2NvbmZpZy5qc29uIGZpbGVzIHdoaWNoIHdpbGwgYmUgdXBkYXRlZCBhdXRvbWF0aWNhbGx5IGJ5IFBsaW5rLCAoYSBtb25vcmVwbyBtZWFucyB0aGVyZSBhcmUgbm9kZSBwYWNrYWdlcyB3aGljaCBhcmUgc3ltbGlua2VkIGZyb20gcmVhbCBzb3VyY2UgY29kZSBkaXJlY3RvcnknICtcbiAgICAgICcsIGlmIHlvdSBoYXZlIGN1c3RvbWl6ZWQgdHNjb25maWcuanNvbiBmaWxlLCB0aGlzIGNvbW1hbmQgaGVscHMgdG8gdXBkYXRlIFwiY29tcGlsZXJPcHRpb25zLnBhdGhzXCIgcHJvcGVydGllcyknKVxuICAgIC5vcHRpb24oJy0taG9vayA8ZmlsZT4nLCAnYWRkIHRzY29uZmlnL2pzY29uZmlnIGZpbGUgdG8gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXVuaG9vayA8ZmlsZT4nLCAncmVtb3ZlIHRzY29uZmlnL2pzY29uZmlnIGZpbGUgZnJvbSBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tY2xlYXIsLS11bmhvb2stYWxsJywgJ3JlbW92ZSBhbGwgdHNjb25maWcgZmlsZXMgZnJvbSBmcm9tIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS10c2NvbmZpZy1ob29rJykpLmRvVHNjb25maWcodHNjb25maWdDbWQub3B0cygpICk7XG4gICAgfSk7XG5cbiAgLyoqXG4gICAqIEJ1bXAgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgYnVtcENtZCA9IHByb2dyYW0uY29tbWFuZCgnYnVtcCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignYnVtcCBwYWNrYWdlLmpzb24gdmVyc2lvbiBudW1iZXIgZm9yIHNwZWNpZmljIHBhY2thZ2UsIHNhbWUgYXMgXCJucG0gdmVyc2lvblwiIGRvZXMnLFxuICAgICAge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ29ubHkgYnVtcCBjb21wb25lbnQgcGFja2FnZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpO1xuICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY3JlLXZlcnNpb24gPHZhbHVlPicsXG4gICAgICAndmVyc2lvbiBpbmNyZW1lbnQsIHZhbGlkIHZhbHVlcyBhcmU6IG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UnLCAncGF0Y2gnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktYnVtcCcpKS5kZWZhdWx0KHsuLi5idW1wQ21kLm9wdHMoKSAsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKGJ1bXBDbWQpO1xuICAvLyBidW1wQ21kLnVzYWdlKGJ1bXBDbWQudXNhZ2UoKSArICdcXG4nICsgaGwoJ3BsaW5rIGJ1bXAgPHBhY2thZ2U+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gIC8vICAgaGwoJ3BsaW5rIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzIGFuZCBjaGFuZ2UgdmVyc2lvbiB2YWx1ZSBmcm9tIHJlbGF0ZWQgcGFja2FnZS5qc29uJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3BhY2sgcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwYWNrIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXI+JyxcbiAgICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS10YXItZGlyIDxkaXI+JywgJ2RpcmVjdG9yeSB0byBzYXZlIHRhciBmaWxlcycsIFBhdGguam9pbihnZXRSb290RGlyKCksICd0YXJiYWxscycpKVxuICAgIC5vcHRpb24oJy0tamYsIC0tanNvbi1maWxlIDxwa2ctanNvbi1maWxlPicsICd0aGUgcGFja2FnZS5qc29uIGZpbGUgaW4gd2hpY2ggXCJkZXZEZXBlbmRlbmNpZXNcIiwgXCJkZXBlbmRlbmNpZXNcIiBzaG91bGQgdG8gYmUgY2hhbmdlZCBhY2NvcmRpbmcgdG8gcGFja2VkIGZpbGUsICcgK1xuICAgICAgJ2J5IGRlZmF1bHQgcGFja2FnZS5qc29uIGZpbGVzIGluIGFsbCB3b3JrIHNwYWNlcyB3aWxsIGJlIGNoZWNrZWQgYW5kIGNoYW5nZWQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktcGFjaycpKS5wYWNrKHsuLi5wYWNrQ21kLm9wdHMoKSAsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKHBhY2tDbWQpO1xuICBwYWNrQ21kLnVzYWdlKHBhY2tDbWQudXNhZ2UoKSArICdcXG5CeSBkZWZhdWx0LCBydW4gXCJucG0gcGFja1wiIGZvciBlYWNoIGxpbmtlZCBwYWNrYWdlIHdoaWNoIGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UnKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwdWJsaXNoQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwdWJsaXNoIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdydW4gbnBtIHB1Ymxpc2gnLCB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncHVibGlzaCBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsXG4gICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwdWJsaXNoIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcHVibGljJywgJ3NhbWUgYXMgXCJucG0gcHVibGlzaFwiIGNvbW1hbmQgb3B0aW9uIFwiLS1hY2Nlc3MgcHVibGljXCInLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucHVibGlzaCh7Li4ucHVibGlzaENtZC5vcHRzKCkgLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuXG5cbiAgY29uc3QgYW5hbHlzaXNDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FuYWx5emUgW3BrZy1uYW1lLi4uXScpXG4gICAgLmFsaWFzKCdhbmFseXNlJylcbiAgICAuZGVzY3JpcHRpb24oJ1VzZSBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIHBhcnNlIHNvdXJjZSBjb2RlLCBsaXN0IGRlcGVuZGVuY2VzIGJ5IERGUyBhbGdhcml0aG0sIHJlc3VsdCBpbmZvcm1hdGlvbiBpbmNsdWRlcycgK1xuICAgICAgJzogY3ljbGljIGRlcGVuZGVjaWVzLCB1bnJlc29sdmFibGUgZGVwZW5kZW5jaWVzLCBleHRlcm5hbCBkZXBlbmRlbmNpZXMsIGRlcGVuZGVuY2llcyBhcmUgbm90IHVuZGVyIHRhcmdldCBkaXJlY3RvcnkuJywge1xuICAgICAgJ3BrZy1uYW1lJzogJ3RoZSBuYW1lIG9mIHRhcmdldCBzb3VyY2UgcGFja2FnZSwgdGhlIHBhY2thZ2UgbXVzdCBiZSBQbGluayBjb21wbGlhbnQgcGFja2FnZSwgdGhpcyBjb21tYW5kIHdpbGwgb25seSAnICtcbiAgICAgICAgJ3NjYW4gc3BlY2lhbCBzb3VyY2UgY29kZSBkaXJlY3RvcnkgbGlrZSBcInRzL1wiIGFuZCBcImlzb20vXCIgb2YgdGFyZ2V0IHBhY2thZ2UnXG4gICAgICB9KVxuICAgIC5vcHRpb24oJy14IDxyZWdleHA+JywgJ0luZ29yZSBcIm1vZHVsZSBuYW1lXCIgdGhhdCBtYXRjaGVzIHNwZWNpZmljIFJlZ3VsYXIgRXhwZXJzc2lvbicsICdcXC4obGVzc3xzY3NzfGNzcykkJylcbiAgICAub3B0aW9uKCctZCwgLS1kaXIgPGRpcmVjdG9yeT4nLFxuICAgICAgJyhtdWx0aXBsZSkgZGV0ZXJtaW5lIHRhcmdldCBkaXJlY3RvcnksIHNjYW4gSlMvSlNYL1RTL1RTWCBmaWxlcyB1bmRlciB0YXJnZXQgZGlyZWN0b3J5JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLWYsIC0tZmlsZSA8ZmlsZT4nLFxuICAgICAgJyhtdWx0aXBsZSkgZGV0ZXJtaW5lIHRhcmdldCBUUy9KUyhYKSBmaWxlcyAobXVsdGlwbGUgZmlsZSB3aXRoIG1vcmUgb3B0aW9ucyBcIi1mIDxmaWxlPiAtZiA8Z2xvYj5cIiknLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctaicsICdTaG93IHJlc3VsdCBpbiBKU09OJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS10c2NvbmZpZyA8ZmlsZT4nLCAnVXNlIFwiY29tcGlsZXJPcHRpb25zLnBhdGhzXCIgcHJvcGVydHkgdG8gcmVzb2x2ZSB0cy9qcyBmaWxlIG1vZHVsZScpXG4gICAgLm9wdGlvbignLS1hbGlhcyA8YWxpYXMtZXhwcmVzcz4nLCAnbXVsdGlwbGUgSlNPTiBleHByZXNzLCBlLmcuIC0tYWxpYXMgXFwnXCJeQC8oLispJFwiLFwic3JjLyQxXCJcXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hbmFseXplJykpLmRlZmF1bHQocGFja2FnZXMsIGFuYWx5c2lzQ21kLm9wdHMoKSk7XG4gICAgfSk7XG5cbiAgYW5hbHlzaXNDbWQudXNhZ2UoYW5hbHlzaXNDbWQudXNhZ2UoKSArICdcXG4nICtcbiAgICAnZS5nLlxcbiAgJyArIGNoYWxrLmJsdWUoJ3BsaW5rIGFuYWx5emUgLWYgXCJwYWNrYWdlcy9mb29iYXIxLyoqLypcIiAtZiBwYWNrYWdlcy9mb29iYXIyL3RzL21haW4udHNcXG4gICcgK1xuICAgICdwbGluayBhbmFseXplIC1kIHBhY2thZ2VzL2Zvb2JhcjEvc3JjIC1kIHBhY2thZ2VzL2Zvb2JhcjIvdHMnKSk7XG5cbiAgY29uc3Qgd2F0Y2hDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3dhdGNoJylcbiAgLmRlc2NyaXB0aW9uKCdXYXRjaCBwYWNrYWdlIHNvdXJjZSBjb2RlIGZpbGUgY2hhbmdlcyAoZmlsZXMgcmVmZXJlbmNlZCBpbiAubnBtaWdub3JlIHdpbGwgYmUgaWdub3JlZCkgYW5kIHVwZGF0ZSBQbGluayBzdGF0ZSwgJyArXG4gICdhdXRvbWF0aWNhbGx5IGluc3RhbGwgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5JylcbiAgLmFyZ3VtZW50KCdbcGFja2FnZS4uLl0nLCBjbGlQYWNrYWdlQXJnRGVzYywgW10pXG4gIC5vcHRpb24oJy0tY3AsIC0tY29weSA8ZGlyZWN0b3J5PicsICdjb3B5IHBhY2thZ2UgZmlsZXMgdG8gc3BlY2lmaWMgZGlyZWN0b3J5LCBtaW1pYyBiZWhhdmlvciBvZiBcIm5wbSBpbnN0YWxsIDxwa2c+XCIsIGJ1dCB0aGlzIHdvblxcJ3QgaW5zdGFsbCBkZXBlbmRlbmNpZXMnKVxuICAuYWN0aW9uKChwa2dzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IHtjbGlXYXRjaH0gPSByZXF1aXJlKCcuL2NsaS13YXRjaCcpIGFzIHR5cGVvZiBfY2xpV2F0Y2g7XG4gICAgY2xpV2F0Y2gocGtncywgd2F0Y2hDbWQub3B0cygpKTtcbiAgfSk7XG5cbiAgY29uc3QgdXBkYXRlRGlyQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGRhdGUtZGlyJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biB0aGlzIGNvbW1hbmQgdG8gc3luYyBpbnRlcm5hbCBzdGF0ZSB3aGVuIHdob2xlIHdvcmtzcGFjZSBkaXJlY3RvcnkgaXMgcmVuYW1lZCBvciBtb3ZlZC5cXG4nICtcbiAgICAnQmVjYXVzZSB3ZSBzdG9yZSBhYnNvbHV0ZSBwYXRoIGluZm8gb2YgZWFjaCBwYWNrYWdlIGluIGludGVybmFsIHN0YXRlLCBhbmQgaXQgd2lsbCBiZWNvbWUgaW52YWxpZCBhZnRlciB5b3UgcmVuYW1lIG9yIG1vdmUgZGlyZWN0b3J5JylcbiAgICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuY2hlY2tEaXIodXBkYXRlRGlyQ21kLm9wdHMoKSApO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzcGFjZU9ubHlTdWJDb21tYW5kcyhwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICAvKipcbiAgICogdHNjIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHRzY0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gVHlwZXNjcmlwdCBjb21waWxlciB0byBjb21waWxlIHNvdXJjZSBjb2RlIGZvciB0YXJnZXQgcGFja2FnZXMsICcgK1xuICAgICd3aGljaCBoYXZlIGJlZW4gbGlua2VkIHRvIGN1cnJlbnQgd29yayBkaXJlY3RvcnknLCB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgd2F0Y2ggbW9kZScsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdDb21waWxlIG9ubHkgc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLCAodiwgcHJldikgPT4ge1xuICAgICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC8vIC5vcHRpb24oJy0td3MsLS13b3Jrc3BhY2UgPHdvcmtzcGFjZS1kaXI+JywgJ29ubHkgaW5jbHVkZSB0aG9zZSBsaW5rZWQgcGFja2FnZXMgd2hpY2ggYXJlIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgLy8gICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXRzeCwtLWpzeCcsICdpbmNsdWRlcyBUU1ggZmlsZScsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tZWQsIC0tZW1pdERlY2xhcmF0aW9uT25seScsICdUeXBlc2NyaXB0IGNvbXBpbGVyIG9wdGlvbjogLS1lbWl0RGVjbGFyYXRpb25Pbmx5Llxcbk9ubHkgZW1pdCDigJguZC50c+KAmSBkZWNsYXJhdGlvbiBmaWxlcy4nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXNvdXJjZS1tYXAgPGlubGluZXxmaWxlPicsICdTb3VyY2UgbWFwIHN0eWxlOiBcImlubGluZVwiIG9yIFwiZmlsZVwiJywgJ2lubGluZScpXG4gICAgLm9wdGlvbignLS1tZXJnZSwtLW1lcmdlLXRzY29uZmlnIDxmaWxlPicsICdNZXJnZSBjb21waWxlck9wdGlvbnMgXCJiYXNlVXJsXCIgYW5kIFwicGF0aHNcIiBmcm9tIHNwZWNpZmllZCB0c2NvbmZpZyBmaWxlJylcbiAgICAub3B0aW9uKCctLWNvcGF0aCwgLS1jb21waWxlci1vcHRpb25zLXBhdGhzIDxwYXRoTWFwSnNvbj4nLFxuICAgICAgJ0FkZCBtb3JlIFwicGF0aHNcIiBwcm9wZXJ0eSB0byBjb21waWxlciBvcHRpb25zLiAnICtcbiAgICAgICcoZS5nLiAtLWNvcGF0aCBcXCd7XFxcIkAvKlwiOltcIi9Vc2Vycy93b3JrZXIvb2NlYW4tdWkvc3JjLypcIl19XFwnKScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLm9wdGlvbignLS1jbyA8SlNPTi1zdHJpbmc+JyxcbiAgICAgIGBQYXJ0aWFsIGNvbXBpbGVyIG9wdGlvbnMgdG8gYmUgbWVyZ2VkIChleGNlcHQgXCJiYXNlVXJsXCIpLCBcInBhdGhzXCIgbXVzdCBiZSByZWxhdGl2ZSB0byAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcGxpbmtFbnYud29ya0RpcikgfHwgJ2N1cnJlbnQgZGlyZWN0b3J5J31gKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgY29uc3Qgb3B0ID0gdHNjQ21kLm9wdHMoKTtcbiAgICAgIGNvbnN0IHRzYyA9IGF3YWl0IGltcG9ydCgnLi4vdHMtY21kJyk7XG5cbiAgICAgIGF3YWl0IHRzYy50c2Moe1xuICAgICAgICBwYWNrYWdlOiBwYWNrYWdlcyxcbiAgICAgICAgcHJvamVjdDogb3B0LnByb2plY3QsXG4gICAgICAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgICAgIHNvdXJjZU1hcDogb3B0LnNvdXJjZU1hcCxcbiAgICAgICAganN4OiBvcHQuanN4LFxuICAgICAgICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHksXG4gICAgICAgIHBhdGhzSnNvbnM6IG9wdC5jb21waWxlck9wdGlvbnNQYXRocyxcbiAgICAgICAgbWVyZ2VUc2NvbmZpZzogb3B0Lm1lcmdlVHNjb25maWcsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uczogb3B0LmNvID8gSlNPTi5wYXJzZShvcHQuY28pIDogdW5kZWZpbmVkXG4gICAgICB9KTtcbiAgICB9KTtcblxuICB0c2NDbWQudXNhZ2UodHNjQ21kLnVzYWdlKCkgK1xuICAgICdcXG5JdCBjb21waWxlcyBcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi90cy8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2Rpc3RcIixcXG4nICtcbiAgICAnICBvclxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb20vKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tXCJcXG4gZm9yIGFsbCBAd2ZoIHBhY2thZ2VzLlxcbicgK1xuICAgICdJIHN1Z2dlc3QgdG8gcHV0IE5vZGUuanMgc2lkZSBUUyBjb2RlIGluIGRpcmVjdG9yeSBgdHNgLCBhbmQgaXNvbW9ycGhpYyBUUyBjb2RlIChtZWFuaW5nIGl0IHJ1bnMgaW4gJyArXG4gICAgJ2JvdGggTm9kZS5qcyBhbmQgQnJvd3NlcikgaW4gZGlyZWN0b3J5IGBpc29tYC5cXG5cXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzY1xcbicpICsgJyBDb21waWxlIGxpbmtlZCBwYWNrYWdlcyB0aGF0IGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UgKHlvdSBzaGFsbCBydW4gdGhpcyBjb21tYW5kIG9ubHkgaW4gYSB3b3Jrc3BhY2UgZGlyZWN0b3J5KVxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBwYWNrYWdlcyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyBbcGFja2FnZS4uLl0gLXdcXG4nKSArICcgV2F0Y2ggcGFja2FnZXMgY2hhbmdlIGFuZCBjb21waWxlIHdoZW4gbmV3IHR5cGVzY3JpcHQgZmlsZSBpcyBjaGFuZ2VkIG9yIGNyZWF0ZWRcXG5cXG4nKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ3NldHRpbmcgW3BhY2thZ2VdJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgcGFja2FnZXMgc2V0dGluZyBhbmQgdmFsdWVzJywge3BhY2thZ2U6ICdwYWNrYWdlIG5hbWUsIG9ubHkgbGlzdCBzZXR0aW5nIGZvciBzcGVjaWZpYyBwYWNrYWdlJ30pXG4gICAgLmFjdGlvbihhc3luYyAocGtnTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1zZXR0aW5nJykpLmRlZmF1bHQocGtnTmFtZSk7XG4gICAgfSk7XG4gICAgLyoqIGNvbW1hbmQgcnVuKi9cbiAgY29uc3QgcnVuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHNwZWNpZmljIG1vZHVsZVxcJ3MgZXhwb3J0ZWQgZnVuY3Rpb25cXG4nKVxuICAgIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gICAgfSk7XG5cbiAgcnVuQ21kLnVzYWdlKHJ1bkNtZC51c2FnZSgpICsgJ1xcbicgKyBjaGFsay5ncmVlbigncGxpbmsgcnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dXFxuJykgK1xuICAgIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gLi4vcGFja2FnZXMvZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlLmpzI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICAgJzx0YXJnZXQ+IC0gSlMgb3IgVFMgZmlsZSBtb2R1bGUgcGF0aCB3aGljaCBjYW4gYmUgcmVzb2x2ZWQgYnkgTm9kZS5qcyAodHMtbm9kZSkgZm9sbG93ZWQgYnkgXCIjXCIgYW5kIGV4cG9ydGVkIGZ1bmN0aW9uIG5hbWUsXFxuJyk7XG4gICAgLy8gJ2UuZy4gXFxuJyArXG4gICAgLy8gY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAgIC8vICcsIGZ1bmN0aW9uIGNhbiBiZSBhc3luYyB3aGljaCByZXR1cm5zIFByb21pc2VcXG4nICtcbiAgICAvLyBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICAgLy8gJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG5cbn1cblxuZnVuY3Rpb24gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQsIG92ZXJyaWRlcjogQ29tbWFuZE92ZXJyaWRlcik6IHN0cmluZ1tdIHtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIFtdO1xuICBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgYXZhaWxhYmxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IGRyID0gcGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rO1xuICAgIGlmIChkciA9PSBudWxsIHx8IGRyLmNsaSA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgW3BrZ0ZpbGVQYXRoLCBmdW5jTmFtZV0gPSAoZHIuY2xpIGFzIHN0cmluZykuc3BsaXQoJyMnKTtcblxuICAgIGF2YWlsYWJsZXMucHVzaChway5uYW1lKTtcblxuICAgIHRyeSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShwaywgcGtnRmlsZVBhdGgsIGZ1bmNOYW1lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7KGUgYXMgRXJyb3IpLm1lc3NhZ2V9XCJgLCBlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGF2YWlsYWJsZXM7XG59XG5cbmZ1bmN0aW9uIGFkZE5wbUluc3RhbGxPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLWNhY2hlIDxucG0tY2FjaGU+JywgJ3NhbWUgYXMgbnBtIGluc3RhbGwgb3B0aW9uIFwiLS1jYWNoZVwiJylcbiAgLm9wdGlvbignLS1jaSwgLS11c2UtY2knLCAnVXNlIFwibnBtIGNpXCIgaW5zdGVhZCBvZiBcIm5wbSBpbnN0YWxsXCIgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS1vZmZsaW5lJywgJ3NhbWUgYXMgbnBtIG9wdGlvbiBcIi0tb2ZmbGluZVwiIGR1cmluZyBleGVjdXRpbmcgbnBtIGluc3RhbGwvY2kgJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0teWFybicsICdVc2UgWWFybiB0byBpbnN0YWxsIGNvbXBvbmVudCBwZWVyIGRlcGVuZGVuY2llcyBpbnN0ZWFkIG9mIHVzaW5nIE5QTScsIGZhbHNlKVxuICAub3B0aW9uKCctLXByb2R1Y3Rpb24nLCAnQWRkIFwiLS1wcm9kdWN0aW9uXCIgb3IgXCItLW9ubHk9cHJvZFwiIGNvbW1hbmQgbGluZSBhcmd1bWVudCB0byBcInlhcm4vbnBtIGluc3RhbGxcIicsIGZhbHNlKTtcbn1cblxuZnVuY3Rpb24gY2hlY2tQbGlua1ZlcnNpb24oKSB7XG4gIGNvbnN0IHBranNvbiA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdwYWNrYWdlLmpzb24nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGtqc29uKSkge1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa2pzb24sICd1dGY4JykpIGFzIHtkZXBlbmRlbmNpZXM/OiB7W3A6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH07IGRldkRlcGVuZGVuY2llcz86IHtbcDogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkfX07XG4gICAgbGV0IGRlcFZlciA9IGpzb24uZGVwZW5kZW5jaWVzICYmIGpzb24uZGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ10gfHxcbiAgICAgIGpzb24uZGV2RGVwZW5kZW5jaWVzICYmIGpzb24uZGV2RGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ107XG4gICAgaWYgKGRlcFZlciA9PSBudWxsKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYm94U3RyaW5nKCdEb25cXCd0IGZvcmdldCB0byBhZGQgQHdmaC9wbGluayBpbiBwYWNrYWdlLmpzb24gYXMgZGVwZW5kZW5jaWVzJykpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyLmVuZHNXaXRoKCcudGd6JykpIHtcbiAgICAgIGNvbnN0IG1hdGNoZWQgPSAvLShcXGQrXFwuXFxkK1xcLlteXSs/KVxcLnRneiQvLmV4ZWMoZGVwVmVyKTtcbiAgICAgIGlmIChtYXRjaGVkID09IG51bGwpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGRlcFZlciA9IG1hdGNoZWRbMV07XG4gICAgfVxuICAgIGlmIChkZXBWZXIgJiYgIXNlbXZlci5zYXRpc2ZpZXMocGsudmVyc2lvbiwgZGVwVmVyKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhgTG9jYWwgaW5zdGFsbGVkIFBsaW5rIHZlcnNpb24gJHtjaGFsay5jeWFuKHBrLnZlcnNpb24pfSBkb2VzIG5vdCBtYXRjaCBkZXBlbmRlbmN5IHZlcnNpb24gJHtjaGFsay5ncmVlbihkZXBWZXIpfSBpbiBwYWNrYWdlLmpzb24sIGAgK1xuICAgICAgICBgcnVuIGNvbW1hbmQgXCIke2NoYWxrLmdyZWVuKCdwbGluayB1cGdyYWRlJyl9XCIgdG8gdXBncmFkZSBvciBkb3duZ3JhZGUgdG8gZXhwZWN0ZWQgdmVyc2lvbmApKTtcbiAgICB9XG4gIH1cbn1cblxuIl19