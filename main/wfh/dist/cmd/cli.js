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
        stateFactory.configureStore();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLDBEQUFrQztBQUNsQyxrREFBMEI7QUFJMUIsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDdkMscUJBQXFCO0FBRXJCLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsV0FBVyxDQUFDLFNBQWlCOztRQUNqRCxPQUFPLENBQUMsS0FBSyxHQUFHLHNCQUFzQixDQUFDO1FBQ3ZDLE1BQU0sRUFBQyxZQUFZLEVBQUMsR0FBaUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUM5QixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBTyxJQUFJLEVBQUUsRUFBRTtZQUN0QyxJQUFJLEtBQUs7Z0JBQ1AsT0FBTztZQUNULEtBQUssR0FBRyxJQUFJLENBQUM7WUFDYix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDM0UsQ0FBQyx3REFBYSxVQUFVLEdBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3pDLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sR0FBRyxJQUFJLG1C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QUMsd0RBQWEsYUFBYSxHQUFDLENBQUMsQ0FBQyxJQUFJLGlDQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQW9CLEtBQUUsV0FBVyxJQUFFLENBQUM7SUFDekYsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFFRCxTQUFTLEVBQUUsQ0FBQyxJQUFZO0lBQ3RCLE9BQU8sZUFBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsSUFBWTtJQUMxQixPQUFPLGVBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLE9BQTBCO0lBQzFELE9BQU8sQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQ3pDLE1BQU0sQ0FBQyx1RkFBdUYsQ0FBQyxFQUMvRixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBLENBQUMsRUFBRSxFQUFjLENBQUM7U0FDbEYsTUFBTSxDQUFDLGdEQUFnRCxFQUN0RCxNQUFNLENBQUMsOElBQThJLENBQUM7UUFDdEoscUZBQXFGO1FBQ3JGLHFGQUFxRjtRQUNyRixtQ0FBbUM7UUFDbkMsc0NBQXNDLEVBQ3RDLGFBQWEsRUFBRSxFQUFjLENBQUM7U0FDL0IsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDO0lBRTlFLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFkRCw4Q0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgdHlwZSAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIHRwIGZyb20gJy4vdHlwZXMnO1xuXG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UnKTtcbi8vIGNvbnN0IFdJRFRIID0gMTMwO1xuXG5jb25zdCBhcnJheU9wdGlvbkZuID0gKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpID0+IHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkcmNwQ29tbWFuZChzdGFydFRpbWU6IG51bWJlcikge1xuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rIC0gY29tbWFuZCBsaW5lJztcbiAgY29uc3Qge3N0YXRlRmFjdG9yeX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICBsZXQgc2F2ZWQgPSBmYWxzZTtcbiAgcHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIGFzeW5jIChjb2RlKSA9PiB7XG4gICAgaWYgKHNhdmVkKVxuICAgICAgcmV0dXJuO1xuICAgIHNhdmVkID0gdHJ1ZTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5ncmVlbihgRG9uZSBpbiAke25ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lfSBtc2ApKTtcbiAgICAoYXdhaXQgaW1wb3J0KCcuLi9zdG9yZScpKS5zYXZlU3RhdGUoKTtcbiAgfSk7XG5cbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgpLm5hbWUoJ3BsaW5rJylcbiAgLmFjdGlvbihhcmdzID0+IHtcbiAgICBwcm9ncmFtLm91dHB1dEhlbHAoKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnXFxudmVyc2lvbjonLCBway52ZXJzaW9uKTtcbiAgfSk7XG5cbiAgcHJvZ3JhbS52ZXJzaW9uKHBrLnZlcnNpb24sICctdiwgLS12ZXJzJywgJ291dHB1dCB0aGUgY3VycmVudCB2ZXJzaW9uJyk7XG5cbiAgc3ViRHJjcENvbW1hbmQocHJvZ3JhbSk7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkQnJpZ2h0KGUpLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3ViRHJjcENvbW1hbmQocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgLyoqXG4gICAqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCBbd29ya3NwYWNlXScpXG4gIC5kZXNjcmlwdGlvbignSW5pdGlhbGl6ZSB3b3Jrc3BhY2UgZGlyZWN0b3J5LCBnZW5lcmF0ZSBiYXNpYyBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBwcm9qZWN0IGFuZCBjb21wb25lbnQgcGFja2FnZXMnKVxuICAub3B0aW9uKCctZiB8IC0tZm9yY2UnLCAnRm9yY2UgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5JywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0teWFybicsICdVc2UgWWFybiB0byBpbnN0YWxsIGNvbXBvbmVudCBwZWVyIGRlcGVuZGVuY2llcyBpbnN0ZWFkIG9mIHVzaW5nIE5QTScsIGZhbHNlKVxuICAub3B0aW9uKCctLXByb2R1Y3Rpb24nLCAnQWRkIFwiLS1wcm9kdWN0aW9uXCIgb3IgXCItLW9ubHk9cHJvZFwiIGNvbW1hbmQgbGluZSBhcmd1bWVudCB0byBcInlhcm4vbnBtIGluc3RhbGxcIicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWluaXQnKSkuZGVmYXVsdChpbml0Q21kLm9wdHMoKSBhcyBhbnksIHdvcmtzcGFjZSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhpbml0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBwcm9qZWN0XG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ3Byb2plY3QgW2FkZHxyZW1vdmVdIFtwcm9qZWN0LWRpci4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3QgYXNzb2NpYXRlZCBwcm9qZWN0IGZvbGRlcnMnKVxuICAuYWN0aW9uKGFzeW5jIChhY3Rpb246ICdhZGQnfCdyZW1vdmUnfHVuZGVmaW5lZCwgcHJvamVjdERpcjogc3RyaW5nW10pID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoYWN0aW9uLCBwcm9qZWN0RGlyKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbGludFxuICAgKi9cbiAgY29uc3QgbGludENtZCA9IHByb2dyYW0uY29tbWFuZCgnbGludCBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJylcbiAgLm9wdGlvbignLS1waiA8cHJvamVjdDEscHJvamVjdDIuLi4+JywgJ2xpbnQgb25seSBUUyBjb2RlIGZyb20gc3BlY2lmaWMgcHJvamVjdCcsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIHBhY2thZ2VzID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW50JykpLmRlZmF1bHQocGFja2FnZXMsIGxpbnRDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaW50Q21kKTtcbiAgbGludENtZC51c2FnZShsaW50Q21kLnVzYWdlKCkgK1xuICAgIGhsKCdcXG5kcmNwIGxpbnQgLS1waiA8cHJvamVjdC1kaXIuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnlcXG4nICtcbiAgICBobCgnXFxuZHJjcCBsaW50IDxjb21wb25lbnQtcGFja2FnZS4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBjb21wb25lbnQgcGFja2FnZXMnKTtcblxuICAvKipcbiAgICogY29tbWFuZCBjbGVhblxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdjbGVhbiBbc3ltbGlua10nKS5kZXNjcmlwdGlvbignQ2xlYW4gd2hvbGUgXCJkaXN0XCIgZGlyZWN0b3J5IG9yIG9ubHkgc3ltYm9saWMgbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAuYWN0aW9uKGFzeW5jIChzeW1saW5rOiAnc3ltbGluaycgfCB1bmRlZmluZWQpID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jbGVhbicpKS5kZWZhdWx0KHN5bWxpbmsgPT09ICdzeW1saW5rJyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxzXG4gICAqL1xuICBjb25zdCBsaXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdscycpLmFsaWFzKCdsaXN0JylcbiAgLmRlc2NyaXB0aW9uKCdJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBtYW55IGNvbXBvbmVudHMgd2lsbCBhY3R1YWxseSBydW4sIHRoaXMgY29tbWFuZCBwcmludHMgb3V0IGEgbGlzdCBhbmQgdGhlIHByaW9yaXRpZXMsIGluY2x1ZGluZyBpbnN0YWxsZWQgY29tcG9uZW50cycpXG4gIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmRlZmF1bHQobGlzdENtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGxpc3RDbWQpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHJ1blxuICAgKi9cbiAgY29uc3QgcnVuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzcGVjaWZpYyBtb2R1bGVcXCdzIGV4cG9ydGVkIGZ1bmN0aW9uXFxuJylcbiAgLmFjdGlvbihhc3luYyAodGFyZ2V0OiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgY29uc3QgY29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgYXdhaXQgY29uZmlnLmluaXQocnVuQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICBjb25zdCBsb2dDb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9sb2ctY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgICAoYXdhaXQgaW1wb3J0KCcuLi9wYWNrYWdlLXJ1bm5lcicpKS5ydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHJ1bkNtZCk7XG4gIHJ1bkNtZC51c2FnZShydW5DbWQudXNhZ2UoKSArICdcXG4nICsgY2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXVxcbicpICtcbiAgYGUuZy5cXG4gICR7Y2hhbGsuZ3JlZW4oJ3BsaW5rIHJ1biBmb3JiYXItcGFja2FnZS9kaXN0L2ZpbGUjZnVuY3Rpb24gYXJndW1lbnQxIGFyZ3VtZW50Mi4uLicpfVxcbmAgK1xuICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICc8dGFyZ2V0PiAtIEpTIG9yIFRTIGZpbGUgbW9kdWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlc29sdmVkIGJ5IE5vZGUuanMgKHRzLW5vZGUpIGZvbGxvd2VkIGJ5IFwiI1wiIGFuZCBleHBvcnRlZCBmdW5jdGlvbiBuYW1lLFxcbicgK1xuICAnZS5nLiBcXG4nICtcbiAgY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAnLCBmdW5jdGlvbiBjYW4gYmUgYXN5bmMgd2hpY2ggcmV0dXJucyBQcm9taXNlXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdub2RlX21vZHVsZXMvcGFja2FnZS1kaXIvZGlzdC9mb29iYXIudHMjbXlGdW5jdGlvbicpICtcbiAgJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gVHlwZXNjcmlwdCBjb21waWxlcicpXG4gIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgd2F0Y2ggbW9kZScsIGZhbHNlKVxuICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLWpzeCcsICdpbmNsdWRlcyBUU1ggZmlsZScsIGZhbHNlKVxuICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdTb3VyY2UgbWFwIHN0eWxlOiBcImlubGluZVwiIG9yIFwiZmlsZVwiJywgJ2lubGluZScpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG4gICAgLy8gY29uc29sZS5sb2cob3B0KTtcbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9jb25maWcnKSkuZGVmYXVsdDtcbiAgICBhd2FpdCBjb25maWcuaW5pdChydW5DbWQub3B0cygpIGFzIHRwLkdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IGxvZ0NvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2xvZy1jb25maWcnKSkuZGVmYXVsdDtcbiAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgIGNvbnN0IHRzQ21kID0gYXdhaXQgaW1wb3J0KCcuLi90cy1jbWQnKTtcbiAgICBhd2FpdCB0c0NtZC50c2Moe1xuICAgICAgcGFja2FnZTogcGFja2FnZXMsXG4gICAgICBwcm9qZWN0OiBvcHQucHJvamVjdCxcbiAgICAgIHdhdGNoOiBvcHQud2F0Y2gsXG4gICAgICBzb3VyY2VNYXA6IG9wdC5zb3VyY2VNYXAsXG4gICAgICBqc3g6IG9wdC5qc3gsXG4gICAgICBlZDogb3B0LmVtaXREZWNsYXJhdGlvbk9ubHlcbiAgICB9KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHRzY0NtZCk7XG4gIHRzY0NtZC51c2FnZSh0c2NDbWQudXNhZ2UoKSArICdcXG4nICsgJ1J1biBndWxwLXR5cGVzY3JpcHQgdG8gY29tcGlsZSBOb2RlLmpzIHNpZGUgdHlwZXNjcmlwdCBmaWxlcy5cXG5cXG4nICtcbiAgJ0l0IGNvbXBpbGVzIFxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L3RzLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vZGlzdFwiLFxcbicgK1xuICAnICBvclxcbiAgXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb20vKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tXCJcXG4gZm9yIGFsbCBAZHIgcGFja2FnZXMuXFxuJyArXG4gICdJIHN1Z2dlc3QgdG8gcHV0IE5vZGUuanMgc2lkZSBUUyBjb2RlIGluIGRpcmVjdG9yeSBgdHNgLCBhbmQgaXNvbW9ycGhpYyBUUyBjb2RlIChtZWFuaW5nIGl0IHJ1bnMgaW4gJyArXG4gICdib3RoIE5vZGUuanMgYW5kIEJyb3dzZXIpIGluIGRpcmVjdG9yeSBgaXNvbWAuXFxuJyArXG4gIGhsRGVzYygncGxpbmsgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBjb21wb25lbnRzIGJ5IHByb3ZpZGluZyBwYWNrYWdlIG5hbWUgb3Igc2hvcnQgbmFtZVxcbicgK1xuICBobERlc2MoJ3BsaW5rIHRzY1xcbicpICsgJyBDb21waWxlIGFsbCBjb21wb25lbnRzIGJlbG9uZyB0byBhc3NvY2lhdGVkIHByb2plY3RzLCBub3QgaW5jbHVkaW5nIGluc3RhbGxlZCBjb21wb25lbnRzXFxuJyArXG4gIGhsRGVzYygncGxpbmsgdHNjIC0tcGogPHByb2plY3QgZGlyZWN0b3J5LC4uLj5cXG4nKSArICcgQ29tcGlsZSBjb21wb25lbnRzIGJlbG9uZyB0byBzcGVjaWZpYyBwcm9qZWN0c1xcbicgK1xuICBobERlc2MoJ3BsaW5rIHRzYyBbcGFja2FnZS4uLl0gLXdcXG4nKSArICcgV2F0Y2ggY29tcG9uZW50cyBjaGFuZ2UgYW5kIGNvbXBpbGUgd2hlbiBuZXcgdHlwZXNjcmlwdCBmaWxlIGlzIGNoYW5nZWQgb3IgY3JlYXRlZFxcblxcbicpO1xuXG4gIC8qKlxuICAgKiBCdW1wIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IGJ1bXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2J1bXAgW3BhY2thZ2UuLi5dJylcbiAgICAuZGVzY3JpcHRpb24oJ2J1bXAgdmVyc2lvbiBudW1iZXIgb2YgYWxsIHBhY2thZ2UuanNvbiBmcm9tIHNwZWNpZmljIGRpcmVjdG9yaWVzLCBzYW1lIGFzIFwibnBtIHZlcnNpb25cIiBkb2VzJylcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ29ubHkgYnVtcCBjb21wb25lbnQgcGFja2FnZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsXG4gICAgICAodmFsdWUsIHByZXYpID0+IHtcbiAgICAgICAgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgICAgIH0sIFtdKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY3JlLXZlcnNpb24gPG1ham9yIHwgbWlub3IgfCBwYXRjaCB8IHByZW1ham9yIHwgcHJlbWlub3IgfCBwcmVwYXRjaCB8IHByZXJlbGVhc2U+JyxcbiAgICAgICd2ZXJzaW9uIGluY3JlbWVudCwgdmFsaWQgdmFsdWVzIGFyZTogbWFqb3IsIG1pbm9yLCBwYXRjaCwgcHJlcmVsZWFzZScsICdwYXRjaCcpXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1idW1wJykpLmRlZmF1bHQoey4uLmJ1bXBDbWQub3B0cygpIGFzIHRwLkJ1bXBPcHRpb25zLCBwYWNrYWdlc30pO1xuICAgIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhidW1wQ21kKTtcbiAgYnVtcENtZC51c2FnZShidW1wQ21kLnVzYWdlKCkgKyAnXFxuJyArIGhsKCdwbGluayBidW1wIDxkaXItMT4gPGRpci0yPiAuLi4nKSArICcgdG8gcmVjdXJzaXZlbHkgYnVtcCBwYWNrYWdlLmpzb24gZnJvbSBtdWx0aXBsZSBkaXJlY3Rvcmllc1xcbicgK1xuICAgIGhsKCdwbGluayBidW1wIDxkaXI+IC1pIG1pbm9yJykgKyAnIHRvIGJ1bXAgbWlub3IgdmVyc2lvbiBudW1iZXIsIGRlZmF1bHQgaXMgcGF0Y2ggbnVtYmVyJyk7XG5cbiAgLyoqXG4gICAqIFBhY2sgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgcGFja0NtZCA9IHByb2dyYW0uY29tbWFuZCgncGFjayBbcGFja2FnZURpci4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignbnBtIHBhY2sgZXZlcnkgcGFrYWdlIGludG8gdGFyYmFsbCBmaWxlcycpXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsXG4gICAgJ3Byb2plY3QgZGlyZWN0b3JpZXMgdG8gYmUgbG9va2VkIHVwIGZvciBhbGwgY29tcG9uZW50cyB3aGljaCBuZWVkIHRvIGJlIHBhY2tlZCB0byB0YXJiYWxsIGZpbGVzJyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLmFjdGlvbihhc3luYyAocGFja2FnZURpcnM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuLi9kcmNwLWNtZCcpKS5wYWNrKHsuLi5wYWNrQ21kLm9wdHMoKSBhcyB0cC5QYWNrT3B0aW9ucywgcGFja2FnZURpcnN9KTtcbiAgICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMocGFja0NtZCk7XG59XG5cbmZ1bmN0aW9uIGhsKHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gY2hhbGsuZ3JlZW4odGV4dCk7XG59XG5cbmZ1bmN0aW9uIGhsRGVzYyh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyZWVuKHRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIHByb2dyYW0ub3B0aW9uKCctYywgLS1jb25maWcgPGNvbmZpZy1maWxlPicsXG4gICAgaGxEZXNjKCdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyksXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7IHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7fSwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tcHJvcCA8cHJvcGVydHktcGF0aD12YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4nLFxuICAgIGhsRGVzYygnPHByb3BlcnR5LXBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmdcXG4gZS5nLlxcbicpICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQGRyL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwXFxuJyArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEBkci9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyXFxuJyArXG4gICAgJy0tcHJvcCBbXCJAZHIvZm9vLmJhclwiLFwicHJvcFwiLDBdPXRydWUnLFxuICAgIGFycmF5T3B0aW9uRm4sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLWxvZy1zdGF0JywgaGxEZXNjKCdQcmludCBpbnRlcm5hbCBSZWR1eCBzdGF0ZS9hY3Rpb25zIGZvciBkZWJ1ZycpKTtcblxuICByZXR1cm4gcHJvZ3JhbTtcbn1cblxuIl19