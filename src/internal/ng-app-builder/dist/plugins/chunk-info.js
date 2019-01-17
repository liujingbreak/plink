"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console max-line-length */
const log = require('log4js').getLogger('ChunkInfoPlugin');
const logFd = log;
const logD = log;
const chalk = require('chalk');
const showDependency = false;
const showFileDep = false;
const { cyan, green } = require('chalk');
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const __api_1 = tslib_1.__importDefault(require("__api"));
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2NodW5rLWluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0NBQStDO0FBQy9DLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMzRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDbEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDO0FBQ2pCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFDN0IsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBQzFCLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZDLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0IsMERBQXdCO0FBQ3hCLE1BQXFCLGVBQWU7SUFBcEM7UUFFQyxTQUFJLEdBQUcsS0FBSyxDQUFDO0lBbUdkLENBQUM7SUFqR0EsS0FBSyxDQUFDLFFBQWE7UUFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFdBQWdCLEVBQUUsRUFBRTtZQUN0RSxJQUFJLElBQUksQ0FBQyxJQUFJO2dCQUNaLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFD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SyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEYsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBRUQ7QUFyR0Qsa0NBcUdDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3BsdWdpbnMvY2h1bmstaW5mby5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoICovXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0NodW5rSW5mb1BsdWdpbicpO1xuY29uc3QgbG9nRmQgPSBsb2c7XG5jb25zdCBsb2dEID0gbG9nO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qgc2hvd0RlcGVuZGVuY3kgPSBmYWxzZTtcbmNvbnN0IHNob3dGaWxlRGVwID0gZmFsc2U7XG5jb25zdCB7Y3lhbiwgZ3JlZW59ID0gcmVxdWlyZSgnY2hhbGsnKTtcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENodW5rSW5mb1BsdWdpbiB7XG5cdGNvbXBpbGVyOiBhbnk7XG5cdGRvbmUgPSBmYWxzZTtcblxuXHRhcHBseShjb21waWxlcjogYW55KSB7XG5cdFx0bG9nLmluZm8oJy0tLS0tIENodW5rSW5mb1BsdWdpbiAtLS0tLScpO1xuXHRcdHRoaXMuY29tcGlsZXIgPSBjb21waWxlcjtcblx0XHRjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ0NodW5rSW5mb1BsdWdpbicsIChjb21waWxhdGlvbjogYW55KSA9PiB7XG5cdFx0XHRpZiAodGhpcy5kb25lKVxuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cdFx0XHR0aGlzLmRvbmUgPSB0cnVlO1xuXHRcdFx0bG9nLmluZm8oXy5wYWQoJyBlbWl0ICcsIDQwLCAnLScpKTtcblx0XHRcdHJldHVybiB0aGlzLnByaW50Q2h1bmtHcm91cHMoY29tcGlsYXRpb24pO1xuXHRcdH0pO1xuXHR9XG5cblx0YXN5bmMgcHJpbnRDaHVua0dyb3Vwcyhjb21waWxhdGlvbjogYW55KSB7XG5cdFx0Zm9yIChjb25zdCBjZyBvZiBjb21waWxhdGlvbi5jaHVua0dyb3Vwcykge1xuXHRcdFx0Ly8gbG9nLmluZm8oJ05hbWVkIGNodW5rIGdyb3VwczogJyArIGNvbXBpbGF0aW9uLm5hbWVkQ2h1bmtHcm91cHMua2V5cygpLmpvaW4oJywgJykpO1xuXHRcdFx0Ly8gbG9nLmluZm8oJ2VudHJ5cG9pbnRzOiAnICsgY29tcGlsYXRpb24uZW50cnlwb2ludHMua2V5cygpLmpvaW4oJywgJykpO1xuXHRcdFx0bG9nLmluZm8oJycpO1xuXHRcdFx0bG9nLmluZm8oYENodW5rIGdyb3VwOiAke2N5YW4oY2cubmFtZSB8fCBjZy5pZCl9YCk7XG5cdFx0XHRsb2cuaW5mbygn4pSc4pSAICBjaGlsZHJlbjogKCVzKScsIGNnLmdldENoaWxkcmVuKCkubWFwKChjazogYW55KSA9PiBncmVlbih0aGlzLmdldENodW5rTmFtZShjaykpKS5qb2luKCcsICcpKTtcblx0XHRcdGxvZy5pbmZvKGDilJzilIAgIHBhcmVudHM6ICR7Y2cuZ2V0UGFyZW50cygpLm1hcCgoY2s6IGFueSkgPT4gZ3JlZW4odGhpcy5nZXRDaHVua05hbWUoY2spKSkuam9pbignLCAnKX1gKTtcblx0XHRcdHRoaXMucHJpbnRDaHVua3MoY2cuY2h1bmtzLCBjb21waWxhdGlvbik7XG5cdFx0fVxuXHRcdHRoaXMucHJpbnRDaHVua3NCeUVudHJ5KGNvbXBpbGF0aW9uKTtcblx0fVxuXG5cdHByaW50Q2h1bmtzKGNodW5rczogYW55LCBjb21waWxhdGlvbjogYW55KSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdGNodW5rcy5mb3JFYWNoKChjaHVuazogYW55KSA9PiB7XG5cdFx0XHRsb2cuaW5mbygn4pSc4pSAICBjaHVuazogJXMsIGlzT25seUluaXRpYWw6ICVzLCBpZHM6ICVzJyxcblx0XHRcdFx0dGhpcy5nZXRDaHVua05hbWUoY2h1bmspLFxuXHRcdFx0XHQvLyBjaHVuay5wYXJlbnRzLm1hcCgocDogYW55KSA9PiB0aGlzLmdldENodW5rTmFtZShwKSkuam9pbignLCAnKSxcblx0XHRcdFx0Y2h1bmsuaXNPbmx5SW5pdGlhbCgpLCBjaHVuay5pZHMpO1xuXHRcdFx0Ly8gbG9nLmluZm8oJ1xcdGNoaWxkcmVuOiAoJXMpJywgY2h1bmsuY2h1bmtzLm1hcCgoY2s6IGFueSkgPT4gdGhpcy5nZXRDaHVua05hbWUoY2spKS5qb2luKCcsICcpKTtcblx0XHRcdGxvZy5pbmZvKCfilIIgICAg4pSc4pSAICVzICVzJywgY2h1bmsuaGFzUnVudGltZSgpID8gJyhoYXMgcnVudGltZSknIDogJycsIGNodW5rLmhhc0VudHJ5TW9kdWxlKCkgPyBgKGhhcyBlbnRyeU1vZHVsZTogJHt0aGlzLm1vZHVsZUZpbGVOYW1lKGNodW5rLmVudHJ5TW9kdWxlKX0pYCA6ICcnKTtcblxuXHRcdFx0bG9nLmluZm8oYOKUgiAgICDilJzilIAgJHtncmVlbignbW9kdWxlcycpfWApO1xuXHRcdFx0KGNodW5rLmdldE1vZHVsZXMgPyBjaHVuay5nZXRNb2R1bGVzKCkgOiBjaHVuay5tb2R1bGVzKS5mb3JFYWNoKChtb2R1bGU6IGFueSkgPT4ge1xuXHRcdFx0XHQvLyBFeHBsb3JlIGVhY2ggc291cmNlIGZpbGUgcGF0aCB0aGF0IHdhcyBpbmNsdWRlZCBpbnRvIHRoZSBtb2R1bGU6XG5cdFx0XHRcdGNvbnN0IG1vZHVsZU5hbWUgPSB0aGlzLm1vZHVsZUZpbGVOYW1lKG1vZHVsZSk7XG5cdFx0XHRcdGxvZy5pbmZvKCfilIIgICAg4pSCICDilJzilIAgJXMnLCBtb2R1bGVOYW1lKTtcblx0XHRcdFx0Y29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoUGF0aC5yZXNvbHZlKHRoaXMuY29tcGlsZXIub3B0aW9ucy5jb250ZXh0LCBtb2R1bGVOYW1lKSk7XG5cdFx0XHRcdGlmIChtb2R1bGUuYnVpbGRJbmZvLmZpbGVEZXBlbmRlbmNpZXMgJiYgKHNob3dGaWxlRGVwIHx8IChwayAmJiBway5kciAmJiBtb2R1bGUuYnVpbGRJbmZvLmZpbGVEZXBlbmRlbmNpZXMpKSkge1xuXHRcdFx0XHRcdGZvciAoY29uc3QgZmlsZXBhdGggb2YgbW9kdWxlLmJ1aWxkSW5mby5maWxlRGVwZW5kZW5jaWVzKSB7XG5cdFx0XHRcdFx0XHRsb2dGZC5pbmZvKCfilIIgICAg4pSCICDilIIgIOKUnOKUgCAlcycsIGNoYWxrLmJsdWUoJyhmaWxlRGVwZW5kZW5jeSk6ICcgKyBQYXRoLnJlbGF0aXZlKHRoaXMuY29tcGlsZXIub3B0aW9ucy5jb250ZXh0LCBmaWxlcGF0aCkpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Xy5lYWNoKG1vZHVsZS5ibG9ja3MsIChibG9jazogYW55KSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgY2FjaGVHcm91cHMgPSBfLm1hcChibG9jay5jaHVua0dyb3VwLCAoY2c6IGFueSkgPT4gY2cubmFtZSkuZmlsdGVyKG5hbWUgPT4gbmFtZSkuam9pbignLCAnKTtcblx0XHRcdFx0XHRsb2cuaW5mbyhg4pSCICAgIOKUgiAg4pSCICDilJzilIAgKGJsb2NrICR7YmxvY2suY29uc3RydWN0b3IubmFtZX0pOiBjaHVuayBncm91cCAoJHtjYWNoZUdyb3Vwc30pYCk7XG5cdFx0XHRcdFx0aWYgKHNob3dEZXBlbmRlbmN5IHx8IChwayAmJiBway5kcikpIHtcblx0XHRcdFx0XHRcdF8uZWFjaChibG9jay5kZXBlbmRlbmNpZXMsIChiRGVwOiBhbnkpID0+IHtcblx0XHRcdFx0XHRcdFx0bG9nRC5pbmZvKGDilIIgICAg4pSCICDilIIgIOKUgiAg4pSc4pSAICR7YkRlcC5jb25zdHJ1Y3Rvci5uYW1lfWApO1xuXHRcdFx0XHRcdFx0XHRpZiAoYkRlcC5tb2R1bGUpXG5cdFx0XHRcdFx0XHRcdFx0bG9nRC5pbmZvKGDilIIgICAg4pSCICDilIIgIOKUgiAg4pSCICDilJzilIAgLm1vZHVsZSAke3NlbGYubW9kdWxlRmlsZU5hbWUoYkRlcC5tb2R1bGUpfWApO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0aWYgKHNob3dEZXBlbmRlbmN5KSB7XG5cdFx0XHRcdFx0Xy5lYWNoKG1vZHVsZS5kZXBlbmRlbmNpZXMsIChkZXA6IGFueSkgPT4ge1xuXHRcdFx0XHRcdFx0dmFyIHNvdXJjZSA9IG1vZHVsZS5fc291cmNlLnNvdXJjZSgpO1xuXHRcdFx0XHRcdFx0bG9nRC5kZWJ1Zygn4pSCICAgIOKUgiAg4pSCICDilJzilIAgJXMnLCBjaGFsay5ibHVlKCcoZGVwZW5kZW5jeSAlcyk6ICcgKyBkZXAuY29uc3RydWN0b3IubmFtZSksXG5cdFx0XHRcdFx0XHRcdGRlcC5yYW5nZSA/IHNvdXJjZS5zdWJzdHJpbmcoZGVwLnJhbmdlWzBdLCBkZXAucmFuZ2VbMV0pIDogJycpO1xuXHRcdFx0XHRcdFx0aWYgKGRlcC5tb2R1bGUpXG5cdFx0XHRcdFx0XHRcdGxvZ0QuZGVidWcoYOKUgiAgICDilIIgIOKUgiAg4pSCICDilJzilIAgLm1vZHVsZSAke2NoYWxrLmJsdWUoc2VsZi5tb2R1bGVGaWxlTmFtZShkZXAubW9kdWxlKSl9YCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0bG9nLmluZm8oJ+KUgiAgICDilIIgICcpO1xuXG5cdFx0XHQvLyBFeHBsb3JlIGVhY2ggYXNzZXQgZmlsZW5hbWUgZ2VuZXJhdGVkIGJ5IHRoZSBjaHVuazpcblx0XHRcdGNodW5rLmZpbGVzLmZvckVhY2goZnVuY3Rpb24oZmlsZW5hbWU6IHN0cmluZykge1xuXHRcdFx0XHRsb2cuaW5mbygn4pSCICAgIOKUnOKUgOKUgCBmaWxlOiAlcycsIGZpbGVuYW1lKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0bW9kdWxlRmlsZU5hbWUobTogYW55KSB7XG5cdFx0Y29uc3QgZmlsZU5hbWUgPSBtLm5hbWVGb3JDb25kaXRpb24gPyBtLm5hbWVGb3JDb25kaXRpb24oKSA6IChtLmlkZW50aWZpZXIoKSB8fCBtLm5hbWUpLnNwbGl0KCchJykuc2xpY2UoKS5wb3AoKTtcblx0XHQvLyByZXR1cm4gUGF0aC5yZWxhdGl2ZSh0aGlzLmNvbXBpbGVyLm9wdGlvbnMuY29udGV4dCwgKG0uaWRlbnRpZmllcigpIHx8IG0ubmFtZSkuc3BsaXQoJyEnKS5zbGljZSgpLnBvcCgpKTtcblx0XHRyZXR1cm4gUGF0aC5yZWxhdGl2ZSh0aGlzLmNvbXBpbGVyLm9wdGlvbnMuY29udGV4dCwgZmlsZU5hbWUpO1xuXHR9XG5cblx0Z2V0Q2h1bmtOYW1lKGNodW5rOiBhbnkpIHtcblx0XHR2YXIgaWQgPSBjaHVuay5kZWJ1Z0lkO1xuXHRcdGlmIChjaHVuay5pZClcblx0XHRcdGlkID0gY2h1bmsuaWQgKyAnLScgKyBjaHVuay5kZWJ1Z0lkO1xuXHRcdHJldHVybiAnIycgKyBpZCArICcgJyArIGNoYWxrLmdyZWVuKGNodW5rLm5hbWUgfHwgJycpO1xuXHR9XG5cblx0cHJpbnRDaHVua3NCeUVudHJ5KGNvbXBpbGF0aW9uOiBhbnkpIHtcblx0XHRsb2cuaW5mbygnRW50cnlwb2ludCBjaHVuayB0cmVlOicpO1xuXHRcdF8uZWFjaChjb21waWxhdGlvbi5lbnRyeXBvaW50cywgKGVudHJ5cG9pbnQ6IGFueSwgbmFtZTogc3RyaW5nKSA9PiB7XG5cdFx0XHRsb2cuaW5mbygnZW50cnlwb2ludCAlcycsIGNoYWxrLmdyZWVuKG5hbWUpKTtcblx0XHRcdF8uZWFjaChlbnRyeXBvaW50LmNodW5rcywgKGNodW5rOiBhbnkpID0+IGxvZy5pbmZvKCcgIOKUnOKUgCAlcycsIGNodW5rLmZpbGVzWzBdKSk7XG5cdFx0fSk7XG5cdH1cblxufVxuIl19
