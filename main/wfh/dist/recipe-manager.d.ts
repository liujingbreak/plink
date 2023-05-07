import { Observable } from 'rxjs';
export declare function setProjectList(list: string[]): void;
export declare function setLinkPatterns(list: Iterable<string>): void;
export type EachRecipeSrcCallback = (srcDir: string, projectDir: string) => void;
/**
 * @deprecated
 * Use allSrcDirs() instead.
 * Iterate src folder for component items
 * @param {string | string[]} projectDir optional, if not present or null, includes all project src folders
 * @param  {Function} callback (srcDir, recipeDir, recipeName): void
 */
export declare function eachRecipeSrc(callback: EachRecipeSrcCallback): void;
export declare function eachRecipeSrc(projectDir: string, callback: EachRecipeSrcCallback): void;
export declare function allSrcDirs(): Generator<{
    srcDir: string;
    projDir: string;
} | {
    srcDir: string;
    projDir?: undefined;
}, void, unknown>;
export type EachRecipeCallback = (recipeDir: string, isFromInstallation: boolean, jsonFileName: string, jsonFileContent: string) => void;
/**
 * @returns Observable of tuple [project, package.json file]
 */
export declare function scanPackages(): Observable<[string | undefined, string, string]>;
