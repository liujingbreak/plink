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
            // eslint-disable-next-line no-console
            console.log(misc_1.sexyFont('PLink').string);
            // eslint-disable-next-line no-console
            console.log(program.helpInformation());
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
            // eslint-disable-next-line no-console
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
        // .option('--lint-hook, --lh', 'Create a git push hook for code lint', false)
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line no-console
        console.log(misc_1.sexyFont('PLink').string);
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
        // eslint-disable-next-line no-console
        console.log(misc_1.sexyFont('PLink').string);
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
        utils_1.hlDesc('plink tsc\n') + ' Compile linked packages that are dependencies of current workspace (you shall run this command only in a workspace directory)\n' +
        utils_1.hlDesc('plink tsc <package..>\n') + ' Only compile specific packages by providing package name or short name\n' +
        utils_1.hlDesc('plink tsc [package...] -w\n') + ' Watch packages change and compile when new typescript file is changed or created\n\n');
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
    checkPlinkVersion();
});
function checkPlinkVersion() {
    const pkjson = path_1.default.resolve(misc_1.getRootDir(), 'package.json');
    if (fs_1.default.existsSync(pkjson)) {
        const json = JSON.parse(fs_1.default.readFileSync(pkjson, 'utf8'));
        let depVer = json.dependencies && json.dependencies['@wfh/plink'] ||
            json.devDependencies && json.devDependencies['@wfh/plink'];
        if (depVer == null) {
            // eslint-disable-next-line no-console
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
            // eslint-disable-next-line no-console
            console.log(misc_1.boxString(`Local installed Plink version ${chalk_1.default.cyan(pk.version)} does not match dependency version ${chalk_1.default.green(depVer)} in package.json, ` +
                `run command "${chalk_1.default.green('plink upgrade')}" to upgrade or downgrade to expected version`));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLDRCQUE0QjtBQUM1QiwwREFBa0M7QUFDbEMsa0RBQTBCO0FBSTFCLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFFdEUsd0NBQXlGO0FBRXpGLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLDZEQUFzRDtBQUN0RCxzREFBOEQ7QUFDOUQsbUNBQThDO0FBQzlDLG1DQUFpQztBQUdqQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQXNCLENBQUM7QUFDakUscUJBQXFCO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFdEIsUUFBQSxpQkFBaUIsR0FBRyx5RUFBeUU7SUFDMUcsZ0dBQWdHLENBQUM7QUFFakcsU0FBc0IsY0FBYyxDQUFDLFNBQWlCOztRQUNwRCxPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztRQUN4Qiw0REFBNEQ7UUFDNUQsd0RBQWEsYUFBYSxHQUFDLENBQUM7UUFDNUIsaUNBQWlDO1FBR2pDLElBQUksYUFBbUMsQ0FBQztRQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUM3QyxXQUFXLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO2FBQzlFLE1BQU0sQ0FBQyxDQUFDLElBQWMsRUFBRSxFQUFFO1lBQ3pCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENB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QXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQVMsQ0FBQyxpRUFBaUUsQ0FBQyxDQUFDLENBQUM7WUFDMUYsT0FBTztTQUNSO1FBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzNCLE1BQU0sT0FBTyxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4RCxJQUFJLE9BQU8sSUFBSSxJQUFJO2dCQUNqQixPQUFPO1lBQ1QsTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyQjtRQUNELElBQUksTUFBTSxJQUFJLENBQUMsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNuRCxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBUyxDQUFDLGlDQUFpQyxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsc0NBQXNDLGVBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFvQjtnQkFDeEosZ0JBQWdCLGVBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLCtDQUErQyxDQUFDLENBQUMsQ0FBQztTQUNqRztLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2Nmb250LmQudHNcIiAvPlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbi8vIGltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIHRwIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbi8vIGltcG9ydCAnLi4vdHNjLXBhY2thZ2VzLXNsaWNlJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IGlzRHJjcFN5bWxpbmssIHNleHlGb250LCBnZXRSb290RGlyLCBib3hTdHJpbmcsIHBsaW5rRW52IH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBfc3ltbGlua3MgZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHtDb21tYW5kT3ZlcnJpZGVyfSBmcm9tICcuL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHtobERlc2MsIGFycmF5T3B0aW9uRm59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0NsaU9wdGlvbnMgYXMgVHNjb25maWdDbGlPcHRpb25zfSBmcm9tICcuL2NsaS10c2NvbmZpZy1ob29rJztcbmltcG9ydCAqIGFzIF9jbGlXYXRjaCBmcm9tICcuL2NsaS13YXRjaCc7XG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpIGFzIHt2ZXJzaW9uOiBzdHJpbmd9O1xuLy8gY29uc3QgV0lEVEggPSAxMzA7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaScpO1xuXG5leHBvcnQgY29uc3QgY2xpUGFja2FnZUFyZ0Rlc2MgPSAnU2luZ2xlIG9yIG11bHRpcGxlIHBhY2thZ2UgbmFtZXMsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkLCcgK1xuJ2lmIHRoZSBzY29wZSBuYW1lICh0aGUgcGFydCBiZXR3ZWVuIFwiQFwiIFwiL1wiKSBhcmUgbGlzdGVkIGNvbmZpZ3VyYXRpb24gcHJvcGVydHkgXCJwYWNrYWdlU2NvcGVzXCInO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tbWFuZHMoc3RhcnRUaW1lOiBudW1iZXIpIHtcbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayc7XG4gIC8vIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9OiB0eXBlb2Ygc3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZScpO1xuICBhd2FpdCBpbXBvcnQoJy4vY2xpLXNsaWNlJyk7XG4gIC8vIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG5cbiAgbGV0IGNsaUV4dGVuc2lvbnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKCdwbGluaycpXG4gIC5kZXNjcmlwdGlvbihjaGFsay5jeWFuKCdBIHBsdWdnYWJsZSBtb25vcmVwbyBhbmQgbXVsdGktcmVwbyBtYW5hZ2VtZW50IHRvb2wnKSlcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhwcm9ncmFtLmhlbHBJbmZvcm1hdGlvbigpKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBcXG52ZXJzaW9uOiAke3BrLnZlcnNpb259ICR7aXNEcmNwU3ltbGluayA/IGNoYWxrLnllbGxvdygnKHN5bWxpbmtlZCknKSA6ICcnfSBgKTtcbiAgICBpZiAoY2xpRXh0ZW5zaW9ucyAmJiBjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtjbGlFeHRlbnNpb25zLmxlbmd0aH0gY29tbWFuZCBsaW5lIGV4dGVuc2lvbmAgK1xuICAgICAgYCR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiAke2NsaUV4dGVuc2lvbnMubWFwKHBrZyA9PiBjaGFsay5ibHVlKHBrZykpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbicsIGNoYWxrLmJnUmVkKCdQbGVhc2UgZGV0ZXJtaW5lIGEgc3ViIGNvbW1hbmQgbGlzdGVkIGFib3ZlJykpO1xuICAgIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBwcm9jZXNzLmV4aXQoMSkpO1xuICB9KTtcbiAgcHJvZ3JhbS5hZGRIZWxwVGV4dCgnYmVmb3JlJywgc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbiAgcHJvZ3JhbS5hZGRIZWxwQ29tbWFuZCgnaGVscCBbY29tbWFuZF0nLCAnc2hvdyBoZWxwIGluZm9ybWF0aW9uLCBzYW1lIGFzIFwiLWhcIi4gJyk7XG5cbiAgY29uc3Qgb3ZlcnJpZGVyID0gbmV3IENvbW1hbmRPdmVycmlkZXIocHJvZ3JhbSk7XG4gIGxldCB3c1N0YXRlOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQ7XG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBjb25zdCB7Z2V0U3RhdGU6IGdldFBrZ1N0YXRlLCB3b3Jrc3BhY2VLZXl9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtnTWdyO1xuICAgIHdzU3RhdGUgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKSk7XG4gICAgaWYgKHdzU3RhdGUgIT0gbnVsbCkge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgcHJvZ3JhbSA9PiB7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gc3RyID0+IGNoYWxrLmdyZWVuKHN0cik7XG4gICAgICAgIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW0pO1xuICAgICAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgc3ViQ29tYW5kcyhwcm9ncmFtKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgc3ViQ29tYW5kcyk7XG4gIH1cblxuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfU0FGRSAhPT0gJ3RydWUnKSB7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuY3lhbihzdHIpO1xuICAgIGNsaUV4dGVuc2lvbnMgPSBsb2FkRXh0ZW5zaW9uQ29tbWFuZChwcm9ncmFtLCB3c1N0YXRlLCBvdmVycmlkZXIpO1xuICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1ZhbHVlIG9mIGVudmlyb25tZW50IHZhcmFpYmxlIFwiUExJTktfU0FGRVwiIGlzIHRydWUsIHNraXAgbG9hZGluZyBleHRlbnNpb24nKTtcbiAgfVxuXG4gIG92ZXJyaWRlci5hcHBlbmRHbG9iYWxPcHRpb25zKGZhbHNlKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2LCB7ZnJvbTogJ25vZGUnfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIGNvbW1hbmQgZHVlIHRvOicgKyBjaGFsay5yZWRCcmlnaHQoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpLCBlKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3ViQ29tYW5kcyhwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICAvKiogY29tbWFuZCBpbml0XG4gICAqL1xuICBjb25zdCBpbml0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdpbml0IFt3b3JrLWRpcmVjdG9yeV0nKS5hbGlhcygnc3luYycpXG4gICAgLmRlc2NyaXB0aW9uKCdJbml0aWFsaXplIGFuZCB1cGRhdGUgd29yayBkaXJlY3RvcnksIGdlbmVyYXRlIGJhc2ljIGNvbmZpZ3VyYXRpb24gZmlsZXMgZm9yIHByb2plY3QgYW5kIGNvbXBvbmVudCBwYWNrYWdlcywnICtcbiAgICAgICcgY2FsY3VsYXRlIGhvaXN0ZWQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMsIGFuZCBydW4gXCJucG0gaW5zdGFsbFwiIGluIGN1cnJlbnQgZGlyZWN0b3J5LicsXG4gICAgICB7XG4gICAgICAgICd3b3JrLWRpcmVjdG9yeSc6ICdBIHJlbGF0aXZlIG9yIGFib3NvbHV0ZSBkaXJlY3RvcnkgcGF0aCwgdXNlIFwiLlwiIHRvIGRldGVybWluZSBjdXJyZW50IGRpcmVjdG9yeSxcXG4gIG9tbWl0dGluZyB0aGlzIGFyZ3VtZW50IG1lYW5pbmc6XFxuJyArXG4gICAgICAgICAgJyAgLSBJZiBjdXJyZW50IGRpcmVjdG9yeSBpcyBhbHJlYWR5IGEgXCJ3b3JrIGRpcmVjdG9yeVwiLCB1cGRhdGUgaXQuXFxuJyArXG4gICAgICAgICAgJyAgLSBJZiBjdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3JrIGRpcmVjdG9yeSAobWF5YmUgYXQgcmVwb1xcJ3Mgcm9vdCBkaXJlY3RvcnkpLCB1cGRhdGUgdGhlIGxhdGVzdCB1cGRhdGVkIHdvcmsnICtcbiAgICAgICAgICAnIGRpcmVjdG9yeS4nXG4gICAgICB9KVxuICAgIC5vcHRpb24oJy1mLCAtLWZvcmNlJywgJ0ZvcmNlIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeSwgdGhpcyBpcyBub3Qgc2FtZSBhcyBucG0gaW5zdGFsbCBvcHRpb24gXCItZlwiICcsIGZhbHNlKVxuICAgIC8vIC5vcHRpb24oJy0tbGludC1ob29rLCAtLWxoJywgJ0NyZWF0ZSBhIGdpdCBwdXNoIGhvb2sgZm9yIGNvZGUgbGludCcsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZT86IHN0cmluZykgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1pbml0JykpLmRlZmF1bHQoaW5pdENtZC5vcHRzKCkgYXMgdHAuSW5pdENtZE9wdGlvbnMgJiB0cC5OcG1DbGlPcHRpb24sIHdvcmtzcGFjZSk7XG4gICAgfSk7XG4gIGFkZE5wbUluc3RhbGxPcHRpb24oaW5pdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcHJvamVjdFxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdwcm9qZWN0IFthZGR8cmVtb3ZlXSBbZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZnJvbSBhc3NvY2lhdGVkIHByb2plY3RzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgQXNzb2NpYXRlIHRvIGEgcHJvamVjdCBvciBEaXNhc3NvY2lhdGUgZnJvbSBhIHByb2plY3QnLFxuICAgICAgICBkaXI6ICdTcGVjaWZ5IHRhcmdldCBwcm9qZWN0IHJlcG8gZGlyZWN0b3J5IChhYnNvbHV0ZSBwYXRoIG9yIHJlbGF0aXZlIHBhdGggdG8gY3VycmVudCBkaXJlY3RvcnkpJyArXG4gICAgICAgICAgJywgc3BlY2lmeSBtdWx0aXBsZSBwcm9qZWN0IGJ5IHNlcGVyYXRpbmcgdGhlbSB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIHByb2plY3REaXI6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXByb2plY3QnKSkuZGVmYXVsdCh7aXNTcmNEaXI6IGZhbHNlfSwgYWN0aW9uLCBwcm9qZWN0RGlyKTtcbiAgICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ3NyYyBbYWRkfHJlbW92ZV0gW2Rpci4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignQXNzb2NpYXRlLCBkaXNhc3NvY2lhdGUgb3IgbGlzdCBzb3VyY2UgZGlyZWN0b3JpZXMsIFBsaW5rIHdpbGwnICtcbiAgICAgICcgc2NhbiBzb3VyY2UgY29kZSBkaXJlY3RvcmllcyBmb3IgcGFja2FnZXMnLCB7XG4gICAgICAgICdhZGR8cmVtb3ZlJzogJ1NwZWNpZnkgd2hldGhlciBhc3NvY2lhdGUgdG8gYSBkaXJlY3Rvcnkgb3IgZGlzYXNzb2NpYXRlIGZyb20gYSBkaXJlY3RvcnknLFxuICAgICAgICBkaXI6ICdzcGVjaWZ5IG11bHRpcGxlIGRpcmVjdG9yaWVzIGJ5IHNlcGVyYXRpbmcgdGhlbSB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgICAuYWN0aW9uKGFzeW5jIChhY3Rpb246ICdhZGQnfCdyZW1vdmUnfHVuZGVmaW5lZCwgZGlyczogc3RyaW5nW10pID0+IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktcHJvamVjdCcpKS5kZWZhdWx0KHtpc1NyY0RpcjogdHJ1ZX0sIGFjdGlvbiwgZGlycyk7XG4gICAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsaW50XG4gICAqL1xuICAvLyBjb25zdCBsaW50Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdsaW50IFtwYWNrYWdlLi4uXScpXG4gIC8vICAgLmRlc2NyaXB0aW9uKCdzb3VyY2UgY29kZSBzdHlsZSBjaGVjaycsIHtcbiAgLy8gICAgIHBhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjXG4gIC8vICAgfSlcbiAgLy8gICAub3B0aW9uKCctLXBqIDxwcm9qZWN0MSxwcm9qZWN0Mi4uLj4nLCAnbGludCBvbmx5IFRTIGNvZGUgZnJvbSBzcGVjaWZpYyBwcm9qZWN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gIC8vICAgLm9wdGlvbignLS1maXgnLCAnUnVuIGVzbGludC90c2xpbnQgZml4LCB0aGlzIGNvdWxkIGNhdXNlIHlvdXIgc291cmNlIGNvZGUgYmVpbmcgY2hhbmdlZCB1bmV4cGVjdGVkbHknLCBmYWxzZSlcbiAgLy8gICAuYWN0aW9uKGFzeW5jIHBhY2thZ2VzID0+IHtcbiAgLy8gICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxpbnQnKSkuZGVmYXVsdChwYWNrYWdlcywgbGludENtZC5vcHRzKCkgYXMgYW55KTtcbiAgLy8gICB9KTtcblxuICAvLyBsaW50Q21kLnVzYWdlKGxpbnRDbWQudXNhZ2UoKSArXG4gIC8vICAgaGwoJ1xcbmRyY3AgbGludCAtLXBqIDxwcm9qZWN0LWRpci4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeVxcbicgK1xuICAvLyAgIGhsKCdcXG5kcmNwIGxpbnQgPGNvbXBvbmVudC1wYWNrYWdlLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIGNvbXBvbmVudCBwYWNrYWdlcycpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGNsZWFuXG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ2NzJykuYWxpYXMoJ2NsZWFyLXN5bWxpbmtzJylcbiAgICAuZGVzY3JpcHRpb24oJ0NsZWFyIHN5bWxpbmtzIGZyb20gbm9kZV9tb2R1bGVzJylcbiAgICAvLyAub3B0aW9uKCctLW9ubHktc3ltbGluaycsICdDbGVhbiBvbmx5IHN5bWxpbmtzLCBub3QgZGlzdCBkaXJlY3RvcnknLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHNjYW5Ob2RlTW9kdWxlcyA9IChyZXF1aXJlKCcuLi91dGlscy9zeW1saW5rcycpIGFzIHR5cGVvZiBfc3ltbGlua3MpLmRlZmF1bHQ7XG4gICAgICBhd2FpdCBzY2FuTm9kZU1vZHVsZXModW5kZWZpbmVkLCAnYWxsJyk7XG4gICAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgdXBncmFkZVxuICAgKi9cbiAgY29uc3QgdXBncmFkZUNtZCA9IHByb2dyYW0uY29tbWFuZCgndXBncmFkZScpXG4gICAgLmFsaWFzKCdpbnN0YWxsJylcbiAgICAuZGVzY3JpcHRpb24oJ1JlaW5zdGFsbCBsb2NhbCBQbGluayBhbG9uZyB3aXRoIG90aGVyIGRlcGVuZGVuY2llcy4nICtcbiAgICAgICcgKFVubGlrZSBcIm5wbSBpbnN0YWxsXCIgd2hpY2ggZG9lcyBub3Qgd29yayB3aXRoIG5vZGVfbW9kdWxlcyB0aGF0IG1pZ2h0IGNvbnRhaW4gc3ltbGlua3MpJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGluay1wbGluaycpKS5yZWluc3RhbGxXaXRoTGlua2VkUGxpbmsodXBncmFkZUNtZC5vcHRzKCkgYXMgdHAuTnBtQ2xpT3B0aW9uKTtcbiAgICB9KTtcbiAgYWRkTnBtSW5zdGFsbE9wdGlvbih1cGdyYWRlQ21kKTtcbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdkb2NrZXJpemUgPHdvcmtzcGFjZS1kaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKGNoYWxrLmdyYXkoJ1tUQkldIEdlbmVyYXRlIERvY2tlcmZpbGUgZm9yIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnksIGFuZCBnZW5lcmF0ZSBkb2NrZXIgaW1hZ2UnKSk7XG5cbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdwa2cgPHdvcmtzcGFjZS1kaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKGNoYWxrLmdyYXkoJ1tUQkldIFVzZSBQa2cgKGh0dHBzOi8vZ2l0aHViLmNvbS92ZXJjZWwvcGtnKSB0byBwYWNrYWdlIE5vZGUuanMgcHJvamVjdCBpbnRvIGFuIGV4ZWN1dGFibGUgJykpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxzXG4gICAqL1xuICBjb25zdCBsaXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdscycpLmFsaWFzKCdsaXN0JylcbiAgICAub3B0aW9uKCctaiwgLS1qc29uJywgJ2xpc3QgbGlua2VkIGRlcGVuZGVuY2llcyBpbiBmb3JtIG9mIEpTT04nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWhvaXN0JywgJ2xpc3QgaG9pc3RlZCB0cmFuc2l0aXZlIERlcGVuZGVuY3kgaW5mb3JtYXRpb24nLCBmYWxzZSlcbiAgICAuZGVzY3JpcHRpb24oJ0lmIHlvdSB3YW50IHRvIGtub3cgaG93IG1hbnkgcGFja2FnZXMgd2lsbCBhY3R1YWxseSBydW4sIHRoaXMgY29tbWFuZCBwcmludHMgb3V0IGEgbGlzdCBhbmQgdGhlIHByaW9yaXRpZXMsIGluY2x1ZGluZyBpbnN0YWxsZWQgcGFja2FnZXMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuZGVmYXVsdChsaXN0Q21kLm9wdHMoKSBhcyBhbnkpO1xuICAgIH0pO1xuXG4gIGNvbnN0IGFkZENtZCA9IHByb2dyYW0uY29tbWFuZCgnYWRkIDxkZXBlbmRlbmN5Li4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdBZGQgZGVwZW5kZW5jeSB0byBwYWNrYWdlLmpzb24gZmlsZSwgd2l0aCBvcHRpb24gXCItLWRldlwiIHRvIGFkZCBhcyBcImRldkRlcGVuZGVuY2llc1wiLCAnICtcbiAgICAgICd3aXRob3V0IG9wdGlvbiBcIi0tdG9cIiB0aGlzIGNvbW1hbmQgYWRkcyBkZXBlbmRlbmN5IHRvIGN1cnJlbnQgd29ya3RyZWUgc3BhY2VcXCdzIHBhY2thZ2UuanNvbiBmaWxlJyxcbiAgICAgIHtcbiAgICAgICAgZGVwZW5kZW5jeTogJ2RlcGVuZGVuY3kgcGFja2FnZSBuYW1lIGluIGZvcm0gb2YgXCI8YSBsaW5rZWQgcGFja2FnZSBuYW1lIHdpdGhvdXQgc2NvcGUgcGFydD5cIiwgXCI8cGFja2FnZSBuYW1lPkA8dmVyc2lvbj5cIiwgJ1xuICAgICAgfSlcbiAgICAub3B0aW9uKCctLXRvIDxwa2cgbmFtZSB8IHdvcmt0cmVlIGRpciB8IHBrZyBkaXI+JywgJ2FkZCBkZXBlbmRlbmN5IHRvIHRoZSBwYWNrYWdlLmpzb24gb2Ygc3BlY2lmaWMgbGlua2VkIHNvdXJjZSBwYWNrYWdlIGJ5IG5hbWUgb3IgZGlyZWN0b3J5LCBvciBhIHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yeScpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hZGQtcGFja2FnZScpKS5hZGREZXBlbmRlbmN5VG8ocGFja2FnZXMsIGFkZENtZC5vcHRzKCkudG8sIGFkZENtZC5vcHRzKCkuZGV2KTtcbiAgICB9KTtcblxuICBjb25zdCB0c2NvbmZpZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjb25maWcnKVxuICAgIC5kZXNjcmlwdGlvbignTGlzdCB0c2NvbmZpZy5qc29uLCBqc2NvbmZpZy5qc29uIGZpbGVzIHdoaWNoIHdpbGwgYmUgdXBkYXRlZCBhdXRvbWF0aWNhbGx5IGJ5IFBsaW5rLCAoYSBtb25vcmVwbyBtZWFucyB0aGVyZSBhcmUgbm9kZSBwYWNrYWdlcyB3aGljaCBhcmUgc3ltbGlua2VkIGZyb20gcmVhbCBzb3VyY2UgY29kZSBkaXJlY3RvcnknICtcbiAgICAgICcsIGlmIHlvdSBoYXZlIGN1c3RvbWl6ZWQgdHNjb25maWcuanNvbiBmaWxlLCB0aGlzIGNvbW1hbmQgaGVscHMgdG8gdXBkYXRlIFwiY29tcGlsZXJPcHRpb25zLnBhdGhzXCIgcHJvcGVydGllcyknKVxuICAgIC5vcHRpb24oJy0taG9vayA8ZmlsZT4nLCAnYWRkIHRzY29uZmlnL2pzY29uZmlnIGZpbGUgdG8gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXVuaG9vayA8ZmlsZT4nLCAncmVtb3ZlIHRzY29uZmlnL2pzY29uZmlnIGZpbGUgZnJvbSBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tY2xlYXIsLS11bmhvb2stYWxsJywgJ3JlbW92ZSBhbGwgdHNjb25maWcgZmlsZXMgZnJvbSBmcm9tIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS10c2NvbmZpZy1ob29rJykpLmRvVHNjb25maWcodHNjb25maWdDbWQub3B0cygpIGFzIFRzY29uZmlnQ2xpT3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgLyoqXG4gICAqIEJ1bXAgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgYnVtcENtZCA9IHByb2dyYW0uY29tbWFuZCgnYnVtcCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignYnVtcCBwYWNrYWdlLmpzb24gdmVyc2lvbiBudW1iZXIgZm9yIHNwZWNpZmljIHBhY2thZ2UsIHNhbWUgYXMgXCJucG0gdmVyc2lvblwiIGRvZXMnLFxuICAgICAge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ29ubHkgYnVtcCBjb21wb25lbnQgcGFja2FnZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpO1xuICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY3JlLXZlcnNpb24gPHZhbHVlPicsXG4gICAgICAndmVyc2lvbiBpbmNyZW1lbnQsIHZhbGlkIHZhbHVlcyBhcmU6IG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UnLCAncGF0Y2gnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktYnVtcCcpKS5kZWZhdWx0KHsuLi5idW1wQ21kLm9wdHMoKSBhcyB0cC5CdW1wT3B0aW9ucywgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoYnVtcENtZCk7XG4gIC8vIGJ1bXBDbWQudXNhZ2UoYnVtcENtZC51c2FnZSgpICsgJ1xcbicgKyBobCgncGxpbmsgYnVtcCA8cGFja2FnZT4gLi4uJykgKyAnIHRvIHJlY3Vyc2l2ZWx5IGJ1bXAgcGFja2FnZS5qc29uIGZyb20gbXVsdGlwbGUgZGlyZWN0b3JpZXNcXG4nICtcbiAgLy8gICBobCgncGxpbmsgYnVtcCA8ZGlyPiAtaSBtaW5vcicpICsgJyB0byBidW1wIG1pbm9yIHZlcnNpb24gbnVtYmVyLCBkZWZhdWx0IGlzIHBhdGNoIG51bWJlcicpO1xuXG4gIC8qKlxuICAgKiBQYWNrIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHBhY2tDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3BhY2sgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ25wbSBwYWNrIHBha2FnZSBpbnRvIHRhcmJhbGwgZmlsZXMgYW5kIGNoYW5nZSB2ZXJzaW9uIHZhbHVlIGZyb20gcmVsYXRlZCBwYWNrYWdlLmpzb24nLCB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncGFjayBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLXcsLS13b3Jrc3BhY2UgPHdvcmtzcGFjZS1kaXI+JywgJ3BhY2sgcGFja2FnZXMgd2hpY2ggYXJlIGxpbmtlZCBhcyBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpcj4nLFxuICAgICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucGFjayh7Li4ucGFja0NtZC5vcHRzKCkgYXMgdHAuUGFja09wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKHBhY2tDbWQpO1xuICBwYWNrQ21kLnVzYWdlKHBhY2tDbWQudXNhZ2UoKSArICdcXG5CeSBkZWZhdWx0LCBydW4gXCJucG0gcGFja1wiIGZvciBlYWNoIGxpbmtlZCBwYWNrYWdlIHdoaWNoIGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UnKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwdWJsaXNoQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwdWJsaXNoIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdydW4gbnBtIHB1Ymxpc2gnLCB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncHVibGlzaCBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsXG4gICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwdWJsaXNoIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcHVibGljJywgJ3NhbWUgYXMgXCJucG0gcHVibGlzaFwiIGNvbW1hbmQgb3B0aW9uIFwiLS1hY2Nlc3MgcHVibGljXCInLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucHVibGlzaCh7Li4ucHVibGlzaENtZC5vcHRzKCkgYXMgdHAuUHVibGlzaE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG5cblxuICBjb25zdCBhbmFseXNpc0NtZCA9IHByb2dyYW0uY29tbWFuZCgnYW5hbHl6ZSBbcGtnLW5hbWUuLi5dJylcbiAgICAuYWxpYXMoJ2FuYWx5c2UnKVxuICAgIC5kZXNjcmlwdGlvbignVXNlIFR5cGVzY3JpcHQgY29tcGlsZXIgdG8gcGFyc2Ugc291cmNlIGNvZGUsIGxpc3QgZGVwZW5kZW5jZXMgYnkgREZTIGFsZ2FyaXRobSwgcmVzdWx0IGluZm9ybWF0aW9uIGluY2x1ZGVzJyArXG4gICAgICAnOiBjeWNsaWMgZGVwZW5kZWNpZXMsIHVucmVzb2x2YWJsZSBkZXBlbmRlbmNpZXMsIGV4dGVybmFsIGRlcGVuZGVuY2llcywgZGVwZW5kZW5jaWVzIGFyZSBub3QgdW5kZXIgdGFyZ2V0IGRpcmVjdG9yeS4nLCB7XG4gICAgICAncGtnLW5hbWUnOiAndGhlIG5hbWUgb2YgdGFyZ2V0IHNvdXJjZSBwYWNrYWdlLCB0aGUgcGFja2FnZSBtdXN0IGJlIFBsaW5rIGNvbXBsaWFudCBwYWNrYWdlLCB0aGlzIGNvbW1hbmQgd2lsbCBvbmx5ICcgK1xuICAgICAgICAnc2NhbiBzcGVjaWFsIHNvdXJjZSBjb2RlIGRpcmVjdG9yeSBsaWtlIFwidHMvXCIgYW5kIFwiaXNvbS9cIiBvZiB0YXJnZXQgcGFja2FnZSdcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLXggPHJlZ2V4cD4nLCAnSW5nb3JlIFwibW9kdWxlIG5hbWVcIiB0aGF0IG1hdGNoZXMgc3BlY2lmaWMgUmVndWxhciBFeHBlcnNzaW9uJywgJ1xcLihsZXNzfHNjc3N8Y3NzKSQnKVxuICAgIC5vcHRpb24oJy1kLCAtLWRpciA8ZGlyZWN0b3J5PicsXG4gICAgICAnKG11bHRpcGxlKSBkZXRlcm1pbmUgdGFyZ2V0IGRpcmVjdG9yeSwgc2NhbiBKUy9KU1gvVFMvVFNYIGZpbGVzIHVuZGVyIHRhcmdldCBkaXJlY3RvcnknLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctZiwgLS1maWxlIDxmaWxlPicsXG4gICAgICAnKG11bHRpcGxlKSBkZXRlcm1pbmUgdGFyZ2V0IFRTL0pTKFgpIGZpbGVzIChtdWx0aXBsZSBmaWxlIHdpdGggbW9yZSBvcHRpb25zIFwiLWYgPGZpbGU+IC1mIDxnbG9iPlwiKScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy1qJywgJ1Nob3cgcmVzdWx0IGluIEpTT04nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXRzY29uZmlnIDxmaWxlPicsICdVc2UgXCJjb21waWxlck9wdGlvbnMucGF0aHNcIiBwcm9wZXJ0eSB0byByZXNvbHZlIHRzL2pzIGZpbGUgbW9kdWxlJylcbiAgICAub3B0aW9uKCctLWFsaWFzIDxhbGlhcy1leHByZXNzPicsICdhIEpTT04gZXhwcmVzcywgZS5nLiAtLWFsaWFzIFxcJ1tcIl5ALyguKykkXCIsXCJzcmMvJDFcIl1cXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hbmFseXplJykpLmRlZmF1bHQocGFja2FnZXMsIGFuYWx5c2lzQ21kLm9wdHMoKSBhcyB0cC5BbmFseXplT3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgYW5hbHlzaXNDbWQudXNhZ2UoYW5hbHlzaXNDbWQudXNhZ2UoKSArICdcXG4nICtcbiAgICAnZS5nLlxcbiAgJyArIGNoYWxrLmJsdWUoJ3BsaW5rIGFuYWx5emUgLWYgXCJwYWNrYWdlcy9mb29iYXIxLyoqLypcIiAtZiBwYWNrYWdlcy9mb29iYXIyL3RzL21haW4udHNcXG4gICcgK1xuICAgICdwbGluayBhbmFseXplIC1kIHBhY2thZ2VzL2Zvb2JhcjEvc3JjIC1kIHBhY2thZ2VzL2Zvb2JhcjIvdHMnKSk7XG5cbiAgY29uc3Qgd2F0Y2hDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3dhdGNoIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignV2F0Y2ggcGFja2FnZSBzb3VyY2UgY29kZSBmaWxlIGNoYW5nZXMgKGZpbGVzIHJlZmVyZW5jZWQgaW4gLm5wbWlnbm9yZSB3aWxsIGJlIGlnbm9yZWQpIGFuZCB1cGRhdGUgUGxpbmsgc3RhdGUsICcgK1xuICAnYXV0b21hdGljYWxseSBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeScsIHtcbiAgICBwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gIC5vcHRpb24oJy0tY3AsIC0tY29weSA8ZGlyZWN0b3J5PicsICdjb3B5IHBhY2thZ2UgZmlsZXMgdG8gc3BlY2lmaWMgZGlyZWN0b3J5LCBtaW1pYyBiZWhhdmlvciBvZiBcIm5wbSBpbnN0YWxsIDxwa2c+XCIsIGJ1dCB0aGlzIHdvblxcJ3QgaW5zdGFsbCBkZXBlbmRlbmNpZXMnKVxuICAuYWN0aW9uKChwa2dzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IHtjbGlXYXRjaH0gPSByZXF1aXJlKCcuL2NsaS13YXRjaCcpIGFzIHR5cGVvZiBfY2xpV2F0Y2g7XG4gICAgY2xpV2F0Y2gocGtncywgd2F0Y2hDbWQub3B0cygpKTtcbiAgfSk7XG5cbiAgY29uc3QgdXBkYXRlRGlyQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGRhdGUtZGlyJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biB0aGlzIGNvbW1hbmQgdG8gc3luYyBpbnRlcm5hbCBzdGF0ZSB3aGVuIHdob2xlIHdvcmtzcGFjZSBkaXJlY3RvcnkgaXMgcmVuYW1lZCBvciBtb3ZlZC5cXG4nICtcbiAgICAnQmVjYXVzZSB3ZSBzdG9yZSBhYnNvbHV0ZSBwYXRoIGluZm8gb2YgZWFjaCBwYWNrYWdlIGluIGludGVybmFsIHN0YXRlLCBhbmQgaXQgd2lsbCBiZWNvbWUgaW52YWxpZCBhZnRlciB5b3UgcmVuYW1lIG9yIG1vdmUgZGlyZWN0b3J5JylcbiAgICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuY2hlY2tEaXIodXBkYXRlRGlyQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqXG4gICAqIHRzYyBjb21tYW5kXG4gICAqL1xuICBjb25zdCB0c2NDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzYyBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIFR5cGVzY3JpcHQgY29tcGlsZXIgdG8gY29tcGlsZSBzb3VyY2UgY29kZSBmb3IgdGFyZ2V0IHBhY2thZ2VzLCAnICtcbiAgICAnd2hpY2ggaGF2ZSBiZWVuIGxpbmtlZCB0byBjdXJyZW50IHdvcmsgZGlyZWN0b3J5Jywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctdywgLS13YXRjaCcsICdUeXBlc2NyaXB0IGNvbXBpbGVyIHdhdGNoIG1vZGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52LnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAvLyAub3B0aW9uKCctLXdzLC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdvbmx5IGluY2x1ZGUgdGhvc2UgbGlua2VkIHBhY2thZ2VzIHdoaWNoIGFyZSBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgIC8vICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS10c3gsLS1qc3gnLCAnaW5jbHVkZXMgVFNYIGZpbGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1zb3VyY2UtbWFwIDxpbmxpbmV8ZmlsZT4nLCAnU291cmNlIG1hcCBzdHlsZTogXCJpbmxpbmVcIiBvciBcImZpbGVcIicsICdpbmxpbmUnKVxuICAgIC5vcHRpb24oJy0tbWVyZ2UsLS1tZXJnZS10c2NvbmZpZyA8ZmlsZT4nLCAnTWVyZ2UgY29tcGlsZXJPcHRpb25zIFwiYmFzZVVybFwiIGFuZCBcInBhdGhzXCIgZnJvbSBzcGVjaWZpZWQgdHNjb25maWcgZmlsZScpXG4gICAgLm9wdGlvbignLS1jb3BhdGgsIC0tY29tcGlsZXItb3B0aW9ucy1wYXRocyA8cGF0aE1hcEpzb24+JyxcbiAgICAgICdBZGQgbW9yZSBcInBhdGhzXCIgcHJvcGVydHkgdG8gY29tcGlsZXIgb3B0aW9ucy4gJyArXG4gICAgICAnKGUuZy4gLS1jb3BhdGggXFwne1xcXCJALypcIjpbXCIvVXNlcnMvd29ya2VyL29jZWFuLXVpL3NyYy8qXCJdfVxcJyknLCAodiwgcHJldikgPT4ge1xuICAgICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC5vcHRpb24oJy0tY28gPEpTT04tc3RyaW5nPicsXG4gICAgICBgUGFydGlhbCBjb21waWxlciBvcHRpb25zIHRvIGJlIG1lcmdlZCAoZXhjZXB0IFwiYmFzZVVybFwiKSwgXCJwYXRoc1wiIG11c3QgYmUgcmVsYXRpdmUgdG8gJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHBsaW5rRW52LndvcmtEaXIpIHx8ICdjdXJyZW50IGRpcmVjdG9yeSd9YClcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG4gICAgICBjb25zdCB0c2MgPSBhd2FpdCBpbXBvcnQoJy4uL3RzLWNtZCcpO1xuXG4gICAgICBhd2FpdCB0c2MudHNjKHtcbiAgICAgICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgICAgIHByb2plY3Q6IG9wdC5wcm9qZWN0LFxuICAgICAgICB3YXRjaDogb3B0LndhdGNoLFxuICAgICAgICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgICAgIGpzeDogb3B0LmpzeCxcbiAgICAgICAgZWQ6IG9wdC5lbWl0RGVjbGFyYXRpb25Pbmx5LFxuICAgICAgICBwYXRoc0pzb25zOiBvcHQuY29tcGlsZXJPcHRpb25zUGF0aHMsXG4gICAgICAgIG1lcmdlVHNjb25maWc6IG9wdC5tZXJnZVRzY29uZmlnLFxuICAgICAgICBjb21waWxlck9wdGlvbnM6IG9wdC5jbyA/IEpTT04ucGFyc2Uob3B0LmNvKSA6IHVuZGVmaW5lZFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgdHNjQ21kLnVzYWdlKHRzY0NtZC51c2FnZSgpICtcbiAgICAnXFxuSXQgY29tcGlsZXMgXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vdHMvKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9kaXN0XCIsXFxuJyArXG4gICAgJyAgb3JcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbVwiXFxuIGZvciBhbGwgQHdmaCBwYWNrYWdlcy5cXG4nICtcbiAgICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAgICdib3RoIE5vZGUuanMgYW5kIEJyb3dzZXIpIGluIGRpcmVjdG9yeSBgaXNvbWAuXFxuXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2NcXG4nKSArICcgQ29tcGlsZSBsaW5rZWQgcGFja2FnZXMgdGhhdCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlICh5b3Ugc2hhbGwgcnVuIHRoaXMgY29tbWFuZCBvbmx5IGluIGEgd29ya3NwYWNlIGRpcmVjdG9yeSlcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyA8cGFja2FnZS4uPlxcbicpICsgJyBPbmx5IGNvbXBpbGUgc3BlY2lmaWMgcGFja2FnZXMgYnkgcHJvdmlkaW5nIHBhY2thZ2UgbmFtZSBvciBzaG9ydCBuYW1lXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIHBhY2thZ2VzIGNoYW5nZSBhbmQgY29tcGlsZSB3aGVuIG5ldyB0eXBlc2NyaXB0IGZpbGUgaXMgY2hhbmdlZCBvciBjcmVhdGVkXFxuXFxuJyk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzZXR0aW5nIFtwYWNrYWdlXScpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IHBhY2thZ2VzIHNldHRpbmcgYW5kIHZhbHVlcycsIHtwYWNrYWdlOiAncGFja2FnZSBuYW1lLCBvbmx5IGxpc3Qgc2V0dGluZyBmb3Igc3BlY2lmaWMgcGFja2FnZSd9KVxuICAgIC5hY3Rpb24oYXN5bmMgKHBrZ05hbWU6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktc2V0dGluZycpKS5kZWZhdWx0KHBrZ05hbWUpO1xuICAgIH0pO1xuICAgIC8qKiBjb21tYW5kIHJ1biovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBzcGVjaWZpYyBtb2R1bGVcXCdzIGV4cG9ydGVkIGZ1bmN0aW9uXFxuJylcbiAgICAuYWN0aW9uKGFzeW5jICh0YXJnZXQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL3BhY2thZ2UtcnVubmVyJykpLnJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc30pO1xuICAgIH0pO1xuXG4gIHJ1bkNtZC51c2FnZShydW5DbWQudXNhZ2UoKSArICdcXG4nICsgY2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXVxcbicpICtcbiAgICBgZS5nLlxcbiAgJHtjaGFsay5ncmVlbigncGxpbmsgcnVuIC4uL3BhY2thZ2VzL2ZvcmJhci1wYWNrYWdlL2Rpc3QvZmlsZS5qcyNmdW5jdGlvbiBhcmd1bWVudDEgYXJndW1lbnQyLi4uJyl9XFxuYCArXG4gICAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAgICc8dGFyZ2V0PiAtIEpTIG9yIFRTIGZpbGUgbW9kdWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlc29sdmVkIGJ5IE5vZGUuanMgKHRzLW5vZGUpIGZvbGxvd2VkIGJ5IFwiI1wiIGFuZCBleHBvcnRlZCBmdW5jdGlvbiBuYW1lLFxcbicpO1xuICAgIC8vICdlLmcuIFxcbicgK1xuICAgIC8vIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgICAvLyAnLCBmdW5jdGlvbiBjYW4gYmUgYXN5bmMgd2hpY2ggcmV0dXJucyBQcm9taXNlXFxuJyArXG4gICAgLy8gY2hhbGsuZ3JlZW4oJ25vZGVfbW9kdWxlcy9wYWNrYWdlLWRpci9kaXN0L2Zvb2Jhci50cyNteUZ1bmN0aW9uJykgK1xuICAgIC8vICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuXG59XG5cbmZ1bmN0aW9uIGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3czogcGtnTWdyLldvcmtzcGFjZVN0YXRlIHwgdW5kZWZpbmVkLCBvdmVycmlkZXI6IENvbW1hbmRPdmVycmlkZXIpOiBzdHJpbmdbXSB7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybiBbXTtcbiAgaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIGNvbnN0IGF2YWlsYWJsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBkciA9IHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaztcbiAgICBpZiAoZHIgPT0gbnVsbCB8fCBkci5jbGkgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IFtwa2dGaWxlUGF0aCwgZnVuY05hbWVdID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG5cbiAgICBhdmFpbGFibGVzLnB1c2gocGsubmFtZSk7XG5cbiAgICB0cnkge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UocGssIHBrZ0ZpbGVQYXRoLCBmdW5jTmFtZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uIGluIHBhY2thZ2UgJHtway5uYW1lfTogXCIkeyhlIGFzIEVycm9yKS5tZXNzYWdlfVwiYCwgZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhdmFpbGFibGVzO1xufVxuXG5mdW5jdGlvbiBhZGROcG1JbnN0YWxsT3B0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgY21kLm9wdGlvbignLS1jYWNoZSA8bnBtLWNhY2hlPicsICdzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi0tY2FjaGVcIicpXG4gIC5vcHRpb24oJy0tY2ksIC0tdXNlLWNpJywgJ1VzZSBcIm5wbSBjaVwiIGluc3RlYWQgb2YgXCJucG0gaW5zdGFsbFwiIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tb2ZmbGluZScsICdzYW1lIGFzIG5wbSBvcHRpb24gXCItLW9mZmxpbmVcIiBkdXJpbmcgZXhlY3V0aW5nIG5wbSBpbnN0YWxsL2NpICcsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSk7XG59XG5cblxubGV0IHNraXBWZXJzaW9uQ2hlY2sgPSBmYWxzZTtcbnByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCAoKSA9PiB7XG4gIGlmIChza2lwVmVyc2lvbkNoZWNrKVxuICAgIHJldHVybjtcbiAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG59KTtcblxuZnVuY3Rpb24gY2hlY2tQbGlua1ZlcnNpb24oKSB7XG4gIGNvbnN0IHBranNvbiA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdwYWNrYWdlLmpzb24nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocGtqc29uKSkge1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa2pzb24sICd1dGY4JykpIGFzIHtkZXBlbmRlbmNpZXM/OiB7W3A6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH07IGRldkRlcGVuZGVuY2llcz86IHtbcDogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkfX07XG4gICAgbGV0IGRlcFZlciA9IGpzb24uZGVwZW5kZW5jaWVzICYmIGpzb24uZGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ10gfHxcbiAgICAgIGpzb24uZGV2RGVwZW5kZW5jaWVzICYmIGpzb24uZGV2RGVwZW5kZW5jaWVzWydAd2ZoL3BsaW5rJ107XG4gICAgaWYgKGRlcFZlciA9PSBudWxsKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYm94U3RyaW5nKCdEb25cXCd0IGZvcmdldCB0byBhZGQgQHdmaC9wbGluayBpbiBwYWNrYWdlLmpzb24gYXMgZGVwZW5kZW5jaWVzJykpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyLmVuZHNXaXRoKCcudGd6JykpIHtcbiAgICAgIGNvbnN0IG1hdGNoZWQgPSAvLShcXGQrXFwuXFxkK1xcLlteXSs/KVxcLnRneiQvLmV4ZWMoZGVwVmVyKTtcbiAgICAgIGlmIChtYXRjaGVkID09IG51bGwpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGRlcFZlciA9IG1hdGNoZWRbMV07XG4gICAgfVxuICAgIGlmIChkZXBWZXIgJiYgIXNlbXZlci5zYXRpc2ZpZXMocGsudmVyc2lvbiwgZGVwVmVyKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhgTG9jYWwgaW5zdGFsbGVkIFBsaW5rIHZlcnNpb24gJHtjaGFsay5jeWFuKHBrLnZlcnNpb24pfSBkb2VzIG5vdCBtYXRjaCBkZXBlbmRlbmN5IHZlcnNpb24gJHtjaGFsay5ncmVlbihkZXBWZXIpfSBpbiBwYWNrYWdlLmpzb24sIGAgK1xuICAgICAgICBgcnVuIGNvbW1hbmQgXCIke2NoYWxrLmdyZWVuKCdwbGluayB1cGdyYWRlJyl9XCIgdG8gdXBncmFkZSBvciBkb3duZ3JhZGUgdG8gZXhwZWN0ZWQgdmVyc2lvbmApKTtcbiAgICB9XG4gIH1cbn1cblxuIl19