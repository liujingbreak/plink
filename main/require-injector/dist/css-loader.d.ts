import Inject from './replace-require';
/**
 * Some legacy LESS files reply on npm-import-plugin, which are using convention like
 * "import 'npm://bootstrap/less/bootstrap';" to locate LESS file from node_modules,
 * but with Webpack resolver, it changes to use `@import "~bootstrap/less/bootstrap";`.
 *
 * This loader replaces all "import ... npm://"s with webpack's "import ... ~" style,
 * and works with require-injector to replace package.
 */
declare function loader(content: string, sourcemap: any): void;
/**
 *
 * @param {*} file
 * @param {*} origPackageName
 * @return {*} could be {string} for injected package name, {null} for no injection,
 * empty string for `replaceCode` with falsy value
 */
declare function _getInjectedPackage(file: string, origPackageName: string, injector?: Inject): string | null;
declare namespace loader {
    const getInjectedPackage: typeof _getInjectedPackage;
}
export = loader;
