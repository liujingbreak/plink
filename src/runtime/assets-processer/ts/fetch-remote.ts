import api from '__api';
import * as request from 'request';
import * as Url from 'url';
import fs = require('fs');
const AdmZip = require('adm-zip');

const log = require('log4js').getLogger(api.packageName + '.fetch-remote');

interface Checksum {
	version: number;
	path: string;
	changeFetchUrl?: string;
}

interface Setting {
	fetchUrl: string;
	fetchRetry: number;
	fetchLogErrPerTimes: number;
	fetchIntervalSec: number;
}

let setting: Setting;
let currVersion: number = Number.NEGATIVE_INFINITY;
let timer: NodeJS.Timer;
let stopped = false;
let errCount = 0;

export function start() {
	setting = api.config.get(api.packageName);
	const fetchUrl = setting.fetchUrl;
	if (fetchUrl == null) {
		log.info('No fetchUrl configured, skip fetching resource.');
		return Promise.resolve();
	}

	if (setting.fetchRetry == null)
		setting.fetchRetry = 3;
	log.info(setting);
	return runRepeatly(setting);
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

function runRepeatly(setting: Setting): Promise<void> {
	if (stopped)
		return Promise.resolve();
	return run(setting)
	.catch(error => log.error(error))
	.then(() => {
		if (stopped)
			return;
		timer = setTimeout(() => {
			runRepeatly(setting);
		}, setting.fetchIntervalSec * 1000);
	});
}
async function run(setting: Setting) {
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
	if (checksumObj.version != null && currVersion >= checksumObj.version)
		return;

	const resource = Url.resolve( setting.fetchUrl, checksumObj.path + '?' + Math.random());
	const downloadTo = api.config.resolve('destDir', 'remote.zip');
	log.info('fetch', resource);
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
	log.info('extract', resource);
	zip.extractAllTo(api.config.resolve('staticDir'), true);
	api.eventBus.emit(api.packageName + '.downloaded');
	currVersion = checksumObj.version;
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
			if (typeof body === 'string')
				body = JSON.parse(body);
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
