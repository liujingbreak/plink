export interface PackageApi {
    packageName: string;
    config(): {
        [key: string]: any;
    };
    isDefaultLocale(): boolean;
    getBuildLocale(): string;
    isNode(): boolean;
    _contextPath(packageName?: string): string;
}
export declare function patchToApi(apiPrototype: any): void;
export declare function entryPageUrl(this: PackageApi, packageName: string, path: string, locale: string): string;
export declare function assetsUrl(this: PackageApi, packageName: string, path?: string): string;
/**
 * Helper for dealing with url like "npm://<package>/<path>", "assets://<package>/<path>"
 * @param {string} staticAssetsURL, like Webpack's output.publicPath
 * @param {object} outputPathMap
 * @param {string} useLocale the final URL will includes locale path (for entry page URL) "zh" or "us",
 * use `null` or "" denotes default locale
 * @param {string} packageName if null, the package name will be extracted from url
 * @param {string} path
 * @return {string}
 */
export declare function publicUrl(staticAssetsURL: string, outputPathMap: {
    [name: string]: string;
}, useLocale: string | null, packageName: string, path: string): string;
export declare function serverUrl(this: PackageApi, packageNameOrPath: string, path?: string): string;
