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
export declare function defaultSetting(): ExpressAppSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): ExpressAppSetting;
