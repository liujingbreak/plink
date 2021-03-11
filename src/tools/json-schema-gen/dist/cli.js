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
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
const glob_1 = __importDefault(require("glob"));
const plink_1 = require("@wfh/plink");
const __plink_1 = __importDefault(require("__plink"));
const baseTsconfigFile = require.resolve('@wfh/plink/wfh/tsconfig-base.json');
const log = log4js_1.default.getLogger(package_json_1.default.name);
const cliExt = (program) => {
    program.command('json-schema-gen <package...>').alias('jsg')
        .description('Scan packages and generate json schema. ' +
        'You package.json file must contains:  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}', { package: plink_1.cliPackageArgDesc })
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
        let dones;
        const baseTsconfig = ts_ast_query_1.typescript.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8')).config;
        if (packages && packages.length > 0) {
            dones = Array.from(plink_1.findPackagesByNames(packages))
                .filter((pkg, i) => {
                if (pkg == null) {
                    __plink_1.default.logger.error(`Can not find package for name like: "${packages[i]}"`);
                    return false;
                }
                return true;
            })
                .map(pkg => doPackage(pkg, baseTsconfig.compilerOptions));
            yield Promise.all(dones);
        }
    }));
    const listAstCmd = program.command('list-ts-ast <file> [ASTPath]').alias('lta')
        .description('List AST of specific TS, TSX file', {
        file: 'Target source file path',
        ASTPath: 'Only list those child nodes that match specific AST node.\n' +
            'Like CSS select\n := ["^"] <selector element> (" " | ">") <selector element>\n' +
            '   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *\n' +
            '   where <index> := "[" "0"-"9" "]"\n' +
            ' e.g.\n' +
            '   ".elements:ImportSpecifier > .name"\n' +
            '   ".elements[2] > .name"\n' +
            '   "^.statements[0] :ImportSpecifier > :Identifier"\n' +
            ' "^" is equivalent to expression ":SourceFile >" '
    })
        .option('--wt|--with-type', 'Print AST with Typescript syntax type', false)
        .action((file, ASTPath) => __awaiter(void 0, void 0, void 0, function* () {
        ts_ast_query_1.printFile(file, ASTPath || null, listAstCmd.opts().withType);
    }));
};
exports.default = cliExt;
function doPackage({ json, realPath: packagePath, name }, baseCompilerOptions) {
    const dirs = misc_1.getTscConfigOfPkg(json);
    if (json.dr == null || json.dr.jsonSchema == null)
        return Promise.resolve();
    const schemaSrcDir = json.dr.jsonSchema;
    log.info(`package ${name} has JSON schema: ${schemaSrcDir}`);
    // packagePath = fs.realpathSync(packagePath);
    return new Promise((resolve, reject) => glob_1.default(schemaSrcDir, { cwd: packagePath }, (err, matches) => {
        log.info('Found schema source', matches);
        const co = Object.assign(Object.assign({}, baseCompilerOptions), { rootDir: packagePath });
        plink_1.setTsCompilerOptForNodePath(process.cwd(), packagePath, co);
        const compilerOptions = co;
        const tjsPgm = TJS.getProgramFromFiles(matches.map(path => path_1.default.resolve(packagePath, path)), compilerOptions, packagePath);
        const generator = TJS.buildGenerator(tjsPgm, {});
        const symbols = [];
        for (const filename of matches) {
            const tsFile = path_1.default.resolve(packagePath, filename);
            const astQuery = new ts_ast_query_1.default(fs.readFileSync(tsFile, 'utf8'), tsFile);
            symbols.push(...astQuery.findAll('^.statements:InterfaceDeclaration>.name:Identifier').map(ast => ast.getText()), ...astQuery.findAll('^:TypeAliasDeclaration > .name').map(ast => ast.getText()));
        }
        if (generator) {
            const output = {};
            for (const syb of symbols) {
                log.info('Schema for ', syb);
                output[syb] = generator.getSchemaForSymbol(syb);
            }
            const outFile = path_1.default.resolve(packagePath, dirs.isomDir || 'isom', 'json-schema.json');
            fs.mkdirpSync(path_1.default.resolve(packagePath, dirs.isomDir || 'isom'));
            fs.promises.writeFile(outFile, JSON.stringify(output, null, '  '))
                .then(resolve, reject);
        }
        else {
            throw new Error('Failed to create typescript-json-schema generator');
        }
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxxQ0FBcUM7QUFDckMsbUVBQWlDO0FBQ2pDLGdEQUF3QjtBQUN4Qiw2Q0FBK0I7QUFDL0IseURBQWlFO0FBQ2pFLG9EQUE0QjtBQUM1Qiw0REFBOEM7QUFDOUMsdUZBQTZGO0FBQzdGLGdEQUF3QjtBQUN4QixzQ0FBMEg7QUFDMUgsc0RBQTRCO0FBRTVCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBRTlFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdEMsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDdkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7U0FDM0QsV0FBVyxDQUFDLDBDQUEwQztRQUN2RCwySEFBMkgsRUFDekgsRUFBQyxPQUFPLEVBQUUseUJBQWlCLEVBQUMsQ0FBQztTQUM5QixNQUFNLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUM7U0FDOUMsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1FBQ25DLElBQUksS0FBcUIsQ0FBQztRQUUxQixNQUFNLFlBQVksR0FBRyx5QkFBRSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFFdEgsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDbkMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsUUFBUSxDQUFDLENB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TSxDQUFDLENBQUMsQ0FBQztZQUNqRSxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUNsRSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3hCO2FBQU07WUFDTCxNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7U0FDdEU7SUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRU4sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIGltcG9ydCB7cHJvZ3JhbX0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBwayBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2dldFRzY0NvbmZpZ09mUGtnfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL21pc2MnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgVEpTIGZyb20gJ3R5cGVzY3JpcHQtanNvbi1zY2hlbWEnO1xuaW1wb3J0IFNlbGVjdG9yLCB7cHJpbnRGaWxlLCB0eXBlc2NyaXB0IGFzIHRzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIGZpbmRQYWNrYWdlc0J5TmFtZXMsIFBhY2thZ2VJbmZvLCBjbGlQYWNrYWdlQXJnRGVzY30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG5cbmNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKHBrLm5hbWUpO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIHByb2dyYW0uY29tbWFuZCgnanNvbi1zY2hlbWEtZ2VuIDxwYWNrYWdlLi4uPicpLmFsaWFzKCdqc2cnKVxuICAuZGVzY3JpcHRpb24oJ1NjYW4gcGFja2FnZXMgYW5kIGdlbmVyYXRlIGpzb24gc2NoZW1hLiAnICtcbiAgJ1lvdSBwYWNrYWdlLmpzb24gZmlsZSBtdXN0IGNvbnRhaW5zOiAgXCJkclwiOiB7anNvblNjaGVtYTogXCI8aW50ZXJmYWNlIGZpbGVzIHdob3NlIHBhdGggaXMgcmVsYXRpdmUgdG8gcGFja2FnZSBkaXJlY3Rvcnk+XCJ9JyxcbiAgICB7cGFja2FnZTogY2xpUGFja2FnZUFyZ0Rlc2N9KVxuICAub3B0aW9uKCctZiwgLS1maWxlIDxzcGVjPicsICdydW4gc2luZ2xlIGZpbGUnKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICBsZXQgZG9uZXM6IFByb21pc2U8YW55PltdO1xuXG4gICAgY29uc3QgYmFzZVRzY29uZmlnID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihiYXNlVHNjb25maWdGaWxlLCBmcy5yZWFkRmlsZVN5bmMoYmFzZVRzY29uZmlnRmlsZSwgJ3V0ZjgnKSkuY29uZmlnO1xuXG4gICAgaWYgKHBhY2thZ2VzICYmIHBhY2thZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGRvbmVzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKHBhY2thZ2VzKSlcbiAgICAgIC5maWx0ZXIoKHBrZywgaSkgPT4ge1xuICAgICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgICBwbGluay5sb2dnZXIuZXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlIGZvciBuYW1lIGxpa2U6IFwiJHtwYWNrYWdlc1tpXX1cImApO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAubWFwKHBrZyA9PiBkb1BhY2thZ2UocGtnISwgYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucykpO1xuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgbGlzdEFzdENtZCA9IHByb2dyYW0uY29tbWFuZCgnbGlzdC10cy1hc3QgPGZpbGU+IFtBU1RQYXRoXScpLmFsaWFzKCdsdGEnKVxuICAuZGVzY3JpcHRpb24oJ0xpc3QgQVNUIG9mIHNwZWNpZmljIFRTLCBUU1ggZmlsZScsIHtcbiAgICBmaWxlOiAnVGFyZ2V0IHNvdXJjZSBmaWxlIHBhdGgnLFxuICAgIEFTVFBhdGg6ICdPbmx5IGxpc3QgdGhvc2UgY2hpbGQgbm9kZXMgdGhhdCBtYXRjaCBzcGVjaWZpYyBBU1Qgbm9kZS5cXG4nICtcbiAgICAgICdMaWtlIENTUyBzZWxlY3RcXG4gOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxcbicgK1xuICAgICAgJyAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcXG4nICtcbiAgICAgICcgICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXFxuJyArXG4gICAgICAnIGUuZy5cXG4nICtcbiAgICAgICcgICBcIi5lbGVtZW50czpJbXBvcnRTcGVjaWZpZXIgPiAubmFtZVwiXFxuJyArXG4gICAgICAnICAgXCIuZWxlbWVudHNbMl0gPiAubmFtZVwiXFxuJyArXG4gICAgICAnICAgXCJeLnN0YXRlbWVudHNbMF0gOkltcG9ydFNwZWNpZmllciA+IDpJZGVudGlmaWVyXCJcXG4nICtcbiAgICAgICcgXCJeXCIgaXMgZXF1aXZhbGVudCB0byBleHByZXNzaW9uIFwiOlNvdXJjZUZpbGUgPlwiICdcbiAgfSlcbiAgLm9wdGlvbignLS13dHwtLXdpdGgtdHlwZScsICdQcmludCBBU1Qgd2l0aCBUeXBlc2NyaXB0IHN5bnRheCB0eXBlJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGZpbGU6IHN0cmluZywgQVNUUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkKSA9PiB7XG4gICAgcHJpbnRGaWxlKGZpbGUsIEFTVFBhdGggfHwgbnVsbCwgbGlzdEFzdENtZC5vcHRzKCkud2l0aFR5cGUpO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcblxuZnVuY3Rpb24gZG9QYWNrYWdlKHtqc29uLCByZWFsUGF0aDogcGFja2FnZVBhdGgsIG5hbWV9OiBQYWNrYWdlSW5mbywgYmFzZUNvbXBpbGVyT3B0aW9uczogVEpTLkNvbXBpbGVyT3B0aW9ucykge1xuICBjb25zdCBkaXJzID0gZ2V0VHNjQ29uZmlnT2ZQa2coanNvbik7XG5cbiAgaWYgKGpzb24uZHIgPT0gbnVsbCB8fCBqc29uLmRyLmpzb25TY2hlbWEgPT0gbnVsbClcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgY29uc3Qgc2NoZW1hU3JjRGlyID1qc29uLmRyLmpzb25TY2hlbWEgYXMgc3RyaW5nO1xuICBsb2cuaW5mbyhgcGFja2FnZSAke25hbWV9IGhhcyBKU09OIHNjaGVtYTogJHtzY2hlbWFTcmNEaXJ9YCk7XG4gIC8vIHBhY2thZ2VQYXRoID0gZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKTtcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gZ2xvYihzY2hlbWFTcmNEaXIsIHtjd2Q6IHBhY2thZ2VQYXRofSwgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgIGxvZy5pbmZvKCdGb3VuZCBzY2hlbWEgc291cmNlJywgbWF0Y2hlcyk7XG5cbiAgICBjb25zdCBjbyA9IHsuLi5iYXNlQ29tcGlsZXJPcHRpb25zLCByb290RGlyOiBwYWNrYWdlUGF0aH07XG4gICAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2Nlc3MuY3dkKCksIHBhY2thZ2VQYXRoLCBjbyk7XG5cbiAgICBjb25zdCBjb21waWxlck9wdGlvbnM6IFRKUy5Db21waWxlck9wdGlvbnMgPSBjbztcblxuICAgIGNvbnN0IHRqc1BnbSA9IFRKUy5nZXRQcm9ncmFtRnJvbUZpbGVzKG1hdGNoZXMubWFwKHBhdGggPT4gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBwYXRoKSksIGNvbXBpbGVyT3B0aW9ucywgcGFja2FnZVBhdGgpO1xuICAgIGNvbnN0IGdlbmVyYXRvciA9IFRKUy5idWlsZEdlbmVyYXRvcih0anNQZ20sIHt9KTtcbiAgICBjb25zdCBzeW1ib2xzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZmlsZW5hbWUgb2YgbWF0Y2hlcykge1xuICAgICAgY29uc3QgdHNGaWxlID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBmaWxlbmFtZSk7XG4gICAgICBjb25zdCBhc3RRdWVyeSA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmModHNGaWxlLCAndXRmOCcpLCB0c0ZpbGUpO1xuICAgICAgc3ltYm9scy5wdXNoKFxuICAgICAgICAuLi5hc3RRdWVyeS5maW5kQWxsKCdeLnN0YXRlbWVudHM6SW50ZXJmYWNlRGVjbGFyYXRpb24+Lm5hbWU6SWRlbnRpZmllcicpLm1hcChhc3QgPT4gYXN0LmdldFRleHQoKSksXG4gICAgICAgIC4uLmFzdFF1ZXJ5LmZpbmRBbGwoJ146VHlwZUFsaWFzRGVjbGFyYXRpb24gPiAubmFtZScpLm1hcChhc3QgPT4gYXN0LmdldFRleHQoKSlcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChnZW5lcmF0b3IpIHtcbiAgICAgIGNvbnN0IG91dHB1dDogYW55ID0ge307XG4gICAgICBmb3IgKGNvbnN0IHN5YiBvZiBzeW1ib2xzKSB7XG4gICAgICAgIGxvZy5pbmZvKCdTY2hlbWEgZm9yICcsIHN5Yik7XG4gICAgICAgIG91dHB1dFtzeWJdID0gZ2VuZXJhdG9yLmdldFNjaGVtYUZvclN5bWJvbChzeWIpO1xuICAgICAgfVxuICAgICAgY29uc3Qgb3V0RmlsZSA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZGlycy5pc29tRGlyIHx8ICdpc29tJywgJ2pzb24tc2NoZW1hLmpzb24nKTtcbiAgICAgIGZzLm1rZGlycFN5bmMoUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBkaXJzLmlzb21EaXIgfHwgJ2lzb20nKSk7XG4gICAgICBmcy5wcm9taXNlcy53cml0ZUZpbGUoIG91dEZpbGUsIEpTT04uc3RyaW5naWZ5KG91dHB1dCwgbnVsbCwgJyAgJykpXG4gICAgICAudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdHlwZXNjcmlwdC1qc29uLXNjaGVtYSBnZW5lcmF0b3InKTtcbiAgICB9XG4gIH0pKTtcblxufVxuIl19