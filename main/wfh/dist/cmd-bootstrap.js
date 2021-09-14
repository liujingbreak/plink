#!/usr/bin/env node
"use strict";
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
/* eslint-disable no-console */
require("./node-path");
// import checkNode from './utils/node-version-check';
const chalk_1 = __importDefault(require("chalk"));
const bootstrap_process_1 = require("./utils/bootstrap-process");
const fork_for_preserve_symlink_1 = require("./fork-for-preserve-symlink");
const worker_threads_1 = require("worker_threads");
const startTime = new Date().getTime();
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let storeSettingDispatcher;
        if (process.send) {
            // current process is forked
            (0, bootstrap_process_1.initAsChildProcess)(true);
        }
        else {
            process.on('exit', (code) => {
                // eslint-disable-next-line no-console
                console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
                    chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
            });
            storeSettingDispatcher = (0, bootstrap_process_1.initProcess)();
        }
        if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
            if (storeSettingDispatcher)
                storeSettingDispatcher.changeActionOnExit('none');
            void (0, fork_for_preserve_symlink_1.forkFile)('@wfh/plink/wfh/dist/cmd-bootstrap');
            return;
        }
        yield new Promise(resolve => process.nextTick(resolve));
        return require('./cmd/cli').createCommands(startTime);
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLHVCQUFxQjtBQUNyQixzREFBc0Q7QUFDdEQsa0RBQTBCO0FBQzFCLGlFQUEwRTtBQUUxRSwyRUFBcUQ7QUFDckQsbURBQXNEO0FBRXRELE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7QUFFdkMsQ0FBQyxTQUFlLEdBQUc7O1FBRWpCLElBQUksc0JBQWtFLENBQUM7UUFDdkUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hCLDRCQUE0QjtZQUM1QixJQUFBLHNDQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO1NBQzFCO2FBQU07WUFDTCxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUMxQixzQ0FBc0M7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsNkJBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsR0FBRyxLQUFLLHlCQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsRixlQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDaEcsQ0FBQyxDQUFDLENBQUM7WUFDSCxzQkFBc0IsR0FBRyxJQUFBLCtCQUFXLEdBQUUsQ0FBQztTQUN4QztRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixLQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ3ZHLElBQUksc0JBQXNCO2dCQUN4QixzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwRCxLQUFLLElBQUEsb0NBQVEsRUFBQyxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ25ELE9BQU87U0FDUjtRQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFeEQsT0FBUSxPQUFPLENBQUMsV0FBVyxDQUFpQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6RSxDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICcuL25vZGUtcGF0aCc7XG4vLyBpbXBvcnQgY2hlY2tOb2RlIGZyb20gJy4vdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2luaXRQcm9jZXNzLCBpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0ICogYXMgX2NsaSBmcm9tICcuL2NtZC9jbGknO1xuaW1wb3J0IHtmb3JrRmlsZX0gZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcbmltcG9ydCB7aXNNYWluVGhyZWFkLCB0aHJlYWRJZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuXG5jb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuKGFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcblxuICBsZXQgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlcjogUmV0dXJuVHlwZTx0eXBlb2YgaW5pdFByb2Nlc3M+IHwgdW5kZWZpbmVkO1xuICBpZiAocHJvY2Vzcy5zZW5kKSB7XG4gICAgLy8gY3VycmVudCBwcm9jZXNzIGlzIGZvcmtlZFxuICAgIGluaXRBc0NoaWxkUHJvY2Vzcyh0cnVlKTtcbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLm9uKCdleGl0JywgKGNvZGUpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygocHJvY2Vzcy5zZW5kIHx8ICFpc01haW5UaHJlYWQgPyBgW1Ake3Byb2Nlc3MucGlkfS5UJHt0aHJlYWRJZH1dIGAgOiAnJykgK1xuICAgICAgICBjaGFsay5ncmVlbihgJHtjb2RlICE9PSAwID8gJ0ZhaWxlZCcgOiAnRG9uZSd9IGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWV9IG1zYCkpO1xuICAgIH0pO1xuICAgIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIgPSBpbml0UHJvY2VzcygpO1xuICB9XG4gIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9QUkVTRVJWRV9TWU1MSU5LUyAhPT0gJzEnICYmIHByb2Nlc3MuZXhlY0FyZ3YuaW5kZXhPZignLS1wcmVzZXJ2ZS1zeW1saW5rcycpIDwgMCkpIHtcbiAgICBpZiAoc3RvcmVTZXR0aW5nRGlzcGF0Y2hlcilcbiAgICAgIHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdub25lJyk7XG4gICAgdm9pZCBmb3JrRmlsZSgnQHdmaC9wbGluay93ZmgvZGlzdC9jbWQtYm9vdHN0cmFwJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcHJvY2Vzcy5uZXh0VGljayhyZXNvbHZlKSk7XG5cbiAgcmV0dXJuIChyZXF1aXJlKCcuL2NtZC9jbGknKSBhcyB0eXBlb2YgX2NsaSkuY3JlYXRlQ29tbWFuZHMoc3RhcnRUaW1lKTtcbn0pKCkuY2F0Y2goZXJyID0+IHtcbiAgY29uc29sZS5sb2coZXJyKTtcbiAgcHJvY2Vzcy5leGl0KDEpO1xufSk7XG4iXX0=