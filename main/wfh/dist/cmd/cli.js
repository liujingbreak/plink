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
const cliStore = __importStar(require("./cli-slice"));
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
    program.command('clean [symlink]').description('Clean whole "dist" directory or only symbolic links from node_modules')
        .action((symlink) => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-clean')))).default(symlink === 'symlink');
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
        .option('--source-map', 'Source map style: "inline" or "file"', 'inline')
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        const opt = tscCmd.opts();
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
    const packCmd = program.command('pack [packageDir...]')
        .description('npm pack every pakage into tarball files')
        .option('-w,--workspace <workspace-dir>', 'only include those linked packages which are dependency of specific workspaces', arrayOptionFn, [])
        .option('--pj, --project <project-dir>', 'project directories to be looked up for all packages which need to be packed to tarball files', arrayOptionFn, [])
        .action((packageDirs) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-pack')))).pack(Object.assign(Object.assign({}, packCmd.opts()), { packageDirs }));
    }));
    withGlobalOptions(packCmd);
    packCmd.usage(packCmd.usage() + '\nBy default, run "npm pack" for each linked package which are dependencies of current workspace');
    /**
     * Pack command
     */
    const publishCmd = program.command('publish [packageDir...]')
        .description('run npm publish')
        .option('--pj, --project <project-dir,...>', 'project directories to be looked up for all packages which need to be packed to tarball files', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
    }, [])
        .option('--public', 'same as "npm publish" command option "--access public"', false)
        .action((packageDirs) => __awaiter(this, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-pack')))).publish(Object.assign(Object.assign({}, publishCmd.opts()), { packageDirs }));
    }));
    withGlobalOptions(publishCmd);
}
function loadExtensionCommand(program) {
    const { getState } = require('./cli-slice');
    const { getState: getPkgState, workspaceKey } = require('../package-mgr');
    const ws = getPkgState().workspaces.get(workspaceKey(process.cwd()));
    if (ws == null)
        return [];
    const origPgmCommand = program.command;
    let filePath = null;
    program.command = function (nameAndArgs, ...restArgs) {
        const cmdName = /^\S+/.exec(nameAndArgs)[0];
        cliStore.cliActionDispatcher.updateLoadedCmd({ cmd: cmdName, file: filePath });
        // tslint:disable-next-line: no-console
        // console.log(`Loading command "${cmdName}" from extension ${filePath}`);
        return origPgmCommand.call(this, nameAndArgs, ...restArgs);
    };
    const availables = [];
    for (const extension of getState().extensions.values()) {
        if (!_.has(ws.originInstallJson.dependencies, extension.pkName) && !_.has(ws.originInstallJson.devDependencies, extension.pkName))
            continue;
        availables.push(extension.pkName);
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
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
        '--prop port=8080 --prop devMode=false --prop @wfh/foobar.api=http://localhost:8080\n' +
        '--prop arraylike.prop[0]=foobar\n' +
        '--prop ["@wfh/foo.bar","prop",0]=true', arrayOptionFn, []);
    // .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));
    return program;
}
exports.withGlobalOptions = withGlobalOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLDBEQUFrQztBQUNsQyxrREFBMEI7QUFHMUIsc0RBQXdDO0FBRXhDLDBDQUE0QjtBQUM1QiwyQkFBMkI7QUFDM0IsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDdkMscUJBQXFCO0FBRXJCLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsV0FBVyxDQUFDLFNBQWlCOztRQUNqRCxPQUFPLENBQUMsS0FBSyxHQUFHLHNCQUFzQixDQUFDO1FBQ3ZDLDREQUE0RDtRQUM1RCx3REFBYSxhQUFhLEdBQUMsQ0FBQztRQUM1QixpQ0FBaUM7UUFHakMsSUFBSSxhQUFtQyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNiLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLElBQUksYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM3Qyx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxhQUFhLENBQUMsTUFBTSx5QkFBeUI7b0JBQ2xFLEdBQUcsYUFBYSxDQUFDLE1BQU0sR0FB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OElBQThJLENBQUM7UUFDdEosc0ZBQXNGO1FBQ3RGLHNGQUFzRjtRQUN0RixtQ0FBbUM7UUFDbkMsdUNBQXVDLEVBQ3ZDLGFBQWEsRUFBRSxFQUFjLENBQUMsQ0FBQztJQUNqQyxpRkFBaUY7SUFFakYsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQWRELDhDQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbi8vIGltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIHRwIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0ICogYXMgY2xpU3RvcmUgZnJvbSAnLi9jbGktc2xpY2UnO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgcGsgPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlJyk7XG4vLyBjb25zdCBXSURUSCA9IDEzMDtcblxuY29uc3QgYXJyYXlPcHRpb25GbiA9IChjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSA9PiB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZHJjcENvbW1hbmQoc3RhcnRUaW1lOiBudW1iZXIpIHtcbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayAtIGNvbW1hbmQgbGluZSc7XG4gIC8vIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9OiB0eXBlb2Ygc3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZScpO1xuICBhd2FpdCBpbXBvcnQoJy4vY2xpLXNsaWNlJyk7XG4gIC8vIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG5cbiAgbGV0IGNsaUV4dGVuc2lvbnM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKCdwbGluaycpXG4gIC5hY3Rpb24oYXJncyA9PiB7XG4gICAgcHJvZ3JhbS5vdXRwdXRIZWxwKCk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbnZlcnNpb246JywgcGsudmVyc2lvbik7XG4gICAgaWYgKGNsaUV4dGVuc2lvbnMgJiYgY2xpRXh0ZW5zaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCAke2NsaUV4dGVuc2lvbnMubGVuZ3RofSBjb21tYW5kIGxpbmUgZXh0ZW5zaW9uYCArXG4gICAgICBgJHtjbGlFeHRlbnNpb25zLmxlbmd0aCA+IDEgPyAncycgOiAnJ306ICR7Y2xpRXh0ZW5zaW9ucy5qb2luKCcsICcpfWApO1xuICAgIH1cbiAgfSk7XG5cbiAgcHJvZ3JhbS52ZXJzaW9uKHBrLnZlcnNpb24sICctdiwgLS12ZXJzJywgJ291dHB1dCB0aGUgY3VycmVudCB2ZXJzaW9uJyk7XG4gIHN1YkRyY3BDb21tYW5kKHByb2dyYW0pO1xuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfU0FGRSAhPT0gJ3RydWUnKSB7XG4gICAgY2xpRXh0ZW5zaW9ucyA9IGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW0pO1xuICB9IGVsc2Uge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdWYWx1ZSBvZiBlbnZpcm9ubWVudCB2YXJhaWJsZSBcIlBMSU5LX1NBRkVcIiBpcyB0cnVlLCBza2lwIGxvYWRpbmcgZXh0ZW5zaW9uJyk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IHByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YsIHtmcm9tOiAnbm9kZSd9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkQnJpZ2h0KGUpLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3ViRHJjcENvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqXG4gICAqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCBbd29ya3NwYWNlLWRpcmVjdG9yeV0nKVxuICAuZGVzY3JpcHRpb24oJ0luaXRpYWxpemUgd29ya3NwYWNlIGRpcmVjdG9yeSwgZ2VuZXJhdGUgYmFzaWMgY29uZmlndXJhdGlvbiBmaWxlcyBmb3IgcHJvamVjdCBhbmQgY29tcG9uZW50IHBhY2thZ2VzJylcbiAgLm9wdGlvbignLWYsIC0tZm9yY2UnLCAnRm9yY2UgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5JywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0teWFybicsICdVc2UgWWFybiB0byBpbnN0YWxsIGNvbXBvbmVudCBwZWVyIGRlcGVuZGVuY2llcyBpbnN0ZWFkIG9mIHVzaW5nIE5QTScsIGZhbHNlKVxuICAub3B0aW9uKCctLXByb2R1Y3Rpb24nLCAnQWRkIFwiLS1wcm9kdWN0aW9uXCIgb3IgXCItLW9ubHk9cHJvZFwiIGNvbW1hbmQgbGluZSBhcmd1bWVudCB0byBcInlhcm4vbnBtIGluc3RhbGxcIicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWluaXQnKSkuZGVmYXVsdChpbml0Q21kLm9wdHMoKSBhcyBhbnksIHdvcmtzcGFjZSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhpbml0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBwcm9qZWN0XG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ3Byb2plY3QgW2FkZHxyZW1vdmVdIFtwcm9qZWN0LWRpci4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3QgYXNzb2NpYXRlZCBwcm9qZWN0IGZvbGRlcnMnKVxuICAuYWN0aW9uKGFzeW5jIChhY3Rpb246ICdhZGQnfCdyZW1vdmUnfHVuZGVmaW5lZCwgcHJvamVjdERpcjogc3RyaW5nW10pID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoYWN0aW9uLCBwcm9qZWN0RGlyKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbGludFxuICAgKi9cbiAgY29uc3QgbGludENtZCA9IHByb2dyYW0uY29tbWFuZCgnbGludCBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJylcbiAgLm9wdGlvbignLS1waiA8cHJvamVjdDEscHJvamVjdDIuLi4+JywgJ2xpbnQgb25seSBUUyBjb2RlIGZyb20gc3BlY2lmaWMgcHJvamVjdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIHBhY2thZ2VzID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW50JykpLmRlZmF1bHQocGFja2FnZXMsIGxpbnRDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaW50Q21kKTtcbiAgbGludENtZC51c2FnZShsaW50Q21kLnVzYWdlKCkgK1xuICAgIGhsKCdcXG5kcmNwIGxpbnQgLS1waiA8cHJvamVjdC1kaXIuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnlcXG4nICtcbiAgICBobCgnXFxuZHJjcCBsaW50IDxjb21wb25lbnQtcGFja2FnZS4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBjb21wb25lbnQgcGFja2FnZXMnKTtcblxuICAvKipcbiAgICogY29tbWFuZCBjbGVhblxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdjbGVhbiBbc3ltbGlua10nKS5kZXNjcmlwdGlvbignQ2xlYW4gd2hvbGUgXCJkaXN0XCIgZGlyZWN0b3J5IG9yIG9ubHkgc3ltYm9saWMgbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAuYWN0aW9uKGFzeW5jIChzeW1saW5rOiAnc3ltbGluaycgfCB1bmRlZmluZWQpID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jbGVhbicpKS5kZWZhdWx0KHN5bWxpbmsgPT09ICdzeW1saW5rJyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxzXG4gICAqL1xuICBjb25zdCBsaXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdscycpLmFsaWFzKCdsaXN0JylcbiAgLm9wdGlvbignLWosIC0tanNvbicsICdsaXN0IGxpbmtlZCBkZXBlbmRlbmNpZXMgaW4gZm9ybSBvZiBKU09OJywgZmFsc2UpXG4gIC5kZXNjcmlwdGlvbignSWYgeW91IHdhbnQgdG8ga25vdyBob3cgbWFueSBwYWNrYWdlcyB3aWxsIGFjdHVhbGx5IHJ1biwgdGhpcyBjb21tYW5kIHByaW50cyBvdXQgYSBsaXN0IGFuZCB0aGUgcHJpb3JpdGllcywgaW5jbHVkaW5nIGluc3RhbGxlZCBwYWNrYWdlcycpXG4gIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmRlZmF1bHQobGlzdENtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGxpc3RDbWQpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHJ1blxuICAgKi9cbiAgY29uc3QgcnVuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzcGVjaWZpYyBtb2R1bGVcXCdzIGV4cG9ydGVkIGZ1bmN0aW9uXFxuJylcbiAgLmFjdGlvbihhc3luYyAodGFyZ2V0OiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgY29uc3QgY29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgYXdhaXQgY29uZmlnLmluaXQocnVuQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICBjb25zdCBsb2dDb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9sb2ctY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9wYWNrYWdlLXJ1bm5lcicpKS5ydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHJ1bkNtZCk7XG4gIHJ1bkNtZC51c2FnZShydW5DbWQudXNhZ2UoKSArICdcXG4nICsgY2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXVxcbicpICtcbiAgYGUuZy5cXG4gICR7Y2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biBmb3JiYXItcGFja2FnZS9kaXN0L2ZpbGUjZnVuY3Rpb24gYXJndW1lbnQxIGFyZ3VtZW50Mi4uLicpfVxcbmAgK1xuICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICc8dGFyZ2V0PiAtIEpTIG9yIFRTIGZpbGUgbW9kdWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlc29sdmVkIGJ5IE5vZGUuanMgKHRzLW5vZGUpIGZvbGxvd2VkIGJ5IFwiI1wiIGFuZCBleHBvcnRlZCBmdW5jdGlvbiBuYW1lLFxcbicgK1xuICAnZS5nLiBcXG4nICtcbiAgY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAnLCBmdW5jdGlvbiBjYW4gYmUgYXN5bmMgd2hpY2ggcmV0dXJucyBQcm9taXNlXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdub2RlX21vZHVsZXMvcGFja2FnZS1kaXIvZGlzdC9mb29iYXIudHMjbXlGdW5jdGlvbicpICtcbiAgJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gVHlwZXNjcmlwdCBjb21waWxlcicpXG4gIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgd2F0Y2ggbW9kZScsIGZhbHNlKVxuICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAvLyAub3B0aW9uKCctLXdzLC0td29ya3NwYWNlIDx3b3Jrc3BhY2UtZGlyPicsICdvbmx5IGluY2x1ZGUgdGhvc2UgbGlua2VkIHBhY2thZ2VzIHdoaWNoIGFyZSBkZXBlbmRlbmN5IG9mIHNwZWNpZmljIHdvcmtzcGFjZXMnLFxuICAvLyAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAub3B0aW9uKCctLWpzeCcsICdpbmNsdWRlcyBUU1ggZmlsZScsIGZhbHNlKVxuICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdTb3VyY2UgbWFwIHN0eWxlOiBcImlubGluZVwiIG9yIFwiZmlsZVwiJywgJ2lubGluZScpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG5cbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9jb25maWcnKSkuZGVmYXVsdDtcbiAgICBhd2FpdCBjb25maWcuaW5pdChydW5DbWQub3B0cygpIGFzIHRwLkdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IGxvZ0NvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2xvZy1jb25maWcnKSkuZGVmYXVsdDtcbiAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgIGNvbnN0IHRzQ21kID0gYXdhaXQgaW1wb3J0KCcuLi90cy1jbWQnKTtcbiAgICBhd2FpdCB0c0NtZC50c2Moe1xuICAgICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgICBwcm9qZWN0OiBvcHQucHJvamVjdCxcbiAgICAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgICBqc3g6IG9wdC5qc3gsXG4gICAgICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHlcbiAgICB9KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHRzY0NtZCk7XG4gIHRzY0NtZC51c2FnZSh0c2NDbWQudXNhZ2UoKSArICdcXG4nICsgJ1J1biBndWxwLXR5cGVzY3JpcHQgdG8gY29tcGlsZSBOb2RlLmpzIHNpZGUgVHlwZXNjcmlwdCBmaWxlcy5cXG5cXG4nICtcbiAgJ0l0IGNvbXBpbGVzIFxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L3RzLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vZGlzdFwiLFxcbicgK1xuICAnICBvclxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb20vKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tXCJcXG4gZm9yIGFsbCBAd2ZoIHBhY2thZ2VzLlxcbicgK1xuICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcbicgK1xuICBobERlc2MoJ3BsaW5rIHRzY1xcbicpICsgJ0NvbXBpbGUgbGlua2VkIHBhY2thZ2VzIHRoYXQgYXJlIGRlcGVuZGVuY2llcyBvZiBjdXJyZW50IHdvcmtzcGFjZSAoeW91IHNoYWxsIHJ1biB0aGlzIGNvbW1hbmQgb25seSBpbiBhIHdvcmtzcGFjZSBkaXJlY3RvcnkpXFxuJyArXG4gIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBwYWNrYWdlcyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgaGxEZXNjKCdwbGluayB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIHBhY2thZ2VzIGNoYW5nZSBhbmQgY29tcGlsZSB3aGVuIG5ldyB0eXBlc2NyaXB0IGZpbGUgaXMgY2hhbmdlZCBvciBjcmVhdGVkXFxuXFxuJyk7XG5cbiAgLyoqXG4gICAqIEJ1bXAgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgYnVtcENtZCA9IHByb2dyYW0uY29tbWFuZCgnYnVtcCBbcGFja2FnZS4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignYnVtcCBwYWNrYWdlLmpzb24gdmVyc2lvbiBudW1iZXIgZm9yIHNwZWNpZmljIHBhY2thZ2UsIHNhbWUgYXMgXCJucG0gdmVyc2lvblwiIGRvZXMnKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnb25seSBidW1wIGNvbXBvbmVudCBwYWNrYWdlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLWksIC0taW5jcmUtdmVyc2lvbiA8bWFqb3IgfCBtaW5vciB8IHBhdGNoIHwgcHJlbWFqb3IgfCBwcmVtaW5vciB8IHByZXBhdGNoIHwgcHJlcmVsZWFzZT4nLFxuICAgICAgJ3ZlcnNpb24gaW5jcmVtZW50LCB2YWxpZCB2YWx1ZXMgYXJlOiBtYWpvciwgbWlub3IsIHBhdGNoLCBwcmVyZWxlYXNlJywgJ3BhdGNoJylcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWJ1bXAnKSkuZGVmYXVsdCh7Li4uYnVtcENtZC5vcHRzKCkgYXMgdHAuQnVtcE9wdGlvbnMsIHBhY2thZ2VzfSk7XG4gICAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGJ1bXBDbWQpO1xuICAvLyBidW1wQ21kLnVzYWdlKGJ1bXBDbWQudXNhZ2UoKSArICdcXG4nICsgaGwoJ3BsaW5rIGJ1bXAgPHBhY2thZ2U+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gIC8vICAgaGwoJ3BsaW5rIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlRGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBldmVyeSBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzJylcbiAgICAub3B0aW9uKCctdywtLXdvcmtzcGFjZSA8d29ya3NwYWNlLWRpcj4nLCAnb25seSBpbmNsdWRlIHRob3NlIGxpbmtlZCBwYWNrYWdlcyB3aGljaCBhcmUgZGVwZW5kZW5jeSBvZiBzcGVjaWZpYyB3b3Jrc3BhY2VzJyxcbiAgICAgIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXI+JyxcbiAgICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIHBhY2thZ2VzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZURpcnM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wYWNrJykpLnBhY2soey4uLnBhY2tDbWQub3B0cygpIGFzIHRwLlBhY2tPcHRpb25zLCBwYWNrYWdlRGlyc30pO1xuICAgIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhwYWNrQ21kKTtcbiAgcGFja0NtZC51c2FnZShwYWNrQ21kLnVzYWdlKCkgKyAnXFxuQnkgZGVmYXVsdCwgcnVuIFwibnBtIHBhY2tcIiBmb3IgZWFjaCBsaW5rZWQgcGFja2FnZSB3aGljaCBhcmUgZGVwZW5kZW5jaWVzIG9mIGN1cnJlbnQgd29ya3NwYWNlJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcHVibGlzaENtZCA9IHByb2dyYW0uY29tbWFuZCgncHVibGlzaCBbcGFja2FnZURpci4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIG5wbSBwdWJsaXNoJylcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JyxcbiAgICAncHJvamVjdCBkaXJlY3RvcmllcyB0byBiZSBsb29rZWQgdXAgZm9yIGFsbCBwYWNrYWdlcyB3aGljaCBuZWVkIHRvIGJlIHBhY2tlZCB0byB0YXJiYWxsIGZpbGVzJyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLS1wdWJsaWMnLCAnc2FtZSBhcyBcIm5wbSBwdWJsaXNoXCIgY29tbWFuZCBvcHRpb24gXCItLWFjY2VzcyBwdWJsaWNcIicsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktcGFjaycpKS5wdWJsaXNoKHsuLi5wdWJsaXNoQ21kLm9wdHMoKSBhcyB0cC5QdWJsaXNoT3B0aW9ucywgcGFja2FnZURpcnN9KTtcbiAgICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMocHVibGlzaENtZCk7XG59XG5cbmZ1bmN0aW9uIGxvYWRFeHRlbnNpb25Db21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKTogc3RyaW5nW10ge1xuICBjb25zdCB7Z2V0U3RhdGV9ID0gcmVxdWlyZSgnLi9jbGktc2xpY2UnKSBhcyB0eXBlb2YgY2xpU3RvcmU7XG4gIGNvbnN0IHtnZXRTdGF0ZTogZ2V0UGtnU3RhdGUsIHdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBwa2dNZ3I7XG4gIGNvbnN0IHdzID0gZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm4gW107XG5cbiAgY29uc3Qgb3JpZ1BnbUNvbW1hbmQgPSBwcm9ncmFtLmNvbW1hbmQ7XG5cbiAgbGV0IGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICBwcm9ncmFtLmNvbW1hbmQgPSBmdW5jdGlvbih0aGlzOiB0eXBlb2YgcHJvZ3JhbSwgbmFtZUFuZEFyZ3M6IHN0cmluZywgLi4ucmVzdEFyZ3M6IGFueVtdKSB7XG4gICAgY29uc3QgY21kTmFtZSA9IC9eXFxTKy8uZXhlYyhuYW1lQW5kQXJncykhWzBdO1xuICAgIGNsaVN0b3JlLmNsaUFjdGlvbkRpc3BhdGNoZXIudXBkYXRlTG9hZGVkQ21kKHtjbWQ6IGNtZE5hbWUsIGZpbGU6IGZpbGVQYXRoIX0pO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIC8vIGNvbnNvbGUubG9nKGBMb2FkaW5nIGNvbW1hbmQgXCIke2NtZE5hbWV9XCIgZnJvbSBleHRlbnNpb24gJHtmaWxlUGF0aH1gKTtcbiAgICByZXR1cm4gb3JpZ1BnbUNvbW1hbmQuY2FsbCh0aGlzLCBuYW1lQW5kQXJncywgLi4ucmVzdEFyZ3MpO1xuICB9IGFzIGFueTtcblxuICBjb25zdCBhdmFpbGFibGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGV4dGVuc2lvbiBvZiBnZXRTdGF0ZSgpLmV4dGVuc2lvbnMudmFsdWVzKCkpIHtcbiAgICBpZiAoIV8uaGFzKHdzLm9yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgZXh0ZW5zaW9uLnBrTmFtZSkgJiYgIV8uaGFzKHdzLm9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcywgZXh0ZW5zaW9uLnBrTmFtZSkpXG4gICAgICBjb250aW51ZTtcblxuICAgIGF2YWlsYWJsZXMucHVzaChleHRlbnNpb24ucGtOYW1lKTtcblxuICAgIHRyeSB7XG4gICAgICBmaWxlUGF0aCA9IHJlcXVpcmUucmVzb2x2ZShleHRlbnNpb24ucGtOYW1lICsgJy8nICsgZXh0ZW5zaW9uLnBrZ0ZpbGVQYXRoKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuXG4gICAgaWYgKGZpbGVQYXRoICE9IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHN1YkNtZEZhY3Rvcnk6IHRwLkNsaUV4dGVuc2lvbiA9IGV4dGVuc2lvbi5mdW5jTmFtZSA/IHJlcXVpcmUoZmlsZVBhdGgpW2V4dGVuc2lvbi5mdW5jTmFtZV0gOlxuICAgICAgICAgIHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgICAgICBzdWJDbWRGYWN0b3J5KHByb2dyYW0sIHdpdGhHbG9iYWxPcHRpb25zKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBsb2FkIGNvbW1hbmQgbGluZSBleHRlbnNpb24gaW4gcGFja2FnZSAnICsgZXh0ZW5zaW9uLnBrTmFtZSwgZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBhdmFpbGFibGVzO1xufVxuXG5mdW5jdGlvbiBobCh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyZWVuKHRleHQpO1xufVxuXG5mdW5jdGlvbiBobERlc2ModGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmVlbih0ZXh0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKTogY29tbWFuZGVyLkNvbW1hbmQge1xuICBwcm9ncmFtLm9wdGlvbignLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAgIGhsRGVzYygnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScpLFxuICAgICh2YWx1ZSwgcHJldikgPT4geyBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O30sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLXByb3AgPHByb3BlcnR5LXBhdGg9dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+JyxcbiAgICBobERlc2MoJzxwcm9wZXJ0eS1wYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nXFxuIGUuZy5cXG4nKSArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEB3ZmgvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODBcXG4nICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQHdmaC9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyXFxuJyArXG4gICAgJy0tcHJvcCBbXCJAd2ZoL2Zvby5iYXJcIixcInByb3BcIiwwXT10cnVlJyxcbiAgICBhcnJheU9wdGlvbkZuLCBbXSBhcyBzdHJpbmdbXSk7XG4gIC8vIC5vcHRpb24oJy0tbG9nLXN0YXQnLCBobERlc2MoJ1ByaW50IGludGVybmFsIFJlZHV4IHN0YXRlL2FjdGlvbnMgZm9yIGRlYnVnJykpO1xuXG4gIHJldHVybiBwcm9ncmFtO1xufVxuXG4iXX0=