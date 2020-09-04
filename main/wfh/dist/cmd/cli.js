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
        console.log('stateFactory configured');
        // await import('./cli-store');
        let saved = false;
        process.on('beforeExit', (code) => __awaiter(this, void 0, void 0, function* () {
            if (saved)
                return;
            saved = true;
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.green(`Done in ${new Date().getTime() - startTime} ms`));
            (yield Promise.resolve().then(() => __importStar(require('../store')))).saveState();
        }));
        const program = new commander_1.default.Command().name('plink')
            .action(args => {
            program.outputHelp();
            // tslint:disable-next-line: no-console
            console.log('\nversion:', pk.version);
        });
        program.version(pk.version, '-v, --vers', 'output the current version');
        subDrcpCommand(program);
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
        .description('bump version number of all package.json from specific directories, same as "npm version" does')
        .option('--pj, --project <project-dir,...>', 'only bump component packages from specific project directory', (value, prev) => {
        prev.push(...value.split(','));
        return prev;
    }, [])
        .option('-i, --incre-version <major | minor | patch | premajor | preminor | prepatch | prerelease>', 'version increment, valid values are: major, minor, patch, prerelease', 'patch')
        .action((packages) => __awaiter(this, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-bump')))).default(Object.assign(Object.assign({}, bumpCmd.opts()), { packages }));
    }));
    withGlobalOptions(bumpCmd);
    bumpCmd.usage(bumpCmd.usage() + '\n' + hl('plink bump <dir-1> <dir-2> ...') + ' to recursively bump package.json from multiple directories\n' +
        hl('plink bump <dir> -i minor') + ' to bump minor version number, default is patch number');
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
        (yield Promise.resolve().then(() => __importStar(require('../drcp-cmd')))).pack(Object.assign(Object.assign({}, packCmd.opts()), { packageDirs }));
    }));
    withGlobalOptions(packCmd);
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
        '--prop ["@dr/foo.bar","prop",0]=true', arrayOptionFn, [])
        .option('--log-stat', hlDesc('Print internal Redux state/actions for debug'));
    return program;
}
exports.withGlobalOptions = withGlobalOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLDBEQUFrQztBQUNsQyxrREFBMEI7QUFJMUIsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDdkMscUJBQXFCO0FBRXJCLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsV0FBVyxDQUFDLFNBQWlCOztRQUNqRCxPQUFPLENBQUMsS0FBSyxHQUFHLHNCQUFzQixDQUFDO1FBQ3ZDLE1BQU0sRUFBQyxZQUFZLEVBQUMsR0FBaUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELHdEQUFhLGFBQWEsR0FBQyxDQUFDO1FBQzVCLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdkMsK0JBQStCO1FBQy9CLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNsQixPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFPLElBQUksRUFBRSxFQUFFO1lBQ3RDLElBQUksS0FBSztnQkFDUCxPQUFPO1lBQ1QsS0FBSyxHQUFHLElBQUksQ0FBQztZQUNiLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLFNBQVMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUMzRSxDQUFDLHdEQUFhLFVBQVUs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c2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB0eXBlICogYXMgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5cbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZScpO1xuLy8gY29uc3QgV0lEVEggPSAxMzA7XG5cbmNvbnN0IGFycmF5T3B0aW9uRm4gPSAoY3Vycjogc3RyaW5nLCBwcmV2OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkgPT4ge1xuICBpZiAocHJldilcbiAgICBwcmV2LnB1c2goY3Vycik7XG4gIHJldHVybiBwcmV2O1xufTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRyY3BDb21tYW5kKHN0YXJ0VGltZTogbnVtYmVyKSB7XG4gIHByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBjb21tYW5kIGxpbmUnO1xuICBjb25zdCB7c3RhdGVGYWN0b3J5fTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgYXdhaXQgaW1wb3J0KCcuL2NsaS1zdG9yZScpO1xuICBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcbiAgY29uc29sZS5sb2coJ3N0YXRlRmFjdG9yeSBjb25maWd1cmVkJyk7XG4gIC8vIGF3YWl0IGltcG9ydCgnLi9jbGktc3RvcmUnKTtcbiAgbGV0IHNhdmVkID0gZmFsc2U7XG4gIHByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCBhc3luYyAoY29kZSkgPT4ge1xuICAgIGlmIChzYXZlZClcbiAgICAgIHJldHVybjtcbiAgICBzYXZlZCA9IHRydWU7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JlZW4oYERvbmUgaW4gJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZX0gbXNgKSk7XG4gICAgKGF3YWl0IGltcG9ydCgnLi4vc3RvcmUnKSkuc2F2ZVN0YXRlKCk7XG4gIH0pO1xuXG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoKS5uYW1lKCdwbGluaycpXG4gIC5hY3Rpb24oYXJncyA9PiB7XG4gICAgcHJvZ3JhbS5vdXRwdXRIZWxwKCk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbnZlcnNpb246JywgcGsudmVyc2lvbik7XG4gIH0pO1xuXG4gIHByb2dyYW0udmVyc2lvbihway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xuXG4gIHN1YkRyY3BDb21tYW5kKHByb2dyYW0pO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgcHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGNoYWxrLnJlZEJyaWdodChlKSwgZS5zdGFjayk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN1YkRyY3BDb21tYW5kKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIC8qKlxuICAgKiBjb21tYW5kIGluaXRcbiAgICovXG4gIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2luaXQgW3dvcmtzcGFjZV0nKVxuICAuZGVzY3JpcHRpb24oJ0luaXRpYWxpemUgd29ya3NwYWNlIGRpcmVjdG9yeSwgZ2VuZXJhdGUgYmFzaWMgY29uZmlndXJhdGlvbiBmaWxlcyBmb3IgcHJvamVjdCBhbmQgY29tcG9uZW50IHBhY2thZ2VzJylcbiAgLm9wdGlvbignLWYgfCAtLWZvcmNlJywgJ0ZvcmNlIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeScsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1pbml0JykpLmRlZmF1bHQoaW5pdENtZC5vcHRzKCkgYXMgYW55LCB3b3Jrc3BhY2UpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcHJvamVjdFxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdwcm9qZWN0IFthZGR8cmVtb3ZlXSBbcHJvamVjdC1kaXIuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzJylcbiAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIHByb2plY3REaXI6IHN0cmluZ1tdKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktcHJvamVjdCcpKS5kZWZhdWx0KGFjdGlvbiwgcHJvamVjdERpcik7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdzb3VyY2UgY29kZSBzdHlsZSBjaGVjaycpXG4gIC5vcHRpb24oJy0tcGogPHByb2plY3QxLHByb2plY3QyLi4uPicsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLm9wdGlvbignLS1maXgnLCAnUnVuIGVzbGludC90c2xpbnQgZml4LCB0aGlzIGNvdWxkIGNhdXNlIHlvdXIgc291cmNlIGNvZGUgYmVpbmcgY2hhbmdlZCB1bmV4cGVjdGVkbHknLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyBwYWNrYWdlcyA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMobGludENtZCk7XG4gIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY2xlYW4gW3N5bWxpbmtdJykuZGVzY3JpcHRpb24oJ0NsZWFuIHdob2xlIFwiZGlzdFwiIGRpcmVjdG9yeSBvciBvbmx5IHN5bWJvbGljIGxpbmtzIGZyb20gbm9kZV9tb2R1bGVzJylcbiAgLmFjdGlvbihhc3luYyAoc3ltbGluazogJ3N5bWxpbmsnIHwgdW5kZWZpbmVkKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktY2xlYW4nKSkuZGVmYXVsdChzeW1saW5rID09PSAnc3ltbGluaycpO1xuICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsc1xuICAgKi9cbiAgY29uc3QgbGlzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbHMnKS5hbGlhcygnbGlzdCcpXG4gIC5kZXNjcmlwdGlvbignSWYgeW91IHdhbnQgdG8ga25vdyBob3cgbWFueSBjb21wb25lbnRzIHdpbGwgYWN0dWFsbHkgcnVuLCB0aGlzIGNvbW1hbmQgcHJpbnRzIG91dCBhIGxpc3QgYW5kIHRoZSBwcmlvcml0aWVzLCBpbmNsdWRpbmcgaW5zdGFsbGVkIGNvbXBvbmVudHMnKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5kZWZhdWx0KGxpc3RDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaXN0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBydW5cbiAgICovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc3BlY2lmaWMgbW9kdWxlXFwncyBleHBvcnRlZCBmdW5jdGlvblxcbicpXG4gIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2NvbmZpZycpKS5kZWZhdWx0O1xuICAgIGF3YWl0IGNvbmZpZy5pbml0KHJ1bkNtZC5vcHRzKCkgYXMgdHAuR2xvYmFsT3B0aW9ucyk7XG4gICAgY29uc3QgbG9nQ29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vbG9nLWNvbmZpZycpKS5kZWZhdWx0O1xuICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhydW5DbWQpO1xuICBydW5DbWQudXNhZ2UocnVuQ21kLnVzYWdlKCkgKyAnXFxuJyArIGNoYWxrLmdyZWVuKCdwbGluayBydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl1cXG4nKSArXG4gIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdwbGluayBydW4gZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAnPHRhcmdldD4gLSBKUyBvciBUUyBmaWxlIG1vZHVsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXNvbHZlZCBieSBOb2RlLmpzICh0cy1ub2RlKSBmb2xsb3dlZCBieSBcIiNcIiBhbmQgZXhwb3J0ZWQgZnVuY3Rpb24gbmFtZSxcXG4nICtcbiAgJ2UuZy4gXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgJywgZnVuY3Rpb24gY2FuIGJlIGFzeW5jIHdoaWNoIHJldHVybnMgUHJvbWlzZVxcbicgK1xuICBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuICAvKipcbiAgICogdHNjIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHRzY0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignUnVuIFR5cGVzY3JpcHQgY29tcGlsZXInKVxuICAub3B0aW9uKCctdywgLS13YXRjaCcsICdUeXBlc2NyaXB0IGNvbXBpbGVyIHdhdGNoIG1vZGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS1qc3gnLCAnaW5jbHVkZXMgVFNYIGZpbGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnU291cmNlIG1hcCBzdHlsZTogXCJpbmxpbmVcIiBvciBcImZpbGVcIicsICdpbmxpbmUnKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICBjb25zdCBvcHQgPSB0c2NDbWQub3B0cygpO1xuICAgIC8vIGNvbnNvbGUubG9nKG9wdCk7XG4gICAgY29uc3QgY29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgYXdhaXQgY29uZmlnLmluaXQocnVuQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICBjb25zdCBsb2dDb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9sb2ctY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgICBjb25zdCB0c0NtZCA9IGF3YWl0IGltcG9ydCgnLi4vdHMtY21kJyk7XG4gICAgYXdhaXQgdHNDbWQudHNjKHtcbiAgICAgIHBhY2thZ2U6IHBhY2thZ2VzLFxuICAgICAgcHJvamVjdDogb3B0LnByb2plY3QsXG4gICAgICB3YXRjaDogb3B0LndhdGNoLFxuICAgICAgc291cmNlTWFwOiBvcHQuc291cmNlTWFwLFxuICAgICAganN4OiBvcHQuanN4LFxuICAgICAgZWQ6IG9wdC5lbWl0RGVjbGFyYXRpb25Pbmx5XG4gICAgfSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyh0c2NDbWQpO1xuICB0c2NDbWQudXNhZ2UodHNjQ21kLnVzYWdlKCkgKyAnXFxuJyArICdSdW4gZ3VscC10eXBlc2NyaXB0IHRvIGNvbXBpbGUgTm9kZS5qcyBzaWRlIHR5cGVzY3JpcHQgZmlsZXMuXFxuXFxuJyArXG4gICdJdCBjb21waWxlcyBcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi90cy8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2Rpc3RcIixcXG4nICtcbiAgJyAgb3JcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbVwiXFxuIGZvciBhbGwgQGRyIHBhY2thZ2VzLlxcbicgK1xuICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcbicgK1xuICBobERlc2MoJ3BsaW5rIHRzYyA8cGFja2FnZS4uPlxcbicpICsgJyBPbmx5IGNvbXBpbGUgc3BlY2lmaWMgY29tcG9uZW50cyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgaGxEZXNjKCdwbGluayB0c2NcXG4nKSArICcgQ29tcGlsZSBhbGwgY29tcG9uZW50cyBiZWxvbmcgdG8gYXNzb2NpYXRlZCBwcm9qZWN0cywgbm90IGluY2x1ZGluZyBpbnN0YWxsZWQgY29tcG9uZW50c1xcbicgK1xuICBobERlc2MoJ3BsaW5rIHRzYyAtLXBqIDxwcm9qZWN0IGRpcmVjdG9yeSwuLi4+XFxuJykgKyAnIENvbXBpbGUgY29tcG9uZW50cyBiZWxvbmcgdG8gc3BlY2lmaWMgcHJvamVjdHNcXG4nICtcbiAgaGxEZXNjKCdwbGluayB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIGNvbXBvbmVudHMgY2hhbmdlIGFuZCBjb21waWxlIHdoZW4gbmV3IHR5cGVzY3JpcHQgZmlsZSBpcyBjaGFuZ2VkIG9yIGNyZWF0ZWRcXG5cXG4nKTtcblxuICAvKipcbiAgICogQnVtcCBjb21tYW5kXG4gICAqL1xuICBjb25zdCBidW1wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdidW1wIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdidW1wIHZlcnNpb24gbnVtYmVyIG9mIGFsbCBwYWNrYWdlLmpzb24gZnJvbSBzcGVjaWZpYyBkaXJlY3Rvcmllcywgc2FtZSBhcyBcIm5wbSB2ZXJzaW9uXCIgZG9lcycpXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdvbmx5IGJ1bXAgY29tcG9uZW50IHBhY2thZ2VzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNyZS12ZXJzaW9uIDxtYWpvciB8IG1pbm9yIHwgcGF0Y2ggfCBwcmVtYWpvciB8IHByZW1pbm9yIHwgcHJlcGF0Y2ggfCBwcmVyZWxlYXNlPicsXG4gICAgICAndmVyc2lvbiBpbmNyZW1lbnQsIHZhbGlkIHZhbHVlcyBhcmU6IG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UnLCAncGF0Y2gnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktYnVtcCcpKS5kZWZhdWx0KHsuLi5idW1wQ21kLm9wdHMoKSBhcyB0cC5CdW1wT3B0aW9ucywgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoYnVtcENtZCk7XG4gIGJ1bXBDbWQudXNhZ2UoYnVtcENtZC51c2FnZSgpICsgJ1xcbicgKyBobCgncGxpbmsgYnVtcCA8ZGlyLTE+IDxkaXItMj4gLi4uJykgKyAnIHRvIHJlY3Vyc2l2ZWx5IGJ1bXAgcGFja2FnZS5qc29uIGZyb20gbXVsdGlwbGUgZGlyZWN0b3JpZXNcXG4nICtcbiAgICBobCgncGxpbmsgYnVtcCA8ZGlyPiAtaSBtaW5vcicpICsgJyB0byBidW1wIG1pbm9yIHZlcnNpb24gbnVtYmVyLCBkZWZhdWx0IGlzIHBhdGNoIG51bWJlcicpO1xuXG4gIC8qKlxuICAgKiBQYWNrIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHBhY2tDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3BhY2sgW3BhY2thZ2VEaXIuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ25wbSBwYWNrIGV2ZXJ5IHBha2FnZSBpbnRvIHRhcmJhbGwgZmlsZXMnKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLFxuICAgICdwcm9qZWN0IGRpcmVjdG9yaWVzIHRvIGJlIGxvb2tlZCB1cCBmb3IgYWxsIGNvbXBvbmVudHMgd2hpY2ggbmVlZCB0byBiZSBwYWNrZWQgdG8gdGFyYmFsbCBmaWxlcycsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi4vZHJjcC1jbWQnKSkucGFjayh7Li4ucGFja0NtZC5vcHRzKCkgYXMgdHAuUGFja09wdGlvbnMsIHBhY2thZ2VEaXJzfSk7XG4gICAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHBhY2tDbWQpO1xufVxuXG5mdW5jdGlvbiBobCh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyZWVuKHRleHQpO1xufVxuXG5mdW5jdGlvbiBobERlc2ModGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmVlbih0ZXh0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKTogY29tbWFuZGVyLkNvbW1hbmQge1xuICBwcm9ncmFtLm9wdGlvbignLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAgIGhsRGVzYygnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScpLFxuICAgICh2YWx1ZSwgcHJldikgPT4geyBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O30sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLXByb3AgPHByb3BlcnR5LXBhdGg9dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+JyxcbiAgICBobERlc2MoJzxwcm9wZXJ0eS1wYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nXFxuIGUuZy5cXG4nKSArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEBkci9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAZHIvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODBcXG4nICtcbiAgICAnLS1wcm9wIGFycmF5bGlrZS5wcm9wWzBdPWZvb2JhclxcbicgK1xuICAgICctLXByb3AgW1wiQGRyL2Zvby5iYXJcIixcInByb3BcIiwwXT10cnVlJyxcbiAgICBhcnJheU9wdGlvbkZuLCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS1sb2ctc3RhdCcsIGhsRGVzYygnUHJpbnQgaW50ZXJuYWwgUmVkdXggc3RhdGUvYWN0aW9ucyBmb3IgZGVidWcnKSk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG5cbiJdfQ==