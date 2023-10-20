import Path from 'path';
import {DllPlugin} from 'webpack';
import {config as plinkConfig} from '@wfh/plink';
import {Configuration, Compiler, RuleSetRule, RuleSetUseItem, EntryObject} from 'webpack';

export default function change(buildPackage: string, config: Configuration) {
  config.output!.library = {
    type: 'commonjs2',
    name: 'mydll'
  };

  config.optimization!.runtimeChunk = false;
  if (config.optimization && config.optimization.splitChunks) {
    config.optimization.splitChunks = {
      cacheGroups: {default: false}
    };
  }

  // ---- Plugins filter ----
  const pluginsToRemove = [
    require(Path.resolve('node_modules/react-dev-utils/ForkTsCheckerWebpackPlugin')),
    require(Path.resolve('node_modules/react-dev-utils/InlineChunkHtmlPlugin')),
    require(Path.resolve('node_modules/webpack')).HotModuleReplacementPlugin
  ];
  config.plugins = config.plugins!.filter(plugin => {
    pluginsToRemove.every(cls => !(plugin instanceof cls));
  });

  config.plugins.push(
    new DllPlugin({
      path: plinkConfig.resolve('destDir', 'dll.manifest.json')
    })
  );
}
