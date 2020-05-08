#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require('source-map-support/register');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvanNvbi1zY2hlbWEtZ2VuL3RzL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQ0EsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDdkMseUNBQWtDO0FBQ2xDLDJFQUFpQztBQUNqQyx3REFBd0I7QUFDeEIscURBQStCO0FBQy9CLDBEQUFrRTtBQUNsRSw0REFBNEI7QUFFNUIsb0VBQThDO0FBQzlDLDJHQUF1RTtBQUN2RSx3REFBd0I7QUFDeEIsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFFbEUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFzQixDQUFDO0FBQzlFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0FBRWxFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdEMsbUJBQU8sQ0FBQyxPQUFPLENBQUMsc0JBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7S0FDaEQsV0FBVyxDQUFDLDJDQUEyQztJQUN4RCw2SEFBNkgsQ0FBQztLQUM3SCxTQUFTLENBQUMsZUFBZSxDQUFDO0tBQzFCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzdCLG1CQUFPLENBQUMsTUFBTSxDQUFDLDRCQUE0QixFQUN6Qyx1RkFBdUYsRUFDdkYsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQWMsQ0FBQyxDQUFDO0FBQ3JELG1CQUFPLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxFQUM3RCw4SUFBOEksRUFDOUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQWMs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LENBQUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL2pzb24tc2NoZW1hLWdlbi9kaXN0L2NsaS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3RlcicpO1xuaW1wb3J0IHtwcm9ncmFtfSBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHBrIGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7Z2V0VHNEaXJzT2ZQYWNrYWdlfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBUSlMgZnJvbSAndHlwZXNjcmlwdC1qc29uLXNjaGVtYSc7XG5pbXBvcnQgU2VsZWN0b3IgZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5jb25zdCBiYXNlVHNjb25maWcgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL3RzY29uZmlnLmpzb24nKTtcblxuY29uc3QgY2ZnID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvY29uZmlnLmpzJykgYXMgdHlwZW9mIGFwaS5jb25maWc7XG5jb25zdCBsb2dDb25maWcgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9sb2dDb25maWcuanMnKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihway5uYW1lKTtcblxucHJvZ3JhbS52ZXJzaW9uKHBrLnZlcnNpb24pLm5hbWUoJ2pzb24tc2NoZW1hLWdlbicpXG4gIC5kZXNjcmlwdGlvbignU2NhbiBwYWNrYWdlcyBhbmQgZ2VuZXJhdGUganNvbiBzY2hlbWEuXFxuJyArXG4gICdZb3UgcGFja2FnZS5qc29uIGZpbGUgbXVzdCBjb250YWluczpcXG4gIFwiZHJcIjoge2pzb25TY2hlbWE6IFwiPGludGVyZmFjZSBmaWxlcyB3aG9zZSBwYXRoIGlzIHJlbGF0aXZlIHRvIHBhY2thZ2UgZGlyZWN0b3J5PlwifScpXG4gIC5hcmd1bWVudHMoJ1suLi5wYWNrYWdlc10nKVxuICAucGFzc0NvbW1hbmRUb0FjdGlvbih0cnVlKTtcbnByb2dyYW0ub3B0aW9uKCctYywgLS1jb25maWcgPGNvbmZpZy1maWxlPicsXG4gICdSZWFkIGNvbmZpZyBmaWxlcywgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGZpbGVzLCB0aGUgbGF0dGVyIG9uZSBvdmVycmlkZXMgcHJldmlvdXMgb25lJyxcbiAgKGN1cnIsIHByZXYpID0+IHByZXYuY29uY2F0KGN1cnIpLCBbXSBhcyBzdHJpbmdbXSk7XG5wcm9ncmFtLm9wdGlvbignLS1wcm9wIDxwcm9wZXJ0eS1wYXRoPXZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPicsXG4gICc8cHJvcGVydHktcGF0aD49PHZhbHVlIGFzIEpTT04gfCBsaXRlcmFsPiAuLi4gZGlyZWN0bHkgc2V0IGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcywgcHJvcGVydHkgbmFtZSBpcyBsb2Rhc2guc2V0KCkgcGF0aC1saWtlIHN0cmluZ1xcbiBlLmcuXFxuJyxcbiAgKGN1cnIsIHByZXYpID0+IHByZXYuY29uY2F0KGN1cnIpLCBbXSBhcyBzdHJpbmdbXSk7XG5cbnByb2dyYW0uYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgY29uc3QgZG9uZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICBhd2FpdCBjZmcuaW5pdCh7XG4gICAgYzogKHByb2dyYW0ub3B0cygpLmNvbmZpZyBhcyBzdHJpbmdbXSkubGVuZ3RoID09PSAwID8gdW5kZWZpbmVkIDogcHJvZ3JhbS5vcHRzKCkuY29uZmlnLFxuICAgIHByb3A6IChwcm9ncmFtLm9wdHMoKS5wcm9wIGFzIHN0cmluZ1tdKVxuICB9KTtcbiAgbG9nQ29uZmlnKGNmZygpKTtcblxuICBsb2cuaW5mbyhwcm9ncmFtLmFyZ3MpO1xuICBjb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuXG4gIGNvbnN0IHBhY2thZ2VzID0gcHJvZ3JhbS5hcmdzO1xuICBpZiAocGFja2FnZXMgJiYgcGFja2FnZXMubGVuZ3RoID4gMClcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKHBhY2thZ2VzLCBvbkNvbXBvbmVudCwgJ3NyYycpO1xuICAvLyBlbHNlIGlmIChhcmd2LnByb2plY3QgJiYgYXJndi5wcm9qZWN0Lmxlbmd0aCA+IDApIHtcbiAgLy8gICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJywgYXJndi5wcm9qZWN0KTtcbiAgLy8gfVxuICBlbHNlXG4gICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhvbkNvbXBvbmVudCwgJ3NyYycpO1xuXG4gIGZ1bmN0aW9uIG9uQ29tcG9uZW50KG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHN0cmluZywganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG4gICAgZG9uZXMucHVzaChuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBkaXJzID0gZ2V0VHNEaXJzT2ZQYWNrYWdlKGpzb24pO1xuXG4gICAgICBpZiAoanNvbi5kciAmJiBqc29uLmRyLmpzb25TY2hlbWEpIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hU3JjRGlyID1qc29uLmRyLmpzb25TY2hlbWEgYXMgc3RyaW5nO1xuICAgICAgICBsb2cuaW5mbyhgcGFja2FnZSAke25hbWV9IGhhcyBKU09OIHNjaGVtYTogJHtzY2hlbWFTcmNEaXJ9YCk7XG4gICAgICAgIC8vIHBhY2thZ2VQYXRoID0gZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKTtcblxuICAgICAgICBnbG9iKHNjaGVtYVNyY0Rpciwge2N3ZDogcGFja2FnZVBhdGh9LCAoZXJyLCBtYXRjaGVzKSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oJ0ZvdW5kIHNjaGVtYSBzb3VyY2UnLCBtYXRjaGVzKTtcblxuICAgICAgICAgIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogVEpTLkNvbXBpbGVyT3B0aW9ucyA9IHsuLi5iYXNlVHNjb25maWcuY29tcGlsZXJPcHRpb25zLCByb290RGlyOiBwYWNrYWdlUGF0aH07XG5cbiAgICAgICAgICBjb25zdCB0anNQZ20gPSBUSlMuZ2V0UHJvZ3JhbUZyb21GaWxlcyhtYXRjaGVzLm1hcChwYXRoID0+IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgcGF0aCkpLCBjb21waWxlck9wdGlvbnMsIHBhY2thZ2VQYXRoKTtcbiAgICAgICAgICBjb25zdCBnZW5lcmF0b3IgPSBUSlMuYnVpbGRHZW5lcmF0b3IodGpzUGdtLCB7fSk7XG4gICAgICAgICAgY29uc3Qgc3ltYm9sczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGZpbGVuYW1lIG9mIG1hdGNoZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHRzRmlsZSA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZmlsZW5hbWUpO1xuICAgICAgICAgICAgY29uc3QgYXN0UXVlcnkgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKHRzRmlsZSwgJ3V0ZjgnKSwgdHNGaWxlKTtcbiAgICAgICAgICAgIHN5bWJvbHMucHVzaCguLi5hc3RRdWVyeS5maW5kQWxsKCc6U291cmNlRmlsZT4uc3RhdGVtZW50czpJbnRlcmZhY2VEZWNsYXJhdGlvbj4ubmFtZTpJZGVudGlmaWVyJykubWFwKGFzdCA9PiBhc3QuZ2V0VGV4dCgpKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChnZW5lcmF0b3IpIHtcbiAgICAgICAgICAgIGNvbnN0IG91dHB1dDogYW55ID0ge307XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHN5YiBvZiBzeW1ib2xzKSB7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdTY2hlbWEgZm9yICcsIHN5Yik7XG4gICAgICAgICAgICAgIG91dHB1dFtzeWJdID0gZ2VuZXJhdG9yLmdldFNjaGVtYUZvclN5bWJvbChzeWIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgb3V0RmlsZSA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZGlycy5pc29tRGlyLCAnanNvbi1zY2hlbWEuanNvbicpO1xuICAgICAgICAgICAgZnMubWtkaXJwU3luYyhQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGRpcnMuaXNvbURpcikpO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKFxuICAgICAgICAgICAgICBvdXRGaWxlLFxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShvdXRwdXQsIG51bGwsICcgICcpLFxuICAgICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygnIHdyaXR0ZW4gdG8gJyArIG91dEZpbGUpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICB9XG4gICAgfSkpO1xuICB9XG4gIGF3YWl0IFByb21pc2UuYWxsKGRvbmVzKTtcbn0pO1xuXG5wcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KTtcblxuXG4iXX0=
