import RequireInjector, {LoaderOptions} from 'require-injector';
import ts from 'typescript';
import * as wp from 'webpack';

const webInjector = new RequireInjector({noNode: true});
/** Cached AST for files */
const astCacheMap = new Map<string, ts.SourceFile>();

const options: LoaderOptions = {
  injector: webInjector,
  onAstCreated(file, ast) {
    astCacheMap.set(file, ast);
  }
};

export default function(config: wp.Configuration) {
  config.module!.rules.push({
    test: /\.(ts|tsx|js|jsx)$/,
    use: [
      {
        loader: 'require-injector/webpack-loader',
        options
      }
    ]
  });
}

