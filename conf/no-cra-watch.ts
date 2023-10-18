import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';

const config: ReactScriptsHandler = {
  webpack(cfg, _env, _cmdOpt) {
    if (cfg.watchOptions == null)
      cfg.watchOptions = {
        aggregateTimeout: 800
      };
    cfg.watchOptions.poll = 1000;
  }
};

export default config;
