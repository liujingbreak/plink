"use strict";
// tslint:disable no-console
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
let verbose = false;
process.on('uncaughtException', function (err) {
    // log.error('Uncaught exception', err, err.stack);
    console.error(`[thread-pool] pid:${process.pid} Uncaught exception: `, err);
    process.send({
        type: 'error',
        data: err.toString()
    });
});
process.on('unhandledRejection', err => {
    // log.warn('unhandledRejection', err);
    console.error(`[thread-pool] pid:${process.pid} unhandledRejection`, err);
    process.send({
        type: 'error',
        data: err ? err.toString() : err
    });
});
if (process.send) {
    process.on('message', executeOnEvent);
}
function executeOnEvent(data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (data.exit) {
            if (verbose)
                console.log(`[thread-pool] child process ${process.pid} exit`);
            process.exit(0);
            return;
        }
        if (data.verbose != null) {
            verbose = !!data.verbose;
        }
        try {
            let result;
            const initData = data;
            if (initData.initializer) {
                if (verbose) {
                    console.log(`[thread-pool] child process ${process.pid} init`);
                }
                const exportFn = initData.initializer.exportFn;
                if (exportFn) {
                    yield Promise.resolve(require(initData.initializer.file)[exportFn]());
                }
                else {
                    require(initData.initializer.file);
                }
            }
            else {
                if (verbose) {
                    console.log(`[thread-pool] child process ${process.pid} run`);
                }
                const exportFn = data.exportFn;
                if (exportFn) {
                    result = yield Promise.resolve(require(data.file)[exportFn](...(data.args || [])));
                }
                else {
                    require(data.file);
                }
            }
            if (verbose) {
                console.log(`[thread-pool] child process ${process.pid} wait`);
            }
            process.send({ type: 'wait', data: result });
        }
        catch (ex) {
            console.log(`[thread-pool] child process ${process.pid} error`, ex);
            try {
                process.send({
                    type: 'error',
                    data: ex.toString()
                });
            }
            catch (err) {
                process.send({
                    type: 'error',
                    data: err.toString()
                });
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3b3JrZXItcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNEJBQTRCOzs7Ozs7Ozs7OztBQUU1QixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFFcEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLEdBQUc7SUFDMUMsbURBQW1EO0lBQ25ELE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLE9BQU8sQ0FBQyxHQUFHLHVCQUF1QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzVFLE9BQU8sQ0FBQyxJQUFLLENBQUM7UUFDWixJQUFJLEVBQUUsT0FBTztRQUNiLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO0tBQ3JCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyx1Q0FBdUM7SUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsT0FBTyxDQUFDLEdBQUcscUJBQXFCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUUsT0FBTyxDQUFDLElBQUssQ0FBQztRQUNaLElBQUksRUFBRSxPQUFPO1FBQ2IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHO0tBQ2pDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBdUJILElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtJQUNoQixPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztDQUN2QztBQUVELFNBQWUsY0FBYyxDQUFDLElBQW9COztRQUNoRCxJQUFLLElBQWdCLENBQUMsSUFBSSxFQUFFO1lBQzFCLElBQUksT0FBTztnQkFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztZQUNqRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE9BQU87U0FDUjtRQUVELElBQUssSUFBdUIsQ0FBQyxPQUFPLElBQUksSUFBSSxFQUFFO1lBQzVDLE9BQU8sR0FBRyxDQUFDLENBQUUsSUFBdUIsQ0FBQyxPQUFPLENBQUM7U0FDOUM7UUFFRCxJQUFJO1lBQ0YsSUFBSSxNQUFXLENBQUM7WUFDaEIsTUFBTSxRQUFRLEdBQUcsSUFBc0IsQ0FBQztZQUN4QyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3hCLElBQUksT0FBTyxFQUFFO29CQUNYLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO2lCQUNoRTtnQkFDRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztnQkFDL0MsSUFBSSxRQUFRLEVBQUU7b0JBQ1osTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDdkU7cUJBQU07b0JBQ0wsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3BDO2FBQ0Y7aUJBQU07Z0JBQ0wsSUFBSSxPQUFPLEVBQUU7b0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7aUJBQy9EO2dCQUNELE1BQU0sUUFBUSxHQUFJLElBQWEsQ0FBQyxRQUFRLENBQUM7Z0JBRXpDLElBQUksUUFBUSxFQUFFO29CQUNaLE1BQU0sR0FBSSxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFFLElBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FDcEUsR0FBRyxDQUFFLElBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQzdCLENBQUMsQ0FBQztpQkFDTjtxQkFBTTtvQkFDTCxPQUFPLENBQUUsSUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUM5QjthQUNGO1lBRUQsSUFBSSxPQUFPLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7YUFDaEU7WUFDRCxPQUFPLENBQUMsSUFBSyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztTQUUvQztRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsT0FBTyxDQUFDLEdBQUcsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BFLElBQUk7Z0JBQ0YsT0FBTyxDQUFDLElBQUssQ0FBQztvQkFDWixJQUFJLEVBQUUsT0FBTztvQkFDYixJQUFJLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRTtpQkFDcEIsQ0FBQyxDQUFDO2FBQ0o7WUFBQyxPQUFPLEdBQUcsRUFBRTtnQkFDWixPQUFPLENBQUMsSUFBSyxDQUFDO29CQUNaLElBQUksRUFBRSxPQUFPO29CQUNiLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO2lCQUNyQixDQUFDLENBQUM7YUFDSjtTQUNGO0lBQ0gsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGUgbm8tY29uc29sZVxuXG5sZXQgdmVyYm9zZSA9IGZhbHNlO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICAvLyBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbicsIGVyciwgZXJyLnN0YWNrKTtcbiAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSBwaWQ6JHtwcm9jZXNzLnBpZH0gVW5jYXVnaHQgZXhjZXB0aW9uOiBgLCBlcnIpO1xuICBwcm9jZXNzLnNlbmQhKHtcbiAgICB0eXBlOiAnZXJyb3InLFxuICAgIGRhdGE6IGVyci50b1N0cmluZygpXG4gIH0pO1xufSk7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVyciA9PiB7XG4gIC8vIGxvZy53YXJuKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIpO1xuICBjb25zb2xlLmVycm9yKGBbdGhyZWFkLXBvb2xdIHBpZDoke3Byb2Nlc3MucGlkfSB1bmhhbmRsZWRSZWplY3Rpb25gLCBlcnIpO1xuICBwcm9jZXNzLnNlbmQhKHtcbiAgICB0eXBlOiAnZXJyb3InLFxuICAgIGRhdGE6IGVyciA/IGVyci50b1N0cmluZygpIDogZXJyXG4gIH0pO1xufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5pdGlhbE9wdGlvbnMge1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgLyoqIEFmdGVyIHdvcmtlciBiZWluZyBjcmVhdGVkLCB0aGUgZXhwb3J0ZWQgZnVuY3Rpb24gd2lsbCBiZSBydW4sXG4gICAqIFlvdSBjYW4gcHV0IGFueSBpbml0aWFsIGxvZ2ljIGluIGl0LCBsaWtlIGNhbGxpbmcgYHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpYCBvclxuICAgKiBzZXR1cCBwcm9jZXNzIGV2ZW50IGhhbmRsaW5nIGZvciB1bmNhdWdodEV4Y2VwdGlvbiBhbmQgdW5oYW5kbGVkUmVqZWN0aW9uLlxuICAgKi9cbiAgaW5pdGlhbGl6ZXI/OiB7ZmlsZTogc3RyaW5nOyBleHBvcnRGbj86IHN0cmluZ307XG59XG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICBmaWxlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiByZXR1cm4gUHJvbWlzZSBvciBub24tUHJvbWlzZSB2YWx1ZVxuICAgKi9cbiAgZXhwb3J0Rm4/OiBzdHJpbmc7XG4gIGFyZ3M/OiBhbnlbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kIHtcbiAgZXhpdDogYm9vbGVhbjtcbn1cblxuaWYgKHByb2Nlc3Muc2VuZCkge1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZXhlY3V0ZU9uRXZlbnQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlT25FdmVudChkYXRhOiBUYXNrIHwgQ29tbWFuZCkge1xuICBpZiAoKGRhdGEgYXMgQ29tbWFuZCkuZXhpdCkge1xuICAgIGlmICh2ZXJib3NlKVxuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSBleGl0YCk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICgoZGF0YSBhcyBJbml0aWFsT3B0aW9ucykudmVyYm9zZSAhPSBudWxsKSB7XG4gICAgdmVyYm9zZSA9ICEhKGRhdGEgYXMgSW5pdGlhbE9wdGlvbnMpLnZlcmJvc2U7XG4gIH1cblxuICB0cnkge1xuICAgIGxldCByZXN1bHQ6IGFueTtcbiAgICBjb25zdCBpbml0RGF0YSA9IGRhdGEgYXMgSW5pdGlhbE9wdGlvbnM7XG4gICAgaWYgKGluaXREYXRhLmluaXRpYWxpemVyKSB7XG4gICAgICBpZiAodmVyYm9zZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBjaGlsZCBwcm9jZXNzICR7cHJvY2Vzcy5waWR9IGluaXRgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGV4cG9ydEZuID0gaW5pdERhdGEuaW5pdGlhbGl6ZXIuZXhwb3J0Rm47XG4gICAgICBpZiAoZXhwb3J0Rm4pIHtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoaW5pdERhdGEuaW5pdGlhbGl6ZXIuZmlsZSlbZXhwb3J0Rm5dKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWlyZShpbml0RGF0YS5pbml0aWFsaXplci5maWxlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSBydW5gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGV4cG9ydEZuID0gKGRhdGEgYXMgVGFzaykuZXhwb3J0Rm47XG5cbiAgICAgIGlmIChleHBvcnRGbikge1xuICAgICAgICByZXN1bHQgPSAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoKGRhdGEgYXMgVGFzaykuZmlsZSlbZXhwb3J0Rm5dKFxuICAgICAgICAgIC4uLigoZGF0YSBhcyBUYXNrKS5hcmdzIHx8IFtdKVxuICAgICAgICAgICkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWlyZSgoZGF0YSBhcyBUYXNrKS5maWxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSB3YWl0YCk7XG4gICAgfVxuICAgIHByb2Nlc3Muc2VuZCEoeyB0eXBlOiAnd2FpdCcsIGRhdGE6IHJlc3VsdCB9KTtcblxuICB9IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIGNoaWxkIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gZXJyb3JgLCBleCk7XG4gICAgdHJ5IHtcbiAgICAgIHByb2Nlc3Muc2VuZCEoe1xuICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiBleC50b1N0cmluZygpXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHByb2Nlc3Muc2VuZCEoe1xuICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiBlcnIudG9TdHJpbmcoKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG4iXX0=