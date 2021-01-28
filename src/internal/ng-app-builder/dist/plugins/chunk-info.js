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
                if (module.buildInfo.fileDependencies && (showFileDep || (pk && (pk.json.dr || pk.json.plink) && module.buildInfo.fileDependencies))) {
                    for (const filepath of module.buildInfo.fileDependencies) {
                        logFd.info('│    │  │  ├─ %s', chalk.blue('(fileDependency): ' + Path.relative(this.compiler.options.context, filepath)));
                    }
                }
                _.each(module.blocks, (block) => {
                    const cacheGroups = _.map(block.chunkGroup, (cg) => cg.name).filter(name => name).join(', ');
                    log.info(`│    │  │  ├─ (block ${block.constructor.name}): chunk group (${cacheGroups})`);
                    if (showDependency || (pk && (pk.json.dr || pk.json.plink))) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2h1bmstaW5mby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNodW5rLWluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQStDO0FBQy9DLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMzRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDbEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDO0FBQ2pCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFDN0IsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBQzFCLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZDLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0Isa0RBQXdCO0FBQ3hCLE1BQXFCLGVBQWU7SUFBcEM7UUFFRSxTQUFJLEdBQUcsS0FBSyxDQUFDO0lBbUdmLENBQUM7SUFqR0MsS0FBSyxDQUFDLFFBQWE7UUFDakIsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFdBQWdCLEVBQUUsRUFBRTtZQUNyRSxJQUFJLElBQUksQ0FBQyxJQUFJO2dCQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEdB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SSxDQUFDLENBQUMsQ0FBQztZQUM3QyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFVLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUVGO0FBckdELGtDQXFHQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoICovXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0NodW5rSW5mb1BsdWdpbicpO1xuY29uc3QgbG9nRmQgPSBsb2c7XG5jb25zdCBsb2dEID0gbG9nO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qgc2hvd0RlcGVuZGVuY3kgPSBmYWxzZTtcbmNvbnN0IHNob3dGaWxlRGVwID0gZmFsc2U7XG5jb25zdCB7Y3lhbiwgZ3JlZW59ID0gcmVxdWlyZSgnY2hhbGsnKTtcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENodW5rSW5mb1BsdWdpbiB7XG4gIGNvbXBpbGVyOiBhbnk7XG4gIGRvbmUgPSBmYWxzZTtcblxuICBhcHBseShjb21waWxlcjogYW55KSB7XG4gICAgbG9nLmluZm8oJy0tLS0tIENodW5rSW5mb1BsdWdpbiAtLS0tLScpO1xuICAgIHRoaXMuY29tcGlsZXIgPSBjb21waWxlcjtcbiAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ0NodW5rSW5mb1BsdWdpbicsIChjb21waWxhdGlvbjogYW55KSA9PiB7XG4gICAgICBpZiAodGhpcy5kb25lKVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB0aGlzLmRvbmUgPSB0cnVlO1xuICAgICAgbG9nLmluZm8oXy5wYWQoJyBlbWl0ICcsIDQwLCAnLScpKTtcbiAgICAgIHJldHVybiB0aGlzLnByaW50Q2h1bmtHcm91cHMoY29tcGlsYXRpb24pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcHJpbnRDaHVua0dyb3Vwcyhjb21waWxhdGlvbjogYW55KSB7XG4gICAgZm9yIChjb25zdCBjZyBvZiBjb21waWxhdGlvbi5jaHVua0dyb3Vwcykge1xuICAgICAgLy8gbG9nLmluZm8oJ05hbWVkIGNodW5rIGdyb3VwczogJyArIGNvbXBpbGF0aW9uLm5hbWVkQ2h1bmtHcm91cHMua2V5cygpLmpvaW4oJywgJykpO1xuICAgICAgLy8gbG9nLmluZm8oJ2VudHJ5cG9pbnRzOiAnICsgY29tcGlsYXRpb24uZW50cnlwb2ludHMua2V5cygpLmpvaW4oJywgJykpO1xuICAgICAgbG9nLmluZm8oJycpO1xuICAgICAgbG9nLmluZm8oYENodW5rIGdyb3VwOiAke2N5YW4oY2cubmFtZSB8fCBjZy5pZCl9YCk7XG4gICAgICBsb2cuaW5mbygn4pSc4pSAICBjaGlsZHJlbjogKCVzKScsIGNnLmdldENoaWxkcmVuKCkubWFwKChjazogYW55KSA9PiBncmVlbih0aGlzLmdldENodW5rTmFtZShjaykpKS5qb2luKCcsICcpKTtcbiAgICAgIGxvZy5pbmZvKGDilJzilIAgIHBhcmVudHM6ICR7Y2cuZ2V0UGFyZW50cygpLm1hcCgoY2s6IGFueSkgPT4gZ3JlZW4odGhpcy5nZXRDaHVua05hbWUoY2spKSkuam9pbignLCAnKX1gKTtcbiAgICAgIHRoaXMucHJpbnRDaHVua3MoY2cuY2h1bmtzLCBjb21waWxhdGlvbik7XG4gICAgfVxuICAgIHRoaXMucHJpbnRDaHVua3NCeUVudHJ5KGNvbXBpbGF0aW9uKTtcbiAgfVxuXG4gIHByaW50Q2h1bmtzKGNodW5rczogYW55LCBjb21waWxhdGlvbjogYW55KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGNodW5rcy5mb3JFYWNoKChjaHVuazogYW55KSA9PiB7XG4gICAgICBsb2cuaW5mbygn4pSc4pSAICBjaHVuazogJXMsIGlzT25seUluaXRpYWw6ICVzLCBpZHM6ICVzJyxcbiAgICAgICAgdGhpcy5nZXRDaHVua05hbWUoY2h1bmspLFxuICAgICAgICAvLyBjaHVuay5wYXJlbnRzLm1hcCgocDogYW55KSA9PiB0aGlzLmdldENodW5rTmFtZShwKSkuam9pbignLCAnKSxcbiAgICAgICAgY2h1bmsuaXNPbmx5SW5pdGlhbCgpLCBjaHVuay5pZHMpO1xuICAgICAgLy8gbG9nLmluZm8oJ1xcdGNoaWxkcmVuOiAoJXMpJywgY2h1bmsuY2h1bmtzLm1hcCgoY2s6IGFueSkgPT4gdGhpcy5nZXRDaHVua05hbWUoY2spKS5qb2luKCcsICcpKTtcbiAgICAgIGxvZy5pbmZvKCfilIIgICAg4pSc4pSAICVzICVzJywgY2h1bmsuaGFzUnVudGltZSgpID8gJyhoYXMgcnVudGltZSknIDogJycsIGNodW5rLmhhc0VudHJ5TW9kdWxlKCkgPyBgKGhhcyBlbnRyeU1vZHVsZTogJHt0aGlzLm1vZHVsZUZpbGVOYW1lKGNodW5rLmVudHJ5TW9kdWxlKX0pYCA6ICcnKTtcblxuICAgICAgbG9nLmluZm8oYOKUgiAgICDilJzilIAgJHtncmVlbignbW9kdWxlcycpfWApO1xuICAgICAgKGNodW5rLmdldE1vZHVsZXMgPyBjaHVuay5nZXRNb2R1bGVzKCkgOiBjaHVuay5tb2R1bGVzKS5mb3JFYWNoKChtb2R1bGU6IGFueSkgPT4ge1xuICAgICAgICAvLyBFeHBsb3JlIGVhY2ggc291cmNlIGZpbGUgcGF0aCB0aGF0IHdhcyBpbmNsdWRlZCBpbnRvIHRoZSBtb2R1bGU6XG4gICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSB0aGlzLm1vZHVsZUZpbGVOYW1lKG1vZHVsZSk7XG4gICAgICAgIGxvZy5pbmZvKCfilIIgICAg4pSCICDilJzilIAgJXMnLCBtb2R1bGVOYW1lKTtcbiAgICAgICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoUGF0aC5yZXNvbHZlKHRoaXMuY29tcGlsZXIub3B0aW9ucy5jb250ZXh0LCBtb2R1bGVOYW1lKSk7XG4gICAgICAgIGlmIChtb2R1bGUuYnVpbGRJbmZvLmZpbGVEZXBlbmRlbmNpZXMgJiYgKHNob3dGaWxlRGVwIHx8IChwayAmJiAocGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rKSAmJiBtb2R1bGUuYnVpbGRJbmZvLmZpbGVEZXBlbmRlbmNpZXMpKSkge1xuICAgICAgICAgIGZvciAoY29uc3QgZmlsZXBhdGggb2YgbW9kdWxlLmJ1aWxkSW5mby5maWxlRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgICAgICBsb2dGZC5pbmZvKCfilIIgICAg4pSCICDilIIgIOKUnOKUgCAlcycsIGNoYWxrLmJsdWUoJyhmaWxlRGVwZW5kZW5jeSk6ICcgKyBQYXRoLnJlbGF0aXZlKHRoaXMuY29tcGlsZXIub3B0aW9ucy5jb250ZXh0LCBmaWxlcGF0aCkpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXy5lYWNoKG1vZHVsZS5ibG9ja3MsIChibG9jazogYW55KSA9PiB7XG4gICAgICAgICAgY29uc3QgY2FjaGVHcm91cHMgPSBfLm1hcChibG9jay5jaHVua0dyb3VwLCAoY2c6IGFueSkgPT4gY2cubmFtZSkuZmlsdGVyKG5hbWUgPT4gbmFtZSkuam9pbignLCAnKTtcbiAgICAgICAgICBsb2cuaW5mbyhg4pSCICAgIOKUgiAg4pSCICDilJzilIAgKGJsb2NrICR7YmxvY2suY29uc3RydWN0b3IubmFtZX0pOiBjaHVuayBncm91cCAoJHtjYWNoZUdyb3Vwc30pYCk7XG4gICAgICAgICAgaWYgKHNob3dEZXBlbmRlbmN5IHx8IChwayAmJiAocGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rKSkpIHtcbiAgICAgICAgICAgIF8uZWFjaChibG9jay5kZXBlbmRlbmNpZXMsIChiRGVwOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgbG9nRC5pbmZvKGDilIIgICAg4pSCICDilIIgIOKUgiAg4pSc4pSAICR7YkRlcC5jb25zdHJ1Y3Rvci5uYW1lfWApO1xuICAgICAgICAgICAgICBpZiAoYkRlcC5tb2R1bGUpXG4gICAgICAgICAgICAgICAgbG9nRC5pbmZvKGDilIIgICAg4pSCICDilIIgIOKUgiAg4pSCICDilJzilIAgLm1vZHVsZSAke3NlbGYubW9kdWxlRmlsZU5hbWUoYkRlcC5tb2R1bGUpfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNob3dEZXBlbmRlbmN5KSB7XG4gICAgICAgICAgXy5lYWNoKG1vZHVsZS5kZXBlbmRlbmNpZXMsIChkZXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IG1vZHVsZS5fc291cmNlLnNvdXJjZSgpO1xuICAgICAgICAgICAgbG9nRC5kZWJ1Zygn4pSCICAgIOKUgiAg4pSCICDilJzilIAgJXMnLCBjaGFsay5ibHVlKCcoZGVwZW5kZW5jeSAlcyk6ICcgKyBkZXAuY29uc3RydWN0b3IubmFtZSksXG4gICAgICAgICAgICAgIGRlcC5yYW5nZSA/IHNvdXJjZS5zdWJzdHJpbmcoZGVwLnJhbmdlWzBdLCBkZXAucmFuZ2VbMV0pIDogJycpO1xuICAgICAgICAgICAgaWYgKGRlcC5tb2R1bGUpXG4gICAgICAgICAgICAgIGxvZ0QuZGVidWcoYOKUgiAgICDilIIgIOKUgiAg4pSCICDilJzilIAgLm1vZHVsZSAke2NoYWxrLmJsdWUoc2VsZi5tb2R1bGVGaWxlTmFtZShkZXAubW9kdWxlKSl9YCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgbG9nLmluZm8oJ+KUgiAgICDilIIgICcpO1xuXG4gICAgICAvLyBFeHBsb3JlIGVhY2ggYXNzZXQgZmlsZW5hbWUgZ2VuZXJhdGVkIGJ5IHRoZSBjaHVuazpcbiAgICAgIGNodW5rLmZpbGVzLmZvckVhY2goZnVuY3Rpb24oZmlsZW5hbWU6IHN0cmluZykge1xuICAgICAgICBsb2cuaW5mbygn4pSCICAgIOKUnOKUgOKUgCBmaWxlOiAlcycsIGZpbGVuYW1lKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgbW9kdWxlRmlsZU5hbWUobTogYW55KSB7XG4gICAgY29uc3QgZmlsZU5hbWUgPSBtLm5hbWVGb3JDb25kaXRpb24gPyBtLm5hbWVGb3JDb25kaXRpb24oKSA6IChtLmlkZW50aWZpZXIoKSB8fCBtLm5hbWUpLnNwbGl0KCchJykuc2xpY2UoKS5wb3AoKTtcbiAgICAvLyByZXR1cm4gUGF0aC5yZWxhdGl2ZSh0aGlzLmNvbXBpbGVyLm9wdGlvbnMuY29udGV4dCwgKG0uaWRlbnRpZmllcigpIHx8IG0ubmFtZSkuc3BsaXQoJyEnKS5zbGljZSgpLnBvcCgpKTtcbiAgICByZXR1cm4gUGF0aC5yZWxhdGl2ZSh0aGlzLmNvbXBpbGVyLm9wdGlvbnMuY29udGV4dCwgZmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0Q2h1bmtOYW1lKGNodW5rOiBhbnkpIHtcbiAgICB2YXIgaWQgPSBjaHVuay5kZWJ1Z0lkO1xuICAgIGlmIChjaHVuay5pZClcbiAgICAgIGlkID0gY2h1bmsuaWQgKyAnLScgKyBjaHVuay5kZWJ1Z0lkO1xuICAgIHJldHVybiAnIycgKyBpZCArICcgJyArIGNoYWxrLmdyZWVuKGNodW5rLm5hbWUgfHwgJycpO1xuICB9XG5cbiAgcHJpbnRDaHVua3NCeUVudHJ5KGNvbXBpbGF0aW9uOiBhbnkpIHtcbiAgICBsb2cuaW5mbygnRW50cnlwb2ludCBjaHVuayB0cmVlOicpO1xuICAgIF8uZWFjaChjb21waWxhdGlvbi5lbnRyeXBvaW50cywgKGVudHJ5cG9pbnQ6IGFueSwgbmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICBsb2cuaW5mbygnZW50cnlwb2ludCAlcycsIGNoYWxrLmdyZWVuKG5hbWUpKTtcbiAgICAgIF8uZWFjaChlbnRyeXBvaW50LmNodW5rcywgKGNodW5rOiBhbnkpID0+IGxvZy5pbmZvKCcgIOKUnOKUgCAlcycsIGNodW5rLmZpbGVzWzBdKSk7XG4gICAgfSk7XG4gIH1cblxufVxuIl19