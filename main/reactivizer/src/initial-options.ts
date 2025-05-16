import {CoreOptions} from './base-types';
export interface InitialOptions {
  enableLog?: boolean;
  logStyle?: CoreOptions['logStyle'];
  log?: CoreOptions['log'];
}

/**
 * Any change of this configuration object must be done earlier
 * before any reactive service being created to actually take effect.
 *
 * Also this configuration is not shared cross workers or threads, for
 * each worker or thread, the changes to it must be repeated.
**/
export const initOptions: InitialOptions = {
  enableLog: false,
  logStyle: 'full'
};

export function changeInitOptions(opts: InitialOptions) {
  Object.assign(initOptions, opts);
}
