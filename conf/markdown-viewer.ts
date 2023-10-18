import Path from 'node:path';
import {findPackagesByNames} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const handler: ReactScriptsHandler = {
  changeCraPaths(paths, env) {
    const [pkg] = findPackagesByNames(['doc-entry']);
    paths.appIndexJs = Path.join(pkg!.realPath, 'markdown-app.tsx');
  }
};

export default handler;
