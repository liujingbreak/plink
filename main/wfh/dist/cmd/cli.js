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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLDRCQUE0QjtBQUM1Qiw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLDBEQUFrQztBQUNsQyxrREFBMEI7QUFDMUIsbURBQXFDO0FBR3JDLG9EQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsdURBQXlDO0FBQ3pDLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFDdEUsd0NBQXlGO0FBRXpGLHNEQUE4RDtBQUM5RCw2REFBcUU7QUFDckUsbUNBQThDO0FBRzlDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBc0IsQ0FBQztBQUNqRSxxQkFBcUI7QUFDckIsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXRCLFFBQUEsaUJBQWlCLEdBQUcseUVBQXlFO0lBQzFHLGdHQUFnRyxDQUFDO0FBRTFGLEtBQUssVUFBVSxjQUFjLENBQUMsU0FBaUI7SUFDcEQsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7SUFDeEIsNERBQTREO0lBQzVELHdEQUFhLGFBQWEsR0FBQyxDQUFDO0lBQzVCLGlDQUFpQztJQUdqQyxJQUFJLGFBQW1DLENBQUM7SUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDN0MsV0FBVyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztTQUM5RSxNQUFNLENBQUMsQ0FBQyxJQUFjLEVBQUUsRUFBRTtRQUN6QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGVBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdB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LENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBNEcsQ0FBQztRQUNwSyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQy9ELElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3RCxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7WUFDbEIsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBQSxnQkFBUyxFQUFDLGlFQUFpRSxDQUFDLENBQUMsQ0FBQztZQUMxRixPQUFPO1NBQ1I7UUFDRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxPQUFPLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELElBQUksT0FBTyxJQUFJLElBQUk7Z0JBQ2pCLE9BQU87WUFDVCxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JCO1FBQ0QsSUFBSSxNQUFNLElBQUksQ0FBQyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ25ELHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUEsZ0JBQVMsRUFBQyxpQ0FBaUMsZUFBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxlQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0I7Z0JBQ3hKLGdCQUFnQixlQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDLENBQUM7U0FDakc7S0FDRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9jZm9udC5kLnRzXCIgLz5cbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4vLyBpbXBvcnQgKiBhcyB0cCBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBzZW12ZXIgZnJvbSAnc2VtdmVyJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbi8vIGltcG9ydCAnLi4vdHNjLXBhY2thZ2VzLXNsaWNlJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7IGlzRHJjcFN5bWxpbmssIHNleHlGb250LCBnZXRSb290RGlyLCBib3hTdHJpbmcsIHBsaW5rRW52IH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBfc3ltbGlua3MgZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCB7Q29tbWFuZE92ZXJyaWRlciwgd2l0aEN3ZE9wdGlvbn0gZnJvbSAnLi9vdmVycmlkZS1jb21tYW5kZXInO1xuaW1wb3J0IHtobERlc2MsIGFycmF5T3B0aW9uRm59IGZyb20gJy4vdXRpbHMnO1xuLy8gaW1wb3J0IHtDbGlPcHRpb25zIGFzIFRzY29uZmlnQ2xpT3B0aW9uc30gZnJvbSAnLi9jbGktdHNjb25maWctaG9vayc7XG5pbXBvcnQgKiBhcyBfY2xpV2F0Y2ggZnJvbSAnLi9jbGktd2F0Y2gnO1xuY29uc3QgcGsgPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlLmpzb24nKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcbi8vIGNvbnN0IFdJRFRIID0gMTMwO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jbGknKTtcblxuZXhwb3J0IGNvbnN0IGNsaVBhY2thZ2VBcmdEZXNjID0gJ1NpbmdsZSBvciBtdWx0aXBsZSBwYWNrYWdlIG5hbWVzLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCwnICtcbidpZiB0aGUgc2NvcGUgbmFtZSAodGhlIHBhcnQgYmV0d2VlbiBcIkBcIiBcIi9cIikgYXJlIGxpc3RlZCBjb25maWd1cmF0aW9uIHByb3BlcnR5IFwicGFja2FnZVNjb3Blc1wiJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvbW1hbmRzKHN0YXJ0VGltZTogbnVtYmVyKSB7XG4gIHByb2Nlc3MudGl0bGUgPSAnUGxpbmsnO1xuICAvLyBjb25zdCB7c3RhdGVGYWN0b3J5fTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgYXdhaXQgaW1wb3J0KCcuL2NsaS1zbGljZScpO1xuICAvLyBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcblxuXG4gIGxldCBjbGlFeHRlbnNpb25zOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgncGxpbmsnKVxuICAuZGVzY3JpcHRpb24oY2hhbGsuY3lhbignQSBwbHVnZ2FibGUgbW9ub3JlcG8gYW5kIG11bHRpLXJlcG8gbWFuYWdlbWVudCB0b29sJykpXG4gIC5hY3Rpb24oKGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2cocHJvZ3JhbS5oZWxwSW5mb3JtYXRpb24oKSk7XG5cbiAgICBpZiAod3NTdGF0ZSA9PSBudWxsKSB7XG4gICAgICBjb25zdCB3c0RpcnMgPSBbLi4ucGtnTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCldO1xuICAgICAgaWYgKHdzRGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKGBNb3JlIGNvbW1hbmRzIGFyZSBhdmFpbGFibGUgaW4gd29ya3RyZWUgc3BhY2UgZGlyZWN0b3JpZXM6IFske3dzRGlycy5tYXAoaXRlbSA9PiBjaGFsay5jeWFuKGl0ZW0pKS5qb2luKCcsICcpfV1cXG5gICtcbiAgICAgICAgICBgVHJ5IGNvbW1hbmRzOlxcbiR7d3NEaXJzLm1hcChkaXIgPT4gJyAgcGxpbmsgLS1zcGFjZSAnICsgZGlyKS5qb2luKCdcXG4nKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgXFxudmVyc2lvbjogJHtway52ZXJzaW9ufSAke2lzRHJjcFN5bWxpbmsgPyBjaGFsay55ZWxsb3coJyhzeW1saW5rZWQpJykgOiAnJ30gYCk7XG4gICAgaWYgKGNsaUV4dGVuc2lvbnMgJiYgY2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYEZvdW5kICR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGh9IGNvbW1hbmQgbGluZSBleHRlbnNpb25gICtcbiAgICAgIGAke2NsaUV4dGVuc2lvbnMubGVuZ3RoID4gMSA/ICdzJyA6ICcnfTogJHtjbGlFeHRlbnNpb25zLm1hcChwa2cgPT4gY2hhbGsuYmx1ZShwa2cpKS5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG4nLCBjaGFsay5iZ1JlZCgnUGxlYXNlIGRldGVybWluZSBhIHN1YiBjb21tYW5kIGxpc3RlZCBhYm92ZScpKTtcbiAgICBjaGVja1BsaW5rVmVyc2lvbigpO1xuICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gcHJvY2Vzcy5leGl0KDEpKTtcbiAgfSk7XG4gIHByb2dyYW0uYWRkSGVscFRleHQoJ2JlZm9yZScsIHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gIHdpdGhDd2RPcHRpb24ocHJvZ3JhbSk7XG5cbiAgcHJvZ3JhbS52ZXJzaW9uKHBrLnZlcnNpb24sICctdiwgLS12ZXJzJywgJ291dHB1dCB0aGUgY3VycmVudCB2ZXJzaW9uJyk7XG4gIHByb2dyYW0uYWRkSGVscENvbW1hbmQoJ2hlbHAgW2NvbW1hbmRdJywgJ3Nob3cgaGVscCBpbmZvcm1hdGlvbiwgc2FtZSBhcyBcIi1oXCIuICcpO1xuXG4gIGNvbnN0IG92ZXJyaWRlciA9IG5ldyBDb21tYW5kT3ZlcnJpZGVyKHByb2dyYW0pO1xuICBsZXQgd3NTdGF0ZTogcGtnTWdyLldvcmtzcGFjZVN0YXRlIHwgdW5kZWZpbmVkO1xuXG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBjb25zdCB7Z2V0U3RhdGU6IGdldFBrZ1N0YXRlLCB3b3Jrc3BhY2VLZXl9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtnTWdyO1xuICAgIHdzU3RhdGUgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKSk7XG4gICAgaWYgKHdzU3RhdGUgIT0gbnVsbCkge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgcHJvZ3JhbSA9PiB7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gc3RyID0+IGNoYWxrLmdyZWVuKHN0cik7XG4gICAgICAgIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW0pO1xuICAgICAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgc3ViQ29tYW5kcyhwcm9ncmFtKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UobnVsbCwgc3ViQ29tYW5kcyk7XG4gIH1cblxuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfU0FGRSAhPT0gJ3RydWUnKSB7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuY3lhbihzdHIpO1xuICAgIGNsaUV4dGVuc2lvbnMgPSBsb2FkRXh0ZW5zaW9uQ29tbWFuZChwcm9ncmFtLCB3c1N0YXRlLCBvdmVycmlkZXIpO1xuICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1ZhbHVlIG9mIGVudmlyb25tZW50IHZhcmFpYmxlIFwiUExJTktfU0FGRVwiIGlzIHRydWUsIHNraXAgbG9hZGluZyBleHRlbnNpb24nKTtcbiAgfVxuXG4gIG92ZXJyaWRlci5hcHBlbmRHbG9iYWxPcHRpb25zKGZhbHNlKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2LCB7ZnJvbTogJ25vZGUnfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIGNvbW1hbmQgZHVlIHRvOiAnICsgY2hhbGsucmVkQnJpZ2h0KChlIGFzIEVycm9yKS5tZXNzYWdlKSwgZSk7XG4gICAgaWYgKChlIGFzIEVycm9yKS5zdGFjaykge1xuICAgICAgbG9nLmVycm9yKChlIGFzIEVycm9yKS5zdGFjayk7XG4gICAgfVxuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxufVxuXG5sZXQgc2tpcFZlcnNpb25DaGVjayA9IGZhbHNlO1xuXG5mdW5jdGlvbiBzdWJDb21hbmRzKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIHByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCAoKSA9PiB7XG4gICAgaWYgKHNraXBWZXJzaW9uQ2hlY2spXG4gICAgICByZXR1cm47XG4gICAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gICAgaWYgKHByb2Nlc3Muc2VuZCA9PSBudWxsKSB7XG4gICAgICAvLyBwcm9jZXNzIGlzIG5vdCBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzXG4gICAgICBjaGVja1BsaW5rVmVyc2lvbigpO1xuICAgIH1cbiAgfSk7XG4gIC8qKiBjb21tYW5kIGluaXRcbiAgICovXG4gIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2luaXQnKS5hbGlhcygnc3luYycpXG4gICAgLmRlc2NyaXB0aW9uKCdJbml0aWFsaXplIGFuZCB1cGRhdGUgd29yayBkaXJlY3RvcnksIGdlbmVyYXRlIGJhc2ljIGNvbmZpZ3VyYXRpb24gZmlsZXMgZm9yIHByb2plY3QgYW5kIGNvbXBvbmVudCBwYWNrYWdlcywnICtcbiAgICAgICcgY2FsY3VsYXRlIGhvaXN0ZWQgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMsIGFuZCBydW4gXCJucG0gaW5zdGFsbFwiIGluIGN1cnJlbnQgZGlyZWN0b3J5LicgK1xuICAgICAgJyAoQWxsIE5QTSBjb25maWcgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdpbGwgYWZmZWN0IGRlcGVuZGVuY3kgaW5zdGFsbGF0aW9uLCBzZWUgaHR0cHM6Ly9kb2NzLm5wbWpzLmNvbS9jbGkvdjcvdXNpbmctbnBtL2NvbmZpZyNlbnZpcm9ubWVudC12YXJpYWJsZXMpJylcbiAgICAuYXJndW1lbnQoJ1t3b3JrLWRpcmVjdG9yeV0nLCAnQSByZWxhdGl2ZSBvciBhYm9zb2x1dGUgZGlyZWN0b3J5IHBhdGgsIHVzZSBcIi5cIiB0byBkZXRlcm1pbmUgY3VycmVudCBkaXJlY3RvcnksXFxuICBvbW1pdHRpbmcgdGhpcyBhcmd1bWVudCBtZWFuaW5nOlxcbicgK1xuICAgICcgIC0gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgYWxyZWFkeSBhIFwid29yayBkaXJlY3RvcnlcIiwgdXBkYXRlIGl0LlxcbicgK1xuICAgICcgIC0gSWYgY3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29yayBkaXJlY3RvcnkgKG1heWJlIGF0IHJlcG9cXCdzIHJvb3QgZGlyZWN0b3J5KSwgdXBkYXRlIHRoZSBsYXRlc3QgdXBkYXRlZCB3b3JrJyArXG4gICAgJyBkaXJlY3RvcnkuJylcbiAgICAub3B0aW9uKCctZiwgLS1mb3JjZScsICdGb3JjZSBydW4gXCJucG0gaW5zdGFsbFwiIGluIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnksIHRoaXMgaXMgbm90IHNhbWUgYXMgbnBtIGluc3RhbGwgb3B0aW9uIFwiLWZcIiAnLCBmYWxzZSlcbiAgICAvLyAub3B0aW9uKCctLWxpbnQtaG9vaywgLS1saCcsICdDcmVhdGUgYSBnaXQgcHVzaCBob29rIGZvciBjb2RlIGxpbnQnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U/OiBzdHJpbmcpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktaW5pdCcpKS5kZWZhdWx0KGluaXRDbWQub3B0cygpICwgd29ya3NwYWNlKTtcbiAgICB9KTtcbiAgYWRkTnBtSW5zdGFsbE9wdGlvbihpbml0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBwcm9qZWN0XG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ3Byb2plY3QgW2FkZHxyZW1vdmVdIFtkaXIuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3QgYXNzb2NpYXRlZCBwcm9qZWN0IGZvbGRlcnMsIFBsaW5rIHdpbGwnICtcbiAgICAgICcgc2NhbiBzb3VyY2UgY29kZSBkaXJlY3RvcmllcyBmcm9tIGFzc29jaWF0ZWQgcHJvamVjdHMnLCB7XG4gICAgICAgICdhZGR8cmVtb3ZlJzogJ1NwZWNpZnkgd2hldGhlciBBc3NvY2lhdGUgdG8gYSBwcm9qZWN0IG9yIERpc2Fzc29jaWF0ZSBmcm9tIGEgcHJvamVjdCcsXG4gICAgICAgIGRpcjogJ1NwZWNpZnkgdGFyZ2V0IHByb2plY3QgcmVwbyBkaXJlY3RvcnkgKGFic29sdXRlIHBhdGggb3IgcmVsYXRpdmUgcGF0aCB0byBjdXJyZW50IGRpcmVjdG9yeSknICtcbiAgICAgICAgICAnLCBzcGVjaWZ5IG11bHRpcGxlIHByb2plY3QgYnkgc2VwZXJhdGluZyB0aGVtIHdpdGggc3BhY2UgY2hhcmFjdGVyJ1xuICAgICAgfSlcbiAgICAuYWN0aW9uKGFzeW5jIChhY3Rpb246ICdhZGQnIHwgJ3JlbW92ZScgfCB1bmRlZmluZWQsIHByb2plY3REaXI6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXByb2plY3QnKSkuZGVmYXVsdCh7aXNTcmNEaXI6IGZhbHNlfSwgYWN0aW9uLCBwcm9qZWN0RGlyKTtcbiAgICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ3NyYyBbYWRkfHJlbW92ZV0gW2Rpci4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignQXNzb2NpYXRlLCBkaXNhc3NvY2lhdGUgb3IgbGlzdCBzb3VyY2UgZGlyZWN0b3JpZXMsIFBsaW5rIHdpbGwnICtcbiAgICAgICcgc2NhbiBzb3VyY2UgY29kZSBkaXJlY3RvcmllcyBmb3IgcGFja2FnZXMnLCB7XG4gICAgICAgICdhZGR8cmVtb3ZlJzogJ1NwZWNpZnkgd2hldGhlciBhc3NvY2lhdGUgdG8gYSBkaXJlY3Rvcnkgb3IgZGlzYXNzb2NpYXRlIGZyb20gYSBkaXJlY3RvcnknLFxuICAgICAgICBkaXI6ICdzcGVjaWZ5IG11bHRpcGxlIGRpcmVjdG9yaWVzIGJ5IHNlcGVyYXRpbmcgdGhlbSB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgICAuYWN0aW9uKGFzeW5jIChhY3Rpb246ICdhZGQnIHwgJ3JlbW92ZScgfCB1bmRlZmluZWQsIGRpcnM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXByb2plY3QnKSkuZGVmYXVsdCh7aXNTcmNEaXI6IHRydWV9LCBhY3Rpb24sIGRpcnMpO1xuICAgICAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbGludFxuICAgKi9cbiAgLy8gY29uc3QgbGludENtZCA9IHByb2dyYW0uY29tbWFuZCgnbGludCBbcGFja2FnZS4uLl0nKVxuICAvLyAgIC5kZXNjcmlwdGlvbignc291cmNlIGNvZGUgc3R5bGUgY2hlY2snLCB7XG4gIC8vICAgICBwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY1xuICAvLyAgIH0pXG4gIC8vICAgLm9wdGlvbignLS1waiA8cHJvamVjdDEscHJvamVjdDIuLi4+JywgJ2xpbnQgb25seSBUUyBjb2RlIGZyb20gc3BlY2lmaWMgcHJvamVjdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAvLyAgIC5vcHRpb24oJy0tZml4JywgJ1J1biBlc2xpbnQvdHNsaW50IGZpeCwgdGhpcyBjb3VsZCBjYXVzZSB5b3VyIHNvdXJjZSBjb2RlIGJlaW5nIGNoYW5nZWQgdW5leHBlY3RlZGx5JywgZmFsc2UpXG4gIC8vICAgLmFjdGlvbihhc3luYyBwYWNrYWdlcyA9PiB7XG4gIC8vICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW50JykpLmRlZmF1bHQocGFja2FnZXMsIGxpbnRDbWQub3B0cygpIGFzIGFueSk7XG4gIC8vICAgfSk7XG5cbiAgLy8gbGludENtZC51c2FnZShsaW50Q21kLnVzYWdlKCkgK1xuICAvLyAgIGhsKCdcXG5kcmNwIGxpbnQgLS1waiA8cHJvamVjdC1kaXIuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnlcXG4nICtcbiAgLy8gICBobCgnXFxuZHJjcCBsaW50IDxjb21wb25lbnQtcGFja2FnZS4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBjb21wb25lbnQgcGFja2FnZXMnKTtcblxuICAvKipcbiAgICogY29tbWFuZCBjbGVhblxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcycpLmFsaWFzKCdjbGVhci1zeW1saW5rcycpXG4gICAgLmRlc2NyaXB0aW9uKCdDbGVhciBzeW1saW5rcyBmcm9tIG5vZGVfbW9kdWxlcycpXG4gICAgLy8gLm9wdGlvbignLS1vbmx5LXN5bWxpbmsnLCAnQ2xlYW4gb25seSBzeW1saW5rcywgbm90IGRpc3QgZGlyZWN0b3J5JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY2FuTm9kZU1vZHVsZXMgPSAocmVxdWlyZSgnLi4vdXRpbHMvc3ltbGlua3MnKSBhcyB0eXBlb2YgX3N5bWxpbmtzKS5kZWZhdWx0O1xuICAgICAgY29uc3QgZWRpdG9yID0gYXdhaXQgaW1wb3J0KCcuLi9lZGl0b3ItaGVscGVyJyk7XG4gICAgICBlZGl0b3IuZGlzcGF0Y2hlci5jbGVhclN5bWxpbmtzKCk7XG4gICAgICBhd2FpdCBlZGl0b3IuZ2V0QWN0aW9uJCgnY2xlYXJTeW1saW5rc0RvbmUnKS5waXBlKG9wLnRha2UoMSkpLnRvUHJvbWlzZSgpO1xuICAgICAgYXdhaXQgc2Nhbk5vZGVNb2R1bGVzKHVuZGVmaW5lZCwgJ2FsbCcpO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHVwZ3JhZGVcbiAgICovXG4gIGNvbnN0IHVwZ3JhZGVDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3VwZ3JhZGUnKVxuICAgIC5hbGlhcygnaW5zdGFsbCcpXG4gICAgLmRlc2NyaXB0aW9uKCdSZWluc3RhbGwgbG9jYWwgUGxpbmsgYWxvbmcgd2l0aCBvdGhlciBkZXBlbmRlbmNpZXMuJyArXG4gICAgICAnIFVubGlrZSBcIm5wbSBpbnN0YWxsXCIgd2hpY2ggZG9lcyBub3Qgd29yayB3aXRoIG5vZGVfbW9kdWxlcyB0aGF0IG1pZ2h0IGNvbnRhaW4gc3ltbGlua3MuJyArXG4gICAgICAnIChBbGwgTlBNIGNvbmZpZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2lsbCBhZmZlY3QgZGVwZW5kZW5jeSBpbnN0YWxsYXRpb24sIHNlZSBodHRwczovL2RvY3MubnBtanMuY29tL2NsaS92Ny91c2luZy1ucG0vY29uZmlnI2Vudmlyb25tZW50LXZhcmlhYmxlcyknKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgc2tpcFZlcnNpb25DaGVjayA9IHRydWU7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW5rLXBsaW5rJykpLnJlaW5zdGFsbFdpdGhMaW5rZWRQbGluayh1cGdyYWRlQ21kLm9wdHMoKSApO1xuICAgIH0pO1xuICBhZGROcG1JbnN0YWxsT3B0aW9uKHVwZ3JhZGVDbWQpO1xuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ2RvY2tlcml6ZSA8d29ya3NwYWNlLWRpcj4nKVxuICAvLyAuZGVzY3JpcHRpb24oY2hhbGsuZ3JheSgnW1RCSV0gR2VuZXJhdGUgRG9ja2VyZmlsZSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeSwgYW5kIGdlbmVyYXRlIGRvY2tlciBpbWFnZScpKTtcblxuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ3BrZyA8d29ya3NwYWNlLWRpcj4nKVxuICAvLyAuZGVzY3JpcHRpb24oY2hhbGsuZ3JheSgnW1RCSV0gVXNlIFBrZyAoaHR0cHM6Ly9naXRodWIuY29tL3ZlcmNlbC9wa2cpIHRvIHBhY2thZ2UgTm9kZS5qcyBwcm9qZWN0IGludG8gYW4gZXhlY3V0YWJsZSAnKSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbHNcbiAgICovXG4gIGNvbnN0IGxpc3RDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xzJykuYWxpYXMoJ2xpc3QnKVxuICAgIC5vcHRpb24oJy1qLCAtLWpzb24nLCAnbGlzdCBsaW5rZWQgZGVwZW5kZW5jaWVzIGluIGZvcm0gb2YgSlNPTicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0taG9pc3QnLCAnbGlzdCBob2lzdGVkIHRyYW5zaXRpdmUgRGVwZW5kZW5jeSBpbmZvcm1hdGlvbicsIGZhbHNlKVxuICAgIC5kZXNjcmlwdGlvbignSWYgeW91IHdhbnQgdG8ga25vdyBob3cgbWFueSBwYWNrYWdlcyB3aWxsIGFjdHVhbGx5IHJ1biwgdGhpcyBjb21tYW5kIHByaW50cyBvdXQgYSBsaXN0IGFuZCB0aGUgcHJpb3JpdGllcywgaW5jbHVkaW5nIGluc3RhbGxlZCBwYWNrYWdlcycpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5kZWZhdWx0KGxpc3RDbWQub3B0cygpICk7XG4gICAgfSk7XG5cbiAgY29uc3QgYWRkQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdhZGQgPGRlcGVuZGVuY3kuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0FkZCBkZXBlbmRlbmN5IHRvIHBhY2thZ2UuanNvbiBmaWxlLCB3aXRoIG9wdGlvbiBcIi0tZGV2XCIgdG8gYWRkIGFzIFwiZGV2RGVwZW5kZW5jaWVzXCIsICcgK1xuICAgICAgJ3dpdGhvdXQgb3B0aW9uIFwiLS10b1wiIHRoaXMgY29tbWFuZCBhZGRzIGRlcGVuZGVuY3kgdG8gY3VycmVudCB3b3JrdHJlZSBzcGFjZVxcJ3MgcGFja2FnZS5qc29uIGZpbGUnLFxuICAgICAge1xuICAgICAgICBkZXBlbmRlbmN5OiAnZGVwZW5kZW5jeSBwYWNrYWdlIG5hbWUgaW4gZm9ybSBvZiBcIjxhIGxpbmtlZCBwYWNrYWdlIG5hbWUgd2l0aG91dCBzY29wZSBwYXJ0PlwiLCBcIjxwYWNrYWdlIG5hbWU+QDx2ZXJzaW9uPlwiLCAnXG4gICAgICB9KVxuICAgIC5vcHRpb24oJy0tdG8gPHBrZyBuYW1lIHwgd29ya3RyZWUgZGlyIHwgcGtnIGRpcj4nLCAnYWRkIGRlcGVuZGVuY3kgdG8gdGhlIHBhY2thZ2UuanNvbiBvZiBzcGVjaWZpYyBsaW5rZWQgc291cmNlIHBhY2thZ2UgYnkgbmFtZSBvciBkaXJlY3RvcnksIG9yIGEgd29ya3RyZWUgc3BhY2UgZGlyZWN0b3J5JylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWFkZC1wYWNrYWdlJykpLmFkZERlcGVuZGVuY3lUbyhwYWNrYWdlcywgYWRkQ21kLm9wdHMoKS50bywgYWRkQ21kLm9wdHMoKS5kZXYpO1xuICAgIH0pO1xuXG4gIGNvbnN0IHRzY29uZmlnQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2NvbmZpZycpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IHRzY29uZmlnLmpzb24sIGpzY29uZmlnLmpzb24gZmlsZXMgd2hpY2ggd2lsbCBiZSB1cGRhdGVkIGF1dG9tYXRpY2FsbHkgYnkgUGxpbmssIChhIG1vbm9yZXBvIG1lYW5zIHRoZXJlIGFyZSBub2RlIHBhY2thZ2VzIHdoaWNoIGFyZSBzeW1saW5rZWQgZnJvbSByZWFsIHNvdXJjZSBjb2RlIGRpcmVjdG9yeScgK1xuICAgICAgJywgaWYgeW91IGhhdmUgY3VzdG9taXplZCB0c2NvbmZpZy5qc29uIGZpbGUsIHRoaXMgY29tbWFuZCBoZWxwcyB0byB1cGRhdGUgXCJjb21waWxlck9wdGlvbnMucGF0aHNcIiBwcm9wZXJ0aWVzKScpXG4gICAgLm9wdGlvbignLS1ob29rIDxmaWxlPicsICdhZGQgdHNjb25maWcvanNjb25maWcgZmlsZSB0byBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdW5ob29rIDxmaWxlPicsICdyZW1vdmUgdHNjb25maWcvanNjb25maWcgZmlsZSBmcm9tIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1jbGVhciwtLXVuaG9vay1hbGwnLCAncmVtb3ZlIGFsbCB0c2NvbmZpZyBmaWxlcyBmcm9tIGZyb20gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXRzY29uZmlnLWhvb2snKSkuZG9Uc2NvbmZpZyh0c2NvbmZpZ0NtZC5vcHRzKCkgKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogQnVtcCBjb21tYW5kXG4gICAqL1xuICBjb25zdCBidW1wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdidW1wIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdidW1wIHBhY2thZ2UuanNvbiB2ZXJzaW9uIG51bWJlciBmb3Igc3BlY2lmaWMgcGFja2FnZSwgc2FtZSBhcyBcIm5wbSB2ZXJzaW9uXCIgZG9lcycsXG4gICAgICB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnb25seSBidW1wIGNvbXBvbmVudCBwYWNrYWdlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLWksIC0taW5jcmUtdmVyc2lvbiA8dmFsdWU+JyxcbiAgICAgICd2ZXJzaW9uIGluY3JlbWVudCwgdmFsaWQgdmFsdWVzIGFyZTogbWFqb3IsIG1pbm9yLCBwYXRjaCwgcHJlcmVsZWFzZScsICdwYXRjaCcpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1idW1wJykpLmRlZmF1bHQoey4uLmJ1bXBDbWQub3B0cygpICwgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoYnVtcENtZCk7XG4gIC8vIGJ1bXBDbWQudXNhZ2UoYnVtcENtZC51c2FnZSgpICsgJ1xcbicgKyBobCgncGxpbmsgYnVtcCA8cGFja2FnZT4gLi4uJykgKyAnIHRvIHJlY3Vyc2l2ZWx5IGJ1bXAgcGFja2FnZS5qc29uIGZyb20gbXVsdGlwbGUgZGlyZWN0b3JpZXNcXG4nICtcbiAgLy8gICBobCgncGxpbmsgYnVtcCA8ZGlyPiAtaSBtaW5vcicpICsgJyB0byBidW1wIG1pbm9yIHZlcnNpb24gbnVtYmVyLCBkZWZhdWx0IGlzIHBhdGNoIG51bWJlcicpO1xuXG4gIC8qKlxuICAgKiBQYWNrIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHBhY2tDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3BhY2sgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ25wbSBwYWNrIHBha2FnZSBpbnRvIHRhcmJhbGwgZmlsZXMgYW5kIGNoYW5nZSB2ZXJzaW9uIHZhbHVlIGZyb20gcmVsYXRlZCBwYWNrYWdlLmpzb24nLCB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncGFjayBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLXcsLS13b3Jrc3BhY2UgPHdvcmtzcGFjZS1kaXI+JywgJ3BhY2sgcGFja2FnZXMgd2hpY2ggYXJlIGxpbmtlZCBhcyBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpcj4nLFxuICAgICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXRhci1kaXIgPGRpcj4nLCAnZGlyZWN0b3J5IHRvIHNhdmUgdGFyIGZpbGVzJywgUGF0aC5qb2luKGdldFJvb3REaXIoKSwgJ3RhcmJhbGxzJykpXG4gICAgLm9wdGlvbignLS1qZiwgLS1qc29uLWZpbGUgPHBrZy1qc29uLWZpbGU+JywgJ3RoZSBwYWNrYWdlLmpzb24gZmlsZSBpbiB3aGljaCBcImRldkRlcGVuZGVuY2llc1wiLCBcImRlcGVuZGVuY2llc1wiIHNob3VsZCB0byBiZSBjaGFuZ2VkIGFjY29yZGluZyB0byBwYWNrZWQgZmlsZSwgJyArXG4gICAgICAnYnkgZGVmYXVsdCBwYWNrYWdlLmpzb24gZmlsZXMgaW4gYWxsIHdvcmsgc3BhY2VzIHdpbGwgYmUgY2hlY2tlZCBhbmQgY2hhbmdlZCcpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnBhY2soey4uLnBhY2tDbWQub3B0cygpICwgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMocGFja0NtZCk7XG4gIHBhY2tDbWQudXNhZ2UocGFja0NtZC51c2FnZSgpICsgJ1xcbkJ5IGRlZmF1bHQsIHJ1biBcIm5wbSBwYWNrXCIgZm9yIGVhY2ggbGlua2VkIHBhY2thZ2Ugd2hpY2ggYXJlIGRlcGVuZGVuY2llcyBvZiBjdXJyZW50IHdvcmtzcGFjZScpO1xuXG4gIC8qKlxuICAgKiBQYWNrIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHB1Ymxpc2hDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3B1Ymxpc2gnKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIG5wbSBwdWJsaXNoJylcbiAgICAuYXJndW1lbnQoJ1twYWNrYWdlLi4uXScsIGNsaVBhY2thZ2VBcmdEZXNjKVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncHVibGlzaCBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsXG4gICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwdWJsaXNoIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcHVibGljJywgJ3NhbWUgYXMgXCJucG0gcHVibGlzaFwiIGNvbW1hbmQgb3B0aW9uIFwiLS1hY2Nlc3MgcHVibGljXCInLCB0cnVlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktcGFjaycpKS5wdWJsaXNoKHsuLi5wdWJsaXNoQ21kLm9wdHMoKSAsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG5cblxuICBjb25zdCBhbmFseXNpc0NtZCA9IHByb2dyYW0uY29tbWFuZCgnYW5hbHl6ZScpXG4gICAgLmFsaWFzKCdhbmFseXNlJylcbiAgICAuYXJndW1lbnQoJ1twYWNrYWdlLi4uXScsICd0aGUgbmFtZSBvZiB0YXJnZXQgc291cmNlIHBhY2thZ2UsIHRoZSBwYWNrYWdlIG11c3QgYmUgUGxpbmsgY29tcGxpYW50IHBhY2thZ2UsIHRoaXMgY29tbWFuZCB3aWxsIG9ubHkgJyArXG4gICAgICAnc2NhbiBzcGVjaWFsIFwicGxpbmsudHNjXCIgc291cmNlIGNvZGUgZGlyZWN0b3J5IGxpa2UgXCJ0cy9cIiBhbmQgXCJpc29tL1wiIG9mIHRhcmdldCBwYWNrYWdlJylcbiAgICAuZGVzY3JpcHRpb24oJ1VzZSBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIHBhcnNlIHNvdXJjZSBjb2RlLCBsaXN0IGRlcGVuZGVuY2VzIGJ5IERGUyBhbGdhcml0aG0sIHJlc3VsdCBpbmZvcm1hdGlvbiBpbmNsdWRlcycgK1xuICAgICAgJzogY3ljbGljIGRlcGVuZGVjaWVzLCB1bnJlc29sdmFibGUgZGVwZW5kZW5jaWVzLCBleHRlcm5hbCBkZXBlbmRlbmNpZXMsIGRlcGVuZGVuY2llcyBhcmUgbm90IHVuZGVyIHRhcmdldCBkaXJlY3RvcnkuJylcbiAgICAub3B0aW9uKCcteCA8cmVnZXhwPicsICdJbmdvcmUgXCJtb2R1bGUgbmFtZVwiIHRoYXQgbWF0Y2hlcyBzcGVjaWZpYyBSZWd1bGFyIEV4cGVyc3Npb24nLCAnXFxcXC4obGVzc3xzY3NzfGNzcykkJylcbiAgICAub3B0aW9uKCctZCwgLS1kaXIgPGRpcmVjdG9yeT4nLFxuICAgICAgJyhtdWx0aXBsZSkgZGV0ZXJtaW5lIHRhcmdldCBkaXJlY3RvcnksIHNjYW4gSlMvSlNYL1RTL1RTWCBmaWxlcyB1bmRlciB0YXJnZXQgZGlyZWN0b3J5JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLWYsIC0tZmlsZSA8ZmlsZT4nLFxuICAgICAgJyhtdWx0aXBsZSkgZGV0ZXJtaW5lIHRhcmdldCBUUy9KUyhYKSBmaWxlcyAobXVsdGlwbGUgZmlsZSB3aXRoIG1vcmUgb3B0aW9ucyBcIi1mIDxmaWxlPiAtZiA8Z2xvYj5cIiknLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctaicsICdTaG93IHJlc3VsdCBpbiBKU09OJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS10c2NvbmZpZyA8ZmlsZT4nLCAnVXNlIFwiY29tcGlsZXJPcHRpb25zLnBhdGhzXCIgcHJvcGVydHkgdG8gcmVzb2x2ZSB0cy9qcyBmaWxlIG1vZHVsZScpXG4gICAgLm9wdGlvbignLS1hbGlhcyA8YWxpYXMtZXhwcmVzcz4nLCAnbXVsdGlwbGUgSlNPTiBleHByZXNzLCBlLmcuIC0tYWxpYXMgXFwnXCJeQC8oLispJFwiLFwic3JjLyQxXCJcXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hbmFseXplJykpLmRlZmF1bHQocGFja2FnZXMsIGFuYWx5c2lzQ21kLm9wdHMoKSk7XG4gICAgfSk7XG5cbiAgYW5hbHlzaXNDbWQudXNhZ2UoYW5hbHlzaXNDbWQudXNhZ2UoKSArICdcXG4nICtcbiAgICAnZS5nLlxcbiAgJyArIGNoYWxrLmJsdWUoJ3BsaW5rIGFuYWx5emUgLWYgXCJwYWNrYWdlcy9mb29iYXIxLyoqLypcIiAtZiBwYWNrYWdlcy9mb29iYXIyL3RzL21haW4udHNcXG4gICcgK1xuICAgICdwbGluayBhbmFseXplIC1kIHBhY2thZ2VzL2Zvb2JhcjEvc3JjIC1kIHBhY2thZ2VzL2Zvb2JhcjIvdHMnKSk7XG5cbiAgY29uc3Qgd2F0Y2hDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3dhdGNoJylcbiAgLmRlc2NyaXB0aW9uKCdXYXRjaCBwYWNrYWdlIHNvdXJjZSBjb2RlIGZpbGUgY2hhbmdlcyAoZmlsZXMgcmVmZXJlbmNlZCBpbiAubnBtaWdub3JlIHdpbGwgYmUgaWdub3JlZCkgYW5kIHVwZGF0ZSBQbGluayBzdGF0ZSwgJyArXG4gICdhdXRvbWF0aWNhbGx5IGluc3RhbGwgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5JylcbiAgLmFyZ3VtZW50KCdbcGFja2FnZS4uLl0nLCBjbGlQYWNrYWdlQXJnRGVzYywgW10pXG4gIC5vcHRpb24oJy0tY3AsIC0tY29weSA8ZGlyZWN0b3J5PicsICdjb3B5IHBhY2thZ2UgZmlsZXMgdG8gc3BlY2lmaWMgZGlyZWN0b3J5LCBtaW1pYyBiZWhhdmlvciBvZiBcIm5wbSBpbnN0YWxsIDxwa2c+XCIsIGJ1dCB0aGlzIHdvblxcJ3QgaW5zdGFsbCBkZXBlbmRlbmNpZXMnKVxuICAuYWN0aW9uKChwa2dzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IHtjbGlXYXRjaH0gPSByZXF1aXJlKCcuL2NsaS13YXRjaCcpIGFzIHR5cGVvZiBfY2xpV2F0Y2g7XG4gICAgY2xpV2F0Y2gocGtncywgd2F0Y2hDbWQub3B0cygpKTtcbiAgfSk7XG5cbiAgY29uc3QgdXBkYXRlRGlyQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGRhdGUtZGlyJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biB0aGlzIGNvbW1hbmQgdG8gc3luYyBpbnRlcm5hbCBzdGF0ZSB3aGVuIHdob2xlIHdvcmtzcGFjZSBkaXJlY3RvcnkgaXMgcmVuYW1lZCBvciBtb3ZlZC5cXG4nICtcbiAgICAnQmVjYXVzZSB3ZSBzdG9yZSBhYnNvbHV0ZSBwYXRoIGluZm8gb2YgZWFjaCBwYWNrYWdlIGluIGludGVybmFsIHN0YXRlLCBhbmQgaXQgd2lsbCBiZWNvbWUgaW52YWxpZCBhZnRlciB5b3UgcmVuYW1lIG9yIG1vdmUgZGlyZWN0b3J5JylcbiAgICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuY2hlY2tEaXIodXBkYXRlRGlyQ21kLm9wdHMoKSApO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzcGFjZU9ubHlTdWJDb21tYW5kcyhwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICAvKipcbiAgICogdHNjIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHRzY0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gVHlwZXNjcmlwdCBjb21waWxlciB0byBjb21waWxlIHNvdXJjZSBjb2RlIGZvciB0YXJnZXQgcGFja2FnZXMsICcgK1xuICAgICd3aGljaCBoYXZlIGJlZW4gbGlua2VkIHRvIGN1cnJlbnQgd29yayBkaXJlY3RvcnknLCB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgd2F0Y2ggbW9kZScsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdDb21waWxlIG9ubHkgc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLCAodiwgcHJldikgPT4ge1xuICAgICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC8vIC5vcHRpb24oJy0td3MsLS13b3Jrc3BhY2UgPHdvcmtzcGFjZS1kaXI+JywgJ29ubHkgaW5jbHVkZSB0aG9zZSBsaW5rZWQgcGFja2FnZXMgd2hpY2ggYXJlIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgLy8gICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXRzeCwtLWpzeCcsICdpbmNsdWRlcyBUU1ggZmlsZScsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tZWQsIC0tZW1pdERlY2xhcmF0aW9uT25seScsICdUeXBlc2NyaXB0IGNvbXBpbGVyIG9wdGlvbjogLS1lbWl0RGVjbGFyYXRpb25Pbmx5Llxcbk9ubHkgZW1pdCDigJguZC50c+KAmSBkZWNsYXJhdGlvbiBmaWxlcy4nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXNvdXJjZS1tYXAgPGlubGluZXxmaWxlPicsICdTb3VyY2UgbWFwIHN0eWxlOiBcImlubGluZVwiIG9yIFwiZmlsZVwiJywgJ2lubGluZScpXG4gICAgLm9wdGlvbignLS1tZXJnZSwtLW1lcmdlLXRzY29uZmlnIDxmaWxlPicsICdNZXJnZSBjb21waWxlck9wdGlvbnMgXCJiYXNlVXJsXCIgYW5kIFwicGF0aHNcIiBmcm9tIHNwZWNpZmllZCB0c2NvbmZpZyBmaWxlJylcbiAgICAub3B0aW9uKCctLWNvcGF0aCwgLS1jb21waWxlci1vcHRpb25zLXBhdGhzIDxwYXRoTWFwSnNvbj4nLFxuICAgICAgJ0FkZCBtb3JlIFwicGF0aHNcIiBwcm9wZXJ0eSB0byBjb21waWxlciBvcHRpb25zLiAnICtcbiAgICAgICcoZS5nLiAtLWNvcGF0aCBcXCd7XFxcIkAvKlwiOltcIi9Vc2Vycy93b3JrZXIvb2NlYW4tdWkvc3JjLypcIl19XFwnKScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLm9wdGlvbignLS1jbyA8SlNPTi1zdHJpbmc+JyxcbiAgICAgIGBQYXJ0aWFsIGNvbXBpbGVyIG9wdGlvbnMgdG8gYmUgbWVyZ2VkIChleGNlcHQgXCJiYXNlVXJsXCIpLCBcInBhdGhzXCIgbXVzdCBiZSByZWxhdGl2ZSB0byAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcGxpbmtFbnYud29ya0RpcikgfHwgJ2N1cnJlbnQgZGlyZWN0b3J5J31gKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgY29uc3Qgb3B0ID0gdHNjQ21kLm9wdHMoKTtcbiAgICAgIGNvbnN0IHRzYyA9IGF3YWl0IGltcG9ydCgnLi4vdHMtY21kJyk7XG5cbiAgICAgIGF3YWl0IHRzYy50c2Moe1xuICAgICAgICBwYWNrYWdlOiBwYWNrYWdlcyxcbiAgICAgICAgcHJvamVjdDogb3B0LnByb2plY3QsXG4gICAgICAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgICAgIHNvdXJjZU1hcDogb3B0LnNvdXJjZU1hcCxcbiAgICAgICAganN4OiBvcHQuanN4LFxuICAgICAgICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHksXG4gICAgICAgIHBhdGhzSnNvbnM6IG9wdC5jb21waWxlck9wdGlvbnNQYXRocyxcbiAgICAgICAgbWVyZ2VUc2NvbmZpZzogb3B0Lm1lcmdlVHNjb25maWcsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uczogb3B0LmNvID8gSlNPTi5wYXJzZShvcHQuY28pIDogdW5kZWZpbmVkXG4gICAgICB9KTtcbiAgICB9KTtcblxuICB0c2NDbWQudXNhZ2UodHNjQ21kLnVzYWdlKCkgK1xuICAgICdcXG5JdCBjb21waWxlcyBcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi90cy8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2Rpc3RcIixcXG4nICtcbiAgICAnICBvclxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb20vKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tXCJcXG4gZm9yIGFsbCBAd2ZoIHBhY2thZ2VzLlxcbicgK1xuICAgICdJIHN1Z2dlc3QgdG8gcHV0IE5vZGUuanMgc2lkZSBUUyBjb2RlIGluIGRpcmVjdG9yeSBgdHNgLCBhbmQgaXNvbW9ycGhpYyBUUyBjb2RlIChtZWFuaW5nIGl0IHJ1bnMgaW4gJyArXG4gICAgJ2JvdGggTm9kZS5qcyBhbmQgQnJvd3NlcikgaW4gZGlyZWN0b3J5IGBpc29tYC5cXG5cXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzY1xcbicpICsgJyBDb21waWxlIGxpbmtlZCBwYWNrYWdlcyB0aGF0IGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UgKHlvdSBzaGFsbCBydW4gdGhpcyBjb21tYW5kIG9ubHkgaW4gYSB3b3Jrc3BhY2UgZGlyZWN0b3J5KVxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBwYWNrYWdlcyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyBbcGFja2FnZS4uLl0gLXdcXG4nKSArICcgV2F0Y2ggcGFja2FnZXMgY2hhbmdlIGFuZCBjb21waWxlIHdoZW4gbmV3IHR5cGVzY3JpcHQgZmlsZSBpcyBjaGFuZ2VkIG9yIGNyZWF0ZWRcXG5cXG4nKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ3NldHRpbmcgW3BhY2thZ2VdJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgcGFja2FnZXMgc2V0dGluZyBhbmQgdmFsdWVzJywge3BhY2thZ2U6ICdwYWNrYWdlIG5hbWUsIG9ubHkgbGlzdCBzZXR0aW5nIGZvciBzcGVjaWZpYyBwYWNrYWdlJ30pXG4gICAgLmFjdGlvbihhc3luYyAocGtnTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1zZXR0aW5nJykpLmRlZmF1bHQocGtnTmFtZSk7XG4gICAgfSk7XG4gICAgLyoqIGNvbW1hbmQgcnVuKi9cbiAgY29uc3QgcnVuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHNwZWNpZmljIG1vZHVsZVxcJ3MgZXhwb3J0ZWQgZnVuY3Rpb25cXG4nKVxuICAgIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gICAgfSk7XG5cbiAgcnVuQ21kLnVzYWdlKHJ1bkNtZC51c2FnZSgpICsgJ1xcbicgKyBjaGFsay5ncmVlbigncGxpbmsgcnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dXFxuJykgK1xuICAgIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gLi4vcGFja2FnZXMvZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlLmpzI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICAgJzx0YXJnZXQ+IC0gSlMgb3IgVFMgZmlsZSBtb2R1bGUgcGF0aCB3aGljaCBjYW4gYmUgcmVzb2x2ZWQgYnkgTm9kZS5qcyAodHMtbm9kZSkgZm9sbG93ZWQgYnkgXCIjXCIgYW5kIGV4cG9ydGVkIGZ1bmN0aW9uIG5hbWUsXFxuJyk7XG4gICAgLy8gJ2UuZy4gXFxuJyArXG4gICAgLy8gY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAgIC8vICcsIGZ1bmN0aW9uIGNhbiBiZSBhc3luYyB3aGljaCByZXR1cm5zIFByb21pc2VcXG4nICtcbiAgICAvLyBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICAgLy8gJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG5cbn1cblxuZnVuY3Rpb24gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQsIG92ZXJyaWRlcjogQ29tbWFuZE92ZXJyaWRlcik6IHN0cmluZ1tdIHtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIFtdO1xuICBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgYXZhaWxhYmxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IGRyID0gcGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rO1xuICAgIGlmIChkciA9PSBudWxsIHx8IGRyLmNsaSA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgW3BrZ0ZpbGVQYXRoLCBmdW5jTmFtZV0gPSAoZHIuY2xpIGFzIHN0cmluZykuc3BsaXQoJyMnKTtcblxuICAgIGF2YWlsYWJsZXMucHVzaChway5uYW1lKTtcblxuICAgIHRyeSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShwaywgcGtnRmlsZVBhdGgsIGZ1bmNOYW1lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7KGUgYXMgRXJyb3IpLm1lc3NhZ2V9XCJgLCBlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGF2YWlsYWJsZXM7XG59XG5cbmZ1bmN0aW9uIGFkZE5wbUluc3RhbGxPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLWNhY2hlIDxucG0tY2FjaGU+JywgJ3NhbWUgYXMgbnBtIGluc3RhbGwgb3B0aW9uIFwiLS1jYWNoZVwiJylcbiAgLm9wdGlvbignLS1jaSwgLS11c2UtY2knLCAnVXNlIFwibnBtIGNpXCIgaW5zdGVhZCBvZiBcIm5wbSBpbnN0YWxsXCIgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcnVuZScsICdSdW4gXCJucG0gcHJ1bmVcIiBhZnRlciBpbnN0YWxsYXRpb24nKVxuICAub3B0aW9uKCctLWRkcCwgLS1kZWR1cGUnLCAnUnVuIFwibnBtIGRlZHVwZVwiIGFmdGVyIGluc3RhbGxhdGlvbicpXG4gIC8vIC5vcHRpb24oJy0tb2ZmbGluZScsICdzYW1lIGFzIG5wbSBvcHRpb24gXCItLW9mZmxpbmVcIiBkdXJpbmcgZXhlY3V0aW5nIG5wbSBpbnN0YWxsL2NpICcsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrUGxpbmtWZXJzaW9uKCkge1xuICBjb25zdCBwa2pzb24gPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAncGFja2FnZS5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBranNvbikpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtqc29uLCAndXRmOCcpKSBhcyB7ZGVwZW5kZW5jaWVzPzoge1twOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWR9OyBkZXZEZXBlbmRlbmNpZXM/OiB7W3A6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH19O1xuICAgIGxldCBkZXBWZXIgPSBqc29uLmRlcGVuZGVuY2llcyAmJiBqc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddIHx8XG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyAmJiBqc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgIGlmIChkZXBWZXIgPT0gbnVsbCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnRG9uXFwndCBmb3JnZXQgdG8gYWRkIEB3ZmgvcGxpbmsgaW4gcGFja2FnZS5qc29uIGFzIGRlcGVuZGVuY2llcycpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRlcFZlci5lbmRzV2l0aCgnLnRneicpKSB7XG4gICAgICBjb25zdCBtYXRjaGVkID0gLy0oXFxkK1xcLlxcZCtcXC5bXl0rPylcXC50Z3okLy5leGVjKGRlcFZlcik7XG4gICAgICBpZiAobWF0Y2hlZCA9PSBudWxsKVxuICAgICAgICByZXR1cm47XG4gICAgICBkZXBWZXIgPSBtYXRjaGVkWzFdO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyICYmICFzZW12ZXIuc2F0aXNmaWVzKHBrLnZlcnNpb24sIGRlcFZlcikpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoYExvY2FsIGluc3RhbGxlZCBQbGluayB2ZXJzaW9uICR7Y2hhbGsuY3lhbihway52ZXJzaW9uKX0gZG9lcyBub3QgbWF0Y2ggZGVwZW5kZW5jeSB2ZXJzaW9uICR7Y2hhbGsuZ3JlZW4oZGVwVmVyKX0gaW4gcGFja2FnZS5qc29uLCBgICtcbiAgICAgICAgYHJ1biBjb21tYW5kIFwiJHtjaGFsay5ncmVlbigncGxpbmsgdXBncmFkZScpfVwiIHRvIHVwZ3JhZGUgb3IgZG93bmdyYWRlIHRvIGV4cGVjdGVkIHZlcnNpb25gKSk7XG4gICAgfVxuICB9XG59XG5cbiJdfQ==