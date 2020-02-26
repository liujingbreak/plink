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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzQ0FBc0M7QUFDdEMsaURBQTRFO0FBQy9ELFFBQUEsU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDO0FBV3REOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsSUFBSSxHQUFpQixDQUFDO0lBQ3RCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNuRSxHQUFHLEdBQUcscUJBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBZ0IsRUFBRSxJQUFJLENB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QUFDO2FBQ3ZCO1lBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUN4QixPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ2YsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILFNBQWdCLFlBQVksQ0FBQyxPQUFlLEVBQUUsR0FBRyxhQUFtQztJQUNsRixPQUFPLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDaEQsQ0FBQztBQUZELG9DQUVDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQWdCLEdBQUcsQ0FBQyxPQUFlLEVBQUUsR0FBRyxhQUFtQztJQUN6RSx1Q0FBdUM7SUFDdkMsSUFBSSxpQkFBUyxFQUFFO1FBQ2IsUUFBUSxPQUFPLEVBQUU7WUFDZixlQUFlO1lBQ2YsS0FBSyxLQUFLLENBQUM7WUFDWCxLQUFLLE1BQU0sQ0FBQztZQUNaLEtBQUssTUFBTTtnQkFDVCxPQUFPLElBQUksTUFBTSxDQUFDO2dCQUNsQixNQUFNO1lBQ1IsUUFBUTtTQUNUO1FBQ0QsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3hDO0lBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQWZELGtCQWVDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSBpbmRlbnQgKi9cbmltcG9ydCB7c3Bhd24gYXMgc3lzU3Bhd24sIENoaWxkUHJvY2VzcywgU3Bhd25PcHRpb25zfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbiBleHRlbmRzIFNwYXduT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0IHtcbiAgY2hpbGRQcm9jZXNzOiBDaGlsZFByb2Nlc3M7XG4gIHByb21pc2U6IFByb21pc2U8c3RyaW5nPjtcbn1cbi8qKlxuICogU3Bhd24gcHJvY2Vzc1xuICogQHBhcmFtICB7c3RyaW5nfSBjb21tYW5kXG4gKiBAcGFyYW0gIHtzdHJpbmdbXX0gYXJnc1xuICogQHBhcmFtICB7b2JqZWN0fSBvcHRzIG9wdGlvbmFsXG4gKiAgIC0ge2Jvb2xlYW59IG9wdHMuc2lsZW50ICBjaGlsZCBwcm9jZXNzJ3MgYHN0ZG91dGAgYW5kIGBzdGRlcnJgIHN0cmVhbSB3aWxsXG4gKiAgIG5vdCBwaXBlIHRvIHByb2Nlc3Muc3Rkb3V0IGFuZCBzdGRlcnIsIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB0b1xuICogICBzdHJpbmcgb2Ygc3Rkb3V0XG4gKiAgIE90aGVyIG9wdHMgcHJvcGVydGllcyB3aWxsIGJlIHBhc3NlZCB0byBjaGlsZF9wcm9jZXNzLnNwYXduKClcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5U3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6XG4gIFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzKS5wcm9taXNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFJlc3VsdCB7XG4gIGxldCBvcHRzOiBhbnkgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XG4gIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpIHtcbiAgICBvcHRzID0ge307XG4gIH0gZWxzZSB7XG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgLTEpO1xuICB9XG5cbiAgaWYgKG9wdHMgPT0gbnVsbCkge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGlmICghKG9wdHMgJiYgb3B0cy5zaWxlbnQpKSB7XG4gICAgb3B0cy5zdGRpbyA9ICdpbmhlcml0JztcbiAgfVxuICBsZXQgcmVzOiBDaGlsZFByb2Nlc3M7XG4gIGNvbnN0IHByb21pc2UgPSBjaGVja1RpbWVvdXQobmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmVzID0gc3lzU3Bhd24oY29tbWFuZCwgYXJncyBhcyBzdHJpbmdbXSwgb3B0cyk7XG4gICAgLy8gY29uc29sZS5sb2coY29tbWFuZCwgYXJncyk7XG4gICAgbGV0IG91dHB1dDogc3RyaW5nO1xuICAgIGlmIChvcHRzICYmIG9wdHMuc2lsZW50KSB7XG4gICAgICBvdXRwdXQgPSAnJztcbiAgICAgIHJlcy5zdGRvdXQhLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgICAgcmVzLnN0ZG91dCEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgICAgfSk7XG4gICAgICByZXMuc3RkZXJyIS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRlcnIhLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXMub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfSk7XG4gICAgcmVzLm9uKCdleGl0JywgZnVuY3Rpb24oY29kZSwgc2lnbmFsKSB7XG4gICAgICBpZiAoY29kZSAhPT0gMCAmJiBzaWduYWwgIT09ICdTSUdJTlQnKSB7XG4gICAgICAgIGNvbnN0IGVyck1zZyA9IGBDaGlsZCBwcm9jZXNzIFwiJHtjb21tYW5kfSAke2FyZ3Muam9pbignICcpfVwiIGV4aXQgd2l0aCBjb2RlICR7Y29kZX0sIHNpZ25hbCBgICsgc2lnbmFsO1xuICAgICAgICBpZiAob3B0cyA9PSBudWxsIHx8IG9wdHMuc2lsZW50ICE9PSB0cnVlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyTXNnKTtcbiAgICAgICAgICBpZiAob3V0cHV0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhvdXRwdXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihlcnJNc2cgKyAnXFxuJyArIChvdXRwdXQgPyBvdXRwdXQgOiAnJykpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUob3V0cHV0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSksIG9wdHMudGltZW91dClcbiAgLmNhdGNoKGUgPT4ge1xuICAgIGlmIChlLm1lc3NhZ2UgPT09ICdUaW1lb3V0JyAmJiByZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdLaWxsIHRoZSBjaGlsZCBwcm9jZXNzJyk7XG4gICAgICByZXMua2lsbCgnU0lHSFVQJyk7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIGNoaWxkUHJvY2VzczogcmVzISxcbiAgICBwcm9taXNlXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrVGltZW91dDxUPihvcmlnUHJvbWlzZTogUHJvbWlzZTxUPiwgdGltZUJveCA9IDYwMDAwMCk6IFByb21pc2U8VD4ge1xuICBsZXQgdGltZW91dDogTm9kZUpTLlRpbWVyIHwgbnVsbDtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBvcmlnUHJvbWlzZS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHJlcyk7XG4gICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZWplY3QoZSk7XG4gICAgfSk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpO1xuICAgIH0sIHRpbWVCb3gpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaXggc29tZSBleGVjdXRhYmxlIGNvbW1hbmQgZm9yIHdpbmRvd3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZCAgICAgW2Rlc2NyaXB0aW9uXVxuICogQHBhcmFtICB7Li4uc3RyaW5nIHwgYXJyYXl9IGNvbW1hbmRBcmdzIC4uLiBhcmd1bWVudHNcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5RXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gZXhlKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pLnByb21pc2U7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSBjb21tYW5kXG4gKiBAcGFyYW0geyp9IGFyZ3NBbmRPcHRpb25cbiAqIEByZXR1cm4ge29iamVjdH0ge3Byb21pc2U6IFByb21pc2UsIGNoaWxkUHJvY2VzczogY2hpbGRfcHJvY2Vzc31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgLy8gdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgIC8vIGNhc2UgJ25vZGUnOlxuICAgICAgY2FzZSAnbnBtJzpcbiAgICAgIGNhc2UgJ3lhcm4nOlxuICAgICAgY2FzZSAnZ3VscCc6XG4gICAgICAgIGNvbW1hbmQgKz0gJy5jbWQnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjb21tYW5kLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpO1xuICB9XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKTtcbn1cbiJdfQ==