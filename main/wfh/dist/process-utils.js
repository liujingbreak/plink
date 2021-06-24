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
            const errMsg = `Child process "${desc}" exit with code ${'' + code}, signal ` + signal;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzcy11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3Byb2Nlc3MtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsa0VBQWtFO0FBQ2xFLGlEQUE0SDtBQUM1SCxtQ0FBZ0M7QUFDbkIsUUFBQSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUM7QUFpQnREOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQTBCO0lBRTNFLE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN6QyxDQUFDO0FBSEQsd0NBR0M7QUFFRCxTQUFnQixLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBMEI7SUFDbEUsSUFBSSxJQUFJLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFXLENBQUM7SUFDbkQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ3hCO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUM3RSxNQUFNLEdBQUcsR0FBRyxxQkFBUSxDQUFDLE9BQU8sRUFBRSxJQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RELE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDeEcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ1QsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLFNBQVMsSUFBSSxHQUFHLEVBQUU7WUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDcEI7UUFDRCxNQUFNLENBQUMsQ0FBQztJQUNWLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTztRQUNMLFlBQVksRUFBRSxHQUFHO1FBQ2pCLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUM1RCxJQUFJO0tBQ0wsQ0FBQztBQUNKLENBQUM7QUE5QkQsc0JBOEJDO0FBRUQsU0FBZ0IsSUFBSSxDQUFDLE1BQWMsRUFBRSxHQUFHLElBQStCO0lBQ3JFLElBQUksSUFBSSxHQUFnQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQWdCLENBQUM7SUFDN0QsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDNUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztLQUNYO1NBQU07UUFDTCxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxQjtJQUVELElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsRUFBRSxDQUFDO0tBQ1g7SUFFRCxNQUFNLEdBQUcsR0FBRyxvQkFBTyxDQUFDLE1BQU0sRUFBRSxJQUFnQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BELE1BQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO1NBQzdGLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNULElBQUksQ0FBQyxDQUFDLE9BQU8sS0FBSyxTQUFTLElBQUksR0FBRyxFQUFFO1lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3BCO1FBQ0QsTUFBTSxDQUFDLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU87UUFDTCxZQUFZLEVBQUUsR0FBRztRQUNqQixJQUFJO1FBQ0osT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0tBQzFELENBQUM7QUFDSixDQUFDO0FBMUJELG9CQTBCQztBQUVELFNBQWUscUJBQXFCLENBQUMsR0FBaUIsRUFBRSxJQUEwQixFQUFFLElBQVk7O1FBQzlGLElBQUksTUFBeUQsQ0FBQztRQUM5RCxJQUFJLFNBQW9DLENBQUM7UUFDekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQStDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzNGLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ3ZCLE1BQU0sR0FBRyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QixTQUFTLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztnQkFDakMsR0FBRyxDQUFDLE1BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2pDLEdBQUcsQ0FBQyxNQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDaEMsR0FBRyxDQUFDLE1BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2pDLEdBQUcsQ0FBQyxNQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNwQztZQUNELEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ3RCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1lBQ0gsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBUyxJQUFJLEVBQUUsTUFBTTtnQkFDbEMsT0FBTyxDQUFDLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUM7WUFDMUIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFDLEdBQUcsTUFBTSxNQUFNLENBQUM7UUFDcEMsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLElBQUksSUFBSSxHQUFHLEVBQXNDLENBQUM7UUFDbEQsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUN2QixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFPLENBQUMsSUFBSSxFQUFFLFNBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLFFBQVEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzNCO1FBQ0QsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7WUFDckMsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLElBQUksb0JBQW9CLEVBQUUsR0FBRyxJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUM7WUFDdkYsTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FBQTtBQUVELFNBQVMsWUFBWSxDQUFJLFdBQXVCLEVBQUUsT0FBTyxHQUFHLE1BQU07SUFDaEUsSUFBSSxPQUE0QixDQUFDO0lBQ2pDLE9BQU8sSUFBSSxPQUFPLENBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDeEMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNyQixJQUFJLE9BQU8sRUFBRTtnQkFDWCxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdkI7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDWCxJQUFJLE9BQU8sRUFBRTtnQkFDWCxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDdkI7WUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3hCLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDZixNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUMvQixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLE9BQWUsRUFBRSxHQUFHLGFBQW1DO0lBQ2xGLE9BQU8sR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNoRCxDQUFDO0FBRkQsb0NBRUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsR0FBRyxDQUFDLE9BQWUsRUFBRSxHQUFHLGFBQW1DO0lBQ3pFLHVDQUF1QztJQUN2QyxJQUFJLGlCQUFTLEVBQUU7UUFDYixRQUFRLE9BQU8sRUFBRTtZQUNmLGVBQWU7WUFDZixLQUFLLEtBQUssQ0FBQztZQUNYLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLE1BQU07Z0JBQ1QsT0FBTyxJQUFJLE1BQU0sQ0FBQztnQkFDbEIsTUFBTTtZQUNSLFFBQVE7U0FDVDtRQUNELE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN4QztJQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFoQkQsa0JBZ0JDO0FBRUQsU0FBZ0Isa0JBQWtCO0lBQ2hDLElBQUksSUFBSSxHQUFhLEVBQUUsQ0FBQztJQUN4QixJQUFJLE9BQThCLENBQUM7SUFDbkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQVMsR0FBRyxDQUFDLEVBQUU7UUFDckMsT0FBTyxHQUFHLEdBQUcsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sTUFBTSxHQUFHLElBQUksaUJBQVEsQ0FBQztRQUMxQixLQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ3ZCLDRCQUE0QjtZQUM1QixxQ0FBcUM7WUFDckMsSUFBSTtZQUNKLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakIsRUFBRSxFQUFFLENBQUM7UUFDUCxDQUFDO1FBQ0QsS0FBSyxDQUFDLEVBQUU7WUFDTixFQUFFLEVBQUUsQ0FBQztZQUNMLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTztRQUNMLE1BQU07UUFDTixJQUFJO0tBQ0wsQ0FBQztBQUNKLENBQUM7QUExQkQsZ0RBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSwgaW5kZW50LCBAdHlwZXNjcmlwdC1lc2xpbnQvaW5kZW50ICovXG5pbXBvcnQge3NwYXduIGFzIHN5c1NwYXduLCBDaGlsZFByb2Nlc3MsIFNwYXduT3B0aW9ucywgZm9yayBhcyBzeXNGb3JrLCBGb3JrT3B0aW9ucyBhcyBTeXNGb3JrT3B0aW9uc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge1dyaXRhYmxlfSBmcm9tICdzdHJlYW0nO1xuZXhwb3J0IGNvbnN0IGlzV2luZG93cyA9IHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9uIGV4dGVuZHMgU3Bhd25PcHRpb25zIHtcbiAgdGltZW91dD86IG51bWJlcjtcbiAgc2lsZW50PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGb3JrT3B0aW9ucyBleHRlbmRzIFN5c0ZvcmtPcHRpb25zIHtcbiAgdGltZW91dD86IG51bWJlcjtcbiAgc2lsZW50PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHQge1xuICBjaGlsZFByb2Nlc3M6IENoaWxkUHJvY2VzcztcbiAgcHJvbWlzZTogUHJvbWlzZTxzdHJpbmc+O1xuICBkb25lOiBQcm9taXNlPHtzdGRvdXQ6IHN0cmluZzsgZXJyb3V0OiBzdHJpbmc7fT47XG59XG4vKipcbiAqIFNwYXduIHByb2Nlc3NcbiAqIEBwYXJhbSAge3N0cmluZ30gY29tbWFuZFxuICogQHBhcmFtICB7c3RyaW5nW119IGFyZ3NcbiAqIEBwYXJhbSAge29iamVjdH0gb3B0cyBvcHRpb25hbFxuICogICAtIHtib29sZWFufSBvcHRzLnNpbGVudCAgY2hpbGQgcHJvY2VzcydzIGBzdGRvdXRgIGFuZCBgc3RkZXJyYCBzdHJlYW0gd2lsbFxuICogICBub3QgcGlwZSB0byBwcm9jZXNzLnN0ZG91dCBhbmQgc3RkZXJyLCByZXR1cm5lZCBwcm9taXNlIHdpbGwgYmUgcmVzb2x2ZWQgdG9cbiAqICAgc3RyaW5nIG9mIHN0ZG91dFxuICogICBPdGhlciBvcHRzIHByb3BlcnRpZXMgd2lsbCBiZSBwYXNzZWQgdG8gY2hpbGRfcHJvY2Vzcy5zcGF3bigpXG4gKlxuICogQHJldHVybiB7UHJvbWlzZX0gcmVqZWN0ZWQgaWYgY2hpbGQgcHJvY2VzcyBleGl0cyB3aXRoIG5vbi16ZXJvIGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb21pc2lmeVNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOlxuICBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gc3Bhd24oY29tbWFuZCwgLi4uYXJncykucHJvbWlzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwYXduKGNvbW1hbmQ6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfE9wdGlvbj4pOiBSZXN1bHQge1xuICBsZXQgb3B0czogT3B0aW9uID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdIGFzIE9wdGlvbjtcbiAgaWYgKHR5cGVvZiBvcHRzID09PSAnc3RyaW5nJykge1xuICAgIG9wdHMgPSB7fTtcbiAgfSBlbHNlIHtcbiAgICBhcmdzID0gYXJncy5zbGljZSgwLCAtMSk7XG4gIH1cblxuICBpZiAob3B0cyA9PSBudWxsKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgaWYgKCEob3B0cyAmJiBvcHRzLnNpbGVudCkpIHtcbiAgICBvcHRzLnN0ZGlvID0gJ2luaGVyaXQnO1xuICB9XG4gIGNvbnNvbGUubG9nKG9wdHMuY3dkIHx8IHByb2Nlc3MuY3dkKCksICc+IHNwYXduIHByb2Nlc3M6JywgY29tbWFuZCwgLi4uYXJncyk7XG4gIGNvbnN0IHJlcyA9IHN5c1NwYXduKGNvbW1hbmQsIGFyZ3MgYXMgc3RyaW5nW10sIG9wdHMpO1xuICBjb25zdCBkb25lID0gY2hlY2tUaW1lb3V0KHByb21pc2lmeUNoaWxkUHJvY2VzcyhyZXMsIG9wdHMsIGAke2NvbW1hbmR9ICR7YXJncy5qb2luKCcgJyl9YCksIG9wdHMudGltZW91dClcbiAgLmNhdGNoKGUgPT4ge1xuICAgIGlmIChlLm1lc3NhZ2UgPT09ICdUaW1lb3V0JyAmJiByZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdLaWxsIHRoZSBjaGlsZCBwcm9jZXNzJyk7XG4gICAgICByZXMua2lsbCgnU0lHSFVQJyk7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIGNoaWxkUHJvY2VzczogcmVzLFxuICAgIHByb21pc2U6IGRvbmUudGhlbihzdHJzID0+IHN0cnMuc3Rkb3V0ICsgJ1xcbicgKyBzdHJzLmVycm91dCksXG4gICAgZG9uZVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9yayhqc0ZpbGU6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nfEZvcmtPcHRpb25zPik6IFJlc3VsdCB7XG4gIGxldCBvcHRzOiBGb3JrT3B0aW9ucyA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXSBhcyBGb3JrT3B0aW9ucztcbiAgaWYgKHR5cGVvZiBvcHRzID09PSAnc3RyaW5nJykge1xuICAgIG9wdHMgPSB7fTtcbiAgfSBlbHNlIHtcbiAgICBhcmdzID0gYXJncy5zbGljZSgwLCAtMSk7XG4gIH1cblxuICBpZiAob3B0cyA9PSBudWxsKSB7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgY29uc3QgcmVzID0gc3lzRm9yayhqc0ZpbGUsIGFyZ3MgYXMgc3RyaW5nW10sIG9wdHMpO1xuICBjb25zdCBkb25lID0gY2hlY2tUaW1lb3V0KHByb21pc2lmeUNoaWxkUHJvY2VzcyhyZXMsIG9wdHMsIGBGb3JrIG9mICR7anNGaWxlfWApLCBvcHRzLnRpbWVvdXQpXG4gIC5jYXRjaChlID0+IHtcbiAgICBpZiAoZS5tZXNzYWdlID09PSAnVGltZW91dCcgJiYgcmVzKSB7XG4gICAgICBjb25zb2xlLmxvZygnS2lsbCB0aGUgY2hpbGQgcHJvY2VzcycpO1xuICAgICAgcmVzLmtpbGwoJ1NJR0hVUCcpO1xuICAgIH1cbiAgICB0aHJvdyBlO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBjaGlsZFByb2Nlc3M6IHJlcyxcbiAgICBkb25lLFxuICAgIHByb21pc2U6IGRvbmUudGhlbihvdXQgPT4gb3V0LnN0ZG91dCArICdcXG4nICsgb3V0LmVycm91dClcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvbWlzaWZ5Q2hpbGRQcm9jZXNzKHJlczogQ2hpbGRQcm9jZXNzLCBvcHRzOiBPcHRpb24gfCBGb3JrT3B0aW9ucywgZGVzYzogc3RyaW5nKSB7XG4gIGxldCBvdXRwdXQ6IFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVN0cmluZ1dyaXRlcj4gfCB1bmRlZmluZWQ7XG4gIGxldCBlcnJPdXRwdXQ6IHR5cGVvZiBvdXRwdXQgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IGNwRXhpdCA9IG5ldyBQcm9taXNlPHtjb2RlOiBudW1iZXIgfCBudWxsLCBzaWduYWw6IHN0cmluZyB8IG51bGx9PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKG9wdHMgJiYgb3B0cy5zaWxlbnQpIHtcbiAgICAgIG91dHB1dCA9IGNyZWF0ZVN0cmluZ1dyaXRlcigpO1xuICAgICAgZXJyT3V0cHV0ID0gY3JlYXRlU3RyaW5nV3JpdGVyKCk7XG4gICAgICByZXMuc3Rkb3V0IS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRvdXQhLnBpcGUob3V0cHV0LndyaXRlcik7XG4gICAgICByZXMuc3RkZXJyIS5zZXRFbmNvZGluZygndXRmLTgnKTtcbiAgICAgIHJlcy5zdGRlcnIhLnBpcGUoZXJyT3V0cHV0LndyaXRlcik7XG4gICAgfVxuICAgIHJlcy5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgICByZXMub24oJ2V4aXQnLCBmdW5jdGlvbihjb2RlLCBzaWduYWwpIHtcbiAgICAgIHJlc29sdmUoe2NvZGUsIHNpZ25hbH0pO1xuICAgIH0pO1xuICB9KTtcbiAgY29uc3Qge2NvZGUsIHNpZ25hbH0gPSBhd2FpdCBjcEV4aXQ7XG4gIGxldCBqb2luVGV4dCA9ICcnO1xuICBsZXQgb3V0cyA9IHt9IGFzIHtzdGRvdXQ6IHN0cmluZzsgZXJyb3V0OiBzdHJpbmd9O1xuICBpZiAob3B0cyAmJiBvcHRzLnNpbGVudCkge1xuICAgIGNvbnN0IG91dFRleHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoW291dHB1dCEuZG9uZSwgZXJyT3V0cHV0IS5kb25lXSk7XG4gICAgam9pblRleHQgPSBvdXRUZXh0cy5qb2luKCdcXG4nKTtcbiAgICBvdXRzLnN0ZG91dCA9IG91dFRleHRzWzBdO1xuICAgIG91dHMuZXJyb3V0ID0gb3V0VGV4dHNbMV07XG4gIH1cbiAgaWYgKGNvZGUgIT09IDAgJiYgc2lnbmFsICE9PSAnU0lHSU5UJykge1xuICAgIGNvbnN0IGVyck1zZyA9IGBDaGlsZCBwcm9jZXNzIFwiJHtkZXNjfVwiIGV4aXQgd2l0aCBjb2RlICR7JycgKyBjb2RlfSwgc2lnbmFsIGAgKyBzaWduYWw7XG4gICAgdGhyb3cgbmV3IEVycm9yKGVyck1zZyArICdcXG4nICsgKGpvaW5UZXh0ID8gam9pblRleHQgOiAnJykpO1xuICB9XG4gIHJldHVybiBvdXRzO1xufVxuXG5mdW5jdGlvbiBjaGVja1RpbWVvdXQ8VD4ob3JpZ1Byb21pc2U6IFByb21pc2U8VD4sIHRpbWVCb3ggPSA2MDAwMDApOiBQcm9taXNlPFQ+IHtcbiAgbGV0IHRpbWVvdXQ6IE5vZGVKUy5UaW1lciB8IG51bGw7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgb3JpZ1Byb21pc2UudGhlbihyZXMgPT4ge1xuICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgfVxuICAgICAgcmVzb2x2ZShyZXMpO1xuICAgIH0pLmNhdGNoKGUgPT4ge1xuICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgfVxuICAgICAgcmVqZWN0KGUpO1xuICAgIH0pO1xuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKTtcbiAgICB9LCB0aW1lQm94KTtcbiAgfSk7XG59XG5cbi8qKlxuICogRml4IHNvbWUgZXhlY3V0YWJsZSBjb21tYW5kIGZvciB3aW5kb3dzXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGNvbW1hbmQgICAgIFtkZXNjcmlwdGlvbl1cbiAqIEBwYXJhbSAgey4uLnN0cmluZyB8IGFycmF5fSBjb21tYW5kQXJncyAuLi4gYXJndW1lbnRzXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9wdHMgb3B0aW9uYWxcbiAqICAgLSB7Ym9vbGVhbn0gb3B0cy5zaWxlbnQgIGNoaWxkIHByb2Nlc3MncyBgc3Rkb3V0YCBhbmQgYHN0ZGVycmAgc3RyZWFtIHdpbGxcbiAqICAgbm90IHBpcGUgdG8gcHJvY2Vzcy5zdGRvdXQgYW5kIHN0ZGVyciwgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlc29sdmVkIHRvXG4gKiAgIHN0cmluZyBvZiBzdGRvdXRcbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgcmVqZWN0ZWQgaWYgY2hpbGQgcHJvY2VzcyBleGl0cyB3aXRoIG5vbi16ZXJvIGNvZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb21pc2lmeUV4ZShjb21tYW5kOiBzdHJpbmcsIC4uLmFyZ3NBbmRPcHRpb246IEFycmF5PHN0cmluZ3xPcHRpb24+KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgcmV0dXJuIGV4ZShjb21tYW5kLCAuLi5hcmdzQW5kT3B0aW9uKS5wcm9taXNlO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gY29tbWFuZFxuICogQHBhcmFtIHsqfSBhcmdzQW5kT3B0aW9uXG4gKiBAcmV0dXJuIHtvYmplY3R9IHtwcm9taXNlOiBQcm9taXNlLCBjaGlsZFByb2Nlc3M6IGNoaWxkX3Byb2Nlc3N9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGUoY29tbWFuZDogc3RyaW5nLCAuLi5hcmdzQW5kT3B0aW9uOiBBcnJheTxzdHJpbmd8T3B0aW9uPik6IFJlc3VsdCB7XG4gIC8vIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICBpZiAoaXNXaW5kb3dzKSB7XG4gICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAvLyBjYXNlICdub2RlJzpcbiAgICAgIGNhc2UgJ25wbSc6XG4gICAgICBjYXNlICducHgnOlxuICAgICAgY2FzZSAneWFybic6XG4gICAgICBjYXNlICdndWxwJzpcbiAgICAgICAgY29tbWFuZCArPSAnLmNtZCc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICB9XG4gICAgY29tbWFuZCA9IGNvbW1hbmQucmVwbGFjZSgvXFwvL2csICdcXFxcJyk7XG4gIH1cbiAgcmV0dXJuIHNwYXduKGNvbW1hbmQsIC4uLmFyZ3NBbmRPcHRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3RyaW5nV3JpdGVyKCk6IHt3cml0ZXI6IFdyaXRhYmxlOyBkb25lOiBQcm9taXNlPHN0cmluZz59IHtcbiAgbGV0IHN0cnM6IHN0cmluZ1tdID0gW107XG4gIGxldCByZXNvbHZlOiAoc3RyOiBzdHJpbmcpID0+IHZvaWQ7XG4gIGNvbnN0IGRvbmUgPSBuZXcgUHJvbWlzZTxzdHJpbmc+KHJlcyA9PiB7XG4gICAgcmVzb2x2ZSA9IHJlcztcbiAgfSk7XG4gIGNvbnN0IHdyaXRlciA9IG5ldyBXcml0YWJsZSh7XG4gICAgd3JpdGUoY2h1bmssIGVuY29kaW5nLCBjYikge1xuICAgICAgLy8gZm9yIChjb25zdCBkYXRhIG9mIGNrcykge1xuICAgICAgLy8gICBzdHJzLnB1c2goZGF0YS5jaHVuayBhcyBzdHJpbmcpO1xuICAgICAgLy8gfVxuICAgICAgc3Rycy5wdXNoKGNodW5rKTtcbiAgICAgIGNiKCk7XG4gICAgfSxcbiAgICBmaW5hbChjYikge1xuICAgICAgY2IoKTtcbiAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiB7XG4gICAgICAgIHJlc29sdmUoc3Rycy5qb2luKCcnKSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgd3JpdGVyLFxuICAgIGRvbmVcbiAgfTtcbn1cblxuIl19