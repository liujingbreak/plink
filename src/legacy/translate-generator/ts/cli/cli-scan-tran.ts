// import {config} from '@wfh/plink';
import plink from '__plink';
import fs from 'fs';
import fsext from 'fs-extra';
import Path from 'path';
import glob from 'glob';
import {Pool} from '@wfh/thread-promise-pool';
import chalk from 'chalk';
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';

export interface Translatables {
  start: number;
  end: number;
  desc: string;
  default: string;
  text: string | null;
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

export async function scanTran(dir: string, output?: string) {
  let transByFile: {[file: string]: Translatables[]};
  let oldMetaFileExits = false;
  if (output == null) {
    output = Path.resolve(dir, 'scan-tran.json');
  }
  if (fs.existsSync(output)) {
    transByFile = JSON.parse(fs.readFileSync(output, 'utf8'));
    oldMetaFileExits = true;
  } else {
    transByFile = {};
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
      const relFilePath = Path.relative(Path.dirname(output!), file).replace(/\\/g, '/');
      const res = await pool.submit<StringInfo[]>({
        file: Path.resolve(__dirname, 'cli-scan-tran-worker.js'),
        exportFn: 'scanFile',
        args: [file, transByFile[relFilePath]]
      });
      plink.logger.info(file + `: ${chalk.green(res.length)} found`);
      const translatables = res.map<Translatables>(([start, end, text, line, col, type]) => ({
        start, end, desc: `line: ${line}, col: ${col}: ${type}`, default: text, text: null
      }));
      if (!translatables || translatables.length === 0) {
        delete transByFile[relFilePath];
      } else {
        transByFile[relFilePath] = translatables;
      }
    } catch (ex) {
      plink.logger.error(ex);
    }
  }));

  // if (!output.endsWith('json')) {
  //   output = output + '.json';
  // }
  fsext.mkdirpSync(Path.dirname(output));
  fs.promises.writeFile(output, JSON.stringify(transByFile, null, '  '));
  plink.logger.info(output + ' is ' + (oldMetaFileExits ? 'updated' : 'written'));
  // plink.logger.info('Command is executing with configuration:', config());
  // TODO: Your command job implementation here
}

