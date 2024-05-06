"use strict";
/* eslint-disable no-console */
Object.defineProperty(exports, "__esModule", { value: true });
let verbose = false;
function sendMsg(msg) {
    return process.send(msg, null, {}, err => {
        if (err)
            console.error(`[thread-pool] pid:${process.pid} failed to send Error message: `, msg, err);
    });
}
process.on('uncaughtException', onUncaughtException);
// let doNotSendToParent = false;
function onUncaughtException(err) {
    // log.error('Uncaught exception', err, err.stack);
    console.error(`[thread-pool] pid:${process.pid} Uncaught exception: `, err);
    sendMsg({
        type: 'error',
        data: err.toString()
    });
}
process.on('unhandledRejection', onUnhandledRejection);
function onUnhandledRejection(err) {
    console.error(`[thread-pool] pid:${process.pid} unhandledRejection`, err);
    sendMsg({
        type: 'error',
        data: err ? err.toString() : err
    });
}
if (process.send) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.on('message', executeOnEvent);
}
async function executeOnEvent(data) {
    if (data.exit) {
        if (verbose)
            console.log(`[thread-pool] child process ${process.pid} exit`);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        process.off('message', executeOnEvent);
        // process.off('uncaughtException', onUncaughtException);
        // process.off('unhandledRejection', onUnhandledRejection);
        // setImmediate(() => process.exit(0));
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                await Promise.resolve(require(initData.initializer.file)[exportFn]());
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
                result = await Promise.resolve(require(data.file)[exportFn](...(data.args || [])));
            }
            else {
                require(data.file);
            }
        }
        if (verbose) {
            console.log(`[thread-pool] child process ${process.pid} wait`);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        sendMsg({ type: 'wait', data: result });
    }
    catch (ex) {
        console.log(`[thread-pool] child process ${process.pid} error`, ex);
        try {
            sendMsg({
                type: 'error',
                data: ex.toString()
            });
        }
        catch (err) {
            sendMsg({
                type: 'error',
                data: ex.toString()
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy93b3JrZXItcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsK0JBQStCOztBQUUvQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFFcEIsU0FBUyxPQUFPLENBQUMsR0FBUTtJQUN2QixPQUFPLE9BQU8sQ0FBQyxJQUFLLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUU7UUFDeEMsSUFBSSxHQUFHO1lBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsT0FBTyxDQUFDLEdBQUcsaUNBQWlDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQy9GLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUVyRCxpQ0FBaUM7QUFDakMsU0FBUyxtQkFBbUIsQ0FBQyxHQUFRO0lBQ25DLG1EQUFtRDtJQUNuRCxPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixPQUFPLENBQUMsR0FBRyx1QkFBdUIsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM1RSxPQUFPLENBQUM7UUFDTixJQUFJLEVBQUUsT0FBTztRQUNiLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO0tBQ3JCLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUM7QUFFdkQsU0FBUyxvQkFBb0IsQ0FBQyxHQUFRO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLE9BQU8sQ0FBQyxHQUFHLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFFLE9BQU8sQ0FBQztRQUNOLElBQUksRUFBRSxPQUFPO1FBQ2IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENB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QU87Z0JBQ2IsSUFBSSxFQUFHLEVBQVksQ0FBQyxRQUFRLEVBQUU7YUFDL0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUM7Z0JBQ04sSUFBSSxFQUFFLE9BQU87Z0JBQ2IsSUFBSSxFQUFHLEVBQVksQ0FBQyxRQUFRLEVBQUU7YUFDL0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuXG5sZXQgdmVyYm9zZSA9IGZhbHNlO1xuXG5mdW5jdGlvbiBzZW5kTXNnKG1zZzogYW55KSB7XG4gIHJldHVybiBwcm9jZXNzLnNlbmQhKG1zZywgbnVsbCwge30sIGVyciA9PiB7XG4gICAgaWYgKGVycilcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFt0aHJlYWQtcG9vbF0gcGlkOiR7cHJvY2Vzcy5waWR9IGZhaWxlZCB0byBzZW5kIEVycm9yIG1lc3NhZ2U6IGAsIG1zZywgZXJyKTtcbiAgfSk7XG59XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgb25VbmNhdWdodEV4Y2VwdGlvbik7XG5cbi8vIGxldCBkb05vdFNlbmRUb1BhcmVudCA9IGZhbHNlO1xuZnVuY3Rpb24gb25VbmNhdWdodEV4Y2VwdGlvbihlcnI6IGFueSkge1xuICAvLyBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbicsIGVyciwgZXJyLnN0YWNrKTtcbiAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSBwaWQ6JHtwcm9jZXNzLnBpZH0gVW5jYXVnaHQgZXhjZXB0aW9uOiBgLCBlcnIpO1xuICBzZW5kTXNnKHtcbiAgICB0eXBlOiAnZXJyb3InLFxuICAgIGRhdGE6IGVyci50b1N0cmluZygpXG4gIH0pO1xufVxuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBvblVuaGFuZGxlZFJlamVjdGlvbik7XG5cbmZ1bmN0aW9uIG9uVW5oYW5kbGVkUmVqZWN0aW9uKGVycjogYW55KSB7XG4gIGNvbnNvbGUuZXJyb3IoYFt0aHJlYWQtcG9vbF0gcGlkOiR7cHJvY2Vzcy5waWR9IHVuaGFuZGxlZFJlamVjdGlvbmAsIGVycik7XG4gIHNlbmRNc2coe1xuICAgIHR5cGU6ICdlcnJvcicsXG4gICAgZGF0YTogZXJyID8gZXJyLnRvU3RyaW5nKCkgOiBlcnJcbiAgfSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5pdGlhbE9wdGlvbnMge1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbiAgLyoqIEFmdGVyIHdvcmtlciBiZWluZyBjcmVhdGVkLCB0aGUgZXhwb3J0ZWQgZnVuY3Rpb24gd2lsbCBiZSBydW4sXG4gICAqIFlvdSBjYW4gcHV0IGFueSBpbml0aWFsIGxvZ2ljIGluIGl0LCBsaWtlIGNhbGxpbmcgYHJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpYCBvclxuICAgKiBzZXR1cCBwcm9jZXNzIGV2ZW50IGhhbmRsaW5nIGZvciB1bmNhdWdodEV4Y2VwdGlvbiBhbmQgdW5oYW5kbGVkUmVqZWN0aW9uLlxuICAgKi9cbiAgaW5pdGlhbGl6ZXI/OiB7ZmlsZTogc3RyaW5nOyBleHBvcnRGbj86IHN0cmluZ307XG59XG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICBmaWxlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiByZXR1cm4gUHJvbWlzZSBvciBub24tUHJvbWlzZSB2YWx1ZVxuICAgKi9cbiAgZXhwb3J0Rm4/OiBzdHJpbmc7XG4gIGFyZ3M/OiBhbnlbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kIHtcbiAgZXhpdDogYm9vbGVhbjtcbn1cblxuaWYgKHByb2Nlc3Muc2VuZCkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW1pc3VzZWQtcHJvbWlzZXNcbiAgcHJvY2Vzcy5vbignbWVzc2FnZScsIGV4ZWN1dGVPbkV2ZW50KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZU9uRXZlbnQoZGF0YTogVGFzayB8IENvbW1hbmQpIHtcbiAgaWYgKChkYXRhIGFzIENvbW1hbmQpLmV4aXQpIHtcbiAgICBpZiAodmVyYm9zZSlcbiAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIGNoaWxkIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gZXhpdGApO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1wcm9taXNlc1xuICAgIHByb2Nlc3Mub2ZmKCdtZXNzYWdlJywgZXhlY3V0ZU9uRXZlbnQpO1xuICAgIC8vIHByb2Nlc3Mub2ZmKCd1bmNhdWdodEV4Y2VwdGlvbicsIG9uVW5jYXVnaHRFeGNlcHRpb24pO1xuICAgIC8vIHByb2Nlc3Mub2ZmKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBvblVuaGFuZGxlZFJlamVjdGlvbik7XG4gICAgLy8gc2V0SW1tZWRpYXRlKCgpID0+IHByb2Nlc3MuZXhpdCgwKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKChkYXRhIGFzIEluaXRpYWxPcHRpb25zKS52ZXJib3NlICE9IG51bGwpIHtcbiAgICB2ZXJib3NlID0gISEoZGF0YSBhcyBJbml0aWFsT3B0aW9ucykudmVyYm9zZTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgbGV0IHJlc3VsdDogYW55O1xuICAgIGNvbnN0IGluaXREYXRhID0gZGF0YSBhcyBJbml0aWFsT3B0aW9ucztcbiAgICBpZiAoaW5pdERhdGEuaW5pdGlhbGl6ZXIpIHtcbiAgICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIGNoaWxkIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gaW5pdGApO1xuICAgICAgfVxuICAgICAgY29uc3QgZXhwb3J0Rm4gPSBpbml0RGF0YS5pbml0aWFsaXplci5leHBvcnRGbjtcbiAgICAgIGlmIChleHBvcnRGbikge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsLEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZShpbml0RGF0YS5pbml0aWFsaXplci5maWxlKVtleHBvcnRGbl0oKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1aXJlKGluaXREYXRhLmluaXRpYWxpemVyLmZpbGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodmVyYm9zZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBjaGlsZCBwcm9jZXNzICR7cHJvY2Vzcy5waWR9IHJ1bmApO1xuICAgICAgfVxuICAgICAgY29uc3QgZXhwb3J0Rm4gPSAoZGF0YSBhcyBUYXNrKS5leHBvcnRGbjtcblxuICAgICAgaWYgKGV4cG9ydEZuKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQsQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsLEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgICAgICByZXN1bHQgPSAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKHJlcXVpcmUoKGRhdGEgYXMgVGFzaykuZmlsZSlbZXhwb3J0Rm5dKFxuICAgICAgICAgIC4uLigoZGF0YSBhcyBUYXNrKS5hcmdzIHx8IFtdKVxuICAgICAgICAgICkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWlyZSgoZGF0YSBhcyBUYXNrKS5maWxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodmVyYm9zZSkge1xuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSB3YWl0YCk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBzZW5kTXNnKHsgdHlwZTogJ3dhaXQnLCBkYXRhOiByZXN1bHQgfSk7XG5cbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBjaGlsZCBwcm9jZXNzICR7cHJvY2Vzcy5waWR9IGVycm9yYCwgZXgpO1xuICAgIHRyeSB7XG4gICAgICBzZW5kTXNnKHtcbiAgICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgZGF0YTogKGV4IGFzIEVycm9yKS50b1N0cmluZygpXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHNlbmRNc2coe1xuICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiAoZXggYXMgRXJyb3IpLnRvU3RyaW5nKClcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19