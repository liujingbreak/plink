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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLDRCQUE0QjtBQUM1Qiw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLDBEQUFrQztBQUNsQyxrREFBMEI7QUFDMUIsbURBQXFDO0FBR3JDLG9EQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsdURBQXlDO0FBQ3pDLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFDdEUsd0NBQXlGO0FBRXpGLHNEQUE4RDtBQUM5RCw2REFBcUU7QUFDckUsbUNBQThDO0FBRzlDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBc0IsQ0FBQztBQUNqRSxxQkFBcUI7QUFDckIsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXRCLFFBQUEsaUJBQWlCLEdBQUcseUVBQXlFO0lBQzFHLGdHQUFnRyxDQUFDO0FBRTFGLEtBQUssVUFBVSxjQUFjLENBQUMsU0FBaUI7SUFDcEQsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7SUFDeEIsNERBQTREO0lBQzVELHdEQUFhLGFBQWEsR0FBQyxDQUFDO0lBQzVCLGlDQUFpQztJQUdqQyxJQUFJLGFBQW1DLENBQUM7SUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDN0MsV0FBVyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztTQUM5RSxNQUFNLENBQUMsQ0FBQyxJQUFjLEVBQUUsRUFBRTtRQUN6QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGVBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUV2QyxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDbkIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN4RCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNyQixzQ0FBc0M7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0RBQStELE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLO29CQUM3SCxrQkFBa0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDL0U7U0FDRjtRQUNELHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sSUFBSSxvQkFBYSxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzdGLElBQUksYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzdDLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsYUFBYSxDQUFDLE1BQU0seUJBQXlCO2dCQUNsRSxHQUFHLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDcEc7UUFDRCxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsZUFBSyxDQUFDLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsaUJBQWlCLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUEsZUFBUSxFQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELElBQUEsa0NBQWEsRUFBQyxPQUFPLENBQUMsQ0FBQztJQUV2QixPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLDRCQUE0QixDQUFDLENBQUM7SUFDeEUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO0lBRWxGLE1BQU0sU0FBUyxHQUFHLElBQUkscUNBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEQsSUFBSSxPQUEwQyxDQUFDO0lBRS9DLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFO1FBQ3JDLE1BQU0sRUFBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBa0IsQ0FBQztRQUN6RixPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1lBQ25CLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFO2dCQUNuQyxTQUFTLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsZUFBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDL0Msb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzlCLFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO2dCQUNqQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEIsQ0FBQyxDQUFDLENBQUM7U0FDSjthQUFNO1lBQ0wsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7U0FDeEM7S0FDRjtTQUFNO1FBQ0wsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7S0FDeEM7SUFFRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLE1BQU0sRUFBRTtRQUNyQyxTQUFTLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QyxhQUFhLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRSxTQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztLQUNsQztTQUFNO1FBQ0wsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEVBQTRFLENBQUMsQ0FBQztLQUMzRjtJQUVELFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQyxJQUFJO1FBQ0YsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFDLENBQUMsQ0FBQztLQUN4RDtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsR0FBRyxlQUFLLENBQUMsU0FBUyxDQUFFLENBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRixJQUFLLENBQVcsQ0FBQyxLQUFLLEVBQUU7WUFDdEIsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDL0I7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pCO0FBQ0gsQ0FBQztBQWpGRCx3Q0FpRkM7QUFFRCxJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQztBQUU3QixTQUFTLFVBQVUsQ0FBQyxPQUEwQjtJQUM1QyxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDNUIsSUFBSSxnQkFBZ0I7WUFDbEIsT0FBTztRQUNULGdCQUFnQixHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFO1lBQ3hCLHdDQUF3QztZQUN4QyxpQkFBaUIsRUFBRSxDQUFDO1NBQ3JCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSDtPQUNHO0lBQ0gsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1NBQ2xELFdBQVcsQ0FBQyw4R0FBOEc7UUFDekgseUZBQXlGO1FBQ3pGLHVKQUF1SixDQUFDO1NBQ3pKLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSx1SEFBdUg7UUFDckosc0VBQXNFO1FBQ3RFLG9IQUFvSDtRQUNwSCxhQUFhLENBQUM7U0FDYixNQUFNLENBQUMsYUFBYSxFQUFFLHVHQUF1RyxFQUFFLEtBQUssQ0FBQztRQUN0SSw4RUFBOEU7U0FDN0UsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFrQixFQUFFLEVBQUU7UUFDbkMsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBQSxlQUFRLEVBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEMsQ0FBQyx3REFBYSxZQUFZLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUcsU0FBUyxDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7SUFDTCxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUU3Qjs7T0FFRztJQUNILE9BQU8sQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUM7U0FDN0MsV0FBVyxDQUFDLHdFQUF3RTtRQUNuRix3REFBd0QsRUFBRTtRQUN4RCxZQUFZLEVBQUUsdUVBQXVFO1FBQ3JGLEdBQUcsRUFBRSw2RkFBNkY7WUFDaEcsb0VBQW9FO0tBQ3ZFLENBQUM7U0FDSCxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQW9DLEVBQUUsVUFBb0IsRUFBRSxFQUFFO1FBQzNFLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUEsZUFBUSxFQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBQyxRQUFRLEVBQUUsS0FBSyxFQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pGLENBQUMsQ0FBQyxDQUFDO0lBRUwsT0FBTyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQztTQUN6QyxXQUFXLENBQUMsZ0VBQWdFO1FBQzNFLDRDQUE0QyxFQUFFO1FBQzVDLFlBQVksRUFBRSwyRUFBMkU7UUFDekYsR0FBRyxFQUFFLHNFQUFzRTtLQUM1RSxDQUFDO1NBQ0QsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFvQyxFQUFFLElBQWMsRUFBRSxFQUFFO1FBQ3JFLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUEsZUFBUSxFQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFFLENBQUMsQ0FBQyxDQUFDO0lBRVA7O09BRUc7SUFDSCx1REFBdUQ7SUFDdkQsOENBQThDO0lBQzlDLGlDQUFpQztJQUNqQyxPQUFPO0lBQ1AseUdBQXlHO0lBQ3pHLG1IQUFtSDtJQUNuSCxnQ0FBZ0M7SUFDaEMsbUZBQW1GO0lBQ25GLFFBQVE7SUFFUixrQ0FBa0M7SUFDbEMsMEdBQTBHO0lBQzFHLDBHQUEwRztJQUUxRzs7T0FFRztJQUNILE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDO1NBQzFDLFdBQVcsQ0FBQyxrQ0FBa0MsQ0FBQztRQUNoRCw4RUFBOEU7U0FDN0UsTUFBTSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2pCLE1BQU0sZUFBZSxHQUFJLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBc0IsQ0FBQyxPQUFPLENBQUM7UUFDbkYsTUFBTSxNQUFNLEdBQUcsd0RBQWEsa0JBQWtCLEdBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDMUUsTUFBTSxlQUFlLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUw7O09BRUc7SUFDSCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUMxQyxLQUFLLENBQUMsU0FBUyxDQUFDO1NBQ2hCLFdBQVcsQ0FBQyxzREFBc0Q7UUFDakUsMEZBQTBGO1FBQzFGLHVKQUF1SixDQUFDO1NBQ3pKLE1BQU0sQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNqQixnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDeEIsTUFBTSxDQUFDLHdEQUFhLGtCQUFrQixHQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUUsQ0FBQztJQUN4RixDQUFDLENBQUMsQ0FBQztJQUNMLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2hDLCtDQUErQztJQUMvQyxxSEFBcUg7SUFFckgseUNBQXlDO0lBQ3pDLDRIQUE0SDtJQUU1SDs7T0FFRztJQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztTQUNoRCxNQUFNLENBQUMsWUFBWSxFQUFFLDBDQUEwQyxFQUFFLEtBQUssQ0FBQztTQUN2RSxNQUFNLENBQUMsU0FBUyxFQUFFLGdEQUFnRCxFQUFFLEtBQUssQ0FBQztTQUMxRSxXQUFXLENBQUMsMElBQTBJLENBQUM7U0FDdkosTUFBTSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2pCLE1BQU0sQ0FBQyx3REFBYSxVQUFVLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUUsQ0FBQztJQUM1RCxDQUFDLENBQUMsQ0FBQztJQUVMLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUM7U0FDbEQsV0FBVyxDQUFDLHdGQUF3RjtRQUNuRyxtR0FBbUcsRUFDbkc7UUFDRSxVQUFVLEVBQUUsK0dBQStHO0tBQzVILENBQUM7U0FDSCxNQUFNLENBQUMsMENBQTBDLEVBQUUsMEhBQTBILENBQUM7U0FDOUssTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxDQUFDLHdEQUFhLG1CQUFtQixHQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNHLENBQUMsQ0FBQyxDQUFDO0lBRUwsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7U0FDNUMsV0FBVyxDQUFDLHFMQUFxTDtRQUNoTSwrR0FBK0csQ0FBQztTQUNqSCxNQUFNLENBQUMsZUFBZSxFQUFFLHFFQUFxRSxFQUFFLHFCQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ2pILE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSwwRUFBMEUsRUFBRSxxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUN4SCxNQUFNLENBQUMsc0JBQXNCLEVBQUUsMkVBQTJFLEVBQUUsS0FBSyxDQUFDO1NBQ2xILE1BQU0sQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNqQixDQUFDLHdEQUFhLHFCQUFxQixHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFFLENBQUM7SUFDeEUsQ0FBQyxDQUFDLENBQUM7SUFFTDs7T0FFRztJQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7U0FDakQsV0FBVyxDQUFDLG1GQUFtRixFQUM5RixFQUFDLE9BQU8sRUFBRSx5QkFBaUIsRUFBQyxDQUFDO1NBQzlCLE1BQU0sQ0FBVyxtQ0FBbUMsRUFBRSw4REFBOEQsRUFDbkgsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNQLE1BQU0sQ0FBQyw2QkFBNkIsRUFDbkMsc0VBQXNFLEVBQUUsT0FBTyxDQUFDO1NBQ2pGLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBa0IsRUFBRSxFQUFFO1FBQ25DLE1BQU0sQ0FBQyx3REFBYSxZQUFZLEdBQUMsQ0FBQyxDQUFDLE9BQU8saUNBQUssT0FBTyxDQUFDLElBQUksRUFBRSxLQUFHLFFBQVEsSUFBRSxDQUFDO0lBQzdFLENBQUMsQ0FBQyxDQUFDO0lBQ0wsOEJBQThCO0lBQzlCLDRJQUE0STtJQUM1SSxpR0FBaUc7SUFFakc7O09BRUc7SUFDSCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO1NBQ2pELFdBQVcsQ0FBQyx1RkFBdUYsRUFBRSxFQUFDLE9BQU8sRUFBRSx5QkFBaUIsRUFBQyxDQUFDO1NBQ2xJLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSx5Q0FBeUMsRUFBRSxxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUNqRyxNQUFNLENBQUMsZ0NBQWdDLEVBQUUscUVBQXFFLEVBQzdHLHFCQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ25CLE1BQU0sQ0FBQywrQkFBK0IsRUFDckMsK0ZBQStGLEVBQy9GLHFCQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ25CLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSw2QkFBNkIsRUFBRSxjQUFJLENBQUMsSUFBSSxDQUFDLElBQUEsaUJBQVUsR0FBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1NBQzdGLE1BQU0sQ0FBQyxtQ0FBbUMsRUFBRSxrSEFBa0g7UUFDN0osOEVBQThFLENBQUM7U0FDaEYsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxDQUFDLHdEQUFhLFlBQVksR0FBQyxDQUFDLENBQUMsSUFBSSxpQ0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUcsUUFBUSxJQUFFLENBQUM7SUFDMUUsQ0FBQyxDQUFDLENBQUM7SUFDTCw4QkFBOEI7SUFDOUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsa0dBQWtHLENBQUMsQ0FBQztJQUVwSTs7T0FFRztJQUNILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1NBQzFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQztTQUM5QixRQUFRLENBQUMsY0FBYyxFQUFFLHlCQUFpQixDQUFDO1NBQzNDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSw0Q0FBNEMsRUFBRSxxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUNwRyxNQUFNLENBQVcsbUNBQW1DLEVBQ3JELCtGQUErRixFQUM3RixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFBQyxPQUFPLElBQUksQ0FBQztJQUM5QyxDQUFDLEVBQUUsRUFBYyxDQUFDO1NBQ25CLE1BQU0sQ0FBQyxnQ0FBZ0MsRUFBRSx3RUFBd0UsRUFDaEgscUJBQWEsRUFBRSxFQUFFLENBQUM7U0FDbkIsTUFBTSxDQUFDLFVBQVUsRUFBRSx3REFBd0QsRUFBRSxJQUFJLENBQUM7U0FDbEYsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxDQUFDLHdEQUFhLFlBQVksR0FBQyxDQUFDLENBQUMsT0FBTyxpQ0FBSyxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUcsUUFBUSxJQUFFLENBQUM7SUFDaEYsQ0FBQyxDQUFDLENBQUM7SUFHTCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUMzQyxLQUFLLENBQUMsU0FBUyxDQUFDO1NBQ2hCLFFBQVEsQ0FBQyxjQUFjLEVBQUUseUdBQXlHO1FBQ2pJLHlGQUF5RixDQUFDO1NBQzNGLFdBQVcsQ0FBQyw4R0FBOEc7UUFDekgsc0hBQXNILENBQUM7U0FDeEgsTUFBTSxDQUFDLGFBQWEsRUFBRSwrREFBK0QsRUFBRSxxQkFBcUIsQ0FBQztTQUM3RyxNQUFNLENBQUMsdUJBQXVCLEVBQzdCLHdGQUF3RixFQUFFLHFCQUFhLEVBQUUsRUFBRSxDQUFDO1NBQzdHLE1BQU0sQ0FBQyxtQkFBbUIsRUFDekIsb0dBQW9HLEVBQUUscUJBQWEsRUFBRSxFQUFFLENBQUM7U0FDekgsTUFBTSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRSxLQUFLLENBQUM7U0FDMUMsTUFBTSxDQUFDLG1CQUFtQixFQUFFLG1FQUFtRSxDQUFDO1NBQ2hHLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSw2REFBNkQsRUFBRSxxQkFBYSxFQUFFLEVBQUUsQ0FBQztTQUNuSCxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQWtCLEVBQUUsRUFBRTtRQUNuQyxPQUFPLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQy9FLENBQUMsQ0FBQyxDQUFDO0lBRUwsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSTtRQUMxQyxVQUFVLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyw2RUFBNkU7UUFDckcsOERBQThELENBQUMsQ0FBQyxDQUFDO0lBRW5FLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1NBQ3hDLFdBQVcsQ0FBQyxrSEFBa0g7UUFDL0gsNkNBQTZDLENBQUM7U0FDN0MsUUFBUSxDQUFDLGNBQWMsRUFBRSx5QkFBaUIsRUFBRSxFQUFFLENBQUM7U0FDL0MsTUFBTSxDQUFDLDBCQUEwQixFQUFFLHVIQUF1SCxDQUFDO1NBQzNKLE1BQU0sQ0FBQyxDQUFDLElBQWMsRUFBRSxFQUFFO1FBQ3pCLE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFxQixDQUFDO1FBQzlELFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztTQUMvQyxXQUFXLENBQUMsK0ZBQStGO1FBQzVHLHNJQUFzSSxDQUFDO1NBQ3RJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBaUIsRUFBRSxFQUFFO1FBQ2xDLENBQUMsd0RBQWEsVUFBVSxHQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFFLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxPQUEwQjtJQUN0RDs7T0FFRztJQUNILE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7U0FDL0MsV0FBVyxDQUFDLHNFQUFzRTtRQUNuRixrREFBa0QsRUFBRSxFQUFDLE9BQU8sRUFBRSx5QkFBaUIsRUFBQyxDQUFDO1NBQ2hGLE1BQU0sQ0FBQyxhQUFhLEVBQUUsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDO1NBQzlELE1BQU0sQ0FBQyxtQ0FBbUMsRUFBRSx5Q0FBeUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUNsRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQUMsT0FBTyxJQUFJLENBQUM7SUFDMUMsQ0FBQyxFQUFFLEVBQWMsQ0FBQztRQUNsQixnSUFBZ0k7UUFDaEksdUJBQXVCO1NBQ3RCLE1BQU0sQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxDQUFDO1NBQ2pELE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSwwRkFBMEYsRUFBRSxLQUFLLENBQUM7U0FDeEksTUFBTSxDQUFDLDRCQUE0QixFQUFFLHNDQUFzQyxFQUFFLFFBQVEsQ0FBQztTQUN0RixNQUFNLENBQUMsaUNBQWlDLEVBQUUsMEVBQTBFLENBQUM7U0FDckgsTUFBTSxDQUFDLGtEQUFrRCxFQUN4RCxpREFBaUQ7UUFDakQsOERBQThELEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDNUUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUFDLE9BQU8sSUFBSSxDQUFDO0lBQzFDLENBQUMsRUFBRSxFQUFjLENBQUM7U0FDakIsTUFBTSxDQUFDLG9CQUFvQixFQUMxQix5RkFBeUYsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsZUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLG1CQUFtQixFQUFFLENBQUM7U0FDbEssTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzFCLE1BQU0sR0FBRyxHQUFHLHdEQUFhLFdBQVcsR0FBQyxDQUFDO1FBRXRDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQztZQUNaLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTztZQUNwQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7WUFDaEIsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTO1lBQ3hCLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRztZQUNaLEVBQUUsRUFBRSxHQUFHLENBQUMsbUJBQW1CO1lBQzNCLFVBQVUsRUFBRSxHQUFHLENBQUMsb0JBQW9CO1lBQ3BDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYTtZQUNoQyxlQUFlLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDekQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFTCxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7UUFDekIscUZBQXFGO1FBQ3JGLHFHQUFxRztRQUNyRyxzR0FBc0c7UUFDdEcsb0RBQW9EO1FBQ3BELElBQUEsY0FBTSxFQUFDLGFBQWEsQ0FBQyxHQUFHLGtJQUFrSTtRQUMxSixJQUFBLGNBQU0sRUFBQyx5QkFBeUIsQ0FBQyxHQUFHLDJFQUEyRTtRQUMvRyxJQUFBLGNBQU0sRUFBQyw2QkFBNkIsQ0FBQyxHQUFHLHVGQUF1RixDQUFDLENBQUM7SUFFbkksT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztTQUNqQyxXQUFXLENBQUMsa0NBQWtDLEVBQUUsRUFBQyxPQUFPLEVBQUUsc0RBQXNELEVBQUMsQ0FBQztTQUNsSCxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ2hDLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDSCxpQkFBaUI7SUFDbkIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQztTQUMxRCxXQUFXLENBQUMsNENBQTRDLENBQUM7U0FDekQsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFjLEVBQUUsSUFBYyxFQUFFLEVBQUU7UUFDL0MsTUFBTSxDQUFDLHdEQUFhLG1CQUFtQixHQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUMsQ0FBQyxDQUFDO0lBRUwsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxHQUFHLGVBQUssQ0FBQyxLQUFLLENBQUMscUNBQXFDLENBQUM7UUFDckYsV0FBVyxlQUFLLENBQUMsS0FBSyxDQUFDLG1GQUFtRixDQUFDLElBQUk7UUFDL0csMkVBQTJFO1FBQzNFLCtIQUErSCxDQUFDLENBQUM7SUFDakksY0FBYztJQUNkLDBEQUEwRDtJQUMxRCxzREFBc0Q7SUFDdEQsc0VBQXNFO0lBQ3RFLG9DQUFvQztBQUd4QyxDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxPQUEwQixFQUFFLEVBQXFDLEVBQUUsU0FBMkI7SUFDMUgsSUFBSSxFQUFFLElBQUksSUFBSTtRQUNaLE9BQU8sRUFBRSxDQUFDO0lBQ1osSUFBQSw0Q0FBMkIsR0FBRSxDQUFDO0lBQzlCLE1BQU0sVUFBVSxHQUFhLEVBQUUsQ0FBQztJQUNoQyxLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUEsd0NBQWtCLEdBQUUsRUFBRTtRQUNyQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN2QyxJQUFJLEVBQUUsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJO1lBQzlCLFNBQVM7UUFDWCxNQUFNLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxHQUFJLEVBQUUsQ0FBQyxHQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTlELFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpCLElBQUk7WUFDRixTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDakQ7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLHNDQUFzQztZQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLENBQUMsSUFBSSxNQUFPLENBQVcsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUN2RztLQUNGO0lBQ0QsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsR0FBc0I7SUFDakQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDekYsTUFBTSxDQUFDLHFCQUFxQixFQUFFLHNDQUFzQyxDQUFDO1NBQ3JFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxtSEFBbUgsRUFBRSxLQUFLLENBQUM7U0FDcEosTUFBTSxDQUFDLFNBQVMsRUFBRSxvQ0FBb0MsQ0FBQztTQUN2RCxNQUFNLENBQUMsaUJBQWlCLEVBQUUscUNBQXFDLENBQUM7UUFDakUsaUdBQWlHO1FBQ2pHLG1HQUFtRztTQUNsRyxNQUFNLENBQUMsY0FBYyxFQUFFLGlGQUFpRixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3BILENBQUM7QUFFRCxTQUFTLGlCQUFpQjtJQUN4QixNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUEsaUJBQVUsR0FBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzFELElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUN6QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUE0RyxDQUFDO1FBQ3BLLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7WUFDL0QsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdELElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNsQixzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGdCQUFTLEVBQUMsaUVBQWlFLENBQUMsQ0FBQyxDQUFDO1lBQzFGLE9BQU87U0FDUjtRQUNELElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMzQixNQUFNLE9BQU8sR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEQsSUFBSSxPQUFPLElBQUksSUFBSTtnQkFDakIsT0FBTztZQUNULE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckI7UUFDRCxJQUFJLE1BQU0sSUFBSSxDQUFDLGdCQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDbkQsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBQSxnQkFBUyxFQUFDLGlDQUFpQyxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsc0NBQXNDLGVBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFvQjtnQkFDeEosZ0JBQWdCLGVBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLCtDQUErQyxDQUFDLENBQUMsQ0FBQztTQUNqRztLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuL2Nmb250LmQudHNcIiAvPlxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCAqIGFzIHRwIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICcuLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHsgaXNEcmNwU3ltbGluaywgc2V4eUZvbnQsIGdldFJvb3REaXIsIGJveFN0cmluZywgcGxpbmtFbnYgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF9zeW1saW5rcyBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQge2luaXRJbmplY3RvckZvck5vZGVQYWNrYWdlc30gZnJvbSAnLi4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHtDb21tYW5kT3ZlcnJpZGVyLCB3aXRoQ3dkT3B0aW9ufSBmcm9tICcuL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQge2hsRGVzYywgYXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG4vLyBpbXBvcnQge0NsaU9wdGlvbnMgYXMgVHNjb25maWdDbGlPcHRpb25zfSBmcm9tICcuL2NsaS10c2NvbmZpZy1ob29rJztcbmltcG9ydCAqIGFzIF9jbGlXYXRjaCBmcm9tICcuL2NsaS13YXRjaCc7XG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpIGFzIHt2ZXJzaW9uOiBzdHJpbmd9O1xuLy8gY29uc3QgV0lEVEggPSAxMzA7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNsaScpO1xuXG5leHBvcnQgY29uc3QgY2xpUGFja2FnZUFyZ0Rlc2MgPSAnU2luZ2xlIG9yIG11bHRpcGxlIHBhY2thZ2UgbmFtZXMsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkLCcgK1xuJ2lmIHRoZSBzY29wZSBuYW1lICh0aGUgcGFydCBiZXR3ZWVuIFwiQFwiIFwiL1wiKSBhcmUgbGlzdGVkIGNvbmZpZ3VyYXRpb24gcHJvcGVydHkgXCJwYWNrYWdlU2NvcGVzXCInO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tbWFuZHMoc3RhcnRUaW1lOiBudW1iZXIpIHtcbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayc7XG4gIC8vIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9OiB0eXBlb2Ygc3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZScpO1xuICBhd2FpdCBpbXBvcnQoJy4vY2xpLXNsaWNlJyk7XG4gIC8vIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG5cbiAgbGV0IGNsaUV4dGVuc2lvbnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKCdwbGluaycpXG4gIC5kZXNjcmlwdGlvbihjaGFsay5jeWFuKCdBIHBsdWdnYWJsZSBtb25vcmVwbyBhbmQgbXVsdGktcmVwbyBtYW5hZ2VtZW50IHRvb2wnKSlcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhwcm9ncmFtLmhlbHBJbmZvcm1hdGlvbigpKTtcblxuICAgIGlmICh3c1N0YXRlID09IG51bGwpIHtcbiAgICAgIGNvbnN0IHdzRGlycyA9IFsuLi5wa2dNZ3IuZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKV07XG4gICAgICBpZiAod3NEaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coYE1vcmUgY29tbWFuZHMgYXJlIGF2YWlsYWJsZSBpbiB3b3JrdHJlZSBzcGFjZSBkaXJlY3RvcmllczogWyR7d3NEaXJzLm1hcChpdGVtID0+IGNoYWxrLmN5YW4oaXRlbSkpLmpvaW4oJywgJyl9XVxcbmAgK1xuICAgICAgICAgIGBUcnkgY29tbWFuZHM6XFxuJHt3c0RpcnMubWFwKGRpciA9PiAnICBwbGluayAtLXNwYWNlICcgKyBkaXIpLmpvaW4oJ1xcbicpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBcXG52ZXJzaW9uOiAke3BrLnZlcnNpb259ICR7aXNEcmNwU3ltbGluayA/IGNoYWxrLnllbGxvdygnKHN5bWxpbmtlZCknKSA6ICcnfSBgKTtcbiAgICBpZiAoY2xpRXh0ZW5zaW9ucyAmJiBjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtjbGlFeHRlbnNpb25zLmxlbmd0aH0gY29tbWFuZCBsaW5lIGV4dGVuc2lvbmAgK1xuICAgICAgYCR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiAke2NsaUV4dGVuc2lvbnMubWFwKHBrZyA9PiBjaGFsay5ibHVlKHBrZykpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbicsIGNoYWxrLmJnUmVkKCdQbGVhc2UgZGV0ZXJtaW5lIGEgc3ViIGNvbW1hbmQgbGlzdGVkIGFib3ZlJykpO1xuICAgIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBwcm9jZXNzLmV4aXQoMSkpO1xuICB9KTtcbiAgcHJvZ3JhbS5hZGRIZWxwVGV4dCgnYmVmb3JlJywgc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgd2l0aEN3ZE9wdGlvbihwcm9ncmFtKTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbiAgcHJvZ3JhbS5hZGRIZWxwQ29tbWFuZCgnaGVscCBbY29tbWFuZF0nLCAnc2hvdyBoZWxwIGluZm9ybWF0aW9uLCBzYW1lIGFzIFwiLWhcIi4gJyk7XG5cbiAgY29uc3Qgb3ZlcnJpZGVyID0gbmV3IENvbW1hbmRPdmVycmlkZXIocHJvZ3JhbSk7XG4gIGxldCB3c1N0YXRlOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIGNvbnN0IHtnZXRTdGF0ZTogZ2V0UGtnU3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa2dNZ3I7XG4gICAgd3NTdGF0ZSA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKTtcbiAgICBpZiAod3NTdGF0ZSAhPSBudWxsKSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBwcm9ncmFtID0+IHtcbiAgICAgICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuZ3JlZW4oc3RyKTtcbiAgICAgICAgc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbSk7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICAgICAgICBzdWJDb21hbmRzKHByb2dyYW0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHN1YkNvbWFuZHMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHN0ciA9PiBjaGFsay5jeWFuKHN0cik7XG4gICAgY2xpRXh0ZW5zaW9ucyA9IGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW0sIHdzU3RhdGUsIG92ZXJyaWRlcik7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnVmFsdWUgb2YgZW52aXJvbm1lbnQgdmFyYWlibGUgXCJQTElOS19TQUZFXCIgaXMgdHJ1ZSwgc2tpcCBsb2FkaW5nIGV4dGVuc2lvbicpO1xuICB9XG5cbiAgb3ZlcnJpZGVyLmFwcGVuZEdsb2JhbE9wdGlvbnMoZmFsc2UpO1xuICB0cnkge1xuICAgIGF3YWl0IHByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YsIHtmcm9tOiAnbm9kZSd9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIGV4ZWN1dGUgY29tbWFuZCBkdWUgdG86ICcgKyBjaGFsay5yZWRCcmlnaHQoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpLCBlKTtcbiAgICBpZiAoKGUgYXMgRXJyb3IpLnN0YWNrKSB7XG4gICAgICBsb2cuZXJyb3IoKGUgYXMgRXJyb3IpLnN0YWNrKTtcbiAgICB9XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5cbmxldCBza2lwVmVyc2lvbkNoZWNrID0gZmFsc2U7XG5cbmZ1bmN0aW9uIHN1YkNvbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgcHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsICgpID0+IHtcbiAgICBpZiAoc2tpcFZlcnNpb25DaGVjaylcbiAgICAgIHJldHVybjtcbiAgICBza2lwVmVyc2lvbkNoZWNrID0gdHJ1ZTtcbiAgICBpZiAocHJvY2Vzcy5zZW5kID09IG51bGwpIHtcbiAgICAgIC8vIHByb2Nlc3MgaXMgbm90IGEgZm9ya2VkIGNoaWxkIHByb2Nlc3NcbiAgICAgIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG4gICAgfVxuICB9KTtcbiAgLyoqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCcpLmFsaWFzKCdzeW5jJylcbiAgICAuZGVzY3JpcHRpb24oJ0luaXRpYWxpemUgYW5kIHVwZGF0ZSB3b3JrIGRpcmVjdG9yeSwgZ2VuZXJhdGUgYmFzaWMgY29uZmlndXJhdGlvbiBmaWxlcyBmb3IgcHJvamVjdCBhbmQgY29tcG9uZW50IHBhY2thZ2VzLCcgK1xuICAgICAgJyBjYWxjdWxhdGUgaG9pc3RlZCB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcywgYW5kIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gY3VycmVudCBkaXJlY3RvcnkuJyArXG4gICAgICAnIChBbGwgTlBNIGNvbmZpZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2lsbCBhZmZlY3QgZGVwZW5kZW5jeSBpbnN0YWxsYXRpb24sIHNlZSBodHRwczovL2RvY3MubnBtanMuY29tL2NsaS92Ny91c2luZy1ucG0vY29uZmlnI2Vudmlyb25tZW50LXZhcmlhYmxlcyknKVxuICAgIC5hcmd1bWVudCgnW3dvcmstZGlyZWN0b3J5XScsICdBIHJlbGF0aXZlIG9yIGFib3NvbHV0ZSBkaXJlY3RvcnkgcGF0aCwgdXNlIFwiLlwiIHRvIGRldGVybWluZSBjdXJyZW50IGRpcmVjdG9yeSxcXG4gIG9tbWl0dGluZyB0aGlzIGFyZ3VtZW50IG1lYW5pbmc6XFxuJyArXG4gICAgJyAgLSBJZiBjdXJyZW50IGRpcmVjdG9yeSBpcyBhbHJlYWR5IGEgXCJ3b3JrIGRpcmVjdG9yeVwiLCB1cGRhdGUgaXQuXFxuJyArXG4gICAgJyAgLSBJZiBjdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3JrIGRpcmVjdG9yeSAobWF5YmUgYXQgcmVwb1xcJ3Mgcm9vdCBkaXJlY3RvcnkpLCB1cGRhdGUgdGhlIGxhdGVzdCB1cGRhdGVkIHdvcmsnICtcbiAgICAnIGRpcmVjdG9yeS4nKVxuICAgIC5vcHRpb24oJy1mLCAtLWZvcmNlJywgJ0ZvcmNlIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeSwgdGhpcyBpcyBub3Qgc2FtZSBhcyBucG0gaW5zdGFsbCBvcHRpb24gXCItZlwiICcsIGZhbHNlKVxuICAgIC8vIC5vcHRpb24oJy0tbGludC1ob29rLCAtLWxoJywgJ0NyZWF0ZSBhIGdpdCBwdXNoIGhvb2sgZm9yIGNvZGUgbGludCcsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZT86IHN0cmluZykgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1pbml0JykpLmRlZmF1bHQoaW5pdENtZC5vcHRzKCkgLCB3b3Jrc3BhY2UpO1xuICAgIH0pO1xuICBhZGROcG1JbnN0YWxsT3B0aW9uKGluaXRDbWQpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHByb2plY3RcbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgncHJvamVjdCBbYWRkfHJlbW92ZV0gW2Rpci4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignQXNzb2NpYXRlLCBkaXNhc3NvY2lhdGUgb3IgbGlzdCBhc3NvY2lhdGVkIHByb2plY3QgZm9sZGVycywgUGxpbmsgd2lsbCcgK1xuICAgICAgJyBzY2FuIHNvdXJjZSBjb2RlIGRpcmVjdG9yaWVzIGZyb20gYXNzb2NpYXRlZCBwcm9qZWN0cycsIHtcbiAgICAgICAgJ2FkZHxyZW1vdmUnOiAnU3BlY2lmeSB3aGV0aGVyIEFzc29jaWF0ZSB0byBhIHByb2plY3Qgb3IgRGlzYXNzb2NpYXRlIGZyb20gYSBwcm9qZWN0JyxcbiAgICAgICAgZGlyOiAnU3BlY2lmeSB0YXJnZXQgcHJvamVjdCByZXBvIGRpcmVjdG9yeSAoYWJzb2x1dGUgcGF0aCBvciByZWxhdGl2ZSBwYXRoIHRvIGN1cnJlbnQgZGlyZWN0b3J5KScgK1xuICAgICAgICAgICcsIHNwZWNpZnkgbXVsdGlwbGUgcHJvamVjdCBieSBzZXBlcmF0aW5nIHRoZW0gd2l0aCBzcGFjZSBjaGFyYWN0ZXInXG4gICAgICB9KVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdGlvbjogJ2FkZCcgfCAncmVtb3ZlJyB8IHVuZGVmaW5lZCwgcHJvamVjdERpcjogc3RyaW5nW10pID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktcHJvamVjdCcpKS5kZWZhdWx0KHtpc1NyY0RpcjogZmFsc2V9LCBhY3Rpb24sIHByb2plY3REaXIpO1xuICAgIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnc3JjIFthZGR8cmVtb3ZlXSBbZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IHNvdXJjZSBkaXJlY3RvcmllcywgUGxpbmsgd2lsbCcgK1xuICAgICAgJyBzY2FuIHNvdXJjZSBjb2RlIGRpcmVjdG9yaWVzIGZvciBwYWNrYWdlcycsIHtcbiAgICAgICAgJ2FkZHxyZW1vdmUnOiAnU3BlY2lmeSB3aGV0aGVyIGFzc29jaWF0ZSB0byBhIGRpcmVjdG9yeSBvciBkaXNhc3NvY2lhdGUgZnJvbSBhIGRpcmVjdG9yeScsXG4gICAgICAgIGRpcjogJ3NwZWNpZnkgbXVsdGlwbGUgZGlyZWN0b3JpZXMgYnkgc2VwZXJhdGluZyB0aGVtIHdpdGggc3BhY2UgY2hhcmFjdGVyJ1xuICAgICAgfSlcbiAgICAgIC5hY3Rpb24oYXN5bmMgKGFjdGlvbjogJ2FkZCcgfCAncmVtb3ZlJyB8IHVuZGVmaW5lZCwgZGlyczogc3RyaW5nW10pID0+IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktcHJvamVjdCcpKS5kZWZhdWx0KHtpc1NyY0RpcjogdHJ1ZX0sIGFjdGlvbiwgZGlycyk7XG4gICAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsaW50XG4gICAqL1xuICAvLyBjb25zdCBsaW50Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdsaW50IFtwYWNrYWdlLi4uXScpXG4gIC8vICAgLmRlc2NyaXB0aW9uKCdzb3VyY2UgY29kZSBzdHlsZSBjaGVjaycsIHtcbiAgLy8gICAgIHBhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjXG4gIC8vICAgfSlcbiAgLy8gICAub3B0aW9uKCctLXBqIDxwcm9qZWN0MSxwcm9qZWN0Mi4uLj4nLCAnbGludCBvbmx5IFRTIGNvZGUgZnJvbSBzcGVjaWZpYyBwcm9qZWN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gIC8vICAgLm9wdGlvbignLS1maXgnLCAnUnVuIGVzbGludC90c2xpbnQgZml4LCB0aGlzIGNvdWxkIGNhdXNlIHlvdXIgc291cmNlIGNvZGUgYmVpbmcgY2hhbmdlZCB1bmV4cGVjdGVkbHknLCBmYWxzZSlcbiAgLy8gICAuYWN0aW9uKGFzeW5jIHBhY2thZ2VzID0+IHtcbiAgLy8gICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxpbnQnKSkuZGVmYXVsdChwYWNrYWdlcywgbGludENtZC5vcHRzKCkgYXMgYW55KTtcbiAgLy8gICB9KTtcblxuICAvLyBsaW50Q21kLnVzYWdlKGxpbnRDbWQudXNhZ2UoKSArXG4gIC8vICAgaGwoJ1xcbmRyY3AgbGludCAtLXBqIDxwcm9qZWN0LWRpci4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeVxcbicgK1xuICAvLyAgIGhsKCdcXG5kcmNwIGxpbnQgPGNvbXBvbmVudC1wYWNrYWdlLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIGNvbXBvbmVudCBwYWNrYWdlcycpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGNsZWFuXG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ2NzJykuYWxpYXMoJ2NsZWFyLXN5bWxpbmtzJylcbiAgICAuZGVzY3JpcHRpb24oJ0NsZWFyIHN5bWxpbmtzIGZyb20gbm9kZV9tb2R1bGVzJylcbiAgICAvLyAub3B0aW9uKCctLW9ubHktc3ltbGluaycsICdDbGVhbiBvbmx5IHN5bWxpbmtzLCBub3QgZGlzdCBkaXJlY3RvcnknLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHNjYW5Ob2RlTW9kdWxlcyA9IChyZXF1aXJlKCcuLi91dGlscy9zeW1saW5rcycpIGFzIHR5cGVvZiBfc3ltbGlua3MpLmRlZmF1bHQ7XG4gICAgICBjb25zdCBlZGl0b3IgPSBhd2FpdCBpbXBvcnQoJy4uL2VkaXRvci1oZWxwZXInKTtcbiAgICAgIGVkaXRvci5kaXNwYXRjaGVyLmNsZWFyU3ltbGlua3MoKTtcbiAgICAgIGF3YWl0IGVkaXRvci5nZXRBY3Rpb24kKCdjbGVhclN5bWxpbmtzRG9uZScpLnBpcGUob3AudGFrZSgxKSkudG9Qcm9taXNlKCk7XG4gICAgICBhd2FpdCBzY2FuTm9kZU1vZHVsZXModW5kZWZpbmVkLCAnYWxsJyk7XG4gICAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgdXBncmFkZVxuICAgKi9cbiAgY29uc3QgdXBncmFkZUNtZCA9IHByb2dyYW0uY29tbWFuZCgndXBncmFkZScpXG4gICAgLmFsaWFzKCdpbnN0YWxsJylcbiAgICAuZGVzY3JpcHRpb24oJ1JlaW5zdGFsbCBsb2NhbCBQbGluayBhbG9uZyB3aXRoIG90aGVyIGRlcGVuZGVuY2llcy4nICtcbiAgICAgICcgVW5saWtlIFwibnBtIGluc3RhbGxcIiB3aGljaCBkb2VzIG5vdCB3b3JrIHdpdGggbm9kZV9tb2R1bGVzIHRoYXQgbWlnaHQgY29udGFpbiBzeW1saW5rcy4nICtcbiAgICAgICcgKEFsbCBOUE0gY29uZmlnIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aWxsIGFmZmVjdCBkZXBlbmRlbmN5IGluc3RhbGxhdGlvbiwgc2VlIGh0dHBzOi8vZG9jcy5ucG1qcy5jb20vY2xpL3Y3L3VzaW5nLW5wbS9jb25maWcjZW52aXJvbm1lbnQtdmFyaWFibGVzKScpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBza2lwVmVyc2lvbkNoZWNrID0gdHJ1ZTtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxpbmstcGxpbmsnKSkucmVpbnN0YWxsV2l0aExpbmtlZFBsaW5rKHVwZ3JhZGVDbWQub3B0cygpICk7XG4gICAgfSk7XG4gIGFkZE5wbUluc3RhbGxPcHRpb24odXBncmFkZUNtZCk7XG4gIC8vIHByb2dyYW0uY29tbWFuZCgnZG9ja2VyaXplIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbihjaGFsay5ncmF5KCdbVEJJXSBHZW5lcmF0ZSBEb2NrZXJmaWxlIGZvciBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5LCBhbmQgZ2VuZXJhdGUgZG9ja2VyIGltYWdlJykpO1xuXG4gIC8vIHByb2dyYW0uY29tbWFuZCgncGtnIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbihjaGFsay5ncmF5KCdbVEJJXSBVc2UgUGtnIChodHRwczovL2dpdGh1Yi5jb20vdmVyY2VsL3BrZykgdG8gcGFja2FnZSBOb2RlLmpzIHByb2plY3QgaW50byBhbiBleGVjdXRhYmxlICcpKTtcblxuICAvKipcbiAgICogY29tbWFuZCBsc1xuICAgKi9cbiAgY29uc3QgbGlzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbHMnKS5hbGlhcygnbGlzdCcpXG4gICAgLm9wdGlvbignLWosIC0tanNvbicsICdsaXN0IGxpbmtlZCBkZXBlbmRlbmNpZXMgaW4gZm9ybSBvZiBKU09OJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1ob2lzdCcsICdsaXN0IGhvaXN0ZWQgdHJhbnNpdGl2ZSBEZXBlbmRlbmN5IGluZm9ybWF0aW9uJywgZmFsc2UpXG4gICAgLmRlc2NyaXB0aW9uKCdJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBtYW55IHBhY2thZ2VzIHdpbGwgYWN0dWFsbHkgcnVuLCB0aGlzIGNvbW1hbmQgcHJpbnRzIG91dCBhIGxpc3QgYW5kIHRoZSBwcmlvcml0aWVzLCBpbmNsdWRpbmcgaW5zdGFsbGVkIHBhY2thZ2VzJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmRlZmF1bHQobGlzdENtZC5vcHRzKCkgKTtcbiAgICB9KTtcblxuICBjb25zdCBhZGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FkZCA8ZGVwZW5kZW5jeS4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignQWRkIGRlcGVuZGVuY3kgdG8gcGFja2FnZS5qc29uIGZpbGUsIHdpdGggb3B0aW9uIFwiLS1kZXZcIiB0byBhZGQgYXMgXCJkZXZEZXBlbmRlbmNpZXNcIiwgJyArXG4gICAgICAnd2l0aG91dCBvcHRpb24gXCItLXRvXCIgdGhpcyBjb21tYW5kIGFkZHMgZGVwZW5kZW5jeSB0byBjdXJyZW50IHdvcmt0cmVlIHNwYWNlXFwncyBwYWNrYWdlLmpzb24gZmlsZScsXG4gICAgICB7XG4gICAgICAgIGRlcGVuZGVuY3k6ICdkZXBlbmRlbmN5IHBhY2thZ2UgbmFtZSBpbiBmb3JtIG9mIFwiPGEgbGlua2VkIHBhY2thZ2UgbmFtZSB3aXRob3V0IHNjb3BlIHBhcnQ+XCIsIFwiPHBhY2thZ2UgbmFtZT5APHZlcnNpb24+XCIsICdcbiAgICAgIH0pXG4gICAgLm9wdGlvbignLS10byA8cGtnIG5hbWUgfCB3b3JrdHJlZSBkaXIgfCBwa2cgZGlyPicsICdhZGQgZGVwZW5kZW5jeSB0byB0aGUgcGFja2FnZS5qc29uIG9mIHNwZWNpZmljIGxpbmtlZCBzb3VyY2UgcGFja2FnZSBieSBuYW1lIG9yIGRpcmVjdG9yeSwgb3IgYSB3b3JrdHJlZSBzcGFjZSBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktYWRkLXBhY2thZ2UnKSkuYWRkRGVwZW5kZW5jeVRvKHBhY2thZ2VzLCBhZGRDbWQub3B0cygpLnRvLCBhZGRDbWQub3B0cygpLmRldik7XG4gICAgfSk7XG5cbiAgY29uc3QgdHNjb25maWdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzY29uZmlnJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgdHNjb25maWcuanNvbiwganNjb25maWcuanNvbiBmaWxlcyB3aGljaCB3aWxsIGJlIHVwZGF0ZWQgYXV0b21hdGljYWxseSBieSBQbGluaywgKGEgbW9ub3JlcG8gbWVhbnMgdGhlcmUgYXJlIG5vZGUgcGFja2FnZXMgd2hpY2ggYXJlIHN5bWxpbmtlZCBmcm9tIHJlYWwgc291cmNlIGNvZGUgZGlyZWN0b3J5JyArXG4gICAgICAnLCBpZiB5b3UgaGF2ZSBjdXN0b21pemVkIHRzY29uZmlnLmpzb24gZmlsZSwgdGhpcyBjb21tYW5kIGhlbHBzIHRvIHVwZGF0ZSBcImNvbXBpbGVyT3B0aW9ucy5wYXRoc1wiIHByb3BlcnRpZXMpJylcbiAgICAub3B0aW9uKCctLWhvb2sgPGZpbGU+JywgJ2FkZCB0c2NvbmZpZy9qc2NvbmZpZyBmaWxlIHRvIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS11bmhvb2sgPGZpbGU+JywgJ3JlbW92ZSB0c2NvbmZpZy9qc2NvbmZpZyBmaWxlIGZyb20gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLWNsZWFyLC0tdW5ob29rLWFsbCcsICdyZW1vdmUgYWxsIHRzY29uZmlnIGZpbGVzIGZyb20gZnJvbSBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktdHNjb25maWctaG9vaycpKS5kb1RzY29uZmlnKHRzY29uZmlnQ21kLm9wdHMoKSApO1xuICAgIH0pO1xuXG4gIC8qKlxuICAgKiBCdW1wIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IGJ1bXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2J1bXAgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ2J1bXAgcGFja2FnZS5qc29uIHZlcnNpb24gbnVtYmVyIGZvciBzcGVjaWZpYyBwYWNrYWdlLCBzYW1lIGFzIFwibnBtIHZlcnNpb25cIiBkb2VzJyxcbiAgICAgIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdvbmx5IGJ1bXAgY29tcG9uZW50IHBhY2thZ2VzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTtcbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNyZS12ZXJzaW9uIDx2YWx1ZT4nLFxuICAgICAgJ3ZlcnNpb24gaW5jcmVtZW50LCB2YWxpZCB2YWx1ZXMgYXJlOiBtYWpvciwgbWlub3IsIHBhdGNoLCBwcmVyZWxlYXNlJywgJ3BhdGNoJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWJ1bXAnKSkuZGVmYXVsdCh7Li4uYnVtcENtZC5vcHRzKCkgLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhidW1wQ21kKTtcbiAgLy8gYnVtcENtZC51c2FnZShidW1wQ21kLnVzYWdlKCkgKyAnXFxuJyArIGhsKCdwbGluayBidW1wIDxwYWNrYWdlPiAuLi4nKSArICcgdG8gcmVjdXJzaXZlbHkgYnVtcCBwYWNrYWdlLmpzb24gZnJvbSBtdWx0aXBsZSBkaXJlY3Rvcmllc1xcbicgK1xuICAvLyAgIGhsKCdwbGluayBidW1wIDxkaXI+IC1pIG1pbm9yJykgKyAnIHRvIGJ1bXAgbWlub3IgdmVyc2lvbiBudW1iZXIsIGRlZmF1bHQgaXMgcGF0Y2ggbnVtYmVyJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcGFja0NtZCA9IHByb2dyYW0uY29tbWFuZCgncGFjayBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignbnBtIHBhY2sgcGFrYWdlIGludG8gdGFyYmFsbCBmaWxlcyBhbmQgY2hhbmdlIHZlcnNpb24gdmFsdWUgZnJvbSByZWxhdGVkIHBhY2thZ2UuanNvbicsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLS1kaXIgPHBhY2thZ2UgZGlyZWN0b3J5PicsICdwYWNrIHBhY2thZ2VzIGJ5IHNwZWNpZnlpbmcgZGlyZWN0b3JpZXMnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncGFjayBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyPicsXG4gICAgICAncHJvamVjdCBkaXJlY3RvcmllcyB0byBiZSBsb29rZWQgdXAgZm9yIGFsbCBwYWNrYWdlcyB3aGljaCBuZWVkIHRvIGJlIHBhY2tlZCB0byB0YXJiYWxsIGZpbGVzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdGFyLWRpciA8ZGlyPicsICdkaXJlY3RvcnkgdG8gc2F2ZSB0YXIgZmlsZXMnLCBQYXRoLmpvaW4oZ2V0Um9vdERpcigpLCAndGFyYmFsbHMnKSlcbiAgICAub3B0aW9uKCctLWpmLCAtLWpzb24tZmlsZSA8cGtnLWpzb24tZmlsZT4nLCAndGhlIHBhY2thZ2UuanNvbiBmaWxlIGluIHdoaWNoIFwiZGV2RGVwZW5kZW5jaWVzXCIsIFwiZGVwZW5kZW5jaWVzXCIgc2hvdWxkIHRvIGJlIGNoYW5nZWQgYWNjb3JkaW5nIHRvIHBhY2tlZCBmaWxlLCAnICtcbiAgICAgICdieSBkZWZhdWx0IHBhY2thZ2UuanNvbiBmaWxlcyBpbiBhbGwgd29yayBzcGFjZXMgd2lsbCBiZSBjaGVja2VkIGFuZCBjaGFuZ2VkJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucGFjayh7Li4ucGFja0NtZC5vcHRzKCkgLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhwYWNrQ21kKTtcbiAgcGFja0NtZC51c2FnZShwYWNrQ21kLnVzYWdlKCkgKyAnXFxuQnkgZGVmYXVsdCwgcnVuIFwibnBtIHBhY2tcIiBmb3IgZWFjaCBsaW5rZWQgcGFja2FnZSB3aGljaCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcHVibGlzaENtZCA9IHByb2dyYW0uY29tbWFuZCgncHVibGlzaCcpXG4gICAgLmRlc2NyaXB0aW9uKCdydW4gbnBtIHB1Ymxpc2gnKVxuICAgIC5hcmd1bWVudCgnW3BhY2thZ2UuLi5dJywgY2xpUGFja2FnZUFyZ0Rlc2MpXG4gICAgLm9wdGlvbignLS1kaXIgPHBhY2thZ2UgZGlyZWN0b3J5PicsICdwdWJsaXNoIHBhY2thZ2VzIGJ5IHNwZWNpZnlpbmcgZGlyZWN0b3JpZXMnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JyxcbiAgICAncHJvamVjdCBkaXJlY3RvcmllcyB0byBiZSBsb29rZWQgdXAgZm9yIGFsbCBwYWNrYWdlcyB3aGljaCBuZWVkIHRvIGJlIHBhY2tlZCB0byB0YXJiYWxsIGZpbGVzJyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLm9wdGlvbignLXcsLS13b3Jrc3BhY2UgPHdvcmtzcGFjZS1kaXI+JywgJ3B1Ymxpc2ggcGFja2FnZXMgd2hpY2ggYXJlIGxpbmtlZCBhcyBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1wdWJsaWMnLCAnc2FtZSBhcyBcIm5wbSBwdWJsaXNoXCIgY29tbWFuZCBvcHRpb24gXCItLWFjY2VzcyBwdWJsaWNcIicsIHRydWUpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnB1Ymxpc2goey4uLnB1Ymxpc2hDbWQub3B0cygpICwgcGFja2FnZXN9KTtcbiAgICB9KTtcblxuXG4gIGNvbnN0IGFuYWx5c2lzQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdhbmFseXplJylcbiAgICAuYWxpYXMoJ2FuYWx5c2UnKVxuICAgIC5hcmd1bWVudCgnW3BhY2thZ2UuLi5dJywgJ3RoZSBuYW1lIG9mIHRhcmdldCBzb3VyY2UgcGFja2FnZSwgdGhlIHBhY2thZ2UgbXVzdCBiZSBQbGluayBjb21wbGlhbnQgcGFja2FnZSwgdGhpcyBjb21tYW5kIHdpbGwgb25seSAnICtcbiAgICAgICdzY2FuIHNwZWNpYWwgXCJwbGluay50c2NcIiBzb3VyY2UgY29kZSBkaXJlY3RvcnkgbGlrZSBcInRzL1wiIGFuZCBcImlzb20vXCIgb2YgdGFyZ2V0IHBhY2thZ2UnKVxuICAgIC5kZXNjcmlwdGlvbignVXNlIFR5cGVzY3JpcHQgY29tcGlsZXIgdG8gcGFyc2Ugc291cmNlIGNvZGUsIGxpc3QgZGVwZW5kZW5jZXMgYnkgREZTIGFsZ2FyaXRobSwgcmVzdWx0IGluZm9ybWF0aW9uIGluY2x1ZGVzJyArXG4gICAgICAnOiBjeWNsaWMgZGVwZW5kZWNpZXMsIHVucmVzb2x2YWJsZSBkZXBlbmRlbmNpZXMsIGV4dGVybmFsIGRlcGVuZGVuY2llcywgZGVwZW5kZW5jaWVzIGFyZSBub3QgdW5kZXIgdGFyZ2V0IGRpcmVjdG9yeS4nKVxuICAgIC5vcHRpb24oJy14IDxyZWdleHA+JywgJ0luZ29yZSBcIm1vZHVsZSBuYW1lXCIgdGhhdCBtYXRjaGVzIHNwZWNpZmljIFJlZ3VsYXIgRXhwZXJzc2lvbicsICdcXFxcLihsZXNzfHNjc3N8Y3NzKSQnKVxuICAgIC5vcHRpb24oJy1kLCAtLWRpciA8ZGlyZWN0b3J5PicsXG4gICAgICAnKG11bHRpcGxlKSBkZXRlcm1pbmUgdGFyZ2V0IGRpcmVjdG9yeSwgc2NhbiBKUy9KU1gvVFMvVFNYIGZpbGVzIHVuZGVyIHRhcmdldCBkaXJlY3RvcnknLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctZiwgLS1maWxlIDxmaWxlPicsXG4gICAgICAnKG11bHRpcGxlKSBkZXRlcm1pbmUgdGFyZ2V0IFRTL0pTKFgpIGZpbGVzIChtdWx0aXBsZSBmaWxlIHdpdGggbW9yZSBvcHRpb25zIFwiLWYgPGZpbGU+IC1mIDxnbG9iPlwiKScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy1qJywgJ1Nob3cgcmVzdWx0IGluIEpTT04nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXRzY29uZmlnIDxmaWxlPicsICdVc2UgXCJjb21waWxlck9wdGlvbnMucGF0aHNcIiBwcm9wZXJ0eSB0byByZXNvbHZlIHRzL2pzIGZpbGUgbW9kdWxlJylcbiAgICAub3B0aW9uKCctLWFsaWFzIDxhbGlhcy1leHByZXNzPicsICdtdWx0aXBsZSBKU09OIGV4cHJlc3MsIGUuZy4gLS1hbGlhcyBcXCdcIl5ALyguKykkXCIsXCJzcmMvJDFcIlxcJycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4vY2xpLWFuYWx5emUnKSkuZGVmYXVsdChwYWNrYWdlcywgYW5hbHlzaXNDbWQub3B0cygpKTtcbiAgICB9KTtcblxuICBhbmFseXNpc0NtZC51c2FnZShhbmFseXNpc0NtZC51c2FnZSgpICsgJ1xcbicgK1xuICAgICdlLmcuXFxuICAnICsgY2hhbGsuYmx1ZSgncGxpbmsgYW5hbHl6ZSAtZiBcInBhY2thZ2VzL2Zvb2JhcjEvKiovKlwiIC1mIHBhY2thZ2VzL2Zvb2JhcjIvdHMvbWFpbi50c1xcbiAgJyArXG4gICAgJ3BsaW5rIGFuYWx5emUgLWQgcGFja2FnZXMvZm9vYmFyMS9zcmMgLWQgcGFja2FnZXMvZm9vYmFyMi90cycpKTtcblxuICBjb25zdCB3YXRjaENtZCA9IHByb2dyYW0uY29tbWFuZCgnd2F0Y2gnKVxuICAuZGVzY3JpcHRpb24oJ1dhdGNoIHBhY2thZ2Ugc291cmNlIGNvZGUgZmlsZSBjaGFuZ2VzIChmaWxlcyByZWZlcmVuY2VkIGluIC5ucG1pZ25vcmUgd2lsbCBiZSBpZ25vcmVkKSBhbmQgdXBkYXRlIFBsaW5rIHN0YXRlLCAnICtcbiAgJ2F1dG9tYXRpY2FsbHkgaW5zdGFsbCB0cmFuc2l0aXZlIGRlcGVuZGVuY3knKVxuICAuYXJndW1lbnQoJ1twYWNrYWdlLi4uXScsIGNsaVBhY2thZ2VBcmdEZXNjLCBbXSlcbiAgLm9wdGlvbignLS1jcCwgLS1jb3B5IDxkaXJlY3Rvcnk+JywgJ2NvcHkgcGFja2FnZSBmaWxlcyB0byBzcGVjaWZpYyBkaXJlY3RvcnksIG1pbWljIGJlaGF2aW9yIG9mIFwibnBtIGluc3RhbGwgPHBrZz5cIiwgYnV0IHRoaXMgd29uXFwndCBpbnN0YWxsIGRlcGVuZGVuY2llcycpXG4gIC5hY3Rpb24oKHBrZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgY29uc3Qge2NsaVdhdGNofSA9IHJlcXVpcmUoJy4vY2xpLXdhdGNoJykgYXMgdHlwZW9mIF9jbGlXYXRjaDtcbiAgICBjbGlXYXRjaChwa2dzLCB3YXRjaENtZC5vcHRzKCkpO1xuICB9KTtcblxuICBjb25zdCB1cGRhdGVEaXJDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3VwZGF0ZS1kaXInKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHRoaXMgY29tbWFuZCB0byBzeW5jIGludGVybmFsIHN0YXRlIHdoZW4gd2hvbGUgd29ya3NwYWNlIGRpcmVjdG9yeSBpcyByZW5hbWVkIG9yIG1vdmVkLlxcbicgK1xuICAgICdCZWNhdXNlIHdlIHN0b3JlIGFic29sdXRlIHBhdGggaW5mbyBvZiBlYWNoIHBhY2thZ2UgaW4gaW50ZXJuYWwgc3RhdGUsIGFuZCBpdCB3aWxsIGJlY29tZSBpbnZhbGlkIGFmdGVyIHlvdSByZW5hbWUgb3IgbW92ZSBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZTogc3RyaW5nKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5jaGVja0Rpcih1cGRhdGVEaXJDbWQub3B0cygpICk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHNwYWNlT25seVN1YkNvbW1hbmRzKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIGNvbXBpbGUgc291cmNlIGNvZGUgZm9yIHRhcmdldCBwYWNrYWdlcywgJyArXG4gICAgJ3doaWNoIGhhdmUgYmVlbiBsaW5rZWQgdG8gY3VycmVudCB3b3JrIGRpcmVjdG9yeScsIHtwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gICAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnVHlwZXNjcmlwdCBjb21waWxlciB3YXRjaCBtb2RlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLy8gLm9wdGlvbignLS13cywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAnb25seSBpbmNsdWRlIHRob3NlIGxpbmtlZCBwYWNrYWdlcyB3aGljaCBhcmUgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAvLyAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tdHN4LC0tanN4JywgJ2luY2x1ZGVzIFRTWCBmaWxlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tc291cmNlLW1hcCA8aW5saW5lfGZpbGU+JywgJ1NvdXJjZSBtYXAgc3R5bGU6IFwiaW5saW5lXCIgb3IgXCJmaWxlXCInLCAnaW5saW5lJylcbiAgICAub3B0aW9uKCctLW1lcmdlLC0tbWVyZ2UtdHNjb25maWcgPGZpbGU+JywgJ01lcmdlIGNvbXBpbGVyT3B0aW9ucyBcImJhc2VVcmxcIiBhbmQgXCJwYXRoc1wiIGZyb20gc3BlY2lmaWVkIHRzY29uZmlnIGZpbGUnKVxuICAgIC5vcHRpb24oJy0tY29wYXRoLCAtLWNvbXBpbGVyLW9wdGlvbnMtcGF0aHMgPHBhdGhNYXBKc29uPicsXG4gICAgICAnQWRkIG1vcmUgXCJwYXRoc1wiIHByb3BlcnR5IHRvIGNvbXBpbGVyIG9wdGlvbnMuICcgK1xuICAgICAgJyhlLmcuIC0tY29wYXRoIFxcJ3tcIkAvKlwiOltcIi9Vc2Vycy93b3JrZXIvb2NlYW4tdWkvc3JjLypcIl19XFwnKScsICh2LCBwcmV2KSA9PiB7XG4gICAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgfSwgW10gYXMgc3RyaW5nW10pXG4gICAgLm9wdGlvbignLS1jbyA8SlNPTi1zdHJpbmc+JyxcbiAgICAgIGBQYXJ0aWFsIGNvbXBpbGVyIG9wdGlvbnMgdG8gYmUgbWVyZ2VkIChleGNlcHQgXCJiYXNlVXJsXCIpLCBcInBhdGhzXCIgbXVzdCBiZSByZWxhdGl2ZSB0byAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcGxpbmtFbnYud29ya0RpcikgfHwgJ2N1cnJlbnQgZGlyZWN0b3J5J31gKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgY29uc3Qgb3B0ID0gdHNjQ21kLm9wdHMoKTtcbiAgICAgIGNvbnN0IHRzYyA9IGF3YWl0IGltcG9ydCgnLi4vdHMtY21kJyk7XG5cbiAgICAgIGF3YWl0IHRzYy50c2Moe1xuICAgICAgICBwYWNrYWdlOiBwYWNrYWdlcyxcbiAgICAgICAgcHJvamVjdDogb3B0LnByb2plY3QsXG4gICAgICAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgICAgIHNvdXJjZU1hcDogb3B0LnNvdXJjZU1hcCxcbiAgICAgICAganN4OiBvcHQuanN4LFxuICAgICAgICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHksXG4gICAgICAgIHBhdGhzSnNvbnM6IG9wdC5jb21waWxlck9wdGlvbnNQYXRocyxcbiAgICAgICAgbWVyZ2VUc2NvbmZpZzogb3B0Lm1lcmdlVHNjb25maWcsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uczogb3B0LmNvID8gSlNPTi5wYXJzZShvcHQuY28pIDogdW5kZWZpbmVkXG4gICAgICB9KTtcbiAgICB9KTtcblxuICB0c2NDbWQudXNhZ2UodHNjQ21kLnVzYWdlKCkgK1xuICAgICdcXG5JdCBjb21waWxlcyBcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi90cy8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2Rpc3RcIixcXG4nICtcbiAgICAnICBvclxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb20vKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tXCJcXG4gZm9yIGFsbCBAd2ZoIHBhY2thZ2VzLlxcbicgK1xuICAgICdJIHN1Z2dlc3QgdG8gcHV0IE5vZGUuanMgc2lkZSBUUyBjb2RlIGluIGRpcmVjdG9yeSBgdHNgLCBhbmQgaXNvbW9ycGhpYyBUUyBjb2RlIChtZWFuaW5nIGl0IHJ1bnMgaW4gJyArXG4gICAgJ2JvdGggTm9kZS5qcyBhbmQgQnJvd3NlcikgaW4gZGlyZWN0b3J5IGBpc29tYC5cXG5cXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzY1xcbicpICsgJyBDb21waWxlIGxpbmtlZCBwYWNrYWdlcyB0aGF0IGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UgKHlvdSBzaGFsbCBydW4gdGhpcyBjb21tYW5kIG9ubHkgaW4gYSB3b3Jrc3BhY2UgZGlyZWN0b3J5KVxcbicgK1xuICAgIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBwYWNrYWdlcyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyBbcGFja2FnZS4uLl0gLXdcXG4nKSArICcgV2F0Y2ggcGFja2FnZXMgY2hhbmdlIGFuZCBjb21waWxlIHdoZW4gbmV3IHR5cGVzY3JpcHQgZmlsZSBpcyBjaGFuZ2VkIG9yIGNyZWF0ZWRcXG5cXG4nKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ3NldHRpbmcgW3BhY2thZ2VdJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgcGFja2FnZXMgc2V0dGluZyBhbmQgdmFsdWVzJywge3BhY2thZ2U6ICdwYWNrYWdlIG5hbWUsIG9ubHkgbGlzdCBzZXR0aW5nIGZvciBzcGVjaWZpYyBwYWNrYWdlJ30pXG4gICAgLmFjdGlvbihhc3luYyAocGtnTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1zZXR0aW5nJykpLmRlZmF1bHQocGtnTmFtZSk7XG4gICAgfSk7XG4gICAgLyoqIGNvbW1hbmQgcnVuKi9cbiAgY29uc3QgcnVuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHNwZWNpZmljIG1vZHVsZVxcJ3MgZXhwb3J0ZWQgZnVuY3Rpb25cXG4nKVxuICAgIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gICAgfSk7XG5cbiAgcnVuQ21kLnVzYWdlKHJ1bkNtZC51c2FnZSgpICsgJ1xcbicgKyBjaGFsay5ncmVlbigncGxpbmsgcnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dXFxuJykgK1xuICAgIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gLi4vcGFja2FnZXMvZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlLmpzI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICAgJzx0YXJnZXQ+IC0gSlMgb3IgVFMgZmlsZSBtb2R1bGUgcGF0aCB3aGljaCBjYW4gYmUgcmVzb2x2ZWQgYnkgTm9kZS5qcyAodHMtbm9kZSkgZm9sbG93ZWQgYnkgXCIjXCIgYW5kIGV4cG9ydGVkIGZ1bmN0aW9uIG5hbWUsXFxuJyk7XG4gICAgLy8gJ2UuZy4gXFxuJyArXG4gICAgLy8gY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAgIC8vICcsIGZ1bmN0aW9uIGNhbiBiZSBhc3luYyB3aGljaCByZXR1cm5zIFByb21pc2VcXG4nICtcbiAgICAvLyBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICAgLy8gJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG5cbn1cblxuZnVuY3Rpb24gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQsIHdzOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQsIG92ZXJyaWRlcjogQ29tbWFuZE92ZXJyaWRlcik6IHN0cmluZ1tdIHtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIFtdO1xuICBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgYXZhaWxhYmxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IGRyID0gcGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rO1xuICAgIGlmIChkciA9PSBudWxsIHx8IGRyLmNsaSA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgY29uc3QgW3BrZ0ZpbGVQYXRoLCBmdW5jTmFtZV0gPSAoZHIuY2xpIGFzIHN0cmluZykuc3BsaXQoJyMnKTtcblxuICAgIGF2YWlsYWJsZXMucHVzaChway5uYW1lKTtcblxuICAgIHRyeSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShwaywgcGtnRmlsZVBhdGgsIGZ1bmNOYW1lKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7KGUgYXMgRXJyb3IpLm1lc3NhZ2V9XCJgLCBlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGF2YWlsYWJsZXM7XG59XG5cbmZ1bmN0aW9uIGFkZE5wbUluc3RhbGxPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLXlhcm4sIC0tdXNlLXlhcm4nLCAnVXNlIFlhcm4gaW5zdGVhZCBvZiBOUE0gdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1jYWNoZSA8bnBtLWNhY2hlPicsICdzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi0tY2FjaGVcIicpXG4gIC5vcHRpb24oJy0tY2ksIC0tdXNlLWNpJywgJ1VzZSBcIm5wbSBjaVwiIGluc3RlYWQgb2YgXCJucG0gaW5zdGFsbFwiIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzOyB3aGVuIFwiLS11c2VZYXJuXCIgaXMgb24sIGFkZCBhcmd1bWVudCBcIi0taW1tdXRhYmxlXCInLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcnVuZScsICdSdW4gXCJucG0gcHJ1bmVcIiBhZnRlciBpbnN0YWxsYXRpb24nKVxuICAub3B0aW9uKCctLWRkcCwgLS1kZWR1cGUnLCAnUnVuIFwibnBtIGRlZHVwZVwiIGFmdGVyIGluc3RhbGxhdGlvbicpXG4gIC8vIC5vcHRpb24oJy0tb2ZmbGluZScsICdzYW1lIGFzIG5wbSBvcHRpb24gXCItLW9mZmxpbmVcIiBkdXJpbmcgZXhlY3V0aW5nIG5wbSBpbnN0YWxsL2NpICcsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrUGxpbmtWZXJzaW9uKCkge1xuICBjb25zdCBwa2pzb24gPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAncGFja2FnZS5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBranNvbikpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtqc29uLCAndXRmOCcpKSBhcyB7ZGVwZW5kZW5jaWVzPzoge1twOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWR9OyBkZXZEZXBlbmRlbmNpZXM/OiB7W3A6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH19O1xuICAgIGxldCBkZXBWZXIgPSBqc29uLmRlcGVuZGVuY2llcyAmJiBqc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddIHx8XG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyAmJiBqc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgIGlmIChkZXBWZXIgPT0gbnVsbCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnRG9uXFwndCBmb3JnZXQgdG8gYWRkIEB3ZmgvcGxpbmsgaW4gcGFja2FnZS5qc29uIGFzIGRlcGVuZGVuY2llcycpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRlcFZlci5lbmRzV2l0aCgnLnRneicpKSB7XG4gICAgICBjb25zdCBtYXRjaGVkID0gLy0oXFxkK1xcLlxcZCtcXC5bXl0rPylcXC50Z3okLy5leGVjKGRlcFZlcik7XG4gICAgICBpZiAobWF0Y2hlZCA9PSBudWxsKVxuICAgICAgICByZXR1cm47XG4gICAgICBkZXBWZXIgPSBtYXRjaGVkWzFdO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyICYmICFzZW12ZXIuc2F0aXNmaWVzKHBrLnZlcnNpb24sIGRlcFZlcikpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoYExvY2FsIGluc3RhbGxlZCBQbGluayB2ZXJzaW9uICR7Y2hhbGsuY3lhbihway52ZXJzaW9uKX0gZG9lcyBub3QgbWF0Y2ggZGVwZW5kZW5jeSB2ZXJzaW9uICR7Y2hhbGsuZ3JlZW4oZGVwVmVyKX0gaW4gcGFja2FnZS5qc29uLCBgICtcbiAgICAgICAgYHJ1biBjb21tYW5kIFwiJHtjaGFsay5ncmVlbigncGxpbmsgdXBncmFkZScpfVwiIHRvIHVwZ3JhZGUgb3IgZG93bmdyYWRlIHRvIGV4cGVjdGVkIHZlcnNpb25gKSk7XG4gICAgfVxuICB9XG59XG5cbiJdfQ==