import {config, PackageSettingInterf} from '@wfh/plink';

/**
 * Package setting type
 */
export interface DocEntrySetting {
  /** Router basename, change it will affect process.env.REACT_APP_routeBasename, see config-overrides.ts */
  basename: string;
}

export const defaultSetting: PackageSettingInterf<DocEntrySetting> = (cliOption) => {
  const defaultValue: DocEntrySetting = {
    basename: '/plink'
  };
  return defaultValue;
};

defaultSetting.setupWebInjector = (factory, setting) => {

};

/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export function getSetting() {
  // tslint:disable:no-string-literal
  return config()['@wfh/doc-entry']!;
}
