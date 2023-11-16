import Path from 'path';
import {log4File, config as plinkConfig} from '@wfh/plink';
import {DllPlugin, DllReferencePlugin, Configuration} from 'webpack';
import {CommandOption} from './build-options';

const log = log4File(__filename);

export function extractDllName(entries: CommandOption['buildTargets']) {
  const firstEntryPkg = entries[0].pkg;
  if (firstEntryPkg == null)
    throw new Error(`For DLL build, the first entry must be inside a Plink package of current workspace, ${entries[0].file}`);

  const parsed = Path.parse(entries[0].file!);
  const firstEntryPathWithoutSuffix = Path.resolve(parsed.dir, parsed.name);

  let requirePath = firstEntryPkg.name + '/' +
    Path.relative(firstEntryPkg.realPath, firstEntryPathWithoutSuffix); // remove optional file extension name
  if (Path.sep === '\\')
    requirePath = requirePath.replace(/\\/g, '/');

  const dllName = /[^/\\]+$/.exec(requirePath)![0];
  return [dllName, requirePath] as const;
}

export function setupDllPlugin(entries: CommandOption['buildTargets'], config: Configuration, pluginConstFinder: (moduleName: string) => any) {
  const [dllName, requirePath] = extractDllName(entries);
  config.entry = {
    [dllName]: entries.map(en => {
      if (en.file == null)
        log.error(`Invalid entry: ${en.pkg}`);
      return en.file;
    }).filter(file => file != null) as string[]
  };

  log.info('DLL library name:', requirePath);

  config.output!.filename = 'dll/[name].js';
  config.output!.chunkFilename = 'dll/[name].chunk.js';
  config.output!.library = {
    type: 'global',
    name: '_dll_' + dllName
  };

  config.optimization!.runtimeChunk = false;
  if (config.optimization && config.optimization.splitChunks) {
    config.optimization.splitChunks = {
      cacheGroups: {default: false}
    };
  }

  // ---- Plugins filter ----
  const pluginsToRemove = [
    // require(Path.resolve('node_modules/react-dev-utils/ForkTsCheckerWebpackPlugin')),
    pluginConstFinder('html-webpack-plugin'),
    pluginConstFinder('webpack-manifest-plugin').WebpackManifestPlugin,
    pluginConstFinder('react-dev-utils/InterpolateHtmlPlugin'),
    pluginConstFinder('react-dev-utils/InlineChunkHtmlPlugin'),
    pluginConstFinder('webpack').HotModuleReplacementPlugin
  ];
  config.plugins = config.plugins!.filter(plugin => {
    return pluginsToRemove.every(cls => !(plugin instanceof cls));
  });

  const manifestFile = plinkConfig.resolve('destDir', dllName + '.dll.manifest.json');

  config.plugins.push(
    new DllPlugin({
      path: manifestFile,
      format: true
      // name: '[name]_[chunkhash]'
    })
  );
  log.info('DLL manifest:', manifestFile);
}

/**
 * Refer to https://github.com/webpack/webpack/blob/main/test/configCases/dll-plugin/2-use-dll-without-scope/webpack.config.js
 * @returns entry DLL js files names
 */
export function setupDllReferencePlugin(manifestFiles: string[], config: Configuration) {
  if (config.optimization == null)
    config.optimization = {};
  config.optimization.moduleIds = 'named';

  return manifestFiles.map(manifestFile => {
    const m = /([^/\\.]+)[^/\\]*?$/.exec(manifestFile);
    if (m == null)
      return false;
    const name = '_dll_' + m[1];

    config.plugins!.push(new DllReferencePlugin({
      manifest: manifestFile,
      name, // (It must be same as Dll library.name) offical description: The name where the dll is exposed (external name, defaults to manifest.name), In example, it is: dll js file path
      sourceType: 'global'
    }));
    log.info('Dll Reference:', manifestFile);

    // let outputPath = Path.relative(plinkConfig.resolve('staticDir'), outputPathForDllName(m[1]));
    // if (Path.sep === '\\')
    //   outputPath = outputPath.replace(/\\/g, '/');

    return 'dll/' + m[1] + '.js';
  }).filter(v => v) as string[];
}
