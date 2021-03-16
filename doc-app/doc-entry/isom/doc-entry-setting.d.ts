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
export declare function defaultSetting(): DocEntrySetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): DocEntrySetting;
