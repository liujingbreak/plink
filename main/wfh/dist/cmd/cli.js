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
exports.withGlobalOptions = exports.createCommands = void 0;
/// <reference path="./cfont.d.ts" />
// tslint:disable: max-line-length
const commander_1 = __importDefault(require("commander"));
const chalk_1 = __importDefault(require("chalk"));
// import '../tsc-packages-slice';
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const misc_1 = require("../utils/misc");
const process_utils_1 = require("../process-utils");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
// import Path from 'path';
const pk = require('../../../package');
// const WIDTH = 130;
const arrayOptionFn = (curr, prev) => {
    if (prev)
        prev.push(curr);
    return prev;
};
function createCommands(startTime) {
    return __awaiter(this, void 0, void 0, function* () {
        process.title = 'Plink';
        // const {stateFactory}: typeof store = require('../store');
        yield Promise.resolve().then(() => __importStar(require('./cli-slice')));
        // stateFactory.configureStore();
        let cliExtensions;
        const program = new commander_1.default.Command('plink')
            .description(chalk_1.default.cyan('A pluggable monorepo and multi-repo management tool'))
            .action(args => {
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
        });
        program.version(pk.version, '-v, --vers', 'output the current version');
        program.addHelpCommand('help [command]', 'show help information, same as "-h". ');
        let wsState;
        if (process.env.PLINK_SAFE !== 'true') {
            const { getState: getPkgState, workspaceKey } = require('../package-mgr');
            wsState = getPkgState().workspaces.get(workspaceKey(process.cwd()));
            if (wsState != null) {
                spaceOnlySubWfhCommand(program);
            }
        }
        subWfhCommand(program);
        if (process.env.PLINK_SAFE !== 'true') {
            cliExtensions = loadExtensionCommand(program, wsState);
        }
        else {
            // tslint:disable-next-line: no-console
            console.log('Value of environment varaible "PLINK_SAFE" is true, skip loading extension');
        }
        try {
            yield program.parseAsync(process.argv, { from: 'node' });
        }
        catch (e) {
            console.error(chalk_1.default.redBright(e), e.stack);
            process.exit(1);
        }
    });
}
exports.createCommands = createCommands;
function subWfhCommand(program) {
    /** command init
     */
    const initCmd = program.command('init [workspace-directory]')
        .description('Initialize workspace directory, generate basic configuration files for project and component packages')
        .option('-f, --force', 'Force run "npm install" in specific workspace directory', false)
        .option('--lint-hook, --lh', 'Create a git push hook for code lint', false)
        // .option('--yarn', 'Use Yarn to install component peer dependencies instead of using NPM', false)
        .option('--production', 'Add "--production" or "--only=prod" command line argument to "yarn/npm install"', false)
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log(misc_1.sexyFont('PLink').string);
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-init')))).default(initCmd.opts(), workspace);
    }));
    withGlobalOptions(initCmd);
    const updateDirCmd = program.command('update-dir')
        .description('Run this command to sync internal state when whole workspace directory is renamed or moved.\n' +
        'Because we store absolute path info of each package in internal state, these information becomes invalid once you rename or moved directory')
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-ls')))).checkDir(updateDirCmd.opts());
    }));
    withGlobalOptions(updateDirCmd);
    /**
     * command project
     */
    program.command('project [add|remove] [project-dir...]')
        .description('Associate, disassociate or list associated project folders')
        .action((action, projectDir) => __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log(misc_1.sexyFont('PLink').string);
        (yield Promise.resolve().then(() => __importStar(require('./cli-project')))).default(action, projectDir);
    }));
    /**
     * command lint
     */
    const lintCmd = program.command('lint [package...]')
        .description('source code style check')
        .option('--pj <project1,project2...>', 'lint only TS code from specific project', arrayOptionFn, [])
        .option('--fix', 'Run eslint/tslint fix, this could cause your source code being changed unexpectedly', false)
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-lint')))).default(packages, lintCmd.opts());
    }));
    withGlobalOptions(lintCmd);
    lintCmd.usage(lintCmd.usage() +
        hl('\ndrcp lint --pj <project-dir..> [--fix]') + ' Lint TS files from specific project directory\n' +
        hl('\ndrcp lint <component-package..> [--fix]') + ' Lint TS files from specific component packages');
    /**
     * command clean
     */
    program.command('cs').alias('clear-symlinks')
        .description('Clear symlinks from node_modules, always do this before run "npm install" in root directory')
        // .option('--only-symlink', 'Clean only symlinks, not dist directory', false)
        .action(() => __awaiter(this, void 0, void 0, function* () {
        const scanNodeModules = require('../utils/symlinks').default;
        yield scanNodeModules('all');
    }));
    program.command('upgrade')
        .description('Reinstall local Plink to the version specified in package.json')
        .action(() => __awaiter(this, void 0, void 0, function* () {
        const scanNodeModules = require('../utils/symlinks').default;
        yield scanNodeModules('all');
        const env = Object.assign(Object.assign({}, process.env), { NODE_ENV: 'development' });
        yield process_utils_1.exe('npm', 'i', { env }).promise;
        yield new Promise(resolve => process.nextTick(resolve));
        yield process_utils_1.exe('npm', 'ddp', { env }).promise;
    }));
    program.command('dockerize <workspace-dir>')
        .description('[TBI] Generate Dockerfile for specific workspace directory, and generate docker image');
    program.command('pkg <workspace-dir>')
        .description('[TBI] Use Pkg (https://github.com/vercel/pkg) to package Node.js project into an executable ');
    /**
     * command ls
     */
    const listCmd = program.command('ls').alias('list')
        .option('-j, --json', 'list linked dependencies in form of JSON', false)
        .description('If you want to know how many packages will actually run, this command prints out a list and the priorities, including installed packages')
        .action(() => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-ls')))).default(listCmd.opts());
    }));
    withGlobalOptions(listCmd);
    /**
     * Bump command
     */
    const bumpCmd = program.command('bump [package...]')
        .description('bump package.json version number for specific package, same as "npm version" does')
        .option('--pj, --project <project-dir,...>', 'only bump component packages from specific project directory', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
    }, [])
        .option('-i, --incre-version <major | minor | patch | premajor | preminor | prepatch | prerelease>', 'version increment, valid values are: major, minor, patch, prerelease', 'patch')
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-bump')))).default(Object.assign(Object.assign({}, bumpCmd.opts()), { packages }));
    }));
    withGlobalOptions(bumpCmd);
    // bumpCmd.usage(bumpCmd.usage() + '\n' + hl('plink bump <package> ...') + ' to recursively bump package.json from multiple directories\n' +
    //   hl('plink bump <dir> -i minor') + ' to bump minor version number, default is patch number');
    /**
     * Pack command
     */
    const packCmd = program.command('pack [package...]')
        .description('npm pack every pakage into tarball files')
        .option('--dir <package directory>', 'pack packages by specifying directories', arrayOptionFn, [])
        .option('-w,--workspace <workspace-dir>', 'pack packages which are linked as dependency of specific workspaces', arrayOptionFn, [])
        .option('--pj, --project <project-dir>', 'project directories to be looked up for all packages which need to be packed to tarball files', arrayOptionFn, [])
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-pack')))).pack(Object.assign(Object.assign({}, packCmd.opts()), { packages }));
    }));
    withGlobalOptions(packCmd);
    packCmd.usage(packCmd.usage() + '\nBy default, run "npm pack" for each linked package which are dependencies of current workspace');
    /**
     * Pack command
     */
    const publishCmd = program.command('publish [package...]')
        .description('run npm publish')
        .option('--dir <package directory>', 'publish packages by specifying directories', arrayOptionFn, [])
        .option('--pj, --project <project-dir,...>', 'project directories to be looked up for all packages which need to be packed to tarball files', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
    }, [])
        .option('-w,--workspace <workspace-dir>', 'publish packages which are linked as dependency of specific workspaces', arrayOptionFn, [])
        .option('--public', 'same as "npm publish" command option "--access public"', false)
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-pack')))).publish(Object.assign(Object.assign({}, publishCmd.opts()), { packages }));
    }));
    withGlobalOptions(publishCmd);
    const analysisCmd = program.command('analyse')
        .description('Use Typescript compiler to parse source code, draw a dependence graph with DFS algarithm')
        // .option('-d, --dir <directory>',
        //   'specific target directory instead of packages, target can be any directory that contains JS/TS files',
        //   arrayOptionFn, [])
        .option('-f, --file <file>', 'specific target TS/JS(X) files (multiple file with more options "-f <file> -f <glob>")', arrayOptionFn, [])
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        return (yield Promise.resolve().then(() => __importStar(require('./cli-analyse')))).default(packages, analysisCmd.opts());
    }));
    analysisCmd.usage(analysisCmd.usage() + '\n' +
        'e.g.\n  ' + chalk_1.default.blue('plink analyse -f "packages/foobar1/**/*" -f packages/foobar2/ts/main.ts'));
    withGlobalOptions(analysisCmd);
}
function spaceOnlySubWfhCommand(program) {
    /** command run*/
    const runCmd = program.command('run <target> [arguments...]')
        .description('Run specific module\'s exported function\n')
        .action((target, args) => __awaiter(this, void 0, void 0, function* () {
        const config = yield (yield Promise.resolve().then(() => __importStar(require('../config')))).default;
        yield config.init(runCmd.opts());
        const logConfig = yield (yield Promise.resolve().then(() => __importStar(require('../log-config')))).default;
        logConfig(config());
        yield (yield Promise.resolve().then(() => __importStar(require('../package-runner')))).runSinglePackage({ target, args });
    }));
    withGlobalOptions(runCmd);
    runCmd.usage(runCmd.usage() + '\n' + chalk_1.default.green('plink run <target> [arguments...]\n') +
        `e.g.\n  ${chalk_1.default.green('plink run forbar-package/dist/file#function argument1 argument2...')}\n` +
        'execute exported function of TS/JS file from specific package or path\n\n' +
        '<target> - JS or TS file module path which can be resolved by Node.js (ts-node) followed by "#" and exported function name,\n' +
        'e.g. \n' +
        chalk_1.default.green('package-name/dist/foobar.js#myFunction') +
        ', function can be async which returns Promise\n' +
        chalk_1.default.green('node_modules/package-dir/dist/foobar.ts#myFunction') +
        ', relative or absolute path\n');
    /**
     * tsc command
     */
    const tscCmd = program.command('tsc [package...]')
        .description('Run Typescript compiler')
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
        const config = yield (yield Promise.resolve().then(() => __importStar(require('../config')))).default;
        yield config.init(tscCmd.opts());
        const logConfig = yield (yield Promise.resolve().then(() => __importStar(require('../log-config')))).default;
        logConfig(config());
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
    withGlobalOptions(tscCmd);
    tscCmd.usage(tscCmd.usage() + '\n' + 'Run gulp-typescript to compile Node.js side Typescript files.\n\n' +
        'It compiles \n  "<package-directory>/ts/**/*.ts" to "<package-directory>/dist",\n' +
        '  or\n  "<package-directory>/isom/**/*.ts" to "<package-directory>/isom"\n for all @wfh packages.\n' +
        'I suggest to put Node.js side TS code in directory `ts`, and isomorphic TS code (meaning it runs in ' +
        'both Node.js and Browser) in directory `isom`.\n' +
        hlDesc('plink tsc\n') + 'Compile linked packages that are dependencies of current workspace (you shall run this command only in a workspace directory)\n' +
        hlDesc('plink tsc <package..>\n') + ' Only compile specific packages by providing package name or short name\n' +
        hlDesc('plink tsc [package...] -w\n') + ' Watch packages change and compile when new typescript file is changed or created\n\n');
}
function loadExtensionCommand(program, ws) {
    if (ws == null)
        return [];
    const origPgmCommand = program.command;
    let filePath = null;
    // const cmdInfoPacks = new Array<Parameters<typeof cliStore.cliActionDispatcher.updateLoadedCmd>[0] extends (infer I)[] ? I : unknown>(1);
    const loadedCmdMap = new Map();
    const availables = [];
    for (const pk of package_list_helper_1.packages4Workspace()) {
        const dr = pk.json.dr;
        if (dr == null || dr.cli == null)
            continue;
        const [pkgFilePath, funcName] = dr.cli.split('#');
        // if (!_.has(ws.originInstallJson.dependencies, extension.pkName) && !_.has(ws.originInstallJson.devDependencies, extension.pkName))
        //   continue;
        availables.push(pk.name);
        try {
            filePath = require.resolve(pk.name + '/' + pkgFilePath);
        }
        catch (e) { }
        if (filePath != null) {
            program.command = function (nameAndArgs, ...restArgs) {
                const cmdName = /^\S+/.exec(nameAndArgs)[0];
                if (loadedCmdMap.has(cmdName)) {
                    throw new Error(`Conflict command name ${cmdName} from extensions "${filePath}" and "${loadedCmdMap.get(cmdName)}"`);
                }
                loadedCmdMap.set(cmdName, filePath);
                // cmdInfoPacks[0] = {cmd: cmdName, file: filePath!};
                // cliStore.cliActionDispatcher.updateLoadedCmd(cmdInfoPacks);
                // tslint:disable-next-line: no-console
                // console.log(`Loading command "${cmdName}" from extension ${filePath}`);
                const subCmd = origPgmCommand.call(this, nameAndArgs, ...restArgs);
                const originDescFn = subCmd.description;
                subCmd.description = function (str, ...remainder) {
                    str = chalk_1.default.blue(`[${pk.name}]`) + ' ' + str;
                    return originDescFn.call(this, str, ...remainder);
                };
                return subCmd;
            };
            try {
                const subCmdFactory = funcName ? require(filePath)[funcName] :
                    require(filePath);
                subCmdFactory(program, withGlobalOptions);
            }
            catch (e) {
                // tslint:disable-next-line: no-console
                console.error(`Failed to load command line extension in package ${pk.name}: "${e.message}"`);
            }
        }
    }
    return availables;
}
function hl(text) {
    return chalk_1.default.green(text);
}
function hlDesc(text) {
    return chalk_1.default.gray(text);
}
function withGlobalOptions(program) {
    program.option('-c, --config <config-file>', hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'), (value, prev) => { prev.push(...value.split(',')); return prev; }, [])
        .option('--prop <property-path=value as JSON | literal>', hlDesc('<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n') +
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
        '--prop arraylike.prop[0]=foobar\n' +
        '--prop ["@wfh/foo.bar","prop",0]=true', arrayOptionFn, []);
    // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));
    return program;
}
exports.withGlobalOptions = withGlobalOptions;
let versionChecked = false;
process.on('beforeExit', () => {
    if (versionChecked)
        return;
    versionChecked = true;
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
            const matched = /-(\d+\.\d+\.[^.]+)\.tgz$/.exec(depVer);
            if (matched == null)
                return;
            depVer = matched[1];
        }
        if (depVer && !semver_1.default.satisfies(pk.version, depVer)) {
            // tslint:disable-next-line: no-console
            console.log(misc_1.boxString(`Please run commands to re-install local Plink v${pk.version}, expected is v${depVer}:\n\n` +
                '  plink upgrade'));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLGtDQUFrQztBQUNsQywwREFBa0M7QUFDbEMsa0RBQTBCO0FBSTFCLGtDQUFrQztBQUNsQyw0RUFBc0U7QUFFdEUsd0NBQStFO0FBRS9FLG9EQUFxQztBQUNyQyw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLG9EQUE0QjtBQUM1QiwyQkFBMkI7QUFDM0IsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDdkMscUJBQXFCO0FBRXJCLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsY0FBYyxDQUFDLFNBQWlCOztRQUNwRCxPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztRQUN4Qiw0REFBNEQ7UUFDNUQsd0RBQWEsYUFBYSxHQUFDLENBQUM7UUFDNUIsaUNBQWlDO1FBR2pDLElBQUksYUFBbUMsQ0FBQztRQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUM3QyxXQUFXLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO2FBQzlFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNiLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0Qyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztZQUN2Qyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxPQUFPLElBQUksb0JBQWEsQ0FBQyxDQUFDLENBQUMsZUFBSyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM3RixJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDN0MsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsYUFBYSxDQUFDLE1BQU0seUJBQXlCO29CQUNsRSxHQUFHLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDcEc7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUN4RSxPQUFPLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLHVDQUF1QyxDQUFDLENBQUM7UUFFbEYsSUFBSSxPQUEwQyxDQUFDO1FBQy9DLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEtBQUssTUFBTSxFQUFFO1lBQ3JDLE1BQU0sRUFBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBa0IsQ0FBQztZQUN6RixPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNwRSxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7Z0JBQ25CLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2pDO1NBQ0Y7UUFFRCxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxNQUFNLEVBQUU7WUFDckMsYUFBYSxHQUFHLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUN4RDthQUFNO1lBQ0wsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEVBQTRFLENBQUMsQ0FBQztTQUMzRjtRQUVELElBQUk7WUFDRixNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO1NBQ3hEO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixPQUFPLENBQUMsS0FBSyxDQUFDLGVBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7SUFDSCxDQUFDO0NBQUE7QUFsREQsd0NBa0RDO0FBRUQsU0FBUyxhQUFhLENBQUMsT0FBMEI7SUFDL0M7T0FDRztJQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUM7U0FDNUQsV0FBVyxDQUFDLHVHQUF1RyxDQUFDO1NBQ3BILE1BQU0sQ0FBQyxhQUFhLEVBQUUseURBQXlELEVBQUUsS0FBSyxDQUFDO1NBQ3ZGLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxzQ0FBc0MsRUFBRSxLQUFLLENBQUM7UUFDM0UsbUdBQW1HO1NBQ2xHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsaUZBQWlGLEVBQUUsS0FBSyxDQUFDO1NBQ2hILE1BQU0sQ0FBQyxDQUFPLFNBQWtCLEVBQUUsRUFBRTtRQUNuQyx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLHdEQUFhLFlBQVksR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQXVCLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTNCLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO1NBQ2pELFdBQVcsQ0FBQywrRkFBK0Y7UUFDNUcsNklBQTZJLENBQUM7U0FDN0ksTUFBTSxDQUFDLENBQU8sU0FBaUIsRUFBRSxFQUFFO1FBQ2xDLE1BQU0sQ0FBQyx3REFBYSxVQUFVLEdBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUN4RSxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0gsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFaEM7O09BRUc7SUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDO1NBQ3ZELFdBQVcsQ0FBQyw0REFBNEQsQ0FBQztTQUN6RSxNQUFNLENBQUMsQ0FBTyxNQUFnQyxFQUFFLFVBQW9CLEVBQUUsRUFBRTtRQUN2RSx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEMsQ0FBQyx3REFBYSxlQUFlLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVIOztPQUVHO0lBQ0gsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztTQUNuRCxXQUFXLENBQUMseUJBQXlCLENBQUM7U0FDdEMsTUFBTSxDQUFDLDZCQUE2QixFQUFFLHlDQUF5QyxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDbkcsTUFBTSxDQUFDLE9BQU8sRUFBRSxxRkFBcUYsRUFBRSxLQUFLLENBQUM7U0FDN0csTUFBTSxDQUFDLENBQU0sUUFBUSxFQUFDLEVBQUU7UUFDdkIsTUFBTSxDQUFDLHdEQUFhLFlBQVksR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUM5RSxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0gsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO1FBQzNCLEVBQUUsQ0FBQywwQ0FBMEMsQ0FBQyxHQUFHLGtEQUFrRDtRQUNuRyxFQUFFLENBQUMsMkNBQTJDLENBQUMsR0FBRyxpREFBaUQsQ0FBQyxDQUFDO0lBRXZHOztPQUVHO0lBQ0gsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7U0FDNUMsV0FBVyxDQUFDLDZGQUE2RixDQUFDO1FBQzNHLDhFQUE4RTtTQUM3RSxNQUFNLENBQUMsR0FBUyxFQUFFO1FBQ2pCLE1BQU0sZUFBZSxHQUE0QixPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDdEYsTUFBTSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1NBQ3pCLFdBQVcsQ0FBQyxnRUFBZ0UsQ0FBQztTQUM3RSxNQUFNLENBQUMsR0FBUyxFQUFFO1FBQ2pCLE1BQU0sZUFBZSxHQUE0QixPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDdEYsTUFBTSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsTUFBTSxHQUFHLG1DQUFPLE9BQU8sQ0FBQyxHQUFHLEtBQUUsUUFBUSxFQUFFLGFBQWEsR0FBQyxDQUFDO1FBQ3RELE1BQU0sbUJBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDckMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN4RCxNQUFNLG1CQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFDLEdBQUcsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3pDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDO1NBQzNDLFdBQVcsQ0FBQyx1RkFBdUYsQ0FBQyxDQUFDO0lBRXRHLE9BQU8sQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUM7U0FDckMsV0FBVyxDQUFDLDhGQUE4RixDQUFDLENBQUM7SUFFN0c7O09BRUc7SUFDSCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7U0FDbEQsTUFBTSxDQUFDLFlBQVksRUFBRSwwQ0FBMEMsRUFBRSxLQUFLLENBQUM7U0FDdkUsV0FBVyxDQUFDLDBJQUEwSSxDQUFDO1NBQ3ZKLE1BQU0sQ0FBQyxHQUFTLEVBQUU7UUFDakIsTUFBTSxDQUFDLHdEQUFhLFVBQVUsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQVMsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUzQjs7T0FFRztJQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7U0FDakQsV0FBVyxDQUFDLG1GQUFtRixDQUFDO1NBQ2hHLE1BQU0sQ0FBVyxtQ0FBbUMsRUFBRSw4REFBOEQsRUFDbkgsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQUMsT0FBTyxJQUFJLENBQUM7SUFDOUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUNQLE1BQU0sQ0FBQywyRkFBMkYsRUFDakcsc0VBQXNFLEVBQUUsT0FBTyxDQUFDO1NBQ2pGLE1BQU0sQ0FBQyxDQUFPLFFBQWtCLEVBQUUsRUFBRTtRQUNuQyxDQUFDLHdEQUFhLFlBQVksR0FBQyxDQUFDLENBQUMsT0FBTyxpQ0FBSyxPQUFPLENBQUMsSUFBSSxFQUFvQixLQUFFLFFBQVEsSUFBRSxDQUFDO0lBQ3hGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzQiw0SUFBNEk7SUFDNUksaUdBQWlHO0lBRWpHOztPQUVHO0lBQ0gsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztTQUNqRCxXQUFXLENBQUMsMENBQTBDLENBQUM7U0FDdkQsTUFBTSxDQUFDLDJCQUEyQixFQUFFLHlDQUF5QyxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDakcsTUFBTSxDQUFDLGdDQUFnQyxFQUFFLHFFQUFxRSxFQUM3RyxhQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ25CLE1BQU0sQ0FBQywrQkFBK0IsRUFDckMsK0ZBQStGLEVBQy9GLGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDbkIsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1FBQ25DLE1BQU0sQ0FBQyx3REFBYSxZQUFZLEdBQUMsQ0FBQyxDQUFDLElBQUksaUNBQUssT0FBTyxDQUFDLElBQUksRUFBb0IsS0FBRSxRQUFRLElBQUUsQ0FBQztJQUMzRixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsa0dBQWtHLENBQUMsQ0FBQztJQUVwSTs7T0FFRztJQUNILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUM7U0FDdkQsV0FBVyxDQUFDLGlCQUFpQixDQUFDO1NBQzlCLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSw0Q0FBNEMsRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ3BHLE1BQU0sQ0FBVyxtQ0FBbUMsRUFDckQsK0ZBQStGLEVBQzdGLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUFDLE9BQU8sSUFBSSxDQUFDO0lBQzlDLENBQUMsRUFBRSxFQUFFLENBQUM7U0FDUCxNQUFNLENBQUMsZ0NBQWdDLEVBQUUsd0VBQXdFLEVBQ2hILGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDbkIsTUFBTSxDQUFDLFVBQVUsRUFBRSx3REFBd0QsRUFBRSxLQUFLLENBQUM7U0FDbkYsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1FBQ25DLE1BQU0sQ0FBQyx3REFBYSxZQUFZLEdBQUMsQ0FBQyxDQUFDLE9BQU8saUNBQUssVUFBVSxDQUFDLElBQUksRUFBdUIsS0FBRSxRQUFRLElBQUUsQ0FBQztJQUNwRyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFOUIsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDM0MsV0FBVyxDQUFDLDBGQUEwRixDQUFDO1FBQ3hHLG1DQUFtQztRQUNuQyw0R0FBNEc7UUFDNUcsdUJBQXVCO1NBQ3RCLE1BQU0sQ0FBQyxtQkFBbUIsRUFDekIsd0ZBQXdGLEVBQUUsYUFBYSxFQUFFLEVBQUUsQ0FBQztTQUM3RyxNQUFNLENBQUMsQ0FBTyxRQUFrQixFQUFFLEVBQUU7UUFDbkMsT0FBTyxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUF1QixDQUFDLENBQUM7SUFDcEcsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVMLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUk7UUFDMUMsVUFBVSxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMseUVBQXlFLENBQUMsQ0FBQyxDQUFDO0lBQ3RHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2pDLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLE9BQTBCO0lBQ3hELGlCQUFpQjtJQUNqQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDO1NBQzVELFdBQVcsQ0FBQyw0Q0FBNEMsQ0FBQztTQUN6RCxNQUFNLENBQUMsQ0FBTyxNQUFjLEVBQUUsSUFBYyxFQUFFLEVBQUU7UUFDL0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLHdEQUFhLFdBQVcsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3pELE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFzQixDQUFDLENBQUM7UUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ2hFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyx3REFBYSxtQkFBbUIsR0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0gsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxHQUFHLGVBQUssQ0FBQyxLQUFLLENBQUMscUNBQXFDLENBQUM7UUFDdkYsV0FBVyxlQUFLLENBQUMsS0FBSyxDQUFDLG9FQUFvRSxDQUFDLElBQUk7UUFDaEcsMkVBQTJFO1FBQzNFLCtIQUErSDtRQUMvSCxTQUFTO1FBQ1QsZUFBSyxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQztRQUNyRCxpREFBaUQ7UUFDakQsZUFBSyxDQUFDLEtBQUssQ0FBQyxvREFBb0QsQ0FBQztRQUNqRSwrQkFBK0IsQ0FBQyxDQUFDO0lBR2pDOztPQUVHO0lBQ0gsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztTQUNqRCxXQUFXLENBQUMseUJBQXlCLENBQUM7U0FDdEMsTUFBTSxDQUFDLGFBQWEsRUFBRSxnQ0FBZ0MsRUFBRSxLQUFLLENBQUM7U0FDOUQsTUFBTSxDQUFDLG1DQUFtQyxFQUFFLHlDQUF5QyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ2xHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFBQyxPQUFPLElBQUksQ0FBQztJQUMxQyxDQUFDLEVBQUUsRUFBYyxDQUFDO1FBQ2xCLGdJQUFnSTtRQUNoSSx1QkFBdUI7U0FDdEIsTUFBTSxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxLQUFLLENBQUM7U0FDM0MsTUFBTSxDQUFDLDZCQUE2QixFQUFFLDBGQUEwRixFQUFFLEtBQUssQ0FBQztTQUN4SSxNQUFNLENBQUMsNEJBQTRCLEVBQUUsc0NBQXNDLEVBQUUsUUFBUSxDQUFDO1NBQ3RGLE1BQU0sQ0FBQyxrREFBa0QsRUFDeEQsaURBQWlEO1FBQ2pELCtEQUErRCxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQzdFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFBQyxPQUFPLElBQUksQ0FBQztJQUMxQyxDQUFDLEVBQUUsRUFBYyxDQUFDO1NBQ2pCLE1BQU0sQ0FBQyxDQUFPLFFBQWtCLEVBQUUsRUFBRTtRQUNuQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFMUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLHdEQUFhLFdBQVcsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3pELE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFzQixDQUFDLENBQUM7UUFDckQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ2hFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sR0FBRyxHQUFHLHdEQUFhLFdBQVcsR0FBQyxDQUFDO1FBRXRDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQztZQUNaLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTztZQUNwQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7WUFDaEIsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTO1lBQ3hCLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRztZQUNaLEVBQUUsRUFBRSxHQUFHLENBQUMsbUJBQW1CO1lBQzNCLFVBQVUsRUFBRSxHQUFHLENBQUMsb0JBQW9CO1NBQ3JDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxQixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLEdBQUcsbUVBQW1FO1FBQ3hHLG1GQUFtRjtRQUNuRixxR0FBcUc7UUFDckcsc0dBQXNHO1FBQ3RHLGtEQUFrRDtRQUNsRCxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQUcsaUlBQWlJO1FBQ3pKLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLDJFQUEyRTtRQUMvRyxNQUFNLENBQUMsNkJBQTZCLENBQUMsR0FBRyx1RkFBdUYsQ0FBQyxDQUFDO0FBQ25JLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLE9BQTBCLEVBQUUsRUFBcUM7SUFDN0YsSUFBSSxFQUFFLElBQUksSUFBSTtRQUNaLE9BQU8sRUFBRSxDQUFDO0lBRVosTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztJQUV2QyxJQUFJLFFBQVEsR0FBa0IsSUFBSSxDQUFDO0lBRW5DLDJJQUEySTtJQUMzSSxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUUvQyxNQUFNLFVBQVUsR0FBYSxFQUFFLENBQUM7SUFDaEMsS0FBSyxNQUFNLEVBQUUsSUFBSSx3Q0FBa0IsRUFBRSxFQUFFO1FBQ3JDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3RCLElBQUksRUFBRSxJQUFJLElBQUksSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLElBQUk7WUFDOUIsU0FBUztRQUNYLE1BQU0sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLEdBQUksRUFBRSxDQUFDLEdBQWMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUQscUlBQXFJO1FBQ3JJLGNBQWM7UUFFZCxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QixJQUFJO1lBQ0YsUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUM7U0FDekQ7UUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFO1FBRWQsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ3BCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsVUFBK0IsV0FBbUIsRUFBRSxHQUFHLFFBQWU7Z0JBQ3RGLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsT0FBTyxxQkFBcUIsUUFBUSxVQUFVLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2lCQUN0SDtnQkFDRCxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxRQUFTLENBQUMsQ0FBQztnQkFDckMscURBQXFEO2dCQUNyRCw4REFBOEQ7Z0JBQzlELHVDQUF1QztnQkFDdkMsMEVBQTBFO2dCQUMxRSxNQUFNLE1BQU0sR0FBc0MsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUM7Z0JBQ3RHLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBQ3hDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsVUFBa0QsR0FBVyxFQUFFLEdBQUcsU0FBZ0I7b0JBQ3JHLEdBQUcsR0FBRyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztvQkFDN0MsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztnQkFDcEQsQ0FBUSxDQUFDO2dCQUNULE9BQU8sTUFBTSxDQUFDO1lBQ2hCLENBQVEsQ0FBQztZQUNULElBQUk7Z0JBQ0YsTUFBTSxhQUFhLEdBQW9CLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQzdFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDcEIsYUFBYSxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO2FBQzNDO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLG9EQUFvRCxFQUFFLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO2FBQzlGO1NBQ0Y7S0FDRjtJQUNELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFFRCxTQUFTLEVBQUUsQ0FBQyxJQUFZO0lBQ3RCLE9BQU8sZUFBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsSUFBWTtJQUMxQixPQUFPLGVBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLE9BQTBCO0lBQzFELE9BQU8sQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQ3pDLE1BQU0sQ0FBQyx1RkFBdUYsQ0FBQyxFQUMvRixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBLENBQUMsRUFBRSxFQUFjLENBQUM7U0FDbEYsTUFBTSxDQUFDLGdEQUFnRCxFQUN0RCxNQUFNLENBQUMsOElBQThJLENBQUM7UUFDdEosc0ZBQXNGO1FBQ3RGLHNGQUFzRjtRQUN0RixtQ0FBbUM7UUFDbkMsdUNBQXVDLEVBQ3ZDLGFBQWEsRUFBRSxFQUFjLENBQUMsQ0FBQztJQUNqQyxpRkFBaUY7SUFFakYsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQWRELDhDQWNDO0FBRUQsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO0FBQzNCLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUM1QixJQUFJLGNBQWM7UUFDaEIsT0FBTztJQUNULGNBQWMsR0FBRyxJQUFJLENBQUM7SUFDdEIsaUJBQWlCLEVBQUUsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQztBQUVILFNBQVMsaUJBQWlCO0lBQ3hCLE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzFELElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUN6QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekQsSUFBSSxNQUFNLEdBQVcsSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztZQUN2RSxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDN0QsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFTLENBQUMsaUVBQWlFLENBQUMsQ0FBQyxDQUFDO1lBQzFGLE9BQU87U0FDUjtRQUNELElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMzQixNQUFNLE9BQU8sR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEQsSUFBSSxPQUFPLElBQUksSUFBSTtnQkFDakIsT0FBTztZQUNULE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckI7UUFDRCxJQUFJLE1BQU0sSUFBSSxDQUFDLGdCQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDbkQsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQVMsQ0FBQyxrREFBa0QsRUFBRSxDQUFDLE9BQU8sa0JBQWtCLE1BQU0sT0FBTztnQkFDL0csaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1NBQ3ZCO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY2ZvbnQuZC50c1wiIC8+XG4vLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0ICogYXMgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICcuLi90c2MtcGFja2FnZXMtc2xpY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgaXNEcmNwU3ltbGluaywgc2V4eUZvbnQsIGdldFJvb3REaXIsIGJveFN0cmluZyB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IF9zY2FuTm9kZU1vZHVsZXMgZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtleGV9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHNlbXZlciBmcm9tICdzZW12ZXInO1xuLy8gaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UnKTtcbi8vIGNvbnN0IFdJRFRIID0gMTMwO1xuXG5jb25zdCBhcnJheU9wdGlvbkZuID0gKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpID0+IHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21tYW5kcyhzdGFydFRpbWU6IG51bWJlcikge1xuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rJztcbiAgLy8gY29uc3Qge3N0YXRlRmFjdG9yeX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gIGF3YWl0IGltcG9ydCgnLi9jbGktc2xpY2UnKTtcbiAgLy8gc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG5cblxuICBsZXQgY2xpRXh0ZW5zaW9uczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoJ3BsaW5rJylcbiAgLmRlc2NyaXB0aW9uKGNoYWxrLmN5YW4oJ0EgcGx1Z2dhYmxlIG1vbm9yZXBvIGFuZCBtdWx0aS1yZXBvIG1hbmFnZW1lbnQgdG9vbCcpKVxuICAuYWN0aW9uKGFyZ3MgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2cocHJvZ3JhbS5oZWxwSW5mb3JtYXRpb24oKSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYFxcbnZlcnNpb246ICR7cGsudmVyc2lvbn0gJHtpc0RyY3BTeW1saW5rID8gY2hhbGsueWVsbG93KCcoc3ltbGlua2VkKScpIDogJyd9IGApO1xuICAgIGlmIChjbGlFeHRlbnNpb25zICYmIGNsaUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtjbGlFeHRlbnNpb25zLmxlbmd0aH0gY29tbWFuZCBsaW5lIGV4dGVuc2lvbmAgK1xuICAgICAgYCR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiAke2NsaUV4dGVuc2lvbnMubWFwKHBrZyA9PiBjaGFsay5ibHVlKHBrZykpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuICB9KTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcbiAgcHJvZ3JhbS5hZGRIZWxwQ29tbWFuZCgnaGVscCBbY29tbWFuZF0nLCAnc2hvdyBoZWxwIGluZm9ybWF0aW9uLCBzYW1lIGFzIFwiLWhcIi4gJyk7XG5cbiAgbGV0IHdzU3RhdGU6IHBrZ01nci5Xb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIGNvbnN0IHtnZXRTdGF0ZTogZ2V0UGtnU3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa2dNZ3I7XG4gICAgd3NTdGF0ZSA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKTtcbiAgICBpZiAod3NTdGF0ZSAhPSBudWxsKSB7XG4gICAgICBzcGFjZU9ubHlTdWJXZmhDb21tYW5kKHByb2dyYW0pO1xuICAgIH1cbiAgfVxuXG4gIHN1YldmaENvbW1hbmQocHJvZ3JhbSk7XG4gIGlmIChwcm9jZXNzLmVudi5QTElOS19TQUZFICE9PSAndHJ1ZScpIHtcbiAgICBjbGlFeHRlbnNpb25zID0gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbSwgd3NTdGF0ZSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1ZhbHVlIG9mIGVudmlyb25tZW50IHZhcmFpYmxlIFwiUExJTktfU0FGRVwiIGlzIHRydWUsIHNraXAgbG9hZGluZyBleHRlbnNpb24nKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgcHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndiwge2Zyb206ICdub2RlJ30pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihjaGFsay5yZWRCcmlnaHQoZSksIGUuc3RhY2spO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdWJXZmhDb21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKiBjb21tYW5kIGluaXRcbiAgICovXG4gIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2luaXQgW3dvcmtzcGFjZS1kaXJlY3RvcnldJylcbiAgLmRlc2NyaXB0aW9uKCdJbml0aWFsaXplIHdvcmtzcGFjZSBkaXJlY3RvcnksIGdlbmVyYXRlIGJhc2ljIGNvbmZpZ3VyYXRpb24gZmlsZXMgZm9yIHByb2plY3QgYW5kIGNvbXBvbmVudCBwYWNrYWdlcycpXG4gIC5vcHRpb24oJy1mLCAtLWZvcmNlJywgJ0ZvcmNlIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeScsIGZhbHNlKVxuICAub3B0aW9uKCctLWxpbnQtaG9vaywgLS1saCcsICdDcmVhdGUgYSBnaXQgcHVzaCBob29rIGZvciBjb2RlIGxpbnQnLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS15YXJuJywgJ1VzZSBZYXJuIHRvIGluc3RhbGwgY29tcG9uZW50IHBlZXIgZGVwZW5kZW5jaWVzIGluc3RlYWQgb2YgdXNpbmcgTlBNJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tcHJvZHVjdGlvbicsICdBZGQgXCItLXByb2R1Y3Rpb25cIiBvciBcIi0tb25seT1wcm9kXCIgY29tbWFuZCBsaW5lIGFyZ3VtZW50IHRvIFwieWFybi9ucG0gaW5zdGFsbFwiJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZT86IHN0cmluZykgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktaW5pdCcpKS5kZWZhdWx0KGluaXRDbWQub3B0cygpIGFzIHRwLkluaXRDbWRPcHRpb25zLCB3b3Jrc3BhY2UpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgY29uc3QgdXBkYXRlRGlyQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGRhdGUtZGlyJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gdGhpcyBjb21tYW5kIHRvIHN5bmMgaW50ZXJuYWwgc3RhdGUgd2hlbiB3aG9sZSB3b3Jrc3BhY2UgZGlyZWN0b3J5IGlzIHJlbmFtZWQgb3IgbW92ZWQuXFxuJyArXG4gICdCZWNhdXNlIHdlIHN0b3JlIGFic29sdXRlIHBhdGggaW5mbyBvZiBlYWNoIHBhY2thZ2UgaW4gaW50ZXJuYWwgc3RhdGUsIHRoZXNlIGluZm9ybWF0aW9uIGJlY29tZXMgaW52YWxpZCBvbmNlIHlvdSByZW5hbWUgb3IgbW92ZWQgZGlyZWN0b3J5JylcbiAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5jaGVja0Rpcih1cGRhdGVEaXJDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyh1cGRhdGVEaXJDbWQpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHByb2plY3RcbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgncHJvamVjdCBbYWRkfHJlbW92ZV0gW3Byb2plY3QtZGlyLi4uXScpXG4gIC5kZXNjcmlwdGlvbignQXNzb2NpYXRlLCBkaXNhc3NvY2lhdGUgb3IgbGlzdCBhc3NvY2lhdGVkIHByb2plY3QgZm9sZGVycycpXG4gIC5hY3Rpb24oYXN5bmMgKGFjdGlvbjogJ2FkZCd8J3JlbW92ZSd8dW5kZWZpbmVkLCBwcm9qZWN0RGlyOiBzdHJpbmdbXSkgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKHNleHlGb250KCdQTGluaycpLnN0cmluZyk7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktcHJvamVjdCcpKS5kZWZhdWx0KGFjdGlvbiwgcHJvamVjdERpcik7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdzb3VyY2UgY29kZSBzdHlsZSBjaGVjaycpXG4gIC5vcHRpb24oJy0tcGogPHByb2plY3QxLHByb2plY3QyLi4uPicsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLm9wdGlvbignLS1maXgnLCAnUnVuIGVzbGludC90c2xpbnQgZml4LCB0aGlzIGNvdWxkIGNhdXNlIHlvdXIgc291cmNlIGNvZGUgYmVpbmcgY2hhbmdlZCB1bmV4cGVjdGVkbHknLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyBwYWNrYWdlcyA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMobGludENtZCk7XG4gIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY3MnKS5hbGlhcygnY2xlYXItc3ltbGlua3MnKVxuICAuZGVzY3JpcHRpb24oJ0NsZWFyIHN5bWxpbmtzIGZyb20gbm9kZV9tb2R1bGVzLCBhbHdheXMgZG8gdGhpcyBiZWZvcmUgcnVuIFwibnBtIGluc3RhbGxcIiBpbiByb290IGRpcmVjdG9yeScpXG4gIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBzY2FuTm9kZU1vZHVsZXM6IHR5cGVvZiBfc2Nhbk5vZGVNb2R1bGVzID0gcmVxdWlyZSgnLi4vdXRpbHMvc3ltbGlua3MnKS5kZWZhdWx0O1xuICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG4gIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgndXBncmFkZScpXG4gIC5kZXNjcmlwdGlvbignUmVpbnN0YWxsIGxvY2FsIFBsaW5rIHRvIHRoZSB2ZXJzaW9uIHNwZWNpZmllZCBpbiBwYWNrYWdlLmpzb24nKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBzY2FuTm9kZU1vZHVsZXM6IHR5cGVvZiBfc2Nhbk5vZGVNb2R1bGVzID0gcmVxdWlyZSgnLi4vdXRpbHMvc3ltbGlua3MnKS5kZWZhdWx0O1xuICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlcygnYWxsJyk7XG4gICAgY29uc3QgZW52ID0gey4uLnByb2Nlc3MuZW52LCBOT0RFX0VOVjogJ2RldmVsb3BtZW50J307XG4gICAgYXdhaXQgZXhlKCducG0nLCAnaScsIHtlbnZ9KS5wcm9taXNlO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcHJvY2Vzcy5uZXh0VGljayhyZXNvbHZlKSk7XG4gICAgYXdhaXQgZXhlKCducG0nLCAnZGRwJywge2Vudn0pLnByb21pc2U7XG4gIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnZG9ja2VyaXplIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC5kZXNjcmlwdGlvbignW1RCSV0gR2VuZXJhdGUgRG9ja2VyZmlsZSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeSwgYW5kIGdlbmVyYXRlIGRvY2tlciBpbWFnZScpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgncGtnIDx3b3Jrc3BhY2UtZGlyPicpXG4gIC5kZXNjcmlwdGlvbignW1RCSV0gVXNlIFBrZyAoaHR0cHM6Ly9naXRodWIuY29tL3ZlcmNlbC9wa2cpIHRvIHBhY2thZ2UgTm9kZS5qcyBwcm9qZWN0IGludG8gYW4gZXhlY3V0YWJsZSAnKTtcblxuICAvKipcbiAgICogY29tbWFuZCBsc1xuICAgKi9cbiAgY29uc3QgbGlzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbHMnKS5hbGlhcygnbGlzdCcpXG4gIC5vcHRpb24oJy1qLCAtLWpzb24nLCAnbGlzdCBsaW5rZWQgZGVwZW5kZW5jaWVzIGluIGZvcm0gb2YgSlNPTicsIGZhbHNlKVxuICAuZGVzY3JpcHRpb24oJ0lmIHlvdSB3YW50IHRvIGtub3cgaG93IG1hbnkgcGFja2FnZXMgd2lsbCBhY3R1YWxseSBydW4sIHRoaXMgY29tbWFuZCBwcmludHMgb3V0IGEgbGlzdCBhbmQgdGhlIHByaW9yaXRpZXMsIGluY2x1ZGluZyBpbnN0YWxsZWQgcGFja2FnZXMnKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5kZWZhdWx0KGxpc3RDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaXN0Q21kKTtcblxuICAvKipcbiAgICogQnVtcCBjb21tYW5kXG4gICAqL1xuICBjb25zdCBidW1wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdidW1wIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdidW1wIHBhY2thZ2UuanNvbiB2ZXJzaW9uIG51bWJlciBmb3Igc3BlY2lmaWMgcGFja2FnZSwgc2FtZSBhcyBcIm5wbSB2ZXJzaW9uXCIgZG9lcycpXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdvbmx5IGJ1bXAgY29tcG9uZW50IHBhY2thZ2VzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNyZS12ZXJzaW9uIDxtYWpvciB8IG1pbm9yIHwgcGF0Y2ggfCBwcmVtYWpvciB8IHByZW1pbm9yIHwgcHJlcGF0Y2ggfCBwcmVyZWxlYXNlPicsXG4gICAgICAndmVyc2lvbiBpbmNyZW1lbnQsIHZhbGlkIHZhbHVlcyBhcmU6IG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UnLCAncGF0Y2gnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktYnVtcCcpKS5kZWZhdWx0KHsuLi5idW1wQ21kLm9wdHMoKSBhcyB0cC5CdW1wT3B0aW9ucywgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoYnVtcENtZCk7XG4gIC8vIGJ1bXBDbWQudXNhZ2UoYnVtcENtZC51c2FnZSgpICsgJ1xcbicgKyBobCgncGxpbmsgYnVtcCA8cGFja2FnZT4gLi4uJykgKyAnIHRvIHJlY3Vyc2l2ZWx5IGJ1bXAgcGFja2FnZS5qc29uIGZyb20gbXVsdGlwbGUgZGlyZWN0b3JpZXNcXG4nICtcbiAgLy8gICBobCgncGxpbmsgYnVtcCA8ZGlyPiAtaSBtaW5vcicpICsgJyB0byBidW1wIG1pbm9yIHZlcnNpb24gbnVtYmVyLCBkZWZhdWx0IGlzIHBhdGNoIG51bWJlcicpO1xuXG4gIC8qKlxuICAgKiBQYWNrIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHBhY2tDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3BhY2sgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ25wbSBwYWNrIGV2ZXJ5IHBha2FnZSBpbnRvIHRhcmJhbGwgZmlsZXMnKVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncGFjayBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLXcsLS13b3Jrc3BhY2UgPHdvcmtzcGFjZS1kaXI+JywgJ3BhY2sgcGFja2FnZXMgd2hpY2ggYXJlIGxpbmtlZCBhcyBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpcj4nLFxuICAgICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucGFjayh7Li4ucGFja0NtZC5vcHRzKCkgYXMgdHAuUGFja09wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHBhY2tDbWQpO1xuICBwYWNrQ21kLnVzYWdlKHBhY2tDbWQudXNhZ2UoKSArICdcXG5CeSBkZWZhdWx0LCBydW4gXCJucG0gcGFja1wiIGZvciBlYWNoIGxpbmtlZCBwYWNrYWdlIHdoaWNoIGFyZSBkZXBlbmRlbmNpZXMgb2YgY3VycmVudCB3b3Jrc3BhY2UnKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwdWJsaXNoQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwdWJsaXNoIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdydW4gbnBtIHB1Ymxpc2gnKVxuICAgIC5vcHRpb24oJy0tZGlyIDxwYWNrYWdlIGRpcmVjdG9yeT4nLCAncHVibGlzaCBwYWNrYWdlcyBieSBzcGVjaWZ5aW5nIGRpcmVjdG9yaWVzJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsXG4gICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgcGFja2FnZXMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwdWJsaXNoIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcHVibGljJywgJ3NhbWUgYXMgXCJucG0gcHVibGlzaFwiIGNvbW1hbmQgb3B0aW9uIFwiLS1hY2Nlc3MgcHVibGljXCInLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucHVibGlzaCh7Li4ucHVibGlzaENtZC5vcHRzKCkgYXMgdHAuUHVibGlzaE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHB1Ymxpc2hDbWQpO1xuXG4gIGNvbnN0IGFuYWx5c2lzQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdhbmFseXNlJylcbiAgICAuZGVzY3JpcHRpb24oJ1VzZSBUeXBlc2NyaXB0IGNvbXBpbGVyIHRvIHBhcnNlIHNvdXJjZSBjb2RlLCBkcmF3IGEgZGVwZW5kZW5jZSBncmFwaCB3aXRoIERGUyBhbGdhcml0aG0nKVxuICAgIC8vIC5vcHRpb24oJy1kLCAtLWRpciA8ZGlyZWN0b3J5PicsXG4gICAgLy8gICAnc3BlY2lmaWMgdGFyZ2V0IGRpcmVjdG9yeSBpbnN0ZWFkIG9mIHBhY2thZ2VzLCB0YXJnZXQgY2FuIGJlIGFueSBkaXJlY3RvcnkgdGhhdCBjb250YWlucyBKUy9UUyBmaWxlcycsXG4gICAgLy8gICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctZiwgLS1maWxlIDxmaWxlPicsXG4gICAgICAnc3BlY2lmaWMgdGFyZ2V0IFRTL0pTKFgpIGZpbGVzIChtdWx0aXBsZSBmaWxlIHdpdGggbW9yZSBvcHRpb25zIFwiLWYgPGZpbGU+IC1mIDxnbG9iPlwiKScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4vY2xpLWFuYWx5c2UnKSkuZGVmYXVsdChwYWNrYWdlcywgYW5hbHlzaXNDbWQub3B0cygpIGFzIHRwLkFuYWx5c2VPcHRpb25zKTtcbiAgICB9KTtcblxuICBhbmFseXNpc0NtZC51c2FnZShhbmFseXNpc0NtZC51c2FnZSgpICsgJ1xcbicgK1xuICAgICdlLmcuXFxuICAnICsgY2hhbGsuYmx1ZSgncGxpbmsgYW5hbHlzZSAtZiBcInBhY2thZ2VzL2Zvb2JhcjEvKiovKlwiIC1mIHBhY2thZ2VzL2Zvb2JhcjIvdHMvbWFpbi50cycpKTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoYW5hbHlzaXNDbWQpO1xufVxuXG5mdW5jdGlvbiBzcGFjZU9ubHlTdWJXZmhDb21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKiBjb21tYW5kIHJ1biovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc3BlY2lmaWMgbW9kdWxlXFwncyBleHBvcnRlZCBmdW5jdGlvblxcbicpXG4gIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2NvbmZpZycpKS5kZWZhdWx0O1xuICAgIGF3YWl0IGNvbmZpZy5pbml0KHJ1bkNtZC5vcHRzKCkgYXMgdHAuR2xvYmFsT3B0aW9ucyk7XG4gICAgY29uc3QgbG9nQ29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vbG9nLWNvbmZpZycpKS5kZWZhdWx0O1xuICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhydW5DbWQpO1xuICBydW5DbWQudXNhZ2UocnVuQ21kLnVzYWdlKCkgKyAnXFxuJyArIGNoYWxrLmdyZWVuKCdwbGluayBydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl1cXG4nKSArXG4gIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAnPHRhcmdldD4gLSBKUyBvciBUUyBmaWxlIG1vZHVsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXNvbHZlZCBieSBOb2RlLmpzICh0cy1ub2RlKSBmb2xsb3dlZCBieSBcIiNcIiBhbmQgZXhwb3J0ZWQgZnVuY3Rpb24gbmFtZSxcXG4nICtcbiAgJ2UuZy4gXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgJywgZnVuY3Rpb24gY2FuIGJlIGFzeW5jIHdoaWNoIHJldHVybnMgUHJvbWlzZVxcbicgK1xuICBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuXG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gVHlwZXNjcmlwdCBjb21waWxlcicpXG4gIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgd2F0Y2ggbW9kZScsIGZhbHNlKVxuICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAvLyAub3B0aW9uKCctLXdzLC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdvbmx5IGluY2x1ZGUgdGhvc2UgbGlua2VkIHBhY2thZ2VzIHdoaWNoIGFyZSBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAvLyAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAub3B0aW9uKCctLWpzeCcsICdpbmNsdWRlcyBUU1ggZmlsZScsIGZhbHNlKVxuICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tc291cmNlLW1hcCA8aW5saW5lfGZpbGU+JywgJ1NvdXJjZSBtYXAgc3R5bGU6IFwiaW5saW5lXCIgb3IgXCJmaWxlXCInLCAnaW5saW5lJylcbiAgLm9wdGlvbignLS1jb3BhdGgsIC0tY29tcGlsZXItb3B0aW9ucy1wYXRocyA8cGF0aE1hcEpzb24+JyxcbiAgICAnQWRkIG1vcmUgXCJwYXRoc1wiIHByb3BlcnR5IHRvIGNvbXBpbGVyIG9wdGlvbnMuICcgK1xuICAgICcoZS5nLiAtLWNvcGF0aCBcXCd7XFxcIkAvKlwiOltcIi9Vc2Vycy93b3JrZXIvb2NlYW4tdWkvc3JjLypcIl19XFwnKScsICh2LCBwcmV2KSA9PiB7XG4gICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgY29uc3Qgb3B0ID0gdHNjQ21kLm9wdHMoKTtcblxuICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2NvbmZpZycpKS5kZWZhdWx0O1xuICAgIGF3YWl0IGNvbmZpZy5pbml0KHRzY0NtZC5vcHRzKCkgYXMgdHAuR2xvYmFsT3B0aW9ucyk7XG4gICAgY29uc3QgbG9nQ29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vbG9nLWNvbmZpZycpKS5kZWZhdWx0O1xuICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgY29uc3QgdHNjID0gYXdhaXQgaW1wb3J0KCcuLi90cy1jbWQnKTtcblxuICAgIGF3YWl0IHRzYy50c2Moe1xuICAgICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgICBwcm9qZWN0OiBvcHQucHJvamVjdCxcbiAgICAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgICBqc3g6IG9wdC5qc3gsXG4gICAgICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHksXG4gICAgICBwYXRoc0pzb25zOiBvcHQuY29tcGlsZXJPcHRpb25zUGF0aHNcbiAgICB9KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHRzY0NtZCk7XG4gIHRzY0NtZC51c2FnZSh0c2NDbWQudXNhZ2UoKSArICdcXG4nICsgJ1J1biBndWxwLXR5cGVzY3JpcHQgdG8gY29tcGlsZSBOb2RlLmpzIHNpZGUgVHlwZXNjcmlwdCBmaWxlcy5cXG5cXG4nICtcbiAgJ0l0IGNvbXBpbGVzIFxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L3RzLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vZGlzdFwiLFxcbicgK1xuICAnICBvclxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb20vKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tXCJcXG4gZm9yIGFsbCBAd2ZoIHBhY2thZ2VzLlxcbicgK1xuICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcbicgK1xuICBobERlc2MoJ3BsaW5rIHRzY1xcbicpICsgJ0NvbXBpbGUgbGlua2VkIHBhY2thZ2VzIHRoYXQgYXJlIGRlcGVuZGVuY2llcyBvZiBjdXJyZW50IHdvcmtzcGFjZSAoeW91IHNoYWxsIHJ1biB0aGlzIGNvbW1hbmQgb25seSBpbiBhIHdvcmtzcGFjZSBkaXJlY3RvcnkpXFxuJyArXG4gIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBwYWNrYWdlcyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgaGxEZXNjKCdwbGluayB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIHBhY2thZ2VzIGNoYW5nZSBhbmQgY29tcGlsZSB3aGVuIG5ldyB0eXBlc2NyaXB0IGZpbGUgaXMgY2hhbmdlZCBvciBjcmVhdGVkXFxuXFxuJyk7XG59XG5cbmZ1bmN0aW9uIGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kLCB3czogcGtnTWdyLldvcmtzcGFjZVN0YXRlIHwgdW5kZWZpbmVkKTogc3RyaW5nW10ge1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm4gW107XG5cbiAgY29uc3Qgb3JpZ1BnbUNvbW1hbmQgPSBwcm9ncmFtLmNvbW1hbmQ7XG5cbiAgbGV0IGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAvLyBjb25zdCBjbWRJbmZvUGFja3MgPSBuZXcgQXJyYXk8UGFyYW1ldGVyczx0eXBlb2YgY2xpU3RvcmUuY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVMb2FkZWRDbWQ+WzBdIGV4dGVuZHMgKGluZmVyIEkpW10gPyBJIDogdW5rbm93bj4oMSk7XG4gIGNvbnN0IGxvYWRlZENtZE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgY29uc3QgYXZhaWxhYmxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IGRyID0gcGsuanNvbi5kcjtcbiAgICBpZiAoZHIgPT0gbnVsbCB8fCBkci5jbGkgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNvbnN0IFtwa2dGaWxlUGF0aCwgZnVuY05hbWVdID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG4gICAgLy8gaWYgKCFfLmhhcyh3cy5vcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIGV4dGVuc2lvbi5wa05hbWUpICYmICFfLmhhcyh3cy5vcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMsIGV4dGVuc2lvbi5wa05hbWUpKVxuICAgIC8vICAgY29udGludWU7XG5cbiAgICBhdmFpbGFibGVzLnB1c2gocGsubmFtZSk7XG5cbiAgICB0cnkge1xuICAgICAgZmlsZVBhdGggPSByZXF1aXJlLnJlc29sdmUocGsubmFtZSArICcvJyArIHBrZ0ZpbGVQYXRoKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuXG4gICAgaWYgKGZpbGVQYXRoICE9IG51bGwpIHtcbiAgICAgIHByb2dyYW0uY29tbWFuZCA9IGZ1bmN0aW9uKHRoaXM6IHR5cGVvZiBwcm9ncmFtLCBuYW1lQW5kQXJnczogc3RyaW5nLCAuLi5yZXN0QXJnczogYW55W10pIHtcbiAgICAgICAgY29uc3QgY21kTmFtZSA9IC9eXFxTKy8uZXhlYyhuYW1lQW5kQXJncykhWzBdO1xuICAgICAgICBpZiAobG9hZGVkQ21kTWFwLmhhcyhjbWROYW1lKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29uZmxpY3QgY29tbWFuZCBuYW1lICR7Y21kTmFtZX0gZnJvbSBleHRlbnNpb25zIFwiJHtmaWxlUGF0aH1cIiBhbmQgXCIke2xvYWRlZENtZE1hcC5nZXQoY21kTmFtZSl9XCJgKTtcbiAgICAgICAgfVxuICAgICAgICBsb2FkZWRDbWRNYXAuc2V0KGNtZE5hbWUsIGZpbGVQYXRoISk7XG4gICAgICAgIC8vIGNtZEluZm9QYWNrc1swXSA9IHtjbWQ6IGNtZE5hbWUsIGZpbGU6IGZpbGVQYXRoIX07XG4gICAgICAgIC8vIGNsaVN0b3JlLmNsaUFjdGlvbkRpc3BhdGNoZXIudXBkYXRlTG9hZGVkQ21kKGNtZEluZm9QYWNrcyk7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgTG9hZGluZyBjb21tYW5kIFwiJHtjbWROYW1lfVwiIGZyb20gZXh0ZW5zaW9uICR7ZmlsZVBhdGh9YCk7XG4gICAgICAgIGNvbnN0IHN1YkNtZDogUmV0dXJuVHlwZTx0eXBlb2Ygb3JpZ1BnbUNvbW1hbmQ+ID0gb3JpZ1BnbUNvbW1hbmQuY2FsbCh0aGlzLCBuYW1lQW5kQXJncywgLi4ucmVzdEFyZ3MpO1xuICAgICAgICBjb25zdCBvcmlnaW5EZXNjRm4gPSBzdWJDbWQuZGVzY3JpcHRpb247XG4gICAgICAgIHN1YkNtZC5kZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKHRoaXM6IFJldHVyblR5cGU8dHlwZW9mIG9yaWdQZ21Db21tYW5kPiwgc3RyOiBzdHJpbmcsIC4uLnJlbWFpbmRlcjogYW55W10pIHtcbiAgICAgICAgICBzdHIgPSBjaGFsay5ibHVlKGBbJHtway5uYW1lfV1gKSArICcgJyArIHN0cjtcbiAgICAgICAgICByZXR1cm4gb3JpZ2luRGVzY0ZuLmNhbGwodGhpcywgc3RyLCAuLi5yZW1haW5kZXIpO1xuICAgICAgICB9IGFzIGFueTtcbiAgICAgICAgcmV0dXJuIHN1YkNtZDtcbiAgICAgIH0gYXMgYW55O1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc3ViQ21kRmFjdG9yeTogdHAuQ2xpRXh0ZW5zaW9uID0gZnVuY05hbWUgPyByZXF1aXJlKGZpbGVQYXRoKVtmdW5jTmFtZV0gOlxuICAgICAgICAgIHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgICAgICBzdWJDbWRGYWN0b3J5KHByb2dyYW0sIHdpdGhHbG9iYWxPcHRpb25zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAke3BrLm5hbWV9OiBcIiR7ZS5tZXNzYWdlfVwiYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBhdmFpbGFibGVzO1xufVxuXG5mdW5jdGlvbiBobCh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyZWVuKHRleHQpO1xufVxuXG5mdW5jdGlvbiBobERlc2ModGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmF5KHRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIHByb2dyYW0ub3B0aW9uKCctYywgLS1jb25maWcgPGNvbmZpZy1maWxlPicsXG4gICAgaGxEZXNjKCdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyksXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7IHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7fSwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tcHJvcCA8cHJvcGVydHktcGF0aD12YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4nLFxuICAgIGhsRGVzYygnPHByb3BlcnR5LXBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmdcXG4gZS5nLlxcbicpICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQHdmaC9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAd2ZoL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwXFxuJyArXG4gICAgJy0tcHJvcCBhcnJheWxpa2UucHJvcFswXT1mb29iYXJcXG4nICtcbiAgICAnLS1wcm9wIFtcIkB3ZmgvZm9vLmJhclwiLFwicHJvcFwiLDBdPXRydWUnLFxuICAgIGFycmF5T3B0aW9uRm4sIFtdIGFzIHN0cmluZ1tdKTtcbiAgLy8gLm9wdGlvbignLS1sb2ctc3RhdCcsIGhsRGVzYygnUHJpbnQgaW50ZXJuYWwgUmVkdXggc3RhdGUvYWN0aW9ucyBmb3IgZGVidWcnKSk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG5cbmxldCB2ZXJzaW9uQ2hlY2tlZCA9IGZhbHNlO1xucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsICgpID0+IHtcbiAgaWYgKHZlcnNpb25DaGVja2VkKVxuICAgIHJldHVybjtcbiAgdmVyc2lvbkNoZWNrZWQgPSB0cnVlO1xuICBjaGVja1BsaW5rVmVyc2lvbigpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrUGxpbmtWZXJzaW9uKCkge1xuICBjb25zdCBwa2pzb24gPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAncGFja2FnZS5qc29uJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHBranNvbikpIHtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtqc29uLCAndXRmOCcpKTtcbiAgICBsZXQgZGVwVmVyOiBzdHJpbmcgPSBqc29uLmRlcGVuZGVuY2llcyAmJiBqc29uLmRlcGVuZGVuY2llc1snQHdmaC9wbGluayddIHx8XG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyAmJiBqc29uLmRldkRlcGVuZGVuY2llc1snQHdmaC9wbGluayddO1xuICAgIGlmIChkZXBWZXIgPT0gbnVsbCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhib3hTdHJpbmcoJ0RvblxcJ3QgZm9yZ2V0IHRvIGFkZCBAd2ZoL3BsaW5rIGluIHBhY2thZ2UuanNvbiBhcyBkZXBlbmRlbmNpZXMnKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChkZXBWZXIuZW5kc1dpdGgoJy50Z3onKSkge1xuICAgICAgY29uc3QgbWF0Y2hlZCA9IC8tKFxcZCtcXC5cXGQrXFwuW14uXSspXFwudGd6JC8uZXhlYyhkZXBWZXIpO1xuICAgICAgaWYgKG1hdGNoZWQgPT0gbnVsbClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgZGVwVmVyID0gbWF0Y2hlZFsxXTtcbiAgICB9XG4gICAgaWYgKGRlcFZlciAmJiAhc2VtdmVyLnNhdGlzZmllcyhway52ZXJzaW9uLCBkZXBWZXIpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGJveFN0cmluZyhgUGxlYXNlIHJ1biBjb21tYW5kcyB0byByZS1pbnN0YWxsIGxvY2FsIFBsaW5rIHYke3BrLnZlcnNpb259LCBleHBlY3RlZCBpcyB2JHtkZXBWZXJ9OlxcblxcbmAgK1xuICAgICAgICAnICBwbGluayB1cGdyYWRlJykpO1xuICAgIH1cbiAgfVxufVxuXG4iXX0=