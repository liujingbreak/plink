// tslint:disable:no-console
// import {ZipResourceMiddleware} from 'serve-static-zip';
import request from 'request';

import fs from 'fs';
// import Path from 'path';

const argv = process.argv;
const fetchUrl = argv[2];
const fileName = argv[3];
const retryTimes = parseInt(argv[4], 10);

process.on('uncaughtException', (err) => {
	// tslint:disable-next-line
	console.log(err);
	process.send && process.send({error: err});
});

async function downloadZip(fetchUrl: string) {
	// tslint:disable-next-line
	// log.info(`${os.hostname()} ${os.userInfo().username} download zip[Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`);
	const resource = fetchUrl + '?' + Math.random();
	// const downloadTo = api.config.resolve('destDir', `remote-${Math.random()}-${path.split('/').pop()}`);
	// log.info('fetch', resource);
	process.send && process.send({log: `[pid:${process.pid}] fetch `+ resource});
	await retry(async () => {
		await new Promise<Buffer>((resolve, rej) => {
			const writeStream = fs.createWriteStream(fileName);
			writeStream.on('finish', () => {
				process.send && process.send({log: 'zip file is written: ' + fileName});
				resolve();
			});
			request({
				uri: resource, method: 'GET', encoding: null
			})
			.on('response', res => {
				if (res.statusCode > 299 || res.statusCode < 200)
					return rej(new Error(res.statusCode + ' ' + res.statusMessage));
			})
			.on('error', err => {
				return rej(err);
			})
			.pipe(writeStream);
		});
		// fs.writeFileSync(Path.resolve(distDir, fileName),
		// 	buf);
		process.send && process.send({log: `${fileName} is written.`});
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
			process.send && process.send({log: 'Encounter error, will retry ' + (err as Error).stack ? err.stack : err});
		}
		await new Promise(res => setTimeout(res, cnt * 5000));
	}
}

downloadZip(fetchUrl)
.catch(err => {
	process.send && process.send({error: err});
	process.exit(1);
});
