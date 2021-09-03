"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forkFile = void 0;
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
// import log4js from 'log4js';
// const log = log4js.getLogger('plink.fork-for-preserver-symlink');
function forkFile(file, cwd) {
    let argv = process.argv.slice(2);
    const foundDebugOptIdx = argv.findIndex(arg => arg === '--inspect' || arg === '--inspect-brk');
    const debugOptIdx = argv.findIndex(arg => arg === '--debug');
    const env = Object.assign(Object.assign({}, process.env), { NODE_PRESERVE_SYMLINKS: '1' });
    if (foundDebugOptIdx >= 0) {
        env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' ' + argv[foundDebugOptIdx] : argv[foundDebugOptIdx];
        argv.splice(foundDebugOptIdx, 1);
    }
    if (debugOptIdx >= 0) {
        env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' --inspect-brk' : '--inspect-brk';
        argv.splice(debugOptIdx, 1);
    }
    child_process_1.fork(path_1.default.resolve(__dirname, 'fork-preserve-symlink-main.js'), argv, {
        env: Object.assign(Object.assign({}, env), { __plink_fork_main: file, __plink_save_state: '1' }),
        cwd,
        stdio: 'inherit'
    });
    // cp.send({
    //   type: '__plink_save_state'
    // }, (err) => {
    //   if (err) {
    //     console.error('Failed to send msg of __plink_save_state enablement to child process', err);
    //   }
    // });
    // cp.on('message', (msg) => {
    //   if (store.isStateSyncMsg(msg)) {
    //     console.log('Recieve state sync message from forked process');
    //     store.stateFactory.actionsToDispatch.next({type: '::syncState', payload(state: any) {
    //       return eval('(' + msg.data + ')');
    //     }});
    //   }
    // });
    return;
}
exports.forkFile = forkFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLGlEQUFtQztBQUNuQywrQkFBK0I7QUFDL0Isb0VBQW9FO0FBRXBFLFNBQWdCLFFBQVEsQ0FBQyxJQUFZLEVBQUUsR0FBVztJQUNoRCxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssV0FBVyxJQUFJLEdBQUcsS0FBSyxlQUFlLENBQUMsQ0FBQztJQUMvRixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxDQUFDO0lBRTdELE1BQU0sR0FBRyxtQ0FBZ0MsT0FBTyxDQUFDLEdBQUcsS0FBRSxzQkFBc0IsRUFBRSxHQUFHLEdBQUMsQ0FBQztJQUNuRixJQUFJLGdCQUFnQixJQUFJLENBQUMsRUFBRTtRQUN6QixHQUFHLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUMvRyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ2xDO0lBQ0QsSUFBSSxXQUFXLElBQUksQ0FBQyxFQUFFO1FBQ3BCLEdBQUcsQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO1FBQzVGLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzdCO0lBQ0Qsb0JBQUksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSwrQkFBK0IsQ0FBQyxFQUFFLElBQUksRUFBRTtRQUNuRSxHQUFHLGtDQUFNLEdBQUcsS0FBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxHQUFDO1FBQy9ELEdBQUc7UUFDSCxLQUFLLEVBQUUsU0FBUztLQUNqQixDQUFDLENBQUM7SUFDSCxZQUFZO0lBQ1osK0JBQStCO0lBQy9CLGdCQUFnQjtJQUNoQixlQUFlO0lBQ2Ysa0dBQWtHO0lBQ2xHLE1BQU07SUFDTixNQUFNO0lBRU4sOEJBQThCO0lBQzlCLHFDQUFxQztJQUNyQyxxRUFBcUU7SUFDckUsNEZBQTRGO0lBQzVGLDJDQUEyQztJQUMzQyxXQUFXO0lBQ1gsTUFBTTtJQUNOLE1BQU07SUFFTixPQUFPO0FBQ1QsQ0FBQztBQXJDRCw0QkFxQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5mb3JrLWZvci1wcmVzZXJ2ZXItc3ltbGluaycpO1xuXG5leHBvcnQgZnVuY3Rpb24gZm9ya0ZpbGUoZmlsZTogc3RyaW5nLCBjd2Q6IHN0cmluZykge1xuICBsZXQgYXJndiA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgY29uc3QgZm91bmREZWJ1Z09wdElkeCA9IGFyZ3YuZmluZEluZGV4KGFyZyA9PiBhcmcgPT09ICctLWluc3BlY3QnIHx8IGFyZyA9PT0gJy0taW5zcGVjdC1icmsnKTtcbiAgY29uc3QgZGVidWdPcHRJZHggPSBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1kZWJ1ZycpO1xuXG4gIGNvbnN0IGVudjoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7Li4ucHJvY2Vzcy5lbnYsIE5PREVfUFJFU0VSVkVfU1lNTElOS1M6ICcxJ307XG4gIGlmIChmb3VuZERlYnVnT3B0SWR4ID49IDApIHtcbiAgICBlbnYuTk9ERV9PUFRJT05TID0gZW52Lk5PREVfT1BUSU9OUyA/IGVudi5OT0RFX09QVElPTlMgKyAnICcgKyBhcmd2W2ZvdW5kRGVidWdPcHRJZHhdIDogYXJndltmb3VuZERlYnVnT3B0SWR4XTtcbiAgICBhcmd2LnNwbGljZShmb3VuZERlYnVnT3B0SWR4LCAxKTtcbiAgfVxuICBpZiAoZGVidWdPcHRJZHggPj0gMCkge1xuICAgIGVudi5OT0RFX09QVElPTlMgPSBlbnYuTk9ERV9PUFRJT05TID8gZW52Lk5PREVfT1BUSU9OUyArICcgLS1pbnNwZWN0LWJyaycgOiAnLS1pbnNwZWN0LWJyayc7XG4gICAgYXJndi5zcGxpY2UoZGVidWdPcHRJZHgsIDEpO1xuICB9XG4gIGZvcmsoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2ZvcmstcHJlc2VydmUtc3ltbGluay1tYWluLmpzJyksIGFyZ3YsIHtcbiAgICBlbnY6IHsuLi5lbnYsIF9fcGxpbmtfZm9ya19tYWluOiBmaWxlLCBfX3BsaW5rX3NhdmVfc3RhdGU6ICcxJ30sXG4gICAgY3dkLFxuICAgIHN0ZGlvOiAnaW5oZXJpdCdcbiAgfSk7XG4gIC8vIGNwLnNlbmQoe1xuICAvLyAgIHR5cGU6ICdfX3BsaW5rX3NhdmVfc3RhdGUnXG4gIC8vIH0sIChlcnIpID0+IHtcbiAgLy8gICBpZiAoZXJyKSB7XG4gIC8vICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2VuZCBtc2cgb2YgX19wbGlua19zYXZlX3N0YXRlIGVuYWJsZW1lbnQgdG8gY2hpbGQgcHJvY2VzcycsIGVycik7XG4gIC8vICAgfVxuICAvLyB9KTtcblxuICAvLyBjcC5vbignbWVzc2FnZScsIChtc2cpID0+IHtcbiAgLy8gICBpZiAoc3RvcmUuaXNTdGF0ZVN5bmNNc2cobXNnKSkge1xuICAvLyAgICAgY29uc29sZS5sb2coJ1JlY2lldmUgc3RhdGUgc3luYyBtZXNzYWdlIGZyb20gZm9ya2VkIHByb2Nlc3MnKTtcbiAgLy8gICAgIHN0b3JlLnN0YXRlRmFjdG9yeS5hY3Rpb25zVG9EaXNwYXRjaC5uZXh0KHt0eXBlOiAnOjpzeW5jU3RhdGUnLCBwYXlsb2FkKHN0YXRlOiBhbnkpIHtcbiAgLy8gICAgICAgcmV0dXJuIGV2YWwoJygnICsgbXNnLmRhdGEgKyAnKScpO1xuICAvLyAgICAgfX0pO1xuICAvLyAgIH1cbiAgLy8gfSk7XG5cbiAgcmV0dXJuO1xufVxuIl19