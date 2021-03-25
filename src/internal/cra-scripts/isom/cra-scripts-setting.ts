import {config} from '@wfh/plink';

/**
 * Package setting type
 */
export interface CraScriptsSetting {
  /** Less loader option: additionalData */
  lessLoaderAdditionalData: string;
  // /** In build library mode, webpack configuration externals */
  // libExternalRequest: Array<string | RegExp>;
  // /** In build library mode, by default webpack configuration externals */
  // libIncludeRequest: Array<string | RegExp>;
}

/**
 * Plink runs this funtion to get package level setting value by merge
 * the returned value with files that is specified by command line options "--prop" and "-c"
 */
export function defaultSetting(): CraScriptsSetting {
  return {
    lessLoaderAdditionalData: ''
    // libExternalRequest: [/[^?!]/, /^/]
  };
}

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting() {
  // tslint:disable:no-string-literal
  return config()['@wfh/cra-scripts']!;
}
