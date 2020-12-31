import {AnalyseOptions} from './types';
import os from 'os';
import config from '../config';
import Path from 'path';
import logConfig from '../log-config';
import glob from 'glob';
import _ from 'lodash';
// import log4js from 'log4js';
import {Pool} from '../../../thread-promise-pool/dist';

// const log = log4js.getLogger('wfh.analyse');
const cpus = os.cpus().length;

export default async function(packages: string[], opts: AnalyseOptions) {
  await config.init(opts);
  logConfig(config());
  if (opts.file) {
    const results = await analyseFiles(opts.file);
    // tslint:disable-next-line: no-console
    console.log('Dependencies:\n', results);
  }
}

async function analyseFiles(files: string[]) {
  const matchDones = files.map(pattern => new Promise<string[]>((resolve, reject) => {
    glob(pattern, {nodir: true}, (err, matches) => {
      if (err) {
        return reject(err);
      }
      resolve(matches);
    });
  }));
  files = _.flatten((await Promise.all(matchDones))).filter(f => /\.[jt]sx?$/.test(f));
  const threadPool = new Pool(cpus - 1, 0, {
    // initializer: {file: 'source-map-support/register'},
    verbose: false
  });

  return await threadPool.submitProcess<string[]>({
    file: Path.resolve(__dirname, 'cli-analyse-worker.js'),
    exportFn: 'dfsTraverseFiles',
    args: [files]
  });

}
