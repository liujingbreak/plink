/* eslint-disable no-console */
/**
 * @deprecated
 */
import 'source-map-support/register';
import AdmZip from 'adm-zip';
import os from 'os';
import util from 'util';
import fs from 'fs';
import Path from 'path';
const pify = require('pify');

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line
  console.log(err);
  process.send && process.send({error: err});
});

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line
  console.log(err);
  process.send && process.send({error: err});
});

if (!process.send) {
  // eslint-disable-next-line
	process.send = console.log.bind(console);
}

const argv = process.argv;
const zipDir = argv[2];
const zipExtractDir = argv[3];
const deleteOption = argv[4];

const readFileAsync: (file: string, code?: string) => Promise<Buffer> = pify(fs.readFile);
async function start() {
  const fileNames = fs.readdirSync(zipDir);
  const proms = fileNames.filter(name => Path.extname(name).toLowerCase() === '.zip')
  .map(name => {
    const file = Path.resolve(zipDir, name);
    return async () => {
      console.log(`[pid:${process.pid}] start extracting ${file}`);
      process.send && process.send({log: `[pid:${process.pid}] start extracting ${file}`});
      await tryExtract(file);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (deleteOption !== 'keep')
        fs.unlinkSync(file);
      console.log('done', file);
      process.send && process.send({done: `[pid:${process.pid}] done extracting ${file}`});
    };
  });
  if (proms.length > 0) {
    for (const prom of proms) {
      try {
        await prom();
      } catch (e) {
        // eslint-disable-next-line
				console.log(e);
        process.send && process.send({error: e});
      }
    }
  } else {
    process.send && process.send({log: `[pid:${process.pid}] no downloaded file found`});
  }
}


async function tryExtract(file: string) {
  const data: Buffer = await readFileAsync(file);
  await new Promise<void>((resolve, reject) => {
    const zip = new AdmZip(data);
    zip.extractAllToAsync(zipExtractDir, true, (err) => {
      if (err) {
        process.send && process.send({error: util.inspect(err)});
        if ((err as any).code === 'ENOMEM' || err.toString().indexOf('not enough memory') >= 0) {
          // eslint-disable-next-line
					process.send && process.send({log: `[pid:${process.pid}]${os.hostname()} ${os.userInfo().username} [Free mem]: ${Math.round(os.freemem() / 1048576)}M, [total mem]: ${Math.round(os.totalmem() / 1048576)}M`});
        }
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

void start();
