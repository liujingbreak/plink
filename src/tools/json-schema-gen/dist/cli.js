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
commander_1.program.parseAsync(process.argv).catch(e => {
    console.error(e);
    process.exit(1);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvanNvbi1zY2hlbWEtZ2VuL3RzL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQ0EsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDdkMseUNBQWtDO0FBQ2xDLDJFQUFpQztBQUNqQyx3REFBd0I7QUFDeEIscURBQStCO0FBQy9CLDBEQUFrRTtBQUNsRSw0REFBNEI7QUFFNUIsb0VBQThDO0FBQzlDLDJHQUF1RTtBQUN2RSx3REFBd0I7QUFDeEIsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFFbEUsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFzQixDQUFDO0FBQzlFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0FBRWxFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdEMsbUJBQU8sQ0FBQyxPQUFPLENBQUMsc0JBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7S0FDaEQsV0FBVyxDQUFDLDJDQUEyQztJQUN4RCw2SEFBNkgsQ0FBQztLQUM3SCxTQUFTLENBQUMsZUFBZSxDQUFDO0tBQzFCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzdCLG1CQUFPLENBQUMsTUFBTSxDQUFDLDRCQUE0QixFQUN6Qyx1RkFBdUYsRUFDdkYsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQWMsQ0FBQyxDQUFDO0FBQ3JELG1CQUFPLENBQUMsTUFBTSxDQUFDLGdEQUFnRCxFQUM3RCw4SUFBOEksRUFDOUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQWMs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LENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDekMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvanNvbi1zY2hlbWEtZ2VuL2Rpc3QvY2xpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJyk7XG5pbXBvcnQge3Byb2dyYW19IGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgcGsgZnJvbSAnLi4vcGFja2FnZS5qc29uJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtnZXRUc0RpcnNPZlBhY2thZ2V9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIFRKUyBmcm9tICd0eXBlc2NyaXB0LWpzb24tc2NoZW1hJztcbmltcG9ydCBTZWxlY3RvciBmcm9tICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmNvbnN0IGJhc2VUc2NvbmZpZyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvdHNjb25maWcuanNvbicpO1xuXG5jb25zdCBjZmcgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9jb25maWcuanMnKSBhcyB0eXBlb2YgYXBpLmNvbmZpZztcbmNvbnN0IGxvZ0NvbmZpZyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL2xvZ0NvbmZpZy5qcycpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKHBrLm5hbWUpO1xuXG5wcm9ncmFtLnZlcnNpb24ocGsudmVyc2lvbikubmFtZSgnanNvbi1zY2hlbWEtZ2VuJylcbiAgLmRlc2NyaXB0aW9uKCdTY2FuIHBhY2thZ2VzIGFuZCBnZW5lcmF0ZSBqc29uIHNjaGVtYS5cXG4nICtcbiAgJ1lvdSBwYWNrYWdlLmpzb24gZmlsZSBtdXN0IGNvbnRhaW5zOlxcbiAgXCJkclwiOiB7anNvblNjaGVtYTogXCI8aW50ZXJmYWNlIGZpbGVzIHdob3NlIHBhdGggaXMgcmVsYXRpdmUgdG8gcGFja2FnZSBkaXJlY3Rvcnk+XCJ9JylcbiAgLmFyZ3VtZW50cygnWy4uLnBhY2thZ2VzXScpXG4gIC5wYXNzQ29tbWFuZFRvQWN0aW9uKHRydWUpO1xucHJvZ3JhbS5vcHRpb24oJy1jLCAtLWNvbmZpZyA8Y29uZmlnLWZpbGU+JyxcbiAgJ1JlYWQgY29uZmlnIGZpbGVzLCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgZmlsZXMsIHRoZSBsYXR0ZXIgb25lIG92ZXJyaWRlcyBwcmV2aW91cyBvbmUnLFxuICAoY3VyciwgcHJldikgPT4gcHJldi5jb25jYXQoY3VyciksIFtdIGFzIHN0cmluZ1tdKTtcbnByb2dyYW0ub3B0aW9uKCctLXByb3AgPHByb3BlcnR5LXBhdGg9dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+JyxcbiAgJzxwcm9wZXJ0eS1wYXRoPj08dmFsdWUgYXMgSlNPTiB8IGxpdGVyYWw+IC4uLiBkaXJlY3RseSBzZXQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBwcm9wZXJ0eSBuYW1lIGlzIGxvZGFzaC5zZXQoKSBwYXRoLWxpa2Ugc3RyaW5nXFxuIGUuZy5cXG4nLFxuICAoY3VyciwgcHJldikgPT4gcHJldi5jb25jYXQoY3VyciksIFtdIGFzIHN0cmluZ1tdKTtcblxucHJvZ3JhbS5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICBjb25zdCBkb25lczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gIGF3YWl0IGNmZy5pbml0KHtcbiAgICBjOiAocHJvZ3JhbS5vcHRzKCkuY29uZmlnIGFzIHN0cmluZ1tdKS5sZW5ndGggPT09IDAgPyB1bmRlZmluZWQgOiBwcm9ncmFtLm9wdHMoKS5jb25maWcsXG4gICAgcHJvcDogKHByb2dyYW0ub3B0cygpLnByb3AgYXMgc3RyaW5nW10pXG4gIH0pO1xuICBsb2dDb25maWcoY2ZnKCkpO1xuXG4gIGxvZy5pbmZvKHByb2dyYW0uYXJncyk7XG4gIGNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5cbiAgY29uc3QgcGFja2FnZXMgPSBwcm9ncmFtLmFyZ3M7XG4gIGlmIChwYWNrYWdlcyAmJiBwYWNrYWdlcy5sZW5ndGggPiAwKVxuICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMocGFja2FnZXMsIG9uQ29tcG9uZW50LCAnc3JjJyk7XG4gIC8vIGVsc2UgaWYgKGFyZ3YucHJvamVjdCAmJiBhcmd2LnByb2plY3QubGVuZ3RoID4gMCkge1xuICAvLyAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnLCBhcmd2LnByb2plY3QpO1xuICAvLyB9XG4gIGVsc2VcbiAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJyk7XG5cbiAgZnVuY3Rpb24gb25Db21wb25lbnQobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZTogc3RyaW5nLCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgICBkb25lcy5wdXNoKG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGRpcnMgPSBnZXRUc0RpcnNPZlBhY2thZ2UoanNvbik7XG5cbiAgICAgIGlmIChqc29uLmRyICYmIGpzb24uZHIuanNvblNjaGVtYSkge1xuICAgICAgICBjb25zdCBzY2hlbWFTcmNEaXIgPWpzb24uZHIuanNvblNjaGVtYSBhcyBzdHJpbmc7XG4gICAgICAgIGxvZy5pbmZvKGBwYWNrYWdlICR7bmFtZX0gaGFzIEpTT04gc2NoZW1hOiAke3NjaGVtYVNyY0Rpcn1gKTtcbiAgICAgICAgLy8gcGFja2FnZVBhdGggPSBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuXG4gICAgICAgIGdsb2Ioc2NoZW1hU3JjRGlyLCB7Y3dkOiBwYWNrYWdlUGF0aH0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICAgICAgICBsb2cuaW5mbygnRm91bmQgc2NoZW1hIHNvdXJjZScsIG1hdGNoZXMpO1xuXG4gICAgICAgICAgY29uc3QgY29tcGlsZXJPcHRpb25zOiBUSlMuQ29tcGlsZXJPcHRpb25zID0gey4uLmJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnMsIHJvb3REaXI6IHBhY2thZ2VQYXRofTtcblxuICAgICAgICAgIGNvbnN0IHRqc1BnbSA9IFRKUy5nZXRQcm9ncmFtRnJvbUZpbGVzKG1hdGNoZXMubWFwKHBhdGggPT4gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBwYXRoKSksIGNvbXBpbGVyT3B0aW9ucywgcGFja2FnZVBhdGgpO1xuICAgICAgICAgIGNvbnN0IGdlbmVyYXRvciA9IFRKUy5idWlsZEdlbmVyYXRvcih0anNQZ20sIHt9KTtcbiAgICAgICAgICBjb25zdCBzeW1ib2xzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgIGZvciAoY29uc3QgZmlsZW5hbWUgb2YgbWF0Y2hlcykge1xuICAgICAgICAgICAgY29uc3QgdHNGaWxlID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBmaWxlbmFtZSk7XG4gICAgICAgICAgICBjb25zdCBhc3RRdWVyeSA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmModHNGaWxlLCAndXRmOCcpLCB0c0ZpbGUpO1xuICAgICAgICAgICAgc3ltYm9scy5wdXNoKC4uLmFzdFF1ZXJ5LmZpbmRBbGwoJzpTb3VyY2VGaWxlPi5zdGF0ZW1lbnRzOkludGVyZmFjZURlY2xhcmF0aW9uPi5uYW1lOklkZW50aWZpZXInKS5tYXAoYXN0ID0+IGFzdC5nZXRUZXh0KCkpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGdlbmVyYXRvcikge1xuICAgICAgICAgICAgY29uc3Qgb3V0cHV0OiBhbnkgPSB7fTtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc3liIG9mIHN5bWJvbHMpIHtcbiAgICAgICAgICAgICAgbG9nLmluZm8oJ1NjaGVtYSBmb3IgJywgc3liKTtcbiAgICAgICAgICAgICAgb3V0cHV0W3N5Yl0gPSBnZW5lcmF0b3IuZ2V0U2NoZW1hRm9yU3ltYm9sKHN5Yik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBvdXRGaWxlID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBkaXJzLmlzb21EaXIsICdqc29uLXNjaGVtYS5qc29uJyk7XG4gICAgICAgICAgICBmcy5ta2RpcnBTeW5jKFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZGlycy5pc29tRGlyKSk7XG4gICAgICAgICAgICBmcy53cml0ZUZpbGUoXG4gICAgICAgICAgICAgIG91dEZpbGUsXG4gICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KG91dHB1dCwgbnVsbCwgJyAgJyksXG4gICAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIGxvZy5pbmZvKCcgd3JpdHRlbiB0byAnICsgb3V0RmlsZSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xufSk7XG5cbnByb2dyYW0ucGFyc2VBc3luYyhwcm9jZXNzLmFyZ3YpLmNhdGNoKGUgPT4ge1xuICBjb25zb2xlLmVycm9yKGUpO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcblxuXG4iXX0=
