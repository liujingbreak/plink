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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2NodW5rLWluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQStDO0FBQy9DLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMzRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDbEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDO0FBQ2pCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFDN0IsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBQzFCLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZDLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0Isa0RBQXdCO0FBQ3hCLE1BQXFCLGVBQWU7SUFBcEM7UUFFRSxTQUFJLEdBQUcsS0FBSyxDQUFDO0lBbUdmLENBQUM7SUFqR0MsS0FBSyxDQUFDLFFBQWE7UUFDakIsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFdBQWdCLEVBQUUsRUFBRTtZQUNyRSxJQUFJLElBQUksQ0FBQyxJQUFJO2dCQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdB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Q0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsY0FBYyxDQUFDLENBQU07UUFDbkIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNqSCw0R0FBNEc7UUFDNUcsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQsWUFBWSxDQUFDLEtBQVU7UUFDckIsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUN2QixJQUFJLEtBQUssQ0FBQyxFQUFFO1lBQ1YsRUFBRSxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7UUFDdEMsT0FBTyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVELGtCQUFrQixDQUFDLFdBQWdCO1FBQ2pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNuQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxVQUFlLEVBQUUsSUFBWSxFQUFFLEVBQUU7WUFDaEUsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzdDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakYsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBRUY7QUFyR0Qsa0NBcUdDIiwiZmlsZSI6ImRpc3QvcGx1Z2lucy9jaHVuay1pbmZvLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
