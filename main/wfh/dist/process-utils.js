"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exe = exports.promisifyExe = exports.fork = exports.spawn = exports.promisifySpawn = exports.isWindows = void 0;
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
    const res = child_process_1.spawn(command, args, opts);
    const promise = checkTimeout(promisifyChildProcess(res, opts, `${command} ${args.join(' ')}`), opts.timeout)
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
function fork(jsFile, ...args) {
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
    const res = child_process_1.fork(jsFile, args, opts);
    const promise = checkTimeout(promisifyChildProcess(res, opts, `Fork of ${jsFile}`), opts.timeout)
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
exports.fork = fork;
function promisifyChildProcess(res, opts, desc) {
    return new Promise((resolve, reject) => {
        const allDone = [];
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
                const errMsg = `Child process "${desc}" exit with code ${code}, signal ` + signal;
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
    });
}
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
            case 'npx':
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQXNDO0FBQ3RDLGlEQUE0SDtBQUMvRyxRQUFBLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQztBQWdCdEQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxTQUFnQixjQUFjLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFFM0UsT0FBTyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3pDLENBQUM7QUFIRCx3Q0FHQztBQUVELFNBQWdCLEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUEwQjtJQUNsRSxJQUFJLElBQUksR0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQVcsQ0FBQztJQUNuRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtRQUM1QixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7U0FBTTtRQUNMLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzFCO0lBRUQsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO1FBQ2hCLElBQUksR0FBRyxFQUFFLENBQUM7S0FDWDtJQUVELElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDMUIsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7S0FDeEI7SUFFRCxNQUFNLEdBQUcsR0FBRyxxQkFBUSxDQUFDLE9BQU8sRUFBRSxJQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxJQUFJLElBQUks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Q0FBQztZQUNYLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLE1BQU07Z0JBQ1QsT0FBTyxJQUFJLE1BQU0sQ0FBQztnQkFDbEIsTUFBTTtZQUNSLFFBQVE7U0FDVDtRQUNELE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4QztJQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFoQkQsa0JBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSBpbmRlbnQgKi9cbmltcG9ydCB7c3Bhd24gYXMgc3lzU3Bhd24sIENoaWxkUHJvY2VzcywgU3Bhd25PcHRpb25zLCBmb3JrIGFzIHN5c0ZvcmssIEZvcmtPcHRpb25zIGFzIFN5c0ZvcmtPcHRpb25zfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbiBleHRlbmRzIFNwYXduT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9ya09wdGlvbnMgZXh0ZW5kcyBTeXNGb3JrT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0IHtcbiAgY2hpbGRQcm9jZXNzOiBDaGlsZFByb2Nlc3M7XG4gIHByb21pc2U6IFByb21pc2U8c3RyaW5nPjtcbn1cbi8qKlxuICogU3Bhd24gcHJvY2Vzc1xuICogQHBhcmFtICB7c3RyaW5nfSBjb21tYW5kXG4gKiBAcGFyYW0gIHtzdHJpbmdbXX0gYXJnc1xuICogQHBhcmFtICB7b2JqZWN0fSBvcHRzIG9wdGlvbmFsXG4gKiAgIC0ge2Jvb2xlYW59IG9wdHMuc2lsZW50ICBjaGlsZCBwcm9jZXNzJ3MgYHN0ZG91dGAgYW5kIGBzdGRlcnJgIHN0cmVhbSB3aWxsXG4gKiAgIG5vdCBwaXBlIHRvIHByb2Nlc3Muc3Rkb3V0IGFuZCBzdGRlcnIsIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB0b1xuICogICBzdHJpbmcgb2Ygc3Rkb3V0XG4gKiAgIE90aGVyIG9wdHMgcHJvcGVydGllcyB3aWxsIGJlIHBhc3NlZCB0byBjaGlsZF9wcm9jZXNzLnNwYXduKClcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5U3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6XG4gIFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzKS5wcm9taXNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFJlc3VsdCB7XG4gIGxldCBvcHRzOiBPcHRpb24gPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gYXMgT3B0aW9uO1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIC0xKTtcbiAgfVxuXG4gIGlmIChvcHRzID09IG51bGwpIHtcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBpZiAoIShvcHRzICYmIG9wdHMuc2lsZW50KSkge1xuICAgIG9wdHMuc3RkaW8gPSAnaW5oZXJpdCc7XG4gIH1cblxuICBjb25zdCByZXMgPSBzeXNTcGF3bihjb21tYW5kLCBhcmdzIGFzIHN0cmluZ1tdLCBvcHRzKTtcbiAgY29uc3QgcHJvbWlzZSA9IGNoZWNrVGltZW91dChwcm9taXNpZnlDaGlsZFByb2Nlc3MocmVzLCBvcHRzLCBgJHtjb21tYW5kfSAke2FyZ3Muam9pbignICcpfWApLCBvcHRzLnRpbWVvdXQpXG4gIC5jYXRjaChlID0+IHtcbiAgICBpZiAoZS5tZXNzYWdlID09PSAnVGltZW91dCcgJiYgcmVzKSB7XG4gICAgICBjb25zb2xlLmxvZygnS2lsbCB0aGUgY2hpbGQgcHJvY2VzcycpO1xuICAgICAgcmVzLmtpbGwoJ1NJR0hVUCcpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjaGlsZFByb2Nlc3M6IHJlcyEsXG4gICAgcHJvbWlzZVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9yayhqc0ZpbGU6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfEZvcmtPcHRpb25zPik6IFJlc3VsdCB7XG4gIGxldCBvcHRzOiBGb3JrT3B0aW9ucyA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXSBhcyBGb3JrT3B0aW9ucztcbiAgaWYgKHR5cGVvZiBvcHRzID09PSAnc3RyaW5nJykge1xuICAgIG9wdHMgPSB7fTtcbiAgfSBlbHNlIHtcbiAgICBhcmdzID0gYXJncy5zbGljZSgwLCAtMSk7XG4gIH1cblxuICBpZiAob3B0cyA9PSBudWxsKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgY29uc3QgcmVzID0gc3lzRm9yayhqc0ZpbGUsIGFyZ3MgYXMgc3RyaW5nW10sIG9wdHMpO1xuICBjb25zdCBwcm9taXNlID0gY2hlY2tUaW1lb3V0KHByb21pc2lmeUNoaWxkUHJvY2VzcyhyZXMsIG9wdHMsIGBGb3JrIG9mICR7anNGaWxlfWApLCBvcHRzLnRpbWVvdXQpXG4gIC5jYXRjaChlID0+IHtcbiAgICBpZiAoZS5tZXNzYWdlID09PSAnVGltZW91dCcgJiYgcmVzKSB7XG4gICAgICBjb25zb2xlLmxvZygnS2lsbCB0aGUgY2hpbGQgcHJvY2VzcycpO1xuICAgICAgcmVzLmtpbGwoJ1NJR0hVUCcpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjaGlsZFByb2Nlc3M6IHJlcyEsXG4gICAgcHJvbWlzZVxuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9taXNpZnlDaGlsZFByb2Nlc3MocmVzOiBDaGlsZFByb2Nlc3MsIG9wdHM6IE9wdGlvbiB8IEZvcmtPcHRpb25zLCBkZXNjOiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGFsbERvbmU6IFByb21pc2U8YW55PltdID0gW107XG4gICAgLy8gY29uc29sZS5sb2coY29tbWFuZCwgYXJncyk7XG4gICAgbGV0IG91dHB1dDogc3RyaW5nO1xuICAgIGlmIChvcHRzICYmIG9wdHMuc2lsZW50KSB7XG4gICAgICBvdXRwdXQgPSAnJztcbiAgICAgIHJlcy5zdGRvdXQhLnNldEVuY29kaW5nKCd1dGYtOCcpO1xuICAgICAgcmVzLnN0ZG91dCEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgb3V0cHV0ICs9IGNodW5rO1xuICAgICAgfSk7XG4gICAgICByZXMuc3RkZXJyIS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRlcnIhLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgIG91dHB1dCArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgICAgcmVzLnN0ZG91dCEucmVzdW1lKCk7XG4gICAgICByZXMuc3RkZXJyIS5yZXN1bWUoKTtcbiAgICAgIGFsbERvbmUucHVzaChcbiAgICAgICAgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiByZXMuc3Rkb3V0IS5vbignZW5kJywgcmVzb2x2ZSkpLFxuICAgICAgICBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHJlcy5zdGRlcnIhLm9uKCdlbmQnLCByZXNvbHZlKSlcbiAgICAgICk7XG4gICAgfVxuICAgIHJlcy5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgICByZXMub24oJ2V4aXQnLCBmdW5jdGlvbihjb2RlLCBzaWduYWwpIHtcbiAgICAgIGlmIChjb2RlICE9PSAwICYmIHNpZ25hbCAhPT0gJ1NJR0lOVCcpIHtcbiAgICAgICAgY29uc3QgZXJyTXNnID0gYENoaWxkIHByb2Nlc3MgXCIke2Rlc2N9XCIgZXhpdCB3aXRoIGNvZGUgJHtjb2RlfSwgc2lnbmFsIGAgKyBzaWduYWw7XG4gICAgICAgIGlmIChvcHRzID09IG51bGwgfHwgb3B0cy5zaWxlbnQgIT09IHRydWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnJNc2cpO1xuICAgICAgICAgIGlmIChvdXRwdXQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG91dHB1dCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGVyck1zZyArICdcXG4nICsgKG91dHB1dCA/IG91dHB1dCA6ICcnKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgUHJvbWlzZS5hbGwoYWxsRG9uZSlcbiAgICAgICAgLnRoZW4oKCkgPT4gcmVzb2x2ZShvdXRwdXQpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNoZWNrVGltZW91dDxUPihvcmlnUHJvbWlzZTogUHJvbWlzZTxUPiwgdGltZUJveCA9IDYwMDAwMCk6IFByb21pc2U8VD4ge1xuICBsZXQgdGltZW91dDogTm9kZUpTLlRpbWVyIHwgbnVsbDtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBvcmlnUHJvbWlzZS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHJlcyk7XG4gICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZWplY3QoZSk7XG4gICAgfSk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpO1xuICAgIH0sIHRpbWVCb3gpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaXggc29tZSBleGVjdXRhYmxlIGNvbW1hbmQgZm9yIHdpbmRvd3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZCAgICAgW2Rlc2NyaXB0aW9uXVxuICogQHBhcmFtICB7Li4uc3RyaW5nIHwgYXJyYXl9IGNvbW1hbmRBcmdzIC4uLiBhcmd1bWVudHNcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5RXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gZXhlKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pLnByb21pc2U7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSBjb21tYW5kXG4gKiBAcGFyYW0geyp9IGFyZ3NBbmRPcHRpb25cbiAqIEByZXR1cm4ge29iamVjdH0ge3Byb21pc2U6IFByb21pc2UsIGNoaWxkUHJvY2VzczogY2hpbGRfcHJvY2Vzc31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgLy8gdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgIC8vIGNhc2UgJ25vZGUnOlxuICAgICAgY2FzZSAnbnBtJzpcbiAgICAgIGNhc2UgJ25weCc6XG4gICAgICBjYXNlICd5YXJuJzpcbiAgICAgIGNhc2UgJ2d1bHAnOlxuICAgICAgICBjb21tYW5kICs9ICcuY21kJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgIH1cbiAgICBjb21tYW5kID0gY29tbWFuZC5yZXBsYWNlKC9cXC8vZywgJ1xcXFwnKTtcbiAgfVxuICByZXR1cm4gc3Bhd24oY29tbWFuZCwgLi4uYXJnc0FuZE9wdGlvbik7XG59XG4iXX0=