import {config} from '@wfh/plink';

/**
 * Package setting type
 */
export interface ExpressAppSetting {
  /** allow CORS */
  enableCORS: boolean | string[];
}

/**
 * Plink runs this funtion to get package level setting value
 */
export function defaultSetting(): ExpressAppSetting {
  return {
    enableCORS: true
  };
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting(): ExpressAppSetting {
  /* eslint-disable dot-notation,@typescript-eslint/dot-notation */
  return config()['@wfh/express-app']!;
}
