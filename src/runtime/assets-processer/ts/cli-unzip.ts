import yauzl from 'yauzl';
import chalk from 'chalk';
import { createWriteStream } from 'fs';
import {mkdirpSync} from 'fs-extra';
import Path from 'path';

export async function listZip(fileName: string) {
  const zip = await new Promise<yauzl.ZipFile | undefined>((resolve, rej) => {
    yauzl.open(fileName, {lazyEntries: true}, (err, zip) => {
      if (err) {
        return rej(err);
      }
      resolve(zip);
    });
  });
  const list: string[] = [];
  if (zip == null) {
    throw new Error(`yauzl can not list zip file ${fileName}`);
  }
  zip.on('entry', (entry: yauzl.Entry) => {
    list.push(entry.fileName);

    // tslint:disable-next-line: no-console
    console.log(entry.fileName + chalk.green(` (size: ${entry.uncompressedSize >> 10} Kb)`));
    zip.readEntry();
  });
  zip.readEntry();

  return new Promise<typeof list>(resolve => {
    zip.on('end', () => resolve(list));
  });
}

export async function unZip(fileName: string, toDir = process.cwd()) {
  const zip = await new Promise<yauzl.ZipFile | undefined>((resolve, rej) => {
    yauzl.open(fileName, {lazyEntries: true}, (err, zip) => {
      if (err) {
        return rej(err);
      }
      resolve(zip);
    });
  });
  if (zip == null) {
    throw new Error(`yauzl can not unzip zip file ${fileName}`);
  }
  zip.on('entry', (entry: yauzl.Entry) => {
    // tslint:disable-next-line: no-console
    console.log(entry.fileName + chalk.gray(` (size: ${entry.uncompressedSize >> 10} Kb)`));

    zip.openReadStream(entry, (err, readStream) => {
      if (err) {
        console.error(`yauzl is unable to extract file ${entry.fileName}`, err);
        zip.readEntry();
        return;
      }
      readStream!.on('end', () => {zip.readEntry();});
      const target = Path.resolve(toDir, entry.fileName);
      // tslint:disable-next-line: no-console
      console.log(`write ${target} ` + chalk.gray(` (size: ${entry.uncompressedSize >> 10} Kb)`));
      mkdirpSync(Path.dirname(target));
      readStream!.pipe(createWriteStream(target));
    });
  });
  zip.readEntry();

  return new Promise<void>(resolve => {
    zip.on('end', () => resolve());
  });
}
