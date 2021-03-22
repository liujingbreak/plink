import {config, PlinkSettings} from '@wfh/plink';

/**
 * Package setting type
 */
export interface DocUiCommonSetting {
  /** Theme of Material design */
  materialTheme: 'default' | 'ugly';
}

/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
export function defaultSetting(cliOptions: NonNullable<PlinkSettings['cliOptions']>): DocUiCommonSetting {
  const defaultValue: DocUiCommonSetting = {
    materialTheme: 'default'
  };

  return defaultValue;
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting() {
  // tslint:disable:no-string-literal
  return config()['@wfh/doc-ui-common']!;
}
