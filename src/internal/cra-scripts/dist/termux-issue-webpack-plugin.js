"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TermuxWebpackPlugin = exports.isTermux = void 0;
const TERMUX_DIR = '/data/data/com.termux';
function isTermux() {
    return process.cwd().startsWith(TERMUX_DIR);
}
exports.isTermux = isTermux;
class TermuxWebpackPlugin {
    apply(compiler) {
        if (!isTermux())
            return;
        const lookupDirs = [];
        for (const item of TERMUX_DIR.split('/')) {
            const dir = ((lookupDirs.length > 0 ? lookupDirs[lookupDirs.length - 1] : '') +
                '/' + item).replace(/^\/\//, '/');
            // eslint-disable-next-line no-console
            console.log('[TermuxIssueWebpackPlugin] Termux directory', dir);
            lookupDirs.push(dir);
        }
        const lookupSet = new Set(lookupDirs);
        // let compilation: Compilation;
        // compiler.hooks.compilation.tap('TermuxIssueResolve', (compilation0, params) => {
        //   compilation = compilation0;
        // });
        compiler.hooks.done.tap('TermuxIssueResolve', stats => {
            for (const item of stats.compilation.fileDependencies) {
                if (lookupSet.has(item)) {
                    // eslint-disable-next-line no-console
                    console.log('[TermuxIssueWebpackPlugin] remove unaccessable fileDependency', item);
                    stats.compilation.fileDependencies.delete(item);
                }
            }
        });
    }
}
exports.TermuxWebpackPlugin = TermuxWebpackPlugin;
//# sourceMappingURL=termux-issue-webpack-plugin.js.map