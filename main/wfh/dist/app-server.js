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
exports.shutdownHooks = exports.exit$ = void 0;
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
exports.shutdownHooks = [];
// Subscribe to "done" event for being notified when app server is shutdown and all
// hooks are done execution
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
            chalk_1.default.green(`${code !== 0 ? 'App server stopped with failures' : 'App server is shutdown'}`));
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
        exports.exit$.pipe(op.filter(action => action === 'start'), op.take(1), op.concatMap(() => rx.from(exports.shutdownHooks)), op.mergeMap(hookFn => {
            const result = hookFn();
            return result || rx.EMPTY;
        }), op.finalize(() => {
            void shutdown().then(() => {
                exports.exit$.next('done');
                exports.exit$.complete();
                // eslint-disable-next-line no-console
                console.log('Packages are deactivated');
            });
        })).subscribe();
    });
    (0, override_commander_1.withGlobalOptions)(program);
    program.parseAsync(process.argv)
        .catch((e) => {
        console.error(e, e.stack);
        process.exit(1);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFzRDtBQUN0RCwwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsMkVBQXFEO0FBQ3JELGlFQUEyRDtBQUMzRCw4REFBcUM7QUFFckMsbUNBQW9FO0FBRXZELFFBQUEsS0FBSyxHQUFHLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBMEIsSUFBSSxDQUFDLENBQUM7QUFDM0UscUVBQXFFO0FBQ3hELFFBQUEsYUFBYSxHQUErQyxFQUFFLENBQUM7QUFFNUUsbUZBQW1GO0FBQ25GLDJCQUEyQjtBQUMzQixNQUFNLFNBQVMsR0FBRyxhQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRWpGLElBQUksc0JBQWtFLENBQUM7QUFDdkUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO0lBQ2hCLDRCQUE0QjtJQUM1QixJQUFBLDBCQUFrQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25DLGFBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztDQUNKO0tBQU07SUFDTCxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFD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VUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDL0IsS0FBSyxDQUFDLENBQUMsQ0FBUSxFQUFFLEVBQUU7UUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7aXNNYWluVGhyZWFkLCB0aHJlYWRJZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtmb3JrRmlsZX0gZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcbmltcG9ydCB7d2l0aEdsb2JhbE9wdGlvbnN9IGZyb20gJy4vY21kL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgKiBhcyBfcnVubmVyIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IHtpbml0Q29uZmlnLCBpbml0UHJvY2VzcywgaW5pdEFzQ2hpbGRQcm9jZXNzfSBmcm9tICcuL2luZGV4JztcblxuZXhwb3J0IGNvbnN0IGV4aXQkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxudWxsIHwgJ3N0YXJ0JyB8ICdkb25lJz4obnVsbCk7XG4vKiogRW1pdHRlZCBmdW5jdGlvbiB3aWxsIGJlIGV4ZWN1dGVkIGR1cmluZyBzZXJ2ZXIgc2h1dGRvd24gcGhhc2UgKi9cbmV4cG9ydCBjb25zdCBzaHV0ZG93bkhvb2tzOiAoKCkgPT4gKHJ4Lk9ic2VydmFibGVJbnB1dDxhbnk+IHwgdm9pZCkpW10gPSBbXTtcblxuLy8gU3Vic2NyaWJlIHRvIFwiZG9uZVwiIGV2ZW50IGZvciBiZWluZyBub3RpZmllZCB3aGVuIGFwcCBzZXJ2ZXIgaXMgc2h1dGRvd24gYW5kIGFsbFxuLy8gaG9va3MgYXJlIGRvbmUgZXhlY3V0aW9uXG5jb25zdCBleGl0RG9uZSQgPSBleGl0JC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uID09PSAnZG9uZScpLCBvcC50YWtlKDEpKTtcblxubGV0IHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXI6IFJldHVyblR5cGU8dHlwZW9mIGluaXRQcm9jZXNzPiB8IHVuZGVmaW5lZDtcbmlmIChwcm9jZXNzLnNlbmQpIHtcbiAgLy8gY3VycmVudCBwcm9jZXNzIGlzIGZvcmtlZFxuICBpbml0QXNDaGlsZFByb2Nlc3ModHJ1ZSwgKCkgPT4ge1xuICAgIGNvbnN0IGRvbmUgPSBleGl0RG9uZSQudG9Qcm9taXNlKCk7XG4gICAgZXhpdCQubmV4dCgnc3RhcnQnKTtcbiAgICByZXR1cm4gZG9uZTtcbiAgfSk7XG59IGVsc2Uge1xuICBwcm9jZXNzLm9uKCdleGl0JywgKGNvZGUpID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKChwcm9jZXNzLnNlbmQgfHwgIWlzTWFpblRocmVhZCA/IGBbUCR7cHJvY2Vzcy5waWR9LlQke3RocmVhZElkfV0gYCA6ICcnKSArXG4gICAgICBjaGFsay5ncmVlbihgJHtjb2RlICE9PSAwID8gJ0FwcCBzZXJ2ZXIgc3RvcHBlZCB3aXRoIGZhaWx1cmVzJyA6ICdBcHAgc2VydmVyIGlzIHNodXRkb3duJ31gKSk7XG4gIH0pO1xuICBzdG9yZVNldHRpbmdEaXNwYXRjaGVyID0gaW5pdFByb2Nlc3ModHJ1ZSwgKCkgPT4ge1xuICAgIGNvbnN0IGRvbmUgPSBleGl0RG9uZSQudG9Qcm9taXNlKCk7XG4gICAgZXhpdCQubmV4dCgnc3RhcnQnKTtcbiAgICByZXR1cm4gZG9uZTtcbiAgfSk7XG4gIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdub25lJyk7XG59XG5cbmlmICgocHJvY2Vzcy5lbnYuTk9ERV9QUkVTRVJWRV9TWU1MSU5LUyAhPT0gJzEnICYmIHByb2Nlc3MuZXhlY0FyZ3YuaW5kZXhPZignLS1wcmVzZXJ2ZS1zeW1saW5rcycpIDwgMCkpIHtcbiAgdm9pZCBmb3JrRmlsZSgnQHdmaC9wbGluay93ZmgvZGlzdC9hcHAtc2VydmVyLmpzJyk7XG59IGVsc2Uge1xuICBjb25zdCB7dmVyc2lvbn0gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcblxuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rIC0gc2VydmVyJztcblxuICBsZXQgc2h1dGRvd246ICgpID0+IFByb21pc2U8YW55PjtcblxuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbiAgLmFyZ3VtZW50cygnW2FyZ3MuLi5dJylcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG5QbGluayB2ZXJzaW9uOicsIHZlcnNpb24pO1xuICAgIGNvbnN0IHNldHRpbmcgPSBpbml0Q29uZmlnKHByb2dyYW0ub3B0cygpKTtcbiAgICBsb2dDb25maWcoc2V0dGluZygpKTtcbiAgICBjb25zdCB7cnVuU2VydmVyfSA9IHJlcXVpcmUoJy4vcGFja2FnZS1ydW5uZXInKSBhcyB0eXBlb2YgX3J1bm5lcjtcbiAgICBzaHV0ZG93biA9IHJ1blNlcnZlcigpLnNodXRkb3duO1xuXG4gICAgZXhpdCQucGlwZShcbiAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uID09PSAnc3RhcnQnKSxcbiAgICAgIG9wLnRha2UoMSksXG4gICAgICBvcC5jb25jYXRNYXAoKCkgPT4gcnguZnJvbShzaHV0ZG93bkhvb2tzKSksXG4gICAgICBvcC5tZXJnZU1hcChob29rRm4gPT4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBob29rRm4oKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCByeC5FTVBUWTtcbiAgICAgIH0pLFxuICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICB2b2lkIHNodXRkb3duKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgZXhpdCQubmV4dCgnZG9uZScpO1xuICAgICAgICAgIGV4aXQkLmNvbXBsZXRlKCk7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnUGFja2FnZXMgYXJlIGRlYWN0aXZhdGVkJyk7XG4gICAgICAgIH0pO1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9KTtcblxuICB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtKTtcblxuICBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuICAuY2F0Y2goKGU6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH0pO1xufVxuXG4iXX0=