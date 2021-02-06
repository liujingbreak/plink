import { InjectorConfigHandler } from '@wfh/plink';
/**
 * Package setting type
 */
export interface PrebuildSetting {
    /** Build target Git remote name */
    prebuildGitRemote: string;
    /** Build targe Git branch name */
    prebuildReleaseBranch: string;
    /** Build target Git remote name for tag only */
    tagPushRemote: string;
    byEnv: {
        [env: string]: {
            installEndpoint: string;
            sendConcurrency: number;
            sendNodes: number;
        };
    };
}
/**
 * Plink runs this funtion to get package level setting value,
 * function name "defaultSetting" must be also configured in package.json file
 */
export declare function defaultSetting(): PrebuildSetting;
/**
 * The return setting value is merged with files specified by command line options "--prop" and "-c"
 * @return setting of current package
 */
export declare function getSetting(): PrebuildSetting;
declare const otherConfigures: InjectorConfigHandler;
export default otherConfigures;
