/**
 * Package setting type
 */
export interface HttpServerSetting {
    /** Deprecated */
    noHealthCheck: boolean;
    ssl: {
        enabled: boolean;
        key: string;
        cert: string;
        port: number;
        httpForward: boolean;
    };
    /** Additional host names (other than default host)
    * that HTTP/HTTPS server needs to listened */
    hostnames: string[];
    /** starts with multiple servers
    * if this property is provided, property "ssl" will be ignored */
    servers?: {
        ssl?: {
            key: string;
            cert: string;
        };
        port: number;
    }[];
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
