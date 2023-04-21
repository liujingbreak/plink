import {Compiler} from 'webpack';

const TERMUX_DIR = '/data/data/com.termux';

export function isTermux() {
  return process.cwd().startsWith(TERMUX_DIR);
}

export class TermuxWebpackPlugin {
  apply(compiler: Compiler) {
    if (!isTermux())
      return;
    const lookupDirs = [] as string[];
    for (const item of TERMUX_DIR.split('/')) {
      const dir = ((lookupDirs.length > 0 ? lookupDirs[lookupDirs.length - 1] : '') +
                 '/' + item).replace(/^\/\//, '/');

      // eslint-disable-next-line no-console
      console.log('[TermuxIssueWebpackPlugin] Termux directory', dir);
      lookupDirs.push(dir);
    }
    const lookupSet = new Set<string>(lookupDirs);

    compiler.hooks.done.tap('TermuxIssueResolve', stats => {
      for (const item of stats.compilation.fileDependencies) {
        if (lookupSet.has(item)) {
          // eslint-disable-next-line no-console
          console.log('[TermuxIssueWebpackPlugin] remove unaccessible fileDependency', item);
          stats.compilation.fileDependencies.delete(item);
        }
      }
    });
  }
}

