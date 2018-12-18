/**
 * [readAsJson description]
 * @param  {function} onFile  [description]
 */
export declare function readAsJson(toFile: any, onFlush: () => void): any;
export declare function symbolicLinkPackages(destDir: string): any;
export declare function _symbolicLink(dir: string, link: any): void;
/**
 * Write recipe file
 * Write an array of linked package path, and a recipe package.json file
 * @param {string} recipeAbsDir null when there is no recipe dir for those linked package file
 */
export declare function addDependency(recipeAbsDir: string): any;
