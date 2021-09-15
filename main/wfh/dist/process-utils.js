"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStringWriter = exports.exe = exports.promisifyExe = exports.fork = exports.spawn = exports.promisifySpawn = exports.isWindows = void 0;
/* eslint-disable no-console, indent, @typescript-eslint/indent */
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
    const res = (0, child_process_1.spawn)(command, args, opts);
    const done = checkTimeout(promisifyChildProcess(res, opts, `${command} ${args.join(' ')}`), opts.timeout)
        .catch(e => {
        if (e.message === 'Timeout' && res) {
            console.log('Kill the child process');
            res.kill('SIGHUP');
        }
        throw e;
    });
    return {
        childProcess: res,
        promise: done.then(strs => strs.stdout + '\n' + strs.errout),
        done
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
    const res = (0, child_process_1.fork)(jsFile, args, opts);
    const done = checkTimeout(promisifyChildProcess(res, opts, `Fork of ${jsFile}`), opts.timeout)
        .catch(e => {
        if (e.message === 'Timeout' && res) {
            console.log('Kill the child process');
            res.kill('SIGHUP');
        }
        throw e;
    });
    return {
        childProcess: res,
        done,
        promise: done.then(out => out.stdout + '\n' + out.errout)
    };
}
exports.fork = fork;
async function promisifyChildProcess(res, opts, desc) {
    let output;
    let errOutput;
    const cpExit = new Promise((resolve, reject) => {
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
            resolve({ code, signal });
        });
    });
    const { code, signal } = await cpExit;
    let joinText = '';
    let outs = {};
    if (opts && opts.silent) {
        const outTexts = await Promise.all([output.done, errOutput.done]);
        joinText = outTexts.join('\n');
        outs.stdout = outTexts[0];
        outs.errout = outTexts[1];
    }
    if (code !== 0 && signal !== 'SIGINT') {
        const errMsg = `Child process "${desc}" exit with code ${'' + code}, signal ` + signal;
        throw new Error(errMsg + '\n' + (joinText ? joinText : ''));
    }
    return outs;
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
        write(chunk, encoding, cb) {
            // for (const data of cks) {
            //   strs.push(data.chunk as string);
            // }
            strs.push(chunk);
            cb();
        },
        final(cb) {
            cb();
            setImmediate(() => {
                resolve(strs.join(''));
            });
        }
    });
    return {
        writer,
        done
    };
}
exports.createStringWriter = createStringWriter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsa0VBQWtFO0FBQ2xFLGlEQUE0SDtBQUM1SCxtQ0FBZ0M7QUFDbkIsUUFBQSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFpQnREOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTRCO0lBRTdFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBNEI7SUFDcEUsSUFBSSxJQUFJLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFXLENBQUM7SUFDbkQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUM3RSxNQUFNLEdBQUcsR0FBRyxJQUFB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Q3pCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNGLENBQUMsQ0FBQztJQUVILE9BQU87UUFDTCxNQUFNO1FBQ04sSUFBSTtLQUNMLENBQUM7QUFDSixDQUFDO0FBMUJELGdEQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUsIGluZGVudCwgQHR5cGVzY3JpcHQtZXNsaW50L2luZGVudCAqL1xuaW1wb3J0IHtzcGF3biBhcyBzeXNTcGF3biwgQ2hpbGRQcm9jZXNzLCBTcGF3bk9wdGlvbnMsIGZvcmsgYXMgc3lzRm9yaywgRm9ya09wdGlvbnMgYXMgU3lzRm9ya09wdGlvbnN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtXcml0YWJsZX0gZnJvbSAnc3RyZWFtJztcbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbiBleHRlbmRzIFNwYXduT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9ya09wdGlvbnMgZXh0ZW5kcyBTeXNGb3JrT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0IHtcbiAgY2hpbGRQcm9jZXNzOiBDaGlsZFByb2Nlc3M7XG4gIHByb21pc2U6IFByb21pc2U8c3RyaW5nPjtcbiAgZG9uZTogUHJvbWlzZTx7c3Rkb3V0OiBzdHJpbmc7IGVycm91dDogc3RyaW5nfT47XG59XG4vKipcbiAqIFNwYXduIHByb2Nlc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZFxuICogQHBhcmFtICB7c3RyaW5nW119IGFyZ3NcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICogICBPdGhlciBvcHRzIHByb3BlcnRpZXMgd2lsbCBiZSBwYXNzZWQgdG8gY2hpbGRfcHJvY2Vzcy5zcGF3bigpXG4gKlxuICogQHJldHVybiB7UHJvbWlzZX0gcmVqZWN0ZWQgaWYgY2hpbGQgcHJvY2VzcyBleGl0cyB3aXRoIG5vbi16ZXJvIGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb21pc2lmeVNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nIHwgT3B0aW9uPik6XG4gIFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzKS5wcm9taXNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmcgfCBPcHRpb24+KTogUmVzdWx0IHtcbiAgbGV0IG9wdHM6IE9wdGlvbiA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXSBhcyBPcHRpb247XG4gIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpIHtcbiAgICBvcHRzID0ge307XG4gIH0gZWxzZSB7XG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgLTEpO1xuICB9XG5cbiAgaWYgKG9wdHMgPT0gbnVsbCkge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGlmICghKG9wdHMgJiYgb3B0cy5zaWxlbnQpKSB7XG4gICAgb3B0cy5zdGRpbyA9ICdpbmhlcml0JztcbiAgfVxuICBjb25zb2xlLmxvZyhvcHRzLmN3ZCB8fCBwcm9jZXNzLmN3ZCgpLCAnPiBzcGF3biBwcm9jZXNzOicsIGNvbW1hbmQsIC4uLmFyZ3MpO1xuICBjb25zdCByZXMgPSBzeXNTcGF3bihjb21tYW5kLCBhcmdzIGFzIHN0cmluZ1tdLCBvcHRzKTtcbiAgY29uc3QgZG9uZSA9IGNoZWNrVGltZW91dChwcm9taXNpZnlDaGlsZFByb2Nlc3MocmVzLCBvcHRzLCBgJHtjb21tYW5kfSAke2FyZ3Muam9pbignICcpfWApLCBvcHRzLnRpbWVvdXQpXG4gIC5jYXRjaChlID0+IHtcbiAgICBpZiAoZS5tZXNzYWdlID09PSAnVGltZW91dCcgJiYgcmVzKSB7XG4gICAgICBjb25zb2xlLmxvZygnS2lsbCB0aGUgY2hpbGQgcHJvY2VzcycpO1xuICAgICAgcmVzLmtpbGwoJ1NJR0hVUCcpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjaGlsZFByb2Nlc3M6IHJlcyxcbiAgICBwcm9taXNlOiBkb25lLnRoZW4oc3RycyA9PiBzdHJzLnN0ZG91dCArICdcXG4nICsgc3Rycy5lcnJvdXQpLFxuICAgIGRvbmVcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcmsoanNGaWxlOiBzdHJpbmcsIC4uLmFyZ3M6IEFycmF5PHN0cmluZyB8IEZvcmtPcHRpb25zPik6IFJlc3VsdCB7XG4gIGxldCBvcHRzOiBGb3JrT3B0aW9ucyA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXSBhcyBGb3JrT3B0aW9ucztcbiAgaWYgKHR5cGVvZiBvcHRzID09PSAnc3RyaW5nJykge1xuICAgIG9wdHMgPSB7fTtcbiAgfSBlbHNlIHtcbiAgICBhcmdzID0gYXJncy5zbGljZSgwLCAtMSk7XG4gIH1cblxuICBpZiAob3B0cyA9PSBudWxsKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgY29uc3QgcmVzID0gc3lzRm9yayhqc0ZpbGUsIGFyZ3MgYXMgc3RyaW5nW10sIG9wdHMpO1xuICBjb25zdCBkb25lID0gY2hlY2tUaW1lb3V0KHByb21pc2lmeUNoaWxkUHJvY2VzcyhyZXMsIG9wdHMsIGBGb3JrIG9mICR7anNGaWxlfWApLCBvcHRzLnRpbWVvdXQpXG4gIC5jYXRjaChlID0+IHtcbiAgICBpZiAoZS5tZXNzYWdlID09PSAnVGltZW91dCcgJiYgcmVzKSB7XG4gICAgICBjb25zb2xlLmxvZygnS2lsbCB0aGUgY2hpbGQgcHJvY2VzcycpO1xuICAgICAgcmVzLmtpbGwoJ1NJR0hVUCcpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjaGlsZFByb2Nlc3M6IHJlcyxcbiAgICBkb25lLFxuICAgIHByb21pc2U6IGRvbmUudGhlbihvdXQgPT4gb3V0LnN0ZG91dCArICdcXG4nICsgb3V0LmVycm91dClcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvbWlzaWZ5Q2hpbGRQcm9jZXNzKHJlczogQ2hpbGRQcm9jZXNzLCBvcHRzOiBPcHRpb24gfCBGb3JrT3B0aW9ucywgZGVzYzogc3RyaW5nKSB7XG4gIGxldCBvdXRwdXQ6IFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVN0cmluZ1dyaXRlcj4gfCB1bmRlZmluZWQ7XG4gIGxldCBlcnJPdXRwdXQ6IHR5cGVvZiBvdXRwdXQgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IGNwRXhpdCA9IG5ldyBQcm9taXNlPHtjb2RlOiBudW1iZXIgfCBudWxsOyBzaWduYWw6IHN0cmluZyB8IG51bGx9PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKG9wdHMgJiYgb3B0cy5zaWxlbnQpIHtcbiAgICAgIG91dHB1dCA9IGNyZWF0ZVN0cmluZ1dyaXRlcigpO1xuICAgICAgZXJyT3V0cHV0ID0gY3JlYXRlU3RyaW5nV3JpdGVyKCk7XG4gICAgICByZXMuc3Rkb3V0IS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRvdXQhLnBpcGUob3V0cHV0LndyaXRlcik7XG4gICAgICByZXMuc3RkZXJyIS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRlcnIhLnBpcGUoZXJyT3V0cHV0LndyaXRlcik7XG4gICAgfVxuICAgIHJlcy5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgICByZXMub24oJ2V4aXQnLCBmdW5jdGlvbihjb2RlLCBzaWduYWwpIHtcbiAgICAgIHJlc29sdmUoe2NvZGUsIHNpZ25hbH0pO1xuICAgIH0pO1xuICB9KTtcbiAgY29uc3Qge2NvZGUsIHNpZ25hbH0gPSBhd2FpdCBjcEV4aXQ7XG4gIGxldCBqb2luVGV4dCA9ICcnO1xuICBsZXQgb3V0cyA9IHt9IGFzIHtzdGRvdXQ6IHN0cmluZzsgZXJyb3V0OiBzdHJpbmd9O1xuICBpZiAob3B0cyAmJiBvcHRzLnNpbGVudCkge1xuICAgIGNvbnN0IG91dFRleHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoW291dHB1dCEuZG9uZSwgZXJyT3V0cHV0IS5kb25lXSk7XG4gICAgam9pblRleHQgPSBvdXRUZXh0cy5qb2luKCdcXG4nKTtcbiAgICBvdXRzLnN0ZG91dCA9IG91dFRleHRzWzBdO1xuICAgIG91dHMuZXJyb3V0ID0gb3V0VGV4dHNbMV07XG4gIH1cbiAgaWYgKGNvZGUgIT09IDAgJiYgc2lnbmFsICE9PSAnU0lHSU5UJykge1xuICAgIGNvbnN0IGVyck1zZyA9IGBDaGlsZCBwcm9jZXNzIFwiJHtkZXNjfVwiIGV4aXQgd2l0aCBjb2RlICR7JycgKyBjb2RlfSwgc2lnbmFsIGAgKyBzaWduYWw7XG4gICAgdGhyb3cgbmV3IEVycm9yKGVyck1zZyArICdcXG4nICsgKGpvaW5UZXh0ID8gam9pblRleHQgOiAnJykpO1xuICB9XG4gIHJldHVybiBvdXRzO1xufVxuXG5mdW5jdGlvbiBjaGVja1RpbWVvdXQ8VD4ob3JpZ1Byb21pc2U6IFByb21pc2U8VD4sIHRpbWVCb3ggPSA2MDAwMDApOiBQcm9taXNlPFQ+IHtcbiAgbGV0IHRpbWVvdXQ6IE5vZGVKUy5UaW1lciB8IG51bGw7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgb3JpZ1Byb21pc2UudGhlbihyZXMgPT4ge1xuICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShyZXMpO1xuICAgIH0pLmNhdGNoKGUgPT4ge1xuICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgfVxuICAgICAgcmVqZWN0KGUpO1xuICAgIH0pO1xuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKTtcbiAgICB9LCB0aW1lQm94KTtcbiAgfSk7XG59XG5cbi8qKlxuICogRml4IHNvbWUgZXhlY3V0YWJsZSBjb21tYW5kIGZvciB3aW5kb3dzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGNvbW1hbmQgICAgIFtkZXNjcmlwdGlvbl1cbiAqIEBwYXJhbSAgey4uLnN0cmluZyB8IGFycmF5fSBjb21tYW5kQXJncyAuLi4gYXJndW1lbnRzXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9wdHMgb3B0aW9uYWxcbiAqICAgLSB7Ym9vbGVhbn0gb3B0cy5zaWxlbnQgIGNoaWxkIHByb2Nlc3MncyBgc3Rkb3V0YCBhbmQgYHN0ZGVycmAgc3RyZWFtIHdpbGxcbiAqICAgbm90IHBpcGUgdG8gcHJvY2Vzcy5zdGRvdXQgYW5kIHN0ZGVyciwgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHRvXG4gKiAgIHN0cmluZyBvZiBzdGRvdXRcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgcmVqZWN0ZWQgaWYgY2hpbGQgcHJvY2VzcyBleGl0cyB3aXRoIG5vbi16ZXJvIGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb21pc2lmeUV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZyB8IE9wdGlvbj4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gZXhlKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pLnByb21pc2U7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSBjb21tYW5kXG4gKiBAcGFyYW0geyp9IGFyZ3NBbmRPcHRpb25cbiAqIEByZXR1cm4ge29iamVjdH0ge3Byb21pc2U6IFByb21pc2UsIGNoaWxkUHJvY2VzczogY2hpbGRfcHJvY2Vzc31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZyB8IE9wdGlvbj4pOiBSZXN1bHQge1xuICAvLyB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgaWYgKGlzV2luZG93cykge1xuICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgLy8gY2FzZSAnbm9kZSc6XG4gICAgICBjYXNlICducG0nOlxuICAgICAgY2FzZSAnbnB4JzpcbiAgICAgIGNhc2UgJ3lhcm4nOlxuICAgICAgY2FzZSAnZ3VscCc6XG4gICAgICAgIGNvbW1hbmQgKz0gJy5jbWQnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjb21tYW5kLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpO1xuICB9XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN0cmluZ1dyaXRlcigpOiB7d3JpdGVyOiBXcml0YWJsZTsgZG9uZTogUHJvbWlzZTxzdHJpbmc+fSB7XG4gIGxldCBzdHJzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgcmVzb2x2ZTogKHN0cjogc3RyaW5nKSA9PiB2b2lkO1xuICBjb25zdCBkb25lID0gbmV3IFByb21pc2U8c3RyaW5nPihyZXMgPT4ge1xuICAgIHJlc29sdmUgPSByZXM7XG4gIH0pO1xuICBjb25zdCB3cml0ZXIgPSBuZXcgV3JpdGFibGUoe1xuICAgIHdyaXRlKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgICAgIC8vIGZvciAoY29uc3QgZGF0YSBvZiBja3MpIHtcbiAgICAgIC8vICAgc3Rycy5wdXNoKGRhdGEuY2h1bmsgYXMgc3RyaW5nKTtcbiAgICAgIC8vIH1cbiAgICAgIHN0cnMucHVzaChjaHVuayk7XG4gICAgICBjYigpO1xuICAgIH0sXG4gICAgZmluYWwoY2IpIHtcbiAgICAgIGNiKCk7XG4gICAgICBzZXRJbW1lZGlhdGUoKCkgPT4ge1xuICAgICAgICByZXNvbHZlKHN0cnMuam9pbignJykpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHdyaXRlcixcbiAgICBkb25lXG4gIH07XG59XG5cbiJdfQ==