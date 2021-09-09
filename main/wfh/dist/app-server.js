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
    if (process.send) {
        // current process is forked
        (0, index_1.initAsChildProcess)(true);
    }
    else {
        (0, index_1.initProcess)();
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2FwcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwREFBa0M7QUFDbEMsbUNBQW1GO0FBRW5GLDhEQUFxQztBQUNyQyxpRUFBMkQ7QUFDM0QsMkVBQXFEO0FBRXJELElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDckcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1FBQ2hCLDRCQUE0QjtRQUM1QixJQUFBLDBCQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO0tBQzFCO1NBQU07UUFDTCxJQUFBLG1CQUFXLEdBQUUsQ0FBQztLQUNmO0lBQ0QsS0FBSyxJQUFBLG9DQUFRLEVBQUMsbUNBQW1DLENBQUMsQ0FBQztDQUNwRDtLQUFNO0lBQ0wsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBc0IsQ0FBQztJQUVyRSxPQUFPLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0lBRWpDLElBQUksUUFBNEIsQ0FBQztJQUVqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFTLENBQUMsT0FBTyxFQUFFO1NBQ3RDLFNBQVMsQ0FBQyxXQUFXLENBQUM7U0FDdEIsTUFBTSxDQUFDLENBQUMsSUFBYyxFQUFFLEVBQUU7UUFDekIsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBQSxrQkFBVSxFQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUM1RCxJQUFBLG9CQUFTLEVBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNyQixNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFtQixDQUFDO1FBQ2xFLFFBQVEsR0FBRyxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUM7UUFDaEMsaUJBQWlCO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1FBQ2hCLDRCQUE0QjtRQUM1QixJQUFBLDBCQUFrQixFQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0tBQzVDO1NBQU07UUFDTCxJQUFBLG1CQUFXLEVBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUNyQixPQUFPLFFBQVEsRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxJQUFBLHNDQUFpQixFQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRTNCLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUMvQixLQUFLLENBQUMsQ0FBQyxDQUFRLEVBQUUsRUFBRTtRQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztDQUVKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zLCBpbml0Q29uZmlnLCBpbml0UHJvY2VzcywgaW5pdEFzQ2hpbGRQcm9jZXNzfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCAqIGFzIF9ydW5uZXIgZnJvbSAnLi9wYWNrYWdlLXJ1bm5lcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge3dpdGhHbG9iYWxPcHRpb25zfSBmcm9tICcuL2NtZC9vdmVycmlkZS1jb21tYW5kZXInO1xuaW1wb3J0IHtmb3JrRmlsZX0gZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfUFJFU0VSVkVfU1lNTElOS1MgIT09ICcxJyAmJiBwcm9jZXNzLmV4ZWNBcmd2LmluZGV4T2YoJy0tcHJlc2VydmUtc3ltbGlua3MnKSA8IDApIHtcbiAgaWYgKHByb2Nlc3Muc2VuZCkge1xuICAgIC8vIGN1cnJlbnQgcHJvY2VzcyBpcyBmb3JrZWRcbiAgICBpbml0QXNDaGlsZFByb2Nlc3ModHJ1ZSk7XG4gIH0gZWxzZSB7XG4gICAgaW5pdFByb2Nlc3MoKTtcbiAgfVxuICB2b2lkIGZvcmtGaWxlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L2FwcC1zZXJ2ZXIuanMnKTtcbn0gZWxzZSB7XG4gIGNvbnN0IHt2ZXJzaW9ufSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpIGFzIHt2ZXJzaW9uOiBzdHJpbmd9O1xuXG4gIHByb2Nlc3MudGl0bGUgPSAnUGxpbmsgLSBzZXJ2ZXInO1xuXG4gIGxldCBzaHV0ZG93bjogKCkgPT4gUHJvbWlzZTxhbnk+O1xuXG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgY29tbWFuZGVyLkNvbW1hbmQoKVxuICAuYXJndW1lbnRzKCdbYXJncy4uLl0nKVxuICAuYWN0aW9uKChhcmdzOiBzdHJpbmdbXSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1xcblBsaW5rIHZlcnNpb246JywgdmVyc2lvbik7XG4gICAgY29uc3Qgc2V0dGluZyA9IGluaXRDb25maWcocHJvZ3JhbS5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgbG9nQ29uZmlnKHNldHRpbmcoKSk7XG4gICAgY29uc3Qge3J1blNlcnZlcn0gPSByZXF1aXJlKCcuL3BhY2thZ2UtcnVubmVyJykgYXMgdHlwZW9mIF9ydW5uZXI7XG4gICAgc2h1dGRvd24gPSBydW5TZXJ2ZXIoKS5zaHV0ZG93bjtcbiAgICAvLyBhd2FpdCBzdGFydGVkO1xuICB9KTtcblxuICBpZiAocHJvY2Vzcy5zZW5kKSB7XG4gICAgLy8gY3VycmVudCBwcm9jZXNzIGlzIGZvcmtlZFxuICAgIGluaXRBc0NoaWxkUHJvY2Vzcyh0cnVlLCAoKSA9PiBzaHV0ZG93bigpKTtcbiAgfSBlbHNlIHtcbiAgICBpbml0UHJvY2Vzcyh0cnVlLCAoKSA9PiB7XG4gICAgICByZXR1cm4gc2h1dGRvd24oKTtcbiAgICB9KTtcbiAgfVxuXG4gIHdpdGhHbG9iYWxPcHRpb25zKHByb2dyYW0pO1xuXG4gIHByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YpXG4gIC5jYXRjaCgoZTogRXJyb3IpID0+IHtcbiAgICBjb25zb2xlLmVycm9yKGUsIGUuc3RhY2spO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfSk7XG5cbn1cbiJdfQ==