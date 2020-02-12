export declare function main(): void;
/**
 * Pack directory into zip file
 * @param zipFileOrDir
 * @param installDir
 * @param appName
 */
export declare function checkZipFile(zipFileOrDir: string, installDir: string, appName: string): Promise<string>;
/**
 * drcp run assets-processer/ts/remote-deploy.ts#fetchAllZips --env test -c conf/remote-deploy-test.yaml
 */
export declare function fetchAllZips(): Promise<void>;
/**
 * Call this file to generate checksum files in build process
 */
export declare function digestInstallingFiles(rootDir?: string): Promise<void>;
