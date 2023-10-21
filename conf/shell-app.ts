import Path from 'path';
import {ConfigHandler, PlinkSettings} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const handler: ReactScriptsHandler & ConfigHandler = {
  onConfig(setting: PlinkSettings, cliOpt: NonNullable<PlinkSettings['cliOptions']>): void {
    setting['@wfh/cra-scripts'].entries = [
      Path.resolve(__dirname, '../doc-app/doc-entry/dll/shell-entry.ts'),
      'react',
      '@loadable/component',
      Path.resolve(__dirname, '../doc-app/doc-ui-common/client/animation/AnimatableRoutes.hooks.tsx')
    ];
  },
  changeCraPaths(paths, _env) {
  },
  webpack(cfg, _env, _cmdOpt) {
  }
};

export default handler;
 
