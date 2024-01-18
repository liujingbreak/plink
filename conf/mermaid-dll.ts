import Path from 'path';
import {ConfigHandler, PlinkSettings, plinkEnv} from '@wfh/plink';
import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const handler: ReactScriptsHandler & ConfigHandler = {
  onConfig(setting: PlinkSettings, cliOpt: NonNullable<PlinkSettings['cliOptions']>): void {
    setting['@wfh/cra-scripts'].entries = [
      Path.resolve(plinkEnv.rootDir, 'doc-app/doc-entry/dll/mermaid-dll-entry.ts'),
      'mermaid'
    ];
  },
  changeCraPaths(paths, _env) {
  },
  webpack(cfg, _env, _cmdOpt) {
  }
};

export default handler;

