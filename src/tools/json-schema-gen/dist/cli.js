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
const ts_ast_query_1 = __importStar(require("@wfh/plink/wfh/dist/utils/ts-ast-query"));
const glob_1 = __importDefault(require("glob"));
const plink_1 = require("@wfh/plink");
const __plink_1 = __importDefault(require("__plink"));
const baseTsconfigFile = require.resolve('@wfh/plink/wfh/tsconfig-base.json');
const log = log4js_1.default.getLogger(package_json_1.default.name);
const cliExt = (program) => {
    program.command('json-schema-gen <package...>').alias('jsg')
        .description('Scan packages and generate json schema. ' +
        'You package.json file must contains:\n  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}', { package: plink_1.cliPackageArgDesc })
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
        let dones;
        const baseTsconfig = typescript_1.default.parseConfigFileTextToJson(baseTsconfigFile, fs.readFileSync(baseTsconfigFile, 'utf8')).config;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxxQ0FBcUM7QUFDckMsbUVBQWlDO0FBQ2pDLGdEQUF3QjtBQUN4Qiw2Q0FBK0I7QUFDL0IseURBQWlFO0FBQ2pFLG9EQUE0QjtBQUM1Qiw0REFBOEM7QUFDOUMsNERBQTRCO0FBQzVCLHVGQUEyRTtBQUMzRSxnREFBd0I7QUFDeEIsc0NBQTBIO0FBQzFILHNEQUE0QjtBQUU1QixNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUU5RSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxzQkFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRXRDLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1NBQzNELFdBQVcsQ0FBQywwQ0FBMEM7UUFDdkQsNkhBQTZILEVBQzNILEVBQUMsT0FBTyxFQUFFLHlCQUFpQixFQUFDLENBQUM7U0FDOUIsTUFBTSxDQUFDLG1CQUFtQixFQUFFLGlCQUFpQixDQUFDO1NBQzlDLE1BQU0sQ0FBQyxDQUFPLFFBQWtCLEVBQUUsRUFBRTtRQUNuQyxJQUFJLEtBQXFCLENBQUM7UUFFMUIsTUFBTSxZQUFZLEdBQUcsb0JBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBRXRILElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ25DLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLDJCQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUNoRCxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2pCLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtvQkFDZixpQkFBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzNFLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2dCQUNELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDO2lCQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFJLEVBQUUsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDM0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzFCO0lBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1NBQzlFLFdBQVcsQ0FBQyxtQ0FBbUMsRUFBRTtRQUNoRCxJQUFJLEVBQUUseUJBQXlCO1FBQy9CLE9BQU8sRUFBRSw2REFBNkQ7WUFDcEUsZ0ZBQWdGO1lBQ2hGLHVHQUF1RztZQUN2Ryx1Q0FBdUM7WUFDdkMsU0FBUztZQUNULDBDQUEwQztZQUMxQyw2QkFBNkI7WUFDN0IsdURBQXVEO1lBQ3ZELG1EQUFtRDtLQUN0RCxDQUFDO1NBQ0QsTUFBTSxDQUFDLGtCQUFrQixFQUFFLHVDQUF1QyxFQUFFLEtBQUssQ0FBQztTQUMxRSxNQUFNLENBQUMsQ0FBTyxJQUFZLEVBQUUsT0FBMkIsRUFBRSxFQUFFO1FBQzFELHdCQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sSUFBSSxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUM7QUFFdEIsU0FBUyxTQUFTLENBQUMsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQWMsRUFBRSxtQkFBd0M7SUFDM0csTUFBTSxJQUFJLEdBQUcsd0JBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFckMsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsSUFBSSxJQUFJO1FBQy9DLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRTNCLE1BQU0sWUFBWSxHQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBb0IsQ0FBQztJQUNqRCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxxQkFBcUIsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUM3RCw4Q0FBOEM7SUFFOUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLGNBQUksQ0FBQyxZQUFZLEVBQUUsRUFBQyxHQUFHLEVBQUUsV0FBVyxFQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDOUYsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUV6QyxNQUFNLEVBQUUsbUNBQU8sbUJBQW1CLEtBQUUsT0FBTyxFQUFFLFdBQVcsR0FBQyxDQUFDO1FBQzFELG1DQUEyQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFNUQsTUFBTSxlQUFlLEdBQXdCLEVBQUUsQ0FBQztRQUVoRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzNILE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQztRQUM3QixLQUFLLE1BQU0sUUFBUSxJQUFJLE9BQU8sRUFBRTtZQUM5QixNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNuRCxNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDdkUsT0FBTyxDQUFDLElBQUksQ0FDVixHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsb0RBQW9ELENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsRUFDbkcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQ2hGLENBQUM7U0FDSDtRQUNELElBQUksU0FBUyxFQUFFO1lBQ2IsTUFBTSxNQUFNLEdBQVEsRUFBRSxDQUFDO1lBQ3ZCLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFO2dCQUN6QixHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDN0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNqRDtZQUNELE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLElBQUksTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDdEYsRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDakUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDbEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztTQUN4QjthQUFNO1lBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO1NBQ3RFO0lBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vLyBpbXBvcnQge3Byb2dyYW19IGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgcGsgZnJvbSAnLi4vcGFja2FnZS5qc29uJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZ30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9taXNjJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIFRKUyBmcm9tICd0eXBlc2NyaXB0LWpzb24tc2NoZW1hJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBTZWxlY3Rvciwge3ByaW50RmlsZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQge0NsaUV4dGVuc2lvbiwgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBmaW5kUGFja2FnZXNCeU5hbWVzLCBQYWNrYWdlSW5mbywgY2xpUGFja2FnZUFyZ0Rlc2N9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuXG5jb25zdCBiYXNlVHNjb25maWdGaWxlID0gcmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihway5uYW1lKTtcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBwcm9ncmFtLmNvbW1hbmQoJ2pzb24tc2NoZW1hLWdlbiA8cGFja2FnZS4uLj4nKS5hbGlhcygnanNnJylcbiAgLmRlc2NyaXB0aW9uKCdTY2FuIHBhY2thZ2VzIGFuZCBnZW5lcmF0ZSBqc29uIHNjaGVtYS4gJyArXG4gICdZb3UgcGFja2FnZS5qc29uIGZpbGUgbXVzdCBjb250YWluczpcXG4gIFwiZHJcIjoge2pzb25TY2hlbWE6IFwiPGludGVyZmFjZSBmaWxlcyB3aG9zZSBwYXRoIGlzIHJlbGF0aXZlIHRvIHBhY2thZ2UgZGlyZWN0b3J5PlwifScsXG4gICAge3BhY2thZ2U6IGNsaVBhY2thZ2VBcmdEZXNjfSlcbiAgLm9wdGlvbignLWYsIC0tZmlsZSA8c3BlYz4nLCAncnVuIHNpbmdsZSBmaWxlJylcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgbGV0IGRvbmVzOiBQcm9taXNlPGFueT5bXTtcblxuICAgIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oYmFzZVRzY29uZmlnRmlsZSwgZnMucmVhZEZpbGVTeW5jKGJhc2VUc2NvbmZpZ0ZpbGUsICd1dGY4JykpLmNvbmZpZztcblxuICAgIGlmIChwYWNrYWdlcyAmJiBwYWNrYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBkb25lcyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhwYWNrYWdlcykpXG4gICAgICAuZmlsdGVyKChwa2csIGkpID0+IHtcbiAgICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgICAgcGxpbmsubG9nZ2VyLmVycm9yKGBDYW4gbm90IGZpbmQgcGFja2FnZSBmb3IgbmFtZSBsaWtlOiBcIiR7cGFja2FnZXNbaV19XCJgKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLm1hcChwa2cgPT4gZG9QYWNrYWdlKHBrZyEsIGJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnMpKTtcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKGRvbmVzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IGxpc3RBc3RDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2xpc3QtdHMtYXN0IDxmaWxlPiBbQVNUUGF0aF0nKS5hbGlhcygnbHRhJylcbiAgLmRlc2NyaXB0aW9uKCdMaXN0IEFTVCBvZiBzcGVjaWZpYyBUUywgVFNYIGZpbGUnLCB7XG4gICAgZmlsZTogJ1RhcmdldCBzb3VyY2UgZmlsZSBwYXRoJyxcbiAgICBBU1RQYXRoOiAnT25seSBsaXN0IHRob3NlIGNoaWxkIG5vZGVzIHRoYXQgbWF0Y2ggc3BlY2lmaWMgQVNUIG5vZGUuXFxuJyArXG4gICAgICAnTGlrZSBDU1Mgc2VsZWN0XFxuIDo9IFtcIl5cIl0gPHNlbGVjdG9yIGVsZW1lbnQ+IChcIiBcIiB8IFwiPlwiKSA8c2VsZWN0b3IgZWxlbWVudD5cXG4nICtcbiAgICAgICcgICB3aGVyZSA8c2VsZWN0b3IgZWxlbWVudD4gOj0gXCIuXCIgPHByb3BlcnR5IG5hbWU+IDxpbmRleD4/IHwgXCI6XCIgPFR5cGVzY3JpcHQgU3ludGF4IGtpbmQgbmFtZT4gfCAqXFxuJyArXG4gICAgICAnICAgd2hlcmUgPGluZGV4PiA6PSBcIltcIiBcIjBcIi1cIjlcIiBcIl1cIlxcbicgK1xuICAgICAgJyBlLmcuXFxuJyArXG4gICAgICAnICAgXCIuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcIlxcbicgK1xuICAgICAgJyAgIFwiLmVsZW1lbnRzWzJdID4gLm5hbWVcIlxcbicgK1xuICAgICAgJyAgIFwiXi5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclwiXFxuJyArXG4gICAgICAnIFwiXlwiIGlzIGVxdWl2YWxlbnQgdG8gZXhwcmVzc2lvbiBcIjpTb3VyY2VGaWxlID5cIiAnXG4gIH0pXG4gIC5vcHRpb24oJy0td3R8LS13aXRoLXR5cGUnLCAnUHJpbnQgQVNUIHdpdGggVHlwZXNjcmlwdCBzeW50YXggdHlwZScsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChmaWxlOiBzdHJpbmcsIEFTVFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCkgPT4ge1xuICAgIHByaW50RmlsZShmaWxlLCBBU1RQYXRoIHx8IG51bGwsIGxpc3RBc3RDbWQub3B0cygpLndpdGhUeXBlKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG5cbmZ1bmN0aW9uIGRvUGFja2FnZSh7anNvbiwgcmVhbFBhdGg6IHBhY2thZ2VQYXRoLCBuYW1lfTogUGFja2FnZUluZm8sIGJhc2VDb21waWxlck9wdGlvbnM6IFRKUy5Db21waWxlck9wdGlvbnMpIHtcbiAgY29uc3QgZGlycyA9IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuXG4gIGlmIChqc29uLmRyID09IG51bGwgfHwganNvbi5kci5qc29uU2NoZW1hID09IG51bGwpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIGNvbnN0IHNjaGVtYVNyY0RpciA9anNvbi5kci5qc29uU2NoZW1hIGFzIHN0cmluZztcbiAgbG9nLmluZm8oYHBhY2thZ2UgJHtuYW1lfSBoYXMgSlNPTiBzY2hlbWE6ICR7c2NoZW1hU3JjRGlyfWApO1xuICAvLyBwYWNrYWdlUGF0aCA9IGZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aCk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IGdsb2Ioc2NoZW1hU3JjRGlyLCB7Y3dkOiBwYWNrYWdlUGF0aH0sIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICBsb2cuaW5mbygnRm91bmQgc2NoZW1hIHNvdXJjZScsIG1hdGNoZXMpO1xuXG4gICAgY29uc3QgY28gPSB7Li4uYmFzZUNvbXBpbGVyT3B0aW9ucywgcm9vdERpcjogcGFja2FnZVBhdGh9O1xuICAgIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9jZXNzLmN3ZCgpLCBwYWNrYWdlUGF0aCwgY28pO1xuXG4gICAgY29uc3QgY29tcGlsZXJPcHRpb25zOiBUSlMuQ29tcGlsZXJPcHRpb25zID0gY287XG5cbiAgICBjb25zdCB0anNQZ20gPSBUSlMuZ2V0UHJvZ3JhbUZyb21GaWxlcyhtYXRjaGVzLm1hcChwYXRoID0+IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgcGF0aCkpLCBjb21waWxlck9wdGlvbnMsIHBhY2thZ2VQYXRoKTtcbiAgICBjb25zdCBnZW5lcmF0b3IgPSBUSlMuYnVpbGRHZW5lcmF0b3IodGpzUGdtLCB7fSk7XG4gICAgY29uc3Qgc3ltYm9sczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZpbGVuYW1lIG9mIG1hdGNoZXMpIHtcbiAgICAgIGNvbnN0IHRzRmlsZSA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZmlsZW5hbWUpO1xuICAgICAgY29uc3QgYXN0UXVlcnkgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKHRzRmlsZSwgJ3V0ZjgnKSwgdHNGaWxlKTtcbiAgICAgIHN5bWJvbHMucHVzaChcbiAgICAgICAgLi4uYXN0UXVlcnkuZmluZEFsbCgnXi5zdGF0ZW1lbnRzOkludGVyZmFjZURlY2xhcmF0aW9uPi5uYW1lOklkZW50aWZpZXInKS5tYXAoYXN0ID0+IGFzdC5nZXRUZXh0KCkpLFxuICAgICAgICAuLi5hc3RRdWVyeS5maW5kQWxsKCdeOlR5cGVBbGlhc0RlY2xhcmF0aW9uID4gLm5hbWUnKS5tYXAoYXN0ID0+IGFzdC5nZXRUZXh0KCkpXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoZ2VuZXJhdG9yKSB7XG4gICAgICBjb25zdCBvdXRwdXQ6IGFueSA9IHt9O1xuICAgICAgZm9yIChjb25zdCBzeWIgb2Ygc3ltYm9scykge1xuICAgICAgICBsb2cuaW5mbygnU2NoZW1hIGZvciAnLCBzeWIpO1xuICAgICAgICBvdXRwdXRbc3liXSA9IGdlbmVyYXRvci5nZXRTY2hlbWFGb3JTeW1ib2woc3liKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG91dEZpbGUgPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGRpcnMuaXNvbURpciB8fCAnaXNvbScsICdqc29uLXNjaGVtYS5qc29uJyk7XG4gICAgICBmcy5ta2RpcnBTeW5jKFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZGlycy5pc29tRGlyIHx8ICdpc29tJykpO1xuICAgICAgZnMucHJvbWlzZXMud3JpdGVGaWxlKCBvdXRGaWxlLCBKU09OLnN0cmluZ2lmeShvdXRwdXQsIG51bGwsICcgICcpKVxuICAgICAgLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIHR5cGVzY3JpcHQtanNvbi1zY2hlbWEgZ2VuZXJhdG9yJyk7XG4gICAgfVxuICB9KSk7XG5cbn1cbiJdfQ==