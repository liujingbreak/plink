import Path from 'path';
import {container} from 'webpack';
import {findPackagesByNames, config} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const {ModuleFederationPlugin} = container;

const handler: ReactScriptsHandler = {
  changeCraPaths(paths, _env) {
    const [pkg] = findPackagesByNames(['doc-entry']);
    paths.appIndexJs = Path.join(pkg!.realPath, 'federation-start.ts');
    paths.publicUrlOrPath = '/shell';
    paths.appBuild = config.resolve('staticDir', 'shell');
  },
  webpack(cfg, _env, _cmdOpt) {
    const [pkg] = findPackagesByNames(['doc-entry']);
    cfg.plugins!.push(new ModuleFederationPlugin({
      name: 'shell',
      library: {
        type: 'global',
        name: '_wfh_docEntry_shell'
      },
      filename: 'shellRemoteEntry.js',
      // remotes: {
      //   app1: 'app1@http://localhost:3001/remoteEntry.js',
      // },
      exposes: {
        './shell-entry': Path.join(pkg?.realPath!, 'remote-entries/shell/shell-entry'),
      },
      shared: {
        '@loadable/component': {
           version: '~5.15.3',
           requiredVersion: false,
        },
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

    if (cfg.optimization?.splitChunks) {
      delete cfg.optimization.splitChunks;
    }
    if (cfg.optimization?.runtimeChunk)
      cfg.optimization.runtimeChunk = false;
  }
};

export default handler;
 
