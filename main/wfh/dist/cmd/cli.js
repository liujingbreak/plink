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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
exports.withGlobalOptions = exports.drcpCommand = void 0;
// tslint:disable: max-line-length
const commander_1 = __importDefault(require("commander"));
const chalk_1 = __importDefault(require("chalk"));
require("../tsc-packages-slice");
const package_list_helper_1 = require("../package-mgr/package-list-helper");
// import Path from 'path';
const pk = require('../../../package');
// const WIDTH = 130;
const arrayOptionFn = (curr, prev) => {
    if (prev)
        prev.push(curr);
    return prev;
};
function drcpCommand(startTime) {
    return __awaiter(this, void 0, void 0, function* () {
        process.title = 'Plink - command line';
        // const {stateFactory}: typeof store = require('../store');
        yield Promise.resolve().then(() => __importStar(require('./cli-slice')));
        // stateFactory.configureStore();
        let cliExtensions;
        const program = new commander_1.default.Command('plink')
            .action(args => {
            program.outputHelp();
            // tslint:disable-next-line: no-console
            console.log('\nversion:', pk.version);
            if (cliExtensions && cliExtensions.length > 0) {
                // tslint:disable-next-line: no-console
                console.log(`Found ${cliExtensions.length} command line extension` +
                    `${cliExtensions.length > 1 ? 's' : ''}: ${cliExtensions.join(', ')}`);
            }
        });
        program.version(pk.version, '-v, --vers', 'output the current version');
        subDrcpCommand(program);
        if (process.env.PLINK_SAFE !== 'true') {
            cliExtensions = loadExtensionCommand(program);
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
exports.drcpCommand = drcpCommand;
function subDrcpCommand(program) {
    /**
     * command init
     */
    const initCmd = program.command('init [workspace-directory]')
        .description('Initialize workspace directory, generate basic configuration files for project and component packages')
        .option('-f, --force', 'Force run "npm install" in specific workspace directory', false)
        // .option('--yarn', 'Use Yarn to install component peer dependencies instead of using NPM', false)
        .option('--production', 'Add "--production" or "--only=prod" command line argument to "yarn/npm install"', false)
        .action((workspace) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-init')))).default(initCmd.opts(), workspace);
    }));
    withGlobalOptions(initCmd);
    /**
     * command project
     */
    program.command('project [add|remove] [project-dir...]')
        .description('Associate, disassociate or list associated project folders')
        .action((action, projectDir) => __awaiter(this, void 0, void 0, function* () {
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
    program.command('clean-symlinks')
        .description('Clean symlinks from node_modules, always do this before run "npm install" in root directory')
        // .option('--only-symlink', 'Clean only symlinks, not dist directory', false)
        .action(() => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-clean')))).deleteSymlinks();
    }));
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
     * command run
     */
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
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        const opt = tscCmd.opts();
        const config = yield (yield Promise.resolve().then(() => __importStar(require('../config')))).default;
        yield config.init(runCmd.opts());
        const logConfig = yield (yield Promise.resolve().then(() => __importStar(require('../log-config')))).default;
        logConfig(config());
        const tsc = yield Promise.resolve().then(() => __importStar(require('../tsc-packages')));
        yield tsc.generateTsconfigFiles(packages, {
            package: packages,
            project: opt.project,
            watch: opt.watch,
            sourceMap: opt.sourceMap,
            jsx: opt.jsx,
            ed: opt.emitDeclarationOnly
        }).toPromise();
        // await tsCmd.tsc({
        //   package: packages,
        //   project: opt.project,
        //   watch: opt.watch,
        //   sourceMap: opt.sourceMap,
        //   jsx: opt.jsx,
        //   ed: opt.emitDeclarationOnly
        // });
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
}
function loadExtensionCommand(program) {
    // const {getState} = require('./cli-slice') as typeof cliStore;
    const { getState: getPkgState, workspaceKey } = require('../package-mgr');
    const ws = getPkgState().workspaces.get(workspaceKey(process.cwd()));
    if (ws == null)
        return [];
    const origPgmCommand = program.command;
    let filePath = null;
    // const cmdInfoPacks = new Array<Parameters<typeof cliStore.cliActionDispatcher.updateLoadedCmd>[0] extends (infer I)[] ? I : unknown>(1);
    const loadedCmdMap = new Map();
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
        return origPgmCommand.call(this, nameAndArgs, ...restArgs);
    };
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
            try {
                const subCmdFactory = funcName ? require(filePath)[funcName] :
                    require(filePath);
                subCmdFactory(program, withGlobalOptions);
            }
            catch (e) {
                // tslint:disable-next-line: no-console
                console.error('Failed to load command line extension in package ' + pk.name, e);
            }
        }
    }
    return availables;
}
function hl(text) {
    return chalk_1.default.green(text);
}
function hlDesc(text) {
    return chalk_1.default.green(text);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLDBEQUFrQztBQUNsQyxrREFBMEI7QUFJMUIsaUNBQStCO0FBQy9CLDRFQUFzRTtBQUV0RSwyQkFBMkI7QUFDM0IsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDdkMscUJBQXFCO0FBRXJCLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsV0FBVyxDQUFDLFNBQWlCOztRQUNqRCxPQUFPLENBQUMsS0FBSyxHQUFHLHNCQUFzQixDQUFDO1FBQ3ZDLDREQUE0RDtRQUM1RCx3REFBYSxhQUFhLEdBQUMsQ0FBQztRQUM1QixpQ0FBaUM7UUFHakMsSUFBSSxhQUFtQyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNiLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLElBQUksYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM3Qyx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxhQUFhLENBQUMsTUFBTSx5QkFBeUI7b0JBQ2xFLEdBQUcsYUFBYSxDQUFDLE1BQU0sR0FB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UyxFQUFFLENBQUMsSUFBWTtJQUN0QixPQUFPLGVBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLElBQVk7SUFDMUIsT0FBTyxlQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFFRCxTQUFnQixpQkFBaUIsQ0FBQyxPQUEwQjtJQUMxRCxPQUFPLENBQUMsTUFBTSxDQUFDLDRCQUE0QixFQUN6QyxNQUFNLENBQUMsdUZBQXVGLENBQUMsRUFDL0YsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQSxDQUFDLEVBQUUsRUFBYyxDQUFDO1NBQ2xGLE1BQU0sQ0FBQyxnREFBZ0QsRUFDdEQsTUFBTSxDQUFDLDhJQUE4SSxDQUFDO1FBQ3RKLHNGQUFzRjtRQUN0RixzRkFBc0Y7UUFDdEYsbUNBQW1DO1FBQ25DLHVDQUF1QyxFQUN2QyxhQUFhLEVBQUUsRUFBYyxDQUFDLENBQUM7SUFDakMsaUZBQWlGO0lBRWpGLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFkRCw4Q0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLyBpbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyB0cCBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgJy4uL3RzYy1wYWNrYWdlcy1zbGljZSc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZScpO1xuLy8gY29uc3QgV0lEVEggPSAxMzA7XG5cbmNvbnN0IGFycmF5T3B0aW9uRm4gPSAoY3Vycjogc3RyaW5nLCBwcmV2OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkgPT4ge1xuICBpZiAocHJldilcbiAgICBwcmV2LnB1c2goY3Vycik7XG4gIHJldHVybiBwcmV2O1xufTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRyY3BDb21tYW5kKHN0YXJ0VGltZTogbnVtYmVyKSB7XG4gIHByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBjb21tYW5kIGxpbmUnO1xuICAvLyBjb25zdCB7c3RhdGVGYWN0b3J5fTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgYXdhaXQgaW1wb3J0KCcuL2NsaS1zbGljZScpO1xuICAvLyBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcblxuXG4gIGxldCBjbGlFeHRlbnNpb25zOiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgncGxpbmsnKVxuICAuYWN0aW9uKGFyZ3MgPT4ge1xuICAgIHByb2dyYW0ub3V0cHV0SGVscCgpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG52ZXJzaW9uOicsIHBrLnZlcnNpb24pO1xuICAgIGlmIChjbGlFeHRlbnNpb25zICYmIGNsaUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtjbGlFeHRlbnNpb25zLmxlbmd0aH0gY29tbWFuZCBsaW5lIGV4dGVuc2lvbmAgK1xuICAgICAgYCR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiAke2NsaUV4dGVuc2lvbnMuam9pbignLCAnKX1gKTtcbiAgICB9XG4gIH0pO1xuXG4gIHByb2dyYW0udmVyc2lvbihway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xuICBzdWJEcmNwQ29tbWFuZChwcm9ncmFtKTtcbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJykge1xuICAgIGNsaUV4dGVuc2lvbnMgPSBsb2FkRXh0ZW5zaW9uQ29tbWFuZChwcm9ncmFtKTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnVmFsdWUgb2YgZW52aXJvbm1lbnQgdmFyYWlibGUgXCJQTElOS19TQUZFXCIgaXMgdHJ1ZSwgc2tpcCBsb2FkaW5nIGV4dGVuc2lvbicpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2LCB7ZnJvbTogJ25vZGUnfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGNoYWxrLnJlZEJyaWdodChlKSwgZS5zdGFjayk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN1YkRyY3BDb21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKlxuICAgKiBjb21tYW5kIGluaXRcbiAgICovXG4gIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2luaXQgW3dvcmtzcGFjZS1kaXJlY3RvcnldJylcbiAgLmRlc2NyaXB0aW9uKCdJbml0aWFsaXplIHdvcmtzcGFjZSBkaXJlY3RvcnksIGdlbmVyYXRlIGJhc2ljIGNvbmZpZ3VyYXRpb24gZmlsZXMgZm9yIHByb2plY3QgYW5kIGNvbXBvbmVudCBwYWNrYWdlcycpXG4gIC5vcHRpb24oJy1mLCAtLWZvcmNlJywgJ0ZvcmNlIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeScsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1pbml0JykpLmRlZmF1bHQoaW5pdENtZC5vcHRzKCkgYXMgYW55LCB3b3Jrc3BhY2UpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcHJvamVjdFxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdwcm9qZWN0IFthZGR8cmVtb3ZlXSBbcHJvamVjdC1kaXIuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzJylcbiAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIHByb2plY3REaXI6IHN0cmluZ1tdKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktcHJvamVjdCcpKS5kZWZhdWx0KGFjdGlvbiwgcHJvamVjdERpcik7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdzb3VyY2UgY29kZSBzdHlsZSBjaGVjaycpXG4gIC5vcHRpb24oJy0tcGogPHByb2plY3QxLHByb2plY3QyLi4uPicsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLm9wdGlvbignLS1maXgnLCAnUnVuIGVzbGludC90c2xpbnQgZml4LCB0aGlzIGNvdWxkIGNhdXNlIHlvdXIgc291cmNlIGNvZGUgYmVpbmcgY2hhbmdlZCB1bmV4cGVjdGVkbHknLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyBwYWNrYWdlcyA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMobGludENtZCk7XG4gIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY2xlYW4tc3ltbGlua3MnKVxuICAuZGVzY3JpcHRpb24oJ0NsZWFuIHN5bWxpbmtzIGZyb20gbm9kZV9tb2R1bGVzLCBhbHdheXMgZG8gdGhpcyBiZWZvcmUgcnVuIFwibnBtIGluc3RhbGxcIiBpbiByb290IGRpcmVjdG9yeScpXG4gIC8vIC5vcHRpb24oJy0tb25seS1zeW1saW5rJywgJ0NsZWFuIG9ubHkgc3ltbGlua3MsIG5vdCBkaXN0IGRpcmVjdG9yeScsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jbGVhbicpKS5kZWxldGVTeW1saW5rcygpO1xuICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsc1xuICAgKi9cbiAgY29uc3QgbGlzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbHMnKS5hbGlhcygnbGlzdCcpXG4gIC5vcHRpb24oJy1qLCAtLWpzb24nLCAnbGlzdCBsaW5rZWQgZGVwZW5kZW5jaWVzIGluIGZvcm0gb2YgSlNPTicsIGZhbHNlKVxuICAuZGVzY3JpcHRpb24oJ0lmIHlvdSB3YW50IHRvIGtub3cgaG93IG1hbnkgcGFja2FnZXMgd2lsbCBhY3R1YWxseSBydW4sIHRoaXMgY29tbWFuZCBwcmludHMgb3V0IGEgbGlzdCBhbmQgdGhlIHByaW9yaXRpZXMsIGluY2x1ZGluZyBpbnN0YWxsZWQgcGFja2FnZXMnKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5kZWZhdWx0KGxpc3RDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaXN0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBydW5cbiAgICovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc3BlY2lmaWMgbW9kdWxlXFwncyBleHBvcnRlZCBmdW5jdGlvblxcbicpXG4gIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2NvbmZpZycpKS5kZWZhdWx0O1xuICAgIGF3YWl0IGNvbmZpZy5pbml0KHJ1bkNtZC5vcHRzKCkgYXMgdHAuR2xvYmFsT3B0aW9ucyk7XG4gICAgY29uc3QgbG9nQ29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vbG9nLWNvbmZpZycpKS5kZWZhdWx0O1xuICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhydW5DbWQpO1xuICBydW5DbWQudXNhZ2UocnVuQ21kLnVzYWdlKCkgKyAnXFxuJyArIGNoYWxrLmdyZWVuKCdwbGluayBydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl1cXG4nKSArXG4gIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAnPHRhcmdldD4gLSBKUyBvciBUUyBmaWxlIG1vZHVsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXNvbHZlZCBieSBOb2RlLmpzICh0cy1ub2RlKSBmb2xsb3dlZCBieSBcIiNcIiBhbmQgZXhwb3J0ZWQgZnVuY3Rpb24gbmFtZSxcXG4nICtcbiAgJ2UuZy4gXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgJywgZnVuY3Rpb24gY2FuIGJlIGFzeW5jIHdoaWNoIHJldHVybnMgUHJvbWlzZVxcbicgK1xuICBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuICAvKipcbiAgICogdHNjIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHRzY0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignUnVuIFR5cGVzY3JpcHQgY29tcGlsZXInKVxuICAub3B0aW9uKCctdywgLS13YXRjaCcsICdUeXBlc2NyaXB0IGNvbXBpbGVyIHdhdGNoIG1vZGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLy8gLm9wdGlvbignLS13cywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAnb25seSBpbmNsdWRlIHRob3NlIGxpbmtlZCBwYWNrYWdlcyB3aGljaCBhcmUgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgLy8gICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLm9wdGlvbignLS1qc3gnLCAnaW5jbHVkZXMgVFNYIGZpbGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAub3B0aW9uKCctLXNvdXJjZS1tYXAgPGlubGluZXxmaWxlPicsICdTb3VyY2UgbWFwIHN0eWxlOiBcImlubGluZVwiIG9yIFwiZmlsZVwiJywgJ2lubGluZScpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG5cbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9jb25maWcnKSkuZGVmYXVsdDtcbiAgICBhd2FpdCBjb25maWcuaW5pdChydW5DbWQub3B0cygpIGFzIHRwLkdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IGxvZ0NvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2xvZy1jb25maWcnKSkuZGVmYXVsdDtcbiAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgIGNvbnN0IHRzYyA9IGF3YWl0IGltcG9ydCgnLi4vdHNjLXBhY2thZ2VzJyk7XG4gICAgYXdhaXQgdHNjLmdlbmVyYXRlVHNjb25maWdGaWxlcyhwYWNrYWdlcywge1xuICAgICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgICBwcm9qZWN0OiBvcHQucHJvamVjdCxcbiAgICAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgICBqc3g6IG9wdC5qc3gsXG4gICAgICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHlcbiAgICB9KS50b1Byb21pc2UoKTtcbiAgICAvLyBhd2FpdCB0c0NtZC50c2Moe1xuICAgIC8vICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgLy8gICBwcm9qZWN0OiBvcHQucHJvamVjdCxcbiAgICAvLyAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgLy8gICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgLy8gICBqc3g6IG9wdC5qc3gsXG4gICAgLy8gICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHlcbiAgICAvLyB9KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHRzY0NtZCk7XG4gIHRzY0NtZC51c2FnZSh0c2NDbWQudXNhZ2UoKSArICdcXG4nICsgJ1J1biBndWxwLXR5cGVzY3JpcHQgdG8gY29tcGlsZSBOb2RlLmpzIHNpZGUgVHlwZXNjcmlwdCBmaWxlcy5cXG5cXG4nICtcbiAgJ0l0IGNvbXBpbGVzIFxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L3RzLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vZGlzdFwiLFxcbicgK1xuICAnICBvclxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb20vKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tXCJcXG4gZm9yIGFsbCBAd2ZoIHBhY2thZ2VzLlxcbicgK1xuICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcbicgK1xuICBobERlc2MoJ3BsaW5rIHRzY1xcbicpICsgJ0NvbXBpbGUgbGlua2VkIHBhY2thZ2VzIHRoYXQgYXJlIGRlcGVuZGVuY2llcyBvZiBjdXJyZW50IHdvcmtzcGFjZSAoeW91IHNoYWxsIHJ1biB0aGlzIGNvbW1hbmQgb25seSBpbiBhIHdvcmtzcGFjZSBkaXJlY3RvcnkpXFxuJyArXG4gIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBwYWNrYWdlcyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgaGxEZXNjKCdwbGluayB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIHBhY2thZ2VzIGNoYW5nZSBhbmQgY29tcGlsZSB3aGVuIG5ldyB0eXBlc2NyaXB0IGZpbGUgaXMgY2hhbmdlZCBvciBjcmVhdGVkXFxuXFxuJyk7XG5cbiAgLyoqXG4gICAqIEJ1bXAgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgYnVtcENtZCA9IHByb2dyYW0uY29tbWFuZCgnYnVtcCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignYnVtcCBwYWNrYWdlLmpzb24gdmVyc2lvbiBudW1iZXIgZm9yIHNwZWNpZmljIHBhY2thZ2UsIHNhbWUgYXMgXCJucG0gdmVyc2lvblwiIGRvZXMnKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnb25seSBidW1wIGNvbXBvbmVudCBwYWNrYWdlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLWksIC0taW5jcmUtdmVyc2lvbiA8bWFqb3IgfCBtaW5vciB8IHBhdGNoIHwgcHJlbWFqb3IgfCBwcmVtaW5vciB8IHByZXBhdGNoIHwgcHJlcmVsZWFzZT4nLFxuICAgICAgJ3ZlcnNpb24gaW5jcmVtZW50LCB2YWxpZCB2YWx1ZXMgYXJlOiBtYWpvciwgbWlub3IsIHBhdGNoLCBwcmVyZWxlYXNlJywgJ3BhdGNoJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWJ1bXAnKSkuZGVmYXVsdCh7Li4uYnVtcENtZC5vcHRzKCkgYXMgdHAuQnVtcE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGJ1bXBDbWQpO1xuICAvLyBidW1wQ21kLnVzYWdlKGJ1bXBDbWQudXNhZ2UoKSArICdcXG4nICsgaGwoJ3BsaW5rIGJ1bXAgPHBhY2thZ2U+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gIC8vICAgaGwoJ3BsaW5rIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBldmVyeSBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzJylcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3BhY2sgcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy13LC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdwYWNrIHBhY2thZ2VzIHdoaWNoIGFyZSBsaW5rZWQgYXMgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXI+JyxcbiAgICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnBhY2soey4uLnBhY2tDbWQub3B0cygpIGFzIHRwLlBhY2tPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhwYWNrQ21kKTtcbiAgcGFja0NtZC51c2FnZShwYWNrQ21kLnVzYWdlKCkgKyAnXFxuQnkgZGVmYXVsdCwgcnVuIFwibnBtIHBhY2tcIiBmb3IgZWFjaCBsaW5rZWQgcGFja2FnZSB3aGljaCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcHVibGlzaENtZCA9IHByb2dyYW0uY29tbWFuZCgncHVibGlzaCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIG5wbSBwdWJsaXNoJylcbiAgICAub3B0aW9uKCctLWRpciA8cGFja2FnZSBkaXJlY3Rvcnk+JywgJ3B1Ymxpc2ggcGFja2FnZXMgYnkgc3BlY2lmeWluZyBkaXJlY3RvcmllcycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLFxuICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAncHVibGlzaCBwYWNrYWdlcyB3aGljaCBhcmUgbGlua2VkIGFzIGRlcGVuZGVuY3kgb2Ygc3BlY2lmaWMgd29ya3NwYWNlcycsXG4gICAgICBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXB1YmxpYycsICdzYW1lIGFzIFwibnBtIHB1Ymxpc2hcIiBjb21tYW5kIG9wdGlvbiBcIi0tYWNjZXNzIHB1YmxpY1wiJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnB1Ymxpc2goey4uLnB1Ymxpc2hDbWQub3B0cygpIGFzIHRwLlB1Ymxpc2hPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhwdWJsaXNoQ21kKTtcbn1cblxuZnVuY3Rpb24gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpOiBzdHJpbmdbXSB7XG4gIC8vIGNvbnN0IHtnZXRTdGF0ZX0gPSByZXF1aXJlKCcuL2NsaS1zbGljZScpIGFzIHR5cGVvZiBjbGlTdG9yZTtcbiAgY29uc3Qge2dldFN0YXRlOiBnZXRQa2dTdGF0ZSwgd29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIHBrZ01ncjtcbiAgY29uc3Qgd3MgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKSk7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybiBbXTtcblxuICBjb25zdCBvcmlnUGdtQ29tbWFuZCA9IHByb2dyYW0uY29tbWFuZDtcblxuICBsZXQgZmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIC8vIGNvbnN0IGNtZEluZm9QYWNrcyA9IG5ldyBBcnJheTxQYXJhbWV0ZXJzPHR5cGVvZiBjbGlTdG9yZS5jbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUxvYWRlZENtZD5bMF0gZXh0ZW5kcyAoaW5mZXIgSSlbXSA/IEkgOiB1bmtub3duPigxKTtcbiAgY29uc3QgbG9hZGVkQ21kTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBwcm9ncmFtLmNvbW1hbmQgPSBmdW5jdGlvbih0aGlzOiB0eXBlb2YgcHJvZ3JhbSwgbmFtZUFuZEFyZ3M6IHN0cmluZywgLi4ucmVzdEFyZ3M6IGFueVtdKSB7XG4gICAgY29uc3QgY21kTmFtZSA9IC9eXFxTKy8uZXhlYyhuYW1lQW5kQXJncykhWzBdO1xuICAgIGlmIChsb2FkZWRDbWRNYXAuaGFzKGNtZE5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbmZsaWN0IGNvbW1hbmQgbmFtZSAke2NtZE5hbWV9IGZyb20gZXh0ZW5zaW9ucyBcIiR7ZmlsZVBhdGh9XCIgYW5kIFwiJHtsb2FkZWRDbWRNYXAuZ2V0KGNtZE5hbWUpfVwiYCk7XG4gICAgfVxuICAgIGxvYWRlZENtZE1hcC5zZXQoY21kTmFtZSwgZmlsZVBhdGghKTtcbiAgICAvLyBjbWRJbmZvUGFja3NbMF0gPSB7Y21kOiBjbWROYW1lLCBmaWxlOiBmaWxlUGF0aCF9O1xuICAgIC8vIGNsaVN0b3JlLmNsaUFjdGlvbkRpc3BhdGNoZXIudXBkYXRlTG9hZGVkQ21kKGNtZEluZm9QYWNrcyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgLy8gY29uc29sZS5sb2coYExvYWRpbmcgY29tbWFuZCBcIiR7Y21kTmFtZX1cIiBmcm9tIGV4dGVuc2lvbiAke2ZpbGVQYXRofWApO1xuICAgIHJldHVybiBvcmlnUGdtQ29tbWFuZC5jYWxsKHRoaXMsIG5hbWVBbmRBcmdzLCAuLi5yZXN0QXJncyk7XG4gIH0gYXMgYW55O1xuXG4gIGNvbnN0IGF2YWlsYWJsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBkciA9IHBrLmpzb24uZHI7XG4gICAgaWYgKGRyID09IG51bGwgfHwgZHIuY2xpID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBjb25zdCBbcGtnRmlsZVBhdGgsIGZ1bmNOYW1lXSA9IChkci5jbGkgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuICAgIC8vIGlmICghXy5oYXMod3Mub3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBleHRlbnNpb24ucGtOYW1lKSAmJiAhXy5oYXMod3Mub3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzLCBleHRlbnNpb24ucGtOYW1lKSlcbiAgICAvLyAgIGNvbnRpbnVlO1xuXG4gICAgYXZhaWxhYmxlcy5wdXNoKHBrLm5hbWUpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZpbGVQYXRoID0gcmVxdWlyZS5yZXNvbHZlKHBrLm5hbWUgKyAnLycgKyBwa2dGaWxlUGF0aCk7XG4gICAgfSBjYXRjaCAoZSkge31cblxuICAgIGlmIChmaWxlUGF0aCAhPSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzdWJDbWRGYWN0b3J5OiB0cC5DbGlFeHRlbnNpb24gPSBmdW5jTmFtZSA/IHJlcXVpcmUoZmlsZVBhdGgpW2Z1bmNOYW1lXSA6XG4gICAgICAgICAgcmVxdWlyZShmaWxlUGF0aCk7XG4gICAgICAgIHN1YkNtZEZhY3RvcnkocHJvZ3JhbSwgd2l0aEdsb2JhbE9wdGlvbnMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgY29tbWFuZCBsaW5lIGV4dGVuc2lvbiBpbiBwYWNrYWdlICcgKyBway5uYW1lLCBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGF2YWlsYWJsZXM7XG59XG5cbmZ1bmN0aW9uIGhsKHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gY2hhbGsuZ3JlZW4odGV4dCk7XG59XG5cbmZ1bmN0aW9uIGhsRGVzYyh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyZWVuKHRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIHByb2dyYW0ub3B0aW9uKCctYywgLS1jb25maWcgPGNvbmZpZy1maWxlPicsXG4gICAgaGxEZXNjKCdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyksXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7IHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7fSwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tcHJvcCA8cHJvcGVydHktcGF0aD12YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4nLFxuICAgIGhsRGVzYygnPHByb3BlcnR5LXBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmdcXG4gZS5nLlxcbicpICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQHdmaC9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAd2ZoL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwXFxuJyArXG4gICAgJy0tcHJvcCBhcnJheWxpa2UucHJvcFswXT1mb29iYXJcXG4nICtcbiAgICAnLS1wcm9wIFtcIkB3ZmgvZm9vLmJhclwiLFwicHJvcFwiLDBdPXRydWUnLFxuICAgIGFycmF5T3B0aW9uRm4sIFtdIGFzIHN0cmluZ1tdKTtcbiAgLy8gLm9wdGlvbignLS1sb2ctc3RhdCcsIGhsRGVzYygnUHJpbnQgaW50ZXJuYWwgUmVkdXggc3RhdGUvYWN0aW9ucyBmb3IgZGVidWcnKSk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG5cbiJdfQ==