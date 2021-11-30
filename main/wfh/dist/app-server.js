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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutdownHook$ = exports.exit$ = void 0;
const worker_threads_1 = require("worker_threads");
const commander_1 = __importDefault(require("commander"));
const chalk_1 = __importDefault(require("chalk"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const fork_for_preserve_symlink_1 = require("./fork-for-preserve-symlink");
const override_commander_1 = require("./cmd/override-commander");
const log_config_1 = __importDefault(require("./log-config"));
const index_1 = require("./index");
exports.exit$ = new rx.BehaviorSubject(null);
/** Emitted function will be executed during server shutdown phase */
exports.shutdownHook$ = new rx.ReplaySubject();
const exitDone$ = exports.exit$.pipe(op.filter(action => action === 'done'), op.take(1));
let storeSettingDispatcher;
if (process.send) {
    // current process is forked
    (0, index_1.initAsChildProcess)(true, () => {
        const done = exitDone$.toPromise();
        exports.exit$.next('start');
        return done;
    });
}
else {
    process.on('exit', (code) => {
        // eslint-disable-next-line no-console
        console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
            chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'}`));
    });
    storeSettingDispatcher = (0, index_1.initProcess)(true, () => {
        const done = exitDone$.toPromise();
        exports.exit$.next('start');
        return done;
    });
    storeSettingDispatcher.changeActionOnExit('none');
}
if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
    void (0, fork_for_preserve_symlink_1.forkFile)('@wfh/plink/wfh/dist/app-server.js');
}
else {
    const { version } = require('../../package.json');
    process.title = 'Plink - server';
    let shutdown;
    const program = new commander_1.default.Command()
        .arguments('[args...]')
        .action((args) => {
        // eslint-disable-next-line no-console
        console.log('\nPlink version:', version);
        const setting = (0, index_1.initConfig)(program.opts());
        (0, log_config_1.default)(setting());
        const { runServer } = require('./package-runner');
        shutdown = runServer().shutdown;
        exports.exit$.pipe(op.filter(action => action === 'start'), op.concatMap(() => exports.shutdownHook$.pipe(op.mergeMap(hook => {
            const result = hook();
            return result || rx.EMPTY;
        }))), op.concatMap(() => shutdown()), op.tap(() => {
            exports.exit$.next('done');
            exports.exit$.complete();
        })).subscribe();
    });
    (0, override_commander_1.withGlobalOptions)(program);
    program.parseAsync(process.argv)
        .catch((e) => {
        console.error(e, e.stack);
        process.exit(1);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFzRDtBQUN0RCwwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsMkVBQXFEO0FBQ3JELGlFQUEyRDtBQUMzRCw4REFBcUM7QUFFckMsbUNBQW9FO0FBRXZELFFBQUEsS0FBSyxHQUFHLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBMEIsSUFBSSxDQUFDLENBQUM7QUFDM0UscUVBQXFFO0FBQ3hELFFBQUEsYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBMEMsQ0FBQztBQUU1RixNQUFNLFNBQVMsR0FBRyxhQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRWpGLElBQUksc0JBQWtFLENBQUM7QUFDdkUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO0lBQ2hCLDRCQUE0QjtJQUM1QixJQUFBLDBCQUFrQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25DLGFBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztDQUNKO0tBQU07SUFDTCxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLDZCQUFZ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QztRQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2lzTWFpblRocmVhZCwgdGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Zm9ya0ZpbGV9IGZyb20gJy4vZm9yay1mb3ItcHJlc2VydmUtc3ltbGluayc7XG5pbXBvcnQge3dpdGhHbG9iYWxPcHRpb25zfSBmcm9tICcuL2NtZC9vdmVycmlkZS1jb21tYW5kZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuL2xvZy1jb25maWcnO1xuaW1wb3J0ICogYXMgX3J1bm5lciBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCB7aW5pdENvbmZpZywgaW5pdFByb2Nlc3MsIGluaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnLi9pbmRleCc7XG5cbmV4cG9ydCBjb25zdCBleGl0JCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8bnVsbCB8ICdzdGFydCcgfCAnZG9uZSc+KG51bGwpO1xuLyoqIEVtaXR0ZWQgZnVuY3Rpb24gd2lsbCBiZSBleGVjdXRlZCBkdXJpbmcgc2VydmVyIHNodXRkb3duIHBoYXNlICovXG5leHBvcnQgY29uc3Qgc2h1dGRvd25Ib29rJCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PCgpID0+IChyeC5PYnNlcnZhYmxlSW5wdXQ8YW55PiB8IHZvaWQpPigpO1xuXG5jb25zdCBleGl0RG9uZSQgPSBleGl0JC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uID09PSAnZG9uZScpLCBvcC50YWtlKDEpKTtcblxubGV0IHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXI6IFJldHVyblR5cGU8dHlwZW9mIGluaXRQcm9jZXNzPiB8IHVuZGVmaW5lZDtcbmlmIChwcm9jZXNzLnNlbmQpIHtcbiAgLy8gY3VycmVudCBwcm9jZXNzIGlzIGZvcmtlZFxuICBpbml0QXNDaGlsZFByb2Nlc3ModHJ1ZSwgKCkgPT4ge1xuICAgIGNvbnN0IGRvbmUgPSBleGl0RG9uZSQudG9Qcm9taXNlKCk7XG4gICAgZXhpdCQubmV4dCgnc3RhcnQnKTtcbiAgICByZXR1cm4gZG9uZTtcbiAgfSk7XG59IGVsc2Uge1xuICBwcm9jZXNzLm9uKCdleGl0JywgKGNvZGUpID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKChwcm9jZXNzLnNlbmQgfHwgIWlzTWFpblRocmVhZCA/IGBbUCR7cHJvY2Vzcy5waWR9LlQke3RocmVhZElkfV0gYCA6ICcnKSArXG4gICAgICBjaGFsay5ncmVlbihgJHtjb2RlICE9PSAwID8gJ0ZhaWxlZCcgOiAnRG9uZSd9YCkpO1xuICB9KTtcbiAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlciA9IGluaXRQcm9jZXNzKHRydWUsICgpID0+IHtcbiAgICBjb25zdCBkb25lID0gZXhpdERvbmUkLnRvUHJvbWlzZSgpO1xuICAgIGV4aXQkLm5leHQoJ3N0YXJ0Jyk7XG4gICAgcmV0dXJuIGRvbmU7XG4gIH0pO1xuICBzdG9yZVNldHRpbmdEaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnbm9uZScpO1xufVxuXG5pZiAoKHByb2Nlc3MuZW52Lk5PREVfUFJFU0VSVkVfU1lNTElOS1MgIT09ICcxJyAmJiBwcm9jZXNzLmV4ZWNBcmd2LmluZGV4T2YoJy0tcHJlc2VydmUtc3ltbGlua3MnKSA8IDApKSB7XG4gIHZvaWQgZm9ya0ZpbGUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvYXBwLXNlcnZlci5qcycpO1xufSBlbHNlIHtcbiAgY29uc3Qge3ZlcnNpb259ID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG5cbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayAtIHNlcnZlcic7XG5cbiAgbGV0IHNodXRkb3duOiAoKSA9PiBQcm9taXNlPGFueT47XG5cbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgpXG4gIC5hcmd1bWVudHMoJ1thcmdzLi4uXScpXG4gIC5hY3Rpb24oKGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnXFxuUGxpbmsgdmVyc2lvbjonLCB2ZXJzaW9uKTtcbiAgICBjb25zdCBzZXR0aW5nID0gaW5pdENvbmZpZyhwcm9ncmFtLm9wdHMoKSk7XG4gICAgbG9nQ29uZmlnKHNldHRpbmcoKSk7XG4gICAgY29uc3Qge3J1blNlcnZlcn0gPSByZXF1aXJlKCcuL3BhY2thZ2UtcnVubmVyJykgYXMgdHlwZW9mIF9ydW5uZXI7XG4gICAgc2h1dGRvd24gPSBydW5TZXJ2ZXIoKS5zaHV0ZG93bjtcblxuICAgIGV4aXQkLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbiA9PT0gJ3N0YXJ0JyksXG4gICAgICBvcC5jb25jYXRNYXAoKCkgPT4gc2h1dGRvd25Ib29rJC5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChob29rID0+IHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBob29rKCk7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCByeC5FTVBUWTtcbiAgICAgICAgfSlcbiAgICAgICkpLFxuICAgICAgb3AuY29uY2F0TWFwKCgpID0+IHNodXRkb3duKCkpLFxuICAgICAgb3AudGFwKCgpID0+IHtcbiAgICAgICAgZXhpdCQubmV4dCgnZG9uZScpO1xuICAgICAgICBleGl0JC5jb21wbGV0ZSgpO1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9KTtcblxuICB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtKTtcblxuICBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuICAuY2F0Y2goKGU6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH0pO1xufVxuXG4iXX0=