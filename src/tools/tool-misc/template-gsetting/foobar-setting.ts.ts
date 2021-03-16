import {config, PlinkSettings} from '@wfh/plink';

/**
 * Package setting type
 */
export interface $__Foobar__$Setting {
  /** Description of config property */
  disabled: boolean;
}

/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
export function defaultSetting(cliOptions: NonNullable<PlinkSettings['cliOptions']>): $__Foobar__$Setting {
  const defaultValue: $__Foobar__$Setting = {
    disabled: false
  };
  // Return settings based on command line option "dev"
  if (config().cliOptions?.dev) {
    defaultValue.disabled = true;
  }

  const env = config().cliOptions?.env;
  // Return settings based on command line option "env"
  if (env === 'local') {
    defaultValue.disabled = true;
  }

  return defaultValue;
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting() {
  // tslint:disable:no-string-literal
  return config()['$__foobarPackage__$']!;
}
