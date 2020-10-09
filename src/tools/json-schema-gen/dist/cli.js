#!/usr/bin/env node
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
// import {program} from 'commander';
const package_json_1 = __importDefault(require("../package.json"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const log4js_1 = __importDefault(require("log4js"));
const TJS = __importStar(require("typescript-json-schema"));
const ts_ast_query_1 = __importDefault(require("@wfh/prebuild/dist/ts-ast-query"));
const glob_1 = __importDefault(require("glob"));
const dist_1 = require("@wfh/plink/wfh/dist");
const baseTsconfig = require('@wfh/plink/wfh/tsconfig-base.json');
const log = log4js_1.default.getLogger(package_json_1.default.name);
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('json-schema-gen [package...]')
        .description('Scan packages and generate json schema. ' +
        'You package.json file must contains:\n  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}')
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(cmd.opts());
        const dones = [];
        const packageUtils = require('@wfh/plink/wfh/dist/package-utils');
        const onComponent = (name, entryPath, parsedName, json, packagePath) => {
            dones.push(new Promise((resolve, reject) => {
                const dirs = misc_1.getTsDirsOfPackage(json);
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
        };
        if (packages && packages.length > 0) {
            packageUtils.lookForPackages(packages, onComponent);
            packageUtils.findAllPackages(packages, onComponent, 'src');
        }
        else
            packageUtils.findAllPackages(onComponent, 'src');
        yield Promise.all(dones);
    }));
    withGlobalOptions(cmd);
};
exports.default = cliExt;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL2pzb24tc2NoZW1hLWdlbi90cy9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHFDQUFxQztBQUNyQyxtRUFBaUM7QUFDakMsZ0RBQXdCO0FBQ3hCLDZDQUErQjtBQUMvQix5REFBa0U7QUFDbEUsb0RBQTRCO0FBQzVCLDREQUE4QztBQUM5QyxtRkFBdUQ7QUFDdkQsZ0RBQXdCO0FBQ3hCLDhDQUFpRjtBQUdqRixNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUVsRSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxzQkFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRXRDLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxFQUFFO0lBQzFELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUM7U0FDMUQsV0FBVyxDQUFDLDBDQUEwQztRQUN2RCw2SEFBNkgsQ0FBQztTQUM3SCxNQUFNLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUM7U0FDOUMsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1FBQ25DLE1BQU0sc0JBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDbkQsTUFBTSxLQUFLLEdBQW9CLEVBQUUsQ0FBQztRQUVsQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQW9CLENBQUM7UUFFckYsTUFBTSxXQUFXLEdBQTJCLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQzdGLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ3pDLE1BQU0sSUFBSSxHQUFHLHlCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUV0QyxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUU7b0JBQ2pDLE1BQU0sWUFBWSxHQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBb0IsQ0FBQztvQkFDakQsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUkscUJBQXFCLFlBQVksRUFBRSxDQUFDLENBQUM7b0JBQzdELDhDQUE4QztvQkFFOUMsY0FBSSxDQUFDLFlBQVksRUFBRSxFQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTt3QkFDdEQsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsQ0FBQzt3QkFFekMsTUFBTSxlQUFlLG1DQUE0QixZQUFZLENBQUMsZUFBZSxLQUFFLE9BQU8sRUFBRSxXQUFXLEdBQUMsQ0FBQzt3QkFFckcsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQzt3QkFDM0gsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ2pELE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQzt3QkFDN0IsS0FBSyxNQUFNLFFBQVEsSUFBSSxPQUFPLEVBQUU7NEJBQzlCLE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDOzRCQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7NEJBQ3ZFLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLCtEQUErRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDOUg7d0JBQ0QsSUFBSSxTQUFTLEVBQUU7NEJBQ2IsTUFBTSxNQUFNLEdBQVEsRUFBRSxDQUFDOzRCQUN2QixLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtnQ0FDekIsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0NBQzdCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7NkJBQ2pEOzRCQUNELE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQzs0QkFDNUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzs0QkFDdkQsRUFBRSxDQUFDLFNBQVMsQ0FDVixPQUFPLEVBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUNsQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dDQUNOLElBQUksR0FBRztvQ0FDTCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDckIsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLENBQUM7Z0NBQ25DLE9BQU8sRUFBRSxDQUFDOzRCQUNaLENBQUMsQ0FDRixDQUFDO3lCQUNIO29CQUNILENBQUMsQ0FBQyxDQUFDO2lCQUVKO1lBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQztRQUNGLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ25DLFlBQVksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3BELFlBQVksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUM1RDs7WUFDQyxZQUFZLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsImZpbGUiOiJ0b29scy9qc29uLXNjaGVtYS1nZW4vZGlzdC9jbGkuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
