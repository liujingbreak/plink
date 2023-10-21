"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDllReferencePlugin = exports.setupDllPlugin = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const plink_1 = require("@wfh/plink");
const webpack_1 = require("webpack");
const log = (0, plink_1.log4File)(__filename);
function setupDllPlugin(entries, config, pluginConstFinder) {
    const firstEntryPkg = entries[0].pkg;
    if (firstEntryPkg == null)
        throw new Error(`For DLL build, the first entry must be inside a Plink package of current workspace, ${entries[0].file}`);
    const parsed = path_1.default.parse(entries[0].file);
    const firstEntryPathWithoutSuffix = path_1.default.resolve(parsed.dir, parsed.name);
    let requirePath = firstEntryPkg.name + '/' +
        path_1.default.relative(firstEntryPkg.realPath, firstEntryPathWithoutSuffix); // remove optional file extension name
    if (path_1.default.sep === '\\')
        requirePath = requirePath.replace(/\\/g, '/');
    const dllName = /[^/\\]+$/.exec(requirePath)[0];
    config.entry = {
        [dllName]: entries.map(en => {
            if (en.file == null)
                log.error(`Invalid entry: ${en.pkg}`);
            return en.file;
        }).filter(file => file != null)
    };
    log.info('DLL library name:', requirePath);
    config.output.filename = 'dll/js/[name].js';
    config.output.chunkFilename = 'dll/js/[name].chunk.js';
    config.output.library = {
        type: 'global',
        name: requirePath
    };
    config.optimization.runtimeChunk = false;
    if (config.optimization && config.optimization.splitChunks) {
        config.optimization.splitChunks = {
            cacheGroups: { default: false }
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
    config.plugins = config.plugins.filter(plugin => {
        return pluginsToRemove.every(cls => !(plugin instanceof cls));
    });
    const manifestFile = plink_1.config.resolve('destDir', dllName + '.dll.manifest.json');
    config.plugins.push(new webpack_1.DllPlugin({
        path: manifestFile,
        format: true
        // name: '[name]_[chunkhash]'
    }));
    log.info('DLL manifest:', manifestFile);
}
exports.setupDllPlugin = setupDllPlugin;
/**
 * Refer to https://github.com/webpack/webpack/blob/main/test/configCases/dll-plugin/2-use-dll-without-scope/webpack.config.js
 */
function setupDllReferencePlugin(manifestFiles, config) {
    if (config.optimization == null)
        config.optimization = {};
    config.optimization.moduleIds = 'named';
    for (const manifestFile of manifestFiles) {
        config.plugins.push(new webpack_1.DllReferencePlugin({
            manifest: manifestFile,
            name: '@wfh/doc-entry/dll/shell-entry',
            // context: '', // TODO: Context of requests in the manifest (or content property) as absolute path. In example, it is: (dll js directory)
            sourceType: 'global'
        }));
        log.info('Dll Reference:', manifestFile);
    }
}
exports.setupDllReferencePlugin = setupDllReferencePlugin;
//# sourceMappingURL=webpack-dll.js.map