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
//# sourceMappingURL=process-utils.js.map