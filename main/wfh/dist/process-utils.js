"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStringWriter = exports.exe = exports.promisifyExe = exports.fork = exports.spawn = exports.promisifySpawn = exports.isWindows = void 0;
/* tslint:disable:no-console indent */
const child_process_1 = require("child_process");
const stream_1 = require("stream");
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
    console.log(opts.cwd || process.cwd(), '> spawn process:', command, ...args);
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
        let output;
        let errOutput;
        if (opts && opts.silent) {
            output = createStringWriter();
            errOutput = createStringWriter();
            res.stdout.setEncoding('utf-8');
            res.stdout.pipe(output.writer);
            res.stderr.setEncoding('utf-8');
            res.stderr.pipe(errOutput.writer);
        }
        res.on('error', (err) => {
            reject(err);
        });
        res.on('exit', function (code, signal) {
            if (code !== 0 && signal !== 'SIGINT') {
                const errMsg = `Child process "${desc}" exit with code ${code}, signal ` + signal;
                if (opts == null || opts.silent !== true) {
                    console.log(errMsg);
                    if (output)
                        output.done.then(data => console.log(data));
                    if (errOutput)
                        errOutput.done.then(data => console.error(data));
                }
                return reject(new Error(errMsg + '\n' + (output ? output : '')));
            }
            else {
                if (output && errOutput)
                    Promise.all([output.done, errOutput.done])
                        .then(datas => resolve(datas.join('')));
                else
                    resolve('');
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
function createStringWriter() {
    let strs = [];
    let resolve;
    const done = new Promise(res => {
        resolve = res;
    });
    const writer = new stream_1.Writable({
        writev(cks, cb) {
            for (const data of cks) {
                strs.push(data.chunk);
            }
            cb();
        },
        final(cb) {
            resolve(strs.join(''));
            cb();
        }
    });
    return {
        writer,
        done
    };
}
exports.createStringWriter = createStringWriter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsc0NBQXNDO0FBQ3RDLGlEQUE0SDtBQUM1SCxtQ0FBZ0M7QUFDbkIsUUFBQSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFnQnREOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFXLENBQUM7SUFDbkQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUM3RSxNQUFNLEdBQUcsR0FBRyxxQkFB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Q2YsZUFBZTtZQUNmLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxLQUFLLENBQUM7WUFDWCxLQUFLLE1BQU0sQ0FBQztZQUNaLEtBQUssTUFBTTtnQkFDVCxPQUFPLElBQUksTUFBTSxDQUFDO2dCQUNsQixNQUFNO1lBQ1IsUUFBUTtTQUNUO1FBQ0QsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3hDO0lBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQWhCRCxrQkFnQkM7QUFFRCxTQUFnQixrQkFBa0I7SUFDaEMsSUFBSSxJQUFJLEdBQWEsRUFBRSxDQUFDO0lBQ3hCLElBQUksT0FBOEIsQ0FBQztJQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBUyxHQUFHLENBQUMsRUFBRTtRQUNyQyxPQUFPLEdBQUcsR0FBRyxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxpQkFBUSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNaLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxFQUFFO2dCQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFlLENBQUMsQ0FBQzthQUNqQztZQUNELEVBQUUsRUFBRSxDQUFDO1FBQ1AsQ0FBQztRQUNELEtBQUssQ0FBQyxFQUFFO1lBQ04sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN2QixFQUFFLEVBQUUsQ0FBQztRQUNQLENBQUM7S0FDRixDQUFDLENBQUM7SUFFSCxPQUFPO1FBQ0wsTUFBTTtRQUNOLElBQUk7S0FDTCxDQUFBO0FBQ0gsQ0FBQztBQXZCRCxnREF1QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlIGluZGVudCAqL1xuaW1wb3J0IHtzcGF3biBhcyBzeXNTcGF3biwgQ2hpbGRQcm9jZXNzLCBTcGF3bk9wdGlvbnMsIGZvcmsgYXMgc3lzRm9yaywgRm9ya09wdGlvbnMgYXMgU3lzRm9ya09wdGlvbnN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtXcml0YWJsZX0gZnJvbSAnc3RyZWFtJztcbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbiBleHRlbmRzIFNwYXduT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9ya09wdGlvbnMgZXh0ZW5kcyBTeXNGb3JrT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0IHtcbiAgY2hpbGRQcm9jZXNzOiBDaGlsZFByb2Nlc3M7XG4gIHByb21pc2U6IFByb21pc2U8c3RyaW5nPjtcbn1cbi8qKlxuICogU3Bhd24gcHJvY2Vzc1xuICogQHBhcmFtICB7c3RyaW5nfSBjb21tYW5kXG4gKiBAcGFyYW0gIHtzdHJpbmdbXX0gYXJnc1xuICogQHBhcmFtICB7b2JqZWN0fSBvcHRzIG9wdGlvbmFsXG4gKiAgIC0ge2Jvb2xlYW59IG9wdHMuc2lsZW50ICBjaGlsZCBwcm9jZXNzJ3MgYHN0ZG91dGAgYW5kIGBzdGRlcnJgIHN0cmVhbSB3aWxsXG4gKiAgIG5vdCBwaXBlIHRvIHByb2Nlc3Muc3Rkb3V0IGFuZCBzdGRlcnIsIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB0b1xuICogICBzdHJpbmcgb2Ygc3Rkb3V0XG4gKiAgIE90aGVyIG9wdHMgcHJvcGVydGllcyB3aWxsIGJlIHBhc3NlZCB0byBjaGlsZF9wcm9jZXNzLnNwYXduKClcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5U3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6XG4gIFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzKS5wcm9taXNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFJlc3VsdCB7XG4gIGxldCBvcHRzOiBPcHRpb24gPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gYXMgT3B0aW9uO1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIC0xKTtcbiAgfVxuXG4gIGlmIChvcHRzID09IG51bGwpIHtcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBpZiAoIShvcHRzICYmIG9wdHMuc2lsZW50KSkge1xuICAgIG9wdHMuc3RkaW8gPSAnaW5oZXJpdCc7XG4gIH1cbiAgY29uc29sZS5sb2cob3B0cy5jd2QgfHwgcHJvY2Vzcy5jd2QoKSwgJz4gc3Bhd24gcHJvY2VzczonLCBjb21tYW5kLCAuLi5hcmdzKTtcbiAgY29uc3QgcmVzID0gc3lzU3Bhd24oY29tbWFuZCwgYXJncyBhcyBzdHJpbmdbXSwgb3B0cyk7XG4gIGNvbnN0IHByb21pc2UgPSBjaGVja1RpbWVvdXQocHJvbWlzaWZ5Q2hpbGRQcm9jZXNzKHJlcywgb3B0cywgYCR7Y29tbWFuZH0gJHthcmdzLmpvaW4oJyAnKX1gKSwgb3B0cy50aW1lb3V0KVxuICAuY2F0Y2goZSA9PiB7XG4gICAgaWYgKGUubWVzc2FnZSA9PT0gJ1RpbWVvdXQnICYmIHJlcykge1xuICAgICAgY29uc29sZS5sb2coJ0tpbGwgdGhlIGNoaWxkIHByb2Nlc3MnKTtcbiAgICAgIHJlcy5raWxsKCdTSUdIVVAnKTtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgY2hpbGRQcm9jZXNzOiByZXMhLFxuICAgIHByb21pc2VcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcmsoanNGaWxlOiBzdHJpbmcsIC4uLmFyZ3M6IEFycmF5PHN0cmluZ3xGb3JrT3B0aW9ucz4pOiBSZXN1bHQge1xuICBsZXQgb3B0czogRm9ya09wdGlvbnMgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gYXMgRm9ya09wdGlvbnM7XG4gIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpIHtcbiAgICBvcHRzID0ge307XG4gIH0gZWxzZSB7XG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgLTEpO1xuICB9XG5cbiAgaWYgKG9wdHMgPT0gbnVsbCkge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGNvbnN0IHJlcyA9IHN5c0ZvcmsoanNGaWxlLCBhcmdzIGFzIHN0cmluZ1tdLCBvcHRzKTtcbiAgY29uc3QgcHJvbWlzZSA9IGNoZWNrVGltZW91dChwcm9taXNpZnlDaGlsZFByb2Nlc3MocmVzLCBvcHRzLCBgRm9yayBvZiAke2pzRmlsZX1gKSwgb3B0cy50aW1lb3V0KVxuICAuY2F0Y2goZSA9PiB7XG4gICAgaWYgKGUubWVzc2FnZSA9PT0gJ1RpbWVvdXQnICYmIHJlcykge1xuICAgICAgY29uc29sZS5sb2coJ0tpbGwgdGhlIGNoaWxkIHByb2Nlc3MnKTtcbiAgICAgIHJlcy5raWxsKCdTSUdIVVAnKTtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgY2hpbGRQcm9jZXNzOiByZXMhLFxuICAgIHByb21pc2VcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHJvbWlzaWZ5Q2hpbGRQcm9jZXNzKHJlczogQ2hpbGRQcm9jZXNzLCBvcHRzOiBPcHRpb24gfCBGb3JrT3B0aW9ucywgZGVzYzogc3RyaW5nKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBsZXQgb3V0cHV0OiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVTdHJpbmdXcml0ZXI+IHwgdW5kZWZpbmVkO1xuICAgIGxldCBlcnJPdXRwdXQ6IHR5cGVvZiBvdXRwdXQ7XG4gICAgaWYgKG9wdHMgJiYgb3B0cy5zaWxlbnQpIHtcbiAgICAgIG91dHB1dCA9IGNyZWF0ZVN0cmluZ1dyaXRlcigpO1xuICAgICAgZXJyT3V0cHV0ID0gY3JlYXRlU3RyaW5nV3JpdGVyKCk7XG4gICAgICByZXMuc3Rkb3V0IS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRvdXQhLnBpcGUob3V0cHV0LndyaXRlcik7XG4gICAgICByZXMuc3RkZXJyIS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRlcnIhLnBpcGUoZXJyT3V0cHV0LndyaXRlcik7XG4gICAgfVxuICAgIHJlcy5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgICByZXMub24oJ2V4aXQnLCBmdW5jdGlvbihjb2RlLCBzaWduYWwpIHtcbiAgICAgIGlmIChjb2RlICE9PSAwICYmIHNpZ25hbCAhPT0gJ1NJR0lOVCcpIHtcbiAgICAgICAgY29uc3QgZXJyTXNnID0gYENoaWxkIHByb2Nlc3MgXCIke2Rlc2N9XCIgZXhpdCB3aXRoIGNvZGUgJHtjb2RlfSwgc2lnbmFsIGAgKyBzaWduYWw7XG4gICAgICAgIGlmIChvcHRzID09IG51bGwgfHwgb3B0cy5zaWxlbnQgIT09IHRydWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnJNc2cpO1xuICAgICAgICAgIGlmIChvdXRwdXQpXG4gICAgICAgICAgICBvdXRwdXQuZG9uZS50aGVuKGRhdGEgPT4gY29uc29sZS5sb2coZGF0YSkpO1xuICAgICAgICAgIGlmIChlcnJPdXRwdXQpXG4gICAgICAgICAgICBlcnJPdXRwdXQuZG9uZS50aGVuKGRhdGEgPT4gY29uc29sZS5lcnJvcihkYXRhKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoZXJyTXNnICsgJ1xcbicgKyAob3V0cHV0ID8gb3V0cHV0IDogJycpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAob3V0cHV0ICYmIGVyck91dHB1dClcbiAgICAgICAgICBQcm9taXNlLmFsbChbb3V0cHV0LmRvbmUsIGVyck91dHB1dC5kb25lXSlcbiAgICAgICAgICAgIC50aGVuKGRhdGFzID0+IHJlc29sdmUoZGF0YXMuam9pbignJykpKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJlc29sdmUoJycpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY2hlY2tUaW1lb3V0PFQ+KG9yaWdQcm9taXNlOiBQcm9taXNlPFQ+LCB0aW1lQm94ID0gNjAwMDAwKTogUHJvbWlzZTxUPiB7XG4gIGxldCB0aW1lb3V0OiBOb2RlSlMuVGltZXIgfCBudWxsO1xuICByZXR1cm4gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIG9yaWdQcm9taXNlLnRoZW4ocmVzID0+IHtcbiAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUocmVzKTtcbiAgICB9KS5jYXRjaChlID0+IHtcbiAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIHJlamVjdChlKTtcbiAgICB9KTtcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSk7XG4gICAgfSwgdGltZUJveCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpeCBzb21lIGV4ZWN1dGFibGUgY29tbWFuZCBmb3Igd2luZG93c1xuICogQHBhcmFtICB7c3RyaW5nfSBjb21tYW5kICAgICBbZGVzY3JpcHRpb25dXG4gKiBAcGFyYW0gIHsuLi5zdHJpbmcgfCBhcnJheX0gY29tbWFuZEFyZ3MgLi4uIGFyZ3VtZW50c1xuICogQHBhcmFtICB7b2JqZWN0fSBvcHRzIG9wdGlvbmFsXG4gKiAgIC0ge2Jvb2xlYW59IG9wdHMuc2lsZW50ICBjaGlsZCBwcm9jZXNzJ3MgYHN0ZG91dGAgYW5kIGBzdGRlcnJgIHN0cmVhbSB3aWxsXG4gKiAgIG5vdCBwaXBlIHRvIHByb2Nlc3Muc3Rkb3V0IGFuZCBzdGRlcnIsIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB0b1xuICogICBzdHJpbmcgb2Ygc3Rkb3V0XG4gKlxuICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgIHJlamVjdGVkIGlmIGNoaWxkIHByb2Nlc3MgZXhpdHMgd2l0aCBub24temVybyBjb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9taXNpZnlFeGUoY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzQW5kT3B0aW9uOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBleGUoY29tbWFuZCwgLi4uYXJnc0FuZE9wdGlvbikucHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IGNvbW1hbmRcbiAqIEBwYXJhbSB7Kn0gYXJnc0FuZE9wdGlvblxuICogQHJldHVybiB7b2JqZWN0fSB7cHJvbWlzZTogUHJvbWlzZSwgY2hpbGRQcm9jZXNzOiBjaGlsZF9wcm9jZXNzfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBSZXN1bHQge1xuICAvLyB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgaWYgKGlzV2luZG93cykge1xuICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgLy8gY2FzZSAnbm9kZSc6XG4gICAgICBjYXNlICducG0nOlxuICAgICAgY2FzZSAnbnB4JzpcbiAgICAgIGNhc2UgJ3lhcm4nOlxuICAgICAgY2FzZSAnZ3VscCc6XG4gICAgICAgIGNvbW1hbmQgKz0gJy5jbWQnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjb21tYW5kLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpO1xuICB9XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN0cmluZ1dyaXRlcigpOiB7d3JpdGVyOiBXcml0YWJsZSwgZG9uZTogUHJvbWlzZTxzdHJpbmc+fSB7XG4gIGxldCBzdHJzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgcmVzb2x2ZTogKHN0cjogc3RyaW5nKSA9PiB2b2lkO1xuICBjb25zdCBkb25lID0gbmV3IFByb21pc2U8c3RyaW5nPihyZXMgPT4ge1xuICAgIHJlc29sdmUgPSByZXM7XG4gIH0pO1xuICBjb25zdCB3cml0ZXIgPSBuZXcgV3JpdGFibGUoe1xuICAgIHdyaXRldihja3MsIGNiKSB7XG4gICAgICBmb3IgKGNvbnN0IGRhdGEgb2YgY2tzKSB7XG4gICAgICAgIHN0cnMucHVzaChkYXRhLmNodW5rIGFzIHN0cmluZyk7XG4gICAgICB9XG4gICAgICBjYigpO1xuICAgIH0sXG4gICAgZmluYWwoY2IpIHtcbiAgICAgIHJlc29sdmUoc3Rycy5qb2luKCcnKSk7XG4gICAgICBjYigpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICB3cml0ZXIsXG4gICAgZG9uZVxuICB9XG59XG5cblxuXG4iXX0=