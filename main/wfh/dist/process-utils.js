"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exe = exports.promisifyExe = exports.spawn = exports.promisifySpawn = exports.isWindows = void 0;
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
            res.stdout.resume();
            res.stderr.resume();
        }
        res.on('error', (err) => {
            reject(err);
        });
        res.on('exit', function (code, signal) {
            if (code !== 0 && signal !== 'SIGINT') {
                const errMsg = `Child process "${command} ${args.join(' ')}" exit with code ${code}, signal ` + signal;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQXNDO0FBQ3RDLGlEQUE0RTtBQUMvRCxRQUFBLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQztBQVd0RDs7Ozs7Ozs7Ozs7R0FXRztBQUNILFNBQWdCLGNBQWMsQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUEwQjtJQUUzRSxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDekMsQ0FBQztBQUhELHdDQUdDO0FBRUQsU0FBZ0IsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBQ2xFLElBQUksSUFBSSxHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBVyxDQUFDO0lBQ25ELElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1FBQzVCLElBQUksR0FBRyxFQUFFLENBQUM7S0FDWDtTQUFNO1FBQ0wsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDMUI7SUFFRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7UUFDaEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO0lBRUQsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUMxQixJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQztLQUN4QjtJQUVELElBQUksR0FBaUIsQ0FBQztJQUN0QixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDbkUsR0FBRyxHQUFHLHFCQUFRLENBQUMsT0FBTyxFQUFFLElBQWdCLEVBQUUsSUFBSSxD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LENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDWCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdkI7WUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3hCLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDZixNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUMvQixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLE9BQWUsRUFBRSxHQUFHLGFBQW1DO0lBQ2xGLE9BQU8sR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNoRCxDQUFDO0FBRkQsb0NBRUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLE9BQWUsRUFBRSxHQUFHLGFBQW1DO0lBQ3pFLHVDQUF1QztJQUN2QyxJQUFJLGlCQUFTLEVBQUU7UUFDYixRQUFRLE9BQU8sRUFBRTtZQUNmLGVBQWU7WUFDZixLQUFLLEtBQUssQ0FBQztZQUNYLEtBQUssTUFBTSxDQUFDO1lBQ1osS0FBSyxNQUFNO2dCQUNULE9BQU8sSUFBSSxNQUFNLENBQUM7Z0JBQ2xCLE1BQU07WUFDUixRQUFRO1NBQ1Q7UUFDRCxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDeEM7SUFDRCxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxhQUFhLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBZkQsa0JBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlIGluZGVudCAqL1xuaW1wb3J0IHtzcGF3biBhcyBzeXNTcGF3biwgQ2hpbGRQcm9jZXNzLCBTcGF3bk9wdGlvbnN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuZXhwb3J0IGNvbnN0IGlzV2luZG93cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9uIGV4dGVuZHMgU3Bhd25PcHRpb25zIHtcbiAgdGltZW91dD86IG51bWJlcjtcbiAgc2lsZW50PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHQge1xuICBjaGlsZFByb2Nlc3M6IENoaWxkUHJvY2VzcztcbiAgcHJvbWlzZTogUHJvbWlzZTxzdHJpbmc+O1xufVxuLyoqXG4gKiBTcGF3biBwcm9jZXNzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGNvbW1hbmRcbiAqIEBwYXJhbSAge3N0cmluZ1tdfSBhcmdzXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9wdHMgb3B0aW9uYWxcbiAqICAgLSB7Ym9vbGVhbn0gb3B0cy5zaWxlbnQgIGNoaWxkIHByb2Nlc3MncyBgc3Rkb3V0YCBhbmQgYHN0ZGVycmAgc3RyZWFtIHdpbGxcbiAqICAgbm90IHBpcGUgdG8gcHJvY2Vzcy5zdGRvdXQgYW5kIHN0ZGVyciwgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHRvXG4gKiAgIHN0cmluZyBvZiBzdGRvdXRcbiAqICAgT3RoZXIgb3B0cyBwcm9wZXJ0aWVzIHdpbGwgYmUgcGFzc2VkIHRvIGNoaWxkX3Byb2Nlc3Muc3Bhd24oKVxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlamVjdGVkIGlmIGNoaWxkIHByb2Nlc3MgZXhpdHMgd2l0aCBub24temVybyBjb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9taXNpZnlTcGF3bihjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3M6IEFycmF5PHN0cmluZ3xPcHRpb24+KTpcbiAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIHNwYXduKGNvbW1hbmQsIC4uLmFyZ3MpLnByb21pc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGF3bihjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3M6IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgbGV0IG9wdHM6IE9wdGlvbiA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXSBhcyBPcHRpb247XG4gIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpIHtcbiAgICBvcHRzID0ge307XG4gIH0gZWxzZSB7XG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgLTEpO1xuICB9XG5cbiAgaWYgKG9wdHMgPT0gbnVsbCkge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGlmICghKG9wdHMgJiYgb3B0cy5zaWxlbnQpKSB7XG4gICAgb3B0cy5zdGRpbyA9ICdpbmhlcml0JztcbiAgfVxuXG4gIGxldCByZXM6IENoaWxkUHJvY2VzcztcbiAgY29uc3QgcHJvbWlzZSA9IGNoZWNrVGltZW91dChuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXMgPSBzeXNTcGF3bihjb21tYW5kLCBhcmdzIGFzIHN0cmluZ1tdLCBvcHRzKTtcbiAgICAvLyBjb25zb2xlLmxvZyhjb21tYW5kLCBhcmdzKTtcbiAgICBsZXQgb3V0cHV0OiBzdHJpbmc7XG4gICAgaWYgKG9wdHMgJiYgb3B0cy5zaWxlbnQpIHtcbiAgICAgIG91dHB1dCA9ICcnO1xuICAgICAgcmVzLnN0ZG91dCEuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgICByZXMuc3Rkb3V0IS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgICBvdXRwdXQgKz0gY2h1bms7XG4gICAgICB9KTtcbiAgICAgIHJlcy5zdGRlcnIhLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgICAgcmVzLnN0ZGVyciEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgICAgfSk7XG4gICAgICByZXMuc3Rkb3V0IS5yZXN1bWUoKTtcbiAgICAgIHJlcy5zdGRlcnIhLnJlc3VtZSgpO1xuICAgIH1cbiAgICByZXMub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfSk7XG4gICAgcmVzLm9uKCdleGl0JywgZnVuY3Rpb24oY29kZSwgc2lnbmFsKSB7XG4gICAgICBpZiAoY29kZSAhPT0gMCAmJiBzaWduYWwgIT09ICdTSUdJTlQnKSB7XG4gICAgICAgIGNvbnN0IGVyck1zZyA9IGBDaGlsZCBwcm9jZXNzIFwiJHtjb21tYW5kfSAke2FyZ3Muam9pbignICcpfVwiIGV4aXQgd2l0aCBjb2RlICR7Y29kZX0sIHNpZ25hbCBgICsgc2lnbmFsO1xuICAgICAgICBpZiAob3B0cyA9PSBudWxsIHx8IG9wdHMuc2lsZW50ICE9PSB0cnVlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyTXNnKTtcbiAgICAgICAgICBpZiAob3V0cHV0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhvdXRwdXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihlcnJNc2cgKyAnXFxuJyArIChvdXRwdXQgPyBvdXRwdXQgOiAnJykpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUob3V0cHV0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSksIG9wdHMudGltZW91dClcbiAgLmNhdGNoKGUgPT4ge1xuICAgIGlmIChlLm1lc3NhZ2UgPT09ICdUaW1lb3V0JyAmJiByZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdLaWxsIHRoZSBjaGlsZCBwcm9jZXNzJyk7XG4gICAgICByZXMua2lsbCgnU0lHSFVQJyk7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIGNoaWxkUHJvY2VzczogcmVzISxcbiAgICBwcm9taXNlXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrVGltZW91dDxUPihvcmlnUHJvbWlzZTogUHJvbWlzZTxUPiwgdGltZUJveCA9IDYwMDAwMCk6IFByb21pc2U8VD4ge1xuICBsZXQgdGltZW91dDogTm9kZUpTLlRpbWVyIHwgbnVsbDtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBvcmlnUHJvbWlzZS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHJlcyk7XG4gICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZWplY3QoZSk7XG4gICAgfSk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpO1xuICAgIH0sIHRpbWVCb3gpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaXggc29tZSBleGVjdXRhYmxlIGNvbW1hbmQgZm9yIHdpbmRvd3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZCAgICAgW2Rlc2NyaXB0aW9uXVxuICogQHBhcmFtICB7Li4uc3RyaW5nIHwgYXJyYXl9IGNvbW1hbmRBcmdzIC4uLiBhcmd1bWVudHNcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5RXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gZXhlKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pLnByb21pc2U7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSBjb21tYW5kXG4gKiBAcGFyYW0geyp9IGFyZ3NBbmRPcHRpb25cbiAqIEByZXR1cm4ge29iamVjdH0ge3Byb21pc2U6IFByb21pc2UsIGNoaWxkUHJvY2VzczogY2hpbGRfcHJvY2Vzc31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgLy8gdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgIC8vIGNhc2UgJ25vZGUnOlxuICAgICAgY2FzZSAnbnBtJzpcbiAgICAgIGNhc2UgJ3lhcm4nOlxuICAgICAgY2FzZSAnZ3VscCc6XG4gICAgICAgIGNvbW1hbmQgKz0gJy5jbWQnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjb21tYW5kLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpO1xuICB9XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKTtcbn1cbiJdfQ==