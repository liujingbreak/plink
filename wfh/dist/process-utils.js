"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable:no-console indent */
const child_process_1 = require("child_process");
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
        res = child_process_1.spawn(command, args, opts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzQ0FBc0M7QUFDdEMsaURBQTRFO0FBQy9ELFFBQUEsU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDO0FBV3REOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsSUFBSSxHQUFpQixDQUFDO0lBQ3RCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNuRSxHQUFHLEdBQUcscUJBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRCw4QkFBOEI7UUFDOUIsSUFBSSxNQUFjLENBQUM7UUFDbkIsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUN2QixNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ1osR0FBRyxDQUFDLE1BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakMsR0FBRyxDQUFDLE1BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUM7WUFDbEIsQ0FBQyxDQUFDLENBQUM7WUFDSCxHQUFHLENBQUMsTUFBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqQyxHQUFHLENBQUMsTUFBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUN0QixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQVMsSUFBSSxFQUFFLE1BQU07WUFDbEMsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7Z0JBQ3JDLE1BQU0sTUFBTSxHQUFHLGdDQUFnQyxJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUM7Z0JBQ3hFLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLElBQUksRUFBRTtvQkFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDcEIsSUFBSSxNQUFNLEVBQUU7d0JBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztxQkFDckI7aUJBQ0Y7Z0JBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbEU7aUJBQU07Z0JBQ0wsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2pCO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO1NBQ2hCLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNULElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxTQUFTLElBQUksR0FBRyxFQUFFO1lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3BCO1FBQ0QsTUFBTSxDQUFDLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU87UUFDTCxZQUFZLEVBQUUsR0FBSTtRQUNsQixPQUFPO0tBQ1IsQ0FBQztBQUNKLENBQUM7QUE1REQsc0JBNERDO0FBRUQsU0FBUyxZQUFZLENBQUksV0FBdUIsRUFBRSxPQUFPLEdBQUcsTUFBTTtJQUNoRSxJQUFJLE9BQTRCLENBQUM7SUFDakMsT0FBTyxJQUFJLE9BQU8sQ0FBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN4QyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLElBQUksT0FBTyxFQUFFO2dCQUNYLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUN2QjtZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNYLElBQUksT0FBTyxFQUFFO2dCQUNYLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUN2QjtZQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNaLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDeEIsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNmLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQy9CLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNkLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxTQUFnQixZQUFZLENBQUMsT0FBZSxFQUFFLEdBQUcsYUFBbUM7SUFDbEYsT0FBTyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ2hELENBQUM7QUFGRCxvQ0FFQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFnQixHQUFHLENBQUMsT0FBZSxFQUFFLEdBQUcsYUFBbUM7SUFDekUsdUNBQXVDO0lBQ3ZDLElBQUksaUJBQVMsRUFBRTtRQUNiLFFBQVEsT0FBTyxFQUFFO1lBQ2YsZUFBZTtZQUNmLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLE1BQU07Z0JBQ1QsT0FBTyxJQUFJLE1BQU0sQ0FBQztnQkFDbEIsTUFBTTtZQUNSLFFBQVE7U0FDVDtRQUNELE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4QztJQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFmRCxrQkFlQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgaW5kZW50ICovXG5pbXBvcnQge3NwYXduIGFzIHN5c1NwYXduLCBDaGlsZFByb2Nlc3MsIFNwYXduT3B0aW9uc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5leHBvcnQgY29uc3QgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb24gZXh0ZW5kcyBTcGF3bk9wdGlvbnMge1xuICB0aW1lb3V0PzogbnVtYmVyO1xuICBzaWxlbnQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdCB7XG4gIGNoaWxkUHJvY2VzczogQ2hpbGRQcm9jZXNzO1xuICBwcm9taXNlOiBQcm9taXNlPHN0cmluZz47XG59XG4vKipcbiAqIFNwYXduIHByb2Nlc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZFxuICogQHBhcmFtICB7c3RyaW5nW119IGFyZ3NcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICogICBPdGhlciBvcHRzIHByb3BlcnRpZXMgd2lsbCBiZSBwYXNzZWQgdG8gY2hpbGRfcHJvY2Vzcy5zcGF3bigpXG4gKlxuICogQHJldHVybiB7UHJvbWlzZX0gcmVqZWN0ZWQgaWYgY2hpbGQgcHJvY2VzcyBleGl0cyB3aXRoIG5vbi16ZXJvIGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb21pc2lmeVNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOlxuICBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gc3Bhd24oY29tbWFuZCwgLi4uYXJncykucHJvbWlzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBSZXN1bHQge1xuICBsZXQgb3B0czogYW55ID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIC0xKTtcbiAgfVxuXG4gIGlmIChvcHRzID09IG51bGwpIHtcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBpZiAoIShvcHRzICYmIG9wdHMuc2lsZW50KSkge1xuICAgIG9wdHMuc3RkaW8gPSAnaW5oZXJpdCc7XG4gIH1cbiAgbGV0IHJlczogQ2hpbGRQcm9jZXNzO1xuICBjb25zdCBwcm9taXNlID0gY2hlY2tUaW1lb3V0KG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJlcyA9IHN5c1NwYXduKGNvbW1hbmQsIGFyZ3MgYXMgc3RyaW5nW10sIG9wdHMpO1xuICAgIC8vIGNvbnNvbGUubG9nKGNvbW1hbmQsIGFyZ3MpO1xuICAgIGxldCBvdXRwdXQ6IHN0cmluZztcbiAgICBpZiAob3B0cyAmJiBvcHRzLnNpbGVudCkge1xuICAgICAgb3V0cHV0ID0gJyc7XG4gICAgICByZXMuc3Rkb3V0IS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRvdXQhLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgICAgcmVzLnN0ZGVyciEuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgICByZXMuc3RkZXJyIS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgICBvdXRwdXQgKz0gY2h1bms7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmVzLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH0pO1xuICAgIHJlcy5vbignZXhpdCcsIGZ1bmN0aW9uKGNvZGUsIHNpZ25hbCkge1xuICAgICAgaWYgKGNvZGUgIT09IDAgJiYgc2lnbmFsICE9PSAnU0lHSU5UJykge1xuICAgICAgICBjb25zdCBlcnJNc2cgPSBgQ2hpbGQgcHJvY2VzcyBleGl0IHdpdGggY29kZSAke2NvZGV9LCBzaWduYWwgYCArIHNpZ25hbDtcbiAgICAgICAgaWYgKG9wdHMgPT0gbnVsbCB8fCBvcHRzLnNpbGVudCAhPT0gdHJ1ZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGVyck1zZyk7XG4gICAgICAgICAgaWYgKG91dHB1dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cob3V0cHV0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoZXJyTXNnICsgJ1xcbicgKyAob3V0cHV0ID8gb3V0cHV0IDogJycpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKG91dHB1dCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pLCBvcHRzLnRpbWVvdXQpXG4gIC5jYXRjaChlID0+IHtcbiAgICBpZiAoZS5tZXNzYWdlID09PSAnVGltZW91dCcgJiYgcmVzKSB7XG4gICAgICBjb25zb2xlLmxvZygnS2lsbCB0aGUgY2hpbGQgcHJvY2VzcycpO1xuICAgICAgcmVzLmtpbGwoJ1NJR0hVUCcpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjaGlsZFByb2Nlc3M6IHJlcyEsXG4gICAgcHJvbWlzZVxuICB9O1xufVxuXG5mdW5jdGlvbiBjaGVja1RpbWVvdXQ8VD4ob3JpZ1Byb21pc2U6IFByb21pc2U8VD4sIHRpbWVCb3ggPSA2MDAwMDApOiBQcm9taXNlPFQ+IHtcbiAgbGV0IHRpbWVvdXQ6IE5vZGVKUy5UaW1lciB8IG51bGw7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgb3JpZ1Byb21pc2UudGhlbihyZXMgPT4ge1xuICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShyZXMpO1xuICAgIH0pLmNhdGNoKGUgPT4ge1xuICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgfVxuICAgICAgcmVqZWN0KGUpO1xuICAgIH0pO1xuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKTtcbiAgICB9LCB0aW1lQm94KTtcbiAgfSk7XG59XG5cbi8qKlxuICogRml4IHNvbWUgZXhlY3V0YWJsZSBjb21tYW5kIGZvciB3aW5kb3dzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGNvbW1hbmQgICAgIFtkZXNjcmlwdGlvbl1cbiAqIEBwYXJhbSAgey4uLnN0cmluZyB8IGFycmF5fSBjb21tYW5kQXJncyAuLi4gYXJndW1lbnRzXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9wdHMgb3B0aW9uYWxcbiAqICAgLSB7Ym9vbGVhbn0gb3B0cy5zaWxlbnQgIGNoaWxkIHByb2Nlc3MncyBgc3Rkb3V0YCBhbmQgYHN0ZGVycmAgc3RyZWFtIHdpbGxcbiAqICAgbm90IHBpcGUgdG8gcHJvY2Vzcy5zdGRvdXQgYW5kIHN0ZGVyciwgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHRvXG4gKiAgIHN0cmluZyBvZiBzdGRvdXRcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgcmVqZWN0ZWQgaWYgY2hpbGQgcHJvY2VzcyBleGl0cyB3aXRoIG5vbi16ZXJvIGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb21pc2lmeUV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIGV4ZShjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKS5wcm9taXNlO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gY29tbWFuZFxuICogQHBhcmFtIHsqfSBhcmdzQW5kT3B0aW9uXG4gKiBAcmV0dXJuIHtvYmplY3R9IHtwcm9taXNlOiBQcm9taXNlLCBjaGlsZFByb2Nlc3M6IGNoaWxkX3Byb2Nlc3N9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGUoY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzQW5kT3B0aW9uOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFJlc3VsdCB7XG4gIC8vIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICBpZiAoaXNXaW5kb3dzKSB7XG4gICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAvLyBjYXNlICdub2RlJzpcbiAgICAgIGNhc2UgJ25wbSc6XG4gICAgICBjYXNlICd5YXJuJzpcbiAgICAgIGNhc2UgJ2d1bHAnOlxuICAgICAgICBjb21tYW5kICs9ICcuY21kJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgIH1cbiAgICBjb21tYW5kID0gY29tbWFuZC5yZXBsYWNlKC9cXC8vZywgJ1xcXFwnKTtcbiAgfVxuICByZXR1cm4gc3Bhd24oY29tbWFuZCwgLi4uYXJnc0FuZE9wdGlvbik7XG59XG4iXX0=