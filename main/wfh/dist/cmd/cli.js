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
        .description('Use Typescript compiler to parse source code, list dependences by DFS algarithm', {
        'pkg-name': 'the name of target source package, the package must be Plink compliant package, this command will only ' +
            'scan special source code directory like "ts/" and "isom/" of target package'
    })
        .option('-d, --dir <directory>', '(multiple) determine target directory, scan JS/JSX/TS/TSX files under target directory', utils_1.arrayOptionFn, [])
        .option('-f, --file <file>', '(multiple) determine target TS/JS(X) files (multiple file with more options "-f <file> -f <glob>")', utils_1.arrayOptionFn, [])
        .option('-j', 'Show result in JSON', false)
        .option('--alias <alias-express>', 'e.g. --alias "[\'^@/(.+)$\', \'src/$1\']"', utils_1.arrayOptionFn, [])
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLGtDQUFrQztBQUNsQywwREFBa0M7QUFDbEMsa0RBQTBCO0FBSTFCLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFFdEUsd0NBQXlGO0FBRXpGLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLDZEQUFzRDtBQUN0RCxzREFBOEQ7QUFDOUQsbUNBQWtEO0FBQ2xELG1DQUFpQztBQUVqQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUM1QyxxQkFBcUI7QUFDckIsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUV0QixRQUFBLGlCQUFpQixHQUFHLHlFQUF5RTtJQUMxRyxnR0FBZ0csQ0FBQztBQUVqRyxTQUFzQixjQUFjLENBQUMsU0FBaUI7O1FBQ3BELE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLDREQUE0RDtRQUM1RCx3REFBYSxhQUFhLEdBQUMsQ0FBQztRQUM1QixpQ0FBaUM7UUFHakMsSUFBSSxhQUFtQyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQzdDLFdBQVcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxDQUFDLENBQUM7YUFDOUUsTUFBTSxDQUFDLENBQUMsSUFBYyxFQUFFLEVBQUU7WUFDekIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsQ0FB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RUFBRTtZQUMzQixNQUFNLE9BQU8sR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEQsSUFBSSxPQUFPLElBQUksSUFBSTtnQkFDakIsT0FBTztZQUNULE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckI7UUFDRCxJQUFJLE1BQU0sSUFBSSxDQUFDLGdCQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDbkQsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQVMsQ0FBQyxpQ0FBaUMsZUFBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxlQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0I7Z0JBQ3hKLGdCQUFnQixlQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDLENBQUM7U0FDakc7S0FDRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jZm9udC5kLnRzXCIgLz5cbi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLyBpbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyB0cCBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG4vLyBpbXBvcnQgJy4uL3RzYy1wYWNrYWdlcy1zbGljZSc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgeyBpc0RyY3BTeW1saW5rLCBzZXh5Rm9udCwgZ2V0Um9vdERpciwgYm94U3RyaW5nLCBwbGlua0VudiB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IF9zY2FuTm9kZU1vZHVsZXMgZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHtDb21tYW5kT3ZlcnJpZGVyfSBmcm9tICcuL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHtobCwgaGxEZXNjLCBhcnJheU9wdGlvbkZufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtDbGlPcHRpb25zIGFzIFRzY29uZmlnQ2xpT3B0aW9uc30gZnJvbSAnLi9jbGktdHNjb25maWctaG9vayc7XG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpO1xuLy8gY29uc3QgV0lEVEggPSAxMzA7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaScpO1xuXG5leHBvcnQgY29uc3QgY2xpUGFja2FnZUFyZ0Rlc2MgPSAnU2luZ2xlIG9yIG11bHRpcGxlIHBhY2thZ2UgbmFtZXMsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkLCcgK1xuJ2lmIHRoZSBzY29wZSBuYW1lICh0aGUgcGFydCBiZXR3ZWVuIFwiQFwiIFwiL1wiKSBhcmUgbGlzdGVkIGNvbmZpZ3VyYXRpb24gcHJvcGVydHkgXCJwYWNrYWdlU2NvcGVzXCInO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tbWFuZHMoc3RhcnRUaW1lOiBudW1iZXIpIHtcbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayc7XG4gIC8vIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9OiB0eXBlb2Ygc3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZScpO1xuICBhd2FpdCBpbXBvcnQoJy4vY2xpLXNsaWNlJyk7XG4gIC8vIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG5cbiAgbGV0IGNsaUV4dGVuc2lvbnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKCdwbGluaycpXG4gIC5kZXNjcmlwdGlvbihjaGFsay5jeWFuKCdBIHBsdWdnYWJsZSBtb25vcmVwbyBhbmQgbXVsdGktcmVwbyBtYW5hZ2VtZW50IHRvb2wnKSlcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHByb2dyYW0uaGVscEluZm9ybWF0aW9uKCkpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBcXG52ZXJzaW9uOiAke3BrLnZlcnNpb259ICR7aXNEcmNwU3ltbGluayA/IGNoYWxrLnllbGxvdygnKHN5bWxpbmtlZCknKSA6ICcnfSBgKTtcbiAgICBpZiAoY2xpRXh0ZW5zaW9ucyAmJiBjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYEZvdW5kICR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGh9IGNvbW1hbmQgbGluZSBleHRlbnNpb25gICtcbiAgICAgIGAke2NsaUV4dGVuc2lvbnMubGVuZ3RoID4gMSA/ICdzJyA6ICcnfTogJHtjbGlFeHRlbnNpb25zLm1hcChwa2cgPT4gY2hhbGsuYmx1ZShwa2cpKS5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnXFxuJywgY2hhbGsuYmdSZWQoJ1BsZWFzZSBkZXRlcm1pbmUgYSBzdWIgY29tbWFuZCBsaXN0ZWQgYWJvdmUnKSk7XG4gICAgY2hlY2tQbGlua1ZlcnNpb24oKTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHByb2Nlc3MuZXhpdCgxKSk7XG4gIH0pO1xuICBwcm9ncmFtLmFkZEhlbHBUZXh0KCdiZWZvcmUnLCBzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuXG4gIHByb2dyYW0udmVyc2lvbihway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xuICBwcm9ncmFtLmFkZEhlbHBDb21tYW5kKCdoZWxwIFtjb21tYW5kXScsICdzaG93IGhlbHAgaW5mb3JtYXRpb24sIHNhbWUgYXMgXCItaFwiLiAnKTtcblxuICBjb25zdCBvdmVycmlkZXIgPSBuZXcgQ29tbWFuZE92ZXJyaWRlcihwcm9ncmFtKTtcbiAgbGV0IHdzU3RhdGU6IHBrZ01nci5Xb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIGNvbnN0IHtnZXRTdGF0ZTogZ2V0UGtnU3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa2dNZ3I7XG4gICAgd3NTdGF0ZSA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKTtcbiAgICBpZiAod3NTdGF0ZSAhPSBudWxsKSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBwcm9ncmFtID0+IHtcbiAgICAgICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuZ3JlZW4oc3RyKTtcbiAgICAgICAgc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbSk7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICAgICAgICBzdWJDb21hbmRzKHByb2dyYW0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHN1YkNvbWFuZHMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHN0ciA9PiBjaGFsay5jeWFuKHN0cik7XG4gICAgY2xpRXh0ZW5zaW9ucyA9IGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW0sIHdzU3RhdGUsIG92ZXJyaWRlcik7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1ZhbHVlIG9mIGVudmlyb25tZW50IHZhcmFpYmxlIFwiUExJTktfU0FGRVwiIGlzIHRydWUsIHNraXAgbG9hZGluZyBleHRlbnNpb24nKTtcbiAgfVxuXG4gIG92ZXJyaWRlci5hcHBlbmRHbG9iYWxPcHRpb25zKGZhbHNlKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2LCB7ZnJvbTogJ25vZGUnfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIGNvbW1hbmQgZHVlIHRvOicgKyBjaGFsay5yZWRCcmlnaHQoZS5tZXNzYWdlKSwgZSk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN1YkNvbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCBbd29yay1kaXJlY3RvcnldJykuYWxpYXMoJ3N5bmMnKVxuICAgIC5kZXNjcmlwdGlvbignSW5pdGlhbGl6ZSBhbmQgdXBkYXRlIHdvcmsgZGlyZWN0b3J5LCBnZW5lcmF0ZSBiYXNpYyBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBwcm9qZWN0IGFuZCBjb21wb25lbnQgcGFja2FnZXMsJyArXG4gICAgICAnIGNhbGN1bGF0ZSBob2lzdGVkIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzLCBhbmQgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBjdXJyZW50IGRpcmVjdG9yeS4nLFxuICAgICAge1xuICAgICAgICAnd29yay1kaXJlY3RvcnknOiAnQSByZWxhdGl2ZSBvciBhYm9zb2x1dGUgZGlyZWN0b3J5IHBhdGgsIHVzZSBcIi5cIiB0byBkZXRlcm1pbmUgY3VycmVudCBkaXJlY3RvcnksXFxuICBvbW1pdHRpbmcgdGhpcyBhcmd1bWVudCBtZWFuaW5nOlxcbicgK1xuICAgICAgICAgICcgIC0gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgYWxyZWFkeSBhIFwid29yayBkaXJlY3RvcnlcIiwgdXBkYXRlIGl0LlxcbicgK1xuICAgICAgICAgICcgIC0gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29yayBkaXJlY3RvcnkgKG1heWJlIGF0IHJlcG9cXCdzIHJvb3QgZGlyZWN0b3J5KSwgdXBkYXRlIHRoZSBsYXRlc3QgdXBkYXRlZCB3b3JrJyArXG4gICAgICAgICAgJyBkaXJlY3RvcnkuJ1xuICAgICAgfSlcbiAgICAub3B0aW9uKCctZiwgLS1mb3JjZScsICdGb3JjZSBydW4gXCJucG0gaW5zdGFsbFwiIGluIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnknLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWxpbnQtaG9vaywgLS1saCcsICdDcmVhdGUgYSBnaXQgcHVzaCBob29rIGZvciBjb2RlIGxpbnQnLCBmYWxzZSlcbiAgICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXByb2R1Y3Rpb24nLCAnQWRkIFwiLS1wcm9kdWN0aW9uXCIgb3IgXCItLW9ubHk9cHJvZFwiIGNvbW1hbmQgbGluZSBhcmd1bWVudCB0byBcInlhcm4vbnBtIGluc3RhbGxcIicsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZT86IHN0cmluZykgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktaW5pdCcpKS5kZWZhdWx0KGluaXRDbWQub3B0cygpIGFzIHRwLkluaXRDbWRPcHRpb25zLCB3b3Jrc3BhY2UpO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHByb2plY3RcbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgncHJvamVjdCBbYWRkfHJlbW92ZV0gW3Byb2plY3QtZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzLCBsYXRlIG9uIFBsaW5rIHdpbGwnICtcbiAgICAgICdTY2FuIHNvdXJjZSBjb2RlIGRpcmVjdG9yaWVzIGZyb20gYXNzb2NpYXRlZCBwcm9qZWN0cycsIHtcbiAgICAgICAgJ2FkZHxyZW1vdmUnOiAnRGV0ZXJtaW5lIHdoZXRoZXIgQXNzb2NpYXRlIHRvIGEgcHJvamVjdCBvciBEaXNhc3NvY2lhdGUgZnJvbSBhIHByb2plY3QnLFxuICAgICAgICAncHJvamVjdC1kaXInOiAnRGV0ZXJtaW5lIHRhcmdldCBwcm9qZWN0IHJlcG8gZGlyZWN0b3J5IChhYnNvbHV0ZSBwYXRoIG9yIHJlbGF0aXZlIHBhdGggdG8gY3VycmVudCBkaXJlY3RvcnkpJyArXG4gICAgICAgICAgJywgZGV0ZXJtaW5lIG11bHRpcGxlIHByb2plY3QgYnkgc2VwZXJhdGluZyB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIHByb2plY3REaXI6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoYWN0aW9uLCBwcm9qZWN0RGlyKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsaW50XG4gICAqL1xuICBjb25zdCBsaW50Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdsaW50IFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdzb3VyY2UgY29kZSBzdHlsZSBjaGVjaycsIHtcbiAgICAgIHBhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjXG4gICAgfSlcbiAgICAub3B0aW9uKCctLXBqIDxwcm9qZWN0MSxwcm9qZWN0Mi4uLj4nLCAnbGludCBvbmx5IFRTIGNvZGUgZnJvbSBzcGVjaWZpYyBwcm9qZWN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1maXgnLCAnUnVuIGVzbGludC90c2xpbnQgZml4LCB0aGlzIGNvdWxkIGNhdXNlIHlvdXIgc291cmNlIGNvZGUgYmVpbmcgY2hhbmdlZCB1bmV4cGVjdGVkbHknLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIHBhY2thZ2VzID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxpbnQnKSkuZGVmYXVsdChwYWNrYWdlcywgbGludENtZC5vcHRzKCkgYXMgYW55KTtcbiAgICB9KTtcblxuICBsaW50Q21kLnVzYWdlKGxpbnRDbWQudXNhZ2UoKSArXG4gICAgaGwoJ1xcbmRyY3AgbGludCAtLXBqIDxwcm9qZWN0LWRpci4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeVxcbicgK1xuICAgIGhsKCdcXG5kcmNwIGxpbnQgPGNvbXBvbmVudC1wYWNrYWdlLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIGNvbXBvbmVudCBwYWNrYWdlcycpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGNsZWFuXG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ2NzJykuYWxpYXMoJ2NsZWFyLXN5bWxpbmtzJylcbiAgICAuZGVzY3JpcHRpb24oJ0NsZWFyIHN5bWxpbmtzIGZyb20gbm9kZV9tb2R1bGVzLCBkbyB0aGlzIGJlZm9yZSBydW4gXCJucG0gaW5zdGFsbFwiIGluIHJvb3QgZGlyZWN0b3J5LCBpZiB0aGVyZSBpcyBhbnkgc3ltbGlua3MgaW4gY3VycmVudCBub2RlX21vZHVsZXMnKVxuICAgIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2Nhbk5vZGVNb2R1bGVzOiB0eXBlb2YgX3NjYW5Ob2RlTW9kdWxlcyA9IHJlcXVpcmUoJy4uL3V0aWxzL3N5bWxpbmtzJykuZGVmYXVsdDtcbiAgICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG4gICAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgdXBncmFkZVxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCd1cGdyYWRlJylcbiAgICAuYWxpYXMoJ2luc3RhbGwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVpbnN0YWxsIGxvY2FsIFBsaW5rIGFsb25nIHdpdGggb3RoZXIgZGVwZW5kZW5jaWVzLicgK1xuICAgICAgJyAoVW5saWtlIFwibnBtIGluc3RhbGxcIiB3aGljaCBkb2VzIG5vdCB3b3JrIHdpdGggbm9kZV9tb2R1bGVzIHRoYXQgbWlnaHQgY29udGFpbiBzeW1saW5rcyknKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW5rLXBsaW5rJykpLnJlaW5zdGFsbFdpdGhMaW5rZWRQbGluaygpO1xuICAgIH0pO1xuXG4gIC8vIHByb2dyYW0uY29tbWFuZCgnZG9ja2VyaXplIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbihjaGFsay5ncmF5KCdbVEJJXSBHZW5lcmF0ZSBEb2NrZXJmaWxlIGZvciBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5LCBhbmQgZ2VuZXJhdGUgZG9ja2VyIGltYWdlJykpO1xuXG4gIC8vIHByb2dyYW0uY29tbWFuZCgncGtnIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbihjaGFsay5ncmF5KCdbVEJJXSBVc2UgUGtnIChodHRwczovL2dpdGh1Yi5jb20vdmVyY2VsL3BrZykgdG8gcGFja2FnZSBOb2RlLmpzIHByb2plY3QgaW50byBhbiBleGVjdXRhYmxlICcpKTtcblxuICAvKipcbiAgICogY29tbWFuZCBsc1xuICAgKi9cbiAgY29uc3QgbGlzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbHMnKS5hbGlhcygnbGlzdCcpXG4gICAgLm9wdGlvbignLWosIC0tanNvbicsICdsaXN0IGxpbmtlZCBkZXBlbmRlbmNpZXMgaW4gZm9ybSBvZiBKU09OJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1ob2lzdCcsICdsaXN0IGhvaXN0ZWQgdHJhbnNpdGl2ZSBEZXBlbmRlbmN5IGluZm9ybWF0aW9uJywgZmFsc2UpXG4gICAgLmRlc2NyaXB0aW9uKCdJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBtYW55IHBhY2thZ2VzIHdpbGwgYWN0dWFsbHkgcnVuLCB0aGlzIGNvbW1hbmQgcHJpbnRzIG91dCBhIGxpc3QgYW5kIHRoZSBwcmlvcml0aWVzLCBpbmNsdWRpbmcgaW5zdGFsbGVkIHBhY2thZ2VzJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmRlZmF1bHQobGlzdENtZC5vcHRzKCkgYXMgYW55KTtcbiAgICB9KTtcblxuICBjb25zdCBhZGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FkZCA8ZGVwZW5kZW5jeS4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignQWRkIGRlcGVuZGVuY3kgdG8gcGFja2FnZS5qc29uIGZpbGUsIHdpdGggb3B0aW9uIFwiLS1kZXZcIiB0byBhZGQgYXMgXCJkZXZEZXBlbmRlbmNpZXNcIiwgJyArXG4gICAgICAnd2l0aG91dCBvcHRpb24gXCItLXRvXCIgdGhpcyBjb21tYW5kIGFkZHMgZGVwZW5kZW5jeSB0byBjdXJyZW50IHdvcmt0cmVlIHNwYWNlXFwncyBwYWNrYWdlLmpzb24gZmlsZScsXG4gICAgICB7XG4gICAgICAgIGRlcGVuZGVuY3k6ICdkZXBlbmRlbmN5IHBhY2thZ2UgbmFtZSBpbiBmb3JtIG9mIFwiPGEgbGlua2VkIHBhY2thZ2UgbmFtZSB3aXRob3V0IHNjb3BlIHBhcnQ+XCIsIFwiPHBhY2thZ2UgbmFtZT5APHZlcnNpb24+XCIsICdcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLS10byA8cGtnIG5hbWUgfCB3b3JrdHJlZSBkaXIgfCBwa2cgZGlyPicsICdhZGQgZGVwZW5kZW5jeSB0byB0aGUgcGFja2FnZS5qc29uIG9mIHNwZWNpZmljIGxpbmtlZCBzb3VyY2UgcGFja2FnZSBieSBuYW1lIG9yIGRpcmVjdG9yeSwgb3IgYSB3b3JrdHJlZSBzcGFjZSBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktYWRkLXBhY2thZ2UnKSkuYWRkRGVwZW5kZW5jeVRvKHBhY2thZ2VzLCBhZGRDbWQub3B0cygpLnRvLCBhZGRDbWQub3B0cygpLmRldik7XG4gICAgfSk7XG5cbiAgY29uc3QgdHNjb25maWdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzY29uZmlnJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgdHNjb25maWcuanNvbiwganNjb25maWcuanNvbiBmaWxlcyB3aGljaCB3aWxsIGJlIHVwZGF0ZWQgYXV0b21hdGljYWxseSBieSBQbGluaywgKGEgbW9ub3JlcG8gbWVhbnMgdGhlcmUgYXJlIG5vZGUgcGFja2FnZXMgd2hpY2ggYXJlIHN5bWxpbmtlZCBmcm9tIHJlYWwgc291cmNlIGNvZGUgZGlyZWN0b3J5JyArXG4gICAgICAnLCBpZiB5b3UgaGF2ZSBjdXN0b21pemVkIHRzY29uZmlnLmpzb24gZmlsZSwgdGhpcyBjb21tYW5kIGhlbHBzIHRvIHVwZGF0ZSBcImNvbXBpbGVyT3B0aW9ucy5wYXRoc1wiIHByb3BlcnRpZXMpJylcbiAgICAub3B0aW9uKCctLWhvb2sgPGZpbGU+JywgJ2FkZCB0c2NvbmZpZy9qc2NvbmZpZyBmaWxlIHRvIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS11bmhvb2sgPGZpbGU+JywgJ3JlbW92ZSB0c2NvbmZpZy9qc2NvbmZpZyBmaWxlIGZyb20gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLWNsZWFyLC0tdW5ob29rLWFsbCcsICdyZW1vdmUgYWxsIHRzY29uZmlnIGZpbGVzIGZyb20gZnJvbSBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktdHNjb25maWctaG9vaycpKS5kb1RzY29uZmlnKHRzY29uZmlnQ21kLm9wdHMoKSBhcyBUc2NvbmZpZ0NsaU9wdGlvbnMpO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBCdW1wIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IGJ1bXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2J1bXAgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ2J1bXAgcGFja2FnZS5qc29uIHZlcnNpb24gbnVtYmVyIGZvciBzcGVjaWZpYyBwYWNrYWdlLCBzYW1lIGFzIFwibnBtIHZlcnNpb25cIiBkb2VzJyxcbiAgICAgIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdvbmx5IGJ1bXAgY29tcG9uZW50IHBhY2thZ2VzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNyZS12ZXJzaW9uIDx2YWx1ZT4nLFxuICAgICAgJ3ZlcnNpb24gaW5jcmVtZW50LCB2YWxpZCB2YWx1ZXMgYXJlOiBtYWpvciwgbWlub3IsIHBhdGNoLCBwcmVyZWxlYXNlJywgJ3BhdGNoJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWJ1bXAnKSkuZGVmYXVsdCh7Li4uYnVtcENtZC5vcHRzKCkgYXMgdHAuQnVtcE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKGJ1bXBDbWQpO1xuICAvLyBidW1wQ21kLnVzYWdlKGJ1bXBDbWQudXNhZ2UoKSArICdcXG4nICsgaGwoJ3BsaW5rIGJ1bXAgPHBhY2thZ2U+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gIC8vICAgaGwoJ3BsaW5rIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzIGFuZCBjaGFuZ2UgdmVyc2lvbiB2YWx1ZSBmcm9tIHJlbGF0ZWQgcGFja2FnZS5qc29uJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3BhY2sgcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwYWNrIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXI+JyxcbiAgICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnBhY2soey4uLnBhY2tDbWQub3B0cygpIGFzIHRwLlBhY2tPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhwYWNrQ21kKTtcbiAgcGFja0NtZC51c2FnZShwYWNrQ21kLnVzYWdlKCkgKyAnXFxuQnkgZGVmYXVsdCwgcnVuIFwibnBtIHBhY2tcIiBmb3IgZWFjaCBsaW5rZWQgcGFja2FnZSB3aGljaCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcHVibGlzaENtZCA9IHByb2dyYW0uY29tbWFuZCgncHVibGlzaCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIG5wbSBwdWJsaXNoJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3B1Ymxpc2ggcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLFxuICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncHVibGlzaCBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXB1YmxpYycsICdzYW1lIGFzIFwibnBtIHB1Ymxpc2hcIiBjb21tYW5kIG9wdGlvbiBcIi0tYWNjZXNzIHB1YmxpY1wiJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnB1Ymxpc2goey4uLnB1Ymxpc2hDbWQub3B0cygpIGFzIHRwLlB1Ymxpc2hPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuXG5cbiAgY29uc3QgYW5hbHlzaXNDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FuYWx5emUgW3BrZy1uYW1lLi4uXScpXG4gICAgLmFsaWFzKCdhbmFseXNlJylcbiAgICAuZGVzY3JpcHRpb24oJ1VzZSBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIHBhcnNlIHNvdXJjZSBjb2RlLCBsaXN0IGRlcGVuZGVuY2VzIGJ5IERGUyBhbGdhcml0aG0nLCB7XG4gICAgICAncGtnLW5hbWUnOiAndGhlIG5hbWUgb2YgdGFyZ2V0IHNvdXJjZSBwYWNrYWdlLCB0aGUgcGFja2FnZSBtdXN0IGJlIFBsaW5rIGNvbXBsaWFudCBwYWNrYWdlLCB0aGlzIGNvbW1hbmQgd2lsbCBvbmx5ICcgK1xuICAgICAgICAnc2NhbiBzcGVjaWFsIHNvdXJjZSBjb2RlIGRpcmVjdG9yeSBsaWtlIFwidHMvXCIgYW5kIFwiaXNvbS9cIiBvZiB0YXJnZXQgcGFja2FnZSdcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLWQsIC0tZGlyIDxkaXJlY3Rvcnk+JyxcbiAgICAgICcobXVsdGlwbGUpIGRldGVybWluZSB0YXJnZXQgZGlyZWN0b3J5LCBzY2FuIEpTL0pTWC9UUy9UU1ggZmlsZXMgdW5kZXIgdGFyZ2V0IGRpcmVjdG9yeScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy1mLCAtLWZpbGUgPGZpbGU+JyxcbiAgICAgICcobXVsdGlwbGUpIGRldGVybWluZSB0YXJnZXQgVFMvSlMoWCkgZmlsZXMgKG11bHRpcGxlIGZpbGUgd2l0aCBtb3JlIG9wdGlvbnMgXCItZiA8ZmlsZT4gLWYgPGdsb2I+XCIpJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLWonLCAnU2hvdyByZXN1bHQgaW4gSlNPTicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tYWxpYXMgPGFsaWFzLWV4cHJlc3M+JywgJ2UuZy4gLS1hbGlhcyBcIltcXCdeQC8oLispJFxcJywgXFwnc3JjLyQxXFwnXVwiJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi9jbGktYW5hbHl6ZScpKS5kZWZhdWx0KHBhY2thZ2VzLCBhbmFseXNpc0NtZC5vcHRzKCkgYXMgdHAuQW5hbHl6ZU9wdGlvbnMpO1xuICAgIH0pO1xuXG4gIGFuYWx5c2lzQ21kLnVzYWdlKGFuYWx5c2lzQ21kLnVzYWdlKCkgKyAnXFxuJyArXG4gICAgJ2UuZy5cXG4gICcgKyBjaGFsay5ibHVlKCdwbGluayBhbmFseXplIC1mIFwicGFja2FnZXMvZm9vYmFyMS8qKi8qXCIgLWYgcGFja2FnZXMvZm9vYmFyMi90cy9tYWluLnRzXFxuICAnICtcbiAgICAncGxpbmsgYW5hbHl6ZSAtZCBwYWNrYWdlcy9mb29iYXIxL3NyYyAtZCBwYWNrYWdlcy9mb29iYXIyL3RzJykpO1xuXG4gIGNvbnN0IHVwZGF0ZURpckNtZCA9IHByb2dyYW0uY29tbWFuZCgndXBkYXRlLWRpcicpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gdGhpcyBjb21tYW5kIHRvIHN5bmMgaW50ZXJuYWwgc3RhdGUgd2hlbiB3aG9sZSB3b3Jrc3BhY2UgZGlyZWN0b3J5IGlzIHJlbmFtZWQgb3IgbW92ZWQuXFxuJyArXG4gICAgJ0JlY2F1c2Ugd2Ugc3RvcmUgYWJzb2x1dGUgcGF0aCBpbmZvIG9mIGVhY2ggcGFja2FnZSBpbiBpbnRlcm5hbCBzdGF0ZSwgYW5kIGl0IHdpbGwgYmVjb21lIGludmFsaWQgYWZ0ZXIgeW91IHJlbmFtZSBvciBtb3ZlIGRpcmVjdG9yeScpXG4gICAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlOiBzdHJpbmcpID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmNoZWNrRGlyKHVwZGF0ZURpckNtZC5vcHRzKCkgYXMgYW55KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqXG4gICAqIHRzYyBjb21tYW5kXG4gICAqL1xuICBjb25zdCB0c2NDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzYyBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIFR5cGVzY3JpcHQgY29tcGlsZXIgdG8gY29tcGlsZSBzb3VyY2UgY29kZSBmb3IgdGFyZ2V0IHBhY2thZ2VzLCAnICtcbiAgICAnd2hpY2ggaGF2ZSBiZWVuIGxpbmtlZCB0byBjdXJyZW50IHdvcmsgZGlyZWN0b3J5Jywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctdywgLS13YXRjaCcsICdUeXBlc2NyaXB0IGNvbXBpbGVyIHdhdGNoIG1vZGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52LnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAvLyAub3B0aW9uKCctLXdzLC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdvbmx5IGluY2x1ZGUgdGhvc2UgbGlua2VkIHBhY2thZ2VzIHdoaWNoIGFyZSBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgIC8vICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1qc3gnLCAnaW5jbHVkZXMgVFNYIGZpbGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1zb3VyY2UtbWFwIDxpbmxpbmV8ZmlsZT4nLCAnU291cmNlIG1hcCBzdHlsZTogXCJpbmxpbmVcIiBvciBcImZpbGVcIicsICdpbmxpbmUnKVxuICAgIC5vcHRpb24oJy0tY29wYXRoLCAtLWNvbXBpbGVyLW9wdGlvbnMtcGF0aHMgPHBhdGhNYXBKc29uPicsXG4gICAgICAnQWRkIG1vcmUgXCJwYXRoc1wiIHByb3BlcnR5IHRvIGNvbXBpbGVyIG9wdGlvbnMuICcgK1xuICAgICAgJyhlLmcuIC0tY29wYXRoIFxcJ3tcXFwiQC8qXCI6W1wiL1VzZXJzL3dvcmtlci9vY2Vhbi11aS9zcmMvKlwiXX1cXCcpJywgKHYsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52LnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG4gICAgICBjb25zdCB0c2MgPSBhd2FpdCBpbXBvcnQoJy4uL3RzLWNtZCcpO1xuXG4gICAgICBhd2FpdCB0c2MudHNjKHtcbiAgICAgICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgICAgIHByb2plY3Q6IG9wdC5wcm9qZWN0LFxuICAgICAgICB3YXRjaDogb3B0LndhdGNoLFxuICAgICAgICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgICAgIGpzeDogb3B0LmpzeCxcbiAgICAgICAgZWQ6IG9wdC5lbWl0RGVjbGFyYXRpb25Pbmx5LFxuICAgICAgICBwYXRoc0pzb25zOiBvcHQuY29tcGlsZXJPcHRpb25zUGF0aHNcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gIHRzY0NtZC51c2FnZSh0c2NDbWQudXNhZ2UoKSArICdcXG4nICsgJ1J1biBndWxwLXR5cGVzY3JpcHQgdG8gY29tcGlsZSBOb2RlLmpzIHNpZGUgVHlwZXNjcmlwdCBmaWxlcy5cXG5cXG4nICtcbiAgICAnSXQgY29tcGlsZXMgXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vdHMvKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9kaXN0XCIsXFxuJyArXG4gICAgJyAgb3JcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbVwiXFxuIGZvciBhbGwgQHdmaCBwYWNrYWdlcy5cXG4nICtcbiAgICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAgICdib3RoIE5vZGUuanMgYW5kIEJyb3dzZXIpIGluIGRpcmVjdG9yeSBgaXNvbWAuXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2NcXG4nKSArICdDb21waWxlIGxpbmtlZCBwYWNrYWdlcyB0aGF0IGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UgKHlvdSBzaGFsbCBydW4gdGhpcyBjb21tYW5kIG9ubHkgaW4gYSB3b3Jrc3BhY2UgZGlyZWN0b3J5KVxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBwYWNrYWdlcyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyBbcGFja2FnZS4uLl0gLXdcXG4nKSArICcgV2F0Y2ggcGFja2FnZXMgY2hhbmdlIGFuZCBjb21waWxlIHdoZW4gbmV3IHR5cGVzY3JpcHQgZmlsZSBpcyBjaGFuZ2VkIG9yIGNyZWF0ZWRcXG5cXG4nKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ3NldHRpbmcgW3BhY2thZ2VdJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgcGFja2FnZXMgc2V0dGluZyBhbmQgdmFsdWVzJywge3BhY2thZ2U6ICdwYWNrYWdlIG5hbWUsIG9ubHkgbGlzdCBzZXR0aW5nIGZvciBzcGVjaWZpYyBwYWNrYWdlJ30pXG4gICAgLmFjdGlvbihhc3luYyAocGtnTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1zZXR0aW5nJykpLmRlZmF1bHQocGtnTmFtZSk7XG4gICAgfSk7XG4gICAgLyoqIGNvbW1hbmQgcnVuKi9cbiAgY29uc3QgcnVuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHNwZWNpZmljIG1vZHVsZVxcJ3MgZXhwb3J0ZWQgZnVuY3Rpb25cXG4nKVxuICAgIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gICAgfSk7XG5cbiAgcnVuQ21kLnVzYWdlKHJ1bkNtZC51c2FnZSgpICsgJ1xcbicgKyBjaGFsay5ncmVlbigncGxpbmsgcnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dXFxuJykgK1xuICAgIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICAgJzx0YXJnZXQ+IC0gSlMgb3IgVFMgZmlsZSBtb2R1bGUgcGF0aCB3aGljaCBjYW4gYmUgcmVzb2x2ZWQgYnkgTm9kZS5qcyAodHMtbm9kZSkgZm9sbG93ZWQgYnkgXCIjXCIgYW5kIGV4cG9ydGVkIGZ1bmN0aW9uIG5hbWUsXFxuJyArXG4gICAgJ2UuZy4gXFxuJyArXG4gICAgY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAgICcsIGZ1bmN0aW9uIGNhbiBiZSBhc3luYyB3aGljaCByZXR1cm5zIFByb21pc2VcXG4nICtcbiAgICBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICAgJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG5cbn1cblxuZnVuY3Rpb24gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQsIG92ZXJyaWRlcjogQ29tbWFuZE92ZXJyaWRlcik6IHN0cmluZ1tdIHtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIFtdO1xuICBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgYXZhaWxhYmxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IGRyID0gcGsuanNvbi5kcjtcbiAgICBpZiAoZHIgPT0gbnVsbCB8fCBkci5jbGkgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IFtwa2dGaWxlUGF0aCwgZnVuY05hbWVdID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG5cbiAgICBhdmFpbGFibGVzLnB1c2gocGsubmFtZSk7XG5cbiAgICB0cnkge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UocGssIHBrZ0ZpbGVQYXRoLCBmdW5jTmFtZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cud2FybihgRmFpbGVkIHRvIGxvYWQgY29tbWFuZCBsaW5lIGV4dGVuc2lvbiBpbiBwYWNrYWdlICR7cGsubmFtZX06IFwiJHtlLm1lc3NhZ2V9XCJgLCBlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGF2YWlsYWJsZXM7XG59XG5cblxubGV0IHNraXBWZXJzaW9uQ2hlY2sgPSBmYWxzZTtcbnByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCAoKSA9PiB7XG4gIGlmIChza2lwVmVyc2lvbkNoZWNrKVxuICAgIHJldHVybjtcbiAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG59KTtcblxuZnVuY3Rpb24gY2hlY2tQbGlua1ZlcnNpb24oKSB7XG4gIGNvbnN0IHBranNvbiA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdwYWNrYWdlLmpzb24nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGtqc29uKSkge1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa2pzb24sICd1dGY4JykpO1xuICAgIGxldCBkZXBWZXI6IHN0cmluZyA9IGpzb24uZGVwZW5kZW5jaWVzICYmIGpzb24uZGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ10gfHxcbiAgICAgIGpzb24uZGV2RGVwZW5kZW5jaWVzICYmIGpzb24uZGV2RGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ107XG4gICAgaWYgKGRlcFZlciA9PSBudWxsKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnRG9uXFwndCBmb3JnZXQgdG8gYWRkIEB3ZmgvcGxpbmsgaW4gcGFja2FnZS5qc29uIGFzIGRlcGVuZGVuY2llcycpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRlcFZlci5lbmRzV2l0aCgnLnRneicpKSB7XG4gICAgICBjb25zdCBtYXRjaGVkID0gLy0oXFxkK1xcLlxcZCtcXC5bXl0rPylcXC50Z3okLy5leGVjKGRlcFZlcik7XG4gICAgICBpZiAobWF0Y2hlZCA9PSBudWxsKVxuICAgICAgICByZXR1cm47XG4gICAgICBkZXBWZXIgPSBtYXRjaGVkWzFdO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyICYmICFzZW12ZXIuc2F0aXNmaWVzKHBrLnZlcnNpb24sIGRlcFZlcikpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYm94U3RyaW5nKGBMb2NhbCBpbnN0YWxsZWQgUGxpbmsgdmVyc2lvbiAke2NoYWxrLmN5YW4ocGsudmVyc2lvbil9IGRvZXMgbm90IG1hdGNoIGRlcGVuZGVuY3kgdmVyc2lvbiAke2NoYWxrLmdyZWVuKGRlcFZlcil9IGluIHBhY2thZ2UuanNvbiwgYCArXG4gICAgICAgIGBydW4gY29tbWFuZCBcIiR7Y2hhbGsuZ3JlZW4oJ3BsaW5rIHVwZ3JhZGUnKX1cIiB0byB1cGdyYWRlIG9yIGRvd25ncmFkZSB0byBleHBlY3RlZCB2ZXJzaW9uYCkpO1xuICAgIH1cbiAgfVxufVxuXG4iXX0=