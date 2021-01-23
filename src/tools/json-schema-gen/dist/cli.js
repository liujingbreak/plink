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
// import {program} from 'commander';
const package_json_1 = __importDefault(require("../package.json"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const log4js_1 = __importDefault(require("log4js"));
const TJS = __importStar(require("typescript-json-schema"));
const typescript_1 = __importDefault(require("typescript"));
const ts_ast_query_1 = __importDefault(require("@wfh/prebuild/dist/ts-ast-query"));
const glob_1 = __importDefault(require("glob"));
const dist_1 = require("@wfh/plink/wfh/dist");
const baseTsconfigFile = require.resolve('@wfh/plink/wfh/tsconfig-base.json');
const log = log4js_1.default.getLogger(package_json_1.default.name);
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('json-schema-gen [package...]')
        .description('Scan packages and generate json schema. ' +
        'You package.json file must contains:\n  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}')
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(cmd.opts());
        dist_1.initProcess();
        const dones = [];
        const baseTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8')).config;
        const packageUtils = require('@wfh/plink/wfh/dist/package-utils');
        const onComponent = (name, entryPath, parsedName, json, packagePath) => {
            dones.push(new Promise((resolve, reject) => {
                const dirs = misc_1.getTscConfigOfPkg(json);
                if (json.dr && json.dr.jsonSchema) {
                    const schemaSrcDir = json.dr.jsonSchema;
                    log.info(`package ${name} has JSON schema: ${schemaSrcDir}`);
                    // packagePath = fs.realpathSync(packagePath);
                    glob_1.default(schemaSrcDir, { cwd: packagePath }, (err, matches) => {
                        log.info('Found schema source', matches);
                        const co = Object.assign(Object.assign({}, baseTsconfig.compilerOptions), { rootDir: packagePath });
                        dist_1.setTsCompilerOptForNodePath(process.cwd(), packagePath, co);
                        const compilerOptions = co;
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
                            const outFile = path_1.default.resolve(packagePath, dirs.isomDir || 'isom', 'json-schema.json');
                            fs.mkdirpSync(path_1.default.resolve(packagePath, dirs.isomDir || 'isom'));
                            fs.writeFile(outFile, JSON.stringify(output, null, '  '), (err) => {
                                if (err)
                                    return reject(err);
                                log.info(' written to ' + outFile);
                                resolve();
                            });
                        }
                        else {
                            throw new Error('Failed to create typescript-json-schema generator');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxxQ0FBcUM7QUFDckMsbUVBQWlDO0FBQ2pDLGdEQUF3QjtBQUN4Qiw2Q0FBK0I7QUFDL0IseURBQWlFO0FBQ2pFLG9EQUE0QjtBQUM1Qiw0REFBOEM7QUFDOUMsNERBQTRCO0FBQzVCLG1GQUF1RDtBQUN2RCxnREFBd0I7QUFDeEIsOENBQTJIO0FBSTNILE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBRTlFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdEMsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEVBQUU7SUFDMUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQztTQUMxRCxXQUFXLENBQUMsMENBQTBDO1FBQ3ZELDZIQUE2SCxDQUFDO1NBQzdILE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQztTQUM5QyxNQUFNLENBQUMsQ0FBTyxRQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxzQkFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUNuRCxrQkFBVyxFQUFFLENBQUM7UUFDZCxNQUFNLEtBQUssR0FBb0IsRUFBRSxDQUFDO1FBRWxDLE1BQU0sWUFBWSxHQUFHLG9CQUFFLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUV0SCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQW9CLENBQUM7UUFFckYsTUFB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bEMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQ0FDTixJQUFJLEdBQUc7b0NBQ0wsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxDQUFDO2dDQUNuQyxPQUFPLEVBQUUsQ0FBQzs0QkFDWixDQUFDLENBQ0YsQ0FBQzt5QkFDSDs2QkFBTTs0QkFDTCxNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7eUJBQ3RFO29CQUNILENBQUMsQ0FBQyxDQUFDO2lCQUVKO1lBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQztRQUNGLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ25DLFlBQVksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3BELFlBQVksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUM1RDs7WUFDQyxZQUFZLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIGltcG9ydCB7cHJvZ3JhbX0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBwayBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL21pc2MnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgVEpTIGZyb20gJ3R5cGVzY3JpcHQtanNvbi1zY2hlbWEnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJ0B3ZmgvcHJlYnVpbGQvZGlzdC90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge0NsaUV4dGVuc2lvbiwgR2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZ0FzeW5jLCBpbml0UHJvY2Vzcywgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCBwa2dVdGlscyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuXG5cbmNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKHBrLm5hbWUpO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtLCB3aXRoR2xvYmFsT3B0aW9ucykgPT4ge1xuICBjb25zdCBjbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2pzb24tc2NoZW1hLWdlbiBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ1NjYW4gcGFja2FnZXMgYW5kIGdlbmVyYXRlIGpzb24gc2NoZW1hLiAnICtcbiAgJ1lvdSBwYWNrYWdlLmpzb24gZmlsZSBtdXN0IGNvbnRhaW5zOlxcbiAgXCJkclwiOiB7anNvblNjaGVtYTogXCI8aW50ZXJmYWNlIGZpbGVzIHdob3NlIHBhdGggaXMgcmVsYXRpdmUgdG8gcGFja2FnZSBkaXJlY3Rvcnk+XCJ9JylcbiAgLm9wdGlvbignLWYsIC0tZmlsZSA8c3BlYz4nLCAncnVuIHNpbmdsZSBmaWxlJylcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgYXdhaXQgaW5pdENvbmZpZ0FzeW5jKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgaW5pdFByb2Nlc3MoKTtcbiAgICBjb25zdCBkb25lczogUHJvbWlzZTx2b2lkPltdID0gW107XG5cbiAgICBjb25zdCBiYXNlVHNjb25maWcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGJhc2VUc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhiYXNlVHNjb25maWdGaWxlLCAndXRmOCcpKS5jb25maWc7XG5cbiAgICBjb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnKSBhcyB0eXBlb2YgcGtnVXRpbHM7XG5cbiAgICBjb25zdCBvbkNvbXBvbmVudDogcGtnVXRpbHMuRmluZFBhY2thZ2VDYiA9IChuYW1lLCBlbnRyeVBhdGgsIHBhcnNlZE5hbWUsIGpzb24sIHBhY2thZ2VQYXRoKSA9PiB7XG4gICAgICBkb25lcy5wdXNoKG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgZGlycyA9IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuXG4gICAgICAgIGlmIChqc29uLmRyICYmIGpzb24uZHIuanNvblNjaGVtYSkge1xuICAgICAgICAgIGNvbnN0IHNjaGVtYVNyY0RpciA9anNvbi5kci5qc29uU2NoZW1hIGFzIHN0cmluZztcbiAgICAgICAgICBsb2cuaW5mbyhgcGFja2FnZSAke25hbWV9IGhhcyBKU09OIHNjaGVtYTogJHtzY2hlbWFTcmNEaXJ9YCk7XG4gICAgICAgICAgLy8gcGFja2FnZVBhdGggPSBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpO1xuXG4gICAgICAgICAgZ2xvYihzY2hlbWFTcmNEaXIsIHtjd2Q6IHBhY2thZ2VQYXRofSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgICAgICAgbG9nLmluZm8oJ0ZvdW5kIHNjaGVtYSBzb3VyY2UnLCBtYXRjaGVzKTtcblxuICAgICAgICAgICAgY29uc3QgY28gPSB7Li4uYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucywgcm9vdERpcjogcGFja2FnZVBhdGh9O1xuICAgICAgICAgICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksIHBhY2thZ2VQYXRoLCBjbyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogVEpTLkNvbXBpbGVyT3B0aW9ucyA9IGNvO1xuXG4gICAgICAgICAgICBjb25zdCB0anNQZ20gPSBUSlMuZ2V0UHJvZ3JhbUZyb21GaWxlcyhtYXRjaGVzLm1hcChwYXRoID0+IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgcGF0aCkpLCBjb21waWxlck9wdGlvbnMsIHBhY2thZ2VQYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IGdlbmVyYXRvciA9IFRKUy5idWlsZEdlbmVyYXRvcih0anNQZ20sIHt9KTtcbiAgICAgICAgICAgIGNvbnN0IHN5bWJvbHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGVuYW1lIG9mIG1hdGNoZXMpIHtcbiAgICAgICAgICAgICAgY29uc3QgdHNGaWxlID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBmaWxlbmFtZSk7XG4gICAgICAgICAgICAgIGNvbnN0IGFzdFF1ZXJ5ID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyh0c0ZpbGUsICd1dGY4JyksIHRzRmlsZSk7XG4gICAgICAgICAgICAgIHN5bWJvbHMucHVzaCguLi5hc3RRdWVyeS5maW5kQWxsKCc6U291cmNlRmlsZT4uc3RhdGVtZW50czpJbnRlcmZhY2VEZWNsYXJhdGlvbj4ubmFtZTpJZGVudGlmaWVyJykubWFwKGFzdCA9PiBhc3QuZ2V0VGV4dCgpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZ2VuZXJhdG9yKSB7XG4gICAgICAgICAgICAgIGNvbnN0IG91dHB1dDogYW55ID0ge307XG4gICAgICAgICAgICAgIGZvciAoY29uc3Qgc3liIG9mIHN5bWJvbHMpIHtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygnU2NoZW1hIGZvciAnLCBzeWIpO1xuICAgICAgICAgICAgICAgIG91dHB1dFtzeWJdID0gZ2VuZXJhdG9yLmdldFNjaGVtYUZvclN5bWJvbChzeWIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IG91dEZpbGUgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGRpcnMuaXNvbURpciB8fCAnaXNvbScsICdqc29uLXNjaGVtYS5qc29uJyk7XG4gICAgICAgICAgICAgIGZzLm1rZGlycFN5bmMoUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBkaXJzLmlzb21EaXIgfHwgJ2lzb20nKSk7XG4gICAgICAgICAgICAgIGZzLndyaXRlRmlsZShcbiAgICAgICAgICAgICAgICBvdXRGaWxlLFxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KG91dHB1dCwgbnVsbCwgJyAgJyksXG4gICAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oJyB3cml0dGVuIHRvICcgKyBvdXRGaWxlKTtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdHlwZXNjcmlwdC1qc29uLXNjaGVtYSBnZW5lcmF0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfTtcbiAgICBpZiAocGFja2FnZXMgJiYgcGFja2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgcGFja2FnZVV0aWxzLmxvb2tGb3JQYWNrYWdlcyhwYWNrYWdlcywgb25Db21wb25lbnQpO1xuICAgICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhwYWNrYWdlcywgb25Db21wb25lbnQsICdzcmMnKTtcbiAgICB9IGVsc2VcbiAgICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMob25Db21wb25lbnQsICdzcmMnKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhjbWQpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19