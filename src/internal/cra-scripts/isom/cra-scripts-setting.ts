import {config} from '@wfh/plink';

/**
 * Package setting type
 */
export interface CraScriptsSetting {
  /** Same as command line arugment "<packages_or_entries...>" */
  entries?: string[];
  /** Less loader option: additionalData */
  lessLoaderAdditionalData: string;
  lessLoaderOtherOptions: {[key: string]: any};
  /** By default CRA will open browser in "start" script (cra-start command),
   * - `undefined` denotes default behavior of CRA
   * - `string` value denotes openning browser for specific address
   * - `false` value forbidden CRA openning browser
    */
  openBrowser?: string | false;
}

/**
 * Plink runs this funtion to get package level setting value by merge
 * the returned value with files that is specified by command line options "--prop" and "-c"
 */
export function defaultSetting(): CraScriptsSetting {
  return {
    lessLoaderAdditionalData: '',
    lessLoaderOtherOptions: {}
    // libExternalRequest: [/[^?!]/, /^/]
  };
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting() {
  /* eslint-disable dot-notation, @typescript-eslint/dot-notation */
  return config()['@wfh/cra-scripts'];
}
