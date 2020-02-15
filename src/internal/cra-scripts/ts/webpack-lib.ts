import {Configuration, Compiler, RuleSetRule} from 'webpack';
import {findPackage} from './build-target-helper';
// import fs from 'fs-extra';
import Path from 'path';
// import {getCmdOptions} from './utils';

export default function change(buildPackage: string, config: Configuration) {

  const {dir: pkDir, packageJson: pkJson} = findPackage(buildPackage);

  config.entry = Path.resolve(pkDir, pkJson.dr.buildEntry.lib);

  config.output!.path = Path.resolve(pkDir, 'build'); // Have to override it cuz' react-scripts assign `undefined` in non-production env
  config.output!.filename = 'lib-bundle.js';
  config.output!.libraryTarget = 'commonjs2';
  config.optimization!.runtimeChunk = false;
  if (config.optimization && config.optimization.splitChunks) {
    config.optimization.splitChunks = {
      cacheGroups: {default: false}
    };
  }

  const MiniCssExtractPlugin = require(Path.resolve('node_modules/mini-css-extract-plugin'));
  const InlineChunkHtmlPlugin = require(Path.resolve('node_modules/react-dev-utils/InlineChunkHtmlPlugin'));
  const InterpolateHtmlPlugin = require(Path.resolve('node_modules/react-dev-utils/InterpolateHtmlPlugin'));
  const HtmlWebpackPlugin = require(Path.resolve('node_modules/html-webpack-plugin'));

  config.plugins = config.plugins!.filter(plugin => {
    return (!(plugin instanceof MiniCssExtractPlugin)) &&
      (! (plugin instanceof InlineChunkHtmlPlugin)) &&
      (! (plugin instanceof InterpolateHtmlPlugin)) &&
      (! (plugin instanceof HtmlWebpackPlugin));
  });

  for (const rule of config.module!.rules)
    findAndChangeRule(rule);


  const reqSet = new Set<string>();

  if (config.externals == null)
    config.externals = [];
  (config.externals as Extract<Configuration['externals'], Array<any>>)
  .push(
    (context: any, request: any, callback: (error?: any, result?: any) => void ) => {
      // TODO: Should be configurable
      if ((!request.startsWith('.') && request !== config.entry &&
        !/[?!]/.test(request) &&
        !/[\\/]@babel[\\/]/.test(request)) || request.indexOf('/bklib.min') >= 0) {
        // console.log('external request:', request, `(${context})`);
        reqSet.add(request);
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  );

  config.plugins!.push(new (class {
    apply(compiler: Compiler) {
      compiler.hooks.done.tap('cra-scripts', stats => {
        // tslint:disable-next-line: no-console
        console.log('external request:', Array.from(reqSet.values()).join('\n'));
      });
    }
  })());
}


function findAndChangeRule(rule: RuleSetRule) {
  // TODO: check in case CRA will use Rule.use instead of "loader"
  if (Array.isArray(rule.use)) {
    const found = rule.use.findIndex(use => (use as any).loader && (use as any).loader.indexOf('mini-css-extract-plugin') >= 0);
    if (found >= 0) {
      rule.use.splice(found, 1);
    }
  } else if (rule.oneOf) {
    return rule.oneOf.forEach(findAndChangeRule);
  }
}
