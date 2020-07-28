/* tslint:disable:no-console indent */
import {spawn as sysSpawn, ChildProcess, SpawnOptions} from 'child_process';
export const isWindows = process.platform === 'win32';

export interface Option extends SpawnOptions {
  timeout?: number;
  silent?: boolean;
}

export interface Result {
  childProcess: ChildProcess;
  promise: Promise<string>;
}
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
export function promisifySpawn(command: string, ...args: Array<string|Option>):
  Promise<string> {
  return spawn(command, ...args).promise;
}

export function spawn(command: string, ...args: Array<string|Option>): Result {
  let opts: any = args[args.length - 1];
  if (typeof opts === 'string') {
    opts = {};
  } else {
    args = args.slice(0, -1);
  }

  if (opts == null) {
    opts = {};
  }

  if (!(opts && opts.silent)) {
    opts.stdio = 'inherit';
  }
  let res: ChildProcess;
  const promise = checkTimeout(new Promise<string>((resolve, reject) => {
    res = sysSpawn(command, args as string[], opts);
    // console.log(command, args);
    let output: string;
    if (opts && opts.silent) {
      output = '';
      res.stdout!.setEncoding('utf-8');
      res.stdout!.on('data', (chunk) => {
        output += chunk;
      });
      res.stderr!.setEncoding('utf-8');
      res.stderr!.on('data', (chunk) => {
        output += chunk;
      });
    }
    res.on('error', (err) => {
      reject(err);
    });
    res.on('exit', function(code, signal) {
      if (code !== 0 && signal !== 'SIGINT') {
        const errMsg = `Child process "${command} ${args.join(' ')}" exit with code ${code}, signal ` + signal;
        if (opts == null || opts.silent !== true) {
          console.log(errMsg);
          if (output) {
            console.log(output);
          }
        }
        return reject(new Error(errMsg + '\n' + (output ? output : '')));
      } else {
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
    childProcess: res!,
    promise
  };
}

function checkTimeout<T>(origPromise: Promise<T>, timeBox = 600000): Promise<T> {
  let timeout: NodeJS.Timer | null;
  return new Promise<T>((resolve, reject) => {
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
export function promisifyExe(command: string, ...argsAndOption: Array<string|Option>): Promise<string> {
  return exe(command, ...argsAndOption).promise;
}

/**
 * @param {*} command
 * @param {*} argsAndOption
 * @return {object} {promise: Promise, childProcess: child_process}
 */
export function exe(command: string, ...argsAndOption: Array<string|Option>): Result {
  // var args = [].slice.call(arguments);
  if (isWindows) {
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
