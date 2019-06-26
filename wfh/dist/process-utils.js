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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzQ0FBc0M7QUFDdEMsaURBQTRFO0FBQy9ELFFBQUEsU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDO0FBV3REOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsSUFBSSxHQUFpQixDQUFDO0lBQ3RCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNuRSxHQUFHLEdBQUcscUJBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBZ0IsRUFBRSxJQUFJLENB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QUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDeEIsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNmLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQy9CLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNkLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxTQUFnQixZQUFZLENBQUMsT0FBZSxFQUFFLEdBQUcsYUFBbUM7SUFDbEYsT0FBTyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ2hELENBQUM7QUFGRCxvQ0FFQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFnQixHQUFHLENBQUMsT0FBZSxFQUFFLEdBQUcsYUFBbUM7SUFDekUsdUNBQXVDO0lBQ3ZDLElBQUksaUJBQVMsRUFBRTtRQUNiLFFBQVEsT0FBTyxFQUFFO1lBQ2YsZUFBZTtZQUNmLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLE1BQU07Z0JBQ1QsT0FBTyxJQUFJLE1BQU0sQ0FBQztnQkFDbEIsTUFBTTtZQUNSLFFBQVE7U0FDVDtRQUNELE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4QztJQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFmRCxrQkFlQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgaW5kZW50ICovXG5pbXBvcnQge3NwYXduIGFzIHN5c1NwYXduLCBDaGlsZFByb2Nlc3MsIFNwYXduT3B0aW9uc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5leHBvcnQgY29uc3QgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb24gZXh0ZW5kcyBTcGF3bk9wdGlvbnMge1xuICB0aW1lb3V0PzogbnVtYmVyO1xuICBzaWxlbnQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdCB7XG4gIGNoaWxkUHJvY2VzczogQ2hpbGRQcm9jZXNzO1xuICBwcm9taXNlOiBQcm9taXNlPHN0cmluZz47XG59XG4vKipcbiAqIFNwYXduIHByb2Nlc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZFxuICogQHBhcmFtICB7c3RyaW5nW119IGFyZ3NcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICogICBPdGhlciBvcHRzIHByb3BlcnRpZXMgd2lsbCBiZSBwYXNzZWQgdG8gY2hpbGRfcHJvY2Vzcy5zcGF3bigpXG4gKlxuICogQHJldHVybiB7UHJvbWlzZX0gcmVqZWN0ZWQgaWYgY2hpbGQgcHJvY2VzcyBleGl0cyB3aXRoIG5vbi16ZXJvIGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb21pc2lmeVNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOlxuICBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gc3Bhd24oY29tbWFuZCwgLi4uYXJncykucHJvbWlzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBSZXN1bHQge1xuICBsZXQgb3B0czogYW55ID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIC0xKTtcbiAgfVxuXG4gIGlmIChvcHRzID09IG51bGwpIHtcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBpZiAoIShvcHRzICYmIG9wdHMuc2lsZW50KSkge1xuICAgIG9wdHMuc3RkaW8gPSAnaW5oZXJpdCc7XG4gIH1cbiAgbGV0IHJlczogQ2hpbGRQcm9jZXNzO1xuICBjb25zdCBwcm9taXNlID0gY2hlY2tUaW1lb3V0KG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJlcyA9IHN5c1NwYXduKGNvbW1hbmQsIGFyZ3MgYXMgc3RyaW5nW10sIG9wdHMpO1xuICAgIC8vIGNvbnNvbGUubG9nKGNvbW1hbmQsIGFyZ3MpO1xuICAgIGxldCBvdXRwdXQ6IHN0cmluZztcbiAgICBpZiAob3B0cyAmJiBvcHRzLnNpbGVudCkge1xuICAgICAgb3V0cHV0ID0gJyc7XG4gICAgICByZXMuc3Rkb3V0LnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgICAgcmVzLnN0ZG91dC5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgICBvdXRwdXQgKz0gY2h1bms7XG4gICAgICB9KTtcbiAgICAgIHJlcy5zdGRlcnIuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgICByZXMuc3RkZXJyLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXMub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfSk7XG4gICAgcmVzLm9uKCdleGl0JywgZnVuY3Rpb24oY29kZSwgc2lnbmFsKSB7XG4gICAgICBpZiAoY29kZSAhPT0gMCAmJiBzaWduYWwgIT09ICdTSUdJTlQnKSB7XG4gICAgICAgIGNvbnN0IGVyck1zZyA9IGBDaGlsZCBwcm9jZXNzIGV4aXQgd2l0aCBjb2RlICR7Y29kZX0sIHNpZ25hbCBgICsgc2lnbmFsO1xuICAgICAgICBpZiAob3B0cyA9PSBudWxsIHx8IG9wdHMuc2lsZW50ICE9PSB0cnVlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyTXNnKTtcbiAgICAgICAgICBpZiAob3V0cHV0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhvdXRwdXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihlcnJNc2cgKyAnXFxuJyArIChvdXRwdXQgPyBvdXRwdXQgOiAnJykpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUob3V0cHV0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSksIG9wdHMudGltZW91dClcbiAgLmNhdGNoKGUgPT4ge1xuICAgIGlmIChlLm1lc3NhZ2UgPT09ICdUaW1lb3V0JyAmJiByZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdLaWxsIHRoZSBjaGlsZCBwcm9jZXNzJyk7XG4gICAgICByZXMua2lsbCgnU0lHSFVQJyk7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIGNoaWxkUHJvY2VzczogcmVzISxcbiAgICBwcm9taXNlXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrVGltZW91dDxUPihvcmlnUHJvbWlzZTogUHJvbWlzZTxUPiwgdGltZUJveCA9IDYwMDAwMCk6IFByb21pc2U8VD4ge1xuICBsZXQgdGltZW91dDogTm9kZUpTLlRpbWVyIHwgbnVsbDtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBvcmlnUHJvbWlzZS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHJlcyk7XG4gICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZWplY3QoZSk7XG4gICAgfSk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpO1xuICAgIH0sIHRpbWVCb3gpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaXggc29tZSBleGVjdXRhYmxlIGNvbW1hbmQgZm9yIHdpbmRvd3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZCAgICAgW2Rlc2NyaXB0aW9uXVxuICogQHBhcmFtICB7Li4uc3RyaW5nIHwgYXJyYXl9IGNvbW1hbmRBcmdzIC4uLiBhcmd1bWVudHNcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5RXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gZXhlKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pLnByb21pc2U7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSBjb21tYW5kXG4gKiBAcGFyYW0geyp9IGFyZ3NBbmRPcHRpb25cbiAqIEByZXR1cm4ge29iamVjdH0ge3Byb21pc2U6IFByb21pc2UsIGNoaWxkUHJvY2VzczogY2hpbGRfcHJvY2Vzc31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgLy8gdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgIC8vIGNhc2UgJ25vZGUnOlxuICAgICAgY2FzZSAnbnBtJzpcbiAgICAgIGNhc2UgJ3lhcm4nOlxuICAgICAgY2FzZSAnZ3VscCc6XG4gICAgICAgIGNvbW1hbmQgKz0gJy5jbWQnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjb21tYW5kLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpO1xuICB9XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKTtcbn1cbiJdfQ==