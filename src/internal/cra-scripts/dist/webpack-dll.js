"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDllReferencePlugin = exports.setupDllPlugin = exports.extractDllName = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const plink_1 = require("@wfh/plink");
const webpack_1 = require("webpack");
const log = (0, plink_1.log4File)(__filename);
function extractDllName(entries) {
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
    return [dllName, requirePath];
}
exports.extractDllName = extractDllName;
function setupDllPlugin(entries, config, pluginConstFinder) {
    const [dllName, requirePath] = extractDllName(entries);
    config.entry = {
        [dllName]: entries.map(en => {
            if (en.file == null)
                log.error(`Invalid entry: ${en.pkg}`);
            return en.file;
        }).filter(file => file != null)
    };
    log.info('DLL library name:', requirePath);
    config.output.filename = 'dll/[name].js';
    config.output.chunkFilename = 'dll/[name].chunk.js';
    config.output.library = {
        type: 'global',
        name: '_dll_' + dllName
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
 * @returns entry DLL js files names
 */
function setupDllReferencePlugin(manifestFiles, config) {
    if (config.optimization == null)
        config.optimization = {};
    config.optimization.moduleIds = 'named';
    return manifestFiles.map(manifestFile => {
        const m = /([^/\\.]+)[^/\\]*?$/.exec(manifestFile);
        if (m == null)
            return false;
        const name = '_dll_' + m[1];
        config.plugins.push(new webpack_1.DllReferencePlugin({
            manifest: manifestFile,
            name,
            sourceType: 'global'
        }));
        log.info('Dll Reference:', manifestFile);
        // let outputPath = Path.relative(plinkConfig.resolve('staticDir'), outputPathForDllName(m[1]));
        // if (Path.sep === '\\')
        //   outputPath = outputPath.replace(/\\/g, '/');
        return 'dll/' + m[1] + '.js';
    }).filter(v => v);
}
exports.setupDllReferencePlugin = setupDllReferencePlugin;
//# sourceMappingURL=webpack-dll.js.map