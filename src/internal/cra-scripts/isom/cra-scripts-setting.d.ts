/**
 * Package setting type
 */
export interface CraScriptsSetting {
    /** Less loader option: additionalData */
    lessLoaderAdditionalData: string;
}
/**
 * Plink runs this funtion to get package level setting value by merge
 * the returned value with files that is specified by command line options "--prop" and "-c"
 */
export declare function defaultSetting(): CraScriptsSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): any;
