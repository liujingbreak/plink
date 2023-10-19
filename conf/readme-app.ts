import Path from 'path';
import {container} from 'webpack';
import {findPackagesByNames} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const {ModuleFederationPlugin} = container;

const handler: ReactScriptsHandler = {
  changeCraPaths(paths, _env) {
    const [pkg] = findPackagesByNames(['doc-entry']);
    paths.appIndexJs = Path.join(pkg!.realPath, 'feature/reactivizer-doc/fedrateion-start-reactivizer-doc.ts');
  },
  webpack(cfg, _env, _cmdOpt) {
    // const [pkg] = findPackagesByNames(['doc-entry']);
    cfg.plugins!.push(new ModuleFederationPlugin({
      name: '@wfh/doc-entry/remote-entries/readmes',
      library: {
        type: 'global',
        name: '_wfh_docEntry_readmes'
      },
      filename: 'readmesRemoteEntry.js',
      remotes: {
        '@wfh/doc-entry/remote-entries/shell': 'shell@http://localhost:14334/plink/shellRemoteEntry.js',
      },
      // exposes: {
      //   './shell-entry': Path.join(pkg?.realPath!, 'remote-entries/shell/shell-entry'),
      // },
      shared: {
        '@loadable/component': {
          requiredVersion: false
        },
        rxjs: '^7.8.1',
        react: {
          version: '^18.2.0',
          requiredVersion: false,
          singleton: true,
          import: false
        },
        'react-dom/client': {
          singleton: true,
          requiredVersion: false,
          version: '^18.2.0',
          packageName: 'react-dom',
          import: false
        },
        'web-vitals': '^2.1.0'
      }
    }));
  }
};

export default handler;
 
