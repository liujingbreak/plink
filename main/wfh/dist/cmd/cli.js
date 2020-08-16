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
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const store_1 = require("../store");
const pk = require('../../../package');
// const WIDTH = 130;
process.title = 'OneProject SDK- command line';
const arrayOptionFn = (curr, prev) => {
    if (prev)
        prev.push(curr);
    return prev;
};
function drcpCommand(startTime) {
    return __awaiter(this, void 0, void 0, function* () {
        store_1.stateFactory.configureStore();
        // const cli = require('../../lib/gulp/cli');
        // cli.setStartTime(startTime);
        const program = new commander_1.Command().name('drcp')
            .action(args => {
            program.outputHelp();
            // tslint:disable-next-line: no-console
            console.log('\nversion:', pk.version);
        });
        program.version(pk.version, '-v, --vers', 'output the current version');
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
            .option('--pj [project1,project2...]', 'lint only TS code from specific project', arrayOptionFn)
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
        runCmd.usage(runCmd.usage() + '\n' + chalk_1.default.green('drcp run <target> [arguments...]\n') +
            `e.g.\n  ${chalk_1.default.green('drcp run forbar-package/dist/file#function argument1 argument2...')}\n` +
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
            hlDesc('drcp tsc <package..>\n') + ' Only compile specific components by providing package name or short name\n' +
            hlDesc('drcp tsc\n') + ' Compile all components belong to associated projects, not including installed components\n' +
            hlDesc('drcp tsc --pj <project directory,...>\n') + ' Compile components belong to specific projects\n' +
            hlDesc('drcp tsc [package...] -w\n') + ' Watch components change and compile when new typescript file is changed or created\n\n');
        /**
         * Bump command
         */
        const bumpCmd = program.command('bump [dir...]')
            .description('bump version number of all package.json from specific directories')
            .option('--pj, --project <project-dir,...>', 'only bump component packages from specific project directory', (value, prev) => {
            prev.push(...value.split(','));
            return prev;
        }, [])
            .option('-i, --incre-version <major | minor | patch | prerelease>', 'version increment, valid values are: major, minor, patch, prerelease', 'patch')
            .action((dirs) => {
            console.log(dirs, bumpCmd.opts());
        });
        withGlobalOptions(bumpCmd);
        bumpCmd.usage(bumpCmd.usage() + '\n' + hl('drcp bump <dir-1> <dir-2> ...') + ' to recursively bump package.json from multiple directories\n' +
            hl('drcp bump <dir> -i minor') + ' to bump minor version number, default is patch number');
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
let saved = false;
process.on('beforeExit', (code) => __awaiter(void 0, void 0, void 0, function* () {
    if (saved)
        return;
    saved = true;
    // tslint:disable-next-line: no-console
    console.log(chalk_1.default.green('Done.'));
    (yield Promise.resolve().then(() => __importStar(require('../store')))).saveState();
}));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLHlDQUE2QztBQUM3QyxrREFBMEI7QUFDMUIsb0NBQXNDO0FBSXRDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3ZDLHFCQUFxQjtBQUVyQixPQUFPLENBQUMsS0FBSyxHQUFHLDhCQUE4QixDQUFDO0FBRS9DLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsV0FBVyxDQUFDLFNBQWlCOztRQUNqRCxvQkFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRTlCLDZDQUE2QztRQUM3QywrQkFBK0I7UUFFL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBTyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDYixPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUV4RTs7V0FFRztRQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7YUFDbEQsV0FBVyxDQUFDLHVHQUF1RyxDQUFDO2FB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Q0FBbUM7UUFDbkMsc0NBQXNDLEVBQ3RDLGFBQWEsRUFBRSxFQUFjLENBQUM7U0FDL0IsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDO0lBRTlFLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFkRCw4Q0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjb21tYW5kZXIsIHtDb21tYW5kfSBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyB0cCBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7fSBmcm9tICcuLi90cy1jbWQnO1xuXG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UnKTtcbi8vIGNvbnN0IFdJRFRIID0gMTMwO1xuXG5wcm9jZXNzLnRpdGxlID0gJ09uZVByb2plY3QgU0RLLSBjb21tYW5kIGxpbmUnO1xuXG5jb25zdCBhcnJheU9wdGlvbkZuID0gKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpID0+IHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkcmNwQ29tbWFuZChzdGFydFRpbWU6IG51bWJlcikge1xuICBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcblxuICAvLyBjb25zdCBjbGkgPSByZXF1aXJlKCcuLi8uLi9saWIvZ3VscC9jbGknKTtcbiAgLy8gY2xpLnNldFN0YXJ0VGltZShzdGFydFRpbWUpO1xuXG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgQ29tbWFuZCgpLm5hbWUoJ2RyY3AnKVxuICAuYWN0aW9uKGFyZ3MgPT4ge1xuICAgIHByb2dyYW0ub3V0cHV0SGVscCgpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG52ZXJzaW9uOicsIHBrLnZlcnNpb24pO1xuICB9KTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcblxuICAvKipcbiAgICogY29tbWFuZCBpbml0XG4gICAqL1xuICBjb25zdCBpbml0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdpbml0IFt3b3Jrc3BhY2VdJylcbiAgLmRlc2NyaXB0aW9uKCdJbml0aWFsaXplIHdvcmtzcGFjZSBkaXJlY3RvcnksIGdlbmVyYXRlIGJhc2ljIGNvbmZpZ3VyYXRpb24gZmlsZXMgZm9yIHByb2plY3QgYW5kIGNvbXBvbmVudCBwYWNrYWdlcycpXG4gIC5vcHRpb24oJy1mIHwgLS1mb3JjZScsICdGb3JjZSBydW4gXCJucG0gaW5zdGFsbFwiIGluIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnknLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS15YXJuJywgJ1VzZSBZYXJuIHRvIGluc3RhbGwgY29tcG9uZW50IHBlZXIgZGVwZW5kZW5jaWVzIGluc3RlYWQgb2YgdXNpbmcgTlBNJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tcHJvZHVjdGlvbicsICdBZGQgXCItLXByb2R1Y3Rpb25cIiBvciBcIi0tb25seT1wcm9kXCIgY29tbWFuZCBsaW5lIGFyZ3VtZW50IHRvIFwieWFybi9ucG0gaW5zdGFsbFwiJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZTogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktaW5pdCcpKS5kZWZhdWx0KGluaXRDbWQub3B0cygpIGFzIGFueSwgd29ya3NwYWNlKTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGluaXRDbWQpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHByb2plY3RcbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgncHJvamVjdCBbYWRkfHJlbW92ZV0gW3Byb2plY3QtZGlyLi4uXScpXG4gIC5kZXNjcmlwdGlvbignQXNzb2NpYXRlLCBkaXNhc3NvY2lhdGUgb3IgbGlzdCBhc3NvY2lhdGVkIHByb2plY3QgZm9sZGVycycpXG4gIC5hY3Rpb24oYXN5bmMgKGFjdGlvbjogJ2FkZCd8J3JlbW92ZSd8dW5kZWZpbmVkLCBwcm9qZWN0RGlyOiBzdHJpbmdbXSkgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXByb2plY3QnKSkuZGVmYXVsdChhY3Rpb24sIHByb2plY3REaXIpO1xuICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsaW50XG4gICAqL1xuICBjb25zdCBsaW50Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdsaW50IFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignc291cmNlIGNvZGUgc3R5bGUgY2hlY2snKVxuICAub3B0aW9uKCctLXBqIFtwcm9qZWN0MSxwcm9qZWN0Mi4uLl0nLCAnbGludCBvbmx5IFRTIGNvZGUgZnJvbSBzcGVjaWZpYyBwcm9qZWN0JywgYXJyYXlPcHRpb25GbilcbiAgLm9wdGlvbignLS1maXgnLCAnUnVuIGVzbGludC90c2xpbnQgZml4LCB0aGlzIGNvdWxkIGNhdXNlIHlvdXIgc291cmNlIGNvZGUgYmVpbmcgY2hhbmdlZCB1bmV4cGVjdGVkbHknLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyBwYWNrYWdlcyA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbGludCcpKS5kZWZhdWx0KHBhY2thZ2VzLCBsaW50Q21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMobGludENtZCk7XG4gIGxpbnRDbWQudXNhZ2UobGludENtZC51c2FnZSgpICtcbiAgICBobCgnXFxuZHJjcCBsaW50IC0tcGogPHByb2plY3QtZGlyLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5XFxuJyArXG4gICAgaGwoJ1xcbmRyY3AgbGludCA8Y29tcG9uZW50LXBhY2thZ2UuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgY29tcG9uZW50IHBhY2thZ2VzJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgY2xlYW5cbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgnY2xlYW4gW3N5bWxpbmtdJykuZGVzY3JpcHRpb24oJ0NsZWFuIHdob2xlIFwiZGlzdFwiIGRpcmVjdG9yeSBvciBvbmx5IHN5bWJvbGljIGxpbmtzIGZyb20gbm9kZV9tb2R1bGVzJylcbiAgLmFjdGlvbihhc3luYyAoc3ltbGluazogJ3N5bWxpbmsnIHwgdW5kZWZpbmVkKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktY2xlYW4nKSkuZGVmYXVsdChzeW1saW5rID09PSAnc3ltbGluaycpO1xuICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsc1xuICAgKi9cbiAgY29uc3QgbGlzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbHMnKS5hbGlhcygnbGlzdCcpXG4gIC5kZXNjcmlwdGlvbignSWYgeW91IHdhbnQgdG8ga25vdyBob3cgbWFueSBjb21wb25lbnRzIHdpbGwgYWN0dWFsbHkgcnVuLCB0aGlzIGNvbW1hbmQgcHJpbnRzIG91dCBhIGxpc3QgYW5kIHRoZSBwcmlvcml0aWVzLCBpbmNsdWRpbmcgaW5zdGFsbGVkIGNvbXBvbmVudHMnKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1scycpKS5kZWZhdWx0KGxpc3RDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaXN0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBydW5cbiAgICovXG4gIGNvbnN0IHJ1bkNtZCA9IHByb2dyYW0uY29tbWFuZCgncnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc3BlY2lmaWMgbW9kdWxlXFwncyBleHBvcnRlZCBmdW5jdGlvblxcbicpXG4gIC5hY3Rpb24oYXN5bmMgKHRhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2NvbmZpZycpKS5kZWZhdWx0O1xuICAgIGF3YWl0IGNvbmZpZy5pbml0KHJ1bkNtZC5vcHRzKCkgYXMgdHAuR2xvYmFsT3B0aW9ucyk7XG4gICAgY29uc3QgbG9nQ29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vbG9nLWNvbmZpZycpKS5kZWZhdWx0O1xuICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgKGF3YWl0IGltcG9ydCgnLi4vcGFja2FnZS1ydW5uZXInKSkucnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhydW5DbWQpO1xuICBydW5DbWQudXNhZ2UocnVuQ21kLnVzYWdlKCkgKyAnXFxuJyArIGNoYWxrLmdyZWVuKCdkcmNwIHJ1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXVxcbicpICtcbiAgYGUuZy5cXG4gICR7Y2hhbGsuZ3JlZW4oJ2RyY3AgcnVuIGZvcmJhci1wYWNrYWdlL2Rpc3QvZmlsZSNmdW5jdGlvbiBhcmd1bWVudDEgYXJndW1lbnQyLi4uJyl9XFxuYCArXG4gICdleGVjdXRlIGV4cG9ydGVkIGZ1bmN0aW9uIG9mIFRTL0pTIGZpbGUgZnJvbSBzcGVjaWZpYyBwYWNrYWdlIG9yIHBhdGhcXG5cXG4nICtcbiAgJzx0YXJnZXQ+IC0gSlMgb3IgVFMgZmlsZSBtb2R1bGUgcGF0aCB3aGljaCBjYW4gYmUgcmVzb2x2ZWQgYnkgTm9kZS5qcyAodHMtbm9kZSkgZm9sbG93ZWQgYnkgXCIjXCIgYW5kIGV4cG9ydGVkIGZ1bmN0aW9uIG5hbWUsXFxuJyArXG4gICdlLmcuIFxcbicgK1xuICBjaGFsay5ncmVlbigncGFja2FnZS1uYW1lL2Rpc3QvZm9vYmFyLmpzI215RnVuY3Rpb24nKSArXG4gICcsIGZ1bmN0aW9uIGNhbiBiZSBhc3luYyB3aGljaCByZXR1cm5zIFByb21pc2VcXG4nICtcbiAgY2hhbGsuZ3JlZW4oJ25vZGVfbW9kdWxlcy9wYWNrYWdlLWRpci9kaXN0L2Zvb2Jhci50cyNteUZ1bmN0aW9uJykgK1xuICAnLCByZWxhdGl2ZSBvciBhYnNvbHV0ZSBwYXRoXFxuJyk7XG5cbiAgLyoqXG4gICAqIHRzYyBjb21tYW5kXG4gICAqL1xuICBjb25zdCB0c2NDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzYyBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ1J1biBUeXBlc2NyaXB0IGNvbXBpbGVyJylcbiAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnVHlwZXNjcmlwdCBjb21waWxlciB3YXRjaCBtb2RlJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdDb21waWxlIG9ubHkgc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLCAodiwgcHJldikgPT4ge1xuICAgIHByZXYucHVzaCguLi52LnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjtcbiAgfSwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tanN4JywgJ2luY2x1ZGVzIFRTWCBmaWxlJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tZWQsIC0tZW1pdERlY2xhcmF0aW9uT25seScsICdUeXBlc2NyaXB0IGNvbXBpbGVyIG9wdGlvbjogLS1lbWl0RGVjbGFyYXRpb25Pbmx5Llxcbk9ubHkgZW1pdCDigJguZC50c+KAmSBkZWNsYXJhdGlvbiBmaWxlcy4nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1zb3VyY2UtbWFwJywgJ1NvdXJjZSBtYXAgc3R5bGU6IFwiaW5saW5lXCIgb3IgXCJmaWxlXCInLCAnaW5saW5lJylcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgY29uc3Qgb3B0ID0gdHNjQ21kLm9wdHMoKTtcbiAgICAvLyBjb25zb2xlLmxvZyhvcHQpO1xuICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2NvbmZpZycpKS5kZWZhdWx0O1xuICAgIGF3YWl0IGNvbmZpZy5pbml0KHJ1bkNtZC5vcHRzKCkgYXMgdHAuR2xvYmFsT3B0aW9ucyk7XG4gICAgY29uc3QgbG9nQ29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vbG9nLWNvbmZpZycpKS5kZWZhdWx0O1xuICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG5cbiAgICBjb25zdCB0c0NtZCA9IGF3YWl0IGltcG9ydCgnLi4vdHMtY21kJyk7XG4gICAgYXdhaXQgdHNDbWQudHNjKHtcbiAgICAgIHBhY2thZ2U6IHBhY2thZ2VzLFxuICAgICAgcHJvamVjdDogb3B0LnByb2plY3QsXG4gICAgICB3YXRjaDogb3B0LndhdGNoLFxuICAgICAgc291cmNlTWFwOiBvcHQuc291cmNlTWFwLFxuICAgICAganN4OiBvcHQuanN4LFxuICAgICAgZWQ6IG9wdC5lbWl0RGVjbGFyYXRpb25Pbmx5XG4gICAgfSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyh0c2NDbWQpO1xuICB0c2NDbWQudXNhZ2UodHNjQ21kLnVzYWdlKCkgKyAnXFxuJyArICdSdW4gZ3VscC10eXBlc2NyaXB0IHRvIGNvbXBpbGUgTm9kZS5qcyBzaWRlIHR5cGVzY3JpcHQgZmlsZXMuXFxuXFxuJyArXG4gICdJdCBjb21waWxlcyBcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi90cy8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2Rpc3RcIixcXG4nICtcbiAgJyAgb3JcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbVwiXFxuIGZvciBhbGwgQGRyIHBhY2thZ2VzLlxcbicgK1xuICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcbicgK1xuICBobERlc2MoJ2RyY3AgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBjb21wb25lbnRzIGJ5IHByb3ZpZGluZyBwYWNrYWdlIG5hbWUgb3Igc2hvcnQgbmFtZVxcbicgK1xuICBobERlc2MoJ2RyY3AgdHNjXFxuJykgKyAnIENvbXBpbGUgYWxsIGNvbXBvbmVudHMgYmVsb25nIHRvIGFzc29jaWF0ZWQgcHJvamVjdHMsIG5vdCBpbmNsdWRpbmcgaW5zdGFsbGVkIGNvbXBvbmVudHNcXG4nICtcbiAgaGxEZXNjKCdkcmNwIHRzYyAtLXBqIDxwcm9qZWN0IGRpcmVjdG9yeSwuLi4+XFxuJykgKyAnIENvbXBpbGUgY29tcG9uZW50cyBiZWxvbmcgdG8gc3BlY2lmaWMgcHJvamVjdHNcXG4nICtcbiAgaGxEZXNjKCdkcmNwIHRzYyBbcGFja2FnZS4uLl0gLXdcXG4nKSArICcgV2F0Y2ggY29tcG9uZW50cyBjaGFuZ2UgYW5kIGNvbXBpbGUgd2hlbiBuZXcgdHlwZXNjcmlwdCBmaWxlIGlzIGNoYW5nZWQgb3IgY3JlYXRlZFxcblxcbicpO1xuXG4gIC8qKlxuICAgKiBCdW1wIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IGJ1bXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2J1bXAgW2Rpci4uLl0nKVxuICAgIC5kZXNjcmlwdGlvbignYnVtcCB2ZXJzaW9uIG51bWJlciBvZiBhbGwgcGFja2FnZS5qc29uIGZyb20gc3BlY2lmaWMgZGlyZWN0b3JpZXMnKVxuICAgIC5vcHRpb248c3RyaW5nW10+KCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnb25seSBidW1wIGNvbXBvbmVudCBwYWNrYWdlcyBmcm9tIHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JyxcbiAgICAgICh2YWx1ZSwgcHJldikgPT4ge1xuICAgICAgICBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICAgICAgfSwgW10pXG4gICAgLm9wdGlvbignLWksIC0taW5jcmUtdmVyc2lvbiA8bWFqb3IgfCBtaW5vciB8IHBhdGNoIHwgcHJlcmVsZWFzZT4nLFxuICAgICAgJ3ZlcnNpb24gaW5jcmVtZW50LCB2YWxpZCB2YWx1ZXMgYXJlOiBtYWpvciwgbWlub3IsIHBhdGNoLCBwcmVyZWxlYXNlJywgJ3BhdGNoJylcbiAgICAuYWN0aW9uKChkaXJzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgY29uc29sZS5sb2coZGlycywgYnVtcENtZC5vcHRzKCkpO1xuICAgIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhidW1wQ21kKTtcbiAgYnVtcENtZC51c2FnZShidW1wQ21kLnVzYWdlKCkgKyAnXFxuJyArIGhsKCdkcmNwIGJ1bXAgPGRpci0xPiA8ZGlyLTI+IC4uLicpICsgJyB0byByZWN1cnNpdmVseSBidW1wIHBhY2thZ2UuanNvbiBmcm9tIG11bHRpcGxlIGRpcmVjdG9yaWVzXFxuJyArXG4gICAgaGwoJ2RyY3AgYnVtcCA8ZGlyPiAtaSBtaW5vcicpICsgJyB0byBidW1wIG1pbm9yIHZlcnNpb24gbnVtYmVyLCBkZWZhdWx0IGlzIHBhdGNoIG51bWJlcicpO1xuICB0cnkge1xuXG4gICAgYXdhaXQgcHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndik7XG4gIH0gY2F0Y2ggKGUpIHtcblxuICAgIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkQnJpZ2h0KGUpLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cbmxldCBzYXZlZCA9IGZhbHNlO1xucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIGFzeW5jIChjb2RlKSA9PiB7XG4gIGlmIChzYXZlZClcbiAgICByZXR1cm47XG4gIHNhdmVkID0gdHJ1ZTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKCdEb25lLicpKTtcbiAgKGF3YWl0IGltcG9ydCgnLi4vc3RvcmUnKSkuc2F2ZVN0YXRlKCk7XG59KTtcblxuZnVuY3Rpb24gaGwodGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmVlbih0ZXh0KTtcbn1cblxuZnVuY3Rpb24gaGxEZXNjKHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gY2hhbGsuZ3JlZW4odGV4dCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgcHJvZ3JhbS5vcHRpb24oJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgICBobERlc2MoJ1JlYWQgY29uZmlnIGZpbGVzLCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZmlsZXMsIHRoZSBsYXR0ZXIgb25lIG92ZXJyaWRlcyBwcmV2aW91cyBvbmUnKSxcbiAgICAodmFsdWUsIHByZXYpID0+IHsgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjt9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS1wcm9wIDxwcm9wZXJ0eS1wYXRoPXZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPicsXG4gICAgaGxEZXNjKCc8cHJvcGVydHktcGF0aD49PHZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPiAuLi4gZGlyZWN0bHkgc2V0IGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcywgcHJvcGVydHkgbmFtZSBpcyBsb2Rhc2guc2V0KCkgcGF0aC1saWtlIHN0cmluZ1xcbiBlLmcuXFxuJykgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAZHIvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODBcXG4nICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQGRyL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwXFxuJyArXG4gICAgJy0tcHJvcCBhcnJheWxpa2UucHJvcFswXT1mb29iYXJcXG4nICtcbiAgICAnLS1wcm9wIFtcIkBkci9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScsXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tbG9nLXN0YXQnLCBobERlc2MoJ1ByaW50IGludGVybmFsIFJlZHV4IHN0YXRlL2FjdGlvbnMgZm9yIGRlYnVnJykpO1xuXG4gIHJldHVybiBwcm9ncmFtO1xufVxuIl19