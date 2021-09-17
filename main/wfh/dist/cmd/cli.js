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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLDRCQUE0QjtBQUM1QiwwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLG1EQUFxQztBQUVyQyx1REFBeUM7QUFDekMsa0NBQWtDO0FBQ2xDLDRFQUFzRTtBQUV0RSx3Q0FBeUY7QUFFekYsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixvREFBNEI7QUFDNUIsNkRBQXFFO0FBQ3JFLHNEQUE4RDtBQUM5RCxtQ0FBOEM7QUFDOUMsbUNBQWlDO0FBR2pDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBc0IsQ0FBQztBQUNqRSxxQkFBcUI7QUFDckIsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRXRCLFFBQUEsaUJBQWlCLEdBQUcseUVBQXlFO0lBQzFHLGdHQUFnRyxDQUFDO0FBRTFGLEtBQUssVUFBVSxjQUFjLENBQUMsU0FBaUI7SUFDcEQsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7SUFDeEIsNERBQTREO0lBQzVELHdEQUFhLGFBQWEsR0FBQyxDQUFDO0lBQzVCLGlDQUFpQztJQUdqQyxJQUFJLGFBQW1DLENBQUM7SUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7U0FDN0MsV0FBVyxDQUFDLGVBQUssQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztTQUM5RSxNQUFNLENBQUMsQ0FBQyxJQUFjLEVBQUUsRUFBRTtRQUN6QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGVBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdB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LENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztZQUMvRCxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDN0QsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUEsZ0JBQVMsRUFBQyxpRUFBaUUsQ0FBQyxDQUFDLENBQUM7WUFDMUYsT0FBTztTQUNSO1FBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzNCLE1BQU0sT0FBTyxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4RCxJQUFJLE9BQU8sSUFBSSxJQUFJO2dCQUNqQixPQUFPO1lBQ1QsTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyQjtRQUNELElBQUksTUFBTSxJQUFJLENBQUMsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNuRCxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFBLGdCQUFTLEVBQUMsaUNBQWlDLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxzQ0FBc0MsZUFBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CO2dCQUN4SixnQkFBZ0IsZUFBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsK0NBQStDLENBQUMsQ0FBQyxDQUFDO1NBQ2pHO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY2ZvbnQuZC50c1wiIC8+XG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICcuLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgaXNEcmNwU3ltbGluaywgc2V4eUZvbnQsIGdldFJvb3REaXIsIGJveFN0cmluZywgcGxpbmtFbnYgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF9zeW1saW5rcyBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgc2VtdmVyIGZyb20gJ3NlbXZlcic7XG5pbXBvcnQge0NvbW1hbmRPdmVycmlkZXIsIHdpdGhDd2RPcHRpb259IGZyb20gJy4vb3ZlcnJpZGUtY29tbWFuZGVyJztcbmltcG9ydCB7aW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzfSBmcm9tICcuLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQge2hsRGVzYywgYXJyYXlPcHRpb25Gbn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7Q2xpT3B0aW9ucyBhcyBUc2NvbmZpZ0NsaU9wdGlvbnN9IGZyb20gJy4vY2xpLXRzY29uZmlnLWhvb2snO1xuaW1wb3J0ICogYXMgX2NsaVdhdGNoIGZyb20gJy4vY2xpLXdhdGNoJztcbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG4vLyBjb25zdCBXSURUSCA9IDEzMDtcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY2xpJyk7XG5cbmV4cG9ydCBjb25zdCBjbGlQYWNrYWdlQXJnRGVzYyA9ICdTaW5nbGUgb3IgbXVsdGlwbGUgcGFja2FnZSBuYW1lcywgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQsJyArXG4naWYgdGhlIHNjb3BlIG5hbWUgKHRoZSBwYXJ0IGJldHdlZW4gXCJAXCIgXCIvXCIpIGFyZSBsaXN0ZWQgY29uZmlndXJhdGlvbiBwcm9wZXJ0eSBcInBhY2thZ2VTY29wZXNcIic7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21tYW5kcyhzdGFydFRpbWU6IG51bWJlcikge1xuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rJztcbiAgLy8gY29uc3Qge3N0YXRlRmFjdG9yeX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gIGF3YWl0IGltcG9ydCgnLi9jbGktc2xpY2UnKTtcbiAgLy8gc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG5cblxuICBsZXQgY2xpRXh0ZW5zaW9uczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoJ3BsaW5rJylcbiAgLmRlc2NyaXB0aW9uKGNoYWxrLmN5YW4oJ0EgcGx1Z2dhYmxlIG1vbm9yZXBvIGFuZCBtdWx0aS1yZXBvIG1hbmFnZW1lbnQgdG9vbCcpKVxuICAuYWN0aW9uKChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHByb2dyYW0uaGVscEluZm9ybWF0aW9uKCkpO1xuXG4gICAgaWYgKHdzU3RhdGUgPT0gbnVsbCkge1xuICAgICAgY29uc3Qgd3NEaXJzID0gWy4uLnBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpXTtcbiAgICAgIGlmICh3c0RpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhgTW9yZSBjb21tYW5kcyBhcmUgYXZhaWxhYmxlIGluIHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yaWVzOiBbJHt3c0RpcnMubWFwKGl0ZW0gPT4gY2hhbGsuY3lhbihpdGVtKSkuam9pbignLCAnKX1dXFxuYCArXG4gICAgICAgICAgYFRyeSBjb21tYW5kczpcXG4ke3dzRGlycy5tYXAoZGlyID0+ICcgIHBsaW5rIC0tY3dkICcgKyBkaXIpLmpvaW4oJ1xcbicpfWApO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBcXG52ZXJzaW9uOiAke3BrLnZlcnNpb259ICR7aXNEcmNwU3ltbGluayA/IGNoYWxrLnllbGxvdygnKHN5bWxpbmtlZCknKSA6ICcnfSBgKTtcbiAgICBpZiAoY2xpRXh0ZW5zaW9ucyAmJiBjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtjbGlFeHRlbnNpb25zLmxlbmd0aH0gY29tbWFuZCBsaW5lIGV4dGVuc2lvbmAgK1xuICAgICAgYCR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiAke2NsaUV4dGVuc2lvbnMubWFwKHBrZyA9PiBjaGFsay5ibHVlKHBrZykpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbicsIGNoYWxrLmJnUmVkKCdQbGVhc2UgZGV0ZXJtaW5lIGEgc3ViIGNvbW1hbmQgbGlzdGVkIGFib3ZlJykpO1xuICAgIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG4gICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBwcm9jZXNzLmV4aXQoMSkpO1xuICB9KTtcbiAgcHJvZ3JhbS5hZGRIZWxwVGV4dCgnYmVmb3JlJywgc2V4eUZvbnQoJ1BMaW5rJykuc3RyaW5nKTtcbiAgd2l0aEN3ZE9wdGlvbihwcm9ncmFtKTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbiAgcHJvZ3JhbS5hZGRIZWxwQ29tbWFuZCgnaGVscCBbY29tbWFuZF0nLCAnc2hvdyBoZWxwIGluZm9ybWF0aW9uLCBzYW1lIGFzIFwiLWhcIi4gJyk7XG5cbiAgY29uc3Qgb3ZlcnJpZGVyID0gbmV3IENvbW1hbmRPdmVycmlkZXIocHJvZ3JhbSk7XG4gIGxldCB3c1N0YXRlOiBwa2dNZ3IuV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIGNvbnN0IHtnZXRTdGF0ZTogZ2V0UGtnU3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa2dNZ3I7XG4gICAgd3NTdGF0ZSA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKTtcbiAgICBpZiAod3NTdGF0ZSAhPSBudWxsKSB7XG4gICAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBwcm9ncmFtID0+IHtcbiAgICAgICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSBzdHIgPT4gY2hhbGsuZ3JlZW4oc3RyKTtcbiAgICAgICAgc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbSk7XG4gICAgICAgIG92ZXJyaWRlci5uYW1lU3R5bGVyID0gdW5kZWZpbmVkO1xuICAgICAgICBzdWJDb21hbmRzKHByb2dyYW0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG92ZXJyaWRlci5mb3JQYWNrYWdlKG51bGwsIHN1YkNvbWFuZHMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdmVycmlkZXIuZm9yUGFja2FnZShudWxsLCBzdWJDb21hbmRzKTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBvdmVycmlkZXIubmFtZVN0eWxlciA9IHN0ciA9PiBjaGFsay5jeWFuKHN0cik7XG4gICAgY2xpRXh0ZW5zaW9ucyA9IGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW0sIHdzU3RhdGUsIG92ZXJyaWRlcik7XG4gICAgb3ZlcnJpZGVyLm5hbWVTdHlsZXIgPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnVmFsdWUgb2YgZW52aXJvbm1lbnQgdmFyYWlibGUgXCJQTElOS19TQUZFXCIgaXMgdHJ1ZSwgc2tpcCBsb2FkaW5nIGV4dGVuc2lvbicpO1xuICB9XG5cbiAgb3ZlcnJpZGVyLmFwcGVuZEdsb2JhbE9wdGlvbnMoZmFsc2UpO1xuICB0cnkge1xuICAgIGF3YWl0IHByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YsIHtmcm9tOiAnbm9kZSd9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIGV4ZWN1dGUgY29tbWFuZCBkdWUgdG86ICcgKyBjaGFsay5yZWRCcmlnaHQoKGUgYXMgRXJyb3IpLm1lc3NhZ2UpLCBlKTtcbiAgICBpZiAoKGUgYXMgRXJyb3IpLnN0YWNrKSB7XG4gICAgICBsb2cuZXJyb3IoKGUgYXMgRXJyb3IpLnN0YWNrKTtcbiAgICB9XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5cbmxldCBza2lwVmVyc2lvbkNoZWNrID0gZmFsc2U7XG5cbmZ1bmN0aW9uIHN1YkNvbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgcHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsICgpID0+IHtcbiAgICBpZiAoc2tpcFZlcnNpb25DaGVjaylcbiAgICAgIHJldHVybjtcbiAgICBza2lwVmVyc2lvbkNoZWNrID0gdHJ1ZTtcbiAgICBpZiAocHJvY2Vzcy5zZW5kID09IG51bGwpIHtcbiAgICAgIC8vIHByb2Nlc3MgaXMgbm90IGEgZm9ya2VkIGNoaWxkIHByb2Nlc3NcbiAgICAgIGNoZWNrUGxpbmtWZXJzaW9uKCk7XG4gICAgfVxuICB9KTtcbiAgLyoqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCBbd29yay1kaXJlY3RvcnldJykuYWxpYXMoJ3N5bmMnKVxuICAgIC5kZXNjcmlwdGlvbignSW5pdGlhbGl6ZSBhbmQgdXBkYXRlIHdvcmsgZGlyZWN0b3J5LCBnZW5lcmF0ZSBiYXNpYyBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBwcm9qZWN0IGFuZCBjb21wb25lbnQgcGFja2FnZXMsJyArXG4gICAgICAnIGNhbGN1bGF0ZSBob2lzdGVkIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzLCBhbmQgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBjdXJyZW50IGRpcmVjdG9yeS4nICtcbiAgICAgICcgKEFsbCBOUE0gY29uZmlnIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aWxsIGFmZmVjdCBkZXBlbmRlbmN5IGluc3RhbGxhdGlvbiwgc2VlIGh0dHBzOi8vZG9jcy5ucG1qcy5jb20vY2xpL3Y3L3VzaW5nLW5wbS9jb25maWcjZW52aXJvbm1lbnQtdmFyaWFibGVzKScsXG4gICAgICB7XG4gICAgICAgICd3b3JrLWRpcmVjdG9yeSc6ICdBIHJlbGF0aXZlIG9yIGFib3NvbHV0ZSBkaXJlY3RvcnkgcGF0aCwgdXNlIFwiLlwiIHRvIGRldGVybWluZSBjdXJyZW50IGRpcmVjdG9yeSxcXG4gIG9tbWl0dGluZyB0aGlzIGFyZ3VtZW50IG1lYW5pbmc6XFxuJyArXG4gICAgICAgICAgJyAgLSBJZiBjdXJyZW50IGRpcmVjdG9yeSBpcyBhbHJlYWR5IGEgXCJ3b3JrIGRpcmVjdG9yeVwiLCB1cGRhdGUgaXQuXFxuJyArXG4gICAgICAgICAgJyAgLSBJZiBjdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3JrIGRpcmVjdG9yeSAobWF5YmUgYXQgcmVwb1xcJ3Mgcm9vdCBkaXJlY3RvcnkpLCB1cGRhdGUgdGhlIGxhdGVzdCB1cGRhdGVkIHdvcmsnICtcbiAgICAgICAgICAnIGRpcmVjdG9yeS4nXG4gICAgICB9KVxuICAgIC5vcHRpb24oJy1mLCAtLWZvcmNlJywgJ0ZvcmNlIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeSwgdGhpcyBpcyBub3Qgc2FtZSBhcyBucG0gaW5zdGFsbCBvcHRpb24gXCItZlwiICcsIGZhbHNlKVxuICAgIC8vIC5vcHRpb24oJy0tbGludC1ob29rLCAtLWxoJywgJ0NyZWF0ZSBhIGdpdCBwdXNoIGhvb2sgZm9yIGNvZGUgbGludCcsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZT86IHN0cmluZykgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1pbml0JykpLmRlZmF1bHQoaW5pdENtZC5vcHRzKCkgYXMgdHAuSW5pdENtZE9wdGlvbnMgJiB0cC5OcG1DbGlPcHRpb24sIHdvcmtzcGFjZSk7XG4gICAgfSk7XG4gIGFkZE5wbUluc3RhbGxPcHRpb24oaW5pdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcHJvamVjdFxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdwcm9qZWN0IFthZGR8cmVtb3ZlXSBbZGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZnJvbSBhc3NvY2lhdGVkIHByb2plY3RzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgQXNzb2NpYXRlIHRvIGEgcHJvamVjdCBvciBEaXNhc3NvY2lhdGUgZnJvbSBhIHByb2plY3QnLFxuICAgICAgICBkaXI6ICdTcGVjaWZ5IHRhcmdldCBwcm9qZWN0IHJlcG8gZGlyZWN0b3J5IChhYnNvbHV0ZSBwYXRoIG9yIHJlbGF0aXZlIHBhdGggdG8gY3VycmVudCBkaXJlY3RvcnkpJyArXG4gICAgICAgICAgJywgc3BlY2lmeSBtdWx0aXBsZSBwcm9qZWN0IGJ5IHNlcGVyYXRpbmcgdGhlbSB3aXRoIHNwYWNlIGNoYXJhY3RlcidcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJyB8ICdyZW1vdmUnIHwgdW5kZWZpbmVkLCBwcm9qZWN0RGlyOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiBmYWxzZX0sIGFjdGlvbiwgcHJvamVjdERpcik7XG4gICAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzcmMgW2FkZHxyZW1vdmVdIFtkaXIuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3Qgc291cmNlIGRpcmVjdG9yaWVzLCBQbGluayB3aWxsJyArXG4gICAgICAnIHNjYW4gc291cmNlIGNvZGUgZGlyZWN0b3JpZXMgZm9yIHBhY2thZ2VzJywge1xuICAgICAgICAnYWRkfHJlbW92ZSc6ICdTcGVjaWZ5IHdoZXRoZXIgYXNzb2NpYXRlIHRvIGEgZGlyZWN0b3J5IG9yIGRpc2Fzc29jaWF0ZSBmcm9tIGEgZGlyZWN0b3J5JyxcbiAgICAgICAgZGlyOiAnc3BlY2lmeSBtdWx0aXBsZSBkaXJlY3RvcmllcyBieSBzZXBlcmF0aW5nIHRoZW0gd2l0aCBzcGFjZSBjaGFyYWN0ZXInXG4gICAgICB9KVxuICAgICAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJyB8ICdyZW1vdmUnIHwgdW5kZWZpbmVkLCBkaXJzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhzZXh5Rm9udCgnUExpbmsnKS5zdHJpbmcpO1xuICAgICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoe2lzU3JjRGlyOiB0cnVlfSwgYWN0aW9uLCBkaXJzKTtcbiAgICAgIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIC8vIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgLy8gICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJywge1xuICAvLyAgICAgcGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2NcbiAgLy8gICB9KVxuICAvLyAgIC5vcHRpb24oJy0tcGogPHByb2plY3QxLHByb2plY3QyLi4uPicsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLy8gICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAvLyAgIC5hY3Rpb24oYXN5bmMgcGFja2FnZXMgPT4ge1xuICAvLyAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICAvLyAgIH0pO1xuXG4gIC8vIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgLy8gICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gIC8vICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY3MnKS5hbGlhcygnY2xlYXItc3ltbGlua3MnKVxuICAgIC5kZXNjcmlwdGlvbignQ2xlYXIgc3ltbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAgIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2Nhbk5vZGVNb2R1bGVzID0gKHJlcXVpcmUoJy4uL3V0aWxzL3N5bWxpbmtzJykgYXMgdHlwZW9mIF9zeW1saW5rcykuZGVmYXVsdDtcbiAgICAgIGNvbnN0IGVkaXRvciA9IGF3YWl0IGltcG9ydCgnLi4vZWRpdG9yLWhlbHBlcicpO1xuICAgICAgZWRpdG9yLmRpc3BhdGNoZXIuY2xlYXJTeW1saW5rcygpO1xuICAgICAgYXdhaXQgZWRpdG9yLmdldEFjdGlvbiQoJ2NsZWFyU3ltbGlua3NEb25lJykucGlwZShvcC50YWtlKDEpKS50b1Byb21pc2UoKTtcbiAgICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcyh1bmRlZmluZWQsICdhbGwnKTtcbiAgICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCB1cGdyYWRlXG4gICAqL1xuICBjb25zdCB1cGdyYWRlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGdyYWRlJylcbiAgICAuYWxpYXMoJ2luc3RhbGwnKVxuICAgIC5kZXNjcmlwdGlvbignUmVpbnN0YWxsIGxvY2FsIFBsaW5rIGFsb25nIHdpdGggb3RoZXIgZGVwZW5kZW5jaWVzLicgK1xuICAgICAgJyBVbmxpa2UgXCJucG0gaW5zdGFsbFwiIHdoaWNoIGRvZXMgbm90IHdvcmsgd2l0aCBub2RlX21vZHVsZXMgdGhhdCBtaWdodCBjb250YWluIHN5bWxpbmtzLicgK1xuICAgICAgJyAoQWxsIE5QTSBjb25maWcgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdpbGwgYWZmZWN0IGRlcGVuZGVuY3kgaW5zdGFsbGF0aW9uLCBzZWUgaHR0cHM6Ly9kb2NzLm5wbWpzLmNvbS9jbGkvdjcvdXNpbmctbnBtL2NvbmZpZyNlbnZpcm9ubWVudC12YXJpYWJsZXMpJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIHNraXBWZXJzaW9uQ2hlY2sgPSB0cnVlO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGluay1wbGluaycpKS5yZWluc3RhbGxXaXRoTGlua2VkUGxpbmsodXBncmFkZUNtZC5vcHRzKCkgYXMgdHAuTnBtQ2xpT3B0aW9uKTtcbiAgICB9KTtcbiAgYWRkTnBtSW5zdGFsbE9wdGlvbih1cGdyYWRlQ21kKTtcbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdkb2NrZXJpemUgPHdvcmtzcGFjZS1kaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKGNoYWxrLmdyYXkoJ1tUQkldIEdlbmVyYXRlIERvY2tlcmZpbGUgZm9yIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnksIGFuZCBnZW5lcmF0ZSBkb2NrZXIgaW1hZ2UnKSk7XG5cbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdwa2cgPHdvcmtzcGFjZS1kaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKGNoYWxrLmdyYXkoJ1tUQkldIFVzZSBQa2cgKGh0dHBzOi8vZ2l0aHViLmNvbS92ZXJjZWwvcGtnKSB0byBwYWNrYWdlIE5vZGUuanMgcHJvamVjdCBpbnRvIGFuIGV4ZWN1dGFibGUgJykpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxzXG4gICAqL1xuICBjb25zdCBsaXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdscycpLmFsaWFzKCdsaXN0JylcbiAgICAub3B0aW9uKCctaiwgLS1qc29uJywgJ2xpc3QgbGlua2VkIGRlcGVuZGVuY2llcyBpbiBmb3JtIG9mIEpTT04nLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWhvaXN0JywgJ2xpc3QgaG9pc3RlZCB0cmFuc2l0aXZlIERlcGVuZGVuY3kgaW5mb3JtYXRpb24nLCBmYWxzZSlcbiAgICAuZGVzY3JpcHRpb24oJ0lmIHlvdSB3YW50IHRvIGtub3cgaG93IG1hbnkgcGFja2FnZXMgd2lsbCBhY3R1YWxseSBydW4sIHRoaXMgY29tbWFuZCBwcmludHMgb3V0IGEgbGlzdCBhbmQgdGhlIHByaW9yaXRpZXMsIGluY2x1ZGluZyBpbnN0YWxsZWQgcGFja2FnZXMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuZGVmYXVsdChsaXN0Q21kLm9wdHMoKSBhcyBhbnkpO1xuICAgIH0pO1xuXG4gIGNvbnN0IGFkZENtZCA9IHByb2dyYW0uY29tbWFuZCgnYWRkIDxkZXBlbmRlbmN5Li4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdBZGQgZGVwZW5kZW5jeSB0byBwYWNrYWdlLmpzb24gZmlsZSwgd2l0aCBvcHRpb24gXCItLWRldlwiIHRvIGFkZCBhcyBcImRldkRlcGVuZGVuY2llc1wiLCAnICtcbiAgICAgICd3aXRob3V0IG9wdGlvbiBcIi0tdG9cIiB0aGlzIGNvbW1hbmQgYWRkcyBkZXBlbmRlbmN5IHRvIGN1cnJlbnQgd29ya3RyZWUgc3BhY2VcXCdzIHBhY2thZ2UuanNvbiBmaWxlJyxcbiAgICAgIHtcbiAgICAgICAgZGVwZW5kZW5jeTogJ2RlcGVuZGVuY3kgcGFja2FnZSBuYW1lIGluIGZvcm0gb2YgXCI8YSBsaW5rZWQgcGFja2FnZSBuYW1lIHdpdGhvdXQgc2NvcGUgcGFydD5cIiwgXCI8cGFja2FnZSBuYW1lPkA8dmVyc2lvbj5cIiwgJ1xuICAgICAgfSlcbiAgICAub3B0aW9uKCctLXRvIDxwa2cgbmFtZSB8IHdvcmt0cmVlIGRpciB8IHBrZyBkaXI+JywgJ2FkZCBkZXBlbmRlbmN5IHRvIHRoZSBwYWNrYWdlLmpzb24gb2Ygc3BlY2lmaWMgbGlua2VkIHNvdXJjZSBwYWNrYWdlIGJ5IG5hbWUgb3IgZGlyZWN0b3J5LCBvciBhIHdvcmt0cmVlIHNwYWNlIGRpcmVjdG9yeScpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hZGQtcGFja2FnZScpKS5hZGREZXBlbmRlbmN5VG8ocGFja2FnZXMsIGFkZENtZC5vcHRzKCkudG8sIGFkZENtZC5vcHRzKCkuZGV2KTtcbiAgICB9KTtcblxuICBjb25zdCB0c2NvbmZpZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjb25maWcnKVxuICAgIC5kZXNjcmlwdGlvbignTGlzdCB0c2NvbmZpZy5qc29uLCBqc2NvbmZpZy5qc29uIGZpbGVzIHdoaWNoIHdpbGwgYmUgdXBkYXRlZCBhdXRvbWF0aWNhbGx5IGJ5IFBsaW5rLCAoYSBtb25vcmVwbyBtZWFucyB0aGVyZSBhcmUgbm9kZSBwYWNrYWdlcyB3aGljaCBhcmUgc3ltbGlua2VkIGZyb20gcmVhbCBzb3VyY2UgY29kZSBkaXJlY3RvcnknICtcbiAgICAgICcsIGlmIHlvdSBoYXZlIGN1c3RvbWl6ZWQgdHNjb25maWcuanNvbiBmaWxlLCB0aGlzIGNvbW1hbmQgaGVscHMgdG8gdXBkYXRlIFwiY29tcGlsZXJPcHRpb25zLnBhdGhzXCIgcHJvcGVydGllcyknKVxuICAgIC5vcHRpb24oJy0taG9vayA8ZmlsZT4nLCAnYWRkIHRzY29uZmlnL2pzY29uZmlnIGZpbGUgdG8gUGxpbmtcXCdzIGF1dG9tYXRpYyB1cGRhdGluZyBmaWxlIGxpc3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXVuaG9vayA8ZmlsZT4nLCAncmVtb3ZlIHRzY29uZmlnL2pzY29uZmlnIGZpbGUgZnJvbSBQbGlua1xcJ3MgYXV0b21hdGljIHVwZGF0aW5nIGZpbGUgbGlzdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tY2xlYXIsLS11bmhvb2stYWxsJywgJ3JlbW92ZSBhbGwgdHNjb25maWcgZmlsZXMgZnJvbSBmcm9tIFBsaW5rXFwncyBhdXRvbWF0aWMgdXBkYXRpbmcgZmlsZSBsaXN0JywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS10c2NvbmZpZy1ob29rJykpLmRvVHNjb25maWcodHNjb25maWdDbWQub3B0cygpIGFzIFRzY29uZmlnQ2xpT3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgLyoqXG4gICAqIEJ1bXAgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgYnVtcENtZCA9IHByb2dyYW0uY29tbWFuZCgnYnVtcCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignYnVtcCBwYWNrYWdlLmpzb24gdmVyc2lvbiBudW1iZXIgZm9yIHNwZWNpZmljIHBhY2thZ2UsIHNhbWUgYXMgXCJucG0gdmVyc2lvblwiIGRvZXMnLFxuICAgICAge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ29ubHkgYnVtcCBjb21wb25lbnQgcGFja2FnZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpO1xuICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY3JlLXZlcnNpb24gPHZhbHVlPicsXG4gICAgICAndmVyc2lvbiBpbmNyZW1lbnQsIHZhbGlkIHZhbHVlcyBhcmU6IG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UnLCAncGF0Y2gnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktYnVtcCcpKS5kZWZhdWx0KHsuLi5idW1wQ21kLm9wdHMoKSBhcyB0cC5CdW1wT3B0aW9ucywgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoYnVtcENtZCk7XG4gIC8vIGJ1bXBDbWQudXNhZ2UoYnVtcENtZC51c2FnZSgpICsgJ1xcbicgKyBobCgncGxpbmsgYnVtcCA8cGFja2FnZT4gLi4uJykgKyAnIHRvIHJlY3Vyc2l2ZWx5IGJ1bXAgcGFja2FnZS5qc29uIGZyb20gbXVsdGlwbGUgZGlyZWN0b3JpZXNcXG4nICtcbiAgLy8gICBobCgncGxpbmsgYnVtcCA8ZGlyPiAtaSBtaW5vcicpICsgJyB0byBidW1wIG1pbm9yIHZlcnNpb24gbnVtYmVyLCBkZWZhdWx0IGlzIHBhdGNoIG51bWJlcicpO1xuXG4gIC8qKlxuICAgKiBQYWNrIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHBhY2tDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3BhY2sgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ25wbSBwYWNrIHBha2FnZSBpbnRvIHRhcmJhbGwgZmlsZXMgYW5kIGNoYW5nZSB2ZXJzaW9uIHZhbHVlIGZyb20gcmVsYXRlZCBwYWNrYWdlLmpzb24nLCB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncGFjayBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLXcsLS13b3Jrc3BhY2UgPHdvcmtzcGFjZS1kaXI+JywgJ3BhY2sgcGFja2FnZXMgd2hpY2ggYXJlIGxpbmtlZCBhcyBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpcj4nLFxuICAgICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXRhci1kaXIgPGRpcj4nLCAnZGlyZWN0b3J5IHRvIHNhdmUgdGFyIGZpbGVzJywgUGF0aC5qb2luKGdldFJvb3REaXIoKSwgJ3RhcmJhbGxzJykpXG4gICAgLm9wdGlvbignLS1qZiwgLS1qc29uLWZpbGUgPHBrZy1qc29uLWZpbGU+JywgJ3RoZSBwYWNrYWdlLmpzb24gZmlsZSBpbiB3aGljaCBcImRldkRlcGVuZGVuY2llc1wiLCBcImRlcGVuZGVuY2llc1wiIHNob3VsZCB0byBiZSBjaGFuZ2VkIGFjY29yZGluZyB0byBwYWNrZWQgZmlsZSwgJyArXG4gICAgICAnYnkgZGVmYXVsdCBwYWNrYWdlLmpzb24gZmlsZXMgaW4gYWxsIHdvcmsgc3BhY2VzIHdpbGwgYmUgY2hlY2tlZCBhbmQgY2hhbmdlZCcpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnBhY2soey4uLnBhY2tDbWQub3B0cygpIGFzIHRwLlBhY2tPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhwYWNrQ21kKTtcbiAgcGFja0NtZC51c2FnZShwYWNrQ21kLnVzYWdlKCkgKyAnXFxuQnkgZGVmYXVsdCwgcnVuIFwibnBtIHBhY2tcIiBmb3IgZWFjaCBsaW5rZWQgcGFja2FnZSB3aGljaCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcHVibGlzaENtZCA9IHByb2dyYW0uY29tbWFuZCgncHVibGlzaCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIG5wbSBwdWJsaXNoJywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3B1Ymxpc2ggcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLFxuICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncHVibGlzaCBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXB1YmxpYycsICdzYW1lIGFzIFwibnBtIHB1Ymxpc2hcIiBjb21tYW5kIG9wdGlvbiBcIi0tYWNjZXNzIHB1YmxpY1wiJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnB1Ymxpc2goey4uLnB1Ymxpc2hDbWQub3B0cygpIGFzIHRwLlB1Ymxpc2hPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuXG5cbiAgY29uc3QgYW5hbHlzaXNDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2FuYWx5emUgW3BrZy1uYW1lLi4uXScpXG4gICAgLmFsaWFzKCdhbmFseXNlJylcbiAgICAuZGVzY3JpcHRpb24oJ1VzZSBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIHBhcnNlIHNvdXJjZSBjb2RlLCBsaXN0IGRlcGVuZGVuY2VzIGJ5IERGUyBhbGdhcml0aG0sIHJlc3VsdCBpbmZvcm1hdGlvbiBpbmNsdWRlcycgK1xuICAgICAgJzogY3ljbGljIGRlcGVuZGVjaWVzLCB1bnJlc29sdmFibGUgZGVwZW5kZW5jaWVzLCBleHRlcm5hbCBkZXBlbmRlbmNpZXMsIGRlcGVuZGVuY2llcyBhcmUgbm90IHVuZGVyIHRhcmdldCBkaXJlY3RvcnkuJywge1xuICAgICAgJ3BrZy1uYW1lJzogJ3RoZSBuYW1lIG9mIHRhcmdldCBzb3VyY2UgcGFja2FnZSwgdGhlIHBhY2thZ2UgbXVzdCBiZSBQbGluayBjb21wbGlhbnQgcGFja2FnZSwgdGhpcyBjb21tYW5kIHdpbGwgb25seSAnICtcbiAgICAgICAgJ3NjYW4gc3BlY2lhbCBzb3VyY2UgY29kZSBkaXJlY3RvcnkgbGlrZSBcInRzL1wiIGFuZCBcImlzb20vXCIgb2YgdGFyZ2V0IHBhY2thZ2UnXG4gICAgICB9KVxuICAgIC5vcHRpb24oJy14IDxyZWdleHA+JywgJ0luZ29yZSBcIm1vZHVsZSBuYW1lXCIgdGhhdCBtYXRjaGVzIHNwZWNpZmljIFJlZ3VsYXIgRXhwZXJzc2lvbicsICdcXC4obGVzc3xzY3NzfGNzcykkJylcbiAgICAub3B0aW9uKCctZCwgLS1kaXIgPGRpcmVjdG9yeT4nLFxuICAgICAgJyhtdWx0aXBsZSkgZGV0ZXJtaW5lIHRhcmdldCBkaXJlY3RvcnksIHNjYW4gSlMvSlNYL1RTL1RTWCBmaWxlcyB1bmRlciB0YXJnZXQgZGlyZWN0b3J5JywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLWYsIC0tZmlsZSA8ZmlsZT4nLFxuICAgICAgJyhtdWx0aXBsZSkgZGV0ZXJtaW5lIHRhcmdldCBUUy9KUyhYKSBmaWxlcyAobXVsdGlwbGUgZmlsZSB3aXRoIG1vcmUgb3B0aW9ucyBcIi1mIDxmaWxlPiAtZiA8Z2xvYj5cIiknLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctaicsICdTaG93IHJlc3VsdCBpbiBKU09OJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS10c2NvbmZpZyA8ZmlsZT4nLCAnVXNlIFwiY29tcGlsZXJPcHRpb25zLnBhdGhzXCIgcHJvcGVydHkgdG8gcmVzb2x2ZSB0cy9qcyBmaWxlIG1vZHVsZScpXG4gICAgLm9wdGlvbignLS1hbGlhcyA8YWxpYXMtZXhwcmVzcz4nLCAnbXVsdGlwbGUgSlNPTiBleHByZXNzLCBlLmcuIC0tYWxpYXMgXFwnXCJeQC8oLispJFwiLFwic3JjLyQxXCJcXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuL2NsaS1hbmFseXplJykpLmRlZmF1bHQocGFja2FnZXMsIGFuYWx5c2lzQ21kLm9wdHMoKSBhcyB0cC5BbmFseXplT3B0aW9ucyk7XG4gICAgfSk7XG5cbiAgYW5hbHlzaXNDbWQudXNhZ2UoYW5hbHlzaXNDbWQudXNhZ2UoKSArICdcXG4nICtcbiAgICAnZS5nLlxcbiAgJyArIGNoYWxrLmJsdWUoJ3BsaW5rIGFuYWx5emUgLWYgXCJwYWNrYWdlcy9mb29iYXIxLyoqLypcIiAtZiBwYWNrYWdlcy9mb29iYXIyL3RzL21haW4udHNcXG4gICcgK1xuICAgICdwbGluayBhbmFseXplIC1kIHBhY2thZ2VzL2Zvb2JhcjEvc3JjIC1kIHBhY2thZ2VzL2Zvb2JhcjIvdHMnKSk7XG5cbiAgY29uc3Qgd2F0Y2hDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3dhdGNoIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignV2F0Y2ggcGFja2FnZSBzb3VyY2UgY29kZSBmaWxlIGNoYW5nZXMgKGZpbGVzIHJlZmVyZW5jZWQgaW4gLm5wbWlnbm9yZSB3aWxsIGJlIGlnbm9yZWQpIGFuZCB1cGRhdGUgUGxpbmsgc3RhdGUsICcgK1xuICAnYXV0b21hdGljYWxseSBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeScsIHtcbiAgICBwYWNrYWdlOiBjbGlQYWNrYWdlQXJnRGVzY30pXG4gIC5vcHRpb24oJy0tY3AsIC0tY29weSA8ZGlyZWN0b3J5PicsICdjb3B5IHBhY2thZ2UgZmlsZXMgdG8gc3BlY2lmaWMgZGlyZWN0b3J5LCBtaW1pYyBiZWhhdmlvciBvZiBcIm5wbSBpbnN0YWxsIDxwa2c+XCIsIGJ1dCB0aGlzIHdvblxcJ3QgaW5zdGFsbCBkZXBlbmRlbmNpZXMnKVxuICAuYWN0aW9uKChwa2dzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IHtjbGlXYXRjaH0gPSByZXF1aXJlKCcuL2NsaS13YXRjaCcpIGFzIHR5cGVvZiBfY2xpV2F0Y2g7XG4gICAgY2xpV2F0Y2gocGtncywgd2F0Y2hDbWQub3B0cygpKTtcbiAgfSk7XG5cbiAgY29uc3QgdXBkYXRlRGlyQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGRhdGUtZGlyJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biB0aGlzIGNvbW1hbmQgdG8gc3luYyBpbnRlcm5hbCBzdGF0ZSB3aGVuIHdob2xlIHdvcmtzcGFjZSBkaXJlY3RvcnkgaXMgcmVuYW1lZCBvciBtb3ZlZC5cXG4nICtcbiAgICAnQmVjYXVzZSB3ZSBzdG9yZSBhYnNvbHV0ZSBwYXRoIGluZm8gb2YgZWFjaCBwYWNrYWdlIGluIGludGVybmFsIHN0YXRlLCBhbmQgaXQgd2lsbCBiZWNvbWUgaW52YWxpZCBhZnRlciB5b3UgcmVuYW1lIG9yIG1vdmUgZGlyZWN0b3J5JylcbiAgICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuY2hlY2tEaXIodXBkYXRlRGlyQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc3BhY2VPbmx5U3ViQ29tbWFuZHMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqXG4gICAqIHRzYyBjb21tYW5kXG4gICAqL1xuICBjb25zdCB0c2NDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzYyBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIFR5cGVzY3JpcHQgY29tcGlsZXIgdG8gY29tcGlsZSBzb3VyY2UgY29kZSBmb3IgdGFyZ2V0IHBhY2thZ2VzLCAnICtcbiAgICAnd2hpY2ggaGF2ZSBiZWVuIGxpbmtlZCB0byBjdXJyZW50IHdvcmsgZGlyZWN0b3J5Jywge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgICAub3B0aW9uKCctdywgLS13YXRjaCcsICdUeXBlc2NyaXB0IGNvbXBpbGVyIHdhdGNoIG1vZGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICAgIHByZXYucHVzaCguLi52LnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgICAvLyAub3B0aW9uKCctLXdzLC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdvbmx5IGluY2x1ZGUgdGhvc2UgbGlua2VkIHBhY2thZ2VzIHdoaWNoIGFyZSBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgIC8vICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS10c3gsLS1qc3gnLCAnaW5jbHVkZXMgVFNYIGZpbGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1zb3VyY2UtbWFwIDxpbmxpbmV8ZmlsZT4nLCAnU291cmNlIG1hcCBzdHlsZTogXCJpbmxpbmVcIiBvciBcImZpbGVcIicsICdpbmxpbmUnKVxuICAgIC5vcHRpb24oJy0tbWVyZ2UsLS1tZXJnZS10c2NvbmZpZyA8ZmlsZT4nLCAnTWVyZ2UgY29tcGlsZXJPcHRpb25zIFwiYmFzZVVybFwiIGFuZCBcInBhdGhzXCIgZnJvbSBzcGVjaWZpZWQgdHNjb25maWcgZmlsZScpXG4gICAgLm9wdGlvbignLS1jb3BhdGgsIC0tY29tcGlsZXItb3B0aW9ucy1wYXRocyA8cGF0aE1hcEpzb24+JyxcbiAgICAgICdBZGQgbW9yZSBcInBhdGhzXCIgcHJvcGVydHkgdG8gY29tcGlsZXIgb3B0aW9ucy4gJyArXG4gICAgICAnKGUuZy4gLS1jb3BhdGggXFwne1xcXCJALypcIjpbXCIvVXNlcnMvd29ya2VyL29jZWFuLXVpL3NyYy8qXCJdfVxcJyknLCAodiwgcHJldikgPT4ge1xuICAgICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAgIC5vcHRpb24oJy0tY28gPEpTT04tc3RyaW5nPicsXG4gICAgICBgUGFydGlhbCBjb21waWxlciBvcHRpb25zIHRvIGJlIG1lcmdlZCAoZXhjZXB0IFwiYmFzZVVybFwiKSwgXCJwYXRoc1wiIG11c3QgYmUgcmVsYXRpdmUgdG8gJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHBsaW5rRW52LndvcmtEaXIpIHx8ICdjdXJyZW50IGRpcmVjdG9yeSd9YClcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG4gICAgICBjb25zdCB0c2MgPSBhd2FpdCBpbXBvcnQoJy4uL3RzLWNtZCcpO1xuXG4gICAgICBhd2FpdCB0c2MudHNjKHtcbiAgICAgICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgICAgIHByb2plY3Q6IG9wdC5wcm9qZWN0LFxuICAgICAgICB3YXRjaDogb3B0LndhdGNoLFxuICAgICAgICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgICAgIGpzeDogb3B0LmpzeCxcbiAgICAgICAgZWQ6IG9wdC5lbWl0RGVjbGFyYXRpb25Pbmx5LFxuICAgICAgICBwYXRoc0pzb25zOiBvcHQuY29tcGlsZXJPcHRpb25zUGF0aHMsXG4gICAgICAgIG1lcmdlVHNjb25maWc6IG9wdC5tZXJnZVRzY29uZmlnLFxuICAgICAgICBjb21waWxlck9wdGlvbnM6IG9wdC5jbyA/IEpTT04ucGFyc2Uob3B0LmNvKSA6IHVuZGVmaW5lZFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgdHNjQ21kLnVzYWdlKHRzY0NtZC51c2FnZSgpICtcbiAgICAnXFxuSXQgY29tcGlsZXMgXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vdHMvKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9kaXN0XCIsXFxuJyArXG4gICAgJyAgb3JcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbVwiXFxuIGZvciBhbGwgQHdmaCBwYWNrYWdlcy5cXG4nICtcbiAgICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAgICdib3RoIE5vZGUuanMgYW5kIEJyb3dzZXIpIGluIGRpcmVjdG9yeSBgaXNvbWAuXFxuXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2NcXG4nKSArICcgQ29tcGlsZSBsaW5rZWQgcGFja2FnZXMgdGhhdCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlICh5b3Ugc2hhbGwgcnVuIHRoaXMgY29tbWFuZCBvbmx5IGluIGEgd29ya3NwYWNlIGRpcmVjdG9yeSlcXG4nICtcbiAgICBobERlc2MoJ3BsaW5rIHRzYyA8cGFja2FnZS4uPlxcbicpICsgJyBPbmx5IGNvbXBpbGUgc3BlY2lmaWMgcGFja2FnZXMgYnkgcHJvdmlkaW5nIHBhY2thZ2UgbmFtZSBvciBzaG9ydCBuYW1lXFxuJyArXG4gICAgaGxEZXNjKCdwbGluayB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIHBhY2thZ2VzIGNoYW5nZSBhbmQgY29tcGlsZSB3aGVuIG5ldyB0eXBlc2NyaXB0IGZpbGUgaXMgY2hhbmdlZCBvciBjcmVhdGVkXFxuXFxuJyk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdzZXR0aW5nIFtwYWNrYWdlXScpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IHBhY2thZ2VzIHNldHRpbmcgYW5kIHZhbHVlcycsIHtwYWNrYWdlOiAncGFja2FnZSBuYW1lLCBvbmx5IGxpc3Qgc2V0dGluZyBmb3Igc3BlY2lmaWMgcGFja2FnZSd9KVxuICAgIC5hY3Rpb24oYXN5bmMgKHBrZ05hbWU6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktc2V0dGluZycpKS5kZWZhdWx0KHBrZ05hbWUpO1xuICAgIH0pO1xuICAgIC8qKiBjb21tYW5kIHJ1biovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBzcGVjaWZpYyBtb2R1bGVcXCdzIGV4cG9ydGVkIGZ1bmN0aW9uXFxuJylcbiAgICAuYWN0aW9uKGFzeW5jICh0YXJnZXQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL3BhY2thZ2UtcnVubmVyJykpLnJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc30pO1xuICAgIH0pO1xuXG4gIHJ1bkNtZC51c2FnZShydW5DbWQudXNhZ2UoKSArICdcXG4nICsgY2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXVxcbicpICtcbiAgICBgZS5nLlxcbiAgJHtjaGFsay5ncmVlbigncGxpbmsgcnVuIC4uL3BhY2thZ2VzL2ZvcmJhci1wYWNrYWdlL2Rpc3QvZmlsZS5qcyNmdW5jdGlvbiBhcmd1bWVudDEgYXJndW1lbnQyLi4uJyl9XFxuYCArXG4gICAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAgICc8dGFyZ2V0PiAtIEpTIG9yIFRTIGZpbGUgbW9kdWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlc29sdmVkIGJ5IE5vZGUuanMgKHRzLW5vZGUpIGZvbGxvd2VkIGJ5IFwiI1wiIGFuZCBleHBvcnRlZCBmdW5jdGlvbiBuYW1lLFxcbicpO1xuICAgIC8vICdlLmcuIFxcbicgK1xuICAgIC8vIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgICAvLyAnLCBmdW5jdGlvbiBjYW4gYmUgYXN5bmMgd2hpY2ggcmV0dXJucyBQcm9taXNlXFxuJyArXG4gICAgLy8gY2hhbGsuZ3JlZW4oJ25vZGVfbW9kdWxlcy9wYWNrYWdlLWRpci9kaXN0L2Zvb2Jhci50cyNteUZ1bmN0aW9uJykgK1xuICAgIC8vICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuXG59XG5cbmZ1bmN0aW9uIGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3czogcGtnTWdyLldvcmtzcGFjZVN0YXRlIHwgdW5kZWZpbmVkLCBvdmVycmlkZXI6IENvbW1hbmRPdmVycmlkZXIpOiBzdHJpbmdbXSB7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybiBbXTtcbiAgaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIGNvbnN0IGF2YWlsYWJsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBkciA9IHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaztcbiAgICBpZiAoZHIgPT0gbnVsbCB8fCBkci5jbGkgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IFtwa2dGaWxlUGF0aCwgZnVuY05hbWVdID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG5cbiAgICBhdmFpbGFibGVzLnB1c2gocGsubmFtZSk7XG5cbiAgICB0cnkge1xuICAgICAgb3ZlcnJpZGVyLmZvclBhY2thZ2UocGssIHBrZ0ZpbGVQYXRoLCBmdW5jTmFtZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uIGluIHBhY2thZ2UgJHtway5uYW1lfTogXCIkeyhlIGFzIEVycm9yKS5tZXNzYWdlfVwiYCwgZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhdmFpbGFibGVzO1xufVxuXG5mdW5jdGlvbiBhZGROcG1JbnN0YWxsT3B0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgY21kLm9wdGlvbignLS1jYWNoZSA8bnBtLWNhY2hlPicsICdzYW1lIGFzIG5wbSBpbnN0YWxsIG9wdGlvbiBcIi0tY2FjaGVcIicpXG4gIC5vcHRpb24oJy0tY2ksIC0tdXNlLWNpJywgJ1VzZSBcIm5wbSBjaVwiIGluc3RlYWQgb2YgXCJucG0gaW5zdGFsbFwiIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0tb2ZmbGluZScsICdzYW1lIGFzIG5wbSBvcHRpb24gXCItLW9mZmxpbmVcIiBkdXJpbmcgZXhlY3V0aW5nIG5wbSBpbnN0YWxsL2NpICcsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrUGxpbmtWZXJzaW9uKCkge1xuICBjb25zdCBwa2pzb24gPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAncGFja2FnZS5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBranNvbikpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtqc29uLCAndXRmOCcpKSBhcyB7ZGVwZW5kZW5jaWVzPzoge1twOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWR9OyBkZXZEZXBlbmRlbmNpZXM/OiB7W3A6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH19O1xuICAgIGxldCBkZXBWZXIgPSBqc29uLmRlcGVuZGVuY2llcyAmJiBqc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddIHx8XG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyAmJiBqc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgIGlmIChkZXBWZXIgPT0gbnVsbCkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZygnRG9uXFwndCBmb3JnZXQgdG8gYWRkIEB3ZmgvcGxpbmsgaW4gcGFja2FnZS5qc29uIGFzIGRlcGVuZGVuY2llcycpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRlcFZlci5lbmRzV2l0aCgnLnRneicpKSB7XG4gICAgICBjb25zdCBtYXRjaGVkID0gLy0oXFxkK1xcLlxcZCtcXC5bXl0rPylcXC50Z3okLy5leGVjKGRlcFZlcik7XG4gICAgICBpZiAobWF0Y2hlZCA9PSBudWxsKVxuICAgICAgICByZXR1cm47XG4gICAgICBkZXBWZXIgPSBtYXRjaGVkWzFdO1xuICAgIH1cbiAgICBpZiAoZGVwVmVyICYmICFzZW12ZXIuc2F0aXNmaWVzKHBrLnZlcnNpb24sIGRlcFZlcikpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoYExvY2FsIGluc3RhbGxlZCBQbGluayB2ZXJzaW9uICR7Y2hhbGsuY3lhbihway52ZXJzaW9uKX0gZG9lcyBub3QgbWF0Y2ggZGVwZW5kZW5jeSB2ZXJzaW9uICR7Y2hhbGsuZ3JlZW4oZGVwVmVyKX0gaW4gcGFja2FnZS5qc29uLCBgICtcbiAgICAgICAgYHJ1biBjb21tYW5kIFwiJHtjaGFsay5ncmVlbigncGxpbmsgdXBncmFkZScpfVwiIHRvIHVwZ3JhZGUgb3IgZG93bmdyYWRlIHRvIGV4cGVjdGVkIHZlcnNpb25gKSk7XG4gICAgfVxuICB9XG59XG5cbiJdfQ==