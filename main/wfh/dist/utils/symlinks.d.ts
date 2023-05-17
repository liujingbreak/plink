/// <reference types="node" />
import * as fs from 'fs';
export declare const isWin32: boolean;
export declare const lstatAsync: typeof fs.lstat.__promisify__;
export declare const unlinkAsync: typeof fs.unlink.__promisify__;
/**
 * Return all deleted symlinks
 * @param deleteOption
 */
export default function scanNodeModules(dir?: string, deleteOption?: 'all' | 'invalid'): Promise<string[]>;
export declare function listModuleSymlinks(parentDir: string, onFound: (link: string) => void | Promise<void>): Promise<void>;
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
