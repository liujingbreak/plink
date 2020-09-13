import { Observable } from 'rxjs';
export declare function setProjectList(list: string[]): void;
export declare type EachRecipeSrcCallback = (srcDir: string, projectDir: string) => void;
/**
 * Iterate src folder for component items
 * @param {string | string[]} projectDir optional, if not present or null, includes all project src folders
 * @param  {Function} callback (srcDir, recipeDir, recipeName): void
 */
export declare function eachRecipeSrc(callback: EachRecipeSrcCallback): void;
export declare function eachRecipeSrc(projectDir: string, callback: EachRecipeSrcCallback): void;
export declare type EachRecipeCallback = (recipeDir: string, isFromInstallation: boolean, jsonFileName: string, jsonFileContent: string) => void;
/**
 * @name eachRecipe
 * @param  {Function} callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
 */
/**
 * eachInstalledRecipe
 * @param callback function(recipeDir, isFromInstallation, jsonFileName = 'package.json'): void
*/
/**
 * @return array of linked package's package.json file path
 */
export declare function linkComponentsAsync(symlinksDir: string): Observable<{
    proj: string;
    jsonFile: string;
    json: any;
}>;
export declare function clean(): Promise<void>;
