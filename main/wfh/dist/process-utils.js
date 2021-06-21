"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    const res = child_process_1.spawn(command, args, opts);
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
    const res = child_process_1.fork(jsFile, args, opts);
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
function promisifyChildProcess(res, opts, desc) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const { code, signal } = yield cpExit;
        let joinText = '';
        let outs = {};
        if (opts && opts.silent) {
            const outTexts = yield Promise.all([output.done, errOutput.done]);
            joinText = outTexts.join('\n');
            outs.stdout = outTexts[0];
            outs.errout = outTexts[1];
        }
        if (code !== 0 && signal !== 'SIGINT') {
            const errMsg = `Child process "${desc}" exit with code ${code}, signal ` + signal;
            throw new Error(errMsg + '\n' + (joinText ? joinText : ''));
        }
        return outs;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsa0VBQWtFO0FBQ2xFLGlEQUE0SDtBQUM1SCxtQ0FBZ0M7QUFDbkIsUUFBQSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFpQnREOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFXLENBQUM7SUFDbkQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUM3RSxNQUFNLEdBQUcs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QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7S0FDRixDQUFDLENBQUM7SUFFSCxPQUFPO1FBQ0wsTUFBTTtRQUNOLElBQUk7S0FDTCxDQUFBO0FBQ0gsQ0FBQztBQTFCRCxnREEwQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlLCBpbmRlbnQsIEB0eXBlc2NyaXB0LWVzbGludC9pbmRlbnQgKi9cbmltcG9ydCB7c3Bhd24gYXMgc3lzU3Bhd24sIENoaWxkUHJvY2VzcywgU3Bhd25PcHRpb25zLCBmb3JrIGFzIHN5c0ZvcmssIEZvcmtPcHRpb25zIGFzIFN5c0ZvcmtPcHRpb25zfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7V3JpdGFibGV9IGZyb20gJ3N0cmVhbSc7XG5leHBvcnQgY29uc3QgaXNXaW5kb3dzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJztcblxuZXhwb3J0IGludGVyZmFjZSBPcHRpb24gZXh0ZW5kcyBTcGF3bk9wdGlvbnMge1xuICB0aW1lb3V0PzogbnVtYmVyO1xuICBzaWxlbnQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZvcmtPcHRpb25zIGV4dGVuZHMgU3lzRm9ya09wdGlvbnMge1xuICB0aW1lb3V0PzogbnVtYmVyO1xuICBzaWxlbnQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdCB7XG4gIGNoaWxkUHJvY2VzczogQ2hpbGRQcm9jZXNzO1xuICBwcm9taXNlOiBQcm9taXNlPHN0cmluZz47XG4gIGRvbmU6IFByb21pc2U8e3N0ZG91dDogc3RyaW5nOyBlcnJvdXQ6IHN0cmluZzt9Pjtcbn1cbi8qKlxuICogU3Bhd24gcHJvY2Vzc1xuICogQHBhcmFtICB7c3RyaW5nfSBjb21tYW5kXG4gKiBAcGFyYW0gIHtzdHJpbmdbXX0gYXJnc1xuICogQHBhcmFtICB7b2JqZWN0fSBvcHRzIG9wdGlvbmFsXG4gKiAgIC0ge2Jvb2xlYW59IG9wdHMuc2lsZW50ICBjaGlsZCBwcm9jZXNzJ3MgYHN0ZG91dGAgYW5kIGBzdGRlcnJgIHN0cmVhbSB3aWxsXG4gKiAgIG5vdCBwaXBlIHRvIHByb2Nlc3Muc3Rkb3V0IGFuZCBzdGRlcnIsIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB0b1xuICogICBzdHJpbmcgb2Ygc3Rkb3V0XG4gKiAgIE90aGVyIG9wdHMgcHJvcGVydGllcyB3aWxsIGJlIHBhc3NlZCB0byBjaGlsZF9wcm9jZXNzLnNwYXduKClcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfSByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5U3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6XG4gIFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzKS5wcm9taXNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Bhd24oY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFJlc3VsdCB7XG4gIGxldCBvcHRzOiBPcHRpb24gPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gYXMgT3B0aW9uO1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIC0xKTtcbiAgfVxuXG4gIGlmIChvcHRzID09IG51bGwpIHtcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBpZiAoIShvcHRzICYmIG9wdHMuc2lsZW50KSkge1xuICAgIG9wdHMuc3RkaW8gPSAnaW5oZXJpdCc7XG4gIH1cbiAgY29uc29sZS5sb2cob3B0cy5jd2QgfHwgcHJvY2Vzcy5jd2QoKSwgJz4gc3Bhd24gcHJvY2VzczonLCBjb21tYW5kLCAuLi5hcmdzKTtcbiAgY29uc3QgcmVzID0gc3lzU3Bhd24oY29tbWFuZCwgYXJncyBhcyBzdHJpbmdbXSwgb3B0cyk7XG4gIGNvbnN0IGRvbmUgPSBjaGVja1RpbWVvdXQocHJvbWlzaWZ5Q2hpbGRQcm9jZXNzKHJlcywgb3B0cywgYCR7Y29tbWFuZH0gJHthcmdzLmpvaW4oJyAnKX1gKSwgb3B0cy50aW1lb3V0KVxuICAuY2F0Y2goZSA9PiB7XG4gICAgaWYgKGUubWVzc2FnZSA9PT0gJ1RpbWVvdXQnICYmIHJlcykge1xuICAgICAgY29uc29sZS5sb2coJ0tpbGwgdGhlIGNoaWxkIHByb2Nlc3MnKTtcbiAgICAgIHJlcy5raWxsKCdTSUdIVVAnKTtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgY2hpbGRQcm9jZXNzOiByZXMhLFxuICAgIHByb21pc2U6IGRvbmUudGhlbihzdHJzID0+IHN0cnMuc3Rkb3V0ICsgJ1xcbicgKyBzdHJzLmVycm91dCksXG4gICAgZG9uZVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9yayhqc0ZpbGU6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfEZvcmtPcHRpb25zPik6IFJlc3VsdCB7XG4gIGxldCBvcHRzOiBGb3JrT3B0aW9ucyA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXSBhcyBGb3JrT3B0aW9ucztcbiAgaWYgKHR5cGVvZiBvcHRzID09PSAnc3RyaW5nJykge1xuICAgIG9wdHMgPSB7fTtcbiAgfSBlbHNlIHtcbiAgICBhcmdzID0gYXJncy5zbGljZSgwLCAtMSk7XG4gIH1cblxuICBpZiAob3B0cyA9PSBudWxsKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgY29uc3QgcmVzID0gc3lzRm9yayhqc0ZpbGUsIGFyZ3MgYXMgc3RyaW5nW10sIG9wdHMpO1xuICBjb25zdCBkb25lID0gY2hlY2tUaW1lb3V0KHByb21pc2lmeUNoaWxkUHJvY2VzcyhyZXMsIG9wdHMsIGBGb3JrIG9mICR7anNGaWxlfWApLCBvcHRzLnRpbWVvdXQpXG4gIC5jYXRjaChlID0+IHtcbiAgICBpZiAoZS5tZXNzYWdlID09PSAnVGltZW91dCcgJiYgcmVzKSB7XG4gICAgICBjb25zb2xlLmxvZygnS2lsbCB0aGUgY2hpbGQgcHJvY2VzcycpO1xuICAgICAgcmVzLmtpbGwoJ1NJR0hVUCcpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjaGlsZFByb2Nlc3M6IHJlcyEsXG4gICAgZG9uZSxcbiAgICBwcm9taXNlOiBkb25lLnRoZW4ob3V0ID0+IG91dC5zdGRvdXQgKyAnXFxuJyArIG91dC5lcnJvdXQpXG4gIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb21pc2lmeUNoaWxkUHJvY2VzcyhyZXM6IENoaWxkUHJvY2Vzcywgb3B0czogT3B0aW9uIHwgRm9ya09wdGlvbnMsIGRlc2M6IHN0cmluZykge1xuICBsZXQgb3V0cHV0OiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVTdHJpbmdXcml0ZXI+IHwgdW5kZWZpbmVkO1xuICBsZXQgZXJyT3V0cHV0OiB0eXBlb2Ygb3V0cHV0IHwgdW5kZWZpbmVkO1xuICBjb25zdCBjcEV4aXQgPSBuZXcgUHJvbWlzZTx7Y29kZTogbnVtYmVyIHwgbnVsbCwgc2lnbmFsOiBzdHJpbmcgfCBudWxsfT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGlmIChvcHRzICYmIG9wdHMuc2lsZW50KSB7XG4gICAgICBvdXRwdXQgPSBjcmVhdGVTdHJpbmdXcml0ZXIoKTtcbiAgICAgIGVyck91dHB1dCA9IGNyZWF0ZVN0cmluZ1dyaXRlcigpO1xuICAgICAgcmVzLnN0ZG91dCEuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgICByZXMuc3Rkb3V0IS5waXBlKG91dHB1dC53cml0ZXIpO1xuICAgICAgcmVzLnN0ZGVyciEuc2V0RW5jb2RpbmcoJ3V0Zi04Jyk7XG4gICAgICByZXMuc3RkZXJyIS5waXBlKGVyck91dHB1dC53cml0ZXIpO1xuICAgIH1cbiAgICByZXMub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfSk7XG4gICAgcmVzLm9uKCdleGl0JywgZnVuY3Rpb24oY29kZSwgc2lnbmFsKSB7XG4gICAgICByZXNvbHZlKHtjb2RlLCBzaWduYWx9KTtcbiAgICB9KTtcbiAgfSk7XG4gIGNvbnN0IHtjb2RlLCBzaWduYWx9ID0gYXdhaXQgY3BFeGl0O1xuICBsZXQgam9pblRleHQgPSAnJztcbiAgbGV0IG91dHM6IHtzdGRvdXQ6IHN0cmluZzsgZXJyb3V0OiBzdHJpbmc7fSA9IHt9IGFzIGFueTtcbiAgaWYgKG9wdHMgJiYgb3B0cy5zaWxlbnQpIHtcbiAgICBjb25zdCBvdXRUZXh0cyA9IGF3YWl0IFByb21pc2UuYWxsKFtvdXRwdXQhLmRvbmUsIGVyck91dHB1dCEuZG9uZV0pO1xuICAgIGpvaW5UZXh0ID0gb3V0VGV4dHMuam9pbignXFxuJyk7XG4gICAgb3V0cy5zdGRvdXQgPSBvdXRUZXh0c1swXTtcbiAgICBvdXRzLmVycm91dCA9IG91dFRleHRzWzFdO1xuICB9XG4gIGlmIChjb2RlICE9PSAwICYmIHNpZ25hbCAhPT0gJ1NJR0lOVCcpIHtcbiAgICBjb25zdCBlcnJNc2cgPSBgQ2hpbGQgcHJvY2VzcyBcIiR7ZGVzY31cIiBleGl0IHdpdGggY29kZSAke2NvZGV9LCBzaWduYWwgYCArIHNpZ25hbDtcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyTXNnICsgJ1xcbicgKyAoam9pblRleHQgPyBqb2luVGV4dCA6ICcnKSk7XG4gIH1cbiAgcmV0dXJuIG91dHM7XG59XG5cbmZ1bmN0aW9uIGNoZWNrVGltZW91dDxUPihvcmlnUHJvbWlzZTogUHJvbWlzZTxUPiwgdGltZUJveCA9IDYwMDAwMCk6IFByb21pc2U8VD4ge1xuICBsZXQgdGltZW91dDogTm9kZUpTLlRpbWVyIHwgbnVsbDtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBvcmlnUHJvbWlzZS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZXNvbHZlKHJlcyk7XG4gICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICBpZiAodGltZW91dCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgICByZWplY3QoZSk7XG4gICAgfSk7XG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZWplY3QobmV3IEVycm9yKCdUaW1lb3V0JykpO1xuICAgIH0sIHRpbWVCb3gpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaXggc29tZSBleGVjdXRhYmxlIGNvbW1hbmQgZm9yIHdpbmRvd3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZCAgICAgW2Rlc2NyaXB0aW9uXVxuICogQHBhcmFtICB7Li4uc3RyaW5nIHwgYXJyYXl9IGNvbW1hbmRBcmdzIC4uLiBhcmd1bWVudHNcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICByZWplY3RlZCBpZiBjaGlsZCBwcm9jZXNzIGV4aXRzIHdpdGggbm9uLXplcm8gY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJvbWlzaWZ5RXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gZXhlKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pLnByb21pc2U7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSBjb21tYW5kXG4gKiBAcGFyYW0geyp9IGFyZ3NBbmRPcHRpb25cbiAqIEByZXR1cm4ge29iamVjdH0ge3Byb21pc2U6IFByb21pc2UsIGNoaWxkUHJvY2VzczogY2hpbGRfcHJvY2Vzc31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgLy8gdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIGlmIChpc1dpbmRvd3MpIHtcbiAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgIC8vIGNhc2UgJ25vZGUnOlxuICAgICAgY2FzZSAnbnBtJzpcbiAgICAgIGNhc2UgJ25weCc6XG4gICAgICBjYXNlICd5YXJuJzpcbiAgICAgIGNhc2UgJ2d1bHAnOlxuICAgICAgICBjb21tYW5kICs9ICcuY21kJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgIH1cbiAgICBjb21tYW5kID0gY29tbWFuZC5yZXBsYWNlKC9cXC8vZywgJ1xcXFwnKTtcbiAgfVxuICByZXR1cm4gc3Bhd24oY29tbWFuZCwgLi4uYXJnc0FuZE9wdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTdHJpbmdXcml0ZXIoKToge3dyaXRlcjogV3JpdGFibGUsIGRvbmU6IFByb21pc2U8c3RyaW5nPn0ge1xuICBsZXQgc3Ryczogc3RyaW5nW10gPSBbXTtcbiAgbGV0IHJlc29sdmU6IChzdHI6IHN0cmluZykgPT4gdm9pZDtcbiAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlPHN0cmluZz4ocmVzID0+IHtcbiAgICByZXNvbHZlID0gcmVzO1xuICB9KTtcbiAgY29uc3Qgd3JpdGVyID0gbmV3IFdyaXRhYmxlKHtcbiAgICB3cml0ZShjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRhdGEgb2YgY2tzKSB7XG4gICAgICAvLyAgIHN0cnMucHVzaChkYXRhLmNodW5rIGFzIHN0cmluZyk7XG4gICAgICAvLyB9XG4gICAgICBzdHJzLnB1c2goY2h1bmspO1xuICAgICAgY2IoKTtcbiAgICB9LFxuICAgIGZpbmFsKGNiKSB7XG4gICAgICBjYigpO1xuICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShzdHJzLmpvaW4oJycpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICB3cml0ZXIsXG4gICAgZG9uZVxuICB9XG59XG5cbiJdfQ==