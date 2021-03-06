import yauzl from 'yauzl';
import chalk from 'chalk';

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
    throw new Error(`yauzl can not create zip file ${fileName}`);
  }
  zip.on('entry', (entry: yauzl.Entry) => {
    list.push(entry.fileName);

    // eslint-disable-next-line no-console
    console.log(entry.fileName + chalk.green(` (size: ${entry.uncompressedSize >> 10} Kb)`));
    zip.readEntry();
  });
  zip.readEntry();

  return new Promise<typeof list>(resolve => {
    zip.on('end', () => resolve(list));
  });
}
