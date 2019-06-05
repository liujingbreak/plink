import fs from 'fs';
import {removeSync} from 'fs-extra';
import * as Path from 'path';
/**
 * Otherwise `npm install` will get an max stack overflow error
 * @param isDrcpDevMode 
 */
export function removeProjectSymlink(isDrcpDevMode: boolean) {
	let projects;
	const projectListFile = Path.join(process.cwd(), 'dr.project.list.json');
	if (fs.existsSync(projectListFile))
		projects = require(projectListFile);
	if (projects && projects.length > 0) {
		for (const prjdir of projects) {
			const moduleDir = Path.resolve(prjdir, 'node_modules');
			try {
				const stats = fs.lstatSync(moduleDir);
				if (stats.isSymbolicLink()) {
					fs.unlinkSync(moduleDir);
				}
			} catch (e) {}
		}
	}
	if (isDrcpDevMode) {
		// Since drcp itself is symlink, in case there is no dr.project.list.json, we still need to make sure...
		const moduleDir = Path.join(Path.dirname(fs.realpathSync(require.resolve('dr-comp-package/package.json'))),
			'node_modules');
		try {
			const stats = fs.lstatSync(moduleDir);
			if (stats.isSymbolicLink()) {
				fs.unlinkSync(moduleDir);
			}
		} catch (e) {}
	}
}

/* tslint:disable:no-console */
export function createProjectSymlink() {
	const isWin32 = require('os').platform().indexOf('win32') >= 0;
	const nodePath = fs.realpathSync(Path.resolve(process.cwd(), 'node_modules'));
	const projectListFile = Path.join(process.cwd(), 'dr.project.list.json');
	if (!fs.existsSync(projectListFile))
		return;
	for (const prjdir of require(projectListFile) as string[]) {
		const moduleDir = Path.resolve(prjdir, 'node_modules');
		let needCreateSymlink = false;
		let stats;

		try {
			stats = fs.lstatSync(moduleDir);
			if (stats.isSymbolicLink() || stats.isDirectory() || stats.isFile()) {
				if (!fs.existsSync(moduleDir) || fs.realpathSync(moduleDir) !== nodePath) {
					if (stats.isSymbolicLink()) {
						fs.unlinkSync(moduleDir);
					} else {
						if (fs.existsSync(moduleDir + '.bak')) {
							const _removeSync: typeof removeSync = require('fs-extra').removeSync;
							_removeSync(moduleDir + '.bak');
						}
						fs.renameSync(moduleDir, moduleDir + '.bak');
						console.log(`Backup "${moduleDir}" to "${moduleDir}.bak"`);
					}
					needCreateSymlink = true;
				}
			} else
				needCreateSymlink = true;
		} catch (e) {
			// node_modules does not exists, fs.lstatSync() throws error
			needCreateSymlink = true;
		}
		if (needCreateSymlink) {
			// console.log('Create symlink "%s"', Path.resolve(prjdir, 'node_modules'));
			fs.symlinkSync(Path.relative(prjdir, fs.realpathSync(nodePath)), moduleDir, isWin32 ? 'junction' : 'dir');
		}
	}
}
