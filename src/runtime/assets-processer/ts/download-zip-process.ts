// tslint:disable:no-console
// import {ZipResourceMiddleware} from 'serve-static-zip';
import request from 'request';
import AdmZip from 'adm-zip';
import os from 'os';


const argv = process.argv;
const fetchUrl = argv[2];
const zipExtractDir = argv[3];
const retryTimes = parseInt(argv[4], 10);

async function downloadZip(fetchUrl: string) {
	// tslint:disable-next-line
	// log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
	const resource = fetchUrl + '?' + Math.random();
	// const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
	// log.info('fetch', resource);
	process.send({log: `[pid:${process.pid}] fetch `+ resource});
	process.send({log: `[pid:${process.pid}] downloading zip content to memory...`});
	await retry(async () => {
		const buf = await new Promise<Buffer>((resolve, rej) => {
			request({
				uri: resource, method: 'GET', encoding: null
			}, (err, res, body) => {
				if (err) {
					return rej(err);
				}
				if (res.statusCode > 299 || res.statusCode < 200)
					return rej(new Error(res.statusCode + ' ' + res.statusMessage));
				const size = (body as Buffer).byteLength;
				// tslint:disable-next-line
				process.send({log: `[pid:${process.pid}] zip loaded, length:${size > 1024 ? Math.round(size / 1024) + 'k' : size}`});
				resolve(body);
			});
		});
		const zip = new AdmZip(buf);
		await tryExtract(zip);
	});
}

function tryExtract(zip: AdmZip) {
	return new Promise((resolve, reject) => {
		zip.extractAllToAsync(zipExtractDir, true, (err) => {
			if (err) {
				process.send({error: err});
				if ((err as any).code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
					// tslint:disable-next-line
					process.send({log: `[pid:${process.pid}]${os.hostname()} ${os.userInfo().username} [Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`});
				}
				reject(err);
			} else {
				process.send({done: `[pid:${process.pid}]done`});
				console.log('zip extracted to ' + zipExtractDir);
				resolve();
			}
		});
	});
}

async function retry<T>(func: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
	for (let cnt = 0;;) {
		try {
			return await func(...args);
		} catch (err) {
			cnt++;
			if (cnt >= retryTimes) {
				throw err;
			}
			console.log(err);
			process.send({log: 'Encounter error, will retry'});
		}
		await new Promise(res => setTimeout(res, 5000));
	}
}

downloadZip(fetchUrl);
