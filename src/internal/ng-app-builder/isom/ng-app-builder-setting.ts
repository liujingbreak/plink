import {config} from '@wfh/plink';

/**
 * Package setting type
 */
export interface NgAppBuilderSetting {
  /** Description of config property */
  // tsconfigInclude: string;
  useThread: boolean;
  ng8Compliant: boolean;
  /** For debug purpose, log changed TS file content */
  logChangedTsFile: boolean;
}

/**
 * Plink runs this funtion to get package level setting value
 */
export function defaultSetting(): NgAppBuilderSetting {
  const defaultValue: NgAppBuilderSetting = {
    useThread: false,
    ng8Compliant: true,
    logChangedTsFile: false
  };

  return defaultValue;
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting(): NgAppBuilderSetting {
  // tslint:disable:no-string-literal
  return config()['@wfh/ng-app-builder']!;
}
