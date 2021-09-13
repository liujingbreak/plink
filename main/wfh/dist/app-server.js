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
    let storeSettingDispatcher;
    if (process.send) {
        // current process is forked
        (0, index_1.initAsChildProcess)(true);
    }
    else {
        storeSettingDispatcher = (0, index_1.initProcess)();
    }
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
        // await started;
    });
    if (process.send) {
        // current process is forked
        (0, index_1.initAsChildProcess)(true, () => shutdown());
    }
    else {
        (0, index_1.initProcess)(true, () => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQW1GO0FBRW5GLDhEQUFxQztBQUNyQyxpRUFBMkQ7QUFDM0QsMkVBQXFEO0FBRXJELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDckcsSUFBSSxzQkFBa0UsQ0FBQztJQUN2RSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7UUFDaEIsNEJBQTRCO1FBQzVCLElBQUEsMEJBQWtCLEVBQUMsSUFBSSxDQUFDLENBQUM7S0FDMUI7U0FBTTtRQUNMLHNCQUFzQixHQUFHLElBQUEsbUJBQVcsR0FBRSxDQUFDO0tBQ3hDO0lBQ0QsSUFBSSxzQkFBc0I7UUFDeEIsc0JBQXNCLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEQsS0FBSyxJQUFBLG9DQUFRLEVBQUMsbUNBQW1DLENBQUMsQ0FBQztDQUNwRDtLQUFNO0lBQ0wsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBc0IsQ0FBQztJQUVyRSxPQUFPLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0lBRWpDLElBQUksUUFBNEIsQ0FBQztJQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxFQUFFO1NBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7U0FDdEIsTUFBTSxDQUFDLENBQUMsSUFBYyxFQUFFLEVBQUU7UUFDekIsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBQSxrQkFBVSxFQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUM1RCxJQUFBLG9CQUFTLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNyQixNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFtQixDQUFDO1FBQ2xFLFFBQVEsR0FBRyxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUM7UUFDaEMsaUJBQWlCO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1FBQ2hCLDRCQUE0QjtRQUM1QixJQUFBLDBCQUFrQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0tBQzVDO1NBQU07UUFDTCxJQUFBLG1CQUFXLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUNyQixPQUFPLFFBQVEsRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxJQUFBLHNDQUFpQixFQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTNCLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFRLEVBQUUsRUFBRTtRQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zLCBpbml0Q29uZmlnLCBpbml0UHJvY2VzcywgaW5pdEFzQ2hpbGRQcm9jZXNzfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCAqIGFzIF9ydW5uZXIgZnJvbSAnLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge3dpdGhHbG9iYWxPcHRpb25zfSBmcm9tICcuL2NtZC9vdmVycmlkZS1jb21tYW5kZXInO1xuaW1wb3J0IHtmb3JrRmlsZX0gZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfUFJFU0VSVkVfU1lNTElOS1MgIT09ICcxJyAmJiBwcm9jZXNzLmV4ZWNBcmd2LmluZGV4T2YoJy0tcHJlc2VydmUtc3ltbGlua3MnKSA8IDApIHtcbiAgbGV0IHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXI6IFJldHVyblR5cGU8dHlwZW9mIGluaXRQcm9jZXNzPiB8IHVuZGVmaW5lZDtcbiAgaWYgKHByb2Nlc3Muc2VuZCkge1xuICAgIC8vIGN1cnJlbnQgcHJvY2VzcyBpcyBmb3JrZWRcbiAgICBpbml0QXNDaGlsZFByb2Nlc3ModHJ1ZSk7XG4gIH0gZWxzZSB7XG4gICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlciA9IGluaXRQcm9jZXNzKCk7XG4gIH1cbiAgaWYgKHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXIpXG4gICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ25vbmUnKTtcbiAgdm9pZCBmb3JrRmlsZSgnQHdmaC9wbGluay93ZmgvZGlzdC9hcHAtc2VydmVyLmpzJyk7XG59IGVsc2Uge1xuICBjb25zdCB7dmVyc2lvbn0gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcblxuICBwcm9jZXNzLnRpdGxlID0gJ1BsaW5rIC0gc2VydmVyJztcblxuICBsZXQgc2h1dGRvd246ICgpID0+IFByb21pc2U8YW55PjtcblxuICBjb25zdCBwcm9ncmFtID0gbmV3IGNvbW1hbmRlci5Db21tYW5kKClcbiAgLmFyZ3VtZW50cygnW2FyZ3MuLi5dJylcbiAgLmFjdGlvbigoYXJnczogc3RyaW5nW10pID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdcXG5QbGluayB2ZXJzaW9uOicsIHZlcnNpb24pO1xuICAgIGNvbnN0IHNldHRpbmcgPSBpbml0Q29uZmlnKHByb2dyYW0ub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgIGxvZ0NvbmZpZyhzZXR0aW5nKCkpO1xuICAgIGNvbnN0IHtydW5TZXJ2ZXJ9ID0gcmVxdWlyZSgnLi9wYWNrYWdlLXJ1bm5lcicpIGFzIHR5cGVvZiBfcnVubmVyO1xuICAgIHNodXRkb3duID0gcnVuU2VydmVyKCkuc2h1dGRvd247XG4gICAgLy8gYXdhaXQgc3RhcnRlZDtcbiAgfSk7XG5cbiAgaWYgKHByb2Nlc3Muc2VuZCkge1xuICAgIC8vIGN1cnJlbnQgcHJvY2VzcyBpcyBmb3JrZWRcbiAgICBpbml0QXNDaGlsZFByb2Nlc3ModHJ1ZSwgKCkgPT4gc2h1dGRvd24oKSk7XG4gIH0gZWxzZSB7XG4gICAgaW5pdFByb2Nlc3ModHJ1ZSwgKCkgPT4ge1xuICAgICAgcmV0dXJuIHNodXRkb3duKCk7XG4gICAgfSk7XG4gIH1cblxuICB3aXRoR2xvYmFsT3B0aW9ucyhwcm9ncmFtKTtcblxuICBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KVxuICAuY2F0Y2goKGU6IEVycm9yKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcihlLCBlLnN0YWNrKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH0pO1xuXG59XG4iXX0=