/**
 * Package setting type
 */
export interface NgAppBuilderSetting {
    /** Description of config property */
    useThread: boolean;
    ng8Compliant: boolean;
    /** For debug purpose, log changed TS file content */
    logChangedTsFile: boolean;
}
/**
 * Plink runs this funtion to get package level setting value
 */
export declare function defaultSetting(): NgAppBuilderSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): NgAppBuilderSetting;
