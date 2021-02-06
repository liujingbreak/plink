/**
 * Package setting type
 */
export interface HttpServerSetting {
    noHealthCheck: boolean;
    ssl: {
        enabled: boolean;
        key: string;
        cert: string;
        port: number;
        httpForward: boolean;
    };
}
/**
 * Plink runs this funtion to get package level setting value
 */
export declare function defaultSetting(): HttpServerSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): HttpServerSetting;
