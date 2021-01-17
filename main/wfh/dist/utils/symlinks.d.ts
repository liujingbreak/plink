/**
 * Do not import any 3rd-party dependency in this file,
 * it is run by `init` command at the time there probably is
 * no dependencies installed yet
 */
/// <reference types="node" />
import * as fs from 'fs';
export declare const isWin32: boolean;
export declare const readdirAsync: typeof fs.readdir.__promisify__;
export declare const lstatAsync: typeof fs.lstat.__promisify__;
export declare const _symlinkAsync: typeof fs.symlink.__promisify__;
export declare const unlinkAsync: typeof fs.unlink.__promisify__;
/**
 * Return all deleted symlinks
 * @param deleteOption
 */
export default function scanNodeModules(deleteOption?: 'all' | 'invalid'): Promise<string[]>;
export declare function listModuleSymlinks(parentDir: string, onFound: (link: string) => void | Promise<void>): Promise<void>;
/**
 * 1. create symlink node_modules/@wfh/plink --> directory "main"
 * 2. create symlink <parent directory of "main">/node_modules --> node_modules
 */
export declare function linkDrcp(): void;
/**
 * Do check existing symlink, recreate a new one if existing one is invalid symlink
 * @param linkTarget
 * @param link
 */
export declare function symlinkAsync(linkTarget: string, link: string): Promise<void>;
export declare function validateLink(link: string, deleteAll?: boolean): Promise<boolean>;
/**
 * Delete symlink or file/directory if it is invalid symlink or pointing to nonexisting target
 * @param link the symlink
 * @param target
 * @returns true if needs to create a new symlink
 */
export declare function recreateSymlink(link: string, target: string): Promise<boolean>;
/**
 * Unlike fs.realPath(), it supports symlink of which target file no longer exists
 * @param file
 */
export declare function getRealPath(file: string): string | null;
