import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as Path from 'path';
import * as _ from 'lodash';
// import boxen, {BorderStyle} from 'boxen';
import {ZipFile} from 'yazl';
import moment from 'moment';
import {getRootDir} from '@wfh/plink/wfh/dist';

type UnpackPromise<P> = P extends Promise<infer T> ? T : unknown;

export async function listVersions(env: string) {
  const done: Promise<void>[] = [];
  const dir = Path.resolve(getRootDir(), `install-${env}`);
  const versions = new Map<string, string>();

  for (const zipName of fs.readdirSync(dir)) {
    if (zipName.endsWith('.zip')) {
      const zip = new AdmZip(Path.join(dir, zipName));
      const app = _.trimEnd(zipName, '.zip');

      done.push(new Promise(resolve => {
        zip.readAsTextAsync(app + '.githash-webui.txt', data => {
          versions.set(app, data);
          resolve();
        });
      }));
    }
  }
  await Promise.all(done);
  return versions;
}

export async function listAllVersions() {
  const map = new Map<string, UnpackPromise<ReturnType<typeof listVersions>>>();
  const done = fs.readdirSync(getRootDir())
  .filter(dir => {
    return dir.startsWith('install-') && fs.statSync(Path.resolve(getRootDir(), dir)).isDirectory();
  })
  .reduce((promises, dir) => {
    const env = /^install-([^]*)$/.exec(dir)![1];
    promises.push(listVersions(env).then(res => {
        map.set(env, res);
      })
    );
    return promises;
  }, [] as Promise<void>[]);

  await Promise.all(done);
  return map;
}

export async function stringifyListVersions(env: string) {
  const res = await listVersions(env);
  let buf = '';
  for (const [app, githash] of res.entries()) {
    buf += ` ${env} - ${app}\n${githash}\n`;
    buf += '\n';
  }
  return buf;
}

export async function stringifyListAllVersions() {
  const envMap = await listAllVersions();
  let buf = '';
  for (const [env, appHash] of envMap.entries()) {
    for (const [app, githash] of appHash.entries()) {
      buf += `  ${env} - ${app}\n${githash}\n`;
      buf += '\n';
    }
  }
  return buf;
}

export function writeMockZip(writeTo: string, content: string) {
  const zipFile = new ZipFile();
  const prom = new Promise(resolve => {
    zipFile.outputStream.pipe(fs.createWriteStream(writeTo))
    .on('close', resolve);
  });

  const current = moment();
  const fileName = `fake-${current.format('YYMMDD')}-${current.format('HHmmss')}.txt`;

  zipFile.addBuffer(Buffer.from(content), fileName);
  zipFile.end({forceZip64Format: false});
  return prom;
}

