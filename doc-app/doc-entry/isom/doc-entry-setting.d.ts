import { PackageSettingInterf } from '@wfh/plink';
/**
 * Package setting type
 */
export interface DocEntrySetting {
    /** Router basename, change it will affect process.env.REACT_APP_routeBasename, see config-overrides.ts */
    basename: string;
}
export declare const defaultSetting: PackageSettingInterf<DocEntrySetting>;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): DocEntrySetting;
