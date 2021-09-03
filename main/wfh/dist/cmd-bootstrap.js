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
const misc_1 = require("./utils/misc");
const path_1 = __importDefault(require("path"));
const fork_for_preserve_symlink_1 = require("./fork-for-preserve-symlink");
const startTime = new Date().getTime();
process.on('exit', () => {
    // eslint-disable-next-line no-console
    console.log(chalk_1.default.green(`Done in ${new Date().getTime() - startTime} ms`));
});
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let argv = process.argv.slice(2);
        const foundCmdOptIdx = argv.findIndex(arg => arg === '--cwd');
        const workdir = foundCmdOptIdx >= 0 ? path_1.default.resolve(misc_1.plinkEnv.rootDir, argv[foundCmdOptIdx + 1]) : null;
        if (workdir) {
            process.argv.splice(foundCmdOptIdx, 2);
        }
        if (process.env.NODE_PRESERVE_SYMLINKS !== '1' || workdir) {
            fork_for_preserve_symlink_1.forkFile('@wfh/plink/wfh/dist/cmd-bootstrap', workdir || process.cwd());
            return;
        }
        if (process.send) {
            // current process is forked
            bootstrap_process_1.initAsChildProcess(true);
        }
        else {
            bootstrap_process_1.initProcess();
        }
        yield new Promise(resolve => process.nextTick(resolve));
        return require('./cmd/cli').createCommands(startTime);
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLHVCQUFxQjtBQUNyQixzREFBc0Q7QUFDdEQsa0RBQTBCO0FBQzFCLGlFQUEwRTtBQUUxRSx1Q0FBc0M7QUFDdEMsZ0RBQXdCO0FBQ3hCLDJFQUFxRDtBQUVyRCxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBRXZDLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtJQUN0QixzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLENBQUM7QUFFSCxDQUFDLFNBQWUsR0FBRzs7UUFDakIsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxPQUFPLENBQUMsQ0FBQztRQUM5RCxNQUFNLE9BQU8sR0FBRyxjQUFjLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDdEcsSUFBSSxPQUFPLEVBQUU7WUFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDeEM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEtBQUssR0FBRyxJQUFJLE9BQU8sRUFBRTtZQUN6RCxvQ0FBUSxDQUFDLG1DQUFtQyxFQUFFLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN4RSxPQUFPO1NBQ1I7UUFFRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7WUFDaEIsNEJBQTRCO1lBQzVCLHNDQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzFCO2FBQU07WUFDTCwrQkFBVyxFQUFFLENBQUM7U0FDZjtRQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFeEQsT0FBUSxPQUFPLENBQUMsV0FBVyxDQUFpQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6RSxDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICcuL25vZGUtcGF0aCc7XG4vLyBpbXBvcnQgY2hlY2tOb2RlIGZyb20gJy4vdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2luaXRQcm9jZXNzLCBpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0ICogYXMgX2NsaSBmcm9tICcuL2NtZC9jbGknO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtmb3JrRmlsZX0gZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcblxuY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbnByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKGBEb25lIGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWV9IG1zYCkpO1xufSk7XG5cbihhc3luYyBmdW5jdGlvbiBydW4oKSB7XG4gIGxldCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuXG4gIGNvbnN0IGZvdW5kQ21kT3B0SWR4ID0gYXJndi5maW5kSW5kZXgoYXJnID0+IGFyZyA9PT0gJy0tY3dkJyk7XG4gIGNvbnN0IHdvcmtkaXIgPSBmb3VuZENtZE9wdElkeCA+PSAwID8gUGF0aC5yZXNvbHZlKHBsaW5rRW52LnJvb3REaXIsIGFyZ3ZbZm91bmRDbWRPcHRJZHggKyAxXSkgOiBudWxsO1xuICBpZiAod29ya2Rpcikge1xuICAgIHByb2Nlc3MuYXJndi5zcGxpY2UoZm91bmRDbWRPcHRJZHgsIDIpO1xuICB9XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX1BSRVNFUlZFX1NZTUxJTktTICE9PSAnMScgfHwgd29ya2Rpcikge1xuICAgIGZvcmtGaWxlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC1ib290c3RyYXAnLCB3b3JrZGlyIHx8IHByb2Nlc3MuY3dkKCkpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLnNlbmQpIHtcbiAgICAvLyBjdXJyZW50IHByb2Nlc3MgaXMgZm9ya2VkXG4gICAgaW5pdEFzQ2hpbGRQcm9jZXNzKHRydWUpO1xuICB9IGVsc2Uge1xuICAgIGluaXRQcm9jZXNzKCk7XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBwcm9jZXNzLm5leHRUaWNrKHJlc29sdmUpKTtcblxuICByZXR1cm4gKHJlcXVpcmUoJy4vY21kL2NsaScpIGFzIHR5cGVvZiBfY2xpKS5jcmVhdGVDb21tYW5kcyhzdGFydFRpbWUpO1xufSkoKS5jYXRjaChlcnIgPT4ge1xuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==