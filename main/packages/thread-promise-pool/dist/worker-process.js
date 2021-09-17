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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy93b3JrZXItcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsK0JBQStCOztBQUUvQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFFcEIsU0FBUyxPQUFPLENBQUMsR0FBUTtJQUN2QixPQUFPLE9BQU8sQ0FBQyxJQUFLLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUU7UUFDeEMsSUFBSSxHQUFHO1lBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsT0FBTyxDQUFDLEdBQUcsaUNBQWlDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQy9GLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUVyRCxpQ0FBaUM7QUFDakMsU0FBUyxtQkFBbUIsQ0FBQyxHQUFRO0lBQ25DLG1EQUFtRDtJQUNuRCxPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixPQUFPLENBQUMsR0FBRyx1QkFBdUIsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM1RSxPQUFPLENBQUM7UUFDTixJQUFJLEVBQUUsT0FBTztRQUNiLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFO0tBQ3JCLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUM7QUFFdkQsU0FBUyxvQkFBb0IsQ0FBQyxHQUFRO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLE9BQU8sQ0FBQyxHQUFHLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFFLE9BQU8sQ0FBQztRQUNOLElBQUksRUFBRSxPQUFPO1FBQ2IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENB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QyxRQUFRLEVBQUU7YUFDL0IsQ0FBQyxDQUFDO1NBQ0o7S0FDRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5cbmxldCB2ZXJib3NlID0gZmFsc2U7XG5cbmZ1bmN0aW9uIHNlbmRNc2cobXNnOiBhbnkpIHtcbiAgcmV0dXJuIHByb2Nlc3Muc2VuZCEobXNnLCBudWxsLCB7fSwgZXJyID0+IHtcbiAgICBpZiAoZXJyKVxuICAgICAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSBwaWQ6JHtwcm9jZXNzLnBpZH0gZmFpbGVkIHRvIHNlbmQgRXJyb3IgbWVzc2FnZTogYCwgbXNnLCBlcnIpO1xuICB9KTtcbn1cblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBvblVuY2F1Z2h0RXhjZXB0aW9uKTtcblxuLy8gbGV0IGRvTm90U2VuZFRvUGFyZW50ID0gZmFsc2U7XG5mdW5jdGlvbiBvblVuY2F1Z2h0RXhjZXB0aW9uKGVycjogYW55KSB7XG4gIC8vIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uJywgZXJyLCBlcnIuc3RhY2spO1xuICBjb25zb2xlLmVycm9yKGBbdGhyZWFkLXBvb2xdIHBpZDoke3Byb2Nlc3MucGlkfSBVbmNhdWdodCBleGNlcHRpb246IGAsIGVycik7XG4gIHNlbmRNc2coe1xuICAgIHR5cGU6ICdlcnJvcicsXG4gICAgZGF0YTogZXJyLnRvU3RyaW5nKClcbiAgfSk7XG59XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIG9uVW5oYW5kbGVkUmVqZWN0aW9uKTtcblxuZnVuY3Rpb24gb25VbmhhbmRsZWRSZWplY3Rpb24oZXJyOiBhbnkpIHtcbiAgY29uc29sZS5lcnJvcihgW3RocmVhZC1wb29sXSBwaWQ6JHtwcm9jZXNzLnBpZH0gdW5oYW5kbGVkUmVqZWN0aW9uYCwgZXJyKTtcbiAgc2VuZE1zZyh7XG4gICAgdHlwZTogJ2Vycm9yJyxcbiAgICBkYXRhOiBlcnIgPyBlcnIudG9TdHJpbmcoKSA6IGVyclxuICB9KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbml0aWFsT3B0aW9ucyB7XG4gIHZlcmJvc2U/OiBib29sZWFuO1xuICAvKiogQWZ0ZXIgd29ya2VyIGJlaW5nIGNyZWF0ZWQsIHRoZSBleHBvcnRlZCBmdW5jdGlvbiB3aWxsIGJlIHJ1bixcbiAgICogWW91IGNhbiBwdXQgYW55IGluaXRpYWwgbG9naWMgaW4gaXQsIGxpa2UgY2FsbGluZyBgcmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJylgIG9yXG4gICAqIHNldHVwIHByb2Nlc3MgZXZlbnQgaGFuZGxpbmcgZm9yIHVuY2F1Z2h0RXhjZXB0aW9uIGFuZCB1bmhhbmRsZWRSZWplY3Rpb24uXG4gICAqL1xuICBpbml0aWFsaXplcj86IHtmaWxlOiBzdHJpbmc7IGV4cG9ydEZuPzogc3RyaW5nfTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgVGFzayB7XG4gIGZpbGU6IHN0cmluZztcbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gd2hpY2ggY2FuIHJldHVybiBQcm9taXNlIG9yIG5vbi1Qcm9taXNlIHZhbHVlXG4gICAqL1xuICBleHBvcnRGbj86IHN0cmluZztcbiAgYXJncz86IGFueVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmQge1xuICBleGl0OiBib29sZWFuO1xufVxuXG5pZiAocHJvY2Vzcy5zZW5kKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbWlzdXNlZC1wcm9taXNlc1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZXhlY3V0ZU9uRXZlbnQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlT25FdmVudChkYXRhOiBUYXNrIHwgQ29tbWFuZCkge1xuICBpZiAoKGRhdGEgYXMgQ29tbWFuZCkuZXhpdCkge1xuICAgIGlmICh2ZXJib3NlKVxuICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSBleGl0YCk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1taXN1c2VkLXByb21pc2VzXG4gICAgcHJvY2Vzcy5vZmYoJ21lc3NhZ2UnLCBleGVjdXRlT25FdmVudCk7XG4gICAgLy8gcHJvY2Vzcy5vZmYoJ3VuY2F1Z2h0RXhjZXB0aW9uJywgb25VbmNhdWdodEV4Y2VwdGlvbik7XG4gICAgLy8gcHJvY2Vzcy5vZmYoJ3VuaGFuZGxlZFJlamVjdGlvbicsIG9uVW5oYW5kbGVkUmVqZWN0aW9uKTtcbiAgICAvLyBzZXRJbW1lZGlhdGUoKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoKGRhdGEgYXMgSW5pdGlhbE9wdGlvbnMpLnZlcmJvc2UgIT0gbnVsbCkge1xuICAgIHZlcmJvc2UgPSAhIShkYXRhIGFzIEluaXRpYWxPcHRpb25zKS52ZXJib3NlO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBsZXQgcmVzdWx0OiBhbnk7XG4gICAgY29uc3QgaW5pdERhdGEgPSBkYXRhIGFzIEluaXRpYWxPcHRpb25zO1xuICAgIGlmIChpbml0RGF0YS5pbml0aWFsaXplcikge1xuICAgICAgaWYgKHZlcmJvc2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFt0aHJlYWQtcG9vbF0gY2hpbGQgcHJvY2VzcyAke3Byb2Nlc3MucGlkfSBpbml0YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBleHBvcnRGbiA9IGluaXREYXRhLmluaXRpYWxpemVyLmV4cG9ydEZuO1xuICAgICAgaWYgKGV4cG9ydEZuKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGwsQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShyZXF1aXJlKGluaXREYXRhLmluaXRpYWxpemVyLmZpbGUpW2V4cG9ydEZuXSgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcXVpcmUoaW5pdERhdGEuaW5pdGlhbGl6ZXIuZmlsZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIGNoaWxkIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gcnVuYCk7XG4gICAgICB9XG4gICAgICBjb25zdCBleHBvcnRGbiA9IChkYXRhIGFzIFRhc2spLmV4cG9ydEZuO1xuXG4gICAgICBpZiAoZXhwb3J0Rm4pIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCxAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGwsQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICAgIHJlc3VsdCA9ICBhd2FpdCBQcm9taXNlLnJlc29sdmUocmVxdWlyZSgoZGF0YSBhcyBUYXNrKS5maWxlKVtleHBvcnRGbl0oXG4gICAgICAgICAgLi4uKChkYXRhIGFzIFRhc2spLmFyZ3MgfHwgW10pXG4gICAgICAgICAgKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1aXJlKChkYXRhIGFzIFRhc2spLmZpbGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW3RocmVhZC1wb29sXSBjaGlsZCBwcm9jZXNzICR7cHJvY2Vzcy5waWR9IHdhaXRgKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIHNlbmRNc2coeyB0eXBlOiAnd2FpdCcsIGRhdGE6IHJlc3VsdCB9KTtcblxuICB9IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKGBbdGhyZWFkLXBvb2xdIGNoaWxkIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gZXJyb3JgLCBleCk7XG4gICAgdHJ5IHtcbiAgICAgIHNlbmRNc2coe1xuICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICBkYXRhOiAoZXggYXMgRXJyb3IpLnRvU3RyaW5nKClcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgc2VuZE1zZyh7XG4gICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIGRhdGE6IChleCBhcyBFcnJvcikudG9TdHJpbmcoKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG4iXX0=