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
        }), op.catchError(err => {
            console.error('Failed to execute shutdown hooks', err);
            return rx.EMPTY;
        }), op.count(), op.concatMap(async () => {
            await shutdown();
            exports.exit$.next('done');
            exports.exit$.complete();
            // eslint-disable-next-line no-console
            console.log('Packages are deactivated');
        })).subscribe();
    });
    (0, override_commander_1.withGlobalOptions)(program);
    program.parseAsync(process.argv)
        .catch((e) => {
        console.error(e, e.stack);
        process.exit(1);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQUFzRDtBQUN0RCwwREFBa0M7QUFDbEMsa0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsMkVBQXFEO0FBQ3JELGlFQUEyRDtBQUMzRCw4REFBcUM7QUFFckMsbUNBQW9FO0FBRXZELFFBQUEsS0FBSyxHQUFHLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBMEIsSUFBSSxDQUFDLENBQUM7QUFDM0UscUVBQXFFO0FBQ3hELFFBQUEsYUFBYSxHQUErQyxFQUFFLENBQUM7QUFFNUUsbUZBQW1GO0FBQ25GLDJCQUEyQjtBQUMzQixNQUFNLFNBQVMsR0FBRyxhQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRWpGLElBQUksc0JBQWtFLENBQUM7QUFDdkUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO0lBQ2hCLDRCQUE0QjtJQUM1QixJQUFBLDBCQUFrQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25DLGFBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztDQUNKO0tBQU07SUFDTCxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFD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QixDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsc0NBQWlCLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFFM0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQy9CLEtBQUssQ0FBQyxDQUFDLENBQVEsRUFBRSxFQUFFO1FBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2lzTWFpblRocmVhZCwgdGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Zm9ya0ZpbGV9IGZyb20gJy4vZm9yay1mb3ItcHJlc2VydmUtc3ltbGluayc7XG5pbXBvcnQge3dpdGhHbG9iYWxPcHRpb25zfSBmcm9tICcuL2NtZC9vdmVycmlkZS1jb21tYW5kZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuL2xvZy1jb25maWcnO1xuaW1wb3J0ICogYXMgX3J1bm5lciBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCB7aW5pdENvbmZpZywgaW5pdFByb2Nlc3MsIGluaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnLi9pbmRleCc7XG5cbmV4cG9ydCBjb25zdCBleGl0JCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8bnVsbCB8ICdzdGFydCcgfCAnZG9uZSc+KG51bGwpO1xuLyoqIEVtaXR0ZWQgZnVuY3Rpb24gd2lsbCBiZSBleGVjdXRlZCBkdXJpbmcgc2VydmVyIHNodXRkb3duIHBoYXNlICovXG5leHBvcnQgY29uc3Qgc2h1dGRvd25Ib29rczogKCgpID0+IChyeC5PYnNlcnZhYmxlSW5wdXQ8YW55PiB8IHZvaWQpKVtdID0gW107XG5cbi8vIFN1YnNjcmliZSB0byBcImRvbmVcIiBldmVudCBmb3IgYmVpbmcgbm90aWZpZWQgd2hlbiBhcHAgc2VydmVyIGlzIHNodXRkb3duIGFuZCBhbGxcbi8vIGhvb2tzIGFyZSBkb25lIGV4ZWN1dGlvblxuY29uc3QgZXhpdERvbmUkID0gZXhpdCQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbiA9PT0gJ2RvbmUnKSwgb3AudGFrZSgxKSk7XG5cbmxldCBzdG9yZVNldHRpbmdEaXNwYXRjaGVyOiBSZXR1cm5UeXBlPHR5cGVvZiBpbml0UHJvY2Vzcz4gfCB1bmRlZmluZWQ7XG5pZiAocHJvY2Vzcy5zZW5kKSB7XG4gIC8vIGN1cnJlbnQgcHJvY2VzcyBpcyBmb3JrZWRcbiAgaW5pdEFzQ2hpbGRQcm9jZXNzKHRydWUsICgpID0+IHtcbiAgICBjb25zdCBkb25lID0gZXhpdERvbmUkLnRvUHJvbWlzZSgpO1xuICAgIGV4aXQkLm5leHQoJ3N0YXJ0Jyk7XG4gICAgcmV0dXJuIGRvbmU7XG4gIH0pO1xufSBlbHNlIHtcbiAgcHJvY2Vzcy5vbignZXhpdCcsIChjb2RlKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygocHJvY2Vzcy5zZW5kIHx8ICFpc01haW5UaHJlYWQgPyBgW1Ake3Byb2Nlc3MucGlkfS5UJHt0aHJlYWRJZH1dIGAgOiAnJykgK1xuICAgICAgY2hhbGsuZ3JlZW4oYCR7Y29kZSAhPT0gMCA/ICdBcHAgc2VydmVyIHN0b3BwZWQgd2l0aCBmYWlsdXJlcycgOiAnQXBwIHNlcnZlciBpcyBzaHV0ZG93bid9YCkpO1xuICB9KTtcbiAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlciA9IGluaXRQcm9jZXNzKHRydWUsICgpID0+IHtcbiAgICBjb25zdCBkb25lID0gZXhpdERvbmUkLnRvUHJvbWlzZSgpO1xuICAgIGV4aXQkLm5leHQoJ3N0YXJ0Jyk7XG4gICAgcmV0dXJuIGRvbmU7XG4gIH0pO1xuICBzdG9yZVNldHRpbmdEaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnbm9uZScpO1xufVxuXG5pZiAoKHByb2Nlc3MuZW52Lk5PREVfUFJFU0VSVkVfU1lNTElOS1MgIT09ICcxJyAmJiBwcm9jZXNzLmV4ZWNBcmd2LmluZGV4T2YoJy0tcHJlc2VydmUtc3ltbGlua3MnKSA8IDApKSB7XG4gIHZvaWQgZm9ya0ZpbGUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvYXBwLXNlcnZlci5qcycpO1xufSBlbHNlIHtcbiAgY29uc3Qge3ZlcnNpb259ID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG5cbiAgcHJvY2Vzcy50aXRsZSA9ICdQbGluayAtIHNlcnZlcic7XG5cbiAgbGV0IHNodXRkb3duOiAoKSA9PiBQcm9taXNlPGFueT47XG5cbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBjb21tYW5kZXIuQ29tbWFuZCgpXG4gIC5hcmd1bWVudHMoJ1thcmdzLi4uXScpXG4gIC5hY3Rpb24oKGFyZ3M6IHN0cmluZ1tdKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnXFxuUGxpbmsgdmVyc2lvbjonLCB2ZXJzaW9uKTtcbiAgICBjb25zdCBzZXR0aW5nID0gaW5pdENvbmZpZyhwcm9ncmFtLm9wdHMoKSk7XG4gICAgbG9nQ29uZmlnKHNldHRpbmcoKSk7XG4gICAgY29uc3Qge3J1blNlcnZlcn0gPSByZXF1aXJlKCcuL3BhY2thZ2UtcnVubmVyJykgYXMgdHlwZW9mIF9ydW5uZXI7XG4gICAgc2h1dGRvd24gPSBydW5TZXJ2ZXIoKS5zaHV0ZG93bjtcblxuICAgIGV4aXQkLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbiA9PT0gJ3N0YXJ0JyksXG4gICAgICBvcC50YWtlKDEpLFxuICAgICAgb3AuY29uY2F0TWFwKCgpID0+IHJ4LmZyb20oc2h1dGRvd25Ib29rcykpLFxuICAgICAgb3AubWVyZ2VNYXAoaG9va0ZuID0+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gaG9va0ZuKCk7XG4gICAgICAgIHJldHVybiByZXN1bHQgfHwgcnguRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGV4ZWN1dGUgc2h1dGRvd24gaG9va3MnLCBlcnIpO1xuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9KSxcbiAgICAgIG9wLmNvdW50KCksXG4gICAgICBvcC5jb25jYXRNYXAoYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCBzaHV0ZG93bigpO1xuICAgICAgICBleGl0JC5uZXh0KCdkb25lJyk7XG4gICAgICAgIGV4aXQkLmNvbXBsZXRlKCk7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdQYWNrYWdlcyBhcmUgZGVhY3RpdmF0ZWQnKTtcbiAgICAgIH0pXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfSk7XG5cbiAgd2l0aEdsb2JhbE9wdGlvbnMocHJvZ3JhbSk7XG5cbiAgcHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndilcbiAgLmNhdGNoKChlOiBFcnJvcikgPT4ge1xuICAgIGNvbnNvbGUuZXJyb3IoZSwgZS5zdGFjayk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9KTtcbn1cblxuIl19