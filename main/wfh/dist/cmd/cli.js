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
// tslint:disable: max-line-length
const commander_1 = __importDefault(require("commander"));
const chalk_1 = __importDefault(require("chalk"));
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
const log = log4js_1.getLogger('plink.cli');
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
            // tslint:disable-next-line: no-console
            console.log(misc_1.sexyFont('PLink').string);
            // tslint:disable-next-line: no-console
            console.log(program.helpInformation());
            // tslint:disable-next-line: no-console
            console.log(`\nversion: ${pk.version} ${misc_1.isDrcpSymlink ? chalk_1.default.yellow('(symlinked)') : ''} `);
            if (cliExtensions && cliExtensions.length > 0) {
                // tslint:disable-next-line: no-console
                console.log(`Found ${cliExtensions.length} command line extension` +
                    `${cliExtensions.length > 1 ? 's' : ''}: ${cliExtensions.map(pkg => chalk_1.default.blue(pkg)).join(', ')}`);
            }
            // tslint:disable-next-line: no-console
            console.log('\n', chalk_1.default.bgRed('Please determine a sub command listed above'));
            checkPlinkVersion();
            process.nextTick(() => process.exit(1));
        });
        program.addHelpText('before', misc_1.sexyFont('PLink').string);
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
            // tslint:disable-next-line: no-console
            console.log('Value of environment varaible "PLINK_SAFE" is true, skip loading extension');
        }
        overrider.appendGlobalOptions(false);
        try {
            yield program.parseAsync(process.argv, { from: 'node' });
        }
        catch (e) {
            log.error('Failed to execute command due to:' + chalk_1.default.redBright(e.message), e);
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
        .option('--lint-hook, --lh', 'Create a git push hook for code lint', false)
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log(misc_1.sexyFont('PLink').string);
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-init')))).default(initCmd.opts(), workspace);
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
        // tslint:disable-next-line: no-console
        console.log(misc_1.sexyFont('PLink').string);
        (yield Promise.resolve().then(() => __importStar(require('./cli-project')))).default({ isSrcDir: false }, action, projectDir);
    }));
    program.command('src [add|remove] [dir...]')
        .description('Associate, disassociate or list source directories, Plink will' +
        ' scan source code directories for packages', {
        'add|remove': 'Specify whether associate to a directory or disassociate from a directory',
        dir: 'specify multiple directories by seperating them with space character'
    })
        .action((action, dirs) => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log(misc_1.sexyFont('PLink').string);
        (yield Promise.resolve().then(() => __importStar(require('./cli-project')))).default({ isSrcDir: true }, action, dirs);
    }));
    /**
     * command lint
     */
    const lintCmd = program.command('lint [package...]')
        .description('source code style check', {
        package: exports.cliPackageArgDesc
    })
        .option('--pj <project1,project2...>', 'lint only TS code from specific project', utils_1.arrayOptionFn, [])
        .option('--fix', 'Run eslint/tslint fix, this could cause your source code being changed unexpectedly', false)
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-lint')))).default(packages, lintCmd.opts());
    }));
    lintCmd.usage(lintCmd.usage() +
        utils_1.hl('\ndrcp lint --pj <project-dir..> [--fix]') + ' Lint TS files from specific project directory\n' +
        utils_1.hl('\ndrcp lint <component-package..> [--fix]') + ' Lint TS files from specific component packages');
    /**
     * command clean
     */
    program.command('cs').alias('clear-symlinks')
        .description('Clear symlinks from node_modules')
        // .option('--only-symlink', 'Clean only symlinks, not dist directory', false)
        .action(() => __awaiter(this, void 0, void 0, function* () {
        const scanNodeModules = require('../utils/symlinks').default;
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
        (yield Promise.resolve().then(() => __importStar(require('./cli-bump')))).default(Object.assign(Object.assign({}, bumpCmd.opts()), { packages }));
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
    const updateDirCmd = program.command('update-dir')
        .description('Run this command to sync internal state when whole workspace directory is renamed or moved.\n' +
        'Because we store absolute path info of each package in internal state, and it will become invalid after you rename or move directory')
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-ls')))).checkDir(updateDirCmd.opts());
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
        utils_1.hlDesc('plink tsc\n') + ' Compile linked packages that are dependencies of current workspace (you shall run this command only in a workspace directory)\n' +
        utils_1.hlDesc('plink tsc <package..>\n') + ' Only compile specific packages by providing package name or short name\n' +
        utils_1.hlDesc('plink tsc [package...] -w\n') + ' Watch packages change and compile when new typescript file is changed or created\n\n');
    program.command('setting [package]')
        .description('List packages setting and values', { package: 'package name, only list setting for specific package' })
        .action((pkgName) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-setting')))).default(pkgName);
    }));
    /** command run*/
    const runCmd = program.command('run <target> [arguments...]')
        .description('Run specific module\'s exported function\n')
        .action((target, args) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('../package-runner')))).runSinglePackage({ target, args });
    }));
    runCmd.usage(runCmd.usage() + '\n' + chalk_1.default.green('plink run <target> [arguments...]\n') +
        `e.g.\n  ${chalk_1.default.green('plink run forbar-package/dist/file#function argument1 argument2...')}\n` +
        'execute exported function of TS/JS file from specific package or path\n\n' +
        '<target> - JS or TS file module path which can be resolved by Node.js (ts-node) followed by "#" and exported function name,\n' +
        'e.g. \n' +
        chalk_1.default.green('package-name/dist/foobar.js#myFunction') +
        ', function can be async which returns Promise\n' +
        chalk_1.default.green('node_modules/package-dir/dist/foobar.ts#myFunction') +
        ', relative or absolute path\n');
}
function loadExtensionCommand(program, ws, overrider) {
    if (ws == null)
        return [];
    package_runner_1.initInjectorForNodePackages();
    const availables = [];
    for (const pk of package_list_helper_1.packages4Workspace()) {
        const dr = pk.json.dr || pk.json.plink;
        if (dr == null || dr.cli == null)
            continue;
        const [pkgFilePath, funcName] = dr.cli.split('#');
        availables.push(pk.name);
        try {
            overrider.forPackage(pk, pkgFilePath, funcName);
        }
        catch (e) {
            // tslint:disable-next-line: no-console
            log.warn(`Failed to load command line extension in package ${pk.name}: "${e.message}"`, e);
        }
    }
    return availables;
}
function addNpmInstallOption(cmd) {
    cmd.option('--cache <npm-cache>', 'same as npm install option "--cache"')
        .option('--ci, --use-ci', 'Use "npm ci" instead of "npm install" to install dependencies', false)
        .option('--offline', 'same as npm option "--prefer-offline" during executing npm install/ci ', false)
        // .option('--yarn', 'Use Yarn to install component peer dependencies instead of using NPM', false)
        .option('--production', 'Add "--production" or "--only=prod" command line argument to "yarn/npm install"', false);
}
let skipVersionCheck = false;
process.on('beforeExit', () => {
    if (skipVersionCheck)
        return;
    skipVersionCheck = true;
    checkPlinkVersion();
});
function checkPlinkVersion() {
    const pkjson = path_1.default.resolve(misc_1.getRootDir(), 'package.json');
    if (fs_1.default.existsSync(pkjson)) {
        const json = JSON.parse(fs_1.default.readFileSync(pkjson, 'utf8'));
        let depVer = json.dependencies && json.dependencies['@wfh/plink'] ||
            json.devDependencies && json.devDependencies['@wfh/plink'];
        if (depVer == null) {
            // tslint:disable-next-line: no-console
            console.log(misc_1.boxString('Don\'t forget to add @wfh/plink in package.json as dependencies'));
            return;
        }
        if (depVer.endsWith('.tgz')) {
            const matched = /-(\d+\.\d+\.[^]+?)\.tgz$/.exec(depVer);
            if (matched == null)
                return;
            depVer = matched[1];
        }
        if (depVer && !semver_1.default.satisfies(pk.version, depVer)) {
            // tslint:disable-next-line: no-console
            console.log(misc_1.boxString(`Local installed Plink version ${chalk_1.default.cyan(pk.version)} does not match dependency version ${chalk_1.default.green(depVer)} in package.json, ` +
                `run command "${chalk_1.default.green('plink upgrade')}" to upgrade or downgrade to expected version`));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLGtDQUFrQztBQUNsQywwREFBa0M7QUFDbEMsa0RBQTBCO0FBSTFCLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFFdEUsd0NBQXlGO0FBRXpGLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLDZEQUFzRDtBQUN0RCxzREFBOEQ7QUFDOUQsbUNBQWtEO0FBQ2xELG1DQUFpQztBQUVqQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUM1QyxxQkFBcUI7QUFDckIsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUV0QixRQUFBLGlCQUFpQixHQUFHLHlFQUF5RTtJQUMxRyxnR0FBZ0csQ0FBQztBQUVqRyxTQUFzQixjQUFjLENBQUMsU0FBaUI7O1FBQ3BELE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLDREQUE0RDtRQUM1RCx3REFBYSxhQUFhLEdBQUMsQ0FBQztRQUM1QixpQ0FBaUM7UUFHakMsSUFBSSxhQUFtQyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQzdDLFdBQVcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxDQUFDLENBQUM7YUFDOUUsTUFBTSxDQUFDLENBQUMsSUFBYyxFQUFFLEVBQUU7WUFDekIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FB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QVksQ0FBQyxZQUFZLENBQUM7WUFDdkUsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdELElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNsQix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLGlFQUFpRSxDQUFDLENBQUMsQ0FBQztZQUMxRixPQUFPO1NBQ1I7UUFDRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxPQUFPLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELElBQUksT0FBTyxJQUFJLElBQUk7Z0JBQ2pCLE9BQU87WUFDVCxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JCO1FBQ0QsSUFBSSxNQUFNLElBQUksQ0FBQyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ25ELHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFTLENBQUMsaUNBQWlDLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsZUFBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CO2dCQUN4SixnQkFBZ0IsZUFBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsK0NBQStDLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY2ZvbnQuZC50c1wiIC8+XG4vLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0ICogYXMgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICcuLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgaXNEcmNwU3ltbGluaywgc2V4eUZvbnQsIGdldFJvb3REaXIsIGJveFN0cmluZywgcGxpbmtFbnYgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBfc2Nhbk5vZGVNb2R1bGVzIGZyb20gJy4uL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7Q29tbWFuZE92ZXJyaWRlcn0gZnJvbSAnLi9vdmVycmlkZS1jb21tYW5kZXInO1xuaW1wb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCB7aGwsIGhsRGVzYywgYXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7Q2xpT3B0aW9ucyBhcyBUc2NvbmZpZ0NsaU9wdGlvbnN9IGZyb20gJy4vY2xpLXRzY29uZmlnLWhvb2snO1xuY29uc3QgcGsgPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlLmpzb24nKTtcbi8vIGNvbnN0IFdJRFRIID0gMTMwO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGknKTtcblxuZXhwb3J0IGNvbnN0IGNsaVBhY2thZ2VBcmdEZXNjID0gJ1NpbmdsZSBvciBtdWx0aXBsZSBwYWNrYWdlIG5hbWVzLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCwnICtcbidpZiB0aGUgc2NvcGUgbmFtZSAodGhlIHBhcnQgYmV0d2VlbiBcIkBcIiBcIi9cIikgYXJlIGxpc3RlZCBjb25maWd1cmF0aW9uIHByb3BlcnR5IFwicGFja2FnZVNjb3Blc1wiJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvbW1hbmRzKHN0YXJ0VGltZTogbnVtYmVyKSB7XG4gIHByb2Nlc3MudGl0bGUgPSAnUGxpbmsnO1xuICAvLyBjb25zdCB7c3RhdGVGYWN0b3J5fTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgYXdhaXQgaW1wb3J0KCcuL2NsaS1zbGljZScpO1xuICAvLyBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcblxuXG4gIGxldCBjbGlFeHRlbnNpb25zOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgncGxpbmsnKVxuICAuZGVzY3JpcHRpb24oY2hhbGsuY3lhbignQSBwbHVnZ2FibGUgbW9ub3JlcG8gYW5kIG11bHRpLXJlcG8gbWFuYWdlbWVudCB0b29sJykpXG4gIC5hY3Rpb24oKGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhwcm9ncmFtLmhlbHBJbmZvcm1hdGlvbigpKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgXFxudmVyc2lvbjogJHtway52ZXJzaW9ufSAke2lzRHJjcFN5bWxpbmsgPyBjaGFsay55ZWxsb3coJyhzeW1saW5rZWQpJykgOiAnJ30gYCk7XG4gICAgaWYgKGNsaUV4dGVuc2lvbnMgJiYgY2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCAke2NsaUV4dGVuc2lvbnMubGVuZ3RofSBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uYCArXG4gICAgICBgJHtjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDEgPyAncycgOiAnJ306ICR7Y2xpRXh0ZW5zaW9ucy5tYXAocGtnID0+IGNoYWxrLmJsdWUocGtnKSkuam9pbignLCAnKX1gKTtcbiAgICB9XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbicsIGNoYWxrLmJnUmVkKCdQbGVhc2UgZGV0ZXJtaW5lIGEgc3ViIGNvbW1hbmQgbGlzdGVkIGFib3ZlJykpO1xuICAgIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBwcm9jZXNzLmV4aXQoMSkpO1xuICB9KTtcbiAgcHJvZ3JhbS5hZGRIZWxwVGV4dCgnYmVmb3JlJywgc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbiAgcHJvZ3JhbS5hZGRIZWxwQ29tbWFuZCgnaGVscCBbY29tbWFuZF0nLCAnc2hvdyBoZWxwIGluZm9ybWF0aW9uLCBzYW1lIGFzIFwiLWhcIi4gJyk7XG5cbiAgY29uc3Qgb3ZlcnJpZGVyID0gbmV3IENvbW1hbmRPdmVycmlkZXIocHJvZ3JhbSk7XG4gIGxldCB3c1N0YXRlOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQ7XG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBjb25zdCB7Z2V0U3RhdGU6IGdldFBrZ1N0YXRlLCB3b3Jrc3BhY2VLZXl9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtnTWdyO1xuICAgIHdzU3RhdGUgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKSk7XG4gICAgaWYgKHdzU3RhdGUgIT0gbnVsbCkge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgcHJvZ3JhbSA9PiB7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gc3RyID0+IGNoYWxrLmdyZWVuKHN0cik7XG4gICAgICAgIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW0pO1xuICAgICAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgc3ViQ29tYW5kcyhwcm9ncmFtKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgc3ViQ29tYW5kcyk7XG4gIH1cblxuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfU0FGRSAhPT0gJ3RydWUnKSB7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuY3lhbihzdHIpO1xuICAgIGNsaUV4dGVuc2lvbnMgPSBsb2FkRXh0ZW5zaW9uQ29tbWFuZChwcm9ncmFtLCB3c1N0YXRlLCBvdmVycmlkZXIpO1xuICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdWYWx1ZSBvZiBlbnZpcm9ubWVudCB2YXJhaWJsZSBcIlBMSU5LX1NBRkVcIiBpcyB0cnVlLCBza2lwIGxvYWRpbmcgZXh0ZW5zaW9uJyk7XG4gIH1cblxuICBvdmVycmlkZXIuYXBwZW5kR2xvYmFsT3B0aW9ucyhmYWxzZSk7XG4gIHRyeSB7XG4gICAgYXdhaXQgcHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndiwge2Zyb206ICdub2RlJ30pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gZXhlY3V0ZSBjb21tYW5kIGR1ZSB0bzonICsgY2hhbGsucmVkQnJpZ2h0KGUubWVzc2FnZSksIGUpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdWJDb21hbmRzKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKiBjb21tYW5kIGluaXRcbiAgICovXG4gIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2luaXQgW3dvcmstZGlyZWN0b3J5XScpLmFsaWFzKCdzeW5jJylcbiAgICAuZGVzY3JpcHRpb24oJ0luaXRpYWxpemUgYW5kIHVwZGF0ZSB3b3JrIGRpcmVjdG9yeSwgZ2VuZXJhdGUgYmFzaWMgY29uZmlndXJhdGlvbiBmaWxlcyBmb3IgcHJvamVjdCBhbmQgY29tcG9uZW50IHBhY2thZ2VzLCcgK1xuICAgICAgJyBjYWxjdWxhdGUgaG9pc3RlZCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcywgYW5kIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gY3VycmVudCBkaXJlY3RvcnkuJyxcbiAgICAgIHtcbiAgICAgICAgJ3dvcmstZGlyZWN0b3J5JzogJ0EgcmVsYXRpdmUgb3IgYWJvc29sdXRlIGRpcmVjdG9yeSBwYXRoLCB1c2UgXCIuXCIgdG8gZGV0ZXJtaW5lIGN1cnJlbnQgZGlyZWN0b3J5LFxcbiAgb21taXR0aW5nIHRoaXMgYXJndW1lbnQgbWVhbmluZzpcXG4nICtcbiAgICAgICAgICAnICAtIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIGFscmVhZHkgYSBcIndvcmsgZGlyZWN0b3J5XCIsIHVwZGF0ZSBpdC5cXG4nICtcbiAgICAgICAgICAnICAtIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgZGlyZWN0b3J5IChtYXliZSBhdCByZXBvXFwncyByb290IGRpcmVjdG9yeSksIHVwZGF0ZSB0aGUgbGF0ZXN0IHVwZGF0ZWQgd29yaycgK1xuICAgICAgICAgICcgZGlyZWN0b3J5LidcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLWYsIC0tZm9yY2UnLCAnRm9yY2UgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5LCB0aGlzIGlzIG5vdCBzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi1mXCIgJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1saW50LWhvb2ssIC0tbGgnLCAnQ3JlYXRlIGEgZ2l0IHB1c2ggaG9vayBmb3IgY29kZSBsaW50JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlPzogc3RyaW5nKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1pbml0JykpLmRlZmF1bHQoaW5pdENtZC5vcHRzKCkgYXMgdHAuSW5pdENtZE9wdGlvbnMgJiB0cC5OcG1DbGlPcHRpb24sIHdvcmtzcGFjZSk7XG4gICAgfSk7XG4gIGFkZE5wbUluc3RhbGxPcHRpb24oaW5pdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcHJvamVjdFxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdwcm9qZWN0IFthZGR8cmVtb3ZlXSBbZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZnJvbSBhc3NvY2lhdGVkIHByb2plY3RzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgQXNzb2NpYXRlIHRvIGEgcHJvamVjdCBvciBEaXNhc3NvY2lhdGUgZnJvbSBhIHByb2plY3QnLFxuICAgICAgICBkaXI6ICdTcGVjaWZ5IHRhcmdldCBwcm9qZWN0IHJlcG8gZGlyZWN0b3J5IChhYnNvbHV0ZSBwYXRoIG9yIHJlbGF0aXZlIHBhdGggdG8gY3VycmVudCBkaXJlY3RvcnkpJyArXG4gICAgICAgICAgJywgc3BlY2lmeSBtdWx0aXBsZSBwcm9qZWN0IGJ5IHNlcGVyYXRpbmcgdGhlbSB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIHByb2plY3REaXI6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiBmYWxzZX0sIGFjdGlvbiwgcHJvamVjdERpcik7XG4gICAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzcmMgW2FkZHxyZW1vdmVdIFtkaXIuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3Qgc291cmNlIGRpcmVjdG9yaWVzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZm9yIHBhY2thZ2VzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgYXNzb2NpYXRlIHRvIGEgZGlyZWN0b3J5IG9yIGRpc2Fzc29jaWF0ZSBmcm9tIGEgZGlyZWN0b3J5JyxcbiAgICAgICAgZGlyOiAnc3BlY2lmeSBtdWx0aXBsZSBkaXJlY3RvcmllcyBieSBzZXBlcmF0aW5nIHRoZW0gd2l0aCBzcGFjZSBjaGFyYWN0ZXInXG4gICAgICB9KVxuICAgICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIGRpcnM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiB0cnVlfSwgYWN0aW9uLCBkaXJzKTtcbiAgICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJywge1xuICAgICAgcGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2NcbiAgICB9KVxuICAgIC5vcHRpb24oJy0tcGogPHByb2plY3QxLHByb2plY3QyLi4uPicsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgcGFja2FnZXMgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICAgIH0pO1xuXG4gIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY3MnKS5hbGlhcygnY2xlYXItc3ltbGlua3MnKVxuICAgIC5kZXNjcmlwdGlvbignQ2xlYXIgc3ltbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAgIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2Nhbk5vZGVNb2R1bGVzOiB0eXBlb2YgX3NjYW5Ob2RlTW9kdWxlcyA9IHJlcXVpcmUoJy4uL3V0aWxzL3N5bWxpbmtzJykuZGVmYXVsdDtcbiAgICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcyh1bmRlZmluZWQsICdhbGwnKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCB1cGdyYWRlXG4gICAqL1xuICBjb25zdCB1cGdyYWRlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGdyYWRlJylcbiAgICAuYWxpYXMoJ2luc3RhbGwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVpbnN0YWxsIGxvY2FsIFBsaW5rIGFsb25nIHdpdGggb3RoZXIgZGVwZW5kZW5jaWVzLicgK1xuICAgICAgJyAoVW5saWtlIFwibnBtIGluc3RhbGxcIiB3aGljaCBkb2VzIG5vdCB3b3JrIHdpdGggbm9kZV9tb2R1bGVzIHRoYXQgbWlnaHQgY29udGFpbiBzeW1saW5rcyknKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW5rLXBsaW5rJykpLnJlaW5zdGFsbFdpdGhMaW5rZWRQbGluayh1cGdyYWRlQ21kLm9wdHMoKSBhcyB0cC5OcG1DbGlPcHRpb24pO1xuICAgIH0pO1xuICBhZGROcG1JbnN0YWxsT3B0aW9uKHVwZ3JhZGVDbWQpO1xuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ2RvY2tlcml6ZSA8d29ya3NwYWNlLWRpcj4nKVxuICAvLyAuZGVzY3JpcHRpb24oY2hhbGsuZ3JheSgnW1RCSV0gR2VuZXJhdGUgRG9ja2VyZmlsZSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeSwgYW5kIGdlbmVyYXRlIGRvY2tlciBpbWFnZScpKTtcblxuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ3BrZyA8d29ya3NwYWNlLWRpcj4nKVxuICAvLyAuZGVzY3JpcHRpb24oY2hhbGsuZ3JheSgnW1RCSV0gVXNlIFBrZyAoaHR0cHM6Ly9naXRodWIuY29tL3ZlcmNlbC9wa2cpIHRvIHBhY2thZ2UgTm9kZS5qcyBwcm9qZWN0IGludG8gYW4gZXhlY3V0YWJsZSAnKSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbHNcbiAgICovXG4gIGNvbnN0IGxpc3RDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xzJykuYWxpYXMoJ2xpc3QnKVxuICAgIC5vcHRpb24oJy1qLCAtLWpzb24nLCAnbGlzdCBsaW5rZWQgZGVwZW5kZW5jaWVzIGluIGZvcm0gb2YgSlNPTicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0taG9pc3QnLCAnbGlzdCBob2lzdGVkIHRyYW5zaXRpdmUgRGVwZW5kZW5jeSBpbmZvcm1hdGlvbicsIGZhbHNlKVxuICAgIC5kZXNjcmlwdGlvbignSWYgeW91IHdhbnQgdG8ga25vdyBob3cgbWFueSBwYWNrYWdlcyB3aWxsIGFjdHVhbGx5IHJ1biwgdGhpcyBjb21tYW5kIHByaW50cyBvdXQgYSBsaXN0IGFuZCB0aGUgcHJpb3JpdGllcywgaW5jbHVkaW5nIGluc3RhbGxlZCBwYWNrYWdlcycpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5kZWZhdWx0KGxpc3RDbWQub3B0cygpIGFzIGFueSk7XG4gICAgfSk7XG5cbiAgY29uc3QgYWRkQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdhZGQgPGRlcGVuZGVuY3kuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0FkZCBkZXBlbmRlbmN5IHRvIHBhY2thZ2UuanNvbiBmaWxlLCB3aXRoIG9wdGlvbiBcIi0tZGV2XCIgdG8gYWRkIGFzIFwiZGV2RGVwZW5kZW5jaWVzXCIsICcgK1xuICAgICAgJ3dpdGhvdXQgb3B0aW9uIFwiLS10b1wiIHRoaXMgY29tbWFuZCBhZGRzIGRlcGVuZGVuY3kgdG8gY3VycmVudCB3b3JrdHJlZSBzcGFjZVxcJ3MgcGFja2FnZS5qc29uIGZpbGUnLFxuICAgICAge1xuICAgICAgICBkZXBlbmRlbmN5OiAnZGVwZW5kZW5jeSBwYWNrYWdlIG5hbWUgaW4gZm9ybSBvZiBcIjxhIGxpbmtlZCBwYWNrYWdlIG5hbWUgd2l0aG91dCBzY29wZSBwYXJ0PlwiLCBcIjxwYWNrYWdlIG5hbWU+QDx2ZXJzaW9uPlwiLCAnXG4gICAgICB9KVxuICAgIC5vcHRpb24oJy0tdG8gPHBrZyBuYW1lIHwgd29ya3RyZWUgZGlyIHwgcGtnIGRpcj4nLCAnYWRkIGRlcGVuZGVuY3kgdG8gdGhlIHBhY2thZ2UuanNvbiBvZiBzcGVjaWZpYyBsaW5rZWQgc291cmNlIHBhY2thZ2UgYnkgbmFtZSBvciBkaXJlY3RvcnksIG9yIGEgd29ya3RyZWUgc3BhY2UgZGlyZWN0b3J5JylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWFkZC1wYWNrYWdlJykpLmFkZERlcGVuZGVuY3lUbyhwYWNrYWdlcywgYWRkQ21kLm9wdHMoKS50bywgYWRkQ21kLm9wdHMoKS5kZXYpO1xuICAgIH0pO1xuXG4gIGNvbnN0IHRzY29uZmlnQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2NvbmZpZycpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IHRzY29uZmlnLmpzb24sIGpzY29uZmlnLmpzb24gZmlsZXMgd2hpY2ggd2lsbCBiZSB1cGRhdGVkIGF1dG9tYXRpY2FsbHkgYnkgUGxpbmssIChhIG1vbm9yZXBvIG1lYW5zIHRoZXJlIGFyZSBub2RlIHBhY2thZ2VzIHdoaWNoIGFyZSBzeW1saW5rZWQgZnJvbSByZWFsIHNvdXJjZSBjb2RlIGRpcmVjdG9yeScgK1xuICAgICAgJywgaWYgeW91IGhhdmUgY3VzdG9taXplZCB0c2NvbmZpZy5qc29uIGZpbGUsIHRoaXMgY29tbWFuZCBoZWxwcyB0byB1cGRhdGUgXCJjb21waWxlck9wdGlvbnMucGF0aHNcIiBwcm9wZXJ0aWVzKScpXG4gICAgLm9wdGlvbignLS1ob29rIDxmaWxlPicsICdhZGQgdHNjb25maWcvanNjb25maWcgZmlsZSB0byBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdW5ob29rIDxmaWxlPicsICdyZW1vdmUgdHNjb25maWcvanNjb25maWcgZmlsZSBmcm9tIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1jbGVhciwtLXVuaG9vay1hbGwnLCAncmVtb3ZlIGFsbCB0c2NvbmZpZyBmaWxlcyBmcm9tIGZyb20gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXRzY29uZmlnLWhvb2snKSkuZG9Uc2NvbmZpZyh0c2NvbmZpZ0NtZC5vcHRzKCkgYXMgVHNjb25maWdDbGlPcHRpb25zKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogQnVtcCBjb21tYW5kXG4gICAqL1xuICBjb25zdCBidW1wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdidW1wIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdidW1wIHBhY2thZ2UuanNvbiB2ZXJzaW9uIG51bWJlciBmb3Igc3BlY2lmaWMgcGFja2FnZSwgc2FtZSBhcyBcIm5wbSB2ZXJzaW9uXCIgZG9lcycsXG4gICAgICB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnb25seSBidW1wIGNvbXBvbmVudCBwYWNrYWdlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLWksIC0taW5jcmUtdmVyc2lvbiA8dmFsdWU+JyxcbiAgICAgICd2ZXJzaW9uIGluY3JlbWVudCwgdmFsaWQgdmFsdWVzIGFyZTogbWFqb3IsIG1pbm9yLCBwYXRjaCwgcHJlcmVsZWFzZScsICdwYXRjaCcpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1idW1wJykpLmRlZmF1bHQoey4uLmJ1bXBDbWQub3B0cygpIGFzIHRwLkJ1bXBPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhidW1wQ21kKTtcbiAgLy8gYnVtcENtZC51c2FnZShidW1wQ21kLnVzYWdlKCkgKyAnXFxuJyArIGhsKCdwbGluayBidW1wIDxwYWNrYWdlPiAuLi4nKSArICcgdG8gcmVjdXJzaXZlbHkgYnVtcCBwYWNrYWdlLmpzb24gZnJvbSBtdWx0aXBsZSBkaXJlY3Rvcmllc1xcbicgK1xuICAvLyAgIGhsKCdwbGluayBidW1wIDxkaXI+IC1pIG1pbm9yJykgKyAnIHRvIGJ1bXAgbWlub3IgdmVyc2lvbiBudW1iZXIsIGRlZmF1bHQgaXMgcGF0Y2ggbnVtYmVyJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcGFja0NtZCA9IHByb2dyYW0uY29tbWFuZCgncGFjayBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignbnBtIHBhY2sgcGFrYWdlIGludG8gdGFyYmFsbCBmaWxlcyBhbmQgY2hhbmdlIHZlcnNpb24gdmFsdWUgZnJvbSByZWxhdGVkIHBhY2thZ2UuanNvbicsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLS1kaXIgPHBhY2thZ2UgZGlyZWN0b3J5PicsICdwYWNrIHBhY2thZ2VzIGJ5IHNwZWNpZnlpbmcgZGlyZWN0b3JpZXMnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncGFjayBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyPicsXG4gICAgICAncHJvamVjdCBkaXJlY3RvcmllcyB0byBiZSBsb29rZWQgdXAgZm9yIGFsbCBwYWNrYWdlcyB3aGljaCBuZWVkIHRvIGJlIHBhY2tlZCB0byB0YXJiYWxsIGZpbGVzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktcGFjaycpKS5wYWNrKHsuLi5wYWNrQ21kLm9wdHMoKSBhcyB0cC5QYWNrT3B0aW9ucywgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMocGFja0NtZCk7XG4gIHBhY2tDbWQudXNhZ2UocGFja0NtZC51c2FnZSgpICsgJ1xcbkJ5IGRlZmF1bHQsIHJ1biBcIm5wbSBwYWNrXCIgZm9yIGVhY2ggbGlua2VkIHBhY2thZ2Ugd2hpY2ggYXJlIGRlcGVuZGVuY2llcyBvZiBjdXJyZW50IHdvcmtzcGFjZScpO1xuXG4gIC8qKlxuICAgKiBQYWNrIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHB1Ymxpc2hDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3B1Ymxpc2ggW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ3J1biBucG0gcHVibGlzaCcsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLS1kaXIgPHBhY2thZ2UgZGlyZWN0b3J5PicsICdwdWJsaXNoIHBhY2thZ2VzIGJ5IHNwZWNpZnlpbmcgZGlyZWN0b3JpZXMnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JyxcbiAgICAncHJvamVjdCBkaXJlY3RvcmllcyB0byBiZSBsb29rZWQgdXAgZm9yIGFsbCBwYWNrYWdlcyB3aGljaCBuZWVkIHRvIGJlIHBhY2tlZCB0byB0YXJiYWxsIGZpbGVzJyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLXcsLS13b3Jrc3BhY2UgPHdvcmtzcGFjZS1kaXI+JywgJ3B1Ymxpc2ggcGFja2FnZXMgd2hpY2ggYXJlIGxpbmtlZCBhcyBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1wdWJsaWMnLCAnc2FtZSBhcyBcIm5wbSBwdWJsaXNoXCIgY29tbWFuZCBvcHRpb24gXCItLWFjY2VzcyBwdWJsaWNcIicsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktcGFjaycpKS5wdWJsaXNoKHsuLi5wdWJsaXNoQ21kLm9wdHMoKSBhcyB0cC5QdWJsaXNoT3B0aW9ucywgcGFja2FnZXN9KTtcbiAgICB9KTtcblxuXG4gIGNvbnN0IGFuYWx5c2lzQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdhbmFseXplIFtwa2ctbmFtZS4uLl0nKVxuICAgIC5hbGlhcygnYW5hbHlzZScpXG4gICAgLmRlc2NyaXB0aW9uKCdVc2UgVHlwZXNjcmlwdCBjb21waWxlciB0byBwYXJzZSBzb3VyY2UgY29kZSwgbGlzdCBkZXBlbmRlbmNlcyBieSBERlMgYWxnYXJpdGhtLCByZXN1bHQgaW5mb3JtYXRpb24gaW5jbHVkZXMnICtcbiAgICAgICc6IGN5Y2xpYyBkZXBlbmRlY2llcywgdW5yZXNvbHZhYmxlIGRlcGVuZGVuY2llcywgZXh0ZXJuYWwgZGVwZW5kZW5jaWVzLCBkZXBlbmRlbmNpZXMgYXJlIG5vdCB1bmRlciB0YXJnZXQgZGlyZWN0b3J5LicsIHtcbiAgICAgICdwa2ctbmFtZSc6ICd0aGUgbmFtZSBvZiB0YXJnZXQgc291cmNlIHBhY2thZ2UsIHRoZSBwYWNrYWdlIG11c3QgYmUgUGxpbmsgY29tcGxpYW50IHBhY2thZ2UsIHRoaXMgY29tbWFuZCB3aWxsIG9ubHkgJyArXG4gICAgICAgICdzY2FuIHNwZWNpYWwgc291cmNlIGNvZGUgZGlyZWN0b3J5IGxpa2UgXCJ0cy9cIiBhbmQgXCJpc29tL1wiIG9mIHRhcmdldCBwYWNrYWdlJ1xuICAgICAgfSlcbiAgICAub3B0aW9uKCcteCA8cmVnZXhwPicsICdJbmdvcmUgXCJtb2R1bGUgbmFtZVwiIHRoYXQgbWF0Y2hlcyBzcGVjaWZpYyBSZWd1bGFyIEV4cGVyc3Npb24nLCAnXFwuKGxlc3N8c2Nzc3xjc3MpJCcpXG4gICAgLm9wdGlvbignLWQsIC0tZGlyIDxkaXJlY3Rvcnk+JyxcbiAgICAgICcobXVsdGlwbGUpIGRldGVybWluZSB0YXJnZXQgZGlyZWN0b3J5LCBzY2FuIEpTL0pTWC9UUy9UU1ggZmlsZXMgdW5kZXIgdGFyZ2V0IGRpcmVjdG9yeScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy1mLCAtLWZpbGUgPGZpbGU+JyxcbiAgICAgICcobXVsdGlwbGUpIGRldGVybWluZSB0YXJnZXQgVFMvSlMoWCkgZmlsZXMgKG11bHRpcGxlIGZpbGUgd2l0aCBtb3JlIG9wdGlvbnMgXCItZiA8ZmlsZT4gLWYgPGdsb2I+XCIpJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLWonLCAnU2hvdyByZXN1bHQgaW4gSlNPTicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tdHNjb25maWcgPGZpbGU+JywgJ1VzZSBcImNvbXBpbGVyT3B0aW9ucy5wYXRoc1wiIHByb3BlcnR5IHRvIHJlc29sdmUgdHMvanMgZmlsZSBtb2R1bGUnKVxuICAgIC5vcHRpb24oJy0tYWxpYXMgPGFsaWFzLWV4cHJlc3M+JywgJ2EgSlNPTiBleHByZXNzLCBlLmcuIC0tYWxpYXMgXFwnW1wiXkAvKC4rKSRcIixcInNyYy8kMVwiXVxcJycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4vY2xpLWFuYWx5emUnKSkuZGVmYXVsdChwYWNrYWdlcywgYW5hbHlzaXNDbWQub3B0cygpIGFzIHRwLkFuYWx5emVPcHRpb25zKTtcbiAgICB9KTtcblxuICBhbmFseXNpc0NtZC51c2FnZShhbmFseXNpc0NtZC51c2FnZSgpICsgJ1xcbicgK1xuICAgICdlLmcuXFxuICAnICsgY2hhbGsuYmx1ZSgncGxpbmsgYW5hbHl6ZSAtZiBcInBhY2thZ2VzL2Zvb2JhcjEvKiovKlwiIC1mIHBhY2thZ2VzL2Zvb2JhcjIvdHMvbWFpbi50c1xcbiAgJyArXG4gICAgJ3BsaW5rIGFuYWx5emUgLWQgcGFja2FnZXMvZm9vYmFyMS9zcmMgLWQgcGFja2FnZXMvZm9vYmFyMi90cycpKTtcblxuICBjb25zdCB1cGRhdGVEaXJDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3VwZGF0ZS1kaXInKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHRoaXMgY29tbWFuZCB0byBzeW5jIGludGVybmFsIHN0YXRlIHdoZW4gd2hvbGUgd29ya3NwYWNlIGRpcmVjdG9yeSBpcyByZW5hbWVkIG9yIG1vdmVkLlxcbicgK1xuICAgICdCZWNhdXNlIHdlIHN0b3JlIGFic29sdXRlIHBhdGggaW5mbyBvZiBlYWNoIHBhY2thZ2UgaW4gaW50ZXJuYWwgc3RhdGUsIGFuZCBpdCB3aWxsIGJlY29tZSBpbnZhbGlkIGFmdGVyIHlvdSByZW5hbWUgb3IgbW92ZSBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZTogc3RyaW5nKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5jaGVja0Rpcih1cGRhdGVEaXJDbWQub3B0cygpIGFzIGFueSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIGNvbXBpbGUgc291cmNlIGNvZGUgZm9yIHRhcmdldCBwYWNrYWdlcywgJyArXG4gICAgJ3doaWNoIGhhdmUgYmVlbiBsaW5rZWQgdG8gY3VycmVudCB3b3JrIGRpcmVjdG9yeScsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnVHlwZXNjcmlwdCBjb21waWxlciB3YXRjaCBtb2RlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLy8gLm9wdGlvbignLS13cywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAnb25seSBpbmNsdWRlIHRob3NlIGxpbmtlZCBwYWNrYWdlcyB3aGljaCBhcmUgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAvLyAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdHN4LC0tanN4JywgJ2luY2x1ZGVzIFRTWCBmaWxlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tc291cmNlLW1hcCA8aW5saW5lfGZpbGU+JywgJ1NvdXJjZSBtYXAgc3R5bGU6IFwiaW5saW5lXCIgb3IgXCJmaWxlXCInLCAnaW5saW5lJylcbiAgICAub3B0aW9uKCctLW1lcmdlLC0tbWVyZ2UtdHNjb25maWcgPGZpbGU+JywgJ01lcmdlIGNvbXBpbGVyT3B0aW9ucyBcImJhc2VVcmxcIiBhbmQgXCJwYXRoc1wiIGZyb20gc3BlY2lmaWVkIHRzY29uZmlnIGZpbGUnKVxuICAgIC5vcHRpb24oJy0tY29wYXRoLCAtLWNvbXBpbGVyLW9wdGlvbnMtcGF0aHMgPHBhdGhNYXBKc29uPicsXG4gICAgICAnQWRkIG1vcmUgXCJwYXRoc1wiIHByb3BlcnR5IHRvIGNvbXBpbGVyIG9wdGlvbnMuICcgK1xuICAgICAgJyhlLmcuIC0tY29wYXRoIFxcJ3tcXFwiQC8qXCI6W1wiL1VzZXJzL3dvcmtlci9vY2Vhbi11aS9zcmMvKlwiXX1cXCcpJywgKHYsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52LnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAub3B0aW9uKCctLWNvIDxKU09OLXN0cmluZz4nLFxuICAgICAgYFBhcnRpYWwgY29tcGlsZXIgb3B0aW9ucyB0byBiZSBtZXJnZWQgKGV4Y2VwdCBcImJhc2VVcmxcIiksIFwicGF0aHNcIiBtdXN0IGJlIHJlbGF0aXZlIHRvICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBwbGlua0Vudi53b3JrRGlyKSB8fCAnY3VycmVudCBkaXJlY3RvcnknfWApXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBjb25zdCBvcHQgPSB0c2NDbWQub3B0cygpO1xuICAgICAgY29uc3QgdHNjID0gYXdhaXQgaW1wb3J0KCcuLi90cy1jbWQnKTtcblxuICAgICAgYXdhaXQgdHNjLnRzYyh7XG4gICAgICAgIHBhY2thZ2U6IHBhY2thZ2VzLFxuICAgICAgICBwcm9qZWN0OiBvcHQucHJvamVjdCxcbiAgICAgICAgd2F0Y2g6IG9wdC53YXRjaCxcbiAgICAgICAgc291cmNlTWFwOiBvcHQuc291cmNlTWFwLFxuICAgICAgICBqc3g6IG9wdC5qc3gsXG4gICAgICAgIGVkOiBvcHQuZW1pdERlY2xhcmF0aW9uT25seSxcbiAgICAgICAgcGF0aHNKc29uczogb3B0LmNvbXBpbGVyT3B0aW9uc1BhdGhzLFxuICAgICAgICBtZXJnZVRzY29uZmlnOiBvcHQubWVyZ2VUc2NvbmZpZyxcbiAgICAgICAgY29tcGlsZXJPcHRpb25zOiBvcHQuY28gPyBKU09OLnBhcnNlKG9wdC5jbykgOiB1bmRlZmluZWRcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gIHRzY0NtZC51c2FnZSh0c2NDbWQudXNhZ2UoKSArXG4gICAgJ1xcbkl0IGNvbXBpbGVzIFxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L3RzLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vZGlzdFwiLFxcbicgK1xuICAgICcgIG9yXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbS8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb21cIlxcbiBmb3IgYWxsIEB3ZmggcGFja2FnZXMuXFxuJyArXG4gICAgJ0kgc3VnZ2VzdCB0byBwdXQgTm9kZS5qcyBzaWRlIFRTIGNvZGUgaW4gZGlyZWN0b3J5IGB0c2AsIGFuZCBpc29tb3JwaGljIFRTIGNvZGUgKG1lYW5pbmcgaXQgcnVucyBpbiAnICtcbiAgICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcblxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjXFxuJykgKyAnIENvbXBpbGUgbGlua2VkIHBhY2thZ2VzIHRoYXQgYXJlIGRlcGVuZGVuY2llcyBvZiBjdXJyZW50IHdvcmtzcGFjZSAoeW91IHNoYWxsIHJ1biB0aGlzIGNvbW1hbmQgb25seSBpbiBhIHdvcmtzcGFjZSBkaXJlY3RvcnkpXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2MgPHBhY2thZ2UuLj5cXG4nKSArICcgT25seSBjb21waWxlIHNwZWNpZmljIHBhY2thZ2VzIGJ5IHByb3ZpZGluZyBwYWNrYWdlIG5hbWUgb3Igc2hvcnQgbmFtZVxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjIFtwYWNrYWdlLi4uXSAtd1xcbicpICsgJyBXYXRjaCBwYWNrYWdlcyBjaGFuZ2UgYW5kIGNvbXBpbGUgd2hlbiBuZXcgdHlwZXNjcmlwdCBmaWxlIGlzIGNoYW5nZWQgb3IgY3JlYXRlZFxcblxcbicpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnc2V0dGluZyBbcGFja2FnZV0nKVxuICAgIC5kZXNjcmlwdGlvbignTGlzdCBwYWNrYWdlcyBzZXR0aW5nIGFuZCB2YWx1ZXMnLCB7cGFja2FnZTogJ3BhY2thZ2UgbmFtZSwgb25seSBsaXN0IHNldHRpbmcgZm9yIHNwZWNpZmljIHBhY2thZ2UnfSlcbiAgICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXNldHRpbmcnKSkuZGVmYXVsdChwa2dOYW1lKTtcbiAgICB9KTtcbiAgICAvKiogY29tbWFuZCBydW4qL1xuICBjb25zdCBydW5DbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3J1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gc3BlY2lmaWMgbW9kdWxlXFwncyBleHBvcnRlZCBmdW5jdGlvblxcbicpXG4gICAgLmFjdGlvbihhc3luYyAodGFyZ2V0OiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9wYWNrYWdlLXJ1bm5lcicpKS5ydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9KTtcbiAgICB9KTtcblxuICBydW5DbWQudXNhZ2UocnVuQ21kLnVzYWdlKCkgKyAnXFxuJyArIGNoYWxrLmdyZWVuKCdwbGluayBydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl1cXG4nKSArXG4gICAgYGUuZy5cXG4gICR7Y2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biBmb3JiYXItcGFja2FnZS9kaXN0L2ZpbGUjZnVuY3Rpb24gYXJndW1lbnQxIGFyZ3VtZW50Mi4uLicpfVxcbmAgK1xuICAgICdleGVjdXRlIGV4cG9ydGVkIGZ1bmN0aW9uIG9mIFRTL0pTIGZpbGUgZnJvbSBzcGVjaWZpYyBwYWNrYWdlIG9yIHBhdGhcXG5cXG4nICtcbiAgICAnPHRhcmdldD4gLSBKUyBvciBUUyBmaWxlIG1vZHVsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXNvbHZlZCBieSBOb2RlLmpzICh0cy1ub2RlKSBmb2xsb3dlZCBieSBcIiNcIiBhbmQgZXhwb3J0ZWQgZnVuY3Rpb24gbmFtZSxcXG4nICtcbiAgICAnZS5nLiBcXG4nICtcbiAgICBjaGFsay5ncmVlbigncGFja2FnZS1uYW1lL2Rpc3QvZm9vYmFyLmpzI215RnVuY3Rpb24nKSArXG4gICAgJywgZnVuY3Rpb24gY2FuIGJlIGFzeW5jIHdoaWNoIHJldHVybnMgUHJvbWlzZVxcbicgK1xuICAgIGNoYWxrLmdyZWVuKCdub2RlX21vZHVsZXMvcGFja2FnZS1kaXIvZGlzdC9mb29iYXIudHMjbXlGdW5jdGlvbicpICtcbiAgICAnLCByZWxhdGl2ZSBvciBhYnNvbHV0ZSBwYXRoXFxuJyk7XG5cblxufVxuXG5mdW5jdGlvbiBsb2FkRXh0ZW5zaW9uQ29tbWFuZChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCwgd3M6IHBrZ01nci5Xb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZCwgb3ZlcnJpZGVyOiBDb21tYW5kT3ZlcnJpZGVyKTogc3RyaW5nW10ge1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm4gW107XG4gIGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuICBjb25zdCBhdmFpbGFibGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHBrIG9mIHBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgY29uc3QgZHIgPSBway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbms7XG4gICAgaWYgKGRyID09IG51bGwgfHwgZHIuY2xpID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCBbcGtnRmlsZVBhdGgsIGZ1bmNOYW1lXSA9IChkci5jbGkgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuXG4gICAgYXZhaWxhYmxlcy5wdXNoKHBrLm5hbWUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKHBrLCBwa2dGaWxlUGF0aCwgZnVuY05hbWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlfVwiYCwgZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhdmFpbGFibGVzO1xufVxuXG5mdW5jdGlvbiBhZGROcG1JbnN0YWxsT3B0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgY21kLm9wdGlvbignLS1jYWNoZSA8bnBtLWNhY2hlPicsICdzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi0tY2FjaGVcIicpXG4gIC5vcHRpb24oJy0tY2ksIC0tdXNlLWNpJywgJ1VzZSBcIm5wbSBjaVwiIGluc3RlYWQgb2YgXCJucG0gaW5zdGFsbFwiIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tb2ZmbGluZScsICdzYW1lIGFzIG5wbSBvcHRpb24gXCItLXByZWZlci1vZmZsaW5lXCIgZHVyaW5nIGV4ZWN1dGluZyBucG0gaW5zdGFsbC9jaSAnLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS15YXJuJywgJ1VzZSBZYXJuIHRvIGluc3RhbGwgY29tcG9uZW50IHBlZXIgZGVwZW5kZW5jaWVzIGluc3RlYWQgb2YgdXNpbmcgTlBNJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tcHJvZHVjdGlvbicsICdBZGQgXCItLXByb2R1Y3Rpb25cIiBvciBcIi0tb25seT1wcm9kXCIgY29tbWFuZCBsaW5lIGFyZ3VtZW50IHRvIFwieWFybi9ucG0gaW5zdGFsbFwiJywgZmFsc2UpO1xufVxuXG5cbmxldCBza2lwVmVyc2lvbkNoZWNrID0gZmFsc2U7XG5wcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgKCkgPT4ge1xuICBpZiAoc2tpcFZlcnNpb25DaGVjaylcbiAgICByZXR1cm47XG4gIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICBjaGVja1BsaW5rVmVyc2lvbigpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrUGxpbmtWZXJzaW9uKCkge1xuICBjb25zdCBwa2pzb24gPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAncGFja2FnZS5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBranNvbikpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtqc29uLCAndXRmOCcpKTtcbiAgICBsZXQgZGVwVmVyOiBzdHJpbmcgPSBqc29uLmRlcGVuZGVuY2llcyAmJiBqc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddIHx8XG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyAmJiBqc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgIGlmIChkZXBWZXIgPT0gbnVsbCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ0RvblxcJ3QgZm9yZ2V0IHRvIGFkZCBAd2ZoL3BsaW5rIGluIHBhY2thZ2UuanNvbiBhcyBkZXBlbmRlbmNpZXMnKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChkZXBWZXIuZW5kc1dpdGgoJy50Z3onKSkge1xuICAgICAgY29uc3QgbWF0Y2hlZCA9IC8tKFxcZCtcXC5cXGQrXFwuW15dKz8pXFwudGd6JC8uZXhlYyhkZXBWZXIpO1xuICAgICAgaWYgKG1hdGNoZWQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgZGVwVmVyID0gbWF0Y2hlZFsxXTtcbiAgICB9XG4gICAgaWYgKGRlcFZlciAmJiAhc2VtdmVyLnNhdGlzZmllcyhway52ZXJzaW9uLCBkZXBWZXIpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhgTG9jYWwgaW5zdGFsbGVkIFBsaW5rIHZlcnNpb24gJHtjaGFsay5jeWFuKHBrLnZlcnNpb24pfSBkb2VzIG5vdCBtYXRjaCBkZXBlbmRlbmN5IHZlcnNpb24gJHtjaGFsay5ncmVlbihkZXBWZXIpfSBpbiBwYWNrYWdlLmpzb24sIGAgK1xuICAgICAgICBgcnVuIGNvbW1hbmQgXCIke2NoYWxrLmdyZWVuKCdwbGluayB1cGdyYWRlJyl9XCIgdG8gdXBncmFkZSBvciBkb3duZ3JhZGUgdG8gZXhwZWN0ZWQgdmVyc2lvbmApKTtcbiAgICB9XG4gIH1cbn1cblxuIl19