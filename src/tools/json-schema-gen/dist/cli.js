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
const cliExt = (program) => {
    program.command('json-schema-gen [package...]')
        .description('Scan packages and generate json schema. ' +
        'You package.json file must contains:\n  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}')
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
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
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxxQ0FBcUM7QUFDckMsbUVBQWlDO0FBQ2pDLGdEQUF3QjtBQUN4Qiw2Q0FBK0I7QUFDL0IseURBQWlFO0FBQ2pFLG9EQUE0QjtBQUM1Qiw0REFBOEM7QUFDOUMsNERBQTRCO0FBQzVCLG1GQUF1RDtBQUN2RCxnREFBd0I7QUFDeEIsOENBQThFO0FBSTlFLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBRTlFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdEMsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDdkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQztTQUM5QyxXQUFXLENBQUMsMENBQTBDO1FBQ3ZELDZIQUE2SCxDQUFDO1NBQzdILE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQztTQUM5QyxNQUFNLENBQUMsQ0FBTyxRQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxLQUFLLEdBQW9CLEVBQUUsQ0FBQztRQUVsQyxNQUFNLFlBQVksR0FBRyxvQkFBRSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFFdEgsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLG1DQUFtQyxDQUFvQixDQUFDO1FBRXJGLE1BQU0sV0FBVyxHQUEyQixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsRUFBRTtZQUM3RixLQUFLLENBQUMsSUFBSSxDQUFDLElB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LGNBQWMsR0FBRyxPQUFPLENBQUMsQ0FBQztnQ0FDbkMsT0FBTyxFQUFFLENBQUM7NEJBQ1osQ0FBQyxDQUNGLENBQUM7eUJBQ0g7NkJBQU07NEJBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO3lCQUN0RTtvQkFDSCxDQUFDLENBQUMsQ0FBQztpQkFFSjtZQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTixDQUFDLENBQUM7UUFDRixJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNuQyxZQUFZLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNwRCxZQUFZLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDNUQ7O1lBQ0MsWUFBWSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vLyBpbXBvcnQge3Byb2dyYW19IGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgcGsgZnJvbSAnLi4vcGFja2FnZS5qc29uJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZ30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9taXNjJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIFRKUyBmcm9tICd0eXBlc2NyaXB0LWpzb24tc2NoZW1hJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBTZWxlY3RvciBmcm9tICdAd2ZoL3ByZWJ1aWxkL2Rpc3QvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHtDbGlFeHRlbnNpb24sIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5pbXBvcnQgcGtnVXRpbHMgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJztcblxuXG5jb25zdCBiYXNlVHNjb25maWdGaWxlID0gcmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihway5uYW1lKTtcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBwcm9ncmFtLmNvbW1hbmQoJ2pzb24tc2NoZW1hLWdlbiBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ1NjYW4gcGFja2FnZXMgYW5kIGdlbmVyYXRlIGpzb24gc2NoZW1hLiAnICtcbiAgJ1lvdSBwYWNrYWdlLmpzb24gZmlsZSBtdXN0IGNvbnRhaW5zOlxcbiAgXCJkclwiOiB7anNvblNjaGVtYTogXCI8aW50ZXJmYWNlIGZpbGVzIHdob3NlIHBhdGggaXMgcmVsYXRpdmUgdG8gcGFja2FnZSBkaXJlY3Rvcnk+XCJ9JylcbiAgLm9wdGlvbignLWYsIC0tZmlsZSA8c3BlYz4nLCAncnVuIHNpbmdsZSBmaWxlJylcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgY29uc3QgZG9uZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXG4gICAgY29uc3QgYmFzZVRzY29uZmlnID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihiYXNlVHNjb25maWdGaWxlLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZSwgJ3V0ZjgnKSkuY29uZmlnO1xuXG4gICAgY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXV0aWxzJykgYXMgdHlwZW9mIHBrZ1V0aWxzO1xuXG4gICAgY29uc3Qgb25Db21wb25lbnQ6IHBrZ1V0aWxzLkZpbmRQYWNrYWdlQ2IgPSAobmFtZSwgZW50cnlQYXRoLCBwYXJzZWROYW1lLCBqc29uLCBwYWNrYWdlUGF0aCkgPT4ge1xuICAgICAgZG9uZXMucHVzaChuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGRpcnMgPSBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcblxuICAgICAgICBpZiAoanNvbi5kciAmJiBqc29uLmRyLmpzb25TY2hlbWEpIHtcbiAgICAgICAgICBjb25zdCBzY2hlbWFTcmNEaXIgPWpzb24uZHIuanNvblNjaGVtYSBhcyBzdHJpbmc7XG4gICAgICAgICAgbG9nLmluZm8oYHBhY2thZ2UgJHtuYW1lfSBoYXMgSlNPTiBzY2hlbWE6ICR7c2NoZW1hU3JjRGlyfWApO1xuICAgICAgICAgIC8vIHBhY2thZ2VQYXRoID0gZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKTtcblxuICAgICAgICAgIGdsb2Ioc2NoZW1hU3JjRGlyLCB7Y3dkOiBwYWNrYWdlUGF0aH0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdGb3VuZCBzY2hlbWEgc291cmNlJywgbWF0Y2hlcyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNvID0gey4uLmJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnMsIHJvb3REaXI6IHBhY2thZ2VQYXRofTtcbiAgICAgICAgICAgIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCBwYWNrYWdlUGF0aCwgY28pO1xuXG4gICAgICAgICAgICBjb25zdCBjb21waWxlck9wdGlvbnM6IFRKUy5Db21waWxlck9wdGlvbnMgPSBjbztcblxuICAgICAgICAgICAgY29uc3QgdGpzUGdtID0gVEpTLmdldFByb2dyYW1Gcm9tRmlsZXMobWF0Y2hlcy5tYXAocGF0aCA9PiBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIHBhdGgpKSwgY29tcGlsZXJPcHRpb25zLCBwYWNrYWdlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBnZW5lcmF0b3IgPSBUSlMuYnVpbGRHZW5lcmF0b3IodGpzUGdtLCB7fSk7XG4gICAgICAgICAgICBjb25zdCBzeW1ib2xzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlbmFtZSBvZiBtYXRjaGVzKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRzRmlsZSA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZmlsZW5hbWUpO1xuICAgICAgICAgICAgICBjb25zdCBhc3RRdWVyeSA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmModHNGaWxlLCAndXRmOCcpLCB0c0ZpbGUpO1xuICAgICAgICAgICAgICBzeW1ib2xzLnB1c2goLi4uYXN0UXVlcnkuZmluZEFsbCgnOlNvdXJjZUZpbGU+LnN0YXRlbWVudHM6SW50ZXJmYWNlRGVjbGFyYXRpb24+Lm5hbWU6SWRlbnRpZmllcicpLm1hcChhc3QgPT4gYXN0LmdldFRleHQoKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGdlbmVyYXRvcikge1xuICAgICAgICAgICAgICBjb25zdCBvdXRwdXQ6IGFueSA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHN5YiBvZiBzeW1ib2xzKSB7XG4gICAgICAgICAgICAgICAgbG9nLmluZm8oJ1NjaGVtYSBmb3IgJywgc3liKTtcbiAgICAgICAgICAgICAgICBvdXRwdXRbc3liXSA9IGdlbmVyYXRvci5nZXRTY2hlbWFGb3JTeW1ib2woc3liKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBvdXRGaWxlID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBkaXJzLmlzb21EaXIgfHwgJ2lzb20nLCAnanNvbi1zY2hlbWEuanNvbicpO1xuICAgICAgICAgICAgICBmcy5ta2RpcnBTeW5jKFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZGlycy5pc29tRGlyIHx8ICdpc29tJykpO1xuICAgICAgICAgICAgICBmcy53cml0ZUZpbGUoXG4gICAgICAgICAgICAgICAgb3V0RmlsZSxcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShvdXRwdXQsIG51bGwsICcgICcpLFxuICAgICAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKCcgd3JpdHRlbiB0byAnICsgb3V0RmlsZSk7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIHR5cGVzY3JpcHQtanNvbi1zY2hlbWEgZ2VuZXJhdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH07XG4gICAgaWYgKHBhY2thZ2VzICYmIHBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHBhY2thZ2VVdGlscy5sb29rRm9yUGFja2FnZXMocGFja2FnZXMsIG9uQ29tcG9uZW50KTtcbiAgICAgIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMocGFja2FnZXMsIG9uQ29tcG9uZW50LCAnc3JjJyk7XG4gICAgfSBlbHNlXG4gICAgICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKG9uQ29tcG9uZW50LCAnc3JjJyk7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==