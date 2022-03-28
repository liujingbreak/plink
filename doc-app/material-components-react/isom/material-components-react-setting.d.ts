/**
 * This file is generated by @wfh/tool-misc
 */
import { PackageSettingInterf } from '@wfh/plink';
/**
 * Package setting type
 */
export interface MaterialComponentsReactSetting {
    /** Theme of Material design */
    materialTheme: 'default' | 'ugly';
}
/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
export declare const defaultSetting: PackageSettingInterf<MaterialComponentsReactSetting>;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): MaterialComponentsReactSetting;