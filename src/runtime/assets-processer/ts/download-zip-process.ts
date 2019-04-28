// tslint:disable:no-console
// import {ZipResourceMiddleware} from 'serve-static-zip';
import request from 'request';

import fs from 'fs';
import Path from 'path';

const argv = process.argv;
const fetchUrl = argv[2];
const fileName = argv[3];
const distDir = argv[4];
const retryTimes = parseInt(argv[5], 10);

process.on('uncaughtException', (err) => {
	// tslint:disable-next-line
	console.log(err);
	process.send({error: err});
});

async function downloadZip(fetchUrl: string) {
	// tslint:disable-next-line
	// log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
	const resource = fetchUrl + '?' + Math.random();
	// const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
	// log.info('fetch', resource);
	process.send({log: `[pid:${process.pid}] fetch `+ resource});
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
		fs.writeFileSync(Path.resolve(distDir, fileName),
			buf);
		// const zip = new AdmZip(buf);
		// await tryExtract(zip);
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
		await new Promise(res => setTimeout(res, cnt * 5000));
	}
}

downloadZip(fetchUrl);
