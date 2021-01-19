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
        const allDone = [];
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
            allDone.push(new Promise(resolve => res.stdout.on('end', resolve)), new Promise(resolve => res.stderr.on('end', resolve)));
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
                Promise.all(allDone)
                    .then(() => resolve(output));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQXNDO0FBQ3RDLGlEQUE0RTtBQUMvRCxRQUFBLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQztBQVd0RDs7Ozs7Ozs7Ozs7R0FXRztBQUNILFNBQWdCLGNBQWMsQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUEwQjtJQUUzRSxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDekMsQ0FBQztBQUhELHdDQUdDO0FBRUQsU0FBZ0IsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBQ2xFLElBQUksSUFBSSxHQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBVyxDQUFDO0lBQ25ELElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1FBQzVCLElBQUksR0FBRyxFQUFFLENBQUM7S0FDWDtTQUFNO1FBQ0wsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDMUI7SUFFRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7UUFDaEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO0lBRUQsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUMxQixJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQztLQUN4QjtJQUVELElBQUksR0FBaUIsQ0FBQztJQUV0QixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDbkUsTUFBTSxPQUFPLEdBQW1CLEVBQUUsQ0FBQztRQUNuQyxHQUFHLEdBQUcscUJBQVEs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WUFDZixLQUFLLEtBQUssQ0FBQztZQUNYLEtBQUssTUFBTSxDQUFDO1lBQ1osS0FBSyxNQUFNO2dCQUNULE9BQU8sSUFBSSxNQUFNLENBQUM7Z0JBQ2xCLE1BQU07WUFDUixRQUFRO1NBQ1Q7UUFDRCxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDeEM7SUFDRCxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxhQUFhLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBZkQsa0JBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlIGluZGVudCAqL1xuaW1wb3J0IHtzcGF3biBhcyBzeXNTcGF3biwgQ2hpbGRQcm9jZXNzLCBTcGF3bk9wdGlvbnN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuZXhwb3J0IGNvbnN0IGlzV2luZG93cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9uIGV4dGVuZHMgU3Bhd25PcHRpb25zIHtcbiAgdGltZW91dD86IG51bWJlcjtcbiAgc2lsZW50PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHQge1xuICBjaGlsZFByb2Nlc3M6IENoaWxkUHJvY2VzcztcbiAgcHJvbWlzZTogUHJvbWlzZTxzdHJpbmc+O1xufVxuLyoqXG4gKiBTcGF3biBwcm9jZXNzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGNvbW1hbmRcbiAqIEBwYXJhbSAge3N0cmluZ1tdfSBhcmdzXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9wdHMgb3B0aW9uYWxcbiAqICAgLSB7Ym9vbGVhbn0gb3B0cy5zaWxlbnQgIGNoaWxkIHByb2Nlc3MncyBgc3Rkb3V0YCBhbmQgYHN0ZGVycmAgc3RyZWFtIHdpbGxcbiAqICAgbm90IHBpcGUgdG8gcHJvY2Vzcy5zdGRvdXQgYW5kIHN0ZGVyciwgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHRvXG4gKiAgIHN0cmluZyBvZiBzdGRvdXRcbiAqICAgT3RoZXIgb3B0cyBwcm9wZXJ0aWVzIHdpbGwgYmUgcGFzc2VkIHRvIGNoaWxkX3Byb2Nlc3Muc3Bhd24oKVxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlamVjdGVkIGlmIGNoaWxkIHByb2Nlc3MgZXhpdHMgd2l0aCBub24temVybyBjb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9taXNpZnlTcGF3bihjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3M6IEFycmF5PHN0cmluZ3xPcHRpb24+KTpcbiAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIHNwYXduKGNvbW1hbmQsIC4uLmFyZ3MpLnByb21pc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGF3bihjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3M6IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgbGV0IG9wdHM6IE9wdGlvbiA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXSBhcyBPcHRpb247XG4gIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpIHtcbiAgICBvcHRzID0ge307XG4gIH0gZWxzZSB7XG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgLTEpO1xuICB9XG5cbiAgaWYgKG9wdHMgPT0gbnVsbCkge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGlmICghKG9wdHMgJiYgb3B0cy5zaWxlbnQpKSB7XG4gICAgb3B0cy5zdGRpbyA9ICdpbmhlcml0JztcbiAgfVxuXG4gIGxldCByZXM6IENoaWxkUHJvY2VzcztcblxuICBjb25zdCBwcm9taXNlID0gY2hlY2tUaW1lb3V0KG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGFsbERvbmU6IFByb21pc2U8YW55PltdID0gW107XG4gICAgcmVzID0gc3lzU3Bhd24oY29tbWFuZCwgYXJncyBhcyBzdHJpbmdbXSwgb3B0cyk7XG4gICAgLy8gY29uc29sZS5sb2coY29tbWFuZCwgYXJncyk7XG4gICAgbGV0IG91dHB1dDogc3RyaW5nO1xuICAgIGlmIChvcHRzICYmIG9wdHMuc2lsZW50KSB7XG4gICAgICBvdXRwdXQgPSAnJztcbiAgICAgIHJlcy5zdGRvdXQhLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgICAgcmVzLnN0ZG91dCEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgICAgfSk7XG4gICAgICByZXMuc3RkZXJyIS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRlcnIhLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgICAgcmVzLnN0ZG91dCEucmVzdW1lKCk7XG4gICAgICByZXMuc3RkZXJyIS5yZXN1bWUoKTtcbiAgICAgIGFsbERvbmUucHVzaChcbiAgICAgICAgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiByZXMuc3Rkb3V0IS5vbignZW5kJywgcmVzb2x2ZSkpLFxuICAgICAgICBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHJlcy5zdGRlcnIhLm9uKCdlbmQnLCByZXNvbHZlKSlcbiAgICAgICk7XG4gICAgfVxuICAgIHJlcy5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgICByZXMub24oJ2V4aXQnLCBmdW5jdGlvbihjb2RlLCBzaWduYWwpIHtcbiAgICAgIGlmIChjb2RlICE9PSAwICYmIHNpZ25hbCAhPT0gJ1NJR0lOVCcpIHtcbiAgICAgICAgY29uc3QgZXJyTXNnID0gYENoaWxkIHByb2Nlc3MgXCIke2NvbW1hbmR9ICR7YXJncy5qb2luKCcgJyl9XCIgZXhpdCB3aXRoIGNvZGUgJHtjb2RlfSwgc2lnbmFsIGAgKyBzaWduYWw7XG4gICAgICAgIGlmIChvcHRzID09IG51bGwgfHwgb3B0cy5zaWxlbnQgIT09IHRydWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnJNc2cpO1xuICAgICAgICAgIGlmIChvdXRwdXQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG91dHB1dCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGVyck1zZyArICdcXG4nICsgKG91dHB1dCA/IG91dHB1dCA6ICcnKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgUHJvbWlzZS5hbGwoYWxsRG9uZSlcbiAgICAgICAgLnRoZW4oKCkgPT4gcmVzb2x2ZShvdXRwdXQpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSksIG9wdHMudGltZW91dClcbiAgLmNhdGNoKGUgPT4ge1xuICAgIGlmIChlLm1lc3NhZ2UgPT09ICdUaW1lb3V0JyAmJiByZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdLaWxsIHRoZSBjaGlsZCBwcm9jZXNzJyk7XG4gICAgICByZXMua2lsbCgnU0lHSFVQJyk7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIGNoaWxkUHJvY2VzczogcmVzISxcbiAgICBwcm9taXNlXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrVGltZW91dDxUPihvcmlnUHJvbWlzZTogUHJvbWlzZTxUPiwgdGltZUJveCA9IDYwMDAwMCk6IFByb21pc2U8VD4ge1xuICBsZXQgdGltZW91dDogTm9kZUpTLlRpbWVyIHwgbnVsbDtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBvcmlnUHJvbWlzZS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHJlcyk7XG4gICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZWplY3QoZSk7XG4gICAgfSk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpO1xuICAgIH0sIHRpbWVCb3gpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaXggc29tZSBleGVjdXRhYmxlIGNvbW1hbmQgZm9yIHdpbmRvd3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZCAgICAgW2Rlc2NyaXB0aW9uXVxuICogQHBhcmFtICB7Li4uc3RyaW5nIHwgYXJyYXl9IGNvbW1hbmRBcmdzIC4uLiBhcmd1bWVudHNcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5RXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gZXhlKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pLnByb21pc2U7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSBjb21tYW5kXG4gKiBAcGFyYW0geyp9IGFyZ3NBbmRPcHRpb25cbiAqIEByZXR1cm4ge29iamVjdH0ge3Byb21pc2U6IFByb21pc2UsIGNoaWxkUHJvY2VzczogY2hpbGRfcHJvY2Vzc31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgLy8gdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgIC8vIGNhc2UgJ25vZGUnOlxuICAgICAgY2FzZSAnbnBtJzpcbiAgICAgIGNhc2UgJ3lhcm4nOlxuICAgICAgY2FzZSAnZ3VscCc6XG4gICAgICAgIGNvbW1hbmQgKz0gJy5jbWQnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjb21tYW5kLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpO1xuICB9XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKTtcbn1cbiJdfQ==