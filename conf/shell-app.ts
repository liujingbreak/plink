import {container} from 'webpack';
// import {findPackagesByNames} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const {ModuleFederationPlugin} = container;

const handler: ReactScriptsHandler = {
  changeCraPaths(_paths, _env) {
    // const [pkg] = findPackagesByNames(['doc-entry']);
    // paths.appIndexJs = Path.join(pkg!.realPath, 'feature/canvas2-demo/canvas2D.app.tsx');
  },
  webpack(cfg, _env, _cmdOpt) {
    cfg.plugins!.push(new ModuleFederationPlugin({
      name: '@wfh/doc-entry/shell',
      shared: {
        '@loadable/component': {},
        rxjs: '^7.8.1',
        react: {
          version: '^18.2.0',
          requiredVersion: false,
          singleton: true
        },
        'react-dom/client': {
          singleton: true,
          requiredVersion: false,
          version: '^18.2.0',
          packageName: 'react-dom'
        },
        'web-vitals': '^2.1.0'
      }
    }));
  }
};

export default handler;
 
