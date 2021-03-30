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
            wsState = getPkgState().workspaces.get(workspaceKey(process.cwd()));
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
        .option('-f, --force', 'Force run "npm install" in specific workspace directory', false)
        .option('--lint-hook, --lh', 'Create a git push hook for code lint', false)
        // .option('--yarn', 'Use Yarn to install component peer dependencies instead of using NPM', false)
        .option('--production', 'Add "--production" or "--only=prod" command line argument to "yarn/npm install"', false)
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log(misc_1.sexyFont('PLink').string);
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-init')))).default(initCmd.opts(), workspace);
    }));
    /**
     * command project
     */
    program.command('project [add|remove] [project-dir...]')
        .description('Associate, disassociate or list associated project folders, late on Plink will' +
        'Scan source code directories from associated projects', {
        'add|remove': 'Determine whether Associate to a project or Disassociate from a project',
        'project-dir': 'Determine target project repo directory (absolute path or relative path to current directory)' +
            ', determine multiple project by seperating with space character'
    })
        .action((action, projectDir) => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log(misc_1.sexyFont('PLink').string);
        (yield Promise.resolve().then(() => __importStar(require('./cli-project')))).default(action, projectDir);
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
        .description('Clear symlinks from node_modules, do this before run "npm install" in root directory, if there is any symlinks in current node_modules')
        // .option('--only-symlink', 'Clean only symlinks, not dist directory', false)
        .action(() => __awaiter(this, void 0, void 0, function* () {
        const scanNodeModules = require('../utils/symlinks').default;
        yield scanNodeModules('all');
    }));
    /**
     * command upgrade
     */
    program.command('upgrade')
        .alias('install')
        .description('Reinstall local Plink along with other dependencies.' +
        ' (Unlike "npm install" which does not work with node_modules that might contain symlinks)')
        .action(() => __awaiter(this, void 0, void 0, function* () {
        skipVersionCheck = true;
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-link-plink')))).reinstallWithLinkedPlink();
    }));
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
    const addCmd = program.command('add [dependency...]')
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
        .description('Use Typescript compiler to parse source code, list dependences by DFS algarithm', {
        'pkg-name': 'the name of target source package, the package must be Plink compliant package, this command will only ' +
            'scan special source code directory like "ts/" and "isom/" of target package'
    })
        .option('-d, --dir <directory>', '(multiple) determine target directory, scan JS/JSX/TS/TSX files under target directory', utils_1.arrayOptionFn, [])
        .option('-f, --file <file>', '(multiple) determine target TS/JS(X) files (multiple file with more options "-f <file> -f <glob>")', utils_1.arrayOptionFn, [])
        .option('-j', 'Show result in JSON', false)
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
        .option('--jsx', 'includes TSX file', false)
        .option('--ed, --emitDeclarationOnly', 'Typescript compiler option: --emitDeclarationOnly.\nOnly emit ‘.d.ts’ declaration files.', false)
        .option('--source-map <inline|file>', 'Source map style: "inline" or "file"', 'inline')
        .option('--copath, --compiler-options-paths <pathMapJson>', 'Add more "paths" property to compiler options. ' +
        '(e.g. --copath \'{\"@/*":["/Users/worker/ocean-ui/src/*"]}\')', (v, prev) => {
        prev.push(...v.split(','));
        return prev;
    }, [])
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
            pathsJsons: opt.compilerOptionsPaths
        });
    }));
    tscCmd.usage(tscCmd.usage() + '\n' + 'Run gulp-typescript to compile Node.js side Typescript files.\n\n' +
        'It compiles \n  "<package-directory>/ts/**/*.ts" to "<package-directory>/dist",\n' +
        '  or\n  "<package-directory>/isom/**/*.ts" to "<package-directory>/isom"\n for all @wfh packages.\n' +
        'I suggest to put Node.js side TS code in directory `ts`, and isomorphic TS code (meaning it runs in ' +
        'both Node.js and Browser) in directory `isom`.\n' +
        utils_1.hlDesc('plink tsc\n') + 'Compile linked packages that are dependencies of current workspace (you shall run this command only in a workspace directory)\n' +
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
        const dr = pk.json.dr;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLGtDQUFrQztBQUNsQywwREFBa0M7QUFDbEMsa0RBQTBCO0FBSTFCLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFFdEUsd0NBQStFO0FBRS9FLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLDZEQUFzRDtBQUN0RCxzREFBOEQ7QUFDOUQsbUNBQWtEO0FBQ2xELG1DQUFpQztBQUVqQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUM1QyxxQkFBcUI7QUFDckIsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUV0QixRQUFBLGlCQUFpQixHQUFHLHlFQUF5RTtJQUMxRyxnR0FBZ0csQ0FBQztBQUVqRyxTQUFzQixjQUFjLENBQUMsU0FBaUI7O1FBQ3BELE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLDREQUE0RDtRQUM1RCx3REFBYSxhQUFhLEdBQUMsQ0FBQztRQUM1QixpQ0FBaUM7UUFHakMsSUFBSSxhQUFtQyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQzdDLFdBQVcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxDQUFDLENBQUM7YUFDOUUsTUFBTSxDQUFDLENBQUMsSUFBYyxFQUFFLEVBQUU7WUFDekIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sSUFBSSxvQkFBYSxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzdGLElBQUksYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM3Qyx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxhQUFhLENBQUMsTUFBTSx5QkFBeUI7b0JBQ2xFLEdBQUcsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNwRztZQUNELHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxlQUFLLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUMsQ0FBQztZQUM5RSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXhELE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUN4RSxPQUFPLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLHVDQUF1QyxDQUFDLENBQUM7UUFFbEYsTUFBTSxTQUFTLEdBQUcsSUFBSSxxQ0FBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoRCxJQUFJLE9BQTBDLENBQUM7UUFDL0MsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxNQUFNLEVBQUU7WUFDckMsTUFBTSxFQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFDLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFrQixDQUFDO1lBQ3pGLE9BQU8sR0FBRyxXQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtnQkFDbkIsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUU7b0JBQ25DLFNBQVMsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxlQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUMvQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDOUIsU0FBUyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7b0JBQ2pDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDLENBQUM7YUFDSjtpQkFBTTtnQkFDTCxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQzthQUN4QztTQUNGO2FBQU07WUFDTCxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztTQUN4QztRQUVELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFO1lBQ3JDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlDLGFBQWEsR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xFLFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1NBQ2xDO2FBQU07WUFDTCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0RUFBNEUsQ0FBQyxDQUFDO1NBQzNGO1FBRUQsU0FBUyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLElBQUk7WUFDRixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO1NBQ3hEO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxHQUFHLGVBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9FLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7SUFDSCxDQUFDO0NBQUE7QUFuRUQsd0NBbUVDO0FBRUQsU0FBUyxVQUFVLENBQUMsT0FBMEI7SUFDNUM7T0FDRztJQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1NBQ25FLFdBQVcsQ0FBQyw4R0FBOEc7UUFDekgseUZBQXlGLEVBQ3pGO1FBQ0UsZ0JBQWdCLEVBQUUsdUhBQXVIO1lBQ3ZJLHNFQUFzRTtZQUN0RSxvSEFBb0g7WUFDcEgsYUFBYTtLQUNoQixDQUFDO1NBQ0gsTUFBTSxDQUFDLGFBQWEsRUFBRSx5REFBeUQsRUFBRSxLQUFLLENBQUM7U0FDdkYsTUFBTSxDQUFDLG1CQUFtQixFQUFFLHNDQUFzQyxFQUFFLEtBQUssQ0FBQztRQUMzRSxtR0FBbUc7U0FDbEcsTUFBTSxDQUFDLGNBQWMsRUFBRSxpRkFBaUYsRUFBRSxLQUFLLENBQUM7U0FDaEgsTUFBTSxDQUFDLENBQU8sU0FBa0IsRUFBRSxFQUFFO1FBQ25DLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsd0RBQWEsWUFBWSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBdUIsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM3RixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUw7O09BRUc7SUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDO1NBQ3JELFdBQVcsQ0FBQyxnRkFBZ0Y7UUFDM0YsdURBQXVELEVBQUU7UUFDdkQsWUFBWSxFQUFFLHlFQUF5RTtRQUN2RixhQUFhLEVBQUUsK0ZBQStGO1lBQzVHLGlFQUFpRTtLQUNwRSxDQUFDO1NBQ0gsTUFBTSxDQUFDLENBQU8sTUFBZ0MsRUFBRSxVQUFvQixFQUFFLEVBQUU7UUFDdkUsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzlELENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTDs7T0FFRztJQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7U0FDakQsV0FBVyxDQUFDLHlCQUF5QixFQUFFO1FBQ3RDLE9BQU8sRUFBRSx5QkFBaUI7S0FDM0IsQ0FBQztTQUNELE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSx5Q0FBeUMsRUFBRSxxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUNuRyxNQUFNLENBQUMsT0FBTyxFQUFFLHFGQUFxRixFQUFFLEtBQUssQ0FBQztTQUM3RyxNQUFNLENBQUMsQ0FBTSxRQUFRLEVBQUMsRUFBRTtRQUN2QixNQUFNLENBQUMsd0RBQWEsWUFBWSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQVMsQ0FBQyxDQUFDO0lBQzlFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTCxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUU7UUFDM0IsVUFBRSxDQUFDLDBDQUEwQyxDQUFDLEdBQUcsa0RBQWtEO1FBQ25HLFVBQUUsQ0FBQywyQ0FBMkMsQ0FBQyxHQUFHLGlEQUFpRCxDQUFDLENBQUM7SUFFdkc7O09BRUc7SUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztTQUMxQyxXQUFXLENBQUMsd0lBQXdJLENBQUM7UUFDdEosOEVBQThFO1NBQzdFLE1BQU0sQ0FBQyxHQUFTLEVBQUU7UUFDakIsTUFBTSxlQUFlLEdBQTRCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUN0RixNQUFNLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUw7O09BRUc7SUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUN2QixLQUFLLENBQUMsU0FBUyxDQUFDO1NBQ2hCLFdBQVcsQ0FBQyxzREFBc0Q7UUFDakUsMkZBQTJGLENBQUM7U0FDN0YsTUFBTSxDQUFDLEdBQVMsRUFBRTtRQUNqQixnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDeEIsTUFBTSxDQUFDLHdEQUFhLGtCQUFrQixHQUFDLENBQUMsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0lBQ3RFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTCwrQ0FBK0M7SUFDL0MscUhBQXFIO0lBRXJILHlDQUF5QztJQUN6Qyw0SEFBNEg7SUFFNUg7O09BRUc7SUFDSCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7U0FDaEQsTUFBTSxDQUFDLFlBQVksRUFBRSwwQ0FBMEMsRUFBRSxLQUFLLENBQUM7U0FDdkUsTUFBTSxDQUFDLFNBQVMsRUFBRSxnREFBZ0QsRUFBRSxLQUFLLENBQUM7U0FDMUUsV0FBVyxDQUFDLDBJQUEwSSxDQUFDO1NBQ3ZKLE1BQU0sQ0FBQyxHQUFTLEVBQUU7UUFDakIsTUFBTSxDQUFDLHdEQUFhLFVBQVUsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQVMsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDO1NBQ2xELFdBQVcsQ0FBQyx3RkFBd0Y7UUFDbkcsbUdBQW1HLEVBQ25HO1FBQ0UsVUFBVSxFQUFFLCtHQUErRztLQUM1SCxDQUFDO1NBQ0gsTUFBTSxDQUFDLDBDQUEwQyxFQUFFLDBIQUEwSCxDQUFDO1NBQzlLLE1BQU0sQ0FBQyxDQUFPLFFBQWtCLEVBQUUsRUFBRTtRQUNuQyxNQUFNLENBQUMsd0RBQWEsbUJBQW1CLEdBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0csQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVMLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1NBQzVDLFdBQVcsQ0FBQyxxTEFBcUw7UUFDaE0sK0dBQStHLENBQUM7U0FDakgsTUFBTSxDQUFDLGVBQWUsRUFBRSxxRUFBcUUsRUFBRSxxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUNqSCxNQUFNLENBQUMsaUJBQWlCLEVBQUUsMEVBQTBFLEVBQUUscUJBQWEsRUFBRSxFQUFFLENBQUM7U0FDeEgsTUFBTSxDQUFDLHNCQUFzQixFQUFFLDJFQUEyRSxFQUFFLEtBQUssQ0FBQztTQUNsSCxNQUFNLENBQUMsR0FBUyxFQUFFO1FBQ2pCLENBQUMsd0RBQWEscUJBQXFCLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUF3QixDQUFDLENBQUM7SUFDN0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVMOztPQUVHO0lBQ0gsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztTQUNqRCxXQUFXLENBQUMsbUZBQW1GLEVBQzlGLEVBQUMsT0FBTyxFQUFFLHlCQUFpQixFQUFDLENBQUM7U0FDOUIsTUFBTSxDQUFXLG1DQUFtQyxFQUFFLDhEQUE4RCxFQUNuSCxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFBQyxPQUFPLElBQUksQ0FBQztJQUM5QyxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ1AsTUFBTSxDQUFDLDZCQUE2QixFQUNuQyxzRUFBc0UsRUFBRSxPQUFPLENBQUM7U0FDakYsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1FBQ25DLENBQUMsd0RBQWEsWUFBWSxHQUFDLENBQUMsQ0FBQyxPQUFPLGlDQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQW9CLEtBQUUsUUFBUSxJQUFFLENBQUM7SUFDeEYsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLDhCQUE4QjtJQUM5Qiw0SUFBNEk7SUFDNUksaUdBQWlHO0lBRWpHOztPQUVHO0lBQ0gsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztTQUNqRCxXQUFXLENBQUMsdUZBQXVGLEVBQUUsRUFBQyxPQUFPLEVBQUUseUJBQWlCLEVBQUMsQ0FBQztTQUNsSSxNQUFNLENBQUMsMkJBQTJCLEVBQUUseUNBQXlDLEVBQUUscUJBQWEsRUFBRSxFQUFFLENBQUM7U0FDakcsTUFBTSxDQUFDLGdDQUFnQyxFQUFFLHFFQUFxRSxFQUM3RyxxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUNuQixNQUFNLENBQUMsK0JBQStCLEVBQ3JDLCtGQUErRixFQUMvRixxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUNuQixNQUFNLENBQUMsQ0FBTyxRQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxDQUFDLHdEQUFhLFlBQVksR0FBQyxDQUFDLENBQUMsSUFBSSxpQ0FBSyxPQUFPLENBQUMsSUFBSSxFQUFvQixLQUFFLFFBQVEsSUFBRSxDQUFDO0lBQzNGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCw4QkFBOEI7SUFDOUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsa0dBQWtHLENBQUMsQ0FBQztJQUVwSTs7T0FFRztJQUNILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUM7U0FDdkQsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEVBQUMsT0FBTyxFQUFFLHlCQUFpQixFQUFDLENBQUM7U0FDNUQsTUFBTSxDQUFDLDJCQUEyQixFQUFFLDRDQUE0QyxFQUFFLHFCQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ3BHLE1BQU0sQ0FBVyxtQ0FBbUMsRUFDckQsK0ZBQStGLEVBQzdGLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUFDLE9BQU8sSUFBSSxDQUFDO0lBQzlDLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDUCxNQUFNLENBQUMsZ0NBQWdDLEVBQUUsd0VBQXdFLEVBQ2hILHFCQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ25CLE1BQU0sQ0FBQyxVQUFVLEVBQUUsd0RBQXdELEVBQUUsS0FBSyxDQUFDO1NBQ25GLE1BQU0sQ0FBQyxDQUFPLFFBQWtCLEVBQUUsRUFBRTtRQUNuQyxNQUFNLENBQUMsd0RBQWEsWUFBWSxHQUFDLENBQUMsQ0FBQyxPQUFPLGlDQUFLLFVBQVUsQ0FBQyxJQUFJLEVBQXVCLEtBQUUsUUFBUSxJQUFFLENBQUM7SUFDcEcsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUdMLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUM7U0FDekQsS0FBSyxDQUFDLFNBQVMsQ0FBQztTQUNoQixXQUFXLENBQUMsaUZBQWlGLEVBQUU7UUFDOUYsVUFBVSxFQUFFLHlHQUF5RztZQUNuSCw2RUFBNkU7S0FDOUUsQ0FBQztTQUNILE1BQU0sQ0FBQyx1QkFBdUIsRUFDN0Isd0ZBQXdGLEVBQUUscUJBQWEsRUFBRSxFQUFFLENBQUM7U0FDN0csTUFBTSxDQUFDLG1CQUFtQixFQUN6QixvR0FBb0csRUFBRSxxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUN6SCxNQUFNLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFLEtBQUssQ0FBQztTQUMxQyxNQUFNLENBQUMsQ0FBTyxRQUFrQixFQUFFLEVBQUU7UUFDbkMsT0FBTyxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUF1QixDQUFDLENBQUM7SUFDcEcsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVMLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUk7UUFDMUMsVUFBVSxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsNkVBQTZFO1FBQ3JHLDhEQUE4RCxDQUFDLENBQUMsQ0FBQztJQUVuRSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztTQUMvQyxXQUFXLENBQUMsK0ZBQStGO1FBQzVHLHNJQUFzSSxDQUFDO1NBQ3RJLE1BQU0sQ0FBQyxDQUFPLFNBQWlCLEVBQUUsRUFBRTtRQUNsQyxNQUFNLENBQUMsd0RBQWEsVUFBVSxHQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7SUFDeEUsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNQLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLE9BQTBCO0lBQ3REOztPQUVHO0lBQ0gsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztTQUMvQyxXQUFXLENBQUMsc0VBQXNFO1FBQ25GLGtEQUFrRCxFQUFFLEVBQUMsT0FBTyxFQUFFLHlCQUFpQixFQUFDLENBQUM7U0FDaEYsTUFBTSxDQUFDLGFBQWEsRUFBRSxnQ0FBZ0MsRUFBRSxLQUFLLENBQUM7U0FDOUQsTUFBTSxDQUFDLG1DQUFtQyxFQUFFLHlDQUF5QyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ2xHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFBQyxPQUFPLElBQUksQ0FBQztJQUMxQyxDQUFDLEVBQUUsRUFBYyxDQUFDO1FBQ2xCLGdJQUFnSTtRQUNoSSx1QkFBdUI7U0FDdEIsTUFBTSxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxLQUFLLENBQUM7U0FDM0MsTUFBTSxDQUFDLDZCQUE2QixFQUFFLDBGQUEwRixFQUFFLEtBQUssQ0FBQztTQUN4SSxNQUFNLENBQUMsNEJBQTRCLEVBQUUsc0NBQXNDLEVBQUUsUUFBUSxDQUFDO1NBQ3RGLE1BQU0sQ0FBQyxrREFBa0QsRUFDeEQsaURBQWlEO1FBQ2pELCtEQUErRCxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQzdFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFBQyxPQUFPLElBQUksQ0FBQztJQUMxQyxDQUFDLEVBQUUsRUFBYyxDQUFDO1NBQ2pCLE1BQU0sQ0FBQyxDQUFPLFFBQWtCLEVBQUUsRUFBRTtRQUNuQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDMUIsTUFBTSxHQUFHLEdBQUcsd0RBQWEsV0FBVyxHQUFDLENBQUM7UUFFdEMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ1osT0FBTyxFQUFFLFFBQVE7WUFDakIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO1lBQ3BCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSztZQUNoQixTQUFTLEVBQUUsR0FBRyxDQUFDLFNBQVM7WUFDeEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHO1lBQ1osRUFBRSxFQUFFLEdBQUcsQ0FBQyxtQkFBbUI7WUFDM0IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxvQkFBb0I7U0FDckMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVMLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksR0FBRyxtRUFBbUU7UUFDdEcsbUZBQW1GO1FBQ25GLHFHQUFxRztRQUNyRyxzR0FBc0c7UUFDdEcsa0RBQWtEO1FBQ2xELGNBQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxpSUFBaUk7UUFDekosY0FBTSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsMkVBQTJFO1FBQy9HLGNBQU0sQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLHVGQUF1RixDQUFDLENBQUM7SUFFbkksT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztTQUNqQyxXQUFXLENBQUMsa0NBQWtDLEVBQUUsRUFBQyxPQUFPLEVBQUUsc0RBQXNELEVBQUMsQ0FBQztTQUNsSCxNQUFNLENBQUMsQ0FBTyxPQUFlLEVBQUUsRUFBRTtRQUNoQyxNQUFNLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILGlCQUFpQjtJQUNuQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDO1NBQzFELFdBQVcsQ0FBQyw0Q0FBNEMsQ0FBQztTQUN6RCxNQUFNLENBQUMsQ0FBTyxNQUFjLEVBQUUsSUFBYyxFQUFFLEVBQUU7UUFDL0MsTUFBTSxDQUFDLHdEQUFhLG1CQUFtQixHQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLEdBQUcsZUFBSyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQztRQUNyRixXQUFXLGVBQUssQ0FBQyxLQUFLLENBQUMsb0VBQW9FLENBQUMsSUFBSTtRQUNoRywyRUFBMkU7UUFDM0UsK0hBQStIO1FBQy9ILFNBQVM7UUFDVCxlQUFLLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxDQUFDO1FBQ3JELGlEQUFpRDtRQUNqRCxlQUFLLENBQUMsS0FBSyxDQUFDLG9EQUFvRCxDQUFDO1FBQ2pFLCtCQUErQixDQUFDLENBQUM7QUFHckMsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsT0FBMEIsRUFBRSxFQUFxQyxFQUFFLFNBQTJCO0lBQzFILElBQUksRUFBRSxJQUFJLElBQUk7UUFDWixPQUFPLEVBQUUsQ0FBQztJQUNaLDRDQUEyQixFQUFFLENBQUM7SUFDOUIsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFDO0lBQ2hDLEtBQUssTUFBTSxFQUFFLElBQUksd0NBQWtCLEVBQUUsRUFBRTtRQUNyQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUN0QixJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJO1lBQzlCLFNBQVM7UUFDWCxNQUFNLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxHQUFJLEVBQUUsQ0FBQyxHQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTlELFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpCLElBQUk7WUFDRixTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDakQ7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLHVDQUF1QztZQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUM1RjtLQUNGO0lBQ0QsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQUdELElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO0FBQzdCLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUM1QixJQUFJLGdCQUFnQjtRQUNsQixPQUFPO0lBQ1QsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0lBQ3hCLGlCQUFpQixFQUFFLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLGlCQUFpQjtJQUN4QixNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUMxRCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDekIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3pELElBQUksTUFBTSxHQUFXLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7WUFDdkUsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdELElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNsQix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLGlFQUFpRSxDQUFDLENBQUMsQ0FBQztZQUMxRixPQUFPO1NBQ1I7UUFDRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxPQUFPLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELElBQUksT0FBTyxJQUFJLElBQUk7Z0JBQ2pCLE9BQU87WUFDVCxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JCO1FBQ0QsSUFBSSxNQUFNLElBQUksQ0FBQyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ25ELHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFTLENBQUMsaUNBQWlDLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsZUFBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CO2dCQUN4SixnQkFBZ0IsZUFBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsK0NBQStDLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY2ZvbnQuZC50c1wiIC8+XG4vLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0ICogYXMgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICcuLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgaXNEcmNwU3ltbGluaywgc2V4eUZvbnQsIGdldFJvb3REaXIsIGJveFN0cmluZyB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IF9zY2FuTm9kZU1vZHVsZXMgZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHtDb21tYW5kT3ZlcnJpZGVyfSBmcm9tICcuL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHtobCwgaGxEZXNjLCBhcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtDbGlPcHRpb25zIGFzIFRzY29uZmlnQ2xpT3B0aW9uc30gZnJvbSAnLi9jbGktdHNjb25maWctaG9vayc7XG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpO1xuLy8gY29uc3QgV0lEVEggPSAxMzA7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaScpO1xuXG5leHBvcnQgY29uc3QgY2xpUGFja2FnZUFyZ0Rlc2MgPSAnU2luZ2xlIG9yIG11bHRpcGxlIHBhY2thZ2UgbmFtZXMsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkLCcgK1xuJ2lmIHRoZSBzY29wZSBuYW1lICh0aGUgcGFydCBiZXR3ZWVuIFwiQFwiIFwiL1wiKSBhcmUgbGlzdGVkIGNvbmZpZ3VyYXRpb24gcHJvcGVydHkgXCJwYWNrYWdlU2NvcGVzXCInO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tbWFuZHMoc3RhcnRUaW1lOiBudW1iZXIpIHtcbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayc7XG4gIC8vIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9OiB0eXBlb2Ygc3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZScpO1xuICBhd2FpdCBpbXBvcnQoJy4vY2xpLXNsaWNlJyk7XG4gIC8vIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG5cbiAgbGV0IGNsaUV4dGVuc2lvbnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKCdwbGluaycpXG4gIC5kZXNjcmlwdGlvbihjaGFsay5jeWFuKCdBIHBsdWdnYWJsZSBtb25vcmVwbyBhbmQgbXVsdGktcmVwbyBtYW5hZ2VtZW50IHRvb2wnKSlcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHByb2dyYW0uaGVscEluZm9ybWF0aW9uKCkpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBcXG52ZXJzaW9uOiAke3BrLnZlcnNpb259ICR7aXNEcmNwU3ltbGluayA/IGNoYWxrLnllbGxvdygnKHN5bWxpbmtlZCknKSA6ICcnfSBgKTtcbiAgICBpZiAoY2xpRXh0ZW5zaW9ucyAmJiBjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYEZvdW5kICR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGh9IGNvbW1hbmQgbGluZSBleHRlbnNpb25gICtcbiAgICAgIGAke2NsaUV4dGVuc2lvbnMubGVuZ3RoID4gMSA/ICdzJyA6ICcnfTogJHtjbGlFeHRlbnNpb25zLm1hcChwa2cgPT4gY2hhbGsuYmx1ZShwa2cpKS5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnXFxuJywgY2hhbGsuYmdSZWQoJ1BsZWFzZSBkZXRlcm1pbmUgYSBzdWIgY29tbWFuZCBsaXN0ZWQgYWJvdmUnKSk7XG4gICAgY2hlY2tQbGlua1ZlcnNpb24oKTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHByb2Nlc3MuZXhpdCgxKSk7XG4gIH0pO1xuICBwcm9ncmFtLmFkZEhlbHBUZXh0KCdiZWZvcmUnLCBzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuXG4gIHByb2dyYW0udmVyc2lvbihway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xuICBwcm9ncmFtLmFkZEhlbHBDb21tYW5kKCdoZWxwIFtjb21tYW5kXScsICdzaG93IGhlbHAgaW5mb3JtYXRpb24sIHNhbWUgYXMgXCItaFwiLiAnKTtcblxuICBjb25zdCBvdmVycmlkZXIgPSBuZXcgQ29tbWFuZE92ZXJyaWRlcihwcm9ncmFtKTtcbiAgbGV0IHdzU3RhdGU6IHBrZ01nci5Xb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIGNvbnN0IHtnZXRTdGF0ZTogZ2V0UGtnU3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa2dNZ3I7XG4gICAgd3NTdGF0ZSA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKTtcbiAgICBpZiAod3NTdGF0ZSAhPSBudWxsKSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBwcm9ncmFtID0+IHtcbiAgICAgICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuZ3JlZW4oc3RyKTtcbiAgICAgICAgc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbSk7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICAgICAgICBzdWJDb21hbmRzKHByb2dyYW0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHN1YkNvbWFuZHMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHN0ciA9PiBjaGFsay5jeWFuKHN0cik7XG4gICAgY2xpRXh0ZW5zaW9ucyA9IGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW0sIHdzU3RhdGUsIG92ZXJyaWRlcik7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1ZhbHVlIG9mIGVudmlyb25tZW50IHZhcmFpYmxlIFwiUExJTktfU0FGRVwiIGlzIHRydWUsIHNraXAgbG9hZGluZyBleHRlbnNpb24nKTtcbiAgfVxuXG4gIG92ZXJyaWRlci5hcHBlbmRHbG9iYWxPcHRpb25zKGZhbHNlKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2LCB7ZnJvbTogJ25vZGUnfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIGNvbW1hbmQgZHVlIHRvOicgKyBjaGFsay5yZWRCcmlnaHQoZS5tZXNzYWdlKSwgZSk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN1YkNvbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCBbd29yay1kaXJlY3RvcnldJykuYWxpYXMoJ3N5bmMnKVxuICAgIC5kZXNjcmlwdGlvbignSW5pdGlhbGl6ZSBhbmQgdXBkYXRlIHdvcmsgZGlyZWN0b3J5LCBnZW5lcmF0ZSBiYXNpYyBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBwcm9qZWN0IGFuZCBjb21wb25lbnQgcGFja2FnZXMsJyArXG4gICAgICAnIGNhbGN1bGF0ZSBob2lzdGVkIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzLCBhbmQgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBjdXJyZW50IGRpcmVjdG9yeS4nLFxuICAgICAge1xuICAgICAgICAnd29yay1kaXJlY3RvcnknOiAnQSByZWxhdGl2ZSBvciBhYm9zb2x1dGUgZGlyZWN0b3J5IHBhdGgsIHVzZSBcIi5cIiB0byBkZXRlcm1pbmUgY3VycmVudCBkaXJlY3RvcnksXFxuICBvbW1pdHRpbmcgdGhpcyBhcmd1bWVudCBtZWFuaW5nOlxcbicgK1xuICAgICAgICAgICcgIC0gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgYWxyZWFkeSBhIFwid29yayBkaXJlY3RvcnlcIiwgdXBkYXRlIGl0LlxcbicgK1xuICAgICAgICAgICcgIC0gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29yayBkaXJlY3RvcnkgKG1heWJlIGF0IHJlcG9cXCdzIHJvb3QgZGlyZWN0b3J5KSwgdXBkYXRlIHRoZSBsYXRlc3QgdXBkYXRlZCB3b3JrJyArXG4gICAgICAgICAgJyBkaXJlY3RvcnkuJ1xuICAgICAgfSlcbiAgICAub3B0aW9uKCctZiwgLS1mb3JjZScsICdGb3JjZSBydW4gXCJucG0gaW5zdGFsbFwiIGluIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnknLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWxpbnQtaG9vaywgLS1saCcsICdDcmVhdGUgYSBnaXQgcHVzaCBob29rIGZvciBjb2RlIGxpbnQnLCBmYWxzZSlcbiAgICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXByb2R1Y3Rpb24nLCAnQWRkIFwiLS1wcm9kdWN0aW9uXCIgb3IgXCItLW9ubHk9cHJvZFwiIGNvbW1hbmQgbGluZSBhcmd1bWVudCB0byBcInlhcm4vbnBtIGluc3RhbGxcIicsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZT86IHN0cmluZykgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktaW5pdCcpKS5kZWZhdWx0KGluaXRDbWQub3B0cygpIGFzIHRwLkluaXRDbWRPcHRpb25zLCB3b3Jrc3BhY2UpO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHByb2plY3RcbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgncHJvamVjdCBbYWRkfHJlbW92ZV0gW3Byb2plY3QtZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzLCBsYXRlIG9uIFBsaW5rIHdpbGwnICtcbiAgICAgICdTY2FuIHNvdXJjZSBjb2RlIGRpcmVjdG9yaWVzIGZyb20gYXNzb2NpYXRlZCBwcm9qZWN0cycsIHtcbiAgICAgICAgJ2FkZHxyZW1vdmUnOiAnRGV0ZXJtaW5lIHdoZXRoZXIgQXNzb2NpYXRlIHRvIGEgcHJvamVjdCBvciBEaXNhc3NvY2lhdGUgZnJvbSBhIHByb2plY3QnLFxuICAgICAgICAncHJvamVjdC1kaXInOiAnRGV0ZXJtaW5lIHRhcmdldCBwcm9qZWN0IHJlcG8gZGlyZWN0b3J5IChhYnNvbHV0ZSBwYXRoIG9yIHJlbGF0aXZlIHBhdGggdG8gY3VycmVudCBkaXJlY3RvcnkpJyArXG4gICAgICAgICAgJywgZGV0ZXJtaW5lIG11bHRpcGxlIHByb2plY3QgYnkgc2VwZXJhdGluZyB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIHByb2plY3REaXI6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoYWN0aW9uLCBwcm9qZWN0RGlyKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsaW50XG4gICAqL1xuICBjb25zdCBsaW50Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdsaW50IFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdzb3VyY2UgY29kZSBzdHlsZSBjaGVjaycsIHtcbiAgICAgIHBhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjXG4gICAgfSlcbiAgICAub3B0aW9uKCctLXBqIDxwcm9qZWN0MSxwcm9qZWN0Mi4uLj4nLCAnbGludCBvbmx5IFRTIGNvZGUgZnJvbSBzcGVjaWZpYyBwcm9qZWN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1maXgnLCAnUnVuIGVzbGludC90c2xpbnQgZml4LCB0aGlzIGNvdWxkIGNhdXNlIHlvdXIgc291cmNlIGNvZGUgYmVpbmcgY2hhbmdlZCB1bmV4cGVjdGVkbHknLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIHBhY2thZ2VzID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxpbnQnKSkuZGVmYXVsdChwYWNrYWdlcywgbGludENtZC5vcHRzKCkgYXMgYW55KTtcbiAgICB9KTtcblxuICBsaW50Q21kLnVzYWdlKGxpbnRDbWQudXNhZ2UoKSArXG4gICAgaGwoJ1xcbmRyY3AgbGludCAtLXBqIDxwcm9qZWN0LWRpci4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeVxcbicgK1xuICAgIGhsKCdcXG5kcmNwIGxpbnQgPGNvbXBvbmVudC1wYWNrYWdlLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIGNvbXBvbmVudCBwYWNrYWdlcycpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGNsZWFuXG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ2NzJykuYWxpYXMoJ2NsZWFyLXN5bWxpbmtzJylcbiAgICAuZGVzY3JpcHRpb24oJ0NsZWFyIHN5bWxpbmtzIGZyb20gbm9kZV9tb2R1bGVzLCBkbyB0aGlzIGJlZm9yZSBydW4gXCJucG0gaW5zdGFsbFwiIGluIHJvb3QgZGlyZWN0b3J5LCBpZiB0aGVyZSBpcyBhbnkgc3ltbGlua3MgaW4gY3VycmVudCBub2RlX21vZHVsZXMnKVxuICAgIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2Nhbk5vZGVNb2R1bGVzOiB0eXBlb2YgX3NjYW5Ob2RlTW9kdWxlcyA9IHJlcXVpcmUoJy4uL3V0aWxzL3N5bWxpbmtzJykuZGVmYXVsdDtcbiAgICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG4gICAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgdXBncmFkZVxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCd1cGdyYWRlJylcbiAgICAuYWxpYXMoJ2luc3RhbGwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVpbnN0YWxsIGxvY2FsIFBsaW5rIGFsb25nIHdpdGggb3RoZXIgZGVwZW5kZW5jaWVzLicgK1xuICAgICAgJyAoVW5saWtlIFwibnBtIGluc3RhbGxcIiB3aGljaCBkb2VzIG5vdCB3b3JrIHdpdGggbm9kZV9tb2R1bGVzIHRoYXQgbWlnaHQgY29udGFpbiBzeW1saW5rcyknKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW5rLXBsaW5rJykpLnJlaW5zdGFsbFdpdGhMaW5rZWRQbGluaygpO1xuICAgIH0pO1xuXG4gIC8vIHByb2dyYW0uY29tbWFuZCgnZG9ja2VyaXplIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbihjaGFsay5ncmF5KCdbVEJJXSBHZW5lcmF0ZSBEb2NrZXJmaWxlIGZvciBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5LCBhbmQgZ2VuZXJhdGUgZG9ja2VyIGltYWdlJykpO1xuXG4gIC8vIHByb2dyYW0uY29tbWFuZCgncGtnIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbihjaGFsay5ncmF5KCdbVEJJXSBVc2UgUGtnIChodHRwczovL2dpdGh1Yi5jb20vdmVyY2VsL3BrZykgdG8gcGFja2FnZSBOb2RlLmpzIHByb2plY3QgaW50byBhbiBleGVjdXRhYmxlICcpKTtcblxuICAvKipcbiAgICogY29tbWFuZCBsc1xuICAgKi9cbiAgY29uc3QgbGlzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbHMnKS5hbGlhcygnbGlzdCcpXG4gICAgLm9wdGlvbignLWosIC0tanNvbicsICdsaXN0IGxpbmtlZCBkZXBlbmRlbmNpZXMgaW4gZm9ybSBvZiBKU09OJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1ob2lzdCcsICdsaXN0IGhvaXN0ZWQgdHJhbnNpdGl2ZSBEZXBlbmRlbmN5IGluZm9ybWF0aW9uJywgZmFsc2UpXG4gICAgLmRlc2NyaXB0aW9uKCdJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBtYW55IHBhY2thZ2VzIHdpbGwgYWN0dWFsbHkgcnVuLCB0aGlzIGNvbW1hbmQgcHJpbnRzIG91dCBhIGxpc3QgYW5kIHRoZSBwcmlvcml0aWVzLCBpbmNsdWRpbmcgaW5zdGFsbGVkIHBhY2thZ2VzJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmRlZmF1bHQobGlzdENtZC5vcHRzKCkgYXMgYW55KTtcbiAgICB9KTtcblxuICBjb25zdCBhZGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FkZCBbZGVwZW5kZW5jeS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignQWRkIGRlcGVuZGVuY3kgdG8gcGFja2FnZS5qc29uIGZpbGUsIHdpdGggb3B0aW9uIFwiLS1kZXZcIiB0byBhZGQgYXMgXCJkZXZEZXBlbmRlbmNpZXNcIiwgJyArXG4gICAgICAnd2l0aG91dCBvcHRpb24gXCItLXRvXCIgdGhpcyBjb21tYW5kIGFkZHMgZGVwZW5kZW5jeSB0byBjdXJyZW50IHdvcmt0cmVlIHNwYWNlXFwncyBwYWNrYWdlLmpzb24gZmlsZScsXG4gICAgICB7XG4gICAgICAgIGRlcGVuZGVuY3k6ICdkZXBlbmRlbmN5IHBhY2thZ2UgbmFtZSBpbiBmb3JtIG9mIFwiPGEgbGlua2VkIHBhY2thZ2UgbmFtZSB3aXRob3V0IHNjb3BlIHBhcnQ+XCIsIFwiPHBhY2thZ2UgbmFtZT5APHZlcnNpb24+XCIsICdcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLS10byA8cGtnIG5hbWUgfCB3b3JrdHJlZSBkaXIgfCBwa2cgZGlyPicsICdhZGQgZGVwZW5kZW5jeSB0byB0aGUgcGFja2FnZS5qc29uIG9mIHNwZWNpZmljIGxpbmtlZCBzb3VyY2UgcGFja2FnZSBieSBuYW1lIG9yIGRpcmVjdG9yeSwgb3IgYSB3b3JrdHJlZSBzcGFjZSBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktYWRkLXBhY2thZ2UnKSkuYWRkRGVwZW5kZW5jeVRvKHBhY2thZ2VzLCBhZGRDbWQub3B0cygpLnRvLCBhZGRDbWQub3B0cygpLmRldik7XG4gICAgfSk7XG5cbiAgY29uc3QgdHNjb25maWdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzY29uZmlnJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgdHNjb25maWcuanNvbiwganNjb25maWcuanNvbiBmaWxlcyB3aGljaCB3aWxsIGJlIHVwZGF0ZWQgYXV0b21hdGljYWxseSBieSBQbGluaywgKGEgbW9ub3JlcG8gbWVhbnMgdGhlcmUgYXJlIG5vZGUgcGFja2FnZXMgd2hpY2ggYXJlIHN5bWxpbmtlZCBmcm9tIHJlYWwgc291cmNlIGNvZGUgZGlyZWN0b3J5JyArXG4gICAgICAnLCBpZiB5b3UgaGF2ZSBjdXN0b21pemVkIHRzY29uZmlnLmpzb24gZmlsZSwgdGhpcyBjb21tYW5kIGhlbHBzIHRvIHVwZGF0ZSBcImNvbXBpbGVyT3B0aW9ucy5wYXRoc1wiIHByb3BlcnRpZXMpJylcbiAgICAub3B0aW9uKCctLWhvb2sgPGZpbGU+JywgJ2FkZCB0c2NvbmZpZy9qc2NvbmZpZyBmaWxlIHRvIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS11bmhvb2sgPGZpbGU+JywgJ3JlbW92ZSB0c2NvbmZpZy9qc2NvbmZpZyBmaWxlIGZyb20gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLWNsZWFyLC0tdW5ob29rLWFsbCcsICdyZW1vdmUgYWxsIHRzY29uZmlnIGZpbGVzIGZyb20gZnJvbSBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktdHNjb25maWctaG9vaycpKS5kb1RzY29uZmlnKHRzY29uZmlnQ21kLm9wdHMoKSBhcyBUc2NvbmZpZ0NsaU9wdGlvbnMpO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBCdW1wIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IGJ1bXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2J1bXAgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ2J1bXAgcGFja2FnZS5qc29uIHZlcnNpb24gbnVtYmVyIGZvciBzcGVjaWZpYyBwYWNrYWdlLCBzYW1lIGFzIFwibnBtIHZlcnNpb25cIiBkb2VzJyxcbiAgICAgIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdvbmx5IGJ1bXAgY29tcG9uZW50IHBhY2thZ2VzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNyZS12ZXJzaW9uIDx2YWx1ZT4nLFxuICAgICAgJ3ZlcnNpb24gaW5jcmVtZW50LCB2YWxpZCB2YWx1ZXMgYXJlOiBtYWpvciwgbWlub3IsIHBhdGNoLCBwcmVyZWxlYXNlJywgJ3BhdGNoJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWJ1bXAnKSkuZGVmYXVsdCh7Li4uYnVtcENtZC5vcHRzKCkgYXMgdHAuQnVtcE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKGJ1bXBDbWQpO1xuICAvLyBidW1wQ21kLnVzYWdlKGJ1bXBDbWQudXNhZ2UoKSArICdcXG4nICsgaGwoJ3BsaW5rIGJ1bXAgPHBhY2thZ2U+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gIC8vICAgaGwoJ3BsaW5rIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzIGFuZCBjaGFuZ2UgdmVyc2lvbiB2YWx1ZSBmcm9tIHJlbGF0ZWQgcGFja2FnZS5qc29uJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3BhY2sgcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwYWNrIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXI+JyxcbiAgICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnBhY2soey4uLnBhY2tDbWQub3B0cygpIGFzIHRwLlBhY2tPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhwYWNrQ21kKTtcbiAgcGFja0NtZC51c2FnZShwYWNrQ21kLnVzYWdlKCkgKyAnXFxuQnkgZGVmYXVsdCwgcnVuIFwibnBtIHBhY2tcIiBmb3IgZWFjaCBsaW5rZWQgcGFja2FnZSB3aGljaCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcHVibGlzaENtZCA9IHByb2dyYW0uY29tbWFuZCgncHVibGlzaCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIG5wbSBwdWJsaXNoJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3B1Ymxpc2ggcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLFxuICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncHVibGlzaCBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXB1YmxpYycsICdzYW1lIGFzIFwibnBtIHB1Ymxpc2hcIiBjb21tYW5kIG9wdGlvbiBcIi0tYWNjZXNzIHB1YmxpY1wiJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnB1Ymxpc2goey4uLnB1Ymxpc2hDbWQub3B0cygpIGFzIHRwLlB1Ymxpc2hPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuXG5cbiAgY29uc3QgYW5hbHlzaXNDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FuYWx5emUgW3BrZy1uYW1lLi4uXScpXG4gICAgLmFsaWFzKCdhbmFseXNlJylcbiAgICAuZGVzY3JpcHRpb24oJ1VzZSBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIHBhcnNlIHNvdXJjZSBjb2RlLCBsaXN0IGRlcGVuZGVuY2VzIGJ5IERGUyBhbGdhcml0aG0nLCB7XG4gICAgICAncGtnLW5hbWUnOiAndGhlIG5hbWUgb2YgdGFyZ2V0IHNvdXJjZSBwYWNrYWdlLCB0aGUgcGFja2FnZSBtdXN0IGJlIFBsaW5rIGNvbXBsaWFudCBwYWNrYWdlLCB0aGlzIGNvbW1hbmQgd2lsbCBvbmx5ICcgK1xuICAgICAgICAnc2NhbiBzcGVjaWFsIHNvdXJjZSBjb2RlIGRpcmVjdG9yeSBsaWtlIFwidHMvXCIgYW5kIFwiaXNvbS9cIiBvZiB0YXJnZXQgcGFja2FnZSdcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLWQsIC0tZGlyIDxkaXJlY3Rvcnk+JyxcbiAgICAgICcobXVsdGlwbGUpIGRldGVybWluZSB0YXJnZXQgZGlyZWN0b3J5LCBzY2FuIEpTL0pTWC9UUy9UU1ggZmlsZXMgdW5kZXIgdGFyZ2V0IGRpcmVjdG9yeScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy1mLCAtLWZpbGUgPGZpbGU+JyxcbiAgICAgICcobXVsdGlwbGUpIGRldGVybWluZSB0YXJnZXQgVFMvSlMoWCkgZmlsZXMgKG11bHRpcGxlIGZpbGUgd2l0aCBtb3JlIG9wdGlvbnMgXCItZiA8ZmlsZT4gLWYgPGdsb2I+XCIpJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLWonLCAnU2hvdyByZXN1bHQgaW4gSlNPTicsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4vY2xpLWFuYWx5emUnKSkuZGVmYXVsdChwYWNrYWdlcywgYW5hbHlzaXNDbWQub3B0cygpIGFzIHRwLkFuYWx5emVPcHRpb25zKTtcbiAgICB9KTtcblxuICBhbmFseXNpc0NtZC51c2FnZShhbmFseXNpc0NtZC51c2FnZSgpICsgJ1xcbicgK1xuICAgICdlLmcuXFxuICAnICsgY2hhbGsuYmx1ZSgncGxpbmsgYW5hbHl6ZSAtZiBcInBhY2thZ2VzL2Zvb2JhcjEvKiovKlwiIC1mIHBhY2thZ2VzL2Zvb2JhcjIvdHMvbWFpbi50c1xcbiAgJyArXG4gICAgJ3BsaW5rIGFuYWx5emUgLWQgcGFja2FnZXMvZm9vYmFyMS9zcmMgLWQgcGFja2FnZXMvZm9vYmFyMi90cycpKTtcblxuICBjb25zdCB1cGRhdGVEaXJDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3VwZGF0ZS1kaXInKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHRoaXMgY29tbWFuZCB0byBzeW5jIGludGVybmFsIHN0YXRlIHdoZW4gd2hvbGUgd29ya3NwYWNlIGRpcmVjdG9yeSBpcyByZW5hbWVkIG9yIG1vdmVkLlxcbicgK1xuICAgICdCZWNhdXNlIHdlIHN0b3JlIGFic29sdXRlIHBhdGggaW5mbyBvZiBlYWNoIHBhY2thZ2UgaW4gaW50ZXJuYWwgc3RhdGUsIGFuZCBpdCB3aWxsIGJlY29tZSBpbnZhbGlkIGFmdGVyIHlvdSByZW5hbWUgb3IgbW92ZSBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZTogc3RyaW5nKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5jaGVja0Rpcih1cGRhdGVEaXJDbWQub3B0cygpIGFzIGFueSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIGNvbXBpbGUgc291cmNlIGNvZGUgZm9yIHRhcmdldCBwYWNrYWdlcywgJyArXG4gICAgJ3doaWNoIGhhdmUgYmVlbiBsaW5rZWQgdG8gY3VycmVudCB3b3JrIGRpcmVjdG9yeScsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnVHlwZXNjcmlwdCBjb21waWxlciB3YXRjaCBtb2RlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLy8gLm9wdGlvbignLS13cywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAnb25seSBpbmNsdWRlIHRob3NlIGxpbmtlZCBwYWNrYWdlcyB3aGljaCBhcmUgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAvLyAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tanN4JywgJ2luY2x1ZGVzIFRTWCBmaWxlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tc291cmNlLW1hcCA8aW5saW5lfGZpbGU+JywgJ1NvdXJjZSBtYXAgc3R5bGU6IFwiaW5saW5lXCIgb3IgXCJmaWxlXCInLCAnaW5saW5lJylcbiAgICAub3B0aW9uKCctLWNvcGF0aCwgLS1jb21waWxlci1vcHRpb25zLXBhdGhzIDxwYXRoTWFwSnNvbj4nLFxuICAgICAgJ0FkZCBtb3JlIFwicGF0aHNcIiBwcm9wZXJ0eSB0byBjb21waWxlciBvcHRpb25zLiAnICtcbiAgICAgICcoZS5nLiAtLWNvcGF0aCBcXCd7XFxcIkAvKlwiOltcIi9Vc2Vycy93b3JrZXIvb2NlYW4tdWkvc3JjLypcIl19XFwnKScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBjb25zdCBvcHQgPSB0c2NDbWQub3B0cygpO1xuICAgICAgY29uc3QgdHNjID0gYXdhaXQgaW1wb3J0KCcuLi90cy1jbWQnKTtcblxuICAgICAgYXdhaXQgdHNjLnRzYyh7XG4gICAgICAgIHBhY2thZ2U6IHBhY2thZ2VzLFxuICAgICAgICBwcm9qZWN0OiBvcHQucHJvamVjdCxcbiAgICAgICAgd2F0Y2g6IG9wdC53YXRjaCxcbiAgICAgICAgc291cmNlTWFwOiBvcHQuc291cmNlTWFwLFxuICAgICAgICBqc3g6IG9wdC5qc3gsXG4gICAgICAgIGVkOiBvcHQuZW1pdERlY2xhcmF0aW9uT25seSxcbiAgICAgICAgcGF0aHNKc29uczogb3B0LmNvbXBpbGVyT3B0aW9uc1BhdGhzXG4gICAgICB9KTtcbiAgICB9KTtcblxuICB0c2NDbWQudXNhZ2UodHNjQ21kLnVzYWdlKCkgKyAnXFxuJyArICdSdW4gZ3VscC10eXBlc2NyaXB0IHRvIGNvbXBpbGUgTm9kZS5qcyBzaWRlIFR5cGVzY3JpcHQgZmlsZXMuXFxuXFxuJyArXG4gICAgJ0l0IGNvbXBpbGVzIFxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L3RzLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vZGlzdFwiLFxcbicgK1xuICAgICcgIG9yXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbS8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb21cIlxcbiBmb3IgYWxsIEB3ZmggcGFja2FnZXMuXFxuJyArXG4gICAgJ0kgc3VnZ2VzdCB0byBwdXQgTm9kZS5qcyBzaWRlIFRTIGNvZGUgaW4gZGlyZWN0b3J5IGB0c2AsIGFuZCBpc29tb3JwaGljIFRTIGNvZGUgKG1lYW5pbmcgaXQgcnVucyBpbiAnICtcbiAgICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjXFxuJykgKyAnQ29tcGlsZSBsaW5rZWQgcGFja2FnZXMgdGhhdCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlICh5b3Ugc2hhbGwgcnVuIHRoaXMgY29tbWFuZCBvbmx5IGluIGEgd29ya3NwYWNlIGRpcmVjdG9yeSlcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyA8cGFja2FnZS4uPlxcbicpICsgJyBPbmx5IGNvbXBpbGUgc3BlY2lmaWMgcGFja2FnZXMgYnkgcHJvdmlkaW5nIHBhY2thZ2UgbmFtZSBvciBzaG9ydCBuYW1lXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIHBhY2thZ2VzIGNoYW5nZSBhbmQgY29tcGlsZSB3aGVuIG5ldyB0eXBlc2NyaXB0IGZpbGUgaXMgY2hhbmdlZCBvciBjcmVhdGVkXFxuXFxuJyk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzZXR0aW5nIFtwYWNrYWdlXScpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IHBhY2thZ2VzIHNldHRpbmcgYW5kIHZhbHVlcycsIHtwYWNrYWdlOiAncGFja2FnZSBuYW1lLCBvbmx5IGxpc3Qgc2V0dGluZyBmb3Igc3BlY2lmaWMgcGFja2FnZSd9KVxuICAgIC5hY3Rpb24oYXN5bmMgKHBrZ05hbWU6IHN0cmluZykgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktc2V0dGluZycpKS5kZWZhdWx0KHBrZ05hbWUpO1xuICAgIH0pO1xuICAgIC8qKiBjb21tYW5kIHJ1biovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBzcGVjaWZpYyBtb2R1bGVcXCdzIGV4cG9ydGVkIGZ1bmN0aW9uXFxuJylcbiAgICAuYWN0aW9uKGFzeW5jICh0YXJnZXQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL3BhY2thZ2UtcnVubmVyJykpLnJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc30pO1xuICAgIH0pO1xuXG4gIHJ1bkNtZC51c2FnZShydW5DbWQudXNhZ2UoKSArICdcXG4nICsgY2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXVxcbicpICtcbiAgICBgZS5nLlxcbiAgJHtjaGFsay5ncmVlbigncGxpbmsgcnVuIGZvcmJhci1wYWNrYWdlL2Rpc3QvZmlsZSNmdW5jdGlvbiBhcmd1bWVudDEgYXJndW1lbnQyLi4uJyl9XFxuYCArXG4gICAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAgICc8dGFyZ2V0PiAtIEpTIG9yIFRTIGZpbGUgbW9kdWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlc29sdmVkIGJ5IE5vZGUuanMgKHRzLW5vZGUpIGZvbGxvd2VkIGJ5IFwiI1wiIGFuZCBleHBvcnRlZCBmdW5jdGlvbiBuYW1lLFxcbicgK1xuICAgICdlLmcuIFxcbicgK1xuICAgIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgICAnLCBmdW5jdGlvbiBjYW4gYmUgYXN5bmMgd2hpY2ggcmV0dXJucyBQcm9taXNlXFxuJyArXG4gICAgY2hhbGsuZ3JlZW4oJ25vZGVfbW9kdWxlcy9wYWNrYWdlLWRpci9kaXN0L2Zvb2Jhci50cyNteUZ1bmN0aW9uJykgK1xuICAgICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuXG59XG5cbmZ1bmN0aW9uIGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3czogcGtnTWdyLldvcmtzcGFjZVN0YXRlIHwgdW5kZWZpbmVkLCBvdmVycmlkZXI6IENvbW1hbmRPdmVycmlkZXIpOiBzdHJpbmdbXSB7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybiBbXTtcbiAgaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIGNvbnN0IGF2YWlsYWJsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBkciA9IHBrLmpzb24uZHI7XG4gICAgaWYgKGRyID09IG51bGwgfHwgZHIuY2xpID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCBbcGtnRmlsZVBhdGgsIGZ1bmNOYW1lXSA9IChkci5jbGkgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuXG4gICAgYXZhaWxhYmxlcy5wdXNoKHBrLm5hbWUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKHBrLCBwa2dGaWxlUGF0aCwgZnVuY05hbWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlfVwiYCwgZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhdmFpbGFibGVzO1xufVxuXG5cbmxldCBza2lwVmVyc2lvbkNoZWNrID0gZmFsc2U7XG5wcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgKCkgPT4ge1xuICBpZiAoc2tpcFZlcnNpb25DaGVjaylcbiAgICByZXR1cm47XG4gIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICBjaGVja1BsaW5rVmVyc2lvbigpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrUGxpbmtWZXJzaW9uKCkge1xuICBjb25zdCBwa2pzb24gPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAncGFja2FnZS5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBranNvbikpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtqc29uLCAndXRmOCcpKTtcbiAgICBsZXQgZGVwVmVyOiBzdHJpbmcgPSBqc29uLmRlcGVuZGVuY2llcyAmJiBqc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddIHx8XG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyAmJiBqc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgIGlmIChkZXBWZXIgPT0gbnVsbCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ0RvblxcJ3QgZm9yZ2V0IHRvIGFkZCBAd2ZoL3BsaW5rIGluIHBhY2thZ2UuanNvbiBhcyBkZXBlbmRlbmNpZXMnKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChkZXBWZXIuZW5kc1dpdGgoJy50Z3onKSkge1xuICAgICAgY29uc3QgbWF0Y2hlZCA9IC8tKFxcZCtcXC5cXGQrXFwuW15dKz8pXFwudGd6JC8uZXhlYyhkZXBWZXIpO1xuICAgICAgaWYgKG1hdGNoZWQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgZGVwVmVyID0gbWF0Y2hlZFsxXTtcbiAgICB9XG4gICAgaWYgKGRlcFZlciAmJiAhc2VtdmVyLnNhdGlzZmllcyhway52ZXJzaW9uLCBkZXBWZXIpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhgTG9jYWwgaW5zdGFsbGVkIFBsaW5rIHZlcnNpb24gJHtjaGFsay5jeWFuKHBrLnZlcnNpb24pfSBkb2VzIG5vdCBtYXRjaCBkZXBlbmRlbmN5IHZlcnNpb24gJHtjaGFsay5ncmVlbihkZXBWZXIpfSBpbiBwYWNrYWdlLmpzb24sIGAgK1xuICAgICAgICBgcnVuIGNvbW1hbmQgXCIke2NoYWxrLmdyZWVuKCdwbGluayB1cGdyYWRlJyl9XCIgdG8gdXBncmFkZSBvciBkb3duZ3JhZGUgdG8gZXhwZWN0ZWQgdmVyc2lvbmApKTtcbiAgICB9XG4gIH1cbn1cblxuIl19