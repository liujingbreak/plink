import {BumpOptions} from './types';
import config from '../config';
import logConfig from '../log-config';

export default async function(options: BumpOptions & {dirs: string[]}) {
  await config.init(options);
  logConfig(config());

}
