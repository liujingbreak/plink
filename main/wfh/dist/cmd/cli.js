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
process.title = 'Plink- command line';
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
        bumpCmd.usage(bumpCmd.usage() + '\n' + hl('drcp bump <dir-1> <dir-2> ...') + ' to recursively bump package.json from multiple directories\n' +
            hl('drcp bump <dir> -i minor') + ' to bump minor version number, default is patch number');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLHlDQUE2QztBQUM3QyxrREFBMEI7QUFDMUIsb0NBQXNDO0FBSXRDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3ZDLHFCQUFxQjtBQUVyQixPQUFPLENBQUMsS0FBSyxHQUFHLHFCQUFxQixDQUFDO0FBRXRDLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsV0FBVyxDQUFDLFNBQWlCOztRQUNqRCxvQkFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRTlCLDZDQUE2QztRQUM3QywrQkFBK0I7UUFFL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBTyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDYixPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUV4RTs7V0FFRztRQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7YUFDbEQsV0FBVyxDQUFDLHVHQUF1RyxDQUFDO2FB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Q0FBQSxDQUFDLENBQUM7QUFFSCxTQUFTLEVBQUUsQ0FBQyxJQUFZO0lBQ3RCLE9BQU8sZUFBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsSUFBWTtJQUMxQixPQUFPLGVBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLE9BQTBCO0lBQzFELE9BQU8sQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQ3pDLE1BQU0sQ0FBQyx1RkFBdUYsQ0FBQyxFQUMvRixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBLENBQUMsRUFBRSxFQUFjLENBQUM7U0FDbEYsTUFBTSxDQUFDLGdEQUFnRCxFQUN0RCxNQUFNLENBQUMsOElBQThJLENBQUM7UUFDdEoscUZBQXFGO1FBQ3JGLHFGQUFxRjtRQUNyRixtQ0FBbUM7UUFDbkMsc0NBQXNDLEVBQ3RDLGFBQWEsRUFBRSxFQUFjLENBQUM7U0FDL0IsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDO0lBRTlFLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFkRCw4Q0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbmltcG9ydCBjb21tYW5kZXIsIHtDb21tYW5kfSBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyB0cCBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7fSBmcm9tICcuLi90cy1jbWQnO1xuXG5jb25zdCBwayA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UnKTtcbi8vIGNvbnN0IFdJRFRIID0gMTMwO1xuXG5wcm9jZXNzLnRpdGxlID0gJ1BsaW5rLSBjb21tYW5kIGxpbmUnO1xuXG5jb25zdCBhcnJheU9wdGlvbkZuID0gKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpID0+IHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkcmNwQ29tbWFuZChzdGFydFRpbWU6IG51bWJlcikge1xuICBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcblxuICAvLyBjb25zdCBjbGkgPSByZXF1aXJlKCcuLi8uLi9saWIvZ3VscC9jbGknKTtcbiAgLy8gY2xpLnNldFN0YXJ0VGltZShzdGFydFRpbWUpO1xuXG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgQ29tbWFuZCgpLm5hbWUoJ2RyY3AnKVxuICAuYWN0aW9uKGFyZ3MgPT4ge1xuICAgIHByb2dyYW0ub3V0cHV0SGVscCgpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG52ZXJzaW9uOicsIHBrLnZlcnNpb24pO1xuICB9KTtcblxuICBwcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbiwgJy12LCAtLXZlcnMnLCAnb3V0cHV0IHRoZSBjdXJyZW50IHZlcnNpb24nKTtcblxuICAvKipcbiAgICogY29tbWFuZCBpbml0XG4gICAqL1xuICBjb25zdCBpbml0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdpbml0IFt3b3Jrc3BhY2VdJylcbiAgLmRlc2NyaXB0aW9uKCdJbml0aWFsaXplIHdvcmtzcGFjZSBkaXJlY3RvcnksIGdlbmVyYXRlIGJhc2ljIGNvbmZpZ3VyYXRpb24gZmlsZXMgZm9yIHByb2plY3QgYW5kIGNvbXBvbmVudCBwYWNrYWdlcycpXG4gIC5vcHRpb24oJy1mIHwgLS1mb3JjZScsICdGb3JjZSBydW4gXCJucG0gaW5zdGFsbFwiIGluIHNwZWNpZmljIHdvcmtzcGFjZSBkaXJlY3RvcnknLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS15YXJuJywgJ1VzZSBZYXJuIHRvIGluc3RhbGwgY29tcG9uZW50IHBlZXIgZGVwZW5kZW5jaWVzIGluc3RlYWQgb2YgdXNpbmcgTlBNJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tcHJvZHVjdGlvbicsICdBZGQgXCItLXByb2R1Y3Rpb25cIiBvciBcIi0tb25seT1wcm9kXCIgY29tbWFuZCBsaW5lIGFyZ3VtZW50IHRvIFwieWFybi9ucG0gaW5zdGFsbFwiJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHdvcmtzcGFjZTogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktaW5pdCcpKS5kZWZhdWx0KGluaXRDbWQub3B0cygpIGFzIGFueSwgd29ya3NwYWNlKTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGluaXRDbWQpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHByb2plY3RcbiAgICovXG4gIHByb2dyYW0uY29tbWFuZCgncHJvamVjdCBbYWRkfHJlbW92ZV0gW3Byb2plY3QtZGlyLi4uXScpXG4gIC5kZXNjcmlwdGlvbignQXNzb2NpYXRlLCBkaXNhc3NvY2lhdGUgb3IgbGlzdCBhc3NvY2lhdGVkIHByb2plY3QgZm9sZGVycycpXG4gIC5hY3Rpb24oYXN5bmMgKGFjdGlvbjogJ2FkZCd8J3JlbW92ZSd8dW5kZWZpbmVkLCBwcm9qZWN0RGlyOiBzdHJpbmdbXSkgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXByb2plY3QnKSkuZGVmYXVsdChhY3Rpb24sIHByb2plY3REaXIpO1xuICB9KTtcblxuICAvKipcbiAgICogY29tbWFuZCBsaW50XG4gICAqL1xuICBjb25zdCBsaW50Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdsaW50IFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignc291cmNlIGNvZGUgc3R5bGUgY2hlY2snKVxuICAub3B0aW9uKCctLXBqIDxwcm9qZWN0MSxwcm9qZWN0Mi4uLj4nLCAnbGludCBvbmx5IFRTIGNvZGUgZnJvbSBzcGVjaWZpYyBwcm9qZWN0JywgYXJyYXlPcHRpb25GbiwgW10pXG4gIC5vcHRpb24oJy0tZml4JywgJ1J1biBlc2xpbnQvdHNsaW50IGZpeCwgdGhpcyBjb3VsZCBjYXVzZSB5b3VyIHNvdXJjZSBjb2RlIGJlaW5nIGNoYW5nZWQgdW5leHBlY3RlZGx5JywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgcGFja2FnZXMgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxpbnQnKSkuZGVmYXVsdChwYWNrYWdlcywgbGludENtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGxpbnRDbWQpO1xuICBsaW50Q21kLnVzYWdlKGxpbnRDbWQudXNhZ2UoKSArXG4gICAgaGwoJ1xcbmRyY3AgbGludCAtLXBqIDxwcm9qZWN0LWRpci4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeVxcbicgK1xuICAgIGhsKCdcXG5kcmNwIGxpbnQgPGNvbXBvbmVudC1wYWNrYWdlLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIGNvbXBvbmVudCBwYWNrYWdlcycpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGNsZWFuXG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ2NsZWFuIFtzeW1saW5rXScpLmRlc2NyaXB0aW9uKCdDbGVhbiB3aG9sZSBcImRpc3RcIiBkaXJlY3Rvcnkgb3Igb25seSBzeW1ib2xpYyBsaW5rcyBmcm9tIG5vZGVfbW9kdWxlcycpXG4gIC5hY3Rpb24oYXN5bmMgKHN5bWxpbms6ICdzeW1saW5rJyB8IHVuZGVmaW5lZCkgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWNsZWFuJykpLmRlZmF1bHQoc3ltbGluayA9PT0gJ3N5bWxpbmsnKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbHNcbiAgICovXG4gIGNvbnN0IGxpc3RDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xzJykuYWxpYXMoJ2xpc3QnKVxuICAuZGVzY3JpcHRpb24oJ0lmIHlvdSB3YW50IHRvIGtub3cgaG93IG1hbnkgY29tcG9uZW50cyB3aWxsIGFjdHVhbGx5IHJ1biwgdGhpcyBjb21tYW5kIHByaW50cyBvdXQgYSBsaXN0IGFuZCB0aGUgcHJpb3JpdGllcywgaW5jbHVkaW5nIGluc3RhbGxlZCBjb21wb25lbnRzJylcbiAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuZGVmYXVsdChsaXN0Q21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMobGlzdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcnVuXG4gICAqL1xuICBjb25zdCBydW5DbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3J1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXScpXG4gIC5kZXNjcmlwdGlvbignUnVuIHNwZWNpZmljIG1vZHVsZVxcJ3MgZXhwb3J0ZWQgZnVuY3Rpb25cXG4nKVxuICAuYWN0aW9uKGFzeW5jICh0YXJnZXQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pID0+IHtcbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9jb25maWcnKSkuZGVmYXVsdDtcbiAgICBhd2FpdCBjb25maWcuaW5pdChydW5DbWQub3B0cygpIGFzIHRwLkdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IGxvZ0NvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2xvZy1jb25maWcnKSkuZGVmYXVsdDtcbiAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgIChhd2FpdCBpbXBvcnQoJy4uL3BhY2thZ2UtcnVubmVyJykpLnJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc30pO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMocnVuQ21kKTtcbiAgcnVuQ21kLnVzYWdlKHJ1bkNtZC51c2FnZSgpICsgJ1xcbicgKyBjaGFsay5ncmVlbignZHJjcCBydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl1cXG4nKSArXG4gIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdkcmNwIHJ1biBmb3JiYXItcGFja2FnZS9kaXN0L2ZpbGUjZnVuY3Rpb24gYXJndW1lbnQxIGFyZ3VtZW50Mi4uLicpfVxcbmAgK1xuICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICc8dGFyZ2V0PiAtIEpTIG9yIFRTIGZpbGUgbW9kdWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlc29sdmVkIGJ5IE5vZGUuanMgKHRzLW5vZGUpIGZvbGxvd2VkIGJ5IFwiI1wiIGFuZCBleHBvcnRlZCBmdW5jdGlvbiBuYW1lLFxcbicgK1xuICAnZS5nLiBcXG4nICtcbiAgY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAnLCBmdW5jdGlvbiBjYW4gYmUgYXN5bmMgd2hpY2ggcmV0dXJucyBQcm9taXNlXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdub2RlX21vZHVsZXMvcGFja2FnZS1kaXIvZGlzdC9mb29iYXIudHMjbXlGdW5jdGlvbicpICtcbiAgJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gVHlwZXNjcmlwdCBjb21waWxlcicpXG4gIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgd2F0Y2ggbW9kZScsIGZhbHNlKVxuICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLWpzeCcsICdpbmNsdWRlcyBUU1ggZmlsZScsIGZhbHNlKVxuICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdTb3VyY2UgbWFwIHN0eWxlOiBcImlubGluZVwiIG9yIFwiZmlsZVwiJywgJ2lubGluZScpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG4gICAgLy8gY29uc29sZS5sb2cob3B0KTtcbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9jb25maWcnKSkuZGVmYXVsdDtcbiAgICBhd2FpdCBjb25maWcuaW5pdChydW5DbWQub3B0cygpIGFzIHRwLkdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IGxvZ0NvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2xvZy1jb25maWcnKSkuZGVmYXVsdDtcbiAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gICAgY29uc3QgdHNDbWQgPSBhd2FpdCBpbXBvcnQoJy4uL3RzLWNtZCcpO1xuICAgIGF3YWl0IHRzQ21kLnRzYyh7XG4gICAgICBwYWNrYWdlOiBwYWNrYWdlcyxcbiAgICAgIHByb2plY3Q6IG9wdC5wcm9qZWN0LFxuICAgICAgd2F0Y2g6IG9wdC53YXRjaCxcbiAgICAgIHNvdXJjZU1hcDogb3B0LnNvdXJjZU1hcCxcbiAgICAgIGpzeDogb3B0LmpzeCxcbiAgICAgIGVkOiBvcHQuZW1pdERlY2xhcmF0aW9uT25seVxuICAgIH0pO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnModHNjQ21kKTtcbiAgdHNjQ21kLnVzYWdlKHRzY0NtZC51c2FnZSgpICsgJ1xcbicgKyAnUnVuIGd1bHAtdHlwZXNjcmlwdCB0byBjb21waWxlIE5vZGUuanMgc2lkZSB0eXBlc2NyaXB0IGZpbGVzLlxcblxcbicgK1xuICAnSXQgY29tcGlsZXMgXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vdHMvKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9kaXN0XCIsXFxuJyArXG4gICcgIG9yXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbS8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb21cIlxcbiBmb3IgYWxsIEBkciBwYWNrYWdlcy5cXG4nICtcbiAgJ0kgc3VnZ2VzdCB0byBwdXQgTm9kZS5qcyBzaWRlIFRTIGNvZGUgaW4gZGlyZWN0b3J5IGB0c2AsIGFuZCBpc29tb3JwaGljIFRTIGNvZGUgKG1lYW5pbmcgaXQgcnVucyBpbiAnICtcbiAgJ2JvdGggTm9kZS5qcyBhbmQgQnJvd3NlcikgaW4gZGlyZWN0b3J5IGBpc29tYC5cXG4nICtcbiAgaGxEZXNjKCdkcmNwIHRzYyA8cGFja2FnZS4uPlxcbicpICsgJyBPbmx5IGNvbXBpbGUgc3BlY2lmaWMgY29tcG9uZW50cyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgaGxEZXNjKCdkcmNwIHRzY1xcbicpICsgJyBDb21waWxlIGFsbCBjb21wb25lbnRzIGJlbG9uZyB0byBhc3NvY2lhdGVkIHByb2plY3RzLCBub3QgaW5jbHVkaW5nIGluc3RhbGxlZCBjb21wb25lbnRzXFxuJyArXG4gIGhsRGVzYygnZHJjcCB0c2MgLS1waiA8cHJvamVjdCBkaXJlY3RvcnksLi4uPlxcbicpICsgJyBDb21waWxlIGNvbXBvbmVudHMgYmVsb25nIHRvIHNwZWNpZmljIHByb2plY3RzXFxuJyArXG4gIGhsRGVzYygnZHJjcCB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIGNvbXBvbmVudHMgY2hhbmdlIGFuZCBjb21waWxlIHdoZW4gbmV3IHR5cGVzY3JpcHQgZmlsZSBpcyBjaGFuZ2VkIG9yIGNyZWF0ZWRcXG5cXG4nKTtcblxuICAvKipcbiAgICogQnVtcCBjb21tYW5kXG4gICAqL1xuICBjb25zdCBidW1wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdidW1wIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdidW1wIHZlcnNpb24gbnVtYmVyIG9mIGFsbCBwYWNrYWdlLmpzb24gZnJvbSBzcGVjaWZpYyBkaXJlY3Rvcmllcywgc2FtZSBhcyBcIm5wbSB2ZXJzaW9uXCIgZG9lcycpXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdvbmx5IGJ1bXAgY29tcG9uZW50IHBhY2thZ2VzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNyZS12ZXJzaW9uIDxtYWpvciB8IG1pbm9yIHwgcGF0Y2ggfCBwcmVtYWpvciB8IHByZW1pbm9yIHwgcHJlcGF0Y2ggfCBwcmVyZWxlYXNlPicsXG4gICAgICAndmVyc2lvbiBpbmNyZW1lbnQsIHZhbGlkIHZhbHVlcyBhcmU6IG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UnLCAncGF0Y2gnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktYnVtcCcpKS5kZWZhdWx0KHsuLi5idW1wQ21kLm9wdHMoKSBhcyB0cC5CdW1wT3B0aW9ucywgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoYnVtcENtZCk7XG4gIGJ1bXBDbWQudXNhZ2UoYnVtcENtZC51c2FnZSgpICsgJ1xcbicgKyBobCgnZHJjcCBidW1wIDxkaXItMT4gPGRpci0yPiAuLi4nKSArICcgdG8gcmVjdXJzaXZlbHkgYnVtcCBwYWNrYWdlLmpzb24gZnJvbSBtdWx0aXBsZSBkaXJlY3Rvcmllc1xcbicgK1xuICAgIGhsKCdkcmNwIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcblxuICAvKipcbiAgICogUGFjayBjb21tYW5kXG4gICAqL1xuICBjb25zdCBwYWNrQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdwYWNrIFtwYWNrYWdlRGlyLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCducG0gcGFjayBldmVyeSBwYWthZ2UgaW50byB0YXJiYWxsIGZpbGVzJylcbiAgICAub3B0aW9uPHN0cmluZ1tdPignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JyxcbiAgICAncHJvamVjdCBkaXJlY3RvcmllcyB0byBiZSBsb29rZWQgdXAgZm9yIGFsbCBjb21wb25lbnRzIHdoaWNoIG5lZWQgdG8gYmUgcGFja2VkIHRvIHRhcmJhbGwgZmlsZXMnLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlRGlyczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4uL2RyY3AtY21kJykpLnBhY2soey4uLnBhY2tDbWQub3B0cygpIGFzIHRwLlBhY2tPcHRpb25zLCBwYWNrYWdlRGlyc30pO1xuICAgIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhwYWNrQ21kKTtcblxuICB0cnkge1xuICAgIGF3YWl0IHByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihjaGFsay5yZWRCcmlnaHQoZSksIGUuc3RhY2spO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxuXG5cbn1cbmxldCBzYXZlZCA9IGZhbHNlO1xucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIGFzeW5jIChjb2RlKSA9PiB7XG4gIGlmIChzYXZlZClcbiAgICByZXR1cm47XG4gIHNhdmVkID0gdHJ1ZTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKCdEb25lLicpKTtcbiAgKGF3YWl0IGltcG9ydCgnLi4vc3RvcmUnKSkuc2F2ZVN0YXRlKCk7XG59KTtcblxuZnVuY3Rpb24gaGwodGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmVlbih0ZXh0KTtcbn1cblxuZnVuY3Rpb24gaGxEZXNjKHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gY2hhbGsuZ3JlZW4odGV4dCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtOiBjb21tYW5kZXIuQ29tbWFuZCk6IGNvbW1hbmRlci5Db21tYW5kIHtcbiAgcHJvZ3JhbS5vcHRpb24oJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgICBobERlc2MoJ1JlYWQgY29uZmlnIGZpbGVzLCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZmlsZXMsIHRoZSBsYXR0ZXIgb25lIG92ZXJyaWRlcyBwcmV2aW91cyBvbmUnKSxcbiAgICAodmFsdWUsIHByZXYpID0+IHsgcHJldi5wdXNoKC4uLnZhbHVlLnNwbGl0KCcsJykpOyByZXR1cm4gcHJldjt9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS1wcm9wIDxwcm9wZXJ0eS1wYXRoPXZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPicsXG4gICAgaGxEZXNjKCc8cHJvcGVydHktcGF0aD49PHZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPiAuLi4gZGlyZWN0bHkgc2V0IGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcywgcHJvcGVydHkgbmFtZSBpcyBsb2Rhc2guc2V0KCkgcGF0aC1saWtlIHN0cmluZ1xcbiBlLmcuXFxuJykgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAZHIvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODBcXG4nICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQGRyL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwXFxuJyArXG4gICAgJy0tcHJvcCBhcnJheWxpa2UucHJvcFswXT1mb29iYXJcXG4nICtcbiAgICAnLS1wcm9wIFtcIkBkci9mb28uYmFyXCIsXCJwcm9wXCIsMF09dHJ1ZScsXG4gICAgYXJyYXlPcHRpb25GbiwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tbG9nLXN0YXQnLCBobERlc2MoJ1ByaW50IGludGVybmFsIFJlZHV4IHN0YXRlL2FjdGlvbnMgZm9yIGRlYnVnJykpO1xuXG4gIHJldHVybiBwcm9ncmFtO1xufVxuIl19