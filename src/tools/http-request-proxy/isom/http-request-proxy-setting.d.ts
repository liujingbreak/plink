import { InjectorConfigHandler } from '@wfh/plink';
/**
 * Package setting type
 */
export interface HttpRequestProxySetting {
    trackRequestStream: boolean;
    proxies: {
        [path: string]: string;
    };
    timeout: number;
    proxyTo?: string;
    npmRegistry: string;
}
/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
export declare function defaultSetting(): HttpRequestProxySetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): HttpRequestProxySetting;
declare const otherConfigures: InjectorConfigHandler;
export default otherConfigures;
