import api from '__api';
import request from 'request';
import * as Url from 'url';
import * as _ from 'lodash';
import os from 'os';
import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import cluster from 'cluster';
import {ZipResourceMiddleware} from 'serve-static-zip';
const log = require('log4js').getLogger(api.packageName + '.fetch-remote');

const pm2InstanceId = process.env.NODE_APP_INSTANCE;
const isPm2 = cluster.isWorker && pm2InstanceId != null;
const isMainProcess = !isPm2 || pm2InstanceId === '0';

interface OldChecksum {
	version: number;
	path: string;
	changeFetchUrl?: string;
}

interface Checksum extends OldChecksum {
	versions?: {[key: string]: {version: number, path: string}};
}

interface Setting {
	fetchUrl: string;
	fetchRetry: number;
	fetchLogErrPerTimes: number;
	fetchIntervalSec: number;
	inMemory: boolean;
}

let setting: Setting;
// let currVersion: number = Number.NEGATIVE_INFINITY;
let currentChecksum: Checksum = {
	version: Number.NEGATIVE_INFINITY,
	path: '',
	versions: {}
};

const currChecksumFile = api.config.resolve('destDir', 'assets-processer.checksum.json');
let timer: NodeJS.Timer;
let stopped = false;
let errCount = 0;

export function start(serveStaticZip: ZipResourceMiddleware) {
	setting = api.config.get(api.packageName);
	const fetchUrl = setting.fetchUrl;
	if (fetchUrl == null) {
		log.info('No fetchUrl configured, skip fetching resource.');
		return Promise.resolve();
	}

	if (!setting.inMemory && !isMainProcess) {
		// non inMemory mode means extracting zip file to local directory dist/static,
		// in case of cluster mode, we only want single process do zip extracting and file writing task to avoid conflict.
		log.info('This process is not main process');
		return;
	}

	if (setting.fetchRetry == null)
		setting.fetchRetry = 3;
	if (fs.existsSync(currChecksumFile)) {
		currentChecksum = Object.assign(currentChecksum, fs.readJSONSync(currChecksumFile));
		log.info('Found saved checksum file after reboot\n', JSON.stringify(currentChecksum, null, '  '));
	}
	return runRepeatly(setting, setting.inMemory ? serveStaticZip : null);
}

/**
 * It seems ok to quit process without calling this function
 */
export function stop() {
	stopped = true;
	if (timer) {
		clearTimeout(timer);
	}
}

function runRepeatly(setting: Setting, szip: ZipResourceMiddleware): Promise<void> {
	if (stopped)
		return Promise.resolve();
	return run(setting, szip)
	.catch(error => log.error(error))
	.then(() => {
		if (stopped)
			return;
		timer = setTimeout(() => {
			runRepeatly(setting, szip);
		}, setting.fetchIntervalSec * 1000);
	});
}
async function run(setting: Setting, szip: ZipResourceMiddleware) {
	let checksumObj: Checksum;
	try {
		checksumObj = await retry(fetch, setting.fetchUrl);
	} catch (err) {
		if (errCount++ % setting.fetchLogErrPerTimes === 0) {
			throw err;
		}
		return;
	}
	if (checksumObj == null)
		return;

	if (checksumObj.changeFetchUrl) {
		setting.fetchUrl = checksumObj.changeFetchUrl;
		log.info('Change fetch URL to', setting.fetchUrl);
	}
	let downloaded = false;
	if (checksumObj.version != null && currentChecksum.version !== checksumObj.version) {
		await downloadZip(checksumObj.path, szip);
		downloaded = true;
		currentChecksum.version = checksumObj.version;
	}
	if (checksumObj.versions) {
		const currVersions = currentChecksum.versions;
		const targetVersions = checksumObj.versions;
		for (const key of Object.keys(checksumObj.versions)) {
			if (!_.has(targetVersions, key) || _.get(currVersions, [key, 'version']) !==
				_.get(targetVersions, [key, 'version'])) {
					await downloadZip(targetVersions[key].path, szip);
					currVersions[key] = targetVersions[key];
					downloaded = true;
				}
		}
	}

	if (downloaded && !szip) {
		fs.writeFileSync(currChecksumFile, JSON.stringify(currentChecksum, null, ' '), 'utf8');
		api.eventBus.emit(api.packageName + '.downloaded');
	}
}

// let downloadCount = 0;

async function downloadZip(path: string, szip: ZipResourceMiddleware) {
	// tslint:disable-next-line
	// log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
	const resource = Url.resolve( setting.fetchUrl, path + '?' + Math.random());
	const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
	log.info('fetch', resource);
	if (szip) {
		log.info('downloading zip content to memory...');
		await retry(() => {
			return new Promise((resolve, rej) => {
				request({
					uri: resource, method: 'GET', encoding: null
				}, (err, res, body) => {
					if (err) {
						return rej(err);
					}
					if (res.statusCode > 299 || res.statusCode < 200)
						return rej(new Error(res.statusCode + ' ' + res.statusMessage));
					const size = (body as Buffer).byteLength;
					log.info('zip loaded, length:', size > 1024 ? size / 1024 + 'k' : size);
					szip.updateZip(body);
					resolve();
				});
			});
		});
	} else {
		await retry(() => {
			return new Promise((resolve, rej) => {
				request.get(resource).on('error', err => {
					rej(err);
				})
				.pipe(fs.createWriteStream(downloadTo))
				.on('finish', () => setTimeout(resolve, 100));
			});
		});
		const zip = new AdmZip(downloadTo);
		let retryCount = 0;
		do {
			try {
				log.info('extract %s', downloadTo);
				await tryExtract();
				log.info(`extract ${downloadTo} done`);
				fs.unlinkSync(downloadTo);
				// tslint:disable-next-line
				// log.info(`${os.hostname()} ${os.userInfo().username} download done[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
				break;
			} catch (ex) {
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		} while (++retryCount <=3);
		if (retryCount > 3) {
			log.info('Give up on extracting zip');
		}
		function tryExtract() {
			return new Promise((resolve, reject) => {
				zip.extractAllToAsync(api.config.resolve('staticDir'), true, (err) => {
					if (err) {
						log.error(err);
						if ((err as any).code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
							// tslint:disable-next-line
							log.info(`${os.hostname()} ${os.userInfo().username} [Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
						}
						reject(err);
					} else
						resolve();
				});
			});
		}
	}
}

function fetch(fetchUrl: string): Promise<any> {
	const checkUrl = fetchUrl + '?' + Math.random();
	log.debug('check', checkUrl);
	return new Promise((resolve, rej) => {
		request.get(checkUrl,
			{headers: {Referer: Url.resolve(checkUrl, '/')}}, (error: any, response: request.Response, body: any) => {
			if (error) {
				return rej(new Error(error));
			}
			if (response.statusCode < 200 || response.statusCode > 302) {
				return rej(new Error(`status code ${response.statusCode}\nresponse:\n${response}\nbody:\n${body}`));
			}
			try {
				if (typeof body === 'string')
					body = JSON.parse(body);
			} catch (ex) {
				rej(ex);
			}
			resolve(body);
		});
	});
}

async function retry<T>(func: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
	for (let cnt = 0;;) {
		try {
			return await func(...args);
		} catch (err) {
			cnt++;
			if (cnt >= setting.fetchRetry) {
				throw err;
			}
			log.debug(err);
			log.debug('Encounter error, will retry');
		}
		await new Promise(res => setTimeout(res, 5000));
	}
}
