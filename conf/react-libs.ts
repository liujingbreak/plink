import Path from 'path';
import {ConfigHandler, PlinkSettings, plinkEnv} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const handler: ReactScriptsHandler & ConfigHandler = {
  onConfig(setting: PlinkSettings, cliOpt: NonNullable<PlinkSettings['cliOptions']>): void {
    setting['@wfh/cra-scripts'].entries = [
      // Path.resolve(plinkEnv.rootDir, 'doc-app/doc-entry/dll/shell-entry.ts'),
      Path.resolve(plinkEnv.rootDir, 'doc-app/doc-entry/dll/react-vendors.ts'),
      'react-dom',
      'react-redux',
      'immer',
      // '@wfh/doc-ui-common/client/components/appLayout.state',
      Path.resolve('../main/node_modules/@reduxjs/toolkit'),
      Path.resolve('../main/node_modules/redux-observable'),
      'react',
      '@loadable/component',
      // Path.resolve(plinkEnv.rootDir, 'doc-app/doc-ui-common/client/animation/AnimatableRoutes.hooks.tsx')
    ];
  },
  changeCraPaths(paths, _env) {
  },
  webpack(cfg, _env, _cmdOpt) {
  }
};

export default handler;
 
