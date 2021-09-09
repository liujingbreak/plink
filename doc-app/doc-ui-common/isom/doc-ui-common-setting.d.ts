import { PlinkSettings } from '@wfh/plink';
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
export declare function defaultSetting(cliOptions: NonNullable<PlinkSettings['cliOptions']>): DocUiCommonSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): any;
