import * as Path from 'path';
import * as fs from 'fs';
import {linkDrcp} from '../utils/symlinks';
import os from 'os';
const pkJson = require('../../../package.json');
const isWin32 = os.platform().indexOf('win32') >= 0;

export default function() {
  linkDrcp();

  const peerDeps = Object.keys(pkJson.peerDependencies || []);

  let drcpHome = Path.relative(process.cwd(), Path.resolve(__dirname, '../../..')).replace(/\\/g, '/');
  if (drcpHome.length === 0)
    drcpHome = '.';
  else if (!drcpHome.startsWith('.'))
    drcpHome = './' + drcpHome;

  const tsconfigDrcp = {
    extends: `${drcpHome}/wfh/tsconfig-base.json`,
    compilerOptions: {
      baseUrl: '.',
      paths: {
      },
      typeRoots: [`${drcpHome}/node_modules/@types`]
    }
  };
  for (const dep of peerDeps) {
    tsconfigDrcp.compilerOptions.paths[dep] = ['node_modules/' + dep];
    tsconfigDrcp.compilerOptions.paths[dep + '/*'] = ['node_modules/' + dep + '/*'];
  }

  fs.writeFileSync('tsconfig-drcp.json', JSON.stringify(tsconfigDrcp, null, '  '));
  fs.writeFileSync('tsc-drcp.sh',
    './node_modules/dr-comp-package/node_modules/.bin/tsc -p tsconfig-drcp.json $*');
  if (isWin32) {
    fs.writeFileSync('tsc-drcp.bat',
      '.\\node_modules\\dr-comp-package\\node_modules\\.bin\\tsc -p tsconfig-drcp.json %*');
  } else {
    fs.chmodSync('tsc-drcp.sh', 0o777);
  }
}
