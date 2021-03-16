import {config} from '@wfh/plink';

/**
 * Package setting type
 */
export interface DocEntrySetting {
  /** Router basename */
  basename: string;
}

/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
export function defaultSetting(): DocEntrySetting {
  const defaultValue: DocEntrySetting = {
    basename: '/plink'
  };

  (process.env as any).PUBLIC_URL = defaultValue.basename + '/';
  process.env.REACT_APP_routeBasename = defaultValue.basename;
  return defaultValue;
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting() {
  // tslint:disable:no-string-literal
  return config()['@wfh/doc-entry']!;
}
