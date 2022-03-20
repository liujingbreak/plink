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
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/// <reference path="./cfont.d.ts" />
/* eslint-disable max-len */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const commander_1 = __importDefault(require("commander"));
const chalk_1 = __importDefault(require("chalk"));
const op = __importStar(require("rxjs/operators"));
const semver_1 = __importDefault(require("semver"));
const log4js_1 = require("log4js");
const pkgMgr = __importStar(require("../package-mgr"));
// import '../tsc-packages-slice';
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const misc_1 = require("../utils/misc");
const package_runner_1 = require("../package-runner");
const override_commander_1 = require("./override-commander");
const utils_1 = require("./utils");
const pk = require('../../../package.json');
// const WIDTH = 130;
const log = (0, log4js_1.getLogger)('plink.cli');
exports.cliPackageArgDesc = 'Single or multiple package names, the "scope" name part can be omitted,' +
    'if the scope name (the part between "@" "/") are listed configuration property "packageScopes"';
async function createCommands(startTime) {
    process.title = 'Plink';
    // const {stateFactory}: typeof store = require('../store');
    await Promise.resolve().then(() => __importStar(require('./cli-slice')));
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
    const initCmd = program.command('init').alias('sync')
        .description('Initialize and update work directory, generate basic configuration files for project and component packages,' +
        ' calculate hoisted transitive dependencies, and run "npm install" in current directory.' +
        ' (All NPM config environment variables will affect dependency installation, see https://docs.npmjs.com/cli/v7/using-npm/config#environment-variables)')
        .argument('[work-directory]', 'A relative or abosolute directory path, use "." to determine current directory,\n  ommitting this argument meaning:\n' +
        '  - If current directory is already a "work directory", update it.\n' +
        '  - If current directory is not a work directory (maybe at repo\'s root directory), update the latest updated work' +
        ' directory.')
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
    const publishCmd = program.command('publish')
        .description('run npm publish')
        .argument('[package...]', exports.cliPackageArgDesc)
        .option('--dir <package directory>', 'publish packages by specifying directories', utils_1.arrayOptionFn, [])
        .option('--pj, --project <project-dir,...>', 'project directories to be looked up for all packages which need to be packed to tarball files', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
    }, [])
        .option('-w,--workspace <workspace-dir>', 'publish packages which are linked as dependency of specific workspaces', utils_1.arrayOptionFn, [])
        .option('--public', 'same as "npm publish" command option "--access public"', true)
        .action(async (packages) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-pack')))).publish(Object.assign(Object.assign({}, publishCmd.opts()), { packages }));
    });
    const analysisCmd = program.command('analyze')
        .alias('analyse')
        .argument('[package...]', 'the name of target source package, the package must be Plink compliant package, this command will only ' +
        'scan special "plink.tsc" source code directory like "ts/" and "isom/" of target package')
        .description('Use Typescript compiler to parse source code, list dependences by DFS algarithm, result information includes' +
        ': cyclic dependecies, unresolvable dependencies, external dependencies, dependencies are not under target directory.')
        .option('-x <regexp>', 'Ingore "module name" that matches specific Regular Experssion', '\\.(less|scss|css)$')
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
        .description('Watch package source file or specific file changes (files referenced in .npmignore will be ignored) and update Plink state, ' +
        'automatically install transitive dependency')
        .argument('[package...]', exports.cliPackageArgDesc, [])
        .option('-a <directory>', 'Use chokidar watch additional directories or files (multiple) for copy, option "--cp" must also be presented', (value, prev) => { prev.push(value); return prev; }, [])
        .option('--include', 'glob pattern append to "-a" option')
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
        '(e.g. --copath \'{"@/*":["/Users/worker/ocean-ui/src/*"]}\')', (v, prev) => {
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
    cmd.option('--yarn, --use-yarn', 'Use Yarn instead of NPM to install dependencies', false)
        .option('--cache <npm-cache>', 'same as npm install option "--cache"')
        .option('--ci, --use-ci', 'Use "npm ci" instead of "npm install" to install dependencies; when "--useYarn" is on, add argument "--immutable"', false)
        .option('--prune', 'Run "npm prune" after installation')
        .option('--ddp, --dedupe', 'Run "npm dedupe" after installation')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMERBQTBEO0FBQzFELHFDQUFxQztBQUNyQyw0QkFBNEI7QUFDNUIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLG1EQUFxQztBQUdyQyxvREFBNEI7QUFDNUIsbUNBQWlDO0FBQ2pDLHVEQUF5QztBQUN6QyxrQ0FBa0M7QUFDbEMsNEVBQXNFO0FBQ3RFLHdDQUF5RjtBQUV6RixzREFBOEQ7QUFDOUQsNkRBQXFFO0FBQ3JFLG1DQUE4QztBQUc5QyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQXNCLENBQUM7QUFDakUscUJBQXFCO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQyxXQUFXLENBQUMsQ0FBQztBQUV0QixRQUFBLGlCQUFpQixHQUFHLHlFQUF5RTtJQUMxRyxnR0FBZ0csQ0FBQztBQUUxRixLQUFLLFVBQVUsY0FBYyxDQUFDLFNBQWlCO0lBQ3BELE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLDREQUE0RDtJQUM1RCx3REFBYSxhQUFhLEdBQUMsQ0FBQztJQUU1QixJQUFJLGFBQW1DLENBQUM7SUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDN0MsV0FBVyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztTQUM5RSxNQUFNLENBQUMsQ0FBQyxJQUFjLEVBQUUsRUFBRTtRQUN6QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGVBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdB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RSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsZUFBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CO2dCQUN4SixnQkFBZ0IsZUFBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsK0NBQStDLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hcmd1bWVudCAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY2ZvbnQuZC50c1wiIC8+XG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG4vLyBpbXBvcnQgJy4uL3RzYy1wYWNrYWdlcy1zbGljZSc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgeyBpc0RyY3BTeW1saW5rLCBzZXh5Rm9udCwgZ2V0Um9vdERpciwgYm94U3RyaW5nLCBwbGlua0VudiB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0ICogYXMgX3N5bWxpbmtzIGZyb20gJy4uL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge0NvbW1hbmRPdmVycmlkZXIsIHdpdGhDd2RPcHRpb259IGZyb20gJy4vb3ZlcnJpZGUtY29tbWFuZGVyJztcbmltcG9ydCB7aGxEZXNjLCBhcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCB7Q2xpT3B0aW9ucyBhcyBUc2NvbmZpZ0NsaU9wdGlvbnN9IGZyb20gJy4vY2xpLXRzY29uZmlnLWhvb2snO1xuaW1wb3J0ICogYXMgX2NsaVdhdGNoIGZyb20gJy4vY2xpLXdhdGNoJztcbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG4vLyBjb25zdCBXSURUSCA9IDEzMDtcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY2xpJyk7XG5cbmV4cG9ydCBjb25zdCBjbGlQYWNrYWdlQXJnRGVzYyA9ICdTaW5nbGUgb3IgbXVsdGlwbGUgcGFja2FnZSBuYW1lcywgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQsJyArXG4naWYgdGhlIHNjb3BlIG5hbWUgKHRoZSBwYXJ0IGJldHdlZW4gXCJAXCIgXCIvXCIpIGFyZSBsaXN0ZWQgY29uZmlndXJhdGlvbiBwcm9wZXJ0eSBcInBhY2thZ2VTY29wZXNcIic7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21tYW5kcyhzdGFydFRpbWU6IG51bWJlcikge1xuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rJztcbiAgLy8gY29uc3Qge3N0YXRlRmFjdG9yeX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gIGF3YWl0IGltcG9ydCgnLi9jbGktc2xpY2UnKTtcblxuICBsZXQgY2xpRXh0ZW5zaW9uczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoJ3BsaW5rJylcbiAgLmRlc2NyaXB0aW9uKGNoYWxrLmN5YW4oJ0EgcGx1Z2dhYmxlIG1vbm9yZXBvIGFuZCBtdWx0aS1yZXBvIG1hbmFnZW1lbnQgdG9vbCcpKVxuICAuYWN0aW9uKChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHByb2dyYW0uaGVscEluZm9ybWF0aW9uKCkpO1xuXG4gICAgaWYgKHdzU3RhdGUgPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd3NEaXJzID0gWy4uLnBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpXTtcbiAgICAgIGlmICh3c0RpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhgTW9yZSBjb21tYW5kcyBhcmUgYXZhaWxhYmxlIGluIHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yaWVzOiBbJHt3c0RpcnMubWFwKGl0ZW0gPT4gY2hhbGsuY3lhbihpdGVtKSkuam9pbignLCAnKX1dXFxuYCArXG4gICAgICAgICAgYFRyeSBjb21tYW5kczpcXG4ke3dzRGlycy5tYXAoZGlyID0+ICcgIHBsaW5rIC0tc3BhY2UgJyArIGRpcikuam9pbignXFxuJyl9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYFxcbnZlcnNpb246ICR7cGsudmVyc2lvbn0gJHtpc0RyY3BTeW1saW5rID8gY2hhbGsueWVsbG93KCcoc3ltbGlua2VkKScpIDogJyd9IGApO1xuICAgIGlmIChjbGlFeHRlbnNpb25zICYmIGNsaUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCAke2NsaUV4dGVuc2lvbnMubGVuZ3RofSBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uYCArXG4gICAgICBgJHtjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDEgPyAncycgOiAnJ306ICR7Y2xpRXh0ZW5zaW9ucy5tYXAocGtnID0+IGNoYWxrLmJsdWUocGtnKSkuam9pbignLCAnKX1gKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnXFxuJywgY2hhbGsuYmdSZWQoJ1BsZWFzZSBkZXRlcm1pbmUgYSBzdWIgY29tbWFuZCBsaXN0ZWQgYWJvdmUnKSk7XG4gICAgY2hlY2tQbGlua1ZlcnNpb24oKTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHByb2Nlc3MuZXhpdCgxKSk7XG4gIH0pO1xuICBwcm9ncmFtLmFkZEhlbHBUZXh0KCdiZWZvcmUnLCBzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICB3aXRoQ3dkT3B0aW9uKHByb2dyYW0pO1xuXG4gIHByb2dyYW0udmVyc2lvbihway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xuICBwcm9ncmFtLmFkZEhlbHBDb21tYW5kKCdoZWxwIFtjb21tYW5kXScsICdzaG93IGhlbHAgaW5mb3JtYXRpb24sIHNhbWUgYXMgXCItaFwiLiAnKTtcblxuICBjb25zdCBvdmVycmlkZXIgPSBuZXcgQ29tbWFuZE92ZXJyaWRlcihwcm9ncmFtKTtcbiAgbGV0IHdzU3RhdGU6IHBrZ01nci5Xb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcblxuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfU0FGRSAhPT0gJ3RydWUnKSB7XG4gICAgY29uc3Qge2dldFN0YXRlOiBnZXRQa2dTdGF0ZSwgd29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIHBrZ01ncjtcbiAgICB3c1N0YXRlID0gZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0RpcikpO1xuICAgIGlmICh3c1N0YXRlICE9IG51bGwpIHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHByb2dyYW0gPT4ge1xuICAgICAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHN0ciA9PiBjaGFsay5ncmVlbihzdHIpO1xuICAgICAgICBzcGFjZU9ubHlTdWJDb21tYW5kcyhwcm9ncmFtKTtcbiAgICAgICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHN1YkNvbWFuZHMocHJvZ3JhbSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgc3ViQ29tYW5kcyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHN1YkNvbWFuZHMpO1xuICB9XG5cbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gc3RyID0+IGNoYWxrLmN5YW4oc3RyKTtcbiAgICBjbGlFeHRlbnNpb25zID0gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbSwgd3NTdGF0ZSwgb3ZlcnJpZGVyKTtcbiAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdWYWx1ZSBvZiBlbnZpcm9ubWVudCB2YXJhaWJsZSBcIlBMSU5LX1NBRkVcIiBpcyB0cnVlLCBza2lwIGxvYWRpbmcgZXh0ZW5zaW9uJyk7XG4gIH1cblxuICBvdmVycmlkZXIuYXBwZW5kR2xvYmFsT3B0aW9ucyhmYWxzZSk7XG4gIHRyeSB7XG4gICAgYXdhaXQgcHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndiwge2Zyb206ICdub2RlJ30pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gZXhlY3V0ZSBjb21tYW5kIGR1ZSB0bzogJyArIGNoYWxrLnJlZEJyaWdodCgoZSBhcyBFcnJvcikubWVzc2FnZSksIGUpO1xuICAgIGlmICgoZSBhcyBFcnJvcikuc3RhY2spIHtcbiAgICAgIGxvZy5lcnJvcigoZSBhcyBFcnJvcikuc3RhY2spO1xuICAgIH1cbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cblxubGV0IHNraXBWZXJzaW9uQ2hlY2sgPSBmYWxzZTtcblxuZnVuY3Rpb24gc3ViQ29tYW5kcyhwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBwcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgKCkgPT4ge1xuICAgIGlmIChza2lwVmVyc2lvbkNoZWNrKVxuICAgICAgcmV0dXJuO1xuICAgIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICAgIGlmIChwcm9jZXNzLnNlbmQgPT0gbnVsbCkge1xuICAgICAgLy8gcHJvY2VzcyBpcyBub3QgYSBmb3JrZWQgY2hpbGQgcHJvY2Vzc1xuICAgICAgY2hlY2tQbGlua1ZlcnNpb24oKTtcbiAgICB9XG4gIH0pO1xuICAvKiogY29tbWFuZCBpbml0XG4gICAqL1xuICBjb25zdCBpbml0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdpbml0JykuYWxpYXMoJ3N5bmMnKVxuICAgIC5kZXNjcmlwdGlvbignSW5pdGlhbGl6ZSBhbmQgdXBkYXRlIHdvcmsgZGlyZWN0b3J5LCBnZW5lcmF0ZSBiYXNpYyBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBwcm9qZWN0IGFuZCBjb21wb25lbnQgcGFja2FnZXMsJyArXG4gICAgICAnIGNhbGN1bGF0ZSBob2lzdGVkIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzLCBhbmQgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBjdXJyZW50IGRpcmVjdG9yeS4nICtcbiAgICAgICcgKEFsbCBOUE0gY29uZmlnIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aWxsIGFmZmVjdCBkZXBlbmRlbmN5IGluc3RhbGxhdGlvbiwgc2VlIGh0dHBzOi8vZG9jcy5ucG1qcy5jb20vY2xpL3Y3L3VzaW5nLW5wbS9jb25maWcjZW52aXJvbm1lbnQtdmFyaWFibGVzKScpXG4gICAgLmFyZ3VtZW50KCdbd29yay1kaXJlY3RvcnldJywgJ0EgcmVsYXRpdmUgb3IgYWJvc29sdXRlIGRpcmVjdG9yeSBwYXRoLCB1c2UgXCIuXCIgdG8gZGV0ZXJtaW5lIGN1cnJlbnQgZGlyZWN0b3J5LFxcbiAgb21taXR0aW5nIHRoaXMgYXJndW1lbnQgbWVhbmluZzpcXG4nICtcbiAgICAnICAtIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIGFscmVhZHkgYSBcIndvcmsgZGlyZWN0b3J5XCIsIHVwZGF0ZSBpdC5cXG4nICtcbiAgICAnICAtIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgZGlyZWN0b3J5IChtYXliZSBhdCByZXBvXFwncyByb290IGRpcmVjdG9yeSksIHVwZGF0ZSB0aGUgbGF0ZXN0IHVwZGF0ZWQgd29yaycgK1xuICAgICcgZGlyZWN0b3J5LicpXG4gICAgLm9wdGlvbignLWYsIC0tZm9yY2UnLCAnRm9yY2UgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5LCB0aGlzIGlzIG5vdCBzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi1mXCIgJywgZmFsc2UpXG4gICAgLy8gLm9wdGlvbignLS1saW50LWhvb2ssIC0tbGgnLCAnQ3JlYXRlIGEgZ2l0IHB1c2ggaG9vayBmb3IgY29kZSBsaW50JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlPzogc3RyaW5nKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWluaXQnKSkuZGVmYXVsdChpbml0Q21kLm9wdHMoKSAsIHdvcmtzcGFjZSk7XG4gICAgfSk7XG4gIGFkZE5wbUluc3RhbGxPcHRpb24oaW5pdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcHJvamVjdFxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdwcm9qZWN0IFthZGR8cmVtb3ZlXSBbZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZnJvbSBhc3NvY2lhdGVkIHByb2plY3RzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgQXNzb2NpYXRlIHRvIGEgcHJvamVjdCBvciBEaXNhc3NvY2lhdGUgZnJvbSBhIHByb2plY3QnLFxuICAgICAgICBkaXI6ICdTcGVjaWZ5IHRhcmdldCBwcm9qZWN0IHJlcG8gZGlyZWN0b3J5IChhYnNvbHV0ZSBwYXRoIG9yIHJlbGF0aXZlIHBhdGggdG8gY3VycmVudCBkaXJlY3RvcnkpJyArXG4gICAgICAgICAgJywgc3BlY2lmeSBtdWx0aXBsZSBwcm9qZWN0IGJ5IHNlcGVyYXRpbmcgdGhlbSB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJyB8ICdyZW1vdmUnIHwgdW5kZWZpbmVkLCBwcm9qZWN0RGlyOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiBmYWxzZX0sIGFjdGlvbiwgcHJvamVjdERpcik7XG4gICAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzcmMgW2FkZHxyZW1vdmVdIFtkaXIuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3Qgc291cmNlIGRpcmVjdG9yaWVzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZm9yIHBhY2thZ2VzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgYXNzb2NpYXRlIHRvIGEgZGlyZWN0b3J5IG9yIGRpc2Fzc29jaWF0ZSBmcm9tIGEgZGlyZWN0b3J5JyxcbiAgICAgICAgZGlyOiAnc3BlY2lmeSBtdWx0aXBsZSBkaXJlY3RvcmllcyBieSBzZXBlcmF0aW5nIHRoZW0gd2l0aCBzcGFjZSBjaGFyYWN0ZXInXG4gICAgICB9KVxuICAgICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJyB8ICdyZW1vdmUnIHwgdW5kZWZpbmVkLCBkaXJzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiB0cnVlfSwgYWN0aW9uLCBkaXJzKTtcbiAgICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIC8vIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgLy8gICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJywge1xuICAvLyAgICAgcGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2NcbiAgLy8gICB9KVxuICAvLyAgIC5vcHRpb24oJy0tcGogPHByb2plY3QxLHByb2plY3QyLi4uPicsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLy8gICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAvLyAgIC5hY3Rpb24oYXN5bmMgcGFja2FnZXMgPT4ge1xuICAvLyAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICAvLyAgIH0pO1xuXG4gIC8vIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgLy8gICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gIC8vICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY3MnKS5hbGlhcygnY2xlYXItc3ltbGlua3MnKVxuICAgIC5kZXNjcmlwdGlvbignQ2xlYXIgc3ltbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAgIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2Nhbk5vZGVNb2R1bGVzID0gKHJlcXVpcmUoJy4uL3V0aWxzL3N5bWxpbmtzJykgYXMgdHlwZW9mIF9zeW1saW5rcykuZGVmYXVsdDtcbiAgICAgIGNvbnN0IGVkaXRvciA9IGF3YWl0IGltcG9ydCgnLi4vZWRpdG9yLWhlbHBlcicpO1xuICAgICAgZWRpdG9yLmRpc3BhdGNoZXIuY2xlYXJTeW1saW5rcygpO1xuICAgICAgYXdhaXQgZWRpdG9yLmdldEFjdGlvbiQoJ2NsZWFyU3ltbGlua3NEb25lJykucGlwZShvcC50YWtlKDEpKS50b1Byb21pc2UoKTtcbiAgICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcyh1bmRlZmluZWQsICdhbGwnKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCB1cGdyYWRlXG4gICAqL1xuICBjb25zdCB1cGdyYWRlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGdyYWRlJylcbiAgICAuYWxpYXMoJ2luc3RhbGwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVpbnN0YWxsIGxvY2FsIFBsaW5rIGFsb25nIHdpdGggb3RoZXIgZGVwZW5kZW5jaWVzLicgK1xuICAgICAgJyBVbmxpa2UgXCJucG0gaW5zdGFsbFwiIHdoaWNoIGRvZXMgbm90IHdvcmsgd2l0aCBub2RlX21vZHVsZXMgdGhhdCBtaWdodCBjb250YWluIHN5bWxpbmtzLicgK1xuICAgICAgJyAoQWxsIE5QTSBjb25maWcgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdpbGwgYWZmZWN0IGRlcGVuZGVuY3kgaW5zdGFsbGF0aW9uLCBzZWUgaHR0cHM6Ly9kb2NzLm5wbWpzLmNvbS9jbGkvdjcvdXNpbmctbnBtL2NvbmZpZyNlbnZpcm9ubWVudC12YXJpYWJsZXMpJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGluay1wbGluaycpKS5yZWluc3RhbGxXaXRoTGlua2VkUGxpbmsodXBncmFkZUNtZC5vcHRzKCkgKTtcbiAgICB9KTtcbiAgYWRkTnBtSW5zdGFsbE9wdGlvbih1cGdyYWRlQ21kKTtcbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdkb2NrZXJpemUgPHdvcmtzcGFjZS1kaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKGNoYWxrLmdyYXkoJ1tUQkldIEdlbmVyYXRlIERvY2tlcmZpbGUgZm9yIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnksIGFuZCBnZW5lcmF0ZSBkb2NrZXIgaW1hZ2UnKSk7XG5cbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdwa2cgPHdvcmtzcGFjZS1kaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKGNoYWxrLmdyYXkoJ1tUQkldIFVzZSBQa2cgKGh0dHBzOi8vZ2l0aHViLmNvbS92ZXJjZWwvcGtnKSB0byBwYWNrYWdlIE5vZGUuanMgcHJvamVjdCBpbnRvIGFuIGV4ZWN1dGFibGUgJykpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxzXG4gICAqL1xuICBjb25zdCBsaXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdscycpLmFsaWFzKCdsaXN0JylcbiAgICAub3B0aW9uKCctaiwgLS1qc29uJywgJ2xpc3QgbGlua2VkIGRlcGVuZGVuY2llcyBpbiBmb3JtIG9mIEpTT04nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWhvaXN0JywgJ2xpc3QgaG9pc3RlZCB0cmFuc2l0aXZlIERlcGVuZGVuY3kgaW5mb3JtYXRpb24nLCBmYWxzZSlcbiAgICAuZGVzY3JpcHRpb24oJ0lmIHlvdSB3YW50IHRvIGtub3cgaG93IG1hbnkgcGFja2FnZXMgd2lsbCBhY3R1YWxseSBydW4sIHRoaXMgY29tbWFuZCBwcmludHMgb3V0IGEgbGlzdCBhbmQgdGhlIHByaW9yaXRpZXMsIGluY2x1ZGluZyBpbnN0YWxsZWQgcGFja2FnZXMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuZGVmYXVsdChsaXN0Q21kLm9wdHMoKSApO1xuICAgIH0pO1xuXG4gIGNvbnN0IGFkZENtZCA9IHByb2dyYW0uY29tbWFuZCgnYWRkIDxkZXBlbmRlbmN5Li4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdBZGQgZGVwZW5kZW5jeSB0byBwYWNrYWdlLmpzb24gZmlsZSwgd2l0aCBvcHRpb24gXCItLWRldlwiIHRvIGFkZCBhcyBcImRldkRlcGVuZGVuY2llc1wiLCAnICtcbiAgICAgICd3aXRob3V0IG9wdGlvbiBcIi0tdG9cIiB0aGlzIGNvbW1hbmQgYWRkcyBkZXBlbmRlbmN5IHRvIGN1cnJlbnQgd29ya3RyZWUgc3BhY2VcXCdzIHBhY2thZ2UuanNvbiBmaWxlJyxcbiAgICAgIHtcbiAgICAgICAgZGVwZW5kZW5jeTogJ2RlcGVuZGVuY3kgcGFja2FnZSBuYW1lIGluIGZvcm0gb2YgXCI8YSBsaW5rZWQgcGFja2FnZSBuYW1lIHdpdGhvdXQgc2NvcGUgcGFydD5cIiwgXCI8cGFja2FnZSBuYW1lPkA8dmVyc2lvbj5cIiwgJ1xuICAgICAgfSlcbiAgICAub3B0aW9uKCctLXRvIDxwa2cgbmFtZSB8IHdvcmt0cmVlIGRpciB8IHBrZyBkaXI+JywgJ2FkZCBkZXBlbmRlbmN5IHRvIHRoZSBwYWNrYWdlLmpzb24gb2Ygc3BlY2lmaWMgbGlua2VkIHNvdXJjZSBwYWNrYWdlIGJ5IG5hbWUgb3IgZGlyZWN0b3J5LCBvciBhIHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yeScpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hZGQtcGFja2FnZScpKS5hZGREZXBlbmRlbmN5VG8ocGFja2FnZXMsIGFkZENtZC5vcHRzKCkudG8sIGFkZENtZC5vcHRzKCkuZGV2KTtcbiAgICB9KTtcblxuICBjb25zdCB0c2NvbmZpZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjb25maWcnKVxuICAgIC5kZXNjcmlwdGlvbignTGlzdCB0c2NvbmZpZy5qc29uLCBqc2NvbmZpZy5qc29uIGZpbGVzIHdoaWNoIHdpbGwgYmUgdXBkYXRlZCBhdXRvbWF0aWNhbGx5IGJ5IFBsaW5rLCAoYSBtb25vcmVwbyBtZWFucyB0aGVyZSBhcmUgbm9kZSBwYWNrYWdlcyB3aGljaCBhcmUgc3ltbGlua2VkIGZyb20gcmVhbCBzb3VyY2UgY29kZSBkaXJlY3RvcnknICtcbiAgICAgICcsIGlmIHlvdSBoYXZlIGN1c3RvbWl6ZWQgdHNjb25maWcuanNvbiBmaWxlLCB0aGlzIGNvbW1hbmQgaGVscHMgdG8gdXBkYXRlIFwiY29tcGlsZXJPcHRpb25zLnBhdGhzXCIgcHJvcGVydGllcyknKVxuICAgIC5vcHRpb24oJy0taG9vayA8ZmlsZT4nLCAnYWRkIHRzY29uZmlnL2pzY29uZmlnIGZpbGUgdG8gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXVuaG9vayA8ZmlsZT4nLCAncmVtb3ZlIHRzY29uZmlnL2pzY29uZmlnIGZpbGUgZnJvbSBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tY2xlYXIsLS11bmhvb2stYWxsJywgJ3JlbW92ZSBhbGwgdHNjb25maWcgZmlsZXMgZnJvbSBmcm9tIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS10c2NvbmZpZy1ob29rJykpLmRvVHNjb25maWcodHNjb25maWdDbWQub3B0cygpICk7XG4gICAgfSk7XG5cbiAgLyoqXG4gICAqIEJ1bXAgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgYnVtcENtZCA9IHByb2dyYW0uY29tbWFuZCgnYnVtcCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignYnVtcCBwYWNrYWdlLmpzb24gdmVyc2lvbiBudW1iZXIgZm9yIHNwZWNpZmljIHBhY2thZ2UsIHNhbWUgYXMgXCJucG0gdmVyc2lvblwiIGRvZXMnLFxuICAgICAge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ29ubHkgYnVtcCBjb21wb25lbnQgcGFja2FnZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpO1xuICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY3JlLXZlcnNpb24gPHZhbHVlPicsXG4gICAgICAndmVyc2lvbiBpbmNyZW1lbnQsIHZhbGlkIHZhbHVlcyBhcmU6IG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UnLCAncGF0Y2gnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktYnVtcCcpKS5kZWZhdWx0KHsuLi5idW1wQ21kLm9wdHMoKSAsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKGJ1bXBDbWQpO1xuICAvLyBidW1wQ21kLnVzYWdlKGJ1bXBDbWQudXNhZ2UoKSArICdcXG4nICsgaGwoJ3BsaW5rIGJ1bXAgPHBhY2thZ2U+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gIC8vICAgaGwoJ3BsaW5rIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzIGFuZCBjaGFuZ2UgdmVyc2lvbiB2YWx1ZSBmcm9tIHJlbGF0ZWQgcGFja2FnZS5qc29uJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3BhY2sgcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwYWNrIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXI+JyxcbiAgICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS10YXItZGlyIDxkaXI+JywgJ2RpcmVjdG9yeSB0byBzYXZlIHRhciBmaWxlcycsIFBhdGguam9pbihnZXRSb290RGlyKCksICd0YXJiYWxscycpKVxuICAgIC5vcHRpb24oJy0tamYsIC0tanNvbi1maWxlIDxwa2ctanNvbi1maWxlPicsICd0aGUgcGFja2FnZS5qc29uIGZpbGUgaW4gd2hpY2ggXCJkZXZEZXBlbmRlbmNpZXNcIiwgXCJkZXBlbmRlbmNpZXNcIiBzaG91bGQgdG8gYmUgY2hhbmdlZCBhY2NvcmRpbmcgdG8gcGFja2VkIGZpbGUsICcgK1xuICAgICAgJ2J5IGRlZmF1bHQgcGFja2FnZS5qc29uIGZpbGVzIGluIGFsbCB3b3JrIHNwYWNlcyB3aWxsIGJlIGNoZWNrZWQgYW5kIGNoYW5nZWQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktcGFjaycpKS5wYWNrKHsuLi5wYWNrQ21kLm9wdHMoKSAsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKHBhY2tDbWQpO1xuICBwYWNrQ21kLnVzYWdlKHBhY2tDbWQudXNhZ2UoKSArICdcXG5CeSBkZWZhdWx0LCBydW4gXCJucG0gcGFja1wiIGZvciBlYWNoIGxpbmtlZCBwYWNrYWdlIHdoaWNoIGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UnKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwdWJsaXNoQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwdWJsaXNoJylcbiAgICAuZGVzY3JpcHRpb24oJ3J1biBucG0gcHVibGlzaCcpXG4gICAgLmFyZ3VtZW50KCdbcGFja2FnZS4uLl0nLCBjbGlQYWNrYWdlQXJnRGVzYylcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3B1Ymxpc2ggcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLFxuICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncHVibGlzaCBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXB1YmxpYycsICdzYW1lIGFzIFwibnBtIHB1Ymxpc2hcIiBjb21tYW5kIG9wdGlvbiBcIi0tYWNjZXNzIHB1YmxpY1wiJywgdHJ1ZSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucHVibGlzaCh7Li4ucHVibGlzaENtZC5vcHRzKCkgLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuXG5cbiAgY29uc3QgYW5hbHlzaXNDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FuYWx5emUnKVxuICAgIC5hbGlhcygnYW5hbHlzZScpXG4gICAgLmFyZ3VtZW50KCdbcGFja2FnZS4uLl0nLCAndGhlIG5hbWUgb2YgdGFyZ2V0IHNvdXJjZSBwYWNrYWdlLCB0aGUgcGFja2FnZSBtdXN0IGJlIFBsaW5rIGNvbXBsaWFudCBwYWNrYWdlLCB0aGlzIGNvbW1hbmQgd2lsbCBvbmx5ICcgK1xuICAgICAgJ3NjYW4gc3BlY2lhbCBcInBsaW5rLnRzY1wiIHNvdXJjZSBjb2RlIGRpcmVjdG9yeSBsaWtlIFwidHMvXCIgYW5kIFwiaXNvbS9cIiBvZiB0YXJnZXQgcGFja2FnZScpXG4gICAgLmRlc2NyaXB0aW9uKCdVc2UgVHlwZXNjcmlwdCBjb21waWxlciB0byBwYXJzZSBzb3VyY2UgY29kZSwgbGlzdCBkZXBlbmRlbmNlcyBieSBERlMgYWxnYXJpdGhtLCByZXN1bHQgaW5mb3JtYXRpb24gaW5jbHVkZXMnICtcbiAgICAgICc6IGN5Y2xpYyBkZXBlbmRlY2llcywgdW5yZXNvbHZhYmxlIGRlcGVuZGVuY2llcywgZXh0ZXJuYWwgZGVwZW5kZW5jaWVzLCBkZXBlbmRlbmNpZXMgYXJlIG5vdCB1bmRlciB0YXJnZXQgZGlyZWN0b3J5LicpXG4gICAgLm9wdGlvbignLXggPHJlZ2V4cD4nLCAnSW5nb3JlIFwibW9kdWxlIG5hbWVcIiB0aGF0IG1hdGNoZXMgc3BlY2lmaWMgUmVndWxhciBFeHBlcnNzaW9uJywgJ1xcXFwuKGxlc3N8c2Nzc3xjc3MpJCcpXG4gICAgLm9wdGlvbignLWQsIC0tZGlyIDxkaXJlY3Rvcnk+JyxcbiAgICAgICcobXVsdGlwbGUpIGRldGVybWluZSB0YXJnZXQgZGlyZWN0b3J5LCBzY2FuIEpTL0pTWC9UUy9UU1ggZmlsZXMgdW5kZXIgdGFyZ2V0IGRpcmVjdG9yeScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy1mLCAtLWZpbGUgPGZpbGU+JyxcbiAgICAgICcobXVsdGlwbGUpIGRldGVybWluZSB0YXJnZXQgVFMvSlMoWCkgZmlsZXMgKG11bHRpcGxlIGZpbGUgd2l0aCBtb3JlIG9wdGlvbnMgXCItZiA8ZmlsZT4gLWYgPGdsb2I+XCIpJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLWonLCAnU2hvdyByZXN1bHQgaW4gSlNPTicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tdHNjb25maWcgPGZpbGU+JywgJ1VzZSBcImNvbXBpbGVyT3B0aW9ucy5wYXRoc1wiIHByb3BlcnR5IHRvIHJlc29sdmUgdHMvanMgZmlsZSBtb2R1bGUnKVxuICAgIC5vcHRpb24oJy0tYWxpYXMgPGFsaWFzLWV4cHJlc3M+JywgJ211bHRpcGxlIEpTT04gZXhwcmVzcywgZS5nLiAtLWFsaWFzIFxcJ1wiXkAvKC4rKSRcIixcInNyYy8kMVwiXFwnJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi9jbGktYW5hbHl6ZScpKS5kZWZhdWx0KHBhY2thZ2VzLCBhbmFseXNpc0NtZC5vcHRzKCkpO1xuICAgIH0pO1xuXG4gIGFuYWx5c2lzQ21kLnVzYWdlKGFuYWx5c2lzQ21kLnVzYWdlKCkgKyAnXFxuJyArXG4gICAgJ2UuZy5cXG4gICcgKyBjaGFsay5ibHVlKCdwbGluayBhbmFseXplIC1mIFwicGFja2FnZXMvZm9vYmFyMS8qKi8qXCIgLWYgcGFja2FnZXMvZm9vYmFyMi90cy9tYWluLnRzXFxuICAnICtcbiAgICAncGxpbmsgYW5hbHl6ZSAtZCBwYWNrYWdlcy9mb29iYXIxL3NyYyAtZCBwYWNrYWdlcy9mb29iYXIyL3RzJykpO1xuXG4gIGNvbnN0IHdhdGNoQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd3YXRjaCcpXG4gIC5kZXNjcmlwdGlvbignV2F0Y2ggcGFja2FnZSBzb3VyY2UgZmlsZSBvciBzcGVjaWZpYyBmaWxlIGNoYW5nZXMgKGZpbGVzIHJlZmVyZW5jZWQgaW4gLm5wbWlnbm9yZSB3aWxsIGJlIGlnbm9yZWQpIGFuZCB1cGRhdGUgUGxpbmsgc3RhdGUsICcgK1xuICAnYXV0b21hdGljYWxseSBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeScpXG4gIC5hcmd1bWVudCgnW3BhY2thZ2UuLi5dJywgY2xpUGFja2FnZUFyZ0Rlc2MsIFtdKVxuICAub3B0aW9uKCctYSA8ZGlyZWN0b3J5PicsICdVc2UgY2hva2lkYXIgd2F0Y2ggYWRkaXRpb25hbCBkaXJlY3RvcmllcyBvciBmaWxlcyAobXVsdGlwbGUpIGZvciBjb3B5LCBvcHRpb24gXCItLWNwXCIgbXVzdCBhbHNvIGJlIHByZXNlbnRlZCcsXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7cHJldi5wdXNoKHZhbHVlKTsgcmV0dXJuIHByZXY7IH0sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLWluY2x1ZGUnLCAnZ2xvYiBwYXR0ZXJuIGFwcGVuZCB0byBcIi1hXCIgb3B0aW9uJylcbiAgLm9wdGlvbignLS1jcCwgLS1jb3B5IDxkaXJlY3Rvcnk+JywgJ2NvcHkgcGFja2FnZSBmaWxlcyB0byBzcGVjaWZpYyBkaXJlY3RvcnksIG1pbWljIGJlaGF2aW9yIG9mIFwibnBtIGluc3RhbGwgPHBrZz5cIiwgYnV0IHRoaXMgd29uXFwndCBpbnN0YWxsIGRlcGVuZGVuY2llcycpXG4gIC5hY3Rpb24oKHBrZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgY29uc3Qge2NsaVdhdGNofSA9IHJlcXVpcmUoJy4vY2xpLXdhdGNoJykgYXMgdHlwZW9mIF9jbGlXYXRjaDtcbiAgICBjbGlXYXRjaChwa2dzLCB3YXRjaENtZC5vcHRzKCkpO1xuICB9KTtcblxuICBjb25zdCB1cGRhdGVEaXJDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3VwZGF0ZS1kaXInKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHRoaXMgY29tbWFuZCB0byBzeW5jIGludGVybmFsIHN0YXRlIHdoZW4gd2hvbGUgd29ya3NwYWNlIGRpcmVjdG9yeSBpcyByZW5hbWVkIG9yIG1vdmVkLlxcbicgK1xuICAgICdCZWNhdXNlIHdlIHN0b3JlIGFic29sdXRlIHBhdGggaW5mbyBvZiBlYWNoIHBhY2thZ2UgaW4gaW50ZXJuYWwgc3RhdGUsIGFuZCBpdCB3aWxsIGJlY29tZSBpbnZhbGlkIGFmdGVyIHlvdSByZW5hbWUgb3IgbW92ZSBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZTogc3RyaW5nKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5jaGVja0Rpcih1cGRhdGVEaXJDbWQub3B0cygpICk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIGNvbXBpbGUgc291cmNlIGNvZGUgZm9yIHRhcmdldCBwYWNrYWdlcywgJyArXG4gICAgJ3doaWNoIGhhdmUgYmVlbiBsaW5rZWQgdG8gY3VycmVudCB3b3JrIGRpcmVjdG9yeScsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnVHlwZXNjcmlwdCBjb21waWxlciB3YXRjaCBtb2RlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLy8gLm9wdGlvbignLS13cywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAnb25seSBpbmNsdWRlIHRob3NlIGxpbmtlZCBwYWNrYWdlcyB3aGljaCBhcmUgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAvLyAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdHN4LC0tanN4JywgJ2luY2x1ZGVzIFRTWCBmaWxlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tc291cmNlLW1hcCA8aW5saW5lfGZpbGU+JywgJ1NvdXJjZSBtYXAgc3R5bGU6IFwiaW5saW5lXCIgb3IgXCJmaWxlXCInLCAnaW5saW5lJylcbiAgICAub3B0aW9uKCctLW1lcmdlLC0tbWVyZ2UtdHNjb25maWcgPGZpbGU+JywgJ01lcmdlIGNvbXBpbGVyT3B0aW9ucyBcImJhc2VVcmxcIiBhbmQgXCJwYXRoc1wiIGZyb20gc3BlY2lmaWVkIHRzY29uZmlnIGZpbGUnKVxuICAgIC5vcHRpb24oJy0tY29wYXRoLCAtLWNvbXBpbGVyLW9wdGlvbnMtcGF0aHMgPHBhdGhNYXBKc29uPicsXG4gICAgICAnQWRkIG1vcmUgXCJwYXRoc1wiIHByb3BlcnR5IHRvIGNvbXBpbGVyIG9wdGlvbnMuICcgK1xuICAgICAgJyhlLmcuIC0tY29wYXRoIFxcJ3tcIkAvKlwiOltcIi9Vc2Vycy93b3JrZXIvb2NlYW4tdWkvc3JjLypcIl19XFwnKScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLm9wdGlvbignLS1jbyA8SlNPTi1zdHJpbmc+JyxcbiAgICAgIGBQYXJ0aWFsIGNvbXBpbGVyIG9wdGlvbnMgdG8gYmUgbWVyZ2VkIChleGNlcHQgXCJiYXNlVXJsXCIpLCBcInBhdGhzXCIgbXVzdCBiZSByZWxhdGl2ZSB0byAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcGxpbmtFbnYud29ya0RpcikgfHwgJ2N1cnJlbnQgZGlyZWN0b3J5J31gKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgY29uc3Qgb3B0ID0gdHNjQ21kLm9wdHMoKTtcbiAgICAgIGNvbnN0IHRzYyA9IGF3YWl0IGltcG9ydCgnLi4vdHMtY21kJyk7XG5cbiAgICAgIGF3YWl0IHRzYy50c2Moe1xuICAgICAgICBwYWNrYWdlOiBwYWNrYWdlcyxcbiAgICAgICAgcHJvamVjdDogb3B0LnByb2plY3QsXG4gICAgICAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgICAgIHNvdXJjZU1hcDogb3B0LnNvdXJjZU1hcCxcbiAgICAgICAganN4OiBvcHQuanN4LFxuICAgICAgICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHksXG4gICAgICAgIHBhdGhzSnNvbnM6IG9wdC5jb21waWxlck9wdGlvbnNQYXRocyxcbiAgICAgICAgbWVyZ2VUc2NvbmZpZzogb3B0Lm1lcmdlVHNjb25maWcsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uczogb3B0LmNvID8gSlNPTi5wYXJzZShvcHQuY28pIDogdW5kZWZpbmVkXG4gICAgICB9KTtcbiAgICB9KTtcblxuICB0c2NDbWQudXNhZ2UodHNjQ21kLnVzYWdlKCkgK1xuICAgICdcXG5JdCBjb21waWxlcyBcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi90cy8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2Rpc3RcIixcXG4nICtcbiAgICAnICBvclxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb20vKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tXCJcXG4gZm9yIGFsbCBAd2ZoIHBhY2thZ2VzLlxcbicgK1xuICAgICdJIHN1Z2dlc3QgdG8gcHV0IE5vZGUuanMgc2lkZSBUUyBjb2RlIGluIGRpcmVjdG9yeSBgdHNgLCBhbmQgaXNvbW9ycGhpYyBUUyBjb2RlIChtZWFuaW5nIGl0IHJ1bnMgaW4gJyArXG4gICAgJ2JvdGggTm9kZS5qcyBhbmQgQnJvd3NlcikgaW4gZGlyZWN0b3J5IGBpc29tYC5cXG5cXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzY1xcbicpICsgJyBDb21waWxlIGxpbmtlZCBwYWNrYWdlcyB0aGF0IGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UgKHlvdSBzaGFsbCBydW4gdGhpcyBjb21tYW5kIG9ubHkgaW4gYSB3b3Jrc3BhY2UgZGlyZWN0b3J5KVxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBwYWNrYWdlcyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyBbcGFja2FnZS4uLl0gLXdcXG4nKSArICcgV2F0Y2ggcGFja2FnZXMgY2hhbmdlIGFuZCBjb21waWxlIHdoZW4gbmV3IHR5cGVzY3JpcHQgZmlsZSBpcyBjaGFuZ2VkIG9yIGNyZWF0ZWRcXG5cXG4nKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ3NldHRpbmcgW3BhY2thZ2VdJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgcGFja2FnZXMgc2V0dGluZyBhbmQgdmFsdWVzJywge3BhY2thZ2U6ICdwYWNrYWdlIG5hbWUsIG9ubHkgbGlzdCBzZXR0aW5nIGZvciBzcGVjaWZpYyBwYWNrYWdlJ30pXG4gICAgLmFjdGlvbihhc3luYyAocGtnTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1zZXR0aW5nJykpLmRlZmF1bHQocGtnTmFtZSk7XG4gICAgfSk7XG4gICAgLyoqIGNvbW1hbmQgcnVuKi9cbiAgY29uc3QgcnVuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHNwZWNpZmljIG1vZHVsZVxcJ3MgZXhwb3J0ZWQgZnVuY3Rpb25cXG4nKVxuICAgIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gICAgfSk7XG5cbiAgcnVuQ21kLnVzYWdlKHJ1bkNtZC51c2FnZSgpICsgJ1xcbicgKyBjaGFsay5ncmVlbigncGxpbmsgcnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dXFxuJykgK1xuICAgIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gLi4vcGFja2FnZXMvZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlLmpzI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICAgJzx0YXJnZXQ+IC0gSlMgb3IgVFMgZmlsZSBtb2R1bGUgcGF0aCB3aGljaCBjYW4gYmUgcmVzb2x2ZWQgYnkgTm9kZS5qcyAodHMtbm9kZSkgZm9sbG93ZWQgYnkgXCIjXCIgYW5kIGV4cG9ydGVkIGZ1bmN0aW9uIG5hbWUsXFxuJyk7XG4gICAgLy8gJ2UuZy4gXFxuJyArXG4gICAgLy8gY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAgIC8vICcsIGZ1bmN0aW9uIGNhbiBiZSBhc3luYyB3aGljaCByZXR1cm5zIFByb21pc2VcXG4nICtcbiAgICAvLyBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICAgLy8gJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG5cbn1cblxuZnVuY3Rpb24gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQsIG92ZXJyaWRlcjogQ29tbWFuZE92ZXJyaWRlcik6IHN0cmluZ1tdIHtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIFtdO1xuICBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgYXZhaWxhYmxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IGRyID0gcGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rO1xuICAgIGlmIChkciA9PSBudWxsIHx8IGRyLmNsaSA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgW3BrZ0ZpbGVQYXRoLCBmdW5jTmFtZV0gPSAoZHIuY2xpIGFzIHN0cmluZykuc3BsaXQoJyMnKTtcblxuICAgIGF2YWlsYWJsZXMucHVzaChway5uYW1lKTtcblxuICAgIHRyeSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShwaywgcGtnRmlsZVBhdGgsIGZ1bmNOYW1lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7KGUgYXMgRXJyb3IpLm1lc3NhZ2V9XCJgLCBlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGF2YWlsYWJsZXM7XG59XG5cbmZ1bmN0aW9uIGFkZE5wbUluc3RhbGxPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLXlhcm4sIC0tdXNlLXlhcm4nLCAnVXNlIFlhcm4gaW5zdGVhZCBvZiBOUE0gdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1jYWNoZSA8bnBtLWNhY2hlPicsICdzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi0tY2FjaGVcIicpXG4gIC5vcHRpb24oJy0tY2ksIC0tdXNlLWNpJywgJ1VzZSBcIm5wbSBjaVwiIGluc3RlYWQgb2YgXCJucG0gaW5zdGFsbFwiIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzOyB3aGVuIFwiLS11c2VZYXJuXCIgaXMgb24sIGFkZCBhcmd1bWVudCBcIi0taW1tdXRhYmxlXCInLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcnVuZScsICdSdW4gXCJucG0gcHJ1bmVcIiBhZnRlciBpbnN0YWxsYXRpb24nKVxuICAub3B0aW9uKCctLWRkcCwgLS1kZWR1cGUnLCAnUnVuIFwibnBtIGRlZHVwZVwiIGFmdGVyIGluc3RhbGxhdGlvbicpXG4gIC8vIC5vcHRpb24oJy0tb2ZmbGluZScsICdzYW1lIGFzIG5wbSBvcHRpb24gXCItLW9mZmxpbmVcIiBkdXJpbmcgZXhlY3V0aW5nIG5wbSBpbnN0YWxsL2NpICcsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrUGxpbmtWZXJzaW9uKCkge1xuICBjb25zdCBwa2pzb24gPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAncGFja2FnZS5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBranNvbikpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtqc29uLCAndXRmOCcpKSBhcyB7ZGVwZW5kZW5jaWVzPzoge1twOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWR9OyBkZXZEZXBlbmRlbmNpZXM/OiB7W3A6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH19O1xuICAgIGxldCBkZXBWZXIgPSBqc29uLmRlcGVuZGVuY2llcyAmJiBqc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddIHx8XG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyAmJiBqc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgIGlmIChkZXBWZXIgPT0gbnVsbCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnRG9uXFwndCBmb3JnZXQgdG8gYWRkIEB3ZmgvcGxpbmsgaW4gcGFja2FnZS5qc29uIGFzIGRlcGVuZGVuY2llcycpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRlcFZlci5lbmRzV2l0aCgnLnRneicpKSB7XG4gICAgICBjb25zdCBtYXRjaGVkID0gLy0oXFxkK1xcLlxcZCtcXC5bXl0rPylcXC50Z3okLy5leGVjKGRlcFZlcik7XG4gICAgICBpZiAobWF0Y2hlZCA9PSBudWxsKVxuICAgICAgICByZXR1cm47XG4gICAgICBkZXBWZXIgPSBtYXRjaGVkWzFdO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyICYmICFzZW12ZXIuc2F0aXNmaWVzKHBrLnZlcnNpb24sIGRlcFZlcikpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoYExvY2FsIGluc3RhbGxlZCBQbGluayB2ZXJzaW9uICR7Y2hhbGsuY3lhbihway52ZXJzaW9uKX0gZG9lcyBub3QgbWF0Y2ggZGVwZW5kZW5jeSB2ZXJzaW9uICR7Y2hhbGsuZ3JlZW4oZGVwVmVyKX0gaW4gcGFja2FnZS5qc29uLCBgICtcbiAgICAgICAgYHJ1biBjb21tYW5kIFwiJHtjaGFsay5ncmVlbigncGxpbmsgdXBncmFkZScpfVwiIHRvIHVwZ3JhZGUgb3IgZG93bmdyYWRlIHRvIGV4cGVjdGVkIHZlcnNpb25gKSk7XG4gICAgfVxuICB9XG59XG5cbiJdfQ==