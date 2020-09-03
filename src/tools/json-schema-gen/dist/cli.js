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
const bootstrap_server_1 = require("dr-comp-package/wfh/dist/utils/bootstrap-server");
const baseTsconfig = require('dr-comp-package/wfh/tsconfig-base.json');
const log = log4js_1.default.getLogger(package_json_1.default.name);
commander_1.program.version(package_json_1.default.version).name('json-schema-gen')
    .description('Scan packages and generate json schema.\n' +
    'You package.json file must contains:\n  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}')
    .arguments('[...packages]')
    .passCommandToAction(true);
bootstrap_server_1.withGlobalOptions(commander_1.program);
commander_1.program.action((packages) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const dones = [];
    yield bootstrap_server_1.initConfigAsync(commander_1.program.opts());
    log.info(commander_1.program.args);
    const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
    // const packages = program.args;
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
                    const compilerOptions = Object.assign(Object.assign({}, baseTsconfig.compilerOptions), { rootDir: packagePath });
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

//# sourceMappingURL=cli.js.map
