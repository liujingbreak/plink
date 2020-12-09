"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console max-line-length */
const log = require('log4js').getLogger('ChunkInfoPlugin');
const logFd = log;
const logD = log;
const chalk = require('chalk');
const showDependency = false;
const showFileDep = false;
const { cyan, green } = require('chalk');
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const __api_1 = __importDefault(require("__api"));
class ChunkInfoPlugin {
    constructor() {
        this.done = false;
    }
    apply(compiler) {
        log.info('----- ChunkInfoPlugin -----');
        this.compiler = compiler;
        compiler.hooks.emit.tapPromise('ChunkInfoPlugin', (compilation) => {
            if (this.done)
                return Promise.resolve();
            this.done = true;
            log.info(_.pad(' emit ', 40, '-'));
            return this.printChunkGroups(compilation);
        });
    }
    printChunkGroups(compilation) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const cg of compilation.chunkGroups) {
                // log.info('Named chunk groups: ' + compilation.namedChunkGroups.keys().join(', '));
                // log.info('entrypoints: ' + compilation.entrypoints.keys().join(', '));
                log.info('');
                log.info(`Chunk group: ${cyan(cg.name || cg.id)}`);
                log.info('├─  children: (%s)', cg.getChildren().map((ck) => green(this.getChunkName(ck))).join(', '));
                log.info(`├─  parents: ${cg.getParents().map((ck) => green(this.getChunkName(ck))).join(', ')}`);
                this.printChunks(cg.chunks, compilation);
            }
            this.printChunksByEntry(compilation);
        });
    }
    printChunks(chunks, compilation) {
        var self = this;
        chunks.forEach((chunk) => {
            log.info('├─  chunk: %s, isOnlyInitial: %s, ids: %s', this.getChunkName(chunk), 
            // chunk.parents.map((p: any) => this.getChunkName(p)).join(', '),
            chunk.isOnlyInitial(), chunk.ids);
            // log.info('\tchildren: (%s)', chunk.chunks.map((ck: any) => this.getChunkName(ck)).join(', '));
            log.info('│    ├─ %s %s', chunk.hasRuntime() ? '(has runtime)' : '', chunk.hasEntryModule() ? `(has entryModule: ${this.moduleFileName(chunk.entryModule)})` : '');
            log.info(`│    ├─ ${green('modules')}`);
            (chunk.getModules ? chunk.getModules() : chunk.modules).forEach((module) => {
                // Explore each source file path that was included into the module:
                const moduleName = this.moduleFileName(module);
                log.info('│    │  ├─ %s', moduleName);
                const pk = __api_1.default.findPackageByFile(Path.resolve(this.compiler.options.context, moduleName));
                if (module.buildInfo.fileDependencies && (showFileDep || (pk && pk.dr && module.buildInfo.fileDependencies))) {
                    for (const filepath of module.buildInfo.fileDependencies) {
                        logFd.info('│    │  │  ├─ %s', chalk.blue('(fileDependency): ' + Path.relative(this.compiler.options.context, filepath)));
                    }
                }
                _.each(module.blocks, (block) => {
                    const cacheGroups = _.map(block.chunkGroup, (cg) => cg.name).filter(name => name).join(', ');
                    log.info(`│    │  │  ├─ (block ${block.constructor.name}): chunk group (${cacheGroups})`);
                    if (showDependency || (pk && pk.dr)) {
                        _.each(block.dependencies, (bDep) => {
                            logD.info(`│    │  │  │  ├─ ${bDep.constructor.name}`);
                            if (bDep.module)
                                logD.info(`│    │  │  │  │  ├─ .module ${self.moduleFileName(bDep.module)}`);
                        });
                    }
                });
                if (showDependency) {
                    _.each(module.dependencies, (dep) => {
                        var source = module._source.source();
                        logD.debug('│    │  │  ├─ %s', chalk.blue('(dependency %s): ' + dep.constructor.name), dep.range ? source.substring(dep.range[0], dep.range[1]) : '');
                        if (dep.module)
                            logD.debug(`│    │  │  │  ├─ .module ${chalk.blue(self.moduleFileName(dep.module))}`);
                    });
                }
            });
            log.info('│    │  ');
            // Explore each asset filename generated by the chunk:
            chunk.files.forEach(function (filename) {
                log.info('│    ├── file: %s', filename);
            });
        });
    }
    moduleFileName(m) {
        const fileName = m.nameForCondition ? m.nameForCondition() : (m.identifier() || m.name).split('!').slice().pop();
        // return Path.relative(this.compiler.options.context, (m.identifier() || m.name).split('!').slice().pop());
        return Path.relative(this.compiler.options.context, fileName);
    }
    getChunkName(chunk) {
        var id = chunk.debugId;
        if (chunk.id)
            id = chunk.id + '-' + chunk.debugId;
        return '#' + id + ' ' + chalk.green(chunk.name || '');
    }
    printChunksByEntry(compilation) {
        log.info('Entrypoint chunk tree:');
        _.each(compilation.entrypoints, (entrypoint, name) => {
            log.info('entrypoint %s', chalk.green(name));
            _.each(entrypoint.chunks, (chunk) => log.info('  ├─ %s', chunk.files[0]));
        });
    }
}
exports.default = ChunkInfoPlugin;

//# sourceMappingURL=chunk-info.js.map
