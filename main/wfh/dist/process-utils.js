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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQXNDO0FBQ3RDLGlEQUE0SDtBQUM1SCxtQ0FBZ0M7QUFDbkIsUUFBQSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFpQnREOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFXLENBQUM7SUFDbkQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUM3RSxNQUFNLEdBQUcs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QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7S0FDRixDQUFDLENBQUM7SUFFSCxPQUFPO1FBQ0wsTUFBTTtRQUNOLElBQUk7S0FDTCxDQUFBO0FBQ0gsQ0FBQztBQTFCRCxnREEwQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlIGluZGVudCAqL1xuaW1wb3J0IHtzcGF3biBhcyBzeXNTcGF3biwgQ2hpbGRQcm9jZXNzLCBTcGF3bk9wdGlvbnMsIGZvcmsgYXMgc3lzRm9yaywgRm9ya09wdGlvbnMgYXMgU3lzRm9ya09wdGlvbnN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtXcml0YWJsZX0gZnJvbSAnc3RyZWFtJztcbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbiBleHRlbmRzIFNwYXduT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9ya09wdGlvbnMgZXh0ZW5kcyBTeXNGb3JrT3B0aW9ucyB7XG4gIHRpbWVvdXQ/OiBudW1iZXI7XG4gIHNpbGVudD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0IHtcbiAgY2hpbGRQcm9jZXNzOiBDaGlsZFByb2Nlc3M7XG4gIHByb21pc2U6IFByb21pc2U8c3RyaW5nPjtcbiAgZG9uZTogUHJvbWlzZTx7c3Rkb3V0OiBzdHJpbmc7IGVycm91dDogc3RyaW5nO30+O1xufVxuLyoqXG4gKiBTcGF3biBwcm9jZXNzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGNvbW1hbmRcbiAqIEBwYXJhbSAge3N0cmluZ1tdfSBhcmdzXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9wdHMgb3B0aW9uYWxcbiAqICAgLSB7Ym9vbGVhbn0gb3B0cy5zaWxlbnQgIGNoaWxkIHByb2Nlc3MncyBgc3Rkb3V0YCBhbmQgYHN0ZGVycmAgc3RyZWFtIHdpbGxcbiAqICAgbm90IHBpcGUgdG8gcHJvY2Vzcy5zdGRvdXQgYW5kIHN0ZGVyciwgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHRvXG4gKiAgIHN0cmluZyBvZiBzdGRvdXRcbiAqICAgT3RoZXIgb3B0cyBwcm9wZXJ0aWVzIHdpbGwgYmUgcGFzc2VkIHRvIGNoaWxkX3Byb2Nlc3Muc3Bhd24oKVxuICpcbiAqIEByZXR1cm4ge1Byb21pc2V9IHJlamVjdGVkIGlmIGNoaWxkIHByb2Nlc3MgZXhpdHMgd2l0aCBub24temVybyBjb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9taXNpZnlTcGF3bihjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3M6IEFycmF5PHN0cmluZ3xPcHRpb24+KTpcbiAgUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIHNwYXduKGNvbW1hbmQsIC4uLmFyZ3MpLnByb21pc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGF3bihjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3M6IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUmVzdWx0IHtcbiAgbGV0IG9wdHM6IE9wdGlvbiA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXSBhcyBPcHRpb247XG4gIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpIHtcbiAgICBvcHRzID0ge307XG4gIH0gZWxzZSB7XG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgLTEpO1xuICB9XG5cbiAgaWYgKG9wdHMgPT0gbnVsbCkge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGlmICghKG9wdHMgJiYgb3B0cy5zaWxlbnQpKSB7XG4gICAgb3B0cy5zdGRpbyA9ICdpbmhlcml0JztcbiAgfVxuICBjb25zb2xlLmxvZyhvcHRzLmN3ZCB8fCBwcm9jZXNzLmN3ZCgpLCAnPiBzcGF3biBwcm9jZXNzOicsIGNvbW1hbmQsIC4uLmFyZ3MpO1xuICBjb25zdCByZXMgPSBzeXNTcGF3bihjb21tYW5kLCBhcmdzIGFzIHN0cmluZ1tdLCBvcHRzKTtcbiAgY29uc3QgZG9uZSA9IGNoZWNrVGltZW91dChwcm9taXNpZnlDaGlsZFByb2Nlc3MocmVzLCBvcHRzLCBgJHtjb21tYW5kfSAke2FyZ3Muam9pbignICcpfWApLCBvcHRzLnRpbWVvdXQpXG4gIC5jYXRjaChlID0+IHtcbiAgICBpZiAoZS5tZXNzYWdlID09PSAnVGltZW91dCcgJiYgcmVzKSB7XG4gICAgICBjb25zb2xlLmxvZygnS2lsbCB0aGUgY2hpbGQgcHJvY2VzcycpO1xuICAgICAgcmVzLmtpbGwoJ1NJR0hVUCcpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjaGlsZFByb2Nlc3M6IHJlcyEsXG4gICAgcHJvbWlzZTogZG9uZS50aGVuKHN0cnMgPT4gc3Rycy5zdGRvdXQgKyAnXFxuJyArIHN0cnMuZXJyb3V0KSxcbiAgICBkb25lXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JrKGpzRmlsZTogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmd8Rm9ya09wdGlvbnM+KTogUmVzdWx0IHtcbiAgbGV0IG9wdHM6IEZvcmtPcHRpb25zID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdIGFzIEZvcmtPcHRpb25zO1xuICBpZiAodHlwZW9mIG9wdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIC0xKTtcbiAgfVxuXG4gIGlmIChvcHRzID09IG51bGwpIHtcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBjb25zdCByZXMgPSBzeXNGb3JrKGpzRmlsZSwgYXJncyBhcyBzdHJpbmdbXSwgb3B0cyk7XG4gIGNvbnN0IGRvbmUgPSBjaGVja1RpbWVvdXQocHJvbWlzaWZ5Q2hpbGRQcm9jZXNzKHJlcywgb3B0cywgYEZvcmsgb2YgJHtqc0ZpbGV9YCksIG9wdHMudGltZW91dClcbiAgLmNhdGNoKGUgPT4ge1xuICAgIGlmIChlLm1lc3NhZ2UgPT09ICdUaW1lb3V0JyAmJiByZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdLaWxsIHRoZSBjaGlsZCBwcm9jZXNzJyk7XG4gICAgICByZXMua2lsbCgnU0lHSFVQJyk7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIGNoaWxkUHJvY2VzczogcmVzISxcbiAgICBkb25lLFxuICAgIHByb21pc2U6IGRvbmUudGhlbihvdXQgPT4gb3V0LnN0ZG91dCArICdcXG4nICsgb3V0LmVycm91dClcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvbWlzaWZ5Q2hpbGRQcm9jZXNzKHJlczogQ2hpbGRQcm9jZXNzLCBvcHRzOiBPcHRpb24gfCBGb3JrT3B0aW9ucywgZGVzYzogc3RyaW5nKSB7XG4gIGxldCBvdXRwdXQ6IFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVN0cmluZ1dyaXRlcj4gfCB1bmRlZmluZWQ7XG4gIGxldCBlcnJPdXRwdXQ6IHR5cGVvZiBvdXRwdXQgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IGNwRXhpdCA9IG5ldyBQcm9taXNlPHtjb2RlOiBudW1iZXIgfCBudWxsLCBzaWduYWw6IHN0cmluZyB8IG51bGx9PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKG9wdHMgJiYgb3B0cy5zaWxlbnQpIHtcbiAgICAgIG91dHB1dCA9IGNyZWF0ZVN0cmluZ1dyaXRlcigpO1xuICAgICAgZXJyT3V0cHV0ID0gY3JlYXRlU3RyaW5nV3JpdGVyKCk7XG4gICAgICByZXMuc3Rkb3V0IS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRvdXQhLnBpcGUob3V0cHV0LndyaXRlcik7XG4gICAgICByZXMuc3RkZXJyIS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRlcnIhLnBpcGUoZXJyT3V0cHV0LndyaXRlcik7XG4gICAgfVxuICAgIHJlcy5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgICByZXMub24oJ2V4aXQnLCBmdW5jdGlvbihjb2RlLCBzaWduYWwpIHtcbiAgICAgIHJlc29sdmUoe2NvZGUsIHNpZ25hbH0pO1xuICAgIH0pO1xuICB9KTtcbiAgY29uc3Qge2NvZGUsIHNpZ25hbH0gPSBhd2FpdCBjcEV4aXQ7XG4gIGxldCBqb2luVGV4dCA9ICcnO1xuICBsZXQgb3V0czoge3N0ZG91dDogc3RyaW5nOyBlcnJvdXQ6IHN0cmluZzt9ID0ge30gYXMgYW55O1xuICBpZiAob3B0cyAmJiBvcHRzLnNpbGVudCkge1xuICAgIGNvbnN0IG91dFRleHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoW291dHB1dCEuZG9uZSwgZXJyT3V0cHV0IS5kb25lXSk7XG4gICAgam9pblRleHQgPSBvdXRUZXh0cy5qb2luKCdcXG4nKTtcbiAgICBvdXRzLnN0ZG91dCA9IG91dFRleHRzWzBdO1xuICAgIG91dHMuZXJyb3V0ID0gb3V0VGV4dHNbMV07XG4gIH1cbiAgaWYgKGNvZGUgIT09IDAgJiYgc2lnbmFsICE9PSAnU0lHSU5UJykge1xuICAgIGNvbnN0IGVyck1zZyA9IGBDaGlsZCBwcm9jZXNzIFwiJHtkZXNjfVwiIGV4aXQgd2l0aCBjb2RlICR7Y29kZX0sIHNpZ25hbCBgICsgc2lnbmFsO1xuICAgIHRocm93IG5ldyBFcnJvcihlcnJNc2cgKyAnXFxuJyArIChqb2luVGV4dCA/IGpvaW5UZXh0IDogJycpKTtcbiAgfVxuICByZXR1cm4gb3V0cztcbn1cblxuZnVuY3Rpb24gY2hlY2tUaW1lb3V0PFQ+KG9yaWdQcm9taXNlOiBQcm9taXNlPFQ+LCB0aW1lQm94ID0gNjAwMDAwKTogUHJvbWlzZTxUPiB7XG4gIGxldCB0aW1lb3V0OiBOb2RlSlMuVGltZXIgfCBudWxsO1xuICByZXR1cm4gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIG9yaWdQcm9taXNlLnRoZW4ocmVzID0+IHtcbiAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUocmVzKTtcbiAgICB9KS5jYXRjaChlID0+IHtcbiAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIH1cbiAgICAgIHJlamVjdChlKTtcbiAgICB9KTtcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1RpbWVvdXQnKSk7XG4gICAgfSwgdGltZUJveCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpeCBzb21lIGV4ZWN1dGFibGUgY29tbWFuZCBmb3Igd2luZG93c1xuICogQHBhcmFtICB7c3RyaW5nfSBjb21tYW5kICAgICBbZGVzY3JpcHRpb25dXG4gKiBAcGFyYW0gIHsuLi5zdHJpbmcgfCBhcnJheX0gY29tbWFuZEFyZ3MgLi4uIGFyZ3VtZW50c1xuICogQHBhcmFtICB7b2JqZWN0fSBvcHRzIG9wdGlvbmFsXG4gKiAgIC0ge2Jvb2xlYW59IG9wdHMuc2lsZW50ICBjaGlsZCBwcm9jZXNzJ3MgYHN0ZG91dGAgYW5kIGBzdGRlcnJgIHN0cmVhbSB3aWxsXG4gKiAgIG5vdCBwaXBlIHRvIHByb2Nlc3Muc3Rkb3V0IGFuZCBzdGRlcnIsIHJldHVybmVkIHByb21pc2Ugd2lsbCBiZSByZXNvbHZlZCB0b1xuICogICBzdHJpbmcgb2Ygc3Rkb3V0XG4gKlxuICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgIHJlamVjdGVkIGlmIGNoaWxkIHByb2Nlc3MgZXhpdHMgd2l0aCBub24temVybyBjb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcm9taXNpZnlFeGUoY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzQW5kT3B0aW9uOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFByb21pc2U8c3RyaW5nPiB7XG4gIHJldHVybiBleGUoY29tbWFuZCwgLi4uYXJnc0FuZE9wdGlvbikucHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IGNvbW1hbmRcbiAqIEBwYXJhbSB7Kn0gYXJnc0FuZE9wdGlvblxuICogQHJldHVybiB7b2JqZWN0fSB7cHJvbWlzZTogUHJvbWlzZSwgY2hpbGRQcm9jZXNzOiBjaGlsZF9wcm9jZXNzfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhlKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnc0FuZE9wdGlvbjogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBSZXN1bHQge1xuICAvLyB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgaWYgKGlzV2luZG93cykge1xuICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgLy8gY2FzZSAnbm9kZSc6XG4gICAgICBjYXNlICducG0nOlxuICAgICAgY2FzZSAnbnB4JzpcbiAgICAgIGNhc2UgJ3lhcm4nOlxuICAgICAgY2FzZSAnZ3VscCc6XG4gICAgICAgIGNvbW1hbmQgKz0gJy5jbWQnO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjb21tYW5kLnJlcGxhY2UoL1xcLy9nLCAnXFxcXCcpO1xuICB9XG4gIHJldHVybiBzcGF3bihjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN0cmluZ1dyaXRlcigpOiB7d3JpdGVyOiBXcml0YWJsZSwgZG9uZTogUHJvbWlzZTxzdHJpbmc+fSB7XG4gIGxldCBzdHJzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgcmVzb2x2ZTogKHN0cjogc3RyaW5nKSA9PiB2b2lkO1xuICBjb25zdCBkb25lID0gbmV3IFByb21pc2U8c3RyaW5nPihyZXMgPT4ge1xuICAgIHJlc29sdmUgPSByZXM7XG4gIH0pO1xuICBjb25zdCB3cml0ZXIgPSBuZXcgV3JpdGFibGUoe1xuICAgIHdyaXRlKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgICAgIC8vIGZvciAoY29uc3QgZGF0YSBvZiBja3MpIHtcbiAgICAgIC8vICAgc3Rycy5wdXNoKGRhdGEuY2h1bmsgYXMgc3RyaW5nKTtcbiAgICAgIC8vIH1cbiAgICAgIHN0cnMucHVzaChjaHVuayk7XG4gICAgICBjYigpO1xuICAgIH0sXG4gICAgZmluYWwoY2IpIHtcbiAgICAgIGNiKCk7XG4gICAgICBzZXRJbW1lZGlhdGUoKCkgPT4ge1xuICAgICAgICByZXNvbHZlKHN0cnMuam9pbignJykpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHdyaXRlcixcbiAgICBkb25lXG4gIH1cbn1cblxuIl19