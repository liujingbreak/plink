"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crossSpawn = require('cross-spawn');
exports.isWindows = process.platform === 'win32';
/**
 * Spawn process
 * @param  {string} command
 * @param  {string[]} args
 * @param  {object} opts optional
 *   - {boolean} opts.silent  child process's `stdout` and `stderr` stream will
 *   not pipe to process.stdout and stderr, returned promise will be resolved to
 *   string of stdout
 *   Other opts properties will be passed to child_process.spawn()
 *
 * @return {Promise} rejected if child process exits with non-zero code
 */
function promisifySpawn(command, ...args) {
    return spawn(command, ...args).promise;
}
exports.promisifySpawn = promisifySpawn;
function spawn(command, ...args) {
    let opts = args[args.length - 1];
    if (typeof opts === 'string') {
        opts = {};
    }
    else {
        args = args.slice(0, -1);
    }
    if (opts == null) {
        opts = {};
    }
    if (!(opts && opts.silent)) {
        opts.stdio = 'inherit';
    }
    let res;
    const promise = checkTimeout(new Promise((resolve, reject) => {
        res = crossSpawn(command, args, opts);
        // console.log(command, args);
        let output;
        if (opts && opts.silent) {
            output = '';
            res.stdout.setEncoding('utf-8');
            res.stdout.on('data', (chunk) => {
                output += chunk;
            });
            res.stderr.setEncoding('utf-8');
            res.stderr.on('data', (chunk) => {
                output += chunk;
            });
        }
        res.on('error', (err) => {
            reject(err);
        });
        res.on('exit', function (code, signal) {
            if (code !== 0 && signal !== 'SIGINT') {
                const errMsg = `Child process exit with code ${code}, signal ` + signal;
                if (opts == null || opts.silent !== true) {
                    console.log(errMsg);
                    if (output) {
                        console.log(output);
                    }
                }
                return reject(new Error(errMsg + '\n' + (output ? output : '')));
            }
            else {
                resolve(output);
            }
        });
    }), opts.timeout)
        .catch(e => {
        if (e.message === 'Timeout' && res) {
            console.log('Kill the child process');
            res.kill('SIGHUP');
        }
        throw e;
    });
    return {
        childProcess: res,
        promise
    };
}
exports.spawn = spawn;
function checkTimeout(origPromise, timeBox = 600000) {
    let timeout;
    return new Promise((resolve, reject) => {
        origPromise.then(res => {
            if (timeout) {
                clearTimeout(timeout);
            }
            resolve(res);
        }).catch(e => {
            if (timeout) {
                clearTimeout(timeout);
            }
            reject(e);
        });
        timeout = setTimeout(() => {
            timeout = null;
            reject(new Error('Timeout'));
        }, timeBox);
    });
}
/**
 * Fix some executable command for windows
 * @param  {string} command     [description]
 * @param  {...string | array} commandArgs ... arguments
 * @param  {object} opts optional
 *   - {boolean} opts.silent  child process's `stdout` and `stderr` stream will
 *   not pipe to process.stdout and stderr, returned promise will be resolved to
 *   string of stdout
 *
 * @return {Promise}        rejected if child process exits with non-zero code
 */
function promisifyExe(command, ...argsAndOption) {
    return exe(command, ...argsAndOption).promise;
}
exports.promisifyExe = promisifyExe;
/**
 * @param {*} command
 * @param {*} argsAndOption
 * @return {object} {promise: Promise, childProcess: child_process}
 */
function exe(command, ...argsAndOption) {
    // var args = [].slice.call(arguments);
    if (exports.isWindows) {
        switch (command) {
            // case 'node':
            case 'npm':
            case 'yarn':
            case 'gulp':
                command += '.cmd';
                break;
            default:
        }
        command = command.replace(/\//g, '\\');
    }
    return spawn(command, ...argsAndOption);
}
exports.exe = exe;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxNQUFNLFVBQVUsR0FBb0IsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzlDLFFBQUEsU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDO0FBV3REOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsSUFBSSxHQUFpQixDQUFDO0lBQ3RCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNuRSxHQUFHLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFB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QUMsQ0FBQyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUN4QixPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ2YsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILFNBQWdCLFlBQVksQ0FBQyxPQUFlLEVBQUUsR0FBRyxhQUFtQztJQUNsRixPQUFPLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDaEQsQ0FBQztBQUZELG9DQUVDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLEdBQUcsQ0FBQyxPQUFlLEVBQUUsR0FBRyxhQUFtQztJQUN6RSx1Q0FBdUM7SUFDdkMsSUFBSSxpQkFBUyxFQUFFO1FBQ2IsUUFBUSxPQUFPLEVBQUU7WUFDZixlQUFlO1lBQ2YsS0FBSyxLQUFLLENBQUM7WUFDWCxLQUFLLE1BQU0sQ0FBQztZQUNaLEtBQUssTUFBTTtnQkFDVCxPQUFPLElBQUksTUFBTSxDQUFDO2dCQUNsQixNQUFNO1lBQ1IsUUFBUTtTQUNUO1FBQ0QsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3hDO0lBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQWZELGtCQWVDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSBpbmRlbnQgKi9cbmltcG9ydCB7c3Bhd24gYXMgc3lzU3Bhd24sIENoaWxkUHJvY2VzcywgU3Bhd25PcHRpb25zfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmNvbnN0IGNyb3NzU3Bhd246IHR5cGVvZiBzeXNTcGF3biA9IHJlcXVpcmUoJ2Nyb3NzLXNwYXduJyk7XG5leHBvcnQgY29uc3QgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb24gZXh0ZW5kcyBTcGF3bk9wdGlvbnMge1xuICB0aW1lb3V0PzogbnVtYmVyO1xuICBzaWxlbnQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdCB7XG4gIGNoaWxkUHJvY2VzczogQ2hpbGRQcm9jZXNzO1xuICBwcm9taXNlOiBQcm9taXNlPHN0cmluZz47XG59XG4vKipcbiAqIFNwYXduIHByb2Nlc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZFxuICogQHBhcmFtICB7c3RyaW5nW119IGFyZ3NcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICogICBPdGhlciBvcHRzIHByb3BlcnRpZXMgd2lsbCBiZSBwYXNzZWQgdG8gY2hpbGRfcHJvY2Vzcy5zcGF3bigpXG4gKlxuICogQHJldHVybiB7UHJvbWlzZX0gcmVqZWN0ZWQgaWYgY2hpbGQgcHJvY2VzcyBleGl0cyB3aXRoIG5vbi16ZXJvIGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb21pc2lmeVNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOlxuICBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gc3Bhd24oY29tbWFuZCwgLi4uYXJncykucHJvbWlzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBSZXN1bHQge1xuICBsZXQgb3B0czogYW55ID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIC0xKTtcbiAgfVxuXG4gIGlmIChvcHRzID09IG51bGwpIHtcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBpZiAoIShvcHRzICYmIG9wdHMuc2lsZW50KSkge1xuICAgIG9wdHMuc3RkaW8gPSAnaW5oZXJpdCc7XG4gIH1cbiAgbGV0IHJlczogQ2hpbGRQcm9jZXNzO1xuICBjb25zdCBwcm9taXNlID0gY2hlY2tUaW1lb3V0KG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJlcyA9IGNyb3NzU3Bhd24oY29tbWFuZCwgYXJncyBhcyBzdHJpbmdbXSwgb3B0cyk7XG4gICAgLy8gY29uc29sZS5sb2coY29tbWFuZCwgYXJncyk7XG4gICAgbGV0IG91dHB1dDogc3RyaW5nO1xuICAgIGlmIChvcHRzICYmIG9wdHMuc2lsZW50KSB7XG4gICAgICBvdXRwdXQgPSAnJztcbiAgICAgIHJlcy5zdGRvdXQuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgICByZXMuc3Rkb3V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgICAgcmVzLnN0ZGVyci5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRlcnIub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJlcy5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgICByZXMub24oJ2V4aXQnLCBmdW5jdGlvbihjb2RlLCBzaWduYWwpIHtcbiAgICAgIGlmIChjb2RlICE9PSAwICYmIHNpZ25hbCAhPT0gJ1NJR0lOVCcpIHtcbiAgICAgICAgY29uc3QgZXJyTXNnID0gYENoaWxkIHByb2Nlc3MgZXhpdCB3aXRoIGNvZGUgJHtjb2RlfSwgc2lnbmFsIGAgKyBzaWduYWw7XG4gICAgICAgIGlmIChvcHRzID09IG51bGwgfHwgb3B0cy5zaWxlbnQgIT09IHRydWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnJNc2cpO1xuICAgICAgICAgIGlmIChvdXRwdXQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG91dHB1dCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGVyck1zZyArICdcXG4nICsgKG91dHB1dCA/IG91dHB1dCA6ICcnKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShvdXRwdXQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KSwgb3B0cy50aW1lb3V0KVxuICAuY2F0Y2goZSA9PiB7XG4gICAgaWYgKGUubWVzc2FnZSA9PT0gJ1RpbWVvdXQnICYmIHJlcykge1xuICAgICAgY29uc29sZS5sb2coJ0tpbGwgdGhlIGNoaWxkIHByb2Nlc3MnKTtcbiAgICAgIHJlcy5raWxsKCdTSUdIVVAnKTtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgY2hpbGRQcm9jZXNzOiByZXMhLFxuICAgIHByb21pc2VcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2hlY2tUaW1lb3V0PFQ+KG9yaWdQcm9taXNlOiBQcm9taXNlPFQ+LCB0aW1lQm94ID0gNjAwMDAwKTogUHJvbWlzZTxUPiB7XG4gIGxldCB0aW1lb3V0OiBOb2RlSlMuVGltZXIgfCBudWxsO1xuICByZXR1cm4gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIG9yaWdQcm9taXNlLnRoZW4ocmVzID0+IHtcbiAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUocmVzKTtcbiAgICB9KS5jYXRjaChlID0+IHtcbiAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIHJlamVjdChlKTtcbiAgICB9KTtcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSk7XG4gICAgfSwgdGltZUJveCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpeCBzb21lIGV4ZWN1dGFibGUgY29tbWFuZCBmb3Igd2luZG93c1xuICogQHBhcmFtICB7c3RyaW5nfSBjb21tYW5kICAgICBbZGVzY3JpcHRpb25dXG4gKiBAcGFyYW0gIHsuLi5zdHJpbmcgfCBhcnJheX0gY29tbWFuZEFyZ3MgLi4uIGFyZ3VtZW50c1xuICogQHBhcmFtICB7b2JqZWN0fSBvcHRzIG9wdGlvbmFsXG4gKiAgIC0ge2Jvb2xlYW59IG9wdHMuc2lsZW50ICBjaGlsZCBwcm9jZXNzJ3MgYHN0ZG91dGAgYW5kIGBzdGRlcnJgIHN0cmVhbSB3aWxsXG4gKiAgIG5vdCBwaXBlIHRvIHByb2Nlc3Muc3Rkb3V0IGFuZCBzdGRlcnIsIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB0b1xuICogICBzdHJpbmcgb2Ygc3Rkb3V0XG4gKlxuICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgIHJlamVjdGVkIGlmIGNoaWxkIHByb2Nlc3MgZXhpdHMgd2l0aCBub24temVybyBjb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9taXNpZnlFeGUoY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzQW5kT3B0aW9uOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBleGUoY29tbWFuZCwgLi4uYXJnc0FuZE9wdGlvbikucHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IGNvbW1hbmRcbiAqIEBwYXJhbSB7Kn0gYXJnc0FuZE9wdGlvblxuICogQHJldHVybiB7b2JqZWN0fSB7cHJvbWlzZTogUHJvbWlzZSwgY2hpbGRQcm9jZXNzOiBjaGlsZF9wcm9jZXNzfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBSZXN1bHQge1xuICAvLyB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgaWYgKGlzV2luZG93cykge1xuICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgLy8gY2FzZSAnbm9kZSc6XG4gICAgICBjYXNlICducG0nOlxuICAgICAgY2FzZSAneWFybic6XG4gICAgICBjYXNlICdndWxwJzpcbiAgICAgICAgY29tbWFuZCArPSAnLmNtZCc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICB9XG4gICAgY29tbWFuZCA9IGNvbW1hbmQucmVwbGFjZSgvXFwvL2csICdcXFxcJyk7XG4gIH1cbiAgcmV0dXJuIHNwYXduKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pO1xufVxuIl19