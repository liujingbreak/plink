// import {config} from '@wfh/plink';
import plink from '__plink';
import fs from 'fs';
import fsext from 'fs-extra';
import Path from 'path';
import glob from 'glob';
import {Pool} from '@wfh/thread-promise-pool';
import {getTscConfigOfPkg} from '@wfh/plink/wfh/dist/utils/misc';
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';

export interface Translatable {
  key: string;
  text: string | null;
  start: number;
  end: number;
  desc: string;
}

export type StringInfo = [
  start: number,
  end: number,
  text: string,
  /** 1 based */
  line: number,
  /** 1 based */
  col: number,
  type: string
];

export async function scanTran(dir: string, metaDir?: string) {
  // let transByFile: {[file: string]: Translatables[]};
  if (metaDir == null) {
    const pkg = plink.findPackageByFile(dir);
    if (pkg == null) {
      throw new Error(`${dir} is not inside any of linked source package, you have to specify a metadata output directory`);
    }
    metaDir = Path.resolve(pkg.realPath, getTscConfigOfPkg(pkg.json).srcDir, 'i18n');
  }

  if (!fs.existsSync(metaDir)) {
    fsext.mkdirpSync(metaDir);
  }

  if (!fs.statSync(dir).isDirectory()) {
    plink.logger.error(`${dir} is not a directory`);
    return;
  }
  let files = await new Promise<string[]>((resolve, reject) => {
    const pattern = Path.relative(process.cwd(), dir).replace(/\\/g, '/') + '/**/*.{ts,tsx,js,jsx}';

    glob(pattern, {cwd: process.cwd(), nodir: true}, (err, matches) => {
      if (err) {
        return reject(err);
      }
      resolve(matches);
    });
  });

  plink.logger.info(`Found total ${files.length}`);
  const pool = new Pool();

  await Promise.all(files.map(async file => {
    try {
      const relPath = Path.relative(dir, file);
      const metadataFile = Path.resolve(metaDir!, relPath.replace(/\.[^./\\]+$/g, '.yaml'));
      await pool.submit<StringInfo[]>({
        file: Path.resolve(__dirname, 'cli-scan-tran-worker.js'),
        exportFn: 'scanFile',
        args: [file, metadataFile]
      });
    } catch (ex) {
      plink.logger.error(ex);
    }
  }));


  // fsext.mkdirpSync(Path.dirname(output));
  // fs.promises.writeFile(output, JSON.stringify(transByFile, null, '  '));
  // plink.logger.info(output + ' is ' + (oldMetaFileExits ? 'updated' : 'written'));
}

