/// <reference types="node" />
import { ChildProcess, SpawnOptions, ForkOptions as SysForkOptions } from 'child_process';
import { Writable } from 'stream';
export declare const isWindows: boolean;
export interface Option extends SpawnOptions {
    timeout?: number;
    silent?: boolean;
}
export interface ForkOptions extends SysForkOptions {
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
export declare function promisifySpawn(command: string, ...args: Array<string | Option>): Promise<string>;
export declare function spawn(command: string, ...args: Array<string | Option>): Result;
export declare function fork(jsFile: string, ...args: Array<string | ForkOptions>): Result;
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
export declare function promisifyExe(command: string, ...argsAndOption: Array<string | Option>): Promise<string>;
/**
 * @param {*} command
 * @param {*} argsAndOption
 * @return {object} {promise: Promise, childProcess: child_process}
 */
export declare function exe(command: string, ...argsAndOption: Array<string | Option>): Result;
export declare function createStringWriter(): {
    writer: Writable;
    done: Promise<string>;
};
