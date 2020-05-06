#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const package_json_1 = tslib_1.__importDefault(require("../package.json"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs = tslib_1.__importStar(require("fs-extra"));
const utils_1 = require("dr-comp-package/wfh/dist/utils");
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const TJS = tslib_1.__importStar(require("typescript-json-schema"));
const ts_ast_query_1 = tslib_1.__importDefault(require("@dr-core/ng-app-builder/dist/utils/ts-ast-query"));
const glob_1 = tslib_1.__importDefault(require("glob"));
const baseTsconfig = require('dr-comp-package/wfh/tsconfig.json');
const cfg = require('dr-comp-package/wfh/lib/config.js');
const logConfig = require('dr-comp-package/wfh/lib/logConfig.js');
const log = log4js_1.default.getLogger(package_json_1.default.name);
commander_1.program.version(package_json_1.default.version).name('json-schema-gen')
    .description('Scan packages and generate json schema.\n' +
    'You package.json file must contains:\n  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}')
    .arguments('[...packages]')
    .passCommandToAction(true);
commander_1.program.option('-c, --config <config-file>', 'Read config files, if there are multiple files, the latter one overrides previous one', (curr, prev) => prev.concat(curr), []);
commander_1.program.option('--prop <property-path=value as JSON | literal>', '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n', (curr, prev) => prev.concat(curr), []);
commander_1.program.action(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
    const dones = [];
    yield cfg.init({
        c: commander_1.program.opts().config.length === 0 ? undefined : commander_1.program.opts().config,
        prop: commander_1.program.opts().prop
    });
    logConfig(cfg());
    log.info(commander_1.program.args);
    const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
    const packages = commander_1.program.args;
    if (packages && packages.length > 0)
        packageUtils.findAllPackages(packages, onComponent, 'src');
    // else if (argv.project && argv.project.length > 0) {
    //   packageUtils.findAllPackages(onComponent, 'src', argv.project);
    // }
    else
        packageUtils.findAllPackages(onComponent, 'src');
    function onComponent(name, entryPath, parsedName, json, packagePath) {
        dones.push(new Promise((resolve, reject) => {
            const dirs = utils_1.getTsDirsOfPackage(json);
            if (json.dr && json.dr.jsonSchema) {
                const schemaSrcDir = json.dr.jsonSchema;
                log.info(`package ${name} has JSON schema: ${schemaSrcDir}`);
                // packagePath = fs.realpathSync(packagePath);
                glob_1.default(schemaSrcDir, { cwd: packagePath }, (err, matches) => {
                    log.info('Found schema source', matches);
                    const compilerOptions = Object.assign({}, baseTsconfig.compilerOptions, { rootDir: packagePath });
                    const tjsPgm = TJS.getProgramFromFiles(matches.map(path => path_1.default.resolve(packagePath, path)), compilerOptions, packagePath);
                    const generator = TJS.buildGenerator(tjsPgm, {});
                    const symbols = [];
                    for (const filename of matches) {
                        const tsFile = path_1.default.resolve(packagePath, filename);
                        const astQuery = new ts_ast_query_1.default(fs.readFileSync(tsFile, 'utf8'), tsFile);
                        symbols.push(...astQuery.findAll(':SourceFile>.statements:InterfaceDeclaration>.name:Identifier').map(ast => ast.getText()));
                    }
                    if (generator) {
                        const output = {};
                        for (const syb of symbols) {
                            log.info('Schema for ', syb);
                            output[syb] = generator.getSchemaForSymbol(syb);
                        }
                        const outFile = path_1.default.resolve(packagePath, dirs.isomDir, 'json-schema.json');
                        fs.mkdirpSync(path_1.default.resolve(packagePath, dirs.isomDir));
                        fs.writeFile(outFile, JSON.stringify(output, null, '  '), (err) => {
                            if (err)
                                return reject(err);
                            log.info(' written to ' + outFile);
                            resolve();
                        });
                    }
                });
            }
        }));
    }
    yield Promise.all(dones);
}));
commander_1.program.parseAsync(process.argv);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvanNvbi1zY2hlbWEtZ2VuL3RzL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQ0EseUNBQWtDO0FBQ2xDLDJFQUFpQztBQUNqQyx3REFBd0I7QUFDeEIscURBQStCO0FBQy9CLDBEQUFrRTtBQUNsRSw0REFBNEI7QUFFNUIsb0VBQThDO0FBQzlDLDJHQUF1RTtBQUN2RSx3REFBd0I7QUFDeEIsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFFbEUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFzQixDQUFDO0FBQzlFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0FBRWxFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdEMsbUJBQU8sQ0FBQyxPQUFPLENBQUMsc0JBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7S0FDaEQsV0FBVyxDQUFDLDJDQUEyQztJQUN4RCw2SEFBNkgsQ0FBQztLQUM3SCxTQUFTLENBQUMsZUFBZSxDQUFDO0tBQzFCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzdCLG1CQUFPLENBQUMsTUFBTSxDQUFDLDRCQUE0QixFQUN6Qyx1RkFBdUYsRUFDdkYsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQWMsQ0FBQyxDQUFDO0FBQ3JELG1CQUFPLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxFQUM3RCw4SUFBOEksRUFDOUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQWMsQ0FBQyxDQUFDO0FBRXJELG1CQUFPLENBQUMsTUFBTSxD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QGJrL2pzb24tc2NoZW1hLWdlbi9kaXN0L2NsaS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCB7cHJvZ3JhbX0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBwayBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2dldFRzRGlyc09mUGFja2FnZX0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgVEpTIGZyb20gJ3R5cGVzY3JpcHQtanNvbi1zY2hlbWEnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuY29uc3QgYmFzZVRzY29uZmlnID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC90c2NvbmZpZy5qc29uJyk7XG5cbmNvbnN0IGNmZyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL2NvbmZpZy5qcycpIGFzIHR5cGVvZiBhcGkuY29uZmlnO1xuY29uc3QgbG9nQ29uZmlnID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvbG9nQ29uZmlnLmpzJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIocGsubmFtZSk7XG5cbnByb2dyYW0udmVyc2lvbihway52ZXJzaW9uKS5uYW1lKCdqc29uLXNjaGVtYS1nZW4nKVxuICAuZGVzY3JpcHRpb24oJ1NjYW4gcGFja2FnZXMgYW5kIGdlbmVyYXRlIGpzb24gc2NoZW1hLlxcbicgK1xuICAnWW91IHBhY2thZ2UuanNvbiBmaWxlIG11c3QgY29udGFpbnM6XFxuICBcImRyXCI6IHtqc29uU2NoZW1hOiBcIjxpbnRlcmZhY2UgZmlsZXMgd2hvc2UgcGF0aCBpcyByZWxhdGl2ZSB0byBwYWNrYWdlIGRpcmVjdG9yeT5cIn0nKVxuICAuYXJndW1lbnRzKCdbLi4ucGFja2FnZXNdJylcbiAgLnBhc3NDb21tYW5kVG9BY3Rpb24odHJ1ZSk7XG5wcm9ncmFtLm9wdGlvbignLWMsIC0tY29uZmlnIDxjb25maWctZmlsZT4nLFxuICAnUmVhZCBjb25maWcgZmlsZXMsIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBmaWxlcywgdGhlIGxhdHRlciBvbmUgb3ZlcnJpZGVzIHByZXZpb3VzIG9uZScsXG4gIChjdXJyLCBwcmV2KSA9PiBwcmV2LmNvbmNhdChjdXJyKSwgW10gYXMgc3RyaW5nW10pO1xucHJvZ3JhbS5vcHRpb24oJy0tcHJvcCA8cHJvcGVydHktcGF0aD12YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4nLFxuICAnPHByb3BlcnR5LXBhdGg+PTx2YWx1ZSBhcyBKU09OIHwgbGl0ZXJhbD4gLi4uIGRpcmVjdGx5IHNldCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMsIHByb3BlcnR5IG5hbWUgaXMgbG9kYXNoLnNldCgpIHBhdGgtbGlrZSBzdHJpbmdcXG4gZS5nLlxcbicsXG4gIChjdXJyLCBwcmV2KSA9PiBwcmV2LmNvbmNhdChjdXJyKSwgW10gYXMgc3RyaW5nW10pO1xuXG5wcm9ncmFtLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gIGNvbnN0IGRvbmVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgYXdhaXQgY2ZnLmluaXQoe1xuICAgIGM6IChwcm9ncmFtLm9wdHMoKS5jb25maWcgYXMgc3RyaW5nW10pLmxlbmd0aCA9PT0gMCA/IHVuZGVmaW5lZCA6IHByb2dyYW0ub3B0cygpLmNvbmZpZyxcbiAgICBwcm9wOiAocHJvZ3JhbS5vcHRzKCkucHJvcCBhcyBzdHJpbmdbXSlcbiAgfSk7XG4gIGxvZ0NvbmZpZyhjZmcoKSk7XG5cbiAgbG9nLmluZm8ocHJvZ3JhbS5hcmdzKTtcbiAgY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcblxuICBjb25zdCBwYWNrYWdlcyA9IHByb2dyYW0uYXJncztcbiAgaWYgKHBhY2thZ2VzICYmIHBhY2thZ2VzLmxlbmd0aCA+IDApXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhwYWNrYWdlcywgb25Db21wb25lbnQsICdzcmMnKTtcbiAgLy8gZWxzZSBpZiAoYXJndi5wcm9qZWN0ICYmIGFyZ3YucHJvamVjdC5sZW5ndGggPiAwKSB7XG4gIC8vICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycsIGFyZ3YucHJvamVjdCk7XG4gIC8vIH1cbiAgZWxzZVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnKTtcblxuICBmdW5jdGlvbiBvbkNvbXBvbmVudChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiBzdHJpbmcsIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuICAgIGRvbmVzLnB1c2gobmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgZGlycyA9IGdldFRzRGlyc09mUGFja2FnZShqc29uKTtcblxuICAgICAgaWYgKGpzb24uZHIgJiYganNvbi5kci5qc29uU2NoZW1hKSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYVNyY0RpciA9anNvbi5kci5qc29uU2NoZW1hIGFzIHN0cmluZztcbiAgICAgICAgbG9nLmluZm8oYHBhY2thZ2UgJHtuYW1lfSBoYXMgSlNPTiBzY2hlbWE6ICR7c2NoZW1hU3JjRGlyfWApO1xuICAgICAgICAvLyBwYWNrYWdlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG5cbiAgICAgICAgZ2xvYihzY2hlbWFTcmNEaXIsIHtjd2Q6IHBhY2thZ2VQYXRofSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKCdGb3VuZCBzY2hlbWEgc291cmNlJywgbWF0Y2hlcyk7XG5cbiAgICAgICAgICBjb25zdCBjb21waWxlck9wdGlvbnM6IFRKUy5Db21waWxlck9wdGlvbnMgPSB7Li4uYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucywgcm9vdERpcjogcGFja2FnZVBhdGh9O1xuXG4gICAgICAgICAgY29uc3QgdGpzUGdtID0gVEpTLmdldFByb2dyYW1Gcm9tRmlsZXMobWF0Y2hlcy5tYXAocGF0aCA9PiBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIHBhdGgpKSwgY29tcGlsZXJPcHRpb25zLCBwYWNrYWdlUGF0aCk7XG4gICAgICAgICAgY29uc3QgZ2VuZXJhdG9yID0gVEpTLmJ1aWxkR2VuZXJhdG9yKHRqc1BnbSwge30pO1xuICAgICAgICAgIGNvbnN0IHN5bWJvbHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBmaWxlbmFtZSBvZiBtYXRjaGVzKSB7XG4gICAgICAgICAgICBjb25zdCB0c0ZpbGUgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGZpbGVuYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IGFzdFF1ZXJ5ID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyh0c0ZpbGUsICd1dGY4JyksIHRzRmlsZSk7XG4gICAgICAgICAgICBzeW1ib2xzLnB1c2goLi4uYXN0UXVlcnkuZmluZEFsbCgnOlNvdXJjZUZpbGU+LnN0YXRlbWVudHM6SW50ZXJmYWNlRGVjbGFyYXRpb24+Lm5hbWU6SWRlbnRpZmllcicpLm1hcChhc3QgPT4gYXN0LmdldFRleHQoKSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZ2VuZXJhdG9yKSB7XG4gICAgICAgICAgICBjb25zdCBvdXRwdXQ6IGFueSA9IHt9O1xuICAgICAgICAgICAgZm9yIChjb25zdCBzeWIgb2Ygc3ltYm9scykge1xuICAgICAgICAgICAgICBsb2cuaW5mbygnU2NoZW1hIGZvciAnLCBzeWIpO1xuICAgICAgICAgICAgICBvdXRwdXRbc3liXSA9IGdlbmVyYXRvci5nZXRTY2hlbWFGb3JTeW1ib2woc3liKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG91dEZpbGUgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGRpcnMuaXNvbURpciwgJ2pzb24tc2NoZW1hLmpzb24nKTtcbiAgICAgICAgICAgIGZzLm1rZGlycFN5bmMoUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBkaXJzLmlzb21EaXIpKTtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShcbiAgICAgICAgICAgICAgb3V0RmlsZSxcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkob3V0cHV0LCBudWxsLCAnICAnKSxcbiAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgbG9nLmluZm8oJyB3cml0dGVuIHRvICcgKyBvdXRGaWxlKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuICBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG59KTtcblxucHJvZ3JhbS5wYXJzZUFzeW5jKHByb2Nlc3MuYXJndik7XG5cblxuIl19
