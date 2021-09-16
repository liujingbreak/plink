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
const commander_1 = __importDefault(require("commander"));
const index_1 = require("./index");
const log_config_1 = __importDefault(require("./log-config"));
const override_commander_1 = require("./cmd/override-commander");
const fork_for_preserve_symlink_1 = require("./fork-for-preserve-symlink");
const worker_threads_1 = require("worker_threads");
const chalk_1 = __importDefault(require("chalk"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const exit$ = new rx.BehaviorSubject(null);
const exitDone$ = exit$.pipe(op.filter(action => action === 'done'), op.take(1));
let storeSettingDispatcher;
if (process.send) {
    // current process is forked
    (0, index_1.initAsChildProcess)(true, () => {
        const done = exitDone$.toPromise();
        exit$.next('start');
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
        exit$.next('start');
        return done;
    });
}
if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
    if (storeSettingDispatcher)
        storeSettingDispatcher.changeActionOnExit('none');
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
        exit$.pipe(op.filter(action => action === 'start'), op.concatMap(() => shutdown()), op.tap(() => {
            exit$.next('done');
            exit$.complete();
        })).subscribe();
    });
    (0, override_commander_1.withGlobalOptions)(program);
    program.parseAsync(process.argv)
        .catch((e) => {
        console.error(e, e.stack);
        process.exit(1);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMERBQWtDO0FBQ2xDLG1DQUFtRjtBQUVuRiw4REFBcUM7QUFDckMsaUVBQTJEO0FBQzNELDJFQUFxRDtBQUNyRCxtREFBc0Q7QUFDdEQsa0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFFckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUEwQixJQUFJLENBQUMsQ0FBQztBQUNwRSxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRWpGLElBQUksc0JBQWtFLENBQUM7QUFDdkUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO0lBQ2hCLDRCQUE0QjtJQUM1QixJQUFBLDBCQUFrQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25DLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztDQUNKO0tBQU07SUFDTCxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLDZCQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxDQUFDLEdBQUcsS0FBSyx5QkFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsRixlQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQyxDQUFDLENBQUM7SUFDSCxzQkFBc0IsR0FBRyxJQUFBLG1CQUFXLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtRQUM5QyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDbkMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQyxDQUFDO0NBQ0o7QUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtJQUN2RyxJQUFJLHNCQUFzQjtRQUN4QixzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwRCxLQUFLLElBQUEsb0NBQVEsRUFBQyxtQ0FBbUMsQ0FBQyxDQUFDO0NBQ3BEO0tBQU07SUFDTCxNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFzQixDQUFDO0lBRXJFLE9BQU8sQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUM7SUFFakMsSUFBSSxRQUE0QixDQUFDO0lBRWpDLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxPQUFPLEVBQUU7U0FDdEMsU0FBUyxDQUFDLFdBQVcsQ0FBQztTQUN0QixNQUFNLENBQUMsQ0FBQyxJQUFjLEVBQUUsRUFBRTtRQUN6QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFBLGtCQUFVLEVBQUMsT0FBTyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDO1FBQzVELElBQUEsb0JBQVMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sRUFBQyxTQUFTLEVBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQW1CLENBQUM7UUFDbEUsUUFBUSxHQUFHLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztRQUVoQyxLQUFLLENBQUMsSUFBSSxDQUNSLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLEVBQ3ZDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDOUIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDVixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25CLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxzQ0FBaUIsRUFBQyxPQUFPLENBQUMsQ0FBQztJQUUzQixPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDL0IsS0FBSyxDQUFDLENBQUMsQ0FBUSxFQUFFLEVBQUU7UUFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZywgaW5pdFByb2Nlc3MsIGluaXRBc0NoaWxkUHJvY2Vzc30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgKiBhcyBfcnVubmVyIGZyb20gJy4vcGFja2FnZS1ydW5uZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuL2xvZy1jb25maWcnO1xuaW1wb3J0IHt3aXRoR2xvYmFsT3B0aW9uc30gZnJvbSAnLi9jbWQvb3ZlcnJpZGUtY29tbWFuZGVyJztcbmltcG9ydCB7Zm9ya0ZpbGV9IGZyb20gJy4vZm9yay1mb3ItcHJlc2VydmUtc3ltbGluayc7XG5pbXBvcnQge2lzTWFpblRocmVhZCwgdGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuY29uc3QgZXhpdCQgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PG51bGwgfCAnc3RhcnQnIHwgJ2RvbmUnPihudWxsKTtcbmNvbnN0IGV4aXREb25lJCA9IGV4aXQkLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24gPT09ICdkb25lJyksIG9wLnRha2UoMSkpO1xuXG5sZXQgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlcjogUmV0dXJuVHlwZTx0eXBlb2YgaW5pdFByb2Nlc3M+IHwgdW5kZWZpbmVkO1xuaWYgKHByb2Nlc3Muc2VuZCkge1xuICAvLyBjdXJyZW50IHByb2Nlc3MgaXMgZm9ya2VkXG4gIGluaXRBc0NoaWxkUHJvY2Vzcyh0cnVlLCAoKSA9PiB7XG4gICAgY29uc3QgZG9uZSA9IGV4aXREb25lJC50b1Byb21pc2UoKTtcbiAgICBleGl0JC5uZXh0KCdzdGFydCcpO1xuICAgIHJldHVybiBkb25lO1xuICB9KTtcbn0gZWxzZSB7XG4gIHByb2Nlc3Mub24oJ2V4aXQnLCAoY29kZSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkID8gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgIDogJycpICtcbiAgICAgIGNoYWxrLmdyZWVuKGAke2NvZGUgIT09IDAgPyAnRmFpbGVkJyA6ICdEb25lJ31gKSk7XG4gIH0pO1xuICBzdG9yZVNldHRpbmdEaXNwYXRjaGVyID0gaW5pdFByb2Nlc3ModHJ1ZSwgKCkgPT4ge1xuICAgIGNvbnN0IGRvbmUgPSBleGl0RG9uZSQudG9Qcm9taXNlKCk7XG4gICAgZXhpdCQubmV4dCgnc3RhcnQnKTtcbiAgICByZXR1cm4gZG9uZTtcbiAgfSk7XG59XG5cbmlmICgocHJvY2Vzcy5lbnYuTk9ERV9QUkVTRVJWRV9TWU1MSU5LUyAhPT0gJzEnICYmIHByb2Nlc3MuZXhlY0FyZ3YuaW5kZXhPZignLS1wcmVzZXJ2ZS1zeW1saW5rcycpIDwgMCkpIHtcbiAgaWYgKHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIpXG4gICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ25vbmUnKTtcbiAgdm9pZCBmb3JrRmlsZSgnQHdmaC9wbGluay93ZmgvZGlzdC9hcHAtc2VydmVyLmpzJyk7XG59IGVsc2Uge1xuICBjb25zdCB7dmVyc2lvbn0gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcblxuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rIC0gc2VydmVyJztcblxuICBsZXQgc2h1dGRvd246ICgpID0+IFByb21pc2U8YW55PjtcblxuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbiAgLmFyZ3VtZW50cygnW2FyZ3MuLi5dJylcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG5QbGluayB2ZXJzaW9uOicsIHZlcnNpb24pO1xuICAgIGNvbnN0IHNldHRpbmcgPSBpbml0Q29uZmlnKHByb2dyYW0ub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgIGxvZ0NvbmZpZyhzZXR0aW5nKCkpO1xuICAgIGNvbnN0IHtydW5TZXJ2ZXJ9ID0gcmVxdWlyZSgnLi9wYWNrYWdlLXJ1bm5lcicpIGFzIHR5cGVvZiBfcnVubmVyO1xuICAgIHNodXRkb3duID0gcnVuU2VydmVyKCkuc2h1dGRvd247XG5cbiAgICBleGl0JC5waXBlKFxuICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24gPT09ICdzdGFydCcpLFxuICAgICAgb3AuY29uY2F0TWFwKCgpID0+IHNodXRkb3duKCkpLFxuICAgICAgb3AudGFwKCgpID0+IHtcbiAgICAgICAgZXhpdCQubmV4dCgnZG9uZScpO1xuICAgICAgICBleGl0JC5jb21wbGV0ZSgpO1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9KTtcblxuICB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtKTtcblxuICBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuICAuY2F0Y2goKGU6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH0pO1xufVxuXG4iXX0=