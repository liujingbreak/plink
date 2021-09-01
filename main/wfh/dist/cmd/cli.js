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
        .option('--tar-dir <dir>', 'directory to save tar files', path_1.default.join(misc_1.getRootDir(), 'tarballs'))
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
    if (process.send == null) {
        // process is not a forked child process
        checkPlinkVersion();
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLDRCQUE0QjtBQUM1QiwwREFBa0M7QUFDbEMsa0RBQTBCO0FBSTFCLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFFdEUsd0NBQXlGO0FBRXpGLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLDZEQUFzRDtBQUN0RCxzREFBOEQ7QUFDOUQsbUNBQThDO0FBQzlDLG1DQUFpQztBQUdqQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQXNCLENBQUM7QUFDakUscUJBQXFCO0FBQ3JCLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFdEIsUUFBQSxpQkFBaUIsR0FBRyx5RUFBeUU7SUFDMUcsZ0dBQWdHLENBQUM7QUFFakcsU0FBc0IsY0FBYyxDQUFDLFNBQWlCOztRQUNwRCxPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztRQUN4Qiw0REFBNEQ7UUFDNUQsd0RBQWEsYUFBYSxHQUFDLENBQUM7UUFDNUIsaUNBQWlDO1FBR2pDLElBQUksYUFBbUMsQ0FBQztRQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUM3QyxXQUFXLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO2FBQzlFLE1BQU0sQ0FBQyxDQUFDLElBQWMsRUFBRSxFQUFFO1lBQ3pCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENB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IHBhdGg9XCIuL2Nmb250LmQudHNcIiAvPlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbi8vIGltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIHRwIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbi8vIGltcG9ydCAnLi4vdHNjLXBhY2thZ2VzLXNsaWNlJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IGlzRHJjcFN5bWxpbmssIHNleHlGb250LCBnZXRSb290RGlyLCBib3hTdHJpbmcsIHBsaW5rRW52IH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBfc3ltbGlua3MgZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHtDb21tYW5kT3ZlcnJpZGVyfSBmcm9tICcuL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHtobERlc2MsIGFycmF5T3B0aW9uRm59IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0NsaU9wdGlvbnMgYXMgVHNjb25maWdDbGlPcHRpb25zfSBmcm9tICcuL2NsaS10c2NvbmZpZy1ob29rJztcbmltcG9ydCAqIGFzIF9jbGlXYXRjaCBmcm9tICcuL2NsaS13YXRjaCc7XG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpIGFzIHt2ZXJzaW9uOiBzdHJpbmd9O1xuLy8gY29uc3QgV0lEVEggPSAxMzA7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaScpO1xuXG5leHBvcnQgY29uc3QgY2xpUGFja2FnZUFyZ0Rlc2MgPSAnU2luZ2xlIG9yIG11bHRpcGxlIHBhY2thZ2UgbmFtZXMsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkLCcgK1xuJ2lmIHRoZSBzY29wZSBuYW1lICh0aGUgcGFydCBiZXR3ZWVuIFwiQFwiIFwiL1wiKSBhcmUgbGlzdGVkIGNvbmZpZ3VyYXRpb24gcHJvcGVydHkgXCJwYWNrYWdlU2NvcGVzXCInO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tbWFuZHMoc3RhcnRUaW1lOiBudW1iZXIpIHtcbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayc7XG4gIC8vIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9OiB0eXBlb2Ygc3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZScpO1xuICBhd2FpdCBpbXBvcnQoJy4vY2xpLXNsaWNlJyk7XG4gIC8vIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG5cbiAgbGV0IGNsaUV4dGVuc2lvbnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKCdwbGluaycpXG4gIC5kZXNjcmlwdGlvbihjaGFsay5jeWFuKCdBIHBsdWdnYWJsZSBtb25vcmVwbyBhbmQgbXVsdGktcmVwbyBtYW5hZ2VtZW50IHRvb2wnKSlcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhwcm9ncmFtLmhlbHBJbmZvcm1hdGlvbigpKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBcXG52ZXJzaW9uOiAke3BrLnZlcnNpb259ICR7aXNEcmNwU3ltbGluayA/IGNoYWxrLnllbGxvdygnKHN5bWxpbmtlZCknKSA6ICcnfSBgKTtcbiAgICBpZiAoY2xpRXh0ZW5zaW9ucyAmJiBjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtjbGlFeHRlbnNpb25zLmxlbmd0aH0gY29tbWFuZCBsaW5lIGV4dGVuc2lvbmAgK1xuICAgICAgYCR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiAke2NsaUV4dGVuc2lvbnMubWFwKHBrZyA9PiBjaGFsay5ibHVlKHBrZykpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbicsIGNoYWxrLmJnUmVkKCdQbGVhc2UgZGV0ZXJtaW5lIGEgc3ViIGNvbW1hbmQgbGlzdGVkIGFib3ZlJykpO1xuICAgIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBwcm9jZXNzLmV4aXQoMSkpO1xuICB9KTtcbiAgcHJvZ3JhbS5hZGRIZWxwVGV4dCgnYmVmb3JlJywgc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbiAgcHJvZ3JhbS5hZGRIZWxwQ29tbWFuZCgnaGVscCBbY29tbWFuZF0nLCAnc2hvdyBoZWxwIGluZm9ybWF0aW9uLCBzYW1lIGFzIFwiLWhcIi4gJyk7XG5cbiAgY29uc3Qgb3ZlcnJpZGVyID0gbmV3IENvbW1hbmRPdmVycmlkZXIocHJvZ3JhbSk7XG4gIGxldCB3c1N0YXRlOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQ7XG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBjb25zdCB7Z2V0U3RhdGU6IGdldFBrZ1N0YXRlLCB3b3Jrc3BhY2VLZXl9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtnTWdyO1xuICAgIHdzU3RhdGUgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKSk7XG4gICAgaWYgKHdzU3RhdGUgIT0gbnVsbCkge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgcHJvZ3JhbSA9PiB7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gc3RyID0+IGNoYWxrLmdyZWVuKHN0cik7XG4gICAgICAgIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW0pO1xuICAgICAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgc3ViQ29tYW5kcyhwcm9ncmFtKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgc3ViQ29tYW5kcyk7XG4gIH1cblxuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfU0FGRSAhPT0gJ3RydWUnKSB7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuY3lhbihzdHIpO1xuICAgIGNsaUV4dGVuc2lvbnMgPSBsb2FkRXh0ZW5zaW9uQ29tbWFuZChwcm9ncmFtLCB3c1N0YXRlLCBvdmVycmlkZXIpO1xuICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1ZhbHVlIG9mIGVudmlyb25tZW50IHZhcmFpYmxlIFwiUExJTktfU0FGRVwiIGlzIHRydWUsIHNraXAgbG9hZGluZyBleHRlbnNpb24nKTtcbiAgfVxuXG4gIG92ZXJyaWRlci5hcHBlbmRHbG9iYWxPcHRpb25zKGZhbHNlKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2LCB7ZnJvbTogJ25vZGUnfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIGNvbW1hbmQgZHVlIHRvOiAnICsgY2hhbGsucmVkQnJpZ2h0KChlIGFzIEVycm9yKS5tZXNzYWdlKSwgZSk7XG4gICAgaWYgKChlIGFzIEVycm9yKS5zdGFjaykge1xuICAgICAgbG9nLmVycm9yKChlIGFzIEVycm9yKS5zdGFjayk7XG4gICAgfVxuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdWJDb21hbmRzKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKiBjb21tYW5kIGluaXRcbiAgICovXG4gIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2luaXQgW3dvcmstZGlyZWN0b3J5XScpLmFsaWFzKCdzeW5jJylcbiAgICAuZGVzY3JpcHRpb24oJ0luaXRpYWxpemUgYW5kIHVwZGF0ZSB3b3JrIGRpcmVjdG9yeSwgZ2VuZXJhdGUgYmFzaWMgY29uZmlndXJhdGlvbiBmaWxlcyBmb3IgcHJvamVjdCBhbmQgY29tcG9uZW50IHBhY2thZ2VzLCcgK1xuICAgICAgJyBjYWxjdWxhdGUgaG9pc3RlZCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcywgYW5kIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gY3VycmVudCBkaXJlY3RvcnkuJyxcbiAgICAgIHtcbiAgICAgICAgJ3dvcmstZGlyZWN0b3J5JzogJ0EgcmVsYXRpdmUgb3IgYWJvc29sdXRlIGRpcmVjdG9yeSBwYXRoLCB1c2UgXCIuXCIgdG8gZGV0ZXJtaW5lIGN1cnJlbnQgZGlyZWN0b3J5LFxcbiAgb21taXR0aW5nIHRoaXMgYXJndW1lbnQgbWVhbmluZzpcXG4nICtcbiAgICAgICAgICAnICAtIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIGFscmVhZHkgYSBcIndvcmsgZGlyZWN0b3J5XCIsIHVwZGF0ZSBpdC5cXG4nICtcbiAgICAgICAgICAnICAtIElmIGN1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmsgZGlyZWN0b3J5IChtYXliZSBhdCByZXBvXFwncyByb290IGRpcmVjdG9yeSksIHVwZGF0ZSB0aGUgbGF0ZXN0IHVwZGF0ZWQgd29yaycgK1xuICAgICAgICAgICcgZGlyZWN0b3J5LidcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLWYsIC0tZm9yY2UnLCAnRm9yY2UgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5LCB0aGlzIGlzIG5vdCBzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi1mXCIgJywgZmFsc2UpXG4gICAgLy8gLm9wdGlvbignLS1saW50LWhvb2ssIC0tbGgnLCAnQ3JlYXRlIGEgZ2l0IHB1c2ggaG9vayBmb3IgY29kZSBsaW50JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlPzogc3RyaW5nKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWluaXQnKSkuZGVmYXVsdChpbml0Q21kLm9wdHMoKSBhcyB0cC5Jbml0Q21kT3B0aW9ucyAmIHRwLk5wbUNsaU9wdGlvbiwgd29ya3NwYWNlKTtcbiAgICB9KTtcbiAgYWRkTnBtSW5zdGFsbE9wdGlvbihpbml0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBwcm9qZWN0XG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ3Byb2plY3QgW2FkZHxyZW1vdmVdIFtkaXIuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3QgYXNzb2NpYXRlZCBwcm9qZWN0IGZvbGRlcnMsIFBsaW5rIHdpbGwnICtcbiAgICAgICcgc2NhbiBzb3VyY2UgY29kZSBkaXJlY3RvcmllcyBmcm9tIGFzc29jaWF0ZWQgcHJvamVjdHMnLCB7XG4gICAgICAgICdhZGR8cmVtb3ZlJzogJ1NwZWNpZnkgd2hldGhlciBBc3NvY2lhdGUgdG8gYSBwcm9qZWN0IG9yIERpc2Fzc29jaWF0ZSBmcm9tIGEgcHJvamVjdCcsXG4gICAgICAgIGRpcjogJ1NwZWNpZnkgdGFyZ2V0IHByb2plY3QgcmVwbyBkaXJlY3RvcnkgKGFic29sdXRlIHBhdGggb3IgcmVsYXRpdmUgcGF0aCB0byBjdXJyZW50IGRpcmVjdG9yeSknICtcbiAgICAgICAgICAnLCBzcGVjaWZ5IG11bHRpcGxlIHByb2plY3QgYnkgc2VwZXJhdGluZyB0aGVtIHdpdGggc3BhY2UgY2hhcmFjdGVyJ1xuICAgICAgfSlcbiAgICAuYWN0aW9uKGFzeW5jIChhY3Rpb246ICdhZGQnfCdyZW1vdmUnfHVuZGVmaW5lZCwgcHJvamVjdERpcjogc3RyaW5nW10pID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktcHJvamVjdCcpKS5kZWZhdWx0KHtpc1NyY0RpcjogZmFsc2V9LCBhY3Rpb24sIHByb2plY3REaXIpO1xuICAgIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnc3JjIFthZGR8cmVtb3ZlXSBbZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IHNvdXJjZSBkaXJlY3RvcmllcywgUGxpbmsgd2lsbCcgK1xuICAgICAgJyBzY2FuIHNvdXJjZSBjb2RlIGRpcmVjdG9yaWVzIGZvciBwYWNrYWdlcycsIHtcbiAgICAgICAgJ2FkZHxyZW1vdmUnOiAnU3BlY2lmeSB3aGV0aGVyIGFzc29jaWF0ZSB0byBhIGRpcmVjdG9yeSBvciBkaXNhc3NvY2lhdGUgZnJvbSBhIGRpcmVjdG9yeScsXG4gICAgICAgIGRpcjogJ3NwZWNpZnkgbXVsdGlwbGUgZGlyZWN0b3JpZXMgYnkgc2VwZXJhdGluZyB0aGVtIHdpdGggc3BhY2UgY2hhcmFjdGVyJ1xuICAgICAgfSlcbiAgICAgIC5hY3Rpb24oYXN5bmMgKGFjdGlvbjogJ2FkZCd8J3JlbW92ZSd8dW5kZWZpbmVkLCBkaXJzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiB0cnVlfSwgYWN0aW9uLCBkaXJzKTtcbiAgICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIC8vIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgLy8gICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJywge1xuICAvLyAgICAgcGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2NcbiAgLy8gICB9KVxuICAvLyAgIC5vcHRpb24oJy0tcGogPHByb2plY3QxLHByb2plY3QyLi4uPicsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLy8gICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAvLyAgIC5hY3Rpb24oYXN5bmMgcGFja2FnZXMgPT4ge1xuICAvLyAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICAvLyAgIH0pO1xuXG4gIC8vIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgLy8gICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gIC8vICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY3MnKS5hbGlhcygnY2xlYXItc3ltbGlua3MnKVxuICAgIC5kZXNjcmlwdGlvbignQ2xlYXIgc3ltbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAgIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2Nhbk5vZGVNb2R1bGVzID0gKHJlcXVpcmUoJy4uL3V0aWxzL3N5bWxpbmtzJykgYXMgdHlwZW9mIF9zeW1saW5rcykuZGVmYXVsdDtcbiAgICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcyh1bmRlZmluZWQsICdhbGwnKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCB1cGdyYWRlXG4gICAqL1xuICBjb25zdCB1cGdyYWRlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGdyYWRlJylcbiAgICAuYWxpYXMoJ2luc3RhbGwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVpbnN0YWxsIGxvY2FsIFBsaW5rIGFsb25nIHdpdGggb3RoZXIgZGVwZW5kZW5jaWVzLicgK1xuICAgICAgJyAoVW5saWtlIFwibnBtIGluc3RhbGxcIiB3aGljaCBkb2VzIG5vdCB3b3JrIHdpdGggbm9kZV9tb2R1bGVzIHRoYXQgbWlnaHQgY29udGFpbiBzeW1saW5rcyknKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW5rLXBsaW5rJykpLnJlaW5zdGFsbFdpdGhMaW5rZWRQbGluayh1cGdyYWRlQ21kLm9wdHMoKSBhcyB0cC5OcG1DbGlPcHRpb24pO1xuICAgIH0pO1xuICBhZGROcG1JbnN0YWxsT3B0aW9uKHVwZ3JhZGVDbWQpO1xuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ2RvY2tlcml6ZSA8d29ya3NwYWNlLWRpcj4nKVxuICAvLyAuZGVzY3JpcHRpb24oY2hhbGsuZ3JheSgnW1RCSV0gR2VuZXJhdGUgRG9ja2VyZmlsZSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeSwgYW5kIGdlbmVyYXRlIGRvY2tlciBpbWFnZScpKTtcblxuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ3BrZyA8d29ya3NwYWNlLWRpcj4nKVxuICAvLyAuZGVzY3JpcHRpb24oY2hhbGsuZ3JheSgnW1RCSV0gVXNlIFBrZyAoaHR0cHM6Ly9naXRodWIuY29tL3ZlcmNlbC9wa2cpIHRvIHBhY2thZ2UgTm9kZS5qcyBwcm9qZWN0IGludG8gYW4gZXhlY3V0YWJsZSAnKSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbHNcbiAgICovXG4gIGNvbnN0IGxpc3RDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xzJykuYWxpYXMoJ2xpc3QnKVxuICAgIC5vcHRpb24oJy1qLCAtLWpzb24nLCAnbGlzdCBsaW5rZWQgZGVwZW5kZW5jaWVzIGluIGZvcm0gb2YgSlNPTicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0taG9pc3QnLCAnbGlzdCBob2lzdGVkIHRyYW5zaXRpdmUgRGVwZW5kZW5jeSBpbmZvcm1hdGlvbicsIGZhbHNlKVxuICAgIC5kZXNjcmlwdGlvbignSWYgeW91IHdhbnQgdG8ga25vdyBob3cgbWFueSBwYWNrYWdlcyB3aWxsIGFjdHVhbGx5IHJ1biwgdGhpcyBjb21tYW5kIHByaW50cyBvdXQgYSBsaXN0IGFuZCB0aGUgcHJpb3JpdGllcywgaW5jbHVkaW5nIGluc3RhbGxlZCBwYWNrYWdlcycpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5kZWZhdWx0KGxpc3RDbWQub3B0cygpIGFzIGFueSk7XG4gICAgfSk7XG5cbiAgY29uc3QgYWRkQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdhZGQgPGRlcGVuZGVuY3kuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0FkZCBkZXBlbmRlbmN5IHRvIHBhY2thZ2UuanNvbiBmaWxlLCB3aXRoIG9wdGlvbiBcIi0tZGV2XCIgdG8gYWRkIGFzIFwiZGV2RGVwZW5kZW5jaWVzXCIsICcgK1xuICAgICAgJ3dpdGhvdXQgb3B0aW9uIFwiLS10b1wiIHRoaXMgY29tbWFuZCBhZGRzIGRlcGVuZGVuY3kgdG8gY3VycmVudCB3b3JrdHJlZSBzcGFjZVxcJ3MgcGFja2FnZS5qc29uIGZpbGUnLFxuICAgICAge1xuICAgICAgICBkZXBlbmRlbmN5OiAnZGVwZW5kZW5jeSBwYWNrYWdlIG5hbWUgaW4gZm9ybSBvZiBcIjxhIGxpbmtlZCBwYWNrYWdlIG5hbWUgd2l0aG91dCBzY29wZSBwYXJ0PlwiLCBcIjxwYWNrYWdlIG5hbWU+QDx2ZXJzaW9uPlwiLCAnXG4gICAgICB9KVxuICAgIC5vcHRpb24oJy0tdG8gPHBrZyBuYW1lIHwgd29ya3RyZWUgZGlyIHwgcGtnIGRpcj4nLCAnYWRkIGRlcGVuZGVuY3kgdG8gdGhlIHBhY2thZ2UuanNvbiBvZiBzcGVjaWZpYyBsaW5rZWQgc291cmNlIHBhY2thZ2UgYnkgbmFtZSBvciBkaXJlY3RvcnksIG9yIGEgd29ya3RyZWUgc3BhY2UgZGlyZWN0b3J5JylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWFkZC1wYWNrYWdlJykpLmFkZERlcGVuZGVuY3lUbyhwYWNrYWdlcywgYWRkQ21kLm9wdHMoKS50bywgYWRkQ21kLm9wdHMoKS5kZXYpO1xuICAgIH0pO1xuXG4gIGNvbnN0IHRzY29uZmlnQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2NvbmZpZycpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IHRzY29uZmlnLmpzb24sIGpzY29uZmlnLmpzb24gZmlsZXMgd2hpY2ggd2lsbCBiZSB1cGRhdGVkIGF1dG9tYXRpY2FsbHkgYnkgUGxpbmssIChhIG1vbm9yZXBvIG1lYW5zIHRoZXJlIGFyZSBub2RlIHBhY2thZ2VzIHdoaWNoIGFyZSBzeW1saW5rZWQgZnJvbSByZWFsIHNvdXJjZSBjb2RlIGRpcmVjdG9yeScgK1xuICAgICAgJywgaWYgeW91IGhhdmUgY3VzdG9taXplZCB0c2NvbmZpZy5qc29uIGZpbGUsIHRoaXMgY29tbWFuZCBoZWxwcyB0byB1cGRhdGUgXCJjb21waWxlck9wdGlvbnMucGF0aHNcIiBwcm9wZXJ0aWVzKScpXG4gICAgLm9wdGlvbignLS1ob29rIDxmaWxlPicsICdhZGQgdHNjb25maWcvanNjb25maWcgZmlsZSB0byBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdW5ob29rIDxmaWxlPicsICdyZW1vdmUgdHNjb25maWcvanNjb25maWcgZmlsZSBmcm9tIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1jbGVhciwtLXVuaG9vay1hbGwnLCAncmVtb3ZlIGFsbCB0c2NvbmZpZyBmaWxlcyBmcm9tIGZyb20gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXRzY29uZmlnLWhvb2snKSkuZG9Uc2NvbmZpZyh0c2NvbmZpZ0NtZC5vcHRzKCkgYXMgVHNjb25maWdDbGlPcHRpb25zKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogQnVtcCBjb21tYW5kXG4gICAqL1xuICBjb25zdCBidW1wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdidW1wIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdidW1wIHBhY2thZ2UuanNvbiB2ZXJzaW9uIG51bWJlciBmb3Igc3BlY2lmaWMgcGFja2FnZSwgc2FtZSBhcyBcIm5wbSB2ZXJzaW9uXCIgZG9lcycsXG4gICAgICB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnb25seSBidW1wIGNvbXBvbmVudCBwYWNrYWdlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLWksIC0taW5jcmUtdmVyc2lvbiA8dmFsdWU+JyxcbiAgICAgICd2ZXJzaW9uIGluY3JlbWVudCwgdmFsaWQgdmFsdWVzIGFyZTogbWFqb3IsIG1pbm9yLCBwYXRjaCwgcHJlcmVsZWFzZScsICdwYXRjaCcpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1idW1wJykpLmRlZmF1bHQoey4uLmJ1bXBDbWQub3B0cygpIGFzIHRwLkJ1bXBPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhidW1wQ21kKTtcbiAgLy8gYnVtcENtZC51c2FnZShidW1wQ21kLnVzYWdlKCkgKyAnXFxuJyArIGhsKCdwbGluayBidW1wIDxwYWNrYWdlPiAuLi4nKSArICcgdG8gcmVjdXJzaXZlbHkgYnVtcCBwYWNrYWdlLmpzb24gZnJvbSBtdWx0aXBsZSBkaXJlY3Rvcmllc1xcbicgK1xuICAvLyAgIGhsKCdwbGluayBidW1wIDxkaXI+IC1pIG1pbm9yJykgKyAnIHRvIGJ1bXAgbWlub3IgdmVyc2lvbiBudW1iZXIsIGRlZmF1bHQgaXMgcGF0Y2ggbnVtYmVyJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcGFja0NtZCA9IHByb2dyYW0uY29tbWFuZCgncGFjayBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignbnBtIHBhY2sgcGFrYWdlIGludG8gdGFyYmFsbCBmaWxlcyBhbmQgY2hhbmdlIHZlcnNpb24gdmFsdWUgZnJvbSByZWxhdGVkIHBhY2thZ2UuanNvbicsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLS1kaXIgPHBhY2thZ2UgZGlyZWN0b3J5PicsICdwYWNrIHBhY2thZ2VzIGJ5IHNwZWNpZnlpbmcgZGlyZWN0b3JpZXMnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncGFjayBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyPicsXG4gICAgICAncHJvamVjdCBkaXJlY3RvcmllcyB0byBiZSBsb29rZWQgdXAgZm9yIGFsbCBwYWNrYWdlcyB3aGljaCBuZWVkIHRvIGJlIHBhY2tlZCB0byB0YXJiYWxsIGZpbGVzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdGFyLWRpciA8ZGlyPicsICdkaXJlY3RvcnkgdG8gc2F2ZSB0YXIgZmlsZXMnLCBQYXRoLmpvaW4oZ2V0Um9vdERpcigpLCAndGFyYmFsbHMnKSlcbiAgICAub3B0aW9uKCctLWpmLCAtLWpzb24tZmlsZSA8cGtnLWpzb24tZmlsZT4nLCAndGhlIHBhY2thZ2UuanNvbiBmaWxlIGluIHdoaWNoIFwiZGV2RGVwZW5kZW5jaWVzXCIsIFwiZGVwZW5kZW5jaWVzXCIgc2hvdWxkIHRvIGJlIGNoYW5nZWQgYWNjb3JkaW5nIHRvIHBhY2tlZCBmaWxlLCAnICsgXG4gICAgICAnYnkgZGVmYXVsdCBwYWNrYWdlLmpzb24gZmlsZXMgaW4gYWxsIHdvcmsgc3BhY2VzIHdpbGwgYmUgY2hlY2tlZCBhbmQgY2hhbmdlZCcpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnBhY2soey4uLnBhY2tDbWQub3B0cygpIGFzIHRwLlBhY2tPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhwYWNrQ21kKTtcbiAgcGFja0NtZC51c2FnZShwYWNrQ21kLnVzYWdlKCkgKyAnXFxuQnkgZGVmYXVsdCwgcnVuIFwibnBtIHBhY2tcIiBmb3IgZWFjaCBsaW5rZWQgcGFja2FnZSB3aGljaCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcHVibGlzaENtZCA9IHByb2dyYW0uY29tbWFuZCgncHVibGlzaCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIG5wbSBwdWJsaXNoJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3B1Ymxpc2ggcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLFxuICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncHVibGlzaCBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXB1YmxpYycsICdzYW1lIGFzIFwibnBtIHB1Ymxpc2hcIiBjb21tYW5kIG9wdGlvbiBcIi0tYWNjZXNzIHB1YmxpY1wiJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnB1Ymxpc2goey4uLnB1Ymxpc2hDbWQub3B0cygpIGFzIHRwLlB1Ymxpc2hPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuXG5cbiAgY29uc3QgYW5hbHlzaXNDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FuYWx5emUgW3BrZy1uYW1lLi4uXScpXG4gICAgLmFsaWFzKCdhbmFseXNlJylcbiAgICAuZGVzY3JpcHRpb24oJ1VzZSBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIHBhcnNlIHNvdXJjZSBjb2RlLCBsaXN0IGRlcGVuZGVuY2VzIGJ5IERGUyBhbGdhcml0aG0sIHJlc3VsdCBpbmZvcm1hdGlvbiBpbmNsdWRlcycgK1xuICAgICAgJzogY3ljbGljIGRlcGVuZGVjaWVzLCB1bnJlc29sdmFibGUgZGVwZW5kZW5jaWVzLCBleHRlcm5hbCBkZXBlbmRlbmNpZXMsIGRlcGVuZGVuY2llcyBhcmUgbm90IHVuZGVyIHRhcmdldCBkaXJlY3RvcnkuJywge1xuICAgICAgJ3BrZy1uYW1lJzogJ3RoZSBuYW1lIG9mIHRhcmdldCBzb3VyY2UgcGFja2FnZSwgdGhlIHBhY2thZ2UgbXVzdCBiZSBQbGluayBjb21wbGlhbnQgcGFja2FnZSwgdGhpcyBjb21tYW5kIHdpbGwgb25seSAnICtcbiAgICAgICAgJ3NjYW4gc3BlY2lhbCBzb3VyY2UgY29kZSBkaXJlY3RvcnkgbGlrZSBcInRzL1wiIGFuZCBcImlzb20vXCIgb2YgdGFyZ2V0IHBhY2thZ2UnXG4gICAgICB9KVxuICAgIC5vcHRpb24oJy14IDxyZWdleHA+JywgJ0luZ29yZSBcIm1vZHVsZSBuYW1lXCIgdGhhdCBtYXRjaGVzIHNwZWNpZmljIFJlZ3VsYXIgRXhwZXJzc2lvbicsICdcXC4obGVzc3xzY3NzfGNzcykkJylcbiAgICAub3B0aW9uKCctZCwgLS1kaXIgPGRpcmVjdG9yeT4nLFxuICAgICAgJyhtdWx0aXBsZSkgZGV0ZXJtaW5lIHRhcmdldCBkaXJlY3RvcnksIHNjYW4gSlMvSlNYL1RTL1RTWCBmaWxlcyB1bmRlciB0YXJnZXQgZGlyZWN0b3J5JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLWYsIC0tZmlsZSA8ZmlsZT4nLFxuICAgICAgJyhtdWx0aXBsZSkgZGV0ZXJtaW5lIHRhcmdldCBUUy9KUyhYKSBmaWxlcyAobXVsdGlwbGUgZmlsZSB3aXRoIG1vcmUgb3B0aW9ucyBcIi1mIDxmaWxlPiAtZiA8Z2xvYj5cIiknLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctaicsICdTaG93IHJlc3VsdCBpbiBKU09OJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS10c2NvbmZpZyA8ZmlsZT4nLCAnVXNlIFwiY29tcGlsZXJPcHRpb25zLnBhdGhzXCIgcHJvcGVydHkgdG8gcmVzb2x2ZSB0cy9qcyBmaWxlIG1vZHVsZScpXG4gICAgLm9wdGlvbignLS1hbGlhcyA8YWxpYXMtZXhwcmVzcz4nLCAnYSBKU09OIGV4cHJlc3MsIGUuZy4gLS1hbGlhcyBcXCdbXCJeQC8oLispJFwiLFwic3JjLyQxXCJdXFwnJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi9jbGktYW5hbHl6ZScpKS5kZWZhdWx0KHBhY2thZ2VzLCBhbmFseXNpc0NtZC5vcHRzKCkgYXMgdHAuQW5hbHl6ZU9wdGlvbnMpO1xuICAgIH0pO1xuXG4gIGFuYWx5c2lzQ21kLnVzYWdlKGFuYWx5c2lzQ21kLnVzYWdlKCkgKyAnXFxuJyArXG4gICAgJ2UuZy5cXG4gICcgKyBjaGFsay5ibHVlKCdwbGluayBhbmFseXplIC1mIFwicGFja2FnZXMvZm9vYmFyMS8qKi8qXCIgLWYgcGFja2FnZXMvZm9vYmFyMi90cy9tYWluLnRzXFxuICAnICtcbiAgICAncGxpbmsgYW5hbHl6ZSAtZCBwYWNrYWdlcy9mb29iYXIxL3NyYyAtZCBwYWNrYWdlcy9mb29iYXIyL3RzJykpO1xuXG4gIGNvbnN0IHdhdGNoQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd3YXRjaCBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ1dhdGNoIHBhY2thZ2Ugc291cmNlIGNvZGUgZmlsZSBjaGFuZ2VzIChmaWxlcyByZWZlcmVuY2VkIGluIC5ucG1pZ25vcmUgd2lsbCBiZSBpZ25vcmVkKSBhbmQgdXBkYXRlIFBsaW5rIHN0YXRlLCAnICtcbiAgJ2F1dG9tYXRpY2FsbHkgaW5zdGFsbCB0cmFuc2l0aXZlIGRlcGVuZGVuY3knLCB7XG4gICAgcGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAub3B0aW9uKCctLWNwLCAtLWNvcHkgPGRpcmVjdG9yeT4nLCAnY29weSBwYWNrYWdlIGZpbGVzIHRvIHNwZWNpZmljIGRpcmVjdG9yeSwgbWltaWMgYmVoYXZpb3Igb2YgXCJucG0gaW5zdGFsbCA8cGtnPlwiLCBidXQgdGhpcyB3b25cXCd0IGluc3RhbGwgZGVwZW5kZW5jaWVzJylcbiAgLmFjdGlvbigocGtnczogc3RyaW5nW10pID0+IHtcbiAgICBjb25zdCB7Y2xpV2F0Y2h9ID0gcmVxdWlyZSgnLi9jbGktd2F0Y2gnKSBhcyB0eXBlb2YgX2NsaVdhdGNoO1xuICAgIGNsaVdhdGNoKHBrZ3MsIHdhdGNoQ21kLm9wdHMoKSk7XG4gIH0pO1xuXG4gIGNvbnN0IHVwZGF0ZURpckNtZCA9IHByb2dyYW0uY29tbWFuZCgndXBkYXRlLWRpcicpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gdGhpcyBjb21tYW5kIHRvIHN5bmMgaW50ZXJuYWwgc3RhdGUgd2hlbiB3aG9sZSB3b3Jrc3BhY2UgZGlyZWN0b3J5IGlzIHJlbmFtZWQgb3IgbW92ZWQuXFxuJyArXG4gICAgJ0JlY2F1c2Ugd2Ugc3RvcmUgYWJzb2x1dGUgcGF0aCBpbmZvIG9mIGVhY2ggcGFja2FnZSBpbiBpbnRlcm5hbCBzdGF0ZSwgYW5kIGl0IHdpbGwgYmVjb21lIGludmFsaWQgYWZ0ZXIgeW91IHJlbmFtZSBvciBtb3ZlIGRpcmVjdG9yeScpXG4gICAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlOiBzdHJpbmcpID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmNoZWNrRGlyKHVwZGF0ZURpckNtZC5vcHRzKCkgYXMgdHAuR2xvYmFsT3B0aW9ucyk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIGNvbXBpbGUgc291cmNlIGNvZGUgZm9yIHRhcmdldCBwYWNrYWdlcywgJyArXG4gICAgJ3doaWNoIGhhdmUgYmVlbiBsaW5rZWQgdG8gY3VycmVudCB3b3JrIGRpcmVjdG9yeScsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnVHlwZXNjcmlwdCBjb21waWxlciB3YXRjaCBtb2RlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLy8gLm9wdGlvbignLS13cywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAnb25seSBpbmNsdWRlIHRob3NlIGxpbmtlZCBwYWNrYWdlcyB3aGljaCBhcmUgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAvLyAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdHN4LC0tanN4JywgJ2luY2x1ZGVzIFRTWCBmaWxlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tc291cmNlLW1hcCA8aW5saW5lfGZpbGU+JywgJ1NvdXJjZSBtYXAgc3R5bGU6IFwiaW5saW5lXCIgb3IgXCJmaWxlXCInLCAnaW5saW5lJylcbiAgICAub3B0aW9uKCctLW1lcmdlLC0tbWVyZ2UtdHNjb25maWcgPGZpbGU+JywgJ01lcmdlIGNvbXBpbGVyT3B0aW9ucyBcImJhc2VVcmxcIiBhbmQgXCJwYXRoc1wiIGZyb20gc3BlY2lmaWVkIHRzY29uZmlnIGZpbGUnKVxuICAgIC5vcHRpb24oJy0tY29wYXRoLCAtLWNvbXBpbGVyLW9wdGlvbnMtcGF0aHMgPHBhdGhNYXBKc29uPicsXG4gICAgICAnQWRkIG1vcmUgXCJwYXRoc1wiIHByb3BlcnR5IHRvIGNvbXBpbGVyIG9wdGlvbnMuICcgK1xuICAgICAgJyhlLmcuIC0tY29wYXRoIFxcJ3tcXFwiQC8qXCI6W1wiL1VzZXJzL3dvcmtlci9vY2Vhbi11aS9zcmMvKlwiXX1cXCcpJywgKHYsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52LnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAub3B0aW9uKCctLWNvIDxKU09OLXN0cmluZz4nLFxuICAgICAgYFBhcnRpYWwgY29tcGlsZXIgb3B0aW9ucyB0byBiZSBtZXJnZWQgKGV4Y2VwdCBcImJhc2VVcmxcIiksIFwicGF0aHNcIiBtdXN0IGJlIHJlbGF0aXZlIHRvICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBwbGlua0Vudi53b3JrRGlyKSB8fCAnY3VycmVudCBkaXJlY3RvcnknfWApXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBjb25zdCBvcHQgPSB0c2NDbWQub3B0cygpO1xuICAgICAgY29uc3QgdHNjID0gYXdhaXQgaW1wb3J0KCcuLi90cy1jbWQnKTtcblxuICAgICAgYXdhaXQgdHNjLnRzYyh7XG4gICAgICAgIHBhY2thZ2U6IHBhY2thZ2VzLFxuICAgICAgICBwcm9qZWN0OiBvcHQucHJvamVjdCxcbiAgICAgICAgd2F0Y2g6IG9wdC53YXRjaCxcbiAgICAgICAgc291cmNlTWFwOiBvcHQuc291cmNlTWFwLFxuICAgICAgICBqc3g6IG9wdC5qc3gsXG4gICAgICAgIGVkOiBvcHQuZW1pdERlY2xhcmF0aW9uT25seSxcbiAgICAgICAgcGF0aHNKc29uczogb3B0LmNvbXBpbGVyT3B0aW9uc1BhdGhzLFxuICAgICAgICBtZXJnZVRzY29uZmlnOiBvcHQubWVyZ2VUc2NvbmZpZyxcbiAgICAgICAgY29tcGlsZXJPcHRpb25zOiBvcHQuY28gPyBKU09OLnBhcnNlKG9wdC5jbykgOiB1bmRlZmluZWRcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gIHRzY0NtZC51c2FnZSh0c2NDbWQudXNhZ2UoKSArXG4gICAgJ1xcbkl0IGNvbXBpbGVzIFxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L3RzLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vZGlzdFwiLFxcbicgK1xuICAgICcgIG9yXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbS8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb21cIlxcbiBmb3IgYWxsIEB3ZmggcGFja2FnZXMuXFxuJyArXG4gICAgJ0kgc3VnZ2VzdCB0byBwdXQgTm9kZS5qcyBzaWRlIFRTIGNvZGUgaW4gZGlyZWN0b3J5IGB0c2AsIGFuZCBpc29tb3JwaGljIFRTIGNvZGUgKG1lYW5pbmcgaXQgcnVucyBpbiAnICtcbiAgICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcblxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjXFxuJykgKyAnIENvbXBpbGUgbGlua2VkIHBhY2thZ2VzIHRoYXQgYXJlIGRlcGVuZGVuY2llcyBvZiBjdXJyZW50IHdvcmtzcGFjZSAoeW91IHNoYWxsIHJ1biB0aGlzIGNvbW1hbmQgb25seSBpbiBhIHdvcmtzcGFjZSBkaXJlY3RvcnkpXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2MgPHBhY2thZ2UuLj5cXG4nKSArICcgT25seSBjb21waWxlIHNwZWNpZmljIHBhY2thZ2VzIGJ5IHByb3ZpZGluZyBwYWNrYWdlIG5hbWUgb3Igc2hvcnQgbmFtZVxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjIFtwYWNrYWdlLi4uXSAtd1xcbicpICsgJyBXYXRjaCBwYWNrYWdlcyBjaGFuZ2UgYW5kIGNvbXBpbGUgd2hlbiBuZXcgdHlwZXNjcmlwdCBmaWxlIGlzIGNoYW5nZWQgb3IgY3JlYXRlZFxcblxcbicpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnc2V0dGluZyBbcGFja2FnZV0nKVxuICAgIC5kZXNjcmlwdGlvbignTGlzdCBwYWNrYWdlcyBzZXR0aW5nIGFuZCB2YWx1ZXMnLCB7cGFja2FnZTogJ3BhY2thZ2UgbmFtZSwgb25seSBsaXN0IHNldHRpbmcgZm9yIHNwZWNpZmljIHBhY2thZ2UnfSlcbiAgICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXNldHRpbmcnKSkuZGVmYXVsdChwa2dOYW1lKTtcbiAgICB9KTtcbiAgICAvKiogY29tbWFuZCBydW4qL1xuICBjb25zdCBydW5DbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3J1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gc3BlY2lmaWMgbW9kdWxlXFwncyBleHBvcnRlZCBmdW5jdGlvblxcbicpXG4gICAgLmFjdGlvbihhc3luYyAodGFyZ2V0OiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9wYWNrYWdlLXJ1bm5lcicpKS5ydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9KTtcbiAgICB9KTtcblxuICBydW5DbWQudXNhZ2UocnVuQ21kLnVzYWdlKCkgKyAnXFxuJyArIGNoYWxrLmdyZWVuKCdwbGluayBydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl1cXG4nKSArXG4gICAgYGUuZy5cXG4gICR7Y2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biAuLi9wYWNrYWdlcy9mb3JiYXItcGFja2FnZS9kaXN0L2ZpbGUuanMjZnVuY3Rpb24gYXJndW1lbnQxIGFyZ3VtZW50Mi4uLicpfVxcbmAgK1xuICAgICdleGVjdXRlIGV4cG9ydGVkIGZ1bmN0aW9uIG9mIFRTL0pTIGZpbGUgZnJvbSBzcGVjaWZpYyBwYWNrYWdlIG9yIHBhdGhcXG5cXG4nICtcbiAgICAnPHRhcmdldD4gLSBKUyBvciBUUyBmaWxlIG1vZHVsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXNvbHZlZCBieSBOb2RlLmpzICh0cy1ub2RlKSBmb2xsb3dlZCBieSBcIiNcIiBhbmQgZXhwb3J0ZWQgZnVuY3Rpb24gbmFtZSxcXG4nKTtcbiAgICAvLyAnZS5nLiBcXG4nICtcbiAgICAvLyBjaGFsay5ncmVlbigncGFja2FnZS1uYW1lL2Rpc3QvZm9vYmFyLmpzI215RnVuY3Rpb24nKSArXG4gICAgLy8gJywgZnVuY3Rpb24gY2FuIGJlIGFzeW5jIHdoaWNoIHJldHVybnMgUHJvbWlzZVxcbicgK1xuICAgIC8vIGNoYWxrLmdyZWVuKCdub2RlX21vZHVsZXMvcGFja2FnZS1kaXIvZGlzdC9mb29iYXIudHMjbXlGdW5jdGlvbicpICtcbiAgICAvLyAnLCByZWxhdGl2ZSBvciBhYnNvbHV0ZSBwYXRoXFxuJyk7XG5cblxufVxuXG5mdW5jdGlvbiBsb2FkRXh0ZW5zaW9uQ29tbWFuZChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCwgd3M6IHBrZ01nci5Xb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZCwgb3ZlcnJpZGVyOiBDb21tYW5kT3ZlcnJpZGVyKTogc3RyaW5nW10ge1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm4gW107XG4gIGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuICBjb25zdCBhdmFpbGFibGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHBrIG9mIHBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgY29uc3QgZHIgPSBway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbms7XG4gICAgaWYgKGRyID09IG51bGwgfHwgZHIuY2xpID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCBbcGtnRmlsZVBhdGgsIGZ1bmNOYW1lXSA9IChkci5jbGkgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuXG4gICAgYXZhaWxhYmxlcy5wdXNoKHBrLm5hbWUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKHBrLCBwa2dGaWxlUGF0aCwgZnVuY05hbWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBsb2cud2FybihgRmFpbGVkIHRvIGxvYWQgY29tbWFuZCBsaW5lIGV4dGVuc2lvbiBpbiBwYWNrYWdlICR7cGsubmFtZX06IFwiJHsoZSBhcyBFcnJvcikubWVzc2FnZX1cImAsIGUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYXZhaWxhYmxlcztcbn1cblxuZnVuY3Rpb24gYWRkTnBtSW5zdGFsbE9wdGlvbihjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIGNtZC5vcHRpb24oJy0tY2FjaGUgPG5wbS1jYWNoZT4nLCAnc2FtZSBhcyBucG0gaW5zdGFsbCBvcHRpb24gXCItLWNhY2hlXCInKVxuICAub3B0aW9uKCctLWNpLCAtLXVzZS1jaScsICdVc2UgXCJucG0gY2lcIiBpbnN0ZWFkIG9mIFwibnBtIGluc3RhbGxcIiB0byBpbnN0YWxsIGRlcGVuZGVuY2llcycsIGZhbHNlKVxuICAub3B0aW9uKCctLW9mZmxpbmUnLCAnc2FtZSBhcyBucG0gb3B0aW9uIFwiLS1vZmZsaW5lXCIgZHVyaW5nIGV4ZWN1dGluZyBucG0gaW5zdGFsbC9jaSAnLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS15YXJuJywgJ1VzZSBZYXJuIHRvIGluc3RhbGwgY29tcG9uZW50IHBlZXIgZGVwZW5kZW5jaWVzIGluc3RlYWQgb2YgdXNpbmcgTlBNJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tcHJvZHVjdGlvbicsICdBZGQgXCItLXByb2R1Y3Rpb25cIiBvciBcIi0tb25seT1wcm9kXCIgY29tbWFuZCBsaW5lIGFyZ3VtZW50IHRvIFwieWFybi9ucG0gaW5zdGFsbFwiJywgZmFsc2UpO1xufVxuXG5cbmxldCBza2lwVmVyc2lvbkNoZWNrID0gZmFsc2U7XG5wcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgKCkgPT4ge1xuICBpZiAoc2tpcFZlcnNpb25DaGVjaylcbiAgICByZXR1cm47XG4gIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICBpZiAocHJvY2Vzcy5zZW5kID09IG51bGwpIHtcbiAgICAvLyBwcm9jZXNzIGlzIG5vdCBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzXG4gICAgY2hlY2tQbGlua1ZlcnNpb24oKTtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIGNoZWNrUGxpbmtWZXJzaW9uKCkge1xuICBjb25zdCBwa2pzb24gPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAncGFja2FnZS5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBranNvbikpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtqc29uLCAndXRmOCcpKSBhcyB7ZGVwZW5kZW5jaWVzPzoge1twOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWR9OyBkZXZEZXBlbmRlbmNpZXM/OiB7W3A6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH19O1xuICAgIGxldCBkZXBWZXIgPSBqc29uLmRlcGVuZGVuY2llcyAmJiBqc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddIHx8XG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyAmJiBqc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgIGlmIChkZXBWZXIgPT0gbnVsbCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnRG9uXFwndCBmb3JnZXQgdG8gYWRkIEB3ZmgvcGxpbmsgaW4gcGFja2FnZS5qc29uIGFzIGRlcGVuZGVuY2llcycpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRlcFZlci5lbmRzV2l0aCgnLnRneicpKSB7XG4gICAgICBjb25zdCBtYXRjaGVkID0gLy0oXFxkK1xcLlxcZCtcXC5bXl0rPylcXC50Z3okLy5leGVjKGRlcFZlcik7XG4gICAgICBpZiAobWF0Y2hlZCA9PSBudWxsKVxuICAgICAgICByZXR1cm47XG4gICAgICBkZXBWZXIgPSBtYXRjaGVkWzFdO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyICYmICFzZW12ZXIuc2F0aXNmaWVzKHBrLnZlcnNpb24sIGRlcFZlcikpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoYExvY2FsIGluc3RhbGxlZCBQbGluayB2ZXJzaW9uICR7Y2hhbGsuY3lhbihway52ZXJzaW9uKX0gZG9lcyBub3QgbWF0Y2ggZGVwZW5kZW5jeSB2ZXJzaW9uICR7Y2hhbGsuZ3JlZW4oZGVwVmVyKX0gaW4gcGFja2FnZS5qc29uLCBgICtcbiAgICAgICAgYHJ1biBjb21tYW5kIFwiJHtjaGFsay5ncmVlbigncGxpbmsgdXBncmFkZScpfVwiIHRvIHVwZ3JhZGUgb3IgZG93bmdyYWRlIHRvIGV4cGVjdGVkIHZlcnNpb25gKSk7XG4gICAgfVxuICB9XG59XG5cbiJdfQ==