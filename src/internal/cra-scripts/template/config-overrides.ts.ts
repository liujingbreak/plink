import {ConfigureHandler} from '@wfh/cra-scripts/dist/types';
import {Configuration} from 'webpack';

const handler: ConfigureHandler = {
  webpack(cfg: Configuration, env: string, cmdOpt: Parameters<ConfigureHandler['webpack']>[2]) {
    // Change webpack configure here
  }
};

export default handler;
