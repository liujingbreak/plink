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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzQ0FBc0M7QUFDdEMsaURBQTRFO0FBQy9ELFFBQUEsU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDO0FBV3REOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsSUFBSSxHQUFpQixDQUFDO0lBQ3RCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNuRSxHQUFHLEdBQUcscUJBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBZ0IsRUFBRSxJQUFJLENB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