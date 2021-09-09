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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
function createCommands(startTime) {
    return __awaiter(this, void 0, void 0, function* () {
        process.title = 'Plink';
        // const {stateFactory}: typeof store = require('../store');
        yield Promise.resolve().then(() => __importStar(require('./cli-slice')));
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
                        `Try commands:\n${wsDirs.map(dir => '  plink --cwd ' + dir).join('\n')}`);
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
            yield program.parseAsync(process.argv, { from: 'node' });
        }
        catch (e) {
            log.error('Failed to execute command due to: ' + chalk_1.default.redBright(e.message), e);
            if (e.stack) {
                log.error(e.stack);
            }
            process.exit(1);
        }
    });
}
exports.createCommands = createCommands;
function subComands(program) {
    /** command init
     */
    const initCmd = program.command('init [work-directory]').alias('sync')
        .description('Initialize and update work directory, generate basic configuration files for project and component packages,' +
        ' calculate hoisted transitive dependencies, and run "npm install" in current directory.', {
        'work-directory': 'A relative or abosolute directory path, use "." to determine current directory,\n  ommitting this argument meaning:\n' +
            '  - If current directory is already a "work directory", update it.\n' +
            '  - If current directory is not a work directory (maybe at repo\'s root directory), update the latest updated work' +
            ' directory.'
    })
        .option('-f, --force', 'Force run "npm install" in specific workspace directory, this is not same as npm install option "-f" ', false)
        // .option('--lint-hook, --lh', 'Create a git push hook for code lint', false)
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line no-console
        console.log((0, misc_1.sexyFont)('PLink').string);
        (yield Promise.resolve().then(() => __importStar(require('./cli-init')))).default(initCmd.opts(), workspace);
    }));
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
        .action((action, projectDir) => __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line no-console
        console.log((0, misc_1.sexyFont)('PLink').string);
        (yield Promise.resolve().then(() => __importStar(require('./cli-project')))).default({ isSrcDir: false }, action, projectDir);
    }));
    program.command('src [add|remove] [dir...]')
        .description('Associate, disassociate or list source directories, Plink will' +
        ' scan source code directories for packages', {
        'add|remove': 'Specify whether associate to a directory or disassociate from a directory',
        dir: 'specify multiple directories by seperating them with space character'
    })
        .action((action, dirs) => __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line no-console
        console.log((0, misc_1.sexyFont)('PLink').string);
        (yield Promise.resolve().then(() => __importStar(require('./cli-project')))).default({ isSrcDir: true }, action, dirs);
    }));
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
        .action(() => __awaiter(this, void 0, void 0, function* () {
        const scanNodeModules = require('../utils/symlinks').default;
        const editor = yield Promise.resolve().then(() => __importStar(require('../editor-helper')));
        editor.dispatcher.clearSymlinks();
        yield editor.getAction$('clearSymlinksDone').pipe(op.take(1)).toPromise();
        yield scanNodeModules(undefined, 'all');
    }));
    /**
     * command upgrade
     */
    const upgradeCmd = program.command('upgrade')
        .alias('install')
        .description('Reinstall local Plink along with other dependencies.' +
        ' (Unlike "npm install" which does not work with node_modules that might contain symlinks)')
        .action(() => __awaiter(this, void 0, void 0, function* () {
        skipVersionCheck = true;
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-link-plink')))).reinstallWithLinkedPlink(upgradeCmd.opts());
    }));
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
        .action(() => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-ls')))).default(listCmd.opts());
    }));
    const addCmd = program.command('add <dependency...>')
        .description('Add dependency to package.json file, with option "--dev" to add as "devDependencies", ' +
        'without option "--to" this command adds dependency to current worktree space\'s package.json file', {
        dependency: 'dependency package name in form of "<a linked package name without scope part>", "<package name>@<version>", '
    })
        .option('--to <pkg name | worktree dir | pkg dir>', 'add dependency to the package.json of specific linked source package by name or directory, or a worktree space directory')
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-add-package')))).addDependencyTo(packages, addCmd.opts().to, addCmd.opts().dev);
    }));
    const tsconfigCmd = program.command('tsconfig')
        .description('List tsconfig.json, jsconfig.json files which will be updated automatically by Plink, (a monorepo means there are node packages which are symlinked from real source code directory' +
        ', if you have customized tsconfig.json file, this command helps to update "compilerOptions.paths" properties)')
        .option('--hook <file>', 'add tsconfig/jsconfig file to Plink\'s automatic updating file list', utils_1.arrayOptionFn, [])
        .option('--unhook <file>', 'remove tsconfig/jsconfig file from Plink\'s automatic updating file list', utils_1.arrayOptionFn, [])
        .option('--clear,--unhook-all', 'remove all tsconfig files from from Plink\'s automatic updating file list', false)
        .action(() => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-tsconfig-hook')))).doTsconfig(tsconfigCmd.opts());
    }));
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
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-bump')))).default(Object.assign(Object.assign({}, bumpCmd.opts()), { packages }));
    }));
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
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-pack')))).pack(Object.assign(Object.assign({}, packCmd.opts()), { packages }));
    }));
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
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-pack')))).publish(Object.assign(Object.assign({}, publishCmd.opts()), { packages }));
    }));
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
        .option('--alias <alias-express>', 'a JSON express, e.g. --alias \'["^@/(.+)$","src/$1"]\'', utils_1.arrayOptionFn, [])
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        return (yield Promise.resolve().then(() => __importStar(require('./cli-analyze')))).default(packages, analysisCmd.opts());
    }));
    analysisCmd.usage(analysisCmd.usage() + '\n' +
        'e.g.\n  ' + chalk_1.default.blue('plink analyze -f "packages/foobar1/**/*" -f packages/foobar2/ts/main.ts\n  ' +
        'plink analyze -d packages/foobar1/src -d packages/foobar2/ts'));
    const watchCmd = program.command('watch [package...]')
        .description('Watch package source code file changes (files referenced in .npmignore will be ignored) and update Plink state, ' +
        'automatically install transitive dependency', {
        package: exports.cliPackageArgDesc
    })
        .option('--cp, --copy <directory>', 'copy package files to specific directory, mimic behavior of "npm install <pkg>", but this won\'t install dependencies')
        .action((pkgs) => {
        const { cliWatch } = require('./cli-watch');
        cliWatch(pkgs, watchCmd.opts());
    });
    const updateDirCmd = program.command('update-dir')
        .description('Run this command to sync internal state when whole workspace directory is renamed or moved.\n' +
        'Because we store absolute path info of each package in internal state, and it will become invalid after you rename or move directory')
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-ls')))).checkDir(updateDirCmd.opts());
    }));
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
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        const opt = tscCmd.opts();
        const tsc = yield Promise.resolve().then(() => __importStar(require('../ts-cmd')));
        yield tsc.tsc({
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
    }));
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
        .action((pkgName) => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-setting')))).default(pkgName);
    }));
    /** command run*/
    const runCmd = program.command('run <target> [arguments...]')
        .description('Run specific module\'s exported function\n')
        .action((target, args) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('../package-runner')))).runSinglePackage({ target, args });
    }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLDRCQUE0QjtBQUM1QiwwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLG1EQUFxQztBQUVyQyx1REFBeUM7QUFDekMsa0NBQWtDO0FBQ2xDLDRFQUFzRTtBQUV0RSx3Q0FBeUY7QUFFekYsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixvREFBNEI7QUFDNUIsNkRBQXFFO0FBQ3JFLHNEQUE4RDtBQUM5RCxtQ0FBOEM7QUFDOUMsbUNBQWlDO0FBR2pDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBc0IsQ0FBQztBQUNqRSxxQkFBcUI7QUFDckIsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXRCLFFBQUEsaUJBQWlCLEdBQUcseUVBQXlFO0lBQzFHLGdHQUFnRyxDQUFDO0FBRWpHLFNBQXNCLGNBQWMsQ0FBQyxTQUFpQjs7UUFDcEQsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7UUFDeEIsNERBQTREO1FBQzVELHdEQUFhLGFBQWEsR0FBQyxDQUFDO1FBQzVCLGlDQUFpQztRQUdqQyxJQUFJLGFBQW1DLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7YUFDN0MsV0FBVyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQzthQUM5RSxNQUFNLENBQUMsQ0FBQyxJQUFjLEVBQUUsRUFBRTtZQUN6QixzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGVBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxzQ0FBc0M7WUFDdEMsT0FBTyxD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LEdBQUcsSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztZQUMvRCxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDN0QsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUEsZ0JBQVMsRUFBQyxpRUFBaUUsQ0FBQyxDQUFDLENBQUM7WUFDMUYsT0FBTztTQUNSO1FBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzNCLE1BQU0sT0FBTyxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4RCxJQUFJLE9BQU8sSUFBSSxJQUFJO2dCQUNqQixPQUFPO1lBQ1QsTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyQjtRQUNELElBQUksTUFBTSxJQUFJLENBQUMsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNuRCxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGdCQUFTLEVBQUMsaUNBQWlDLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsZUFBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CO2dCQUN4SixnQkFBZ0IsZUFBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsK0NBQStDLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY2ZvbnQuZC50c1wiIC8+XG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICcuLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgaXNEcmNwU3ltbGluaywgc2V4eUZvbnQsIGdldFJvb3REaXIsIGJveFN0cmluZywgcGxpbmtFbnYgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF9zeW1saW5rcyBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQge0NvbW1hbmRPdmVycmlkZXIsIHdpdGhDd2RPcHRpb259IGZyb20gJy4vb3ZlcnJpZGUtY29tbWFuZGVyJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge2hsRGVzYywgYXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7Q2xpT3B0aW9ucyBhcyBUc2NvbmZpZ0NsaU9wdGlvbnN9IGZyb20gJy4vY2xpLXRzY29uZmlnLWhvb2snO1xuaW1wb3J0ICogYXMgX2NsaVdhdGNoIGZyb20gJy4vY2xpLXdhdGNoJztcbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG4vLyBjb25zdCBXSURUSCA9IDEzMDtcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY2xpJyk7XG5cbmV4cG9ydCBjb25zdCBjbGlQYWNrYWdlQXJnRGVzYyA9ICdTaW5nbGUgb3IgbXVsdGlwbGUgcGFja2FnZSBuYW1lcywgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQsJyArXG4naWYgdGhlIHNjb3BlIG5hbWUgKHRoZSBwYXJ0IGJldHdlZW4gXCJAXCIgXCIvXCIpIGFyZSBsaXN0ZWQgY29uZmlndXJhdGlvbiBwcm9wZXJ0eSBcInBhY2thZ2VTY29wZXNcIic7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21tYW5kcyhzdGFydFRpbWU6IG51bWJlcikge1xuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rJztcbiAgLy8gY29uc3Qge3N0YXRlRmFjdG9yeX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gIGF3YWl0IGltcG9ydCgnLi9jbGktc2xpY2UnKTtcbiAgLy8gc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG5cblxuICBsZXQgY2xpRXh0ZW5zaW9uczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoJ3BsaW5rJylcbiAgLmRlc2NyaXB0aW9uKGNoYWxrLmN5YW4oJ0EgcGx1Z2dhYmxlIG1vbm9yZXBvIGFuZCBtdWx0aS1yZXBvIG1hbmFnZW1lbnQgdG9vbCcpKVxuICAuYWN0aW9uKChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHByb2dyYW0uaGVscEluZm9ybWF0aW9uKCkpO1xuXG4gICAgaWYgKHdzU3RhdGUgPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd3NEaXJzID0gWy4uLnBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpXTtcbiAgICAgIGlmICh3c0RpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhgTW9yZSBjb21tYW5kcyBhcmUgYXZhaWxhYmxlIGluIHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yaWVzOiBbJHt3c0RpcnMubWFwKGl0ZW0gPT4gY2hhbGsuY3lhbihpdGVtKSkuam9pbignLCAnKX1dXFxuYCArXG4gICAgICAgICAgYFRyeSBjb21tYW5kczpcXG4ke3dzRGlycy5tYXAoZGlyID0+ICcgIHBsaW5rIC0tY3dkICcgKyBkaXIpLmpvaW4oJ1xcbicpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBcXG52ZXJzaW9uOiAke3BrLnZlcnNpb259ICR7aXNEcmNwU3ltbGluayA/IGNoYWxrLnllbGxvdygnKHN5bWxpbmtlZCknKSA6ICcnfSBgKTtcbiAgICBpZiAoY2xpRXh0ZW5zaW9ucyAmJiBjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtjbGlFeHRlbnNpb25zLmxlbmd0aH0gY29tbWFuZCBsaW5lIGV4dGVuc2lvbmAgK1xuICAgICAgYCR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiAke2NsaUV4dGVuc2lvbnMubWFwKHBrZyA9PiBjaGFsay5ibHVlKHBrZykpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbicsIGNoYWxrLmJnUmVkKCdQbGVhc2UgZGV0ZXJtaW5lIGEgc3ViIGNvbW1hbmQgbGlzdGVkIGFib3ZlJykpO1xuICAgIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBwcm9jZXNzLmV4aXQoMSkpO1xuICB9KTtcbiAgcHJvZ3JhbS5hZGRIZWxwVGV4dCgnYmVmb3JlJywgc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgd2l0aEN3ZE9wdGlvbihwcm9ncmFtKTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbiAgcHJvZ3JhbS5hZGRIZWxwQ29tbWFuZCgnaGVscCBbY29tbWFuZF0nLCAnc2hvdyBoZWxwIGluZm9ybWF0aW9uLCBzYW1lIGFzIFwiLWhcIi4gJyk7XG5cbiAgY29uc3Qgb3ZlcnJpZGVyID0gbmV3IENvbW1hbmRPdmVycmlkZXIocHJvZ3JhbSk7XG4gIGxldCB3c1N0YXRlOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIGNvbnN0IHtnZXRTdGF0ZTogZ2V0UGtnU3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa2dNZ3I7XG4gICAgd3NTdGF0ZSA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKTtcbiAgICBpZiAod3NTdGF0ZSAhPSBudWxsKSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBwcm9ncmFtID0+IHtcbiAgICAgICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuZ3JlZW4oc3RyKTtcbiAgICAgICAgc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbSk7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICAgICAgICBzdWJDb21hbmRzKHByb2dyYW0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHN1YkNvbWFuZHMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHN0ciA9PiBjaGFsay5jeWFuKHN0cik7XG4gICAgY2xpRXh0ZW5zaW9ucyA9IGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW0sIHdzU3RhdGUsIG92ZXJyaWRlcik7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnVmFsdWUgb2YgZW52aXJvbm1lbnQgdmFyYWlibGUgXCJQTElOS19TQUZFXCIgaXMgdHJ1ZSwgc2tpcCBsb2FkaW5nIGV4dGVuc2lvbicpO1xuICB9XG5cbiAgb3ZlcnJpZGVyLmFwcGVuZEdsb2JhbE9wdGlvbnMoZmFsc2UpO1xuICB0cnkge1xuICAgIGF3YWl0IHByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YsIHtmcm9tOiAnbm9kZSd9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIGV4ZWN1dGUgY29tbWFuZCBkdWUgdG86ICcgKyBjaGFsay5yZWRCcmlnaHQoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpLCBlKTtcbiAgICBpZiAoKGUgYXMgRXJyb3IpLnN0YWNrKSB7XG4gICAgICBsb2cuZXJyb3IoKGUgYXMgRXJyb3IpLnN0YWNrKTtcbiAgICB9XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN1YkNvbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCBbd29yay1kaXJlY3RvcnldJykuYWxpYXMoJ3N5bmMnKVxuICAgIC5kZXNjcmlwdGlvbignSW5pdGlhbGl6ZSBhbmQgdXBkYXRlIHdvcmsgZGlyZWN0b3J5LCBnZW5lcmF0ZSBiYXNpYyBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBwcm9qZWN0IGFuZCBjb21wb25lbnQgcGFja2FnZXMsJyArXG4gICAgICAnIGNhbGN1bGF0ZSBob2lzdGVkIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzLCBhbmQgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBjdXJyZW50IGRpcmVjdG9yeS4nLFxuICAgICAge1xuICAgICAgICAnd29yay1kaXJlY3RvcnknOiAnQSByZWxhdGl2ZSBvciBhYm9zb2x1dGUgZGlyZWN0b3J5IHBhdGgsIHVzZSBcIi5cIiB0byBkZXRlcm1pbmUgY3VycmVudCBkaXJlY3RvcnksXFxuICBvbW1pdHRpbmcgdGhpcyBhcmd1bWVudCBtZWFuaW5nOlxcbicgK1xuICAgICAgICAgICcgIC0gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgYWxyZWFkeSBhIFwid29yayBkaXJlY3RvcnlcIiwgdXBkYXRlIGl0LlxcbicgK1xuICAgICAgICAgICcgIC0gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29yayBkaXJlY3RvcnkgKG1heWJlIGF0IHJlcG9cXCdzIHJvb3QgZGlyZWN0b3J5KSwgdXBkYXRlIHRoZSBsYXRlc3QgdXBkYXRlZCB3b3JrJyArXG4gICAgICAgICAgJyBkaXJlY3RvcnkuJ1xuICAgICAgfSlcbiAgICAub3B0aW9uKCctZiwgLS1mb3JjZScsICdGb3JjZSBydW4gXCJucG0gaW5zdGFsbFwiIGluIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnksIHRoaXMgaXMgbm90IHNhbWUgYXMgbnBtIGluc3RhbGwgb3B0aW9uIFwiLWZcIiAnLCBmYWxzZSlcbiAgICAvLyAub3B0aW9uKCctLWxpbnQtaG9vaywgLS1saCcsICdDcmVhdGUgYSBnaXQgcHVzaCBob29rIGZvciBjb2RlIGxpbnQnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U/OiBzdHJpbmcpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktaW5pdCcpKS5kZWZhdWx0KGluaXRDbWQub3B0cygpIGFzIHRwLkluaXRDbWRPcHRpb25zICYgdHAuTnBtQ2xpT3B0aW9uLCB3b3Jrc3BhY2UpO1xuICAgIH0pO1xuICBhZGROcG1JbnN0YWxsT3B0aW9uKGluaXRDbWQpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHByb2plY3RcbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgncHJvamVjdCBbYWRkfHJlbW92ZV0gW2Rpci4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignQXNzb2NpYXRlLCBkaXNhc3NvY2lhdGUgb3IgbGlzdCBhc3NvY2lhdGVkIHByb2plY3QgZm9sZGVycywgUGxpbmsgd2lsbCcgK1xuICAgICAgJyBzY2FuIHNvdXJjZSBjb2RlIGRpcmVjdG9yaWVzIGZyb20gYXNzb2NpYXRlZCBwcm9qZWN0cycsIHtcbiAgICAgICAgJ2FkZHxyZW1vdmUnOiAnU3BlY2lmeSB3aGV0aGVyIEFzc29jaWF0ZSB0byBhIHByb2plY3Qgb3IgRGlzYXNzb2NpYXRlIGZyb20gYSBwcm9qZWN0JyxcbiAgICAgICAgZGlyOiAnU3BlY2lmeSB0YXJnZXQgcHJvamVjdCByZXBvIGRpcmVjdG9yeSAoYWJzb2x1dGUgcGF0aCBvciByZWxhdGl2ZSBwYXRoIHRvIGN1cnJlbnQgZGlyZWN0b3J5KScgK1xuICAgICAgICAgICcsIHNwZWNpZnkgbXVsdGlwbGUgcHJvamVjdCBieSBzZXBlcmF0aW5nIHRoZW0gd2l0aCBzcGFjZSBjaGFyYWN0ZXInXG4gICAgICB9KVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdGlvbjogJ2FkZCd8J3JlbW92ZSd8dW5kZWZpbmVkLCBwcm9qZWN0RGlyOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiBmYWxzZX0sIGFjdGlvbiwgcHJvamVjdERpcik7XG4gICAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzcmMgW2FkZHxyZW1vdmVdIFtkaXIuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3Qgc291cmNlIGRpcmVjdG9yaWVzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZm9yIHBhY2thZ2VzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgYXNzb2NpYXRlIHRvIGEgZGlyZWN0b3J5IG9yIGRpc2Fzc29jaWF0ZSBmcm9tIGEgZGlyZWN0b3J5JyxcbiAgICAgICAgZGlyOiAnc3BlY2lmeSBtdWx0aXBsZSBkaXJlY3RvcmllcyBieSBzZXBlcmF0aW5nIHRoZW0gd2l0aCBzcGFjZSBjaGFyYWN0ZXInXG4gICAgICB9KVxuICAgICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIGRpcnM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXByb2plY3QnKSkuZGVmYXVsdCh7aXNTcmNEaXI6IHRydWV9LCBhY3Rpb24sIGRpcnMpO1xuICAgICAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbGludFxuICAgKi9cbiAgLy8gY29uc3QgbGludENtZCA9IHByb2dyYW0uY29tbWFuZCgnbGludCBbcGFja2FnZS4uLl0nKVxuICAvLyAgIC5kZXNjcmlwdGlvbignc291cmNlIGNvZGUgc3R5bGUgY2hlY2snLCB7XG4gIC8vICAgICBwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY1xuICAvLyAgIH0pXG4gIC8vICAgLm9wdGlvbignLS1waiA8cHJvamVjdDEscHJvamVjdDIuLi4+JywgJ2xpbnQgb25seSBUUyBjb2RlIGZyb20gc3BlY2lmaWMgcHJvamVjdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAvLyAgIC5vcHRpb24oJy0tZml4JywgJ1J1biBlc2xpbnQvdHNsaW50IGZpeCwgdGhpcyBjb3VsZCBjYXVzZSB5b3VyIHNvdXJjZSBjb2RlIGJlaW5nIGNoYW5nZWQgdW5leHBlY3RlZGx5JywgZmFsc2UpXG4gIC8vICAgLmFjdGlvbihhc3luYyBwYWNrYWdlcyA9PiB7XG4gIC8vICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW50JykpLmRlZmF1bHQocGFja2FnZXMsIGxpbnRDbWQub3B0cygpIGFzIGFueSk7XG4gIC8vICAgfSk7XG5cbiAgLy8gbGludENtZC51c2FnZShsaW50Q21kLnVzYWdlKCkgK1xuICAvLyAgIGhsKCdcXG5kcmNwIGxpbnQgLS1waiA8cHJvamVjdC1kaXIuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnlcXG4nICtcbiAgLy8gICBobCgnXFxuZHJjcCBsaW50IDxjb21wb25lbnQtcGFja2FnZS4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBjb21wb25lbnQgcGFja2FnZXMnKTtcblxuICAvKipcbiAgICogY29tbWFuZCBjbGVhblxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcycpLmFsaWFzKCdjbGVhci1zeW1saW5rcycpXG4gICAgLmRlc2NyaXB0aW9uKCdDbGVhciBzeW1saW5rcyBmcm9tIG5vZGVfbW9kdWxlcycpXG4gICAgLy8gLm9wdGlvbignLS1vbmx5LXN5bWxpbmsnLCAnQ2xlYW4gb25seSBzeW1saW5rcywgbm90IGRpc3QgZGlyZWN0b3J5JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY2FuTm9kZU1vZHVsZXMgPSAocmVxdWlyZSgnLi4vdXRpbHMvc3ltbGlua3MnKSBhcyB0eXBlb2YgX3N5bWxpbmtzKS5kZWZhdWx0O1xuICAgICAgY29uc3QgZWRpdG9yID0gYXdhaXQgaW1wb3J0KCcuLi9lZGl0b3ItaGVscGVyJyk7XG4gICAgICBlZGl0b3IuZGlzcGF0Y2hlci5jbGVhclN5bWxpbmtzKCk7XG4gICAgICBhd2FpdCBlZGl0b3IuZ2V0QWN0aW9uJCgnY2xlYXJTeW1saW5rc0RvbmUnKS5waXBlKG9wLnRha2UoMSkpLnRvUHJvbWlzZSgpO1xuICAgICAgYXdhaXQgc2Nhbk5vZGVNb2R1bGVzKHVuZGVmaW5lZCwgJ2FsbCcpO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHVwZ3JhZGVcbiAgICovXG4gIGNvbnN0IHVwZ3JhZGVDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3VwZ3JhZGUnKVxuICAgIC5hbGlhcygnaW5zdGFsbCcpXG4gICAgLmRlc2NyaXB0aW9uKCdSZWluc3RhbGwgbG9jYWwgUGxpbmsgYWxvbmcgd2l0aCBvdGhlciBkZXBlbmRlbmNpZXMuJyArXG4gICAgICAnIChVbmxpa2UgXCJucG0gaW5zdGFsbFwiIHdoaWNoIGRvZXMgbm90IHdvcmsgd2l0aCBub2RlX21vZHVsZXMgdGhhdCBtaWdodCBjb250YWluIHN5bWxpbmtzKScpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBza2lwVmVyc2lvbkNoZWNrID0gdHJ1ZTtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxpbmstcGxpbmsnKSkucmVpbnN0YWxsV2l0aExpbmtlZFBsaW5rKHVwZ3JhZGVDbWQub3B0cygpIGFzIHRwLk5wbUNsaU9wdGlvbik7XG4gICAgfSk7XG4gIGFkZE5wbUluc3RhbGxPcHRpb24odXBncmFkZUNtZCk7XG4gIC8vIHByb2dyYW0uY29tbWFuZCgnZG9ja2VyaXplIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbihjaGFsay5ncmF5KCdbVEJJXSBHZW5lcmF0ZSBEb2NrZXJmaWxlIGZvciBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5LCBhbmQgZ2VuZXJhdGUgZG9ja2VyIGltYWdlJykpO1xuXG4gIC8vIHByb2dyYW0uY29tbWFuZCgncGtnIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbihjaGFsay5ncmF5KCdbVEJJXSBVc2UgUGtnIChodHRwczovL2dpdGh1Yi5jb20vdmVyY2VsL3BrZykgdG8gcGFja2FnZSBOb2RlLmpzIHByb2plY3QgaW50byBhbiBleGVjdXRhYmxlICcpKTtcblxuICAvKipcbiAgICogY29tbWFuZCBsc1xuICAgKi9cbiAgY29uc3QgbGlzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbHMnKS5hbGlhcygnbGlzdCcpXG4gICAgLm9wdGlvbignLWosIC0tanNvbicsICdsaXN0IGxpbmtlZCBkZXBlbmRlbmNpZXMgaW4gZm9ybSBvZiBKU09OJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1ob2lzdCcsICdsaXN0IGhvaXN0ZWQgdHJhbnNpdGl2ZSBEZXBlbmRlbmN5IGluZm9ybWF0aW9uJywgZmFsc2UpXG4gICAgLmRlc2NyaXB0aW9uKCdJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBtYW55IHBhY2thZ2VzIHdpbGwgYWN0dWFsbHkgcnVuLCB0aGlzIGNvbW1hbmQgcHJpbnRzIG91dCBhIGxpc3QgYW5kIHRoZSBwcmlvcml0aWVzLCBpbmNsdWRpbmcgaW5zdGFsbGVkIHBhY2thZ2VzJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmRlZmF1bHQobGlzdENtZC5vcHRzKCkgYXMgYW55KTtcbiAgICB9KTtcblxuICBjb25zdCBhZGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FkZCA8ZGVwZW5kZW5jeS4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignQWRkIGRlcGVuZGVuY3kgdG8gcGFja2FnZS5qc29uIGZpbGUsIHdpdGggb3B0aW9uIFwiLS1kZXZcIiB0byBhZGQgYXMgXCJkZXZEZXBlbmRlbmNpZXNcIiwgJyArXG4gICAgICAnd2l0aG91dCBvcHRpb24gXCItLXRvXCIgdGhpcyBjb21tYW5kIGFkZHMgZGVwZW5kZW5jeSB0byBjdXJyZW50IHdvcmt0cmVlIHNwYWNlXFwncyBwYWNrYWdlLmpzb24gZmlsZScsXG4gICAgICB7XG4gICAgICAgIGRlcGVuZGVuY3k6ICdkZXBlbmRlbmN5IHBhY2thZ2UgbmFtZSBpbiBmb3JtIG9mIFwiPGEgbGlua2VkIHBhY2thZ2UgbmFtZSB3aXRob3V0IHNjb3BlIHBhcnQ+XCIsIFwiPHBhY2thZ2UgbmFtZT5APHZlcnNpb24+XCIsICdcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLS10byA8cGtnIG5hbWUgfCB3b3JrdHJlZSBkaXIgfCBwa2cgZGlyPicsICdhZGQgZGVwZW5kZW5jeSB0byB0aGUgcGFja2FnZS5qc29uIG9mIHNwZWNpZmljIGxpbmtlZCBzb3VyY2UgcGFja2FnZSBieSBuYW1lIG9yIGRpcmVjdG9yeSwgb3IgYSB3b3JrdHJlZSBzcGFjZSBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktYWRkLXBhY2thZ2UnKSkuYWRkRGVwZW5kZW5jeVRvKHBhY2thZ2VzLCBhZGRDbWQub3B0cygpLnRvLCBhZGRDbWQub3B0cygpLmRldik7XG4gICAgfSk7XG5cbiAgY29uc3QgdHNjb25maWdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzY29uZmlnJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgdHNjb25maWcuanNvbiwganNjb25maWcuanNvbiBmaWxlcyB3aGljaCB3aWxsIGJlIHVwZGF0ZWQgYXV0b21hdGljYWxseSBieSBQbGluaywgKGEgbW9ub3JlcG8gbWVhbnMgdGhlcmUgYXJlIG5vZGUgcGFja2FnZXMgd2hpY2ggYXJlIHN5bWxpbmtlZCBmcm9tIHJlYWwgc291cmNlIGNvZGUgZGlyZWN0b3J5JyArXG4gICAgICAnLCBpZiB5b3UgaGF2ZSBjdXN0b21pemVkIHRzY29uZmlnLmpzb24gZmlsZSwgdGhpcyBjb21tYW5kIGhlbHBzIHRvIHVwZGF0ZSBcImNvbXBpbGVyT3B0aW9ucy5wYXRoc1wiIHByb3BlcnRpZXMpJylcbiAgICAub3B0aW9uKCctLWhvb2sgPGZpbGU+JywgJ2FkZCB0c2NvbmZpZy9qc2NvbmZpZyBmaWxlIHRvIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS11bmhvb2sgPGZpbGU+JywgJ3JlbW92ZSB0c2NvbmZpZy9qc2NvbmZpZyBmaWxlIGZyb20gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLWNsZWFyLC0tdW5ob29rLWFsbCcsICdyZW1vdmUgYWxsIHRzY29uZmlnIGZpbGVzIGZyb20gZnJvbSBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktdHNjb25maWctaG9vaycpKS5kb1RzY29uZmlnKHRzY29uZmlnQ21kLm9wdHMoKSBhcyBUc2NvbmZpZ0NsaU9wdGlvbnMpO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBCdW1wIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IGJ1bXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2J1bXAgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ2J1bXAgcGFja2FnZS5qc29uIHZlcnNpb24gbnVtYmVyIGZvciBzcGVjaWZpYyBwYWNrYWdlLCBzYW1lIGFzIFwibnBtIHZlcnNpb25cIiBkb2VzJyxcbiAgICAgIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdvbmx5IGJ1bXAgY29tcG9uZW50IHBhY2thZ2VzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNyZS12ZXJzaW9uIDx2YWx1ZT4nLFxuICAgICAgJ3ZlcnNpb24gaW5jcmVtZW50LCB2YWxpZCB2YWx1ZXMgYXJlOiBtYWpvciwgbWlub3IsIHBhdGNoLCBwcmVyZWxlYXNlJywgJ3BhdGNoJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWJ1bXAnKSkuZGVmYXVsdCh7Li4uYnVtcENtZC5vcHRzKCkgYXMgdHAuQnVtcE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKGJ1bXBDbWQpO1xuICAvLyBidW1wQ21kLnVzYWdlKGJ1bXBDbWQudXNhZ2UoKSArICdcXG4nICsgaGwoJ3BsaW5rIGJ1bXAgPHBhY2thZ2U+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gIC8vICAgaGwoJ3BsaW5rIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzIGFuZCBjaGFuZ2UgdmVyc2lvbiB2YWx1ZSBmcm9tIHJlbGF0ZWQgcGFja2FnZS5qc29uJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3BhY2sgcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwYWNrIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXI+JyxcbiAgICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS10YXItZGlyIDxkaXI+JywgJ2RpcmVjdG9yeSB0byBzYXZlIHRhciBmaWxlcycsIFBhdGguam9pbihnZXRSb290RGlyKCksICd0YXJiYWxscycpKVxuICAgIC5vcHRpb24oJy0tamYsIC0tanNvbi1maWxlIDxwa2ctanNvbi1maWxlPicsICd0aGUgcGFja2FnZS5qc29uIGZpbGUgaW4gd2hpY2ggXCJkZXZEZXBlbmRlbmNpZXNcIiwgXCJkZXBlbmRlbmNpZXNcIiBzaG91bGQgdG8gYmUgY2hhbmdlZCBhY2NvcmRpbmcgdG8gcGFja2VkIGZpbGUsICcgKyBcbiAgICAgICdieSBkZWZhdWx0IHBhY2thZ2UuanNvbiBmaWxlcyBpbiBhbGwgd29yayBzcGFjZXMgd2lsbCBiZSBjaGVja2VkIGFuZCBjaGFuZ2VkJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucGFjayh7Li4ucGFja0NtZC5vcHRzKCkgYXMgdHAuUGFja09wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKHBhY2tDbWQpO1xuICBwYWNrQ21kLnVzYWdlKHBhY2tDbWQudXNhZ2UoKSArICdcXG5CeSBkZWZhdWx0LCBydW4gXCJucG0gcGFja1wiIGZvciBlYWNoIGxpbmtlZCBwYWNrYWdlIHdoaWNoIGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UnKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwdWJsaXNoQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwdWJsaXNoIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdydW4gbnBtIHB1Ymxpc2gnLCB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncHVibGlzaCBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsXG4gICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwdWJsaXNoIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcHVibGljJywgJ3NhbWUgYXMgXCJucG0gcHVibGlzaFwiIGNvbW1hbmQgb3B0aW9uIFwiLS1hY2Nlc3MgcHVibGljXCInLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucHVibGlzaCh7Li4ucHVibGlzaENtZC5vcHRzKCkgYXMgdHAuUHVibGlzaE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG5cblxuICBjb25zdCBhbmFseXNpc0NtZCA9IHByb2dyYW0uY29tbWFuZCgnYW5hbHl6ZSBbcGtnLW5hbWUuLi5dJylcbiAgICAuYWxpYXMoJ2FuYWx5c2UnKVxuICAgIC5kZXNjcmlwdGlvbignVXNlIFR5cGVzY3JpcHQgY29tcGlsZXIgdG8gcGFyc2Ugc291cmNlIGNvZGUsIGxpc3QgZGVwZW5kZW5jZXMgYnkgREZTIGFsZ2FyaXRobSwgcmVzdWx0IGluZm9ybWF0aW9uIGluY2x1ZGVzJyArXG4gICAgICAnOiBjeWNsaWMgZGVwZW5kZWNpZXMsIHVucmVzb2x2YWJsZSBkZXBlbmRlbmNpZXMsIGV4dGVybmFsIGRlcGVuZGVuY2llcywgZGVwZW5kZW5jaWVzIGFyZSBub3QgdW5kZXIgdGFyZ2V0IGRpcmVjdG9yeS4nLCB7XG4gICAgICAncGtnLW5hbWUnOiAndGhlIG5hbWUgb2YgdGFyZ2V0IHNvdXJjZSBwYWNrYWdlLCB0aGUgcGFja2FnZSBtdXN0IGJlIFBsaW5rIGNvbXBsaWFudCBwYWNrYWdlLCB0aGlzIGNvbW1hbmQgd2lsbCBvbmx5ICcgK1xuICAgICAgICAnc2NhbiBzcGVjaWFsIHNvdXJjZSBjb2RlIGRpcmVjdG9yeSBsaWtlIFwidHMvXCIgYW5kIFwiaXNvbS9cIiBvZiB0YXJnZXQgcGFja2FnZSdcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLXggPHJlZ2V4cD4nLCAnSW5nb3JlIFwibW9kdWxlIG5hbWVcIiB0aGF0IG1hdGNoZXMgc3BlY2lmaWMgUmVndWxhciBFeHBlcnNzaW9uJywgJ1xcLihsZXNzfHNjc3N8Y3NzKSQnKVxuICAgIC5vcHRpb24oJy1kLCAtLWRpciA8ZGlyZWN0b3J5PicsXG4gICAgICAnKG11bHRpcGxlKSBkZXRlcm1pbmUgdGFyZ2V0IGRpcmVjdG9yeSwgc2NhbiBKUy9KU1gvVFMvVFNYIGZpbGVzIHVuZGVyIHRhcmdldCBkaXJlY3RvcnknLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctZiwgLS1maWxlIDxmaWxlPicsXG4gICAgICAnKG11bHRpcGxlKSBkZXRlcm1pbmUgdGFyZ2V0IFRTL0pTKFgpIGZpbGVzIChtdWx0aXBsZSBmaWxlIHdpdGggbW9yZSBvcHRpb25zIFwiLWYgPGZpbGU+IC1mIDxnbG9iPlwiKScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy1qJywgJ1Nob3cgcmVzdWx0IGluIEpTT04nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXRzY29uZmlnIDxmaWxlPicsICdVc2UgXCJjb21waWxlck9wdGlvbnMucGF0aHNcIiBwcm9wZXJ0eSB0byByZXNvbHZlIHRzL2pzIGZpbGUgbW9kdWxlJylcbiAgICAub3B0aW9uKCctLWFsaWFzIDxhbGlhcy1leHByZXNzPicsICdhIEpTT04gZXhwcmVzcywgZS5nLiAtLWFsaWFzIFxcJ1tcIl5ALyguKykkXCIsXCJzcmMvJDFcIl1cXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hbmFseXplJykpLmRlZmF1bHQocGFja2FnZXMsIGFuYWx5c2lzQ21kLm9wdHMoKSBhcyB0cC5BbmFseXplT3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgYW5hbHlzaXNDbWQudXNhZ2UoYW5hbHlzaXNDbWQudXNhZ2UoKSArICdcXG4nICtcbiAgICAnZS5nLlxcbiAgJyArIGNoYWxrLmJsdWUoJ3BsaW5rIGFuYWx5emUgLWYgXCJwYWNrYWdlcy9mb29iYXIxLyoqLypcIiAtZiBwYWNrYWdlcy9mb29iYXIyL3RzL21haW4udHNcXG4gICcgK1xuICAgICdwbGluayBhbmFseXplIC1kIHBhY2thZ2VzL2Zvb2JhcjEvc3JjIC1kIHBhY2thZ2VzL2Zvb2JhcjIvdHMnKSk7XG5cbiAgY29uc3Qgd2F0Y2hDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3dhdGNoIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignV2F0Y2ggcGFja2FnZSBzb3VyY2UgY29kZSBmaWxlIGNoYW5nZXMgKGZpbGVzIHJlZmVyZW5jZWQgaW4gLm5wbWlnbm9yZSB3aWxsIGJlIGlnbm9yZWQpIGFuZCB1cGRhdGUgUGxpbmsgc3RhdGUsICcgK1xuICAnYXV0b21hdGljYWxseSBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeScsIHtcbiAgICBwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gIC5vcHRpb24oJy0tY3AsIC0tY29weSA8ZGlyZWN0b3J5PicsICdjb3B5IHBhY2thZ2UgZmlsZXMgdG8gc3BlY2lmaWMgZGlyZWN0b3J5LCBtaW1pYyBiZWhhdmlvciBvZiBcIm5wbSBpbnN0YWxsIDxwa2c+XCIsIGJ1dCB0aGlzIHdvblxcJ3QgaW5zdGFsbCBkZXBlbmRlbmNpZXMnKVxuICAuYWN0aW9uKChwa2dzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IHtjbGlXYXRjaH0gPSByZXF1aXJlKCcuL2NsaS13YXRjaCcpIGFzIHR5cGVvZiBfY2xpV2F0Y2g7XG4gICAgY2xpV2F0Y2gocGtncywgd2F0Y2hDbWQub3B0cygpKTtcbiAgfSk7XG5cbiAgY29uc3QgdXBkYXRlRGlyQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGRhdGUtZGlyJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biB0aGlzIGNvbW1hbmQgdG8gc3luYyBpbnRlcm5hbCBzdGF0ZSB3aGVuIHdob2xlIHdvcmtzcGFjZSBkaXJlY3RvcnkgaXMgcmVuYW1lZCBvciBtb3ZlZC5cXG4nICtcbiAgICAnQmVjYXVzZSB3ZSBzdG9yZSBhYnNvbHV0ZSBwYXRoIGluZm8gb2YgZWFjaCBwYWNrYWdlIGluIGludGVybmFsIHN0YXRlLCBhbmQgaXQgd2lsbCBiZWNvbWUgaW52YWxpZCBhZnRlciB5b3UgcmVuYW1lIG9yIG1vdmUgZGlyZWN0b3J5JylcbiAgICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuY2hlY2tEaXIodXBkYXRlRGlyQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqXG4gICAqIHRzYyBjb21tYW5kXG4gICAqL1xuICBjb25zdCB0c2NDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzYyBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIFR5cGVzY3JpcHQgY29tcGlsZXIgdG8gY29tcGlsZSBzb3VyY2UgY29kZSBmb3IgdGFyZ2V0IHBhY2thZ2VzLCAnICtcbiAgICAnd2hpY2ggaGF2ZSBiZWVuIGxpbmtlZCB0byBjdXJyZW50IHdvcmsgZGlyZWN0b3J5Jywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctdywgLS13YXRjaCcsICdUeXBlc2NyaXB0IGNvbXBpbGVyIHdhdGNoIG1vZGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52LnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAvLyAub3B0aW9uKCctLXdzLC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdvbmx5IGluY2x1ZGUgdGhvc2UgbGlua2VkIHBhY2thZ2VzIHdoaWNoIGFyZSBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgIC8vICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS10c3gsLS1qc3gnLCAnaW5jbHVkZXMgVFNYIGZpbGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1zb3VyY2UtbWFwIDxpbmxpbmV8ZmlsZT4nLCAnU291cmNlIG1hcCBzdHlsZTogXCJpbmxpbmVcIiBvciBcImZpbGVcIicsICdpbmxpbmUnKVxuICAgIC5vcHRpb24oJy0tbWVyZ2UsLS1tZXJnZS10c2NvbmZpZyA8ZmlsZT4nLCAnTWVyZ2UgY29tcGlsZXJPcHRpb25zIFwiYmFzZVVybFwiIGFuZCBcInBhdGhzXCIgZnJvbSBzcGVjaWZpZWQgdHNjb25maWcgZmlsZScpXG4gICAgLm9wdGlvbignLS1jb3BhdGgsIC0tY29tcGlsZXItb3B0aW9ucy1wYXRocyA8cGF0aE1hcEpzb24+JyxcbiAgICAgICdBZGQgbW9yZSBcInBhdGhzXCIgcHJvcGVydHkgdG8gY29tcGlsZXIgb3B0aW9ucy4gJyArXG4gICAgICAnKGUuZy4gLS1jb3BhdGggXFwne1xcXCJALypcIjpbXCIvVXNlcnMvd29ya2VyL29jZWFuLXVpL3NyYy8qXCJdfVxcJyknLCAodiwgcHJldikgPT4ge1xuICAgICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC5vcHRpb24oJy0tY28gPEpTT04tc3RyaW5nPicsXG4gICAgICBgUGFydGlhbCBjb21waWxlciBvcHRpb25zIHRvIGJlIG1lcmdlZCAoZXhjZXB0IFwiYmFzZVVybFwiKSwgXCJwYXRoc1wiIG11c3QgYmUgcmVsYXRpdmUgdG8gJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHBsaW5rRW52LndvcmtEaXIpIHx8ICdjdXJyZW50IGRpcmVjdG9yeSd9YClcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG4gICAgICBjb25zdCB0c2MgPSBhd2FpdCBpbXBvcnQoJy4uL3RzLWNtZCcpO1xuXG4gICAgICBhd2FpdCB0c2MudHNjKHtcbiAgICAgICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgICAgIHByb2plY3Q6IG9wdC5wcm9qZWN0LFxuICAgICAgICB3YXRjaDogb3B0LndhdGNoLFxuICAgICAgICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgICAgIGpzeDogb3B0LmpzeCxcbiAgICAgICAgZWQ6IG9wdC5lbWl0RGVjbGFyYXRpb25Pbmx5LFxuICAgICAgICBwYXRoc0pzb25zOiBvcHQuY29tcGlsZXJPcHRpb25zUGF0aHMsXG4gICAgICAgIG1lcmdlVHNjb25maWc6IG9wdC5tZXJnZVRzY29uZmlnLFxuICAgICAgICBjb21waWxlck9wdGlvbnM6IG9wdC5jbyA/IEpTT04ucGFyc2Uob3B0LmNvKSA6IHVuZGVmaW5lZFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgdHNjQ21kLnVzYWdlKHRzY0NtZC51c2FnZSgpICtcbiAgICAnXFxuSXQgY29tcGlsZXMgXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vdHMvKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9kaXN0XCIsXFxuJyArXG4gICAgJyAgb3JcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbVwiXFxuIGZvciBhbGwgQHdmaCBwYWNrYWdlcy5cXG4nICtcbiAgICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAgICdib3RoIE5vZGUuanMgYW5kIEJyb3dzZXIpIGluIGRpcmVjdG9yeSBgaXNvbWAuXFxuXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2NcXG4nKSArICcgQ29tcGlsZSBsaW5rZWQgcGFja2FnZXMgdGhhdCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlICh5b3Ugc2hhbGwgcnVuIHRoaXMgY29tbWFuZCBvbmx5IGluIGEgd29ya3NwYWNlIGRpcmVjdG9yeSlcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyA8cGFja2FnZS4uPlxcbicpICsgJyBPbmx5IGNvbXBpbGUgc3BlY2lmaWMgcGFja2FnZXMgYnkgcHJvdmlkaW5nIHBhY2thZ2UgbmFtZSBvciBzaG9ydCBuYW1lXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIHBhY2thZ2VzIGNoYW5nZSBhbmQgY29tcGlsZSB3aGVuIG5ldyB0eXBlc2NyaXB0IGZpbGUgaXMgY2hhbmdlZCBvciBjcmVhdGVkXFxuXFxuJyk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzZXR0aW5nIFtwYWNrYWdlXScpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IHBhY2thZ2VzIHNldHRpbmcgYW5kIHZhbHVlcycsIHtwYWNrYWdlOiAncGFja2FnZSBuYW1lLCBvbmx5IGxpc3Qgc2V0dGluZyBmb3Igc3BlY2lmaWMgcGFja2FnZSd9KVxuICAgIC5hY3Rpb24oYXN5bmMgKHBrZ05hbWU6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktc2V0dGluZycpKS5kZWZhdWx0KHBrZ05hbWUpO1xuICAgIH0pO1xuICAgIC8qKiBjb21tYW5kIHJ1biovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBzcGVjaWZpYyBtb2R1bGVcXCdzIGV4cG9ydGVkIGZ1bmN0aW9uXFxuJylcbiAgICAuYWN0aW9uKGFzeW5jICh0YXJnZXQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL3BhY2thZ2UtcnVubmVyJykpLnJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc30pO1xuICAgIH0pO1xuXG4gIHJ1bkNtZC51c2FnZShydW5DbWQudXNhZ2UoKSArICdcXG4nICsgY2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXVxcbicpICtcbiAgICBgZS5nLlxcbiAgJHtjaGFsay5ncmVlbigncGxpbmsgcnVuIC4uL3BhY2thZ2VzL2ZvcmJhci1wYWNrYWdlL2Rpc3QvZmlsZS5qcyNmdW5jdGlvbiBhcmd1bWVudDEgYXJndW1lbnQyLi4uJyl9XFxuYCArXG4gICAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAgICc8dGFyZ2V0PiAtIEpTIG9yIFRTIGZpbGUgbW9kdWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlc29sdmVkIGJ5IE5vZGUuanMgKHRzLW5vZGUpIGZvbGxvd2VkIGJ5IFwiI1wiIGFuZCBleHBvcnRlZCBmdW5jdGlvbiBuYW1lLFxcbicpO1xuICAgIC8vICdlLmcuIFxcbicgK1xuICAgIC8vIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgICAvLyAnLCBmdW5jdGlvbiBjYW4gYmUgYXN5bmMgd2hpY2ggcmV0dXJucyBQcm9taXNlXFxuJyArXG4gICAgLy8gY2hhbGsuZ3JlZW4oJ25vZGVfbW9kdWxlcy9wYWNrYWdlLWRpci9kaXN0L2Zvb2Jhci50cyNteUZ1bmN0aW9uJykgK1xuICAgIC8vICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuXG59XG5cbmZ1bmN0aW9uIGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3czogcGtnTWdyLldvcmtzcGFjZVN0YXRlIHwgdW5kZWZpbmVkLCBvdmVycmlkZXI6IENvbW1hbmRPdmVycmlkZXIpOiBzdHJpbmdbXSB7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybiBbXTtcbiAgaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIGNvbnN0IGF2YWlsYWJsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBkciA9IHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaztcbiAgICBpZiAoZHIgPT0gbnVsbCB8fCBkci5jbGkgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IFtwa2dGaWxlUGF0aCwgZnVuY05hbWVdID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG5cbiAgICBhdmFpbGFibGVzLnB1c2gocGsubmFtZSk7XG5cbiAgICB0cnkge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UocGssIHBrZ0ZpbGVQYXRoLCBmdW5jTmFtZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uIGluIHBhY2thZ2UgJHtway5uYW1lfTogXCIkeyhlIGFzIEVycm9yKS5tZXNzYWdlfVwiYCwgZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhdmFpbGFibGVzO1xufVxuXG5mdW5jdGlvbiBhZGROcG1JbnN0YWxsT3B0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgY21kLm9wdGlvbignLS1jYWNoZSA8bnBtLWNhY2hlPicsICdzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi0tY2FjaGVcIicpXG4gIC5vcHRpb24oJy0tY2ksIC0tdXNlLWNpJywgJ1VzZSBcIm5wbSBjaVwiIGluc3RlYWQgb2YgXCJucG0gaW5zdGFsbFwiIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tb2ZmbGluZScsICdzYW1lIGFzIG5wbSBvcHRpb24gXCItLW9mZmxpbmVcIiBkdXJpbmcgZXhlY3V0aW5nIG5wbSBpbnN0YWxsL2NpICcsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSk7XG59XG5cblxubGV0IHNraXBWZXJzaW9uQ2hlY2sgPSBmYWxzZTtcbnByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCAoKSA9PiB7XG4gIGlmIChza2lwVmVyc2lvbkNoZWNrKVxuICAgIHJldHVybjtcbiAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gIGlmIChwcm9jZXNzLnNlbmQgPT0gbnVsbCkge1xuICAgIC8vIHByb2Nlc3MgaXMgbm90IGEgZm9ya2VkIGNoaWxkIHByb2Nlc3NcbiAgICBjaGVja1BsaW5rVmVyc2lvbigpO1xuICB9XG59KTtcblxuZnVuY3Rpb24gY2hlY2tQbGlua1ZlcnNpb24oKSB7XG4gIGNvbnN0IHBranNvbiA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdwYWNrYWdlLmpzb24nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGtqc29uKSkge1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa2pzb24sICd1dGY4JykpIGFzIHtkZXBlbmRlbmNpZXM/OiB7W3A6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH07IGRldkRlcGVuZGVuY2llcz86IHtbcDogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkfX07XG4gICAgbGV0IGRlcFZlciA9IGpzb24uZGVwZW5kZW5jaWVzICYmIGpzb24uZGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ10gfHxcbiAgICAgIGpzb24uZGV2RGVwZW5kZW5jaWVzICYmIGpzb24uZGV2RGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ107XG4gICAgaWYgKGRlcFZlciA9PSBudWxsKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYm94U3RyaW5nKCdEb25cXCd0IGZvcmdldCB0byBhZGQgQHdmaC9wbGluayBpbiBwYWNrYWdlLmpzb24gYXMgZGVwZW5kZW5jaWVzJykpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyLmVuZHNXaXRoKCcudGd6JykpIHtcbiAgICAgIGNvbnN0IG1hdGNoZWQgPSAvLShcXGQrXFwuXFxkK1xcLlteXSs/KVxcLnRneiQvLmV4ZWMoZGVwVmVyKTtcbiAgICAgIGlmIChtYXRjaGVkID09IG51bGwpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGRlcFZlciA9IG1hdGNoZWRbMV07XG4gICAgfVxuICAgIGlmIChkZXBWZXIgJiYgIXNlbXZlci5zYXRpc2ZpZXMocGsudmVyc2lvbiwgZGVwVmVyKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhgTG9jYWwgaW5zdGFsbGVkIFBsaW5rIHZlcnNpb24gJHtjaGFsay5jeWFuKHBrLnZlcnNpb24pfSBkb2VzIG5vdCBtYXRjaCBkZXBlbmRlbmN5IHZlcnNpb24gJHtjaGFsay5ncmVlbihkZXBWZXIpfSBpbiBwYWNrYWdlLmpzb24sIGAgK1xuICAgICAgICBgcnVuIGNvbW1hbmQgXCIke2NoYWxrLmdyZWVuKCdwbGluayB1cGdyYWRlJyl9XCIgdG8gdXBncmFkZSBvciBkb3duZ3JhZGUgdG8gZXhwZWN0ZWQgdmVyc2lvbmApKTtcbiAgICB9XG4gIH1cbn1cblxuIl19