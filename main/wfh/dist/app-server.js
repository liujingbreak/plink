"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const index_1 = require("./index");
const log_config_1 = __importDefault(require("./log-config"));
const override_commander_1 = require("./cmd/override-commander");
const fork_for_preserve_symlink_1 = require("./fork-for-preserve-symlink");
if (process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0) {
    (0, fork_for_preserve_symlink_1.forkFile)('@wfh/plink/wfh/dist/app-server.js');
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
        // await started;
    });
    if (process.send) {
        // current process is forked
        (0, index_1.initAsChildProcess)(true, () => shutdown());
    }
    else {
        (0, index_1.initProcess)(() => {
            return shutdown();
        });
    }
    (0, override_commander_1.withGlobalOptions)(program);
    program.parseAsync(process.argv)
        .catch((e) => {
        console.error(e, e.stack);
        process.exit(1);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQW1GO0FBRW5GLDhEQUFxQztBQUNyQyxpRUFBMkQ7QUFDM0QsMkVBQXFEO0FBRXJELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDckcsSUFBQSxvQ0FBUSxFQUFDLG1DQUFtQyxDQUFDLENBQUM7Q0FDL0M7S0FBTTtJQUNMLE1BQU0sRUFBQyxPQUFPLEVBQUMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQXNCLENBQUM7SUFFckUsT0FBTyxDQUFDLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQztJQUVqQyxJQUFJLFFBQTRCLENBQUM7SUFFakMsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQkFBUyxDQUFDLE9BQU8sRUFBRTtTQUN0QyxTQUFTLENBQUMsV0FBVyxDQUFDO1NBQ3RCLE1BQU0sQ0FBQyxDQUFDLElBQWMsRUFBRSxFQUFFO1FBQ3pCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sT0FBTyxHQUFHLElBQUEsa0JBQVUsRUFBQyxPQUFPLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDNUQsSUFBQSxvQkFBUyxFQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDckIsTUFBTSxFQUFDLFNBQVMsRUFBQyxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBbUIsQ0FBQztRQUNsRSxRQUFRLEdBQUcsU0FBUyxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQ2hDLGlCQUFpQjtJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtRQUNoQiw0QkFBNEI7UUFDNUIsSUFBQSwwQkFBa0IsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztLQUM1QztTQUFNO1FBQ0wsSUFBQSxtQkFBVyxFQUFDLEdBQUcsRUFBRTtZQUNmLE9BQU8sUUFBUSxFQUFFLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUVELElBQUEsc0NBQWlCLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFFM0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQy9CLEtBQUssQ0FBQyxDQUFDLENBQVEsRUFBRSxFQUFFO1FBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDO0NBRUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMsIGluaXRDb25maWcsIGluaXRQcm9jZXNzLCBpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0ICogYXMgX3J1bm5lciBmcm9tICcuL3BhY2thZ2UtcnVubmVyJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi9sb2ctY29uZmlnJztcbmltcG9ydCB7d2l0aEdsb2JhbE9wdGlvbnN9IGZyb20gJy4vY21kL292ZXJyaWRlLWNvbW1hbmRlcic7XG5pbXBvcnQge2ZvcmtGaWxlfSBmcm9tICcuL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsnO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9QUkVTRVJWRV9TWU1MSU5LUyAhPT0gJzEnICYmIHByb2Nlc3MuZXhlY0FyZ3YuaW5kZXhPZignLS1wcmVzZXJ2ZS1zeW1saW5rcycpIDwgMCkge1xuICBmb3JrRmlsZSgnQHdmaC9wbGluay93ZmgvZGlzdC9hcHAtc2VydmVyLmpzJyk7XG59IGVsc2Uge1xuICBjb25zdCB7dmVyc2lvbn0gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcblxuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rIC0gc2VydmVyJztcblxuICBsZXQgc2h1dGRvd246ICgpID0+IFByb21pc2U8YW55PjtcblxuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbiAgLmFyZ3VtZW50cygnW2FyZ3MuLi5dJylcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG5QbGluayB2ZXJzaW9uOicsIHZlcnNpb24pO1xuICAgIGNvbnN0IHNldHRpbmcgPSBpbml0Q29uZmlnKHByb2dyYW0ub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgIGxvZ0NvbmZpZyhzZXR0aW5nKCkpO1xuICAgIGNvbnN0IHtydW5TZXJ2ZXJ9ID0gcmVxdWlyZSgnLi9wYWNrYWdlLXJ1bm5lcicpIGFzIHR5cGVvZiBfcnVubmVyO1xuICAgIHNodXRkb3duID0gcnVuU2VydmVyKCkuc2h1dGRvd247XG4gICAgLy8gYXdhaXQgc3RhcnRlZDtcbiAgfSk7XG5cbiAgaWYgKHByb2Nlc3Muc2VuZCkge1xuICAgIC8vIGN1cnJlbnQgcHJvY2VzcyBpcyBmb3JrZWRcbiAgICBpbml0QXNDaGlsZFByb2Nlc3ModHJ1ZSwgKCkgPT4gc2h1dGRvd24oKSk7XG4gIH0gZWxzZSB7XG4gICAgaW5pdFByb2Nlc3MoKCkgPT4ge1xuICAgICAgcmV0dXJuIHNodXRkb3duKCk7XG4gICAgfSk7XG4gIH1cblxuICB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtKTtcblxuICBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuICAuY2F0Y2goKGU6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH0pO1xuXG59XG4iXX0=