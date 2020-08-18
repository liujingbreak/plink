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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0NBQWtDO0FBQ2xDLHlDQUE2QztBQUM3QyxrREFBMEI7QUFDMUIsb0NBQXNDO0FBSXRDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3ZDLHFCQUFxQjtBQUVyQixPQUFPLENBQUMsS0FBSyxHQUFHLDhCQUE4QixDQUFDO0FBRS9DLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQTBCLEVBQUUsRUFBRTtJQUNqRSxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUYsU0FBc0IsV0FBVyxDQUFDLFNBQWlCOztRQUNqRCxvQkFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRTlCLDZDQUE2QztRQUM3QywrQkFBK0I7UUFFL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBTyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQzthQUN6QyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDYixPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUV4RTs7V0FFRztRQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7YUFDbEQsV0FBVyxDQUFDLHVHQUF1RyxDQUFDO2FBQ3BILE1BQU0sQ0FBQyxjQUFjLEVBQUUseURBQXlELEVBQUUsS0FBSyxDQUFDO1lBQ3pGLG1HQUFtRzthQUNsRyxNQUFNLENBQUMsY0FBYyxFQUFFLGlGQUFpRixFQUFFLEtBQUssQ0FBQzthQUNoSCxNQUFNLENBQUMsQ0FBTyxTQUFpQixFQUFFLEVBQUU7WUFDbEMsTUFBTSxDQUFDLHdEQUFhLFlBQVksR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvRSxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ0gsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFM0I7O1dBRUc7UUFDSCxPQUFPLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDO2FBQ3ZELFdBQVcsQ0FBQyw0REFBNEQsQ0FBQzthQUN6RSxNQUFNLENBQUMsQ0FBTyxNQUFnQyxFQUFFLFVBQW9CLEVBQUUsRUFBRTtZQUN2RSxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5RCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBRUg7O1dBRUc7UUFDSCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO2FBQ25ELFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQzthQUN0QyxNQUFNLENBQUMsNkJBQTZCLEVBQUUseUNBQXlDLEVBQUUsYUFBYSxDQUFDO2FBQy9GLE1BQU0sQ0FBQyxPQUFPLEVBQUUscUZBQXFGLEVBQUUsS0FBSyxDQUFDO2FBQzdHLE1BQU0sQ0FBQyxDQUFNLFFBQVEsRUFBQyxFQUFFO1lBQ3ZCLE1BQU0sQ0FBQyx3REFBYSxZQUFZLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNILGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtZQUMzQixFQUFFLENBQUMsMENBQTBDLENBQUMsR0FBRyxrREFBa0Q7WUFDbkcsRUFBRSxDQUFDLDJDQUEyQyxDQUFDLEdBQUcsaURBQWlELENBQUMsQ0FBQztRQUV2Rzs7V0FFRztRQUNILE9BQU8sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxXQUFXLENBQUMsdUVBQXVFLENBQUM7YUFDdEgsTUFBTSxDQUFDLENBQU8sT0FBOEIsRUFBRSxFQUFFO1lBQy9DLENBQUMsd0RBQWEsYUFBYSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQy9ELENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSDs7V0FFRztRQUNILE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQzthQUNsRCxXQUFXLENBQUMsOElBQThJLENBQUM7YUFDM0osTUFBTSxDQUFDLEdBQVMsRUFBRTtZQUNqQixNQUFNLENBQUMsd0RBQWEsVUFBVSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNILGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTNCOztXQUVHO1FBQ0gsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQzthQUM1RCxXQUFXLENBQUMsNENBQTRDLENBQUM7YUFDekQsTUFBTSxDQUFDLENBQU8sTUFBYyxFQUFFLElBQWMsRUFBRSxFQUFFO1lBQy9DLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyx3REFBYSxXQUFXLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUN6RCxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBc0IsQ0FBQyxDQUFDO1lBQ3JELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyx3REFBYSxlQUFlLEdBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNoRSxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUNwQixDQUFDLHdEQUFhLG1CQUFtQixHQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDSCxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLEdBQUcsZUFBSyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQztZQUN0RixXQUFXLGVBQUssQ0FBQyxLQUFLLENBQUMsbUVBQW1FLENBQUMsSUFBSTtZQUMvRiwyRUFBMkU7WUFDM0UsK0hBQStIO1lBQy9ILFNBQVM7WUFDVCxlQUFLLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxDQUFDO1lBQ3JELGlEQUFpRDtZQUNqRCxlQUFLLENBQUMsS0FBSyxDQUFDLG9EQUFvRCxDQUFDO1lBQ2pFLCtCQUErQixDQUFDLENBQUM7UUFFakM7O1dBRUc7UUFDSCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO2FBQ2pELFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQzthQUN0QyxNQUFNLENBQUMsYUFBYSxFQUFFLGdDQUFnQyxFQUFFLEtBQUssQ0FBQzthQUM5RCxNQUFNLENBQUMsbUNBQW1DLEVBQUUseUNBQXlDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDbEcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUFDLE9BQU8sSUFBSSxDQUFDO1FBQzFDLENBQUMsRUFBRSxFQUFjLENBQUM7YUFDakIsTUFBTSxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxLQUFLLENBQUM7YUFDM0MsTUFBTSxDQUFDLDZCQUE2QixFQUFFLDBGQUEwRixFQUFFLEtBQUssQ0FBQzthQUN4SSxNQUFNLENBQUMsY0FBYyxFQUFFLHNDQUFzQyxFQUFFLFFBQVEsQ0FBQzthQUN4RSxNQUFNLENBQUMsQ0FBTyxRQUFrQixFQUFFLEVBQUU7WUFDbkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzFCLG9CQUFvQjtZQUNwQixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsd0RBQWEsV0FBVyxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDekQsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQXNCLENBQUMsQ0FBQztZQUNyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDaEUsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFcEIsTUFBTSxLQUFLLEdBQUcsd0RBQWEsV0FBVyxHQUFDLENBQUM7WUFDeEMsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDO2dCQUNkLE9BQU8sRUFBRSxRQUFRO2dCQUNqQixPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU87Z0JBQ3BCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSztnQkFDaEIsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTO2dCQUN4QixHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUc7Z0JBQ1osRUFBRSxFQUFFLEdBQUcsQ0FBQyxtQkFBbUI7YUFDNUIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNILGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksR0FBRyxtRUFBbUU7WUFDeEcsbUZBQW1GO1lBQ25GLG9HQUFvRztZQUNwRyxzR0FBc0c7WUFDdEcsa0RBQWtEO1lBQ2xELE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLDZFQUE2RTtZQUNoSCxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsNkZBQTZGO1lBQ3BILE1BQU0sQ0FBQyx5Q0FBeUMsQ0FBQyxHQUFHLG1EQUFtRDtZQUN2RyxNQUFNLENBQUMsNEJBQTRCLENBQUMsR0FBRyx5RkFBeUYsQ0FBQyxDQUFDO1FBRWxJOztXQUVHO1FBQ0gsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQzthQUNqRCxXQUFXLENBQUMsK0ZBQStGLENBQUM7YUFDNUcsTUFBTSxDQUFXLG1DQUFtQyxFQUFFLDhEQUE4RCxFQUNuSCxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFBQyxPQUFPLElBQUksQ0FBQztRQUM5QyxDQUFDLEVBQUUsRUFBRSxDQUFDO2FBQ1AsTUFBTSxDQUFDLDJGQUEyRixFQUNqRyxzRUFBc0UsRUFBRSxPQUFPLENBQUM7YUFDakYsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1lBQ25DLENBQUMsd0RBQWEsWUFBWSxHQUFDLENBQUMsQ0FBQyxPQUFPLGlDQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQW9CLEtBQUUsUUFBUSxJQUFFLENBQUM7UUFDeEYsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUNMLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsK0JBQStCLENBQUMsR0FBRywrREFBK0Q7WUFDMUksRUFBRSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsd0RBQXdELENBQUMsQ0FBQztRQUM3RixJQUFJO1lBRUYsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN4QztRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBRVYsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2pCO0lBQ0gsQ0FBQztDQUFBO0FBL0pELGtDQStKQztBQUNELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztBQUNsQixPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFPLElBQUksRUFBRSxFQUFFO0lBQ3RDLElBQUksS0FBSztRQUNQLE9BQU87SUFDVCxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ2IsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLENBQUMsd0RBQWEsVUFBVSxHQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN6QyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBRUgsU0FBUyxFQUFFLENBQUMsSUFBWTtJQUN0QixPQUFPLGVBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFDLElBQVk7SUFDMUIsT0FBTyxlQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFFRCxTQUFnQixpQkFBaUIsQ0FBQyxPQUEwQjtJQUMxRCxPQUFPLENBQUMsTUFBTSxDQUFDLDRCQUE0QixFQUN6QyxNQUFNLENBQUMsdUZBQXVGLENBQUMsRUFDL0YsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQSxDQUFDLEVBQUUsRUFBYyxDQUFDO1NBQ2xGLE1BQU0sQ0FBQyxnREFBZ0QsRUFDdEQsTUFBTSxDQUFDLDhJQUE4SSxDQUFDO1FBQ3RKLHFGQUFxRjtRQUNyRixxRkFBcUY7UUFDckYsbUNBQW1DO1FBQ25DLHNDQUFzQyxFQUN0QyxhQUFhLEVBQUUsRUFBYyxDQUFDO1NBQy9CLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQztJQUU5RSxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBZEQsOENBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgY29tbWFuZGVyLCB7Q29tbWFuZH0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge3N0YXRlRmFjdG9yeX0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgdHAgZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge30gZnJvbSAnLi4vdHMtY21kJztcblxuY29uc3QgcGsgPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlJyk7XG4vLyBjb25zdCBXSURUSCA9IDEzMDtcblxucHJvY2Vzcy50aXRsZSA9ICdPbmVQcm9qZWN0IFNESy0gY29tbWFuZCBsaW5lJztcblxuY29uc3QgYXJyYXlPcHRpb25GbiA9IChjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSA9PiB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZHJjcENvbW1hbmQoc3RhcnRUaW1lOiBudW1iZXIpIHtcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG5cbiAgLy8gY29uc3QgY2xpID0gcmVxdWlyZSgnLi4vLi4vbGliL2d1bHAvY2xpJyk7XG4gIC8vIGNsaS5zZXRTdGFydFRpbWUoc3RhcnRUaW1lKTtcblxuICBjb25zdCBwcm9ncmFtID0gbmV3IENvbW1hbmQoKS5uYW1lKCdkcmNwJylcbiAgLmFjdGlvbihhcmdzID0+IHtcbiAgICBwcm9ncmFtLm91dHB1dEhlbHAoKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnXFxudmVyc2lvbjonLCBway52ZXJzaW9uKTtcbiAgfSk7XG5cbiAgcHJvZ3JhbS52ZXJzaW9uKHBrLnZlcnNpb24sICctdiwgLS12ZXJzJywgJ291dHB1dCB0aGUgY3VycmVudCB2ZXJzaW9uJyk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgaW5pdFxuICAgKi9cbiAgY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnaW5pdCBbd29ya3NwYWNlXScpXG4gIC5kZXNjcmlwdGlvbignSW5pdGlhbGl6ZSB3b3Jrc3BhY2UgZGlyZWN0b3J5LCBnZW5lcmF0ZSBiYXNpYyBjb25maWd1cmF0aW9uIGZpbGVzIGZvciBwcm9qZWN0IGFuZCBjb21wb25lbnQgcGFja2FnZXMnKVxuICAub3B0aW9uKCctZiB8IC0tZm9yY2UnLCAnRm9yY2UgcnVuIFwibnBtIGluc3RhbGxcIiBpbiBzcGVjaWZpYyB3b3Jrc3BhY2UgZGlyZWN0b3J5JywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0teWFybicsICdVc2UgWWFybiB0byBpbnN0YWxsIGNvbXBvbmVudCBwZWVyIGRlcGVuZGVuY2llcyBpbnN0ZWFkIG9mIHVzaW5nIE5QTScsIGZhbHNlKVxuICAub3B0aW9uKCctLXByb2R1Y3Rpb24nLCAnQWRkIFwiLS1wcm9kdWN0aW9uXCIgb3IgXCItLW9ubHk9cHJvZFwiIGNvbW1hbmQgbGluZSBhcmd1bWVudCB0byBcInlhcm4vbnBtIGluc3RhbGxcIicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jICh3b3Jrc3BhY2U6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWluaXQnKSkuZGVmYXVsdChpbml0Q21kLm9wdHMoKSBhcyBhbnksIHdvcmtzcGFjZSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhpbml0Q21kKTtcblxuICAvKipcbiAgICogY29tbWFuZCBwcm9qZWN0XG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ3Byb2plY3QgW2FkZHxyZW1vdmVdIFtwcm9qZWN0LWRpci4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ0Fzc29jaWF0ZSwgZGlzYXNzb2NpYXRlIG9yIGxpc3QgYXNzb2NpYXRlZCBwcm9qZWN0IGZvbGRlcnMnKVxuICAuYWN0aW9uKGFzeW5jIChhY3Rpb246ICdhZGQnfCdyZW1vdmUnfHVuZGVmaW5lZCwgcHJvamVjdERpcjogc3RyaW5nW10pID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1wcm9qZWN0JykpLmRlZmF1bHQoYWN0aW9uLCBwcm9qZWN0RGlyKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbGludFxuICAgKi9cbiAgY29uc3QgbGludENtZCA9IHByb2dyYW0uY29tbWFuZCgnbGludCBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ3NvdXJjZSBjb2RlIHN0eWxlIGNoZWNrJylcbiAgLm9wdGlvbignLS1waiBbcHJvamVjdDEscHJvamVjdDIuLi5dJywgJ2xpbnQgb25seSBUUyBjb2RlIGZyb20gc3BlY2lmaWMgcHJvamVjdCcsIGFycmF5T3B0aW9uRm4pXG4gIC5vcHRpb24oJy0tZml4JywgJ1J1biBlc2xpbnQvdHNsaW50IGZpeCwgdGhpcyBjb3VsZCBjYXVzZSB5b3VyIHNvdXJjZSBjb2RlIGJlaW5nIGNoYW5nZWQgdW5leHBlY3RlZGx5JywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgcGFja2FnZXMgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWxpbnQnKSkuZGVmYXVsdChwYWNrYWdlcywgbGludENtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGxpbnRDbWQpO1xuICBsaW50Q21kLnVzYWdlKGxpbnRDbWQudXNhZ2UoKSArXG4gICAgaGwoJ1xcbmRyY3AgbGludCAtLXBqIDxwcm9qZWN0LWRpci4uPiBbLS1maXhdJykgKyAnIExpbnQgVFMgZmlsZXMgZnJvbSBzcGVjaWZpYyBwcm9qZWN0IGRpcmVjdG9yeVxcbicgK1xuICAgIGhsKCdcXG5kcmNwIGxpbnQgPGNvbXBvbmVudC1wYWNrYWdlLi4+IFstLWZpeF0nKSArICcgTGludCBUUyBmaWxlcyBmcm9tIHNwZWNpZmljIGNvbXBvbmVudCBwYWNrYWdlcycpO1xuXG4gIC8qKlxuICAgKiBjb21tYW5kIGNsZWFuXG4gICAqL1xuICBwcm9ncmFtLmNvbW1hbmQoJ2NsZWFuIFtzeW1saW5rXScpLmRlc2NyaXB0aW9uKCdDbGVhbiB3aG9sZSBcImRpc3RcIiBkaXJlY3Rvcnkgb3Igb25seSBzeW1ib2xpYyBsaW5rcyBmcm9tIG5vZGVfbW9kdWxlcycpXG4gIC5hY3Rpb24oYXN5bmMgKHN5bWxpbms6ICdzeW1saW5rJyB8IHVuZGVmaW5lZCkgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWNsZWFuJykpLmRlZmF1bHQoc3ltbGluayA9PT0gJ3N5bWxpbmsnKTtcbiAgfSk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgbHNcbiAgICovXG4gIGNvbnN0IGxpc3RDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xzJykuYWxpYXMoJ2xpc3QnKVxuICAuZGVzY3JpcHRpb24oJ0lmIHlvdSB3YW50IHRvIGtub3cgaG93IG1hbnkgY29tcG9uZW50cyB3aWxsIGFjdHVhbGx5IHJ1biwgdGhpcyBjb21tYW5kIHByaW50cyBvdXQgYSBsaXN0IGFuZCB0aGUgcHJpb3JpdGllcywgaW5jbHVkaW5nIGluc3RhbGxlZCBjb21wb25lbnRzJylcbiAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktbHMnKSkuZGVmYXVsdChsaXN0Q21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMobGlzdENtZCk7XG5cbiAgLyoqXG4gICAqIGNvbW1hbmQgcnVuXG4gICAqL1xuICBjb25zdCBydW5DbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3J1biA8dGFyZ2V0PiBbYXJndW1lbnRzLi4uXScpXG4gIC5kZXNjcmlwdGlvbignUnVuIHNwZWNpZmljIG1vZHVsZVxcJ3MgZXhwb3J0ZWQgZnVuY3Rpb25cXG4nKVxuICAuYWN0aW9uKGFzeW5jICh0YXJnZXQ6IHN0cmluZywgYXJnczogc3RyaW5nW10pID0+IHtcbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9jb25maWcnKSkuZGVmYXVsdDtcbiAgICBhd2FpdCBjb25maWcuaW5pdChydW5DbWQub3B0cygpIGFzIHRwLkdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IGxvZ0NvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2xvZy1jb25maWcnKSkuZGVmYXVsdDtcbiAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgIChhd2FpdCBpbXBvcnQoJy4uL3BhY2thZ2UtcnVubmVyJykpLnJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc30pO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMocnVuQ21kKTtcbiAgcnVuQ21kLnVzYWdlKHJ1bkNtZC51c2FnZSgpICsgJ1xcbicgKyBjaGFsay5ncmVlbignZHJjcCBydW4gPHRhcmdldD4gW2FyZ3VtZW50cy4uLl1cXG4nKSArXG4gIGBlLmcuXFxuICAke2NoYWxrLmdyZWVuKCdkcmNwIHJ1biBmb3JiYXItcGFja2FnZS9kaXN0L2ZpbGUjZnVuY3Rpb24gYXJndW1lbnQxIGFyZ3VtZW50Mi4uLicpfVxcbmAgK1xuICAnZXhlY3V0ZSBleHBvcnRlZCBmdW5jdGlvbiBvZiBUUy9KUyBmaWxlIGZyb20gc3BlY2lmaWMgcGFja2FnZSBvciBwYXRoXFxuXFxuJyArXG4gICc8dGFyZ2V0PiAtIEpTIG9yIFRTIGZpbGUgbW9kdWxlIHBhdGggd2hpY2ggY2FuIGJlIHJlc29sdmVkIGJ5IE5vZGUuanMgKHRzLW5vZGUpIGZvbGxvd2VkIGJ5IFwiI1wiIGFuZCBleHBvcnRlZCBmdW5jdGlvbiBuYW1lLFxcbicgK1xuICAnZS5nLiBcXG4nICtcbiAgY2hhbGsuZ3JlZW4oJ3BhY2thZ2UtbmFtZS9kaXN0L2Zvb2Jhci5qcyNteUZ1bmN0aW9uJykgK1xuICAnLCBmdW5jdGlvbiBjYW4gYmUgYXN5bmMgd2hpY2ggcmV0dXJucyBQcm9taXNlXFxuJyArXG4gIGNoYWxrLmdyZWVuKCdub2RlX21vZHVsZXMvcGFja2FnZS1kaXIvZGlzdC9mb29iYXIudHMjbXlGdW5jdGlvbicpICtcbiAgJywgcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aFxcbicpO1xuXG4gIC8qKlxuICAgKiB0c2MgY29tbWFuZFxuICAgKi9cbiAgY29uc3QgdHNjQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd0c2MgW3BhY2thZ2UuLi5dJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gVHlwZXNjcmlwdCBjb21waWxlcicpXG4gIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1R5cGVzY3JpcHQgY29tcGlsZXIgd2F0Y2ggbW9kZScsIGZhbHNlKVxuICAub3B0aW9uKCctLXBqLCAtLXByb2plY3QgPHByb2plY3QtZGlyLC4uLj4nLCAnQ29tcGlsZSBvbmx5IHNwZWNpZmljIHByb2plY3QgZGlyZWN0b3J5JywgKHYsIHByZXYpID0+IHtcbiAgICBwcmV2LnB1c2goLi4udi5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gIH0sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLWpzeCcsICdpbmNsdWRlcyBUU1ggZmlsZScsIGZhbHNlKVxuICAub3B0aW9uKCctLWVkLCAtLWVtaXREZWNsYXJhdGlvbk9ubHknLCAnVHlwZXNjcmlwdCBjb21waWxlciBvcHRpb246IC0tZW1pdERlY2xhcmF0aW9uT25seS5cXG5Pbmx5IGVtaXQg4oCYLmQudHPigJkgZGVjbGFyYXRpb24gZmlsZXMuJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdTb3VyY2UgbWFwIHN0eWxlOiBcImlubGluZVwiIG9yIFwiZmlsZVwiJywgJ2lubGluZScpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGNvbnN0IG9wdCA9IHRzY0NtZC5vcHRzKCk7XG4gICAgLy8gY29uc29sZS5sb2cob3B0KTtcbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9jb25maWcnKSkuZGVmYXVsdDtcbiAgICBhd2FpdCBjb25maWcuaW5pdChydW5DbWQub3B0cygpIGFzIHRwLkdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IGxvZ0NvbmZpZyA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2xvZy1jb25maWcnKSkuZGVmYXVsdDtcbiAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gICAgY29uc3QgdHNDbWQgPSBhd2FpdCBpbXBvcnQoJy4uL3RzLWNtZCcpO1xuICAgIGF3YWl0IHRzQ21kLnRzYyh7XG4gICAgICBwYWNrYWdlOiBwYWNrYWdlcyxcbiAgICAgIHByb2plY3Q6IG9wdC5wcm9qZWN0LFxuICAgICAgd2F0Y2g6IG9wdC53YXRjaCxcbiAgICAgIHNvdXJjZU1hcDogb3B0LnNvdXJjZU1hcCxcbiAgICAgIGpzeDogb3B0LmpzeCxcbiAgICAgIGVkOiBvcHQuZW1pdERlY2xhcmF0aW9uT25seVxuICAgIH0pO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnModHNjQ21kKTtcbiAgdHNjQ21kLnVzYWdlKHRzY0NtZC51c2FnZSgpICsgJ1xcbicgKyAnUnVuIGd1bHAtdHlwZXNjcmlwdCB0byBjb21waWxlIE5vZGUuanMgc2lkZSB0eXBlc2NyaXB0IGZpbGVzLlxcblxcbicgK1xuICAnSXQgY29tcGlsZXMgXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vdHMvKiovKi50c1wiIHRvIFwiPHBhY2thZ2UtZGlyZWN0b3J5Pi9kaXN0XCIsXFxuJyArXG4gICcgIG9yXFxuICBcIjxwYWNrYWdlLWRpcmVjdG9yeT4vaXNvbS8qKi8qLnRzXCIgdG8gXCI8cGFja2FnZS1kaXJlY3Rvcnk+L2lzb21cIlxcbiBmb3IgYWxsIEBkciBwYWNrYWdlcy5cXG4nICtcbiAgJ0kgc3VnZ2VzdCB0byBwdXQgTm9kZS5qcyBzaWRlIFRTIGNvZGUgaW4gZGlyZWN0b3J5IGB0c2AsIGFuZCBpc29tb3JwaGljIFRTIGNvZGUgKG1lYW5pbmcgaXQgcnVucyBpbiAnICtcbiAgJ2JvdGggTm9kZS5qcyBhbmQgQnJvd3NlcikgaW4gZGlyZWN0b3J5IGBpc29tYC5cXG4nICtcbiAgaGxEZXNjKCdkcmNwIHRzYyA8cGFja2FnZS4uPlxcbicpICsgJyBPbmx5IGNvbXBpbGUgc3BlY2lmaWMgY29tcG9uZW50cyBieSBwcm92aWRpbmcgcGFja2FnZSBuYW1lIG9yIHNob3J0IG5hbWVcXG4nICtcbiAgaGxEZXNjKCdkcmNwIHRzY1xcbicpICsgJyBDb21waWxlIGFsbCBjb21wb25lbnRzIGJlbG9uZyB0byBhc3NvY2lhdGVkIHByb2plY3RzLCBub3QgaW5jbHVkaW5nIGluc3RhbGxlZCBjb21wb25lbnRzXFxuJyArXG4gIGhsRGVzYygnZHJjcCB0c2MgLS1waiA8cHJvamVjdCBkaXJlY3RvcnksLi4uPlxcbicpICsgJyBDb21waWxlIGNvbXBvbmVudHMgYmVsb25nIHRvIHNwZWNpZmljIHByb2plY3RzXFxuJyArXG4gIGhsRGVzYygnZHJjcCB0c2MgW3BhY2thZ2UuLi5dIC13XFxuJykgKyAnIFdhdGNoIGNvbXBvbmVudHMgY2hhbmdlIGFuZCBjb21waWxlIHdoZW4gbmV3IHR5cGVzY3JpcHQgZmlsZSBpcyBjaGFuZ2VkIG9yIGNyZWF0ZWRcXG5cXG4nKTtcblxuICAvKipcbiAgICogQnVtcCBjb21tYW5kXG4gICAqL1xuICBjb25zdCBidW1wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdidW1wIFtwYWNrYWdlLi4uXScpXG4gICAgLmRlc2NyaXB0aW9uKCdidW1wIHZlcnNpb24gbnVtYmVyIG9mIGFsbCBwYWNrYWdlLmpzb24gZnJvbSBzcGVjaWZpYyBkaXJlY3Rvcmllcywgc2FtZSBhcyBcIm5wbSB2ZXJzaW9uXCIgZG9lcycpXG4gICAgLm9wdGlvbjxzdHJpbmdbXT4oJy0tcGosIC0tcHJvamVjdCA8cHJvamVjdC1kaXIsLi4uPicsICdvbmx5IGJ1bXAgY29tcG9uZW50IHBhY2thZ2VzIGZyb20gc3BlY2lmaWMgcHJvamVjdCBkaXJlY3RvcnknLFxuICAgICAgKHZhbHVlLCBwcmV2KSA9PiB7XG4gICAgICAgIHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7XG4gICAgICB9LCBbXSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNyZS12ZXJzaW9uIDxtYWpvciB8IG1pbm9yIHwgcGF0Y2ggfCBwcmVtYWpvciB8IHByZW1pbm9yIHwgcHJlcGF0Y2ggfCBwcmVyZWxlYXNlPicsXG4gICAgICAndmVyc2lvbiBpbmNyZW1lbnQsIHZhbGlkIHZhbHVlcyBhcmU6IG1ham9yLCBtaW5vciwgcGF0Y2gsIHByZXJlbGVhc2UnLCAncGF0Y2gnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktYnVtcCcpKS5kZWZhdWx0KHsuLi5idW1wQ21kLm9wdHMoKSBhcyB0cC5CdW1wT3B0aW9ucywgcGFja2FnZXN9KTtcbiAgICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoYnVtcENtZCk7XG4gIGJ1bXBDbWQudXNhZ2UoYnVtcENtZC51c2FnZSgpICsgJ1xcbicgKyBobCgnZHJjcCBidW1wIDxkaXItMT4gPGRpci0yPiAuLi4nKSArICcgdG8gcmVjdXJzaXZlbHkgYnVtcCBwYWNrYWdlLmpzb24gZnJvbSBtdWx0aXBsZSBkaXJlY3Rvcmllc1xcbicgK1xuICAgIGhsKCdkcmNwIGJ1bXAgPGRpcj4gLWkgbWlub3InKSArICcgdG8gYnVtcCBtaW5vciB2ZXJzaW9uIG51bWJlciwgZGVmYXVsdCBpcyBwYXRjaCBudW1iZXInKTtcbiAgdHJ5IHtcblxuICAgIGF3YWl0IHByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YpO1xuICB9IGNhdGNoIChlKSB7XG5cbiAgICBjb25zb2xlLmVycm9yKGNoYWxrLnJlZEJyaWdodChlKSwgZS5zdGFjayk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG59XG5sZXQgc2F2ZWQgPSBmYWxzZTtcbnByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCBhc3luYyAoY29kZSkgPT4ge1xuICBpZiAoc2F2ZWQpXG4gICAgcmV0dXJuO1xuICBzYXZlZCA9IHRydWU7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhjaGFsay5ncmVlbignRG9uZS4nKSk7XG4gIChhd2FpdCBpbXBvcnQoJy4uL3N0b3JlJykpLnNhdmVTdGF0ZSgpO1xufSk7XG5cbmZ1bmN0aW9uIGhsKHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gY2hhbGsuZ3JlZW4odGV4dCk7XG59XG5cbmZ1bmN0aW9uIGhsRGVzYyh0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIGNoYWxrLmdyZWVuKHRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbTogY29tbWFuZGVyLkNvbW1hbmQpOiBjb21tYW5kZXIuQ29tbWFuZCB7XG4gIHByb2dyYW0ub3B0aW9uKCctYywgLS1jb25maWcgPGNvbmZpZy1maWxlPicsXG4gICAgaGxEZXNjKCdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyksXG4gICAgKHZhbHVlLCBwcmV2KSA9PiB7IHByZXYucHVzaCguLi52YWx1ZS5zcGxpdCgnLCcpKTsgcmV0dXJuIHByZXY7fSwgW10gYXMgc3RyaW5nW10pXG4gIC5vcHRpb24oJy0tcHJvcCA8cHJvcGVydHktcGF0aD12YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4nLFxuICAgIGhsRGVzYygnPHByb3BlcnR5LXBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmdcXG4gZS5nLlxcbicpICtcbiAgICAnLS1wcm9wIHBvcnQ9ODA4MCAtLXByb3AgZGV2TW9kZT1mYWxzZSAtLXByb3AgQGRyL2Zvb2Jhci5hcGk9aHR0cDovL2xvY2FsaG9zdDo4MDgwXFxuJyArXG4gICAgJy0tcHJvcCBwb3J0PTgwODAgLS1wcm9wIGRldk1vZGU9ZmFsc2UgLS1wcm9wIEBkci9mb29iYXIuYXBpPWh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFxcbicgK1xuICAgICctLXByb3AgYXJyYXlsaWtlLnByb3BbMF09Zm9vYmFyXFxuJyArXG4gICAgJy0tcHJvcCBbXCJAZHIvZm9vLmJhclwiLFwicHJvcFwiLDBdPXRydWUnLFxuICAgIGFycmF5T3B0aW9uRm4sIFtdIGFzIHN0cmluZ1tdKVxuICAub3B0aW9uKCctLWxvZy1zdGF0JywgaGxEZXNjKCdQcmludCBpbnRlcm5hbCBSZWR1eCBzdGF0ZS9hY3Rpb25zIGZvciBkZWJ1ZycpKTtcblxuICByZXR1cm4gcHJvZ3JhbTtcbn1cbiJdfQ==