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
const _ = __importStar(require("lodash"));
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
        const { stateFactory } = require('../store');
        yield Promise.resolve().then(() => __importStar(require('./cli-store')));
        stateFactory.configureStore();
        let cliExtensions;
        const program = new commander_1.default.Command('plink')
            .action(args => {
            program.outputHelp();
            // tslint:disable-next-line: no-console
            console.log('\nversion:', pk.version);
            if (cliExtensions.length > 0) {
                // tslint:disable-next-line: no-console
                console.log(`Found ${cliExtensions.length} command line extension` +
                    `${cliExtensions.length > 1 ? 's' : ''}: ${cliExtensions.join(', ')}`);
            }
        });
        program.version(pk.version, '-v, --vers', 'output the current version');
        subDrcpCommand(program);
        if (process.env.PLINK_SAFE !== 'true')
            cliExtensions = loadExtensionCommand(program);
        try {
            yield program.parseAsync(process.argv);
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
    const initCmd = program.command('init [workspace]')
        .description('Initialize workspace directory, generate basic configuration files for project and component packages')
        .option('-f | --force', 'Force run "npm install" in specific workspace directory', false)
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
    program.command('clean [symlink]').description('Clean whole "dist" directory or only symbolic links from node_modules')
        .action((symlink) => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-clean')))).default(symlink === 'symlink');
    }));
    /**
     * command ls
     */
    const listCmd = program.command('ls').alias('list')
        .option('-j, --json', 'list linked dependencies in form of JSON', false)
        .description('If you want to know how many components will actually run, this command prints out a list and the priorities, including installed components')
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
        (yield Promise.resolve().then(() => __importStar(require('../package-runner')))).runSinglePackage({ target, args });
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
        .option('--jsx', 'includes TSX file', false)
        .option('--ed, --emitDeclarationOnly', 'Typescript compiler option: --emitDeclarationOnly.\nOnly emit ‘.d.ts’ declaration files.', false)
        .option('--source-map', 'Source map style: "inline" or "file"', 'inline')
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        const opt = tscCmd.opts();
        // console.log(opt);
        const config = yield (yield Promise.resolve().then(() => __importStar(require('../config')))).default;
        yield config.init(runCmd.opts());
        const logConfig = yield (yield Promise.resolve().then(() => __importStar(require('../log-config')))).default;
        logConfig(config());
        const tsCmd = yield Promise.resolve().then(() => __importStar(require('../ts-cmd')));
        yield tsCmd.tsc({
            package: packages,
            project: opt.project,
            watch: opt.watch,
            sourceMap: opt.sourceMap,
            jsx: opt.jsx,
            ed: opt.emitDeclarationOnly
        });
        const { stateFactory } = require('../store');
        stateFactory.stopAllEpics();
    }));
    withGlobalOptions(tscCmd);
    tscCmd.usage(tscCmd.usage() + '\n' + 'Run gulp-typescript to compile Node.js side typescript files.\n\n' +
        'It compiles \n  "<package-directory>/ts/**/*.ts" to "<package-directory>/dist",\n' +
        '  or\n  "<package-directory>/isom/**/*.ts" to "<package-directory>/isom"\n for all @dr packages.\n' +
        'I suggest to put Node.js side TS code in directory `ts`, and isomorphic TS code (meaning it runs in ' +
        'both Node.js and Browser) in directory `isom`.\n' +
        hlDesc('plink tsc <package..>\n') + ' Only compile specific components by providing package name or short name\n' +
        hlDesc('plink tsc\n') + ' Compile all components belong to associated projects, not including installed components\n' +
        hlDesc('plink tsc --pj <project directory,...>\n') + ' Compile components belong to specific projects\n' +
        hlDesc('plink tsc [package...] -w\n') + ' Watch components change and compile when new typescript file is changed or created\n\n');
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
    const packCmd = program.command('pack [packageDir...]')
        .description('npm pack every pakage into tarball files')
        .option('--pj, --project <project-dir,...>', 'project directories to be looked up for all components which need to be packed to tarball files', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
    }, [])
        .action((packageDirs) => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-pack')))).pack(Object.assign(Object.assign({}, packCmd.opts()), { packageDirs }));
    }));
    withGlobalOptions(packCmd);
}
function loadExtensionCommand(program) {
    const { getState } = require('./cli-store');
    const { getState: getPkgState, pathToWorkspace } = require('../package-mgr');
    const ws = getPkgState().workspaces.get(pathToWorkspace(process.cwd()));
    if (ws == null)
        return [];
    const availables = [];
    for (const extension of getState().extensions.values()) {
        if (!_.has(ws.originInstallJson.dependencies, extension.pkName) && !_.has(ws.originInstallJson.devDependencies, extension.pkName))
            continue;
        availables.push(extension.pkName);
        let filePath = null;
        try {
            filePath = require.resolve(extension.pkName + '/' + extension.pkgFilePath);
        }
        catch (e) { }
        if (filePath != null) {
            try {
                const subCmdFactory = extension.funcName ? require(filePath)[extension.funcName] :
                    require(filePath);
                subCmdFactory(program, withGlobalOptions);
            }
            catch (e) {
                // tslint:disable-next-line: no-console
                console.error('Failed to load command line extension in package ' + extension.pkName, e);
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
        '--prop port=8080 --prop devMode=false --prop @dr/foobar.api=http://localhost:8080\n' +
        '--prop port=8080 --prop devMode=false --prop @dr/foobar.api=http://localhost:8080\n' +
        '--prop arraylike.prop[0]=foobar\n' +
        '--prop ["@dr/foo.bar","prop",0]=true', arrayOptionFn, []);
    // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));
    return program;
}
exports.withGlobalOptions = withGlobalOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLDBEQUFrQztBQUNsQyxrREFBMEI7QUFLMUIsMENBQTRCO0FBQzVCLDJCQUEyQjtBQUMzQixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUN2QyxxQkFBcUI7QUFFckIsTUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFZLEVBQUUsSUFBMEIsRUFBRSxFQUFFO0lBQ2pFLElBQUksSUFBSTtRQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUM7QUFFRixTQUFzQixXQUFXLENBQUMsU0FBaUI7O1FBQ2pELE9BQU8sQ0FBQyxLQUFLLEdBQUcsc0JBQXNCLENBQUM7UUFDdkMsTUFBTSxFQUFDLFlBQVksRUFBQyxHQUFpQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekQsd0RBQWEsYUFBYSxHQUFDLENBQUM7UUFDNUIsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRzlCLElBQUksYUFBdUIsQ0FBQztRQUM1QixNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDYixPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QyxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM1Qix1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxhQUFhLENBQUMsTUFB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QUFjLENBQUM7U0FDbEYsTUFBTSxDQUFDLGdEQUFnRCxFQUN0RCxNQUFNLENBQUMsOElBQThJLENBQUM7UUFDdEoscUZBQXFGO1FBQ3JGLHFGQUFxRjtRQUNyRixtQ0FBbUM7UUFDbkMsc0NBQXNDLEVBQ3RDLGFBQWEsRUFBRSxFQUFjLENBQUMsQ0FBQztJQUNqQyxpRkFBaUY7SUFFakYsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQWRELDhDQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIHRwIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgY2xpU3RvcmUgZnJvbSAnLi9jbGktc3RvcmUnO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgcGsgPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlJyk7XG4vLyBjb25zdCBXSURUSCA9IDEzMDtcblxuY29uc3QgYXJyYXlPcHRpb25GbiA9IChjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSA9PiB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZHJjcENvbW1hbmQoc3RhcnRUaW1lOiBudW1iZXIpIHtcbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayAtIGNvbW1hbmQgbGluZSc7XG4gIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9OiB0eXBlb2Ygc3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZScpO1xuICBhd2FpdCBpbXBvcnQoJy4vY2xpLXN0b3JlJyk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG5cbiAgbGV0IGNsaUV4dGVuc2lvbnM6IHN0cmluZ1tdO1xuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKCdwbGluaycpXG4gIC5hY3Rpb24oYXJncyA9PiB7XG4gICAgcHJvZ3JhbS5vdXRwdXRIZWxwKCk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbnZlcnNpb246JywgcGsudmVyc2lvbik7XG4gICAgaWYgKGNsaUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtjbGlFeHRlbnNpb25zLmxlbmd0aH0gY29tbWFuZCBsaW5lIGV4dGVuc2lvbmAgK1xuICAgICAgYCR7Y2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiAke2NsaUV4dGVuc2lvbnMuam9pbignLCAnKX1gKTtcbiAgICB9XG4gIH0pO1xuXG4gIHByb2dyYW0udmVyc2lvbihway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xuICBzdWJEcmNwQ29tbWFuZChwcm9ncmFtKTtcbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX1NBRkUgIT09ICd0cnVlJylcbiAgICBjbGlFeHRlbnNpb25zID0gbG9hZEV4dGVuc2lvbkNvbW1hbmQocHJvZ3JhbSk7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkQnJpZ2h0KGUpLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3ViRHJjcENvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqXG4gICAqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCBbd29ya3NwYWNlXScpXG4gIC5kZXNjcmlwdGlvbignSW5pdGlhbGl6ZSB3b3Jrc3BhY2UgZGlyZWN0b3J5LCBnZW5lcmF0ZSBiYXNpYyBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBwcm9qZWN0IGFuZCBjb21wb25lbnQgcGFja2FnZXMnKVxuICAub3B0aW9uKCctZiB8IC0tZm9yY2UnLCAnRm9yY2UgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5JywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0teWFybicsICdVc2UgWWFybiB0byBpbnN0YWxsIGNvbXBvbmVudCBwZWVyIGRlcGVuZGVuY2llcyBpbnN0ZWFkIG9mIHVzaW5nIE5QTScsIGZhbHNlKVxuICAub3B0aW9uKCctLXByb2R1Y3Rpb24nLCAnQWRkIFwiLS1wcm9kdWN0aW9uXCIgb3IgXCItLW9ubHk9cHJvZFwiIGNvbW1hbmQgbGluZSBhcmd1bWVudCB0byBcInlhcm4vbnBtIGluc3RhbGxcIicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWluaXQnKSkuZGVmYXVsdChpbml0Q21kLm9wdHMoKSBhcyBhbnksIHdvcmtzcGFjZSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhpbml0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBwcm9qZWN0XG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ3Byb2plY3QgW2FkZHxyZW1vdmVdIFtwcm9qZWN0LWRpci4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3QgYXNzb2NpYXRlZCBwcm9qZWN0IGZvbGRlcnMnKVxuICAuYWN0aW9uKGFzeW5jIChhY3Rpb246ICdhZGQnfCdyZW1vdmUnfHVuZGVmaW5lZCwgcHJvamVjdERpcjogc3RyaW5nW10pID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoYWN0aW9uLCBwcm9qZWN0RGlyKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbGludFxuICAgKi9cbiAgY29uc3QgbGludENtZCA9IHByb2dyYW0uY29tbWFuZCgnbGludCBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJylcbiAgLm9wdGlvbignLS1waiA8cHJvamVjdDEscHJvamVjdDIuLi4+JywgJ2xpbnQgb25seSBUUyBjb2RlIGZyb20gc3BlY2lmaWMgcHJvamVjdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIHBhY2thZ2VzID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW50JykpLmRlZmF1bHQocGFja2FnZXMsIGxpbnRDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaW50Q21kKTtcbiAgbGludENtZC51c2FnZShsaW50Q21kLnVzYWdlKCkgK1xuICAgIGhsKCdcXG5kcmNwIGxpbnQgLS1waiA8cHJvamVjdC1kaXIuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnlcXG4nICtcbiAgICBobCgnXFxuZHJjcCBsaW50IDxjb21wb25lbnQtcGFja2FnZS4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBjb21wb25lbnQgcGFja2FnZXMnKTtcblxuICAvKipcbiAgICogY29tbWFuZCBjbGVhblxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdjbGVhbiBbc3ltbGlua10nKS5kZXNjcmlwdGlvbignQ2xlYW4gd2hvbGUgXCJkaXN0XCIgZGlyZWN0b3J5IG9yIG9ubHkgc3ltYm9saWMgbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAuYWN0aW9uKGFzeW5jIChzeW1saW5rOiAnc3ltbGluaycgfCB1bmRlZmluZWQpID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jbGVhbicpKS5kZWZhdWx0KHN5bWxpbmsgPT09ICdzeW1saW5rJyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxzXG4gICAqL1xuICBjb25zdCBsaXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdscycpLmFsaWFzKCdsaXN0JylcbiAgLm9wdGlvbignLWosIC0tanNvbicsICdsaXN0IGxpbmtlZCBkZXBlbmRlbmNpZXMgaW4gZm9ybSBvZiBKU09OJywgZmFsc2UpXG4gIC5kZXNjcmlwdGlvbignSWYgeW91IHdhbnQgdG8ga25vdyBob3cgbWFueSBjb21wb25lbnRzIHdpbGwgYWN0dWFsbHkgcnVuLCB0aGlzIGNvbW1hbmQgcHJpbnRzIG91dCBhIGxpc3QgYW5kIHRoZSBwcmlvcml0aWVzLCBpbmNsdWRpbmcgaW5zdGFsbGVkIGNvbXBvbmVudHMnKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5kZWZhdWx0KGxpc3RDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaXN0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBydW5cbiAgICovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc3BlY2lmaWMgbW9kdWxlXFwncyBleHBvcnRlZCBmdW5jdGlvblxcbicpXG4gIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2NvbmZpZycpKS5kZWZhdWx0O1xuICAgIGF3YWl0IGNvbmZpZy5pbml0KHJ1bkNtZC5vcHRzKCkgYXMgdHAuR2xvYmFsT3B0aW9ucyk7XG4gICAgY29uc3QgbG9nQ29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vbG9nLWNvbmZpZycpKS5kZWZhdWx0O1xuICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhydW5DbWQpO1xuICBydW5DbWQudXNhZ2UocnVuQ21kLnVzYWdlKCkgKyAnXFxuJyArIGNoYWxrLmdyZWVuKCdwbGluayBydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl1cXG4nKSArXG4gIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAnPHRhcmdldD4gLSBKUyBvciBUUyBmaWxlIG1vZHVsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXNvbHZlZCBieSBOb2RlLmpzICh0cy1ub2RlKSBmb2xsb3dlZCBieSBcIiNcIiBhbmQgZXhwb3J0ZWQgZnVuY3Rpb24gbmFtZSxcXG4nICtcbiAgJ2UuZy4gXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgJywgZnVuY3Rpb24gY2FuIGJlIGFzeW5jIHdoaWNoIHJldHVybnMgUHJvbWlzZVxcbicgK1xuICBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuICAvKipcbiAgICogdHNjIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHRzY0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignUnVuIFR5cGVzY3JpcHQgY29tcGlsZXInKVxuICAub3B0aW9uKCctdywgLS13YXRjaCcsICdUeXBlc2NyaXB0IGNvbXBpbGVyIHdhdGNoIG1vZGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS1qc3gnLCAnaW5jbHVkZXMgVFNYIGZpbGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnU291cmNlIG1hcCBzdHlsZTogXCJpbmxpbmVcIiBvciBcImZpbGVcIicsICdpbmxpbmUnKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICBjb25zdCBvcHQgPSB0c2NDbWQub3B0cygpO1xuICAgIC8vIGNvbnNvbGUubG9nKG9wdCk7XG4gICAgY29uc3QgY29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgYXdhaXQgY29uZmlnLmluaXQocnVuQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICBjb25zdCBsb2dDb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9sb2ctY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgICBjb25zdCB0c0NtZCA9IGF3YWl0IGltcG9ydCgnLi4vdHMtY21kJyk7XG4gICAgYXdhaXQgdHNDbWQudHNjKHtcbiAgICAgIHBhY2thZ2U6IHBhY2thZ2VzLFxuICAgICAgcHJvamVjdDogb3B0LnByb2plY3QsXG4gICAgICB3YXRjaDogb3B0LndhdGNoLFxuICAgICAgc291cmNlTWFwOiBvcHQuc291cmNlTWFwLFxuICAgICAganN4OiBvcHQuanN4LFxuICAgICAgZWQ6IG9wdC5lbWl0RGVjbGFyYXRpb25Pbmx5XG4gICAgfSk7XG4gICAgY29uc3Qge3N0YXRlRmFjdG9yeX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gICAgc3RhdGVGYWN0b3J5LnN0b3BBbGxFcGljcygpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnModHNjQ21kKTtcbiAgdHNjQ21kLnVzYWdlKHRzY0NtZC51c2FnZSgpICsgJ1xcbicgKyAnUnVuIGd1bHAtdHlwZXNjcmlwdCB0byBjb21waWxlIE5vZGUuanMgc2lkZSB0eXBlc2NyaXB0IGZpbGVzLlxcblxcbicgK1xuICAnSXQgY29tcGlsZXMgXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vdHMvKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9kaXN0XCIsXFxuJyArXG4gICcgIG9yXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbS8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb21cIlxcbiBmb3IgYWxsIEBkciBwYWNrYWdlcy5cXG4nICtcbiAgJ0kgc3VnZ2VzdCB0byBwdXQgTm9kZS5qcyBzaWRlIFRTIGNvZGUgaW4gZGlyZWN0b3J5IGB0c2AsIGFuZCBpc29tb3JwaGljIFRTIGNvZGUgKG1lYW5pbmcgaXQgcnVucyBpbiAnICtcbiAgJ2JvdGggTm9kZS5qcyBhbmQgQnJvd3NlcikgaW4gZGlyZWN0b3J5IGBpc29tYC5cXG4nICtcbiAgaGxEZXNjKCdwbGluayB0c2MgPHBhY2thZ2UuLj5cXG4nKSArICcgT25seSBjb21waWxlIHNwZWNpZmljIGNvbXBvbmVudHMgYnkgcHJvdmlkaW5nIHBhY2thZ2UgbmFtZSBvciBzaG9ydCBuYW1lXFxuJyArXG4gIGhsRGVzYygncGxpbmsgdHNjXFxuJykgKyAnIENvbXBpbGUgYWxsIGNvbXBvbmVudHMgYmVsb25nIHRvIGFzc29jaWF0ZWQgcHJvamVjdHMsIG5vdCBpbmNsdWRpbmcgaW5zdGFsbGVkIGNvbXBvbmVudHNcXG4nICtcbiAgaGxEZXNjKCdwbGluayB0c2MgLS1waiA8cHJvamVjdCBkaXJlY3RvcnksLi4uPlxcbicpICsgJyBDb21waWxlIGNvbXBvbmVudHMgYmVsb25nIHRvIHNwZWNpZmljIHByb2plY3RzXFxuJyArXG4gIGhsRGVzYygncGxpbmsgdHNjIFtwYWNrYWdlLi4uXSAtd1xcbicpICsgJyBXYXRjaCBjb21wb25lbnRzIGNoYW5nZSBhbmQgY29tcGlsZSB3aGVuIG5ldyB0eXBlc2NyaXB0IGZpbGUgaXMgY2hhbmdlZCBvciBjcmVhdGVkXFxuXFxuJyk7XG5cbiAgLyoqXG4gICAqIEJ1bXAgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgYnVtcENtZCA9IHByb2dyYW0uY29tbWFuZCgnYnVtcCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignYnVtcCBwYWNrYWdlLmpzb24gdmVyc2lvbiBudW1iZXIgZm9yIHNwZWNpZmljIHBhY2thZ2UsIHNhbWUgYXMgXCJucG0gdmVyc2lvblwiIGRvZXMnKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnb25seSBidW1wIGNvbXBvbmVudCBwYWNrYWdlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLWksIC0taW5jcmUtdmVyc2lvbiA8bWFqb3IgfCBtaW5vciB8IHBhdGNoIHwgcHJlbWFqb3IgfCBwcmVtaW5vciB8IHByZXBhdGNoIHwgcHJlcmVsZWFzZT4nLFxuICAgICAgJ3ZlcnNpb24gaW5jcmVtZW50LCB2YWxpZCB2YWx1ZXMgYXJlOiBtYWpvciwgbWlub3IsIHBhdGNoLCBwcmVyZWxlYXNlJywgJ3BhdGNoJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWJ1bXAnKSkuZGVmYXVsdCh7Li4uYnVtcENtZC5vcHRzKCkgYXMgdHAuQnVtcE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGJ1bXBDbWQpO1xuICAvLyBidW1wQ21kLnVzYWdlKGJ1bXBDbWQudXNhZ2UoKSArICdcXG4nICsgaGwoJ3BsaW5rIGJ1bXAgPHBhY2thZ2U+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gIC8vICAgaGwoJ3BsaW5rIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlRGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBldmVyeSBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzJylcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JyxcbiAgICAncHJvamVjdCBkaXJlY3RvcmllcyB0byBiZSBsb29rZWQgdXAgZm9yIGFsbCBjb21wb25lbnRzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlRGlyczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXBhY2snKSkucGFjayh7Li4ucGFja0NtZC5vcHRzKCkgYXMgdHAuUGFja09wdGlvbnMsIHBhY2thZ2VEaXJzfSk7XG4gICAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHBhY2tDbWQpO1xufVxuXG5mdW5jdGlvbiBsb2FkRXh0ZW5zaW9uQ29tbWFuZChwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCk6IHN0cmluZ1tdIHtcbiAgY29uc3Qge2dldFN0YXRlfSA9IHJlcXVpcmUoJy4vY2xpLXN0b3JlJykgYXMgdHlwZW9mIGNsaVN0b3JlO1xuICBjb25zdCB7Z2V0U3RhdGU6IGdldFBrZ1N0YXRlLCBwYXRoVG9Xb3Jrc3BhY2V9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgcGtnTWdyO1xuICBjb25zdCB3cyA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQocGF0aFRvV29ya3NwYWNlKHByb2Nlc3MuY3dkKCkpKTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIFtdO1xuXG4gIGNvbnN0IGF2YWlsYWJsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXh0ZW5zaW9uIG9mIGdldFN0YXRlKCkuZXh0ZW5zaW9ucy52YWx1ZXMoKSkge1xuICAgIGlmICghXy5oYXMod3Mub3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBleHRlbnNpb24ucGtOYW1lKSAmJiAhXy5oYXMod3Mub3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzLCBleHRlbnNpb24ucGtOYW1lKSlcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgYXZhaWxhYmxlcy5wdXNoKGV4dGVuc2lvbi5wa05hbWUpO1xuICAgIGxldCBmaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGZpbGVQYXRoID0gcmVxdWlyZS5yZXNvbHZlKGV4dGVuc2lvbi5wa05hbWUgKyAnLycgKyBleHRlbnNpb24ucGtnRmlsZVBhdGgpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG5cbiAgICBpZiAoZmlsZVBhdGggIT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc3ViQ21kRmFjdG9yeTogdHAuQ2xpRXh0ZW5zaW9uID0gZXh0ZW5zaW9uLmZ1bmNOYW1lID8gcmVxdWlyZShmaWxlUGF0aClbZXh0ZW5zaW9uLmZ1bmNOYW1lXSA6XG4gICAgICAgICAgcmVxdWlyZShmaWxlUGF0aCk7XG4gICAgICAgIHN1YkNtZEZhY3RvcnkocHJvZ3JhbSwgd2l0aEdsb2JhbE9wdGlvbnMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgY29tbWFuZCBsaW5lIGV4dGVuc2lvbiBpbiBwYWNrYWdlICcgKyBleHRlbnNpb24ucGtOYW1lLCBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGF2YWlsYWJsZXM7XG59XG5cbmZ1bmN0aW9uIGhsKHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gY2hhbGsuZ3JlZW4odGV4dCk7XG59XG5cbmZ1bmN0aW9uIGhsRGVzYyh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyZWVuKHRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIHByb2dyYW0ub3B0aW9uKCctYywgLS1jb25maWcgPGNvbmZpZy1maWxlPicsXG4gICAgaGxEZXNjKCdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyksXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7IHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7fSwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tcHJvcCA8cHJvcGVydHktcGF0aD12YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4nLFxuICAgIGhsRGVzYygnPHByb3BlcnR5LXBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmdcXG4gZS5nLlxcbicpICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQGRyL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwXFxuJyArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEBkci9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyXFxuJyArXG4gICAgJy0tcHJvcCBbXCJAZHIvZm9vLmJhclwiLFwicHJvcFwiLDBdPXRydWUnLFxuICAgIGFycmF5T3B0aW9uRm4sIFtdIGFzIHN0cmluZ1tdKTtcbiAgLy8gLm9wdGlvbignLS1sb2ctc3RhdCcsIGhsRGVzYygnUHJpbnQgaW50ZXJuYWwgUmVkdXggc3RhdGUvYWN0aW9ucyBmb3IgZGVidWcnKSk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG5cbiJdfQ==