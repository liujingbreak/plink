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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLHlDQUE2QztBQUM3QyxrREFBMEI7QUFDMUIsb0NBQXNDO0FBSXRDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3ZDLHFCQUFxQjtBQUVyQixPQUFPLENBQUMsS0FBSyxHQUFHLDhCQUE4QixDQUFDO0FBRS9DLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsV0FBVyxDQUFDLFNBQWlCOztRQUNqRCxvQkFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRTlCLDZDQUE2QztRQUM3QywrQkFBK0I7UUFFL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBTyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDYixPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUV4RTs7V0FFRztRQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7YUFDbEQsV0FBVyxDQUFDLHVHQUF1RyxDQUFDO2FB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LEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUEsQ0FBQyxFQUFFLEVBQWMsQ0FBQztTQUNsRixNQUFNLENBQUMsZ0RBQWdELEVBQ3RELE1BQU0sQ0FBQyw4SUFBOEksQ0FBQztRQUN0SixxRkFBcUY7UUFDckYscUZBQXFGO1FBQ3JGLG1DQUFtQztRQUNuQyxzQ0FBc0MsRUFDdEMsYUFBYSxFQUFFLEVBQWMsQ0FBQztTQUMvQixNQUFNLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLENBQUM7SUFFOUUsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQWRELDhDQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0IGNvbW1hbmRlciwge0NvbW1hbmR9IGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIHRwIGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHt9IGZyb20gJy4uL3RzLWNtZCc7XG5cbmNvbnN0IHBrID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZScpO1xuLy8gY29uc3QgV0lEVEggPSAxMzA7XG5cbnByb2Nlc3MudGl0bGUgPSAnT25lUHJvamVjdCBTREstIGNvbW1hbmQgbGluZSc7XG5cbmNvbnN0IGFycmF5T3B0aW9uRm4gPSAoY3Vycjogc3RyaW5nLCBwcmV2OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkgPT4ge1xuICBpZiAocHJldilcbiAgICBwcmV2LnB1c2goY3Vycik7XG4gIHJldHVybiBwcmV2O1xufTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRyY3BDb21tYW5kKHN0YXJ0VGltZTogbnVtYmVyKSB7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG4gIC8vIGNvbnN0IGNsaSA9IHJlcXVpcmUoJy4uLy4uL2xpYi9ndWxwL2NsaScpO1xuICAvLyBjbGkuc2V0U3RhcnRUaW1lKHN0YXJ0VGltZSk7XG5cbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBDb21tYW5kKCkubmFtZSgnZHJjcCcpXG4gIC5hY3Rpb24oYXJncyA9PiB7XG4gICAgcHJvZ3JhbS5vdXRwdXRIZWxwKCk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcbnZlcnNpb246JywgcGsudmVyc2lvbik7XG4gIH0pO1xuXG4gIHByb2dyYW0udmVyc2lvbihway52ZXJzaW9uLCAnLXYsIC0tdmVycycsICdvdXRwdXQgdGhlIGN1cnJlbnQgdmVyc2lvbicpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGluaXRcbiAgICovXG4gIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2luaXQgW3dvcmtzcGFjZV0nKVxuICAuZGVzY3JpcHRpb24oJ0luaXRpYWxpemUgd29ya3NwYWNlIGRpcmVjdG9yeSwgZ2VuZXJhdGUgYmFzaWMgY29uZmlndXJhdGlvbiBmaWxlcyBmb3IgcHJvamVjdCBhbmQgY29tcG9uZW50IHBhY2thZ2VzJylcbiAgLm9wdGlvbignLWYgfCAtLWZvcmNlJywgJ0ZvcmNlIHJ1biBcIm5wbSBpbnN0YWxsXCIgaW4gc3BlY2lmaWMgd29ya3NwYWNlIGRpcmVjdG9yeScsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXlhcm4nLCAnVXNlIFlhcm4gdG8gaW5zdGFsbCBjb21wb25lbnQgcGVlciBkZXBlbmRlbmNpZXMgaW5zdGVhZCBvZiB1c2luZyBOUE0nLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wcm9kdWN0aW9uJywgJ0FkZCBcIi0tcHJvZHVjdGlvblwiIG9yIFwiLS1vbmx5PXByb2RcIiBjb21tYW5kIGxpbmUgYXJndW1lbnQgdG8gXCJ5YXJuL25wbSBpbnN0YWxsXCInLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAod29ya3NwYWNlOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1pbml0JykpLmRlZmF1bHQoaW5pdENtZC5vcHRzKCkgYXMgYW55LCB3b3Jrc3BhY2UpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcHJvamVjdFxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdwcm9qZWN0IFthZGR8cmVtb3ZlXSBbcHJvamVjdC1kaXIuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdBc3NvY2lhdGUsIGRpc2Fzc29jaWF0ZSBvciBsaXN0IGFzc29jaWF0ZWQgcHJvamVjdCBmb2xkZXJzJylcbiAgLmFjdGlvbihhc3luYyAoYWN0aW9uOiAnYWRkJ3wncmVtb3ZlJ3x1bmRlZmluZWQsIHByb2plY3REaXI6IHN0cmluZ1tdKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktcHJvamVjdCcpKS5kZWZhdWx0KGFjdGlvbiwgcHJvamVjdERpcik7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxpbnRcbiAgICovXG4gIGNvbnN0IGxpbnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpbnQgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdzb3VyY2UgY29kZSBzdHlsZSBjaGVjaycpXG4gIC5vcHRpb24oJy0tcGogW3Byb2plY3QxLHByb2plY3QyLi4uXScsICdsaW50IG9ubHkgVFMgY29kZSBmcm9tIHNwZWNpZmljIHByb2plY3QnLCBhcnJheU9wdGlvbkZuKVxuICAub3B0aW9uKCctLWZpeCcsICdSdW4gZXNsaW50L3RzbGludCBmaXgsIHRoaXMgY291bGQgY2F1c2UgeW91ciBzb3VyY2UgY29kZSBiZWluZyBjaGFuZ2VkIHVuZXhwZWN0ZWRseScsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIHBhY2thZ2VzID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1saW50JykpLmRlZmF1bHQocGFja2FnZXMsIGxpbnRDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhsaW50Q21kKTtcbiAgbGludENtZC51c2FnZShsaW50Q21kLnVzYWdlKCkgK1xuICAgIGhsKCdcXG5kcmNwIGxpbnQgLS1waiA8cHJvamVjdC1kaXIuLj4gWy0tZml4XScpICsgJyBMaW50IFRTIGZpbGVzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnlcXG4nICtcbiAgICBobCgnXFxuZHJjcCBsaW50IDxjb21wb25lbnQtcGFja2FnZS4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBjb21wb25lbnQgcGFja2FnZXMnKTtcblxuICAvKipcbiAgICogY29tbWFuZCBjbGVhblxuICAgKi9cbiAgcHJvZ3JhbS5jb21tYW5kKCdjbGVhbiBbc3ltbGlua10nKS5kZXNjcmlwdGlvbignQ2xlYW4gd2hvbGUgXCJkaXN0XCIgZGlyZWN0b3J5IG9yIG9ubHkgc3ltYm9saWMgbGlua3MgZnJvbSBub2RlX21vZHVsZXMnKVxuICAuYWN0aW9uKGFzeW5jIChzeW1saW5rOiAnc3ltbGluaycgfCB1bmRlZmluZWQpID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jbGVhbicpKS5kZWZhdWx0KHN5bWxpbmsgPT09ICdzeW1saW5rJyk7XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGxzXG4gICAqL1xuICBjb25zdCBsaXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdscycpLmFsaWFzKCdsaXN0JylcbiAgLmRlc2NyaXB0aW9uKCdJZiB5b3Ugd2FudCB0byBrbm93IGhvdyBtYW55IGNvbXBvbmVudHMgd2lsbCBhY3R1YWxseSBydW4sIHRoaXMgY29tbWFuZCBwcmludHMgb3V0IGEgbGlzdCBhbmQgdGhlIHByaW9yaXRpZXMsIGluY2x1ZGluZyBpbnN0YWxsZWQgY29tcG9uZW50cycpXG4gIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxzJykpLmRlZmF1bHQobGlzdENtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGxpc3RDbWQpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIHJ1blxuICAgKi9cbiAgY29uc3QgcnVuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzcGVjaWZpYyBtb2R1bGVcXCdzIGV4cG9ydGVkIGZ1bmN0aW9uXFxuJylcbiAgLmFjdGlvbihhc3luYyAodGFyZ2V0OiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgY29uc3QgY29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgYXdhaXQgY29uZmlnLmluaXQocnVuQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICBjb25zdCBsb2dDb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9sb2ctY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgICAoYXdhaXQgaW1wb3J0KCcuLi9wYWNrYWdlLXJ1bm5lcicpKS5ydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHJ1bkNtZCk7XG4gIHJ1bkNtZC51c2FnZShydW5DbWQudXNhZ2UoKSArICdcXG4nICsgY2hhbGsuZ3JlZW4oJ2RyY3AgcnVuIDx0YXJnZXQ+IFthcmd1bWVudHMuLi5dXFxuJykgK1xuICBgZS5nLlxcbiAgJHtjaGFsay5ncmVlbignZHJjcCBydW4gZm9yYmFyLXBhY2thZ2UvZGlzdC9maWxlI2Z1bmN0aW9uIGFyZ3VtZW50MSBhcmd1bWVudDIuLi4nKX1cXG5gICtcbiAgJ2V4ZWN1dGUgZXhwb3J0ZWQgZnVuY3Rpb24gb2YgVFMvSlMgZmlsZSBmcm9tIHNwZWNpZmljIHBhY2thZ2Ugb3IgcGF0aFxcblxcbicgK1xuICAnPHRhcmdldD4gLSBKUyBvciBUUyBmaWxlIG1vZHVsZSBwYXRoIHdoaWNoIGNhbiBiZSByZXNvbHZlZCBieSBOb2RlLmpzICh0cy1ub2RlKSBmb2xsb3dlZCBieSBcIiNcIiBhbmQgZXhwb3J0ZWQgZnVuY3Rpb24gbmFtZSxcXG4nICtcbiAgJ2UuZy4gXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdwYWNrYWdlLW5hbWUvZGlzdC9mb29iYXIuanMjbXlGdW5jdGlvbicpICtcbiAgJywgZnVuY3Rpb24gY2FuIGJlIGFzeW5jIHdoaWNoIHJldHVybnMgUHJvbWlzZVxcbicgK1xuICBjaGFsay5ncmVlbignbm9kZV9tb2R1bGVzL3BhY2thZ2UtZGlyL2Rpc3QvZm9vYmFyLnRzI215RnVuY3Rpb24nKSArXG4gICcsIHJlbGF0aXZlIG9yIGFic29sdXRlIHBhdGhcXG4nKTtcblxuICAvKipcbiAgICogdHNjIGNvbW1hbmRcbiAgICovXG4gIGNvbnN0IHRzY0NtZCA9IHByb2dyYW0uY29tbWFuZCgndHNjIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignUnVuIFR5cGVzY3JpcHQgY29tcGlsZXInKVxuICAub3B0aW9uKCctdywgLS13YXRjaCcsICdUeXBlc2NyaXB0IGNvbXBpbGVyIHdhdGNoIG1vZGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1waiwgLS1wcm9qZWN0IDxwcm9qZWN0LWRpciwuLi4+JywgJ0NvbXBpbGUgb25seSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeScsICh2LCBwcmV2KSA9PiB7XG4gICAgcHJldi5wdXNoKC4uLnYuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O1xuICB9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS1qc3gnLCAnaW5jbHVkZXMgVFNYIGZpbGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1lZCwgLS1lbWl0RGVjbGFyYXRpb25Pbmx5JywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgb3B0aW9uOiAtLWVtaXREZWNsYXJhdGlvbk9ubHkuXFxuT25seSBlbWl0IOKAmC5kLnRz4oCZIGRlY2xhcmF0aW9uIGZpbGVzLicsIGZhbHNlKVxuICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnU291cmNlIG1hcCBzdHlsZTogXCJpbmxpbmVcIiBvciBcImZpbGVcIicsICdpbmxpbmUnKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICBjb25zdCBvcHQgPSB0c2NDbWQub3B0cygpO1xuICAgIC8vIGNvbnNvbGUubG9nKG9wdCk7XG4gICAgY29uc3QgY29uZmlnID0gYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vY29uZmlnJykpLmRlZmF1bHQ7XG4gICAgYXdhaXQgY29uZmlnLmluaXQocnVuQ21kLm9wdHMoKSBhcyB0cC5HbG9iYWxPcHRpb25zKTtcbiAgICBjb25zdCB0c0NtZCA9IGF3YWl0IGltcG9ydCgnLi4vdHMtY21kJyk7XG4gICAgYXdhaXQgdHNDbWQudHNjKHtcbiAgICAgIHBhY2thZ2U6IHBhY2thZ2VzLFxuICAgICAgcHJvamVjdDogb3B0LnByb2plY3QsXG4gICAgICB3YXRjaDogb3B0LndhdGNoLFxuICAgICAgc291cmNlTWFwOiBvcHQuc291cmNlTWFwLFxuICAgICAganN4OiBvcHQuanN4LFxuICAgICAgZWQ6IG9wdC5lbWl0RGVjbGFyYXRpb25Pbmx5XG4gICAgfSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyh0c2NDbWQpO1xuICB0c2NDbWQudXNhZ2UodHNjQ21kLnVzYWdlKCkgKyAnXFxuJyArICdSdW4gZ3VscC10eXBlc2NyaXB0IHRvIGNvbXBpbGUgTm9kZS5qcyBzaWRlIHR5cGVzY3JpcHQgZmlsZXMuXFxuXFxuJyArXG4gICdJdCBjb21waWxlcyBcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi90cy8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2Rpc3RcIixcXG4nICtcbiAgJyAgb3JcXG4gIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9pc29tLyoqLyoudHNcIiB0byBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbVwiXFxuIGZvciBhbGwgQGRyIHBhY2thZ2VzLlxcbicgK1xuICAnSSBzdWdnZXN0IHRvIHB1dCBOb2RlLmpzIHNpZGUgVFMgY29kZSBpbiBkaXJlY3RvcnkgYHRzYCwgYW5kIGlzb21vcnBoaWMgVFMgY29kZSAobWVhbmluZyBpdCBydW5zIGluICcgK1xuICAnYm90aCBOb2RlLmpzIGFuZCBCcm93c2VyKSBpbiBkaXJlY3RvcnkgYGlzb21gLlxcbicgK1xuICBobERlc2MoJ2RyY3AgdHNjIDxwYWNrYWdlLi4+XFxuJykgKyAnIE9ubHkgY29tcGlsZSBzcGVjaWZpYyBjb21wb25lbnRzIGJ5IHByb3ZpZGluZyBwYWNrYWdlIG5hbWUgb3Igc2hvcnQgbmFtZVxcbicgK1xuICBobERlc2MoJ2RyY3AgdHNjXFxuJykgKyAnIENvbXBpbGUgYWxsIGNvbXBvbmVudHMgYmVsb25nIHRvIGFzc29jaWF0ZWQgcHJvamVjdHMsIG5vdCBpbmNsdWRpbmcgaW5zdGFsbGVkIGNvbXBvbmVudHNcXG4nICtcbiAgaGxEZXNjKCdkcmNwIHRzYyAtLXBqIDxwcm9qZWN0IGRpcmVjdG9yeSwuLi4+XFxuJykgKyAnIENvbXBpbGUgY29tcG9uZW50cyBiZWxvbmcgdG8gc3BlY2lmaWMgcHJvamVjdHNcXG4nICtcbiAgaGxEZXNjKCdkcmNwIHRzYyBbcGFja2FnZS4uLl0gLXdcXG4nKSArICcgV2F0Y2ggY29tcG9uZW50cyBjaGFuZ2UgYW5kIGNvbXBpbGUgd2hlbiBuZXcgdHlwZXNjcmlwdCBmaWxlIGlzIGNoYW5nZWQgb3IgY3JlYXRlZFxcblxcbicpO1xuXG4gIHRyeSB7XG5cbiAgICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KTtcbiAgfSBjYXRjaCAoZSkge1xuXG4gICAgY29uc29sZS5lcnJvcihjaGFsay5yZWRCcmlnaHQoZSksIGUuc3RhY2spO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxufVxubGV0IHNhdmVkID0gZmFsc2U7XG5wcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgYXN5bmMgKGNvZGUpID0+IHtcbiAgaWYgKHNhdmVkKVxuICAgIHJldHVybjtcbiAgc2F2ZWQgPSB0cnVlO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY2hhbGsuZ3JlZW4oJ0RvbmUuJykpO1xuICAoYXdhaXQgaW1wb3J0KCcuLi9zdG9yZScpKS5zYXZlU3RhdGUoKTtcbn0pO1xuXG5mdW5jdGlvbiBobCh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyZWVuKHRleHQpO1xufVxuXG5mdW5jdGlvbiBobERlc2ModGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBjaGFsay5ncmVlbih0ZXh0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhHbG9iYWxPcHRpb25zKHByb2dyYW06IGNvbW1hbmRlci5Db21tYW5kKTogY29tbWFuZGVyLkNvbW1hbmQge1xuICBwcm9ncmFtLm9wdGlvbignLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAgIGhsRGVzYygnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScpLFxuICAgICh2YWx1ZSwgcHJldikgPT4geyBwcmV2LnB1c2goLi4udmFsdWUuc3BsaXQoJywnKSk7IHJldHVybiBwcmV2O30sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLXByb3AgPHByb3BlcnR5LXBhdGg9dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+JyxcbiAgICBobERlc2MoJzxwcm9wZXJ0eS1wYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nXFxuIGUuZy5cXG4nKSArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEBkci9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgcG9ydD04MDgwIC0tcHJvcCBkZXZNb2RlPWZhbHNlIC0tcHJvcCBAZHIvZm9vYmFyLmFwaT1odHRwOi8vbG9jYWxob3N0OjgwODBcXG4nICtcbiAgICAnLS1wcm9wIGFycmF5bGlrZS5wcm9wWzBdPWZvb2JhclxcbicgK1xuICAgICctLXByb3AgW1wiQGRyL2Zvby5iYXJcIixcInByb3BcIiwwXT10cnVlJyxcbiAgICBhcnJheU9wdGlvbkZuLCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLS1sb2ctc3RhdCcsIGhsRGVzYygnUHJpbnQgaW50ZXJuYWwgUmVkdXggc3RhdGUvYWN0aW9ucyBmb3IgZGVidWcnKSk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG4iXX0=