// tslint:disable:no-console
import AdmZip from 'adm-zip';
import os from 'os';
import util from 'util';
import fs from 'fs';
import Path from 'path';
import pify from 'pify';

console.log('------ extract starts --------');
process.on('uncaughtException', (err) => {
	// tslint:disable-next-line
	console.log(err);
});

if (!process.send) {
	// tslint:disable-next-line
	process.send = console.log.bind(console);
}

const argv = process.argv;
const zipDir = argv[2];
const zipExtractDir = argv[3];

const readFileAsync = pify(fs.readFile);
async function start() {
	const fileNames = fs.readdirSync(zipDir);
	const proms = fileNames.filter(name => name.startsWith('download-update-'))
	.sort((name1, name2) => {
		const match1 = /[0-9]+/.exec(name1);
		const match2 = /[0-9]+/.exec(name2);
		if (match1 && match1[0] && match2 && match2[0]) {
			return parseInt(match1[0], 10) - parseInt(match2[0], 10);
		}
		return 0;
	})
	.map(name => {
		const file = Path.resolve(zipDir, name);
		return () => {
			console.log(`[pid:${process.pid}] start extracting ${file}`);
			process.send({log: `[pid:${process.pid}] start extracting ${file}`});
			return tryExtract(file)
			.then(() => {
				fs.unlinkSync(file);
				process.send({done: `[pid:${process.pid}] done extracting ${file}`});
			});
		};
	});
	if (proms.length > 0) {
		for (const prom of proms) {
			try {
				await prom();
			} catch (e) {
				// tslint:disable-next-line
				console.log(e);
				process.send({error: e});
			}
		}
	} else {
		process.send({log: `[pid:${process.pid}] no downloaded file found`});
	}
}


async function tryExtract(file: string) {
	const data: Buffer = await readFileAsync(file);
	await new Promise((resolve, reject) => {
		const zip = new AdmZip(data);
		zip.extractAllToAsync(zipExtractDir, true, (err) => {
			if (err) {
				process.send({error: util.inspect(err)});
				if ((err as any).code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
					// tslint:disable-next-line
					process.send({log: `[pid:${process.pid}]${os.hostname()} ${os.userInfo().username} [Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`});
				}
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

setTimeout(start, 100);
