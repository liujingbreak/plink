import Path from 'node:path';
import {findPackagesByNames} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const handler: ReactScriptsHandler = {
  changeCraPaths(paths, env) {
    const [pkg] = findPackagesByNames(['doc-entry']);
    paths.appIndexJs = Path.join(pkg!.realPath, 'feature/canvas2-demo/canvas2D.app.tsx');
  }
};

export default handler;

