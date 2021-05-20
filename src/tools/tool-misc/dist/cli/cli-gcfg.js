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
exports.generateConfig = void 0;
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
// import fsex from 'fs-extra';
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// import chalk from 'chalk';
const __plink_1 = __importDefault(require("__plink"));
const util_1 = require("util");
const recipe_manager_1 = require("@wfh/plink/wfh/dist/recipe-manager");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const json_sync_parser_1 = __importStar(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const patch_text_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
require("@wfh/plink/wfh/dist/editor-helper");
// TODO: support file type other than "ts"
function generateConfig(file, opt) {
    return __awaiter(this, void 0, void 0, function* () {
        file = path_1.default.resolve(file);
        if (opt.dryRun) {
            __plink_1.default.logger.info('Dryrun mode');
        }
        const suffix = path_1.default.extname(file);
        if (suffix === '')
            file = file + '.ts';
        else if (suffix !== '.ts') {
            file = file.replace(/\.[^./\\]$/, '.ts');
            __plink_1.default.logger.warn('We recommend using Typescript file as configuration, which can provide type check in Visual Code editor.');
        }
        // if (!opt.dryRun) {
        //   fsex.mkdirpSync(Path.dirname(file));
        // }
        let isUnderSrcDir = false;
        const srcDirs = Array.from(recipe_manager_1.allSrcDirs()).map(item => item.srcDir);
        for (const { srcDir } of recipe_manager_1.allSrcDirs()) {
            if (file.startsWith(srcDir + path_1.default.sep)) {
                isUnderSrcDir = true;
                break;
            }
        }
        if (!isUnderSrcDir) {
            const projDir = package_mgr_1.getProjectList().find(prj => file.startsWith(path_1.default.resolve(prj) + path_1.default.sep));
            if (projDir) {
                let output;
                const projJsonFile = path_1.default.resolve(projDir, 'package.json');
                const jsonStr = fs_1.default.readFileSync(projJsonFile, 'utf8');
                const ast = json_sync_parser_1.default(jsonStr);
                const packagesAst = ast.properties.find(item => item.name.text === '"packages"');
                if (packagesAst) {
                    if (!json_sync_parser_1.isArrayAst(packagesAst.value)) {
                        throw new Error(`Invalid ${projJsonFile}, property "packages" must be Array type`);
                    }
                    const end = packagesAst.value.items[packagesAst.value.items.length - 1].end;
                    output = patch_text_1.default(jsonStr, [
                        {
                            start: end, end,
                            text: `,\n    ${JSON.stringify(path_1.default.relative(projDir, path_1.default.dirname(file)).replace(/\\/g, '/'))}`
                        }
                    ]);
                }
                else {
                    const end = ast.properties[ast.properties.length - 1].value.end;
                    output = patch_text_1.default(jsonStr, [
                        {
                            start: end, end,
                            text: `,\n  "packages": [${JSON.stringify(path_1.default.relative(projDir, path_1.default.dirname(file)).replace(/\\/g, '/'))}]`
                        }
                    ]);
                    // plink.logger.info(projJsonFile + ` is changed, you need to run command "${chalk.green('plink sync')}" to create a tsconfig file Editor`);
                }
                if (!opt.dryRun) {
                    fs_1.default.writeFileSync(projJsonFile, output);
                    yield new Promise(resolve => setImmediate(resolve));
                    // updateTsconfigFileForProjects(workspaceKey(process.cwd()), projDir);
                    package_mgr_1.actionDispatcher.scanAndSyncPackages({});
                    __plink_1.default.logger.info(projJsonFile + ' is updated.');
                }
            }
            else {
                __plink_1.default.logger.error(`The target file ${file} is not under any of associated project directories:\n`
                    + srcDirs.join('\n')
                    + '\n  A Typescript file will not get proper type checked in Editor without tsconfig file, Plink "sync" command can ' +
                    ' help to generate an Editor friendly tsconfig file, but it must be one of associated project directory');
                return;
            }
        }
        template_gen_1.default(path_1.default.resolve(__dirname, '../../template-gcfg'), path_1.default.dirname(file), {
            fileMapping: [[/foobar\.ts/, path_1.default.basename(file)]],
            textMapping: {
                settingValue: util_1.inspect(__plink_1.default.config(), false, 5).replace(/(\r?\n)([^])/mg, (match, p1, p2) => p1 + '    // ' + p2)
            }
        }, { dryrun: opt.dryRun });
    });
}
exports.generateConfig = generateConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdjZmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZ2NmZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0ZBQWlFO0FBQ2pFLCtCQUErQjtBQUMvQixnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDZCQUE2QjtBQUM3QixzREFBNEI7QUFFNUIsK0JBQTZCO0FBQzdCLHVFQUE4RDtBQUM5RCxpRUFBcUc7QUFDckcsK0ZBQTZFO0FBQzdFLHNGQUErRDtBQUMvRCw2Q0FBMkM7QUFHM0MsMENBQTBDO0FBQzFDLFNBQXNCLGNBQWMsQ0FBQyxJQUFZLEVBQUUsR0FBb0Q7O1FBQ3JHLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNkLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNsQztRQUNELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsSUFBSSxNQUFNLEtBQUssRUFBRTtZQUNmLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQ2pCLElBQUksTUFBTSxLQUFLLEtBQUssRUFBRTtZQUN6QixJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDekMsaUJBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBHQUEwRyxDQUFDLENBQUM7U0FDL0g7UUFFRCxxQkFBcUI7UUFDckIseUNBQXlDO1FBQ3pDLElBQUk7UUFFSixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDMUIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBVSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUs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QUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3pDLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsY0FBYyxDQUFDLENBQUM7aUJBQ2xEO2FBQ0Y7aUJBQU07Z0JBQ0wsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLG1CQUFtQixJQUFJLHdEQUF3RDtzQkFDOUYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7c0JBQ2xCLG1IQUFtSDtvQkFDckgsd0dBQXdHLENBQUMsQ0FBQztnQkFDNUcsT0FBTzthQUNSO1NBQ0Y7UUFFRCxzQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEYsV0FBVyxFQUFFLENBQUUsQ0FBQyxZQUFZLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFO1lBQ3BELFdBQVcsRUFBRTtnQkFDWCxZQUFZLEVBQUUsY0FBTyxDQUFDLGlCQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsU0FBUyxHQUFHLEVBQUUsQ0FBQzthQUNsSDtTQUNGLEVBQUUsRUFBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7SUFDM0IsQ0FBQztDQUFBO0FBOUVELHdDQThFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG4vLyBpbXBvcnQgZnNleCBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7aW5zcGVjdH0gZnJvbSAndXRpbCc7XG5pbXBvcnQge2FsbFNyY0RpcnN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHtnZXRQcm9qZWN0TGlzdCwgYWN0aW9uRGlzcGF0Y2hlciBhcyBwa2dNZ3JEaXNwYXRjaGVyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcbmltcG9ydCBwYXJzZSwge2lzQXJyYXlBc3R9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgcmVwbGFjZVRleHQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCAnQHdmaC9wbGluay93ZmgvZGlzdC9lZGl0b3ItaGVscGVyJztcblxuXG4vLyBUT0RPOiBzdXBwb3J0IGZpbGUgdHlwZSBvdGhlciB0aGFuIFwidHNcIlxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlQ29uZmlnKGZpbGU6IHN0cmluZywgb3B0OiB7ZHJ5UnVuOiBib29sZWFuLCB0eXBlOiAndHMnIHwgJ3lhbWwnIHwgJ2pzb24nfSkge1xuICBmaWxlID0gUGF0aC5yZXNvbHZlKGZpbGUpO1xuICBpZiAob3B0LmRyeVJ1bikge1xuICAgIHBsaW5rLmxvZ2dlci5pbmZvKCdEcnlydW4gbW9kZScpO1xuICB9XG4gIGNvbnN0IHN1ZmZpeCA9IFBhdGguZXh0bmFtZShmaWxlKTtcbiAgaWYgKHN1ZmZpeCA9PT0gJycpXG4gICAgZmlsZSA9IGZpbGUgKyAnLnRzJztcbiAgZWxzZSBpZiAoc3VmZml4ICE9PSAnLnRzJykge1xuICAgIGZpbGUgPSBmaWxlLnJlcGxhY2UoL1xcLlteLi9cXFxcXSQvLCAnLnRzJyk7XG4gICAgcGxpbmsubG9nZ2VyLndhcm4oJ1dlIHJlY29tbWVuZCB1c2luZyBUeXBlc2NyaXB0IGZpbGUgYXMgY29uZmlndXJhdGlvbiwgd2hpY2ggY2FuIHByb3ZpZGUgdHlwZSBjaGVjayBpbiBWaXN1YWwgQ29kZSBlZGl0b3IuJyk7XG4gIH1cblxuICAvLyBpZiAoIW9wdC5kcnlSdW4pIHtcbiAgLy8gICBmc2V4Lm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGZpbGUpKTtcbiAgLy8gfVxuXG4gIGxldCBpc1VuZGVyU3JjRGlyID0gZmFsc2U7XG4gIGNvbnN0IHNyY0RpcnMgPSBBcnJheS5mcm9tKGFsbFNyY0RpcnMoKSkubWFwKGl0ZW0gPT4gaXRlbS5zcmNEaXIpO1xuICBmb3IgKGNvbnN0IHtzcmNEaXJ9IG9mIGFsbFNyY0RpcnMoKSkge1xuICAgIGlmIChmaWxlLnN0YXJ0c1dpdGgoc3JjRGlyICsgUGF0aC5zZXApKSB7XG4gICAgICBpc1VuZGVyU3JjRGlyID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICghaXNVbmRlclNyY0Rpcikge1xuICAgIGNvbnN0IHByb2pEaXIgPSBnZXRQcm9qZWN0TGlzdCgpLmZpbmQocHJqID0+IGZpbGUuc3RhcnRzV2l0aChQYXRoLnJlc29sdmUocHJqKSArIFBhdGguc2VwKSk7XG4gICAgaWYgKHByb2pEaXIpIHtcbiAgICAgIGxldCBvdXRwdXQ6IHN0cmluZztcbiAgICAgIGNvbnN0IHByb2pKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICBjb25zdCBqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKHByb2pKc29uRmlsZSwgJ3V0ZjgnKTtcbiAgICAgIGNvbnN0IGFzdCA9IHBhcnNlKGpzb25TdHIpO1xuICAgICAgY29uc3QgcGFja2FnZXNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKGl0ZW0gPT4gaXRlbS5uYW1lLnRleHQgPT09ICdcInBhY2thZ2VzXCInKTtcbiAgICAgIGlmIChwYWNrYWdlc0FzdCkge1xuICAgICAgICBpZiAoIWlzQXJyYXlBc3QocGFja2FnZXNBc3QudmFsdWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7cHJvakpzb25GaWxlfSwgcHJvcGVydHkgXCJwYWNrYWdlc1wiIG11c3QgYmUgQXJyYXkgdHlwZWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVuZCA9IHBhY2thZ2VzQXN0LnZhbHVlLml0ZW1zW3BhY2thZ2VzQXN0LnZhbHVlLml0ZW1zLmxlbmd0aCAtIDFdLmVuZDtcbiAgICAgICAgb3V0cHV0ID0gcmVwbGFjZVRleHQoanNvblN0ciwgW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHN0YXJ0OiBlbmQsIGVuZCxcbiAgICAgICAgICAgIHRleHQ6IGAsXFxuICAgICR7SlNPTi5zdHJpbmdpZnkoUGF0aC5yZWxhdGl2ZShwcm9qRGlyLCBQYXRoLmRpcm5hbWUoZmlsZSkpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSl9YFxuICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBlbmQgPSBhc3QucHJvcGVydGllc1thc3QucHJvcGVydGllcy5sZW5ndGggLSAxXS52YWx1ZS5lbmQ7XG4gICAgICAgIG91dHB1dCA9IHJlcGxhY2VUZXh0KGpzb25TdHIsIFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzdGFydDogZW5kLCBlbmQsXG4gICAgICAgICAgICB0ZXh0OiBgLFxcbiAgXCJwYWNrYWdlc1wiOiBbJHtKU09OLnN0cmluZ2lmeShQYXRoLnJlbGF0aXZlKHByb2pEaXIsIFBhdGguZGlybmFtZShmaWxlKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKX1dYFxuICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgICAgIC8vIHBsaW5rLmxvZ2dlci5pbmZvKHByb2pKc29uRmlsZSArIGAgaXMgY2hhbmdlZCwgeW91IG5lZWQgdG8gcnVuIGNvbW1hbmQgXCIke2NoYWxrLmdyZWVuKCdwbGluayBzeW5jJyl9XCIgdG8gY3JlYXRlIGEgdHNjb25maWcgZmlsZSBFZGl0b3JgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFvcHQuZHJ5UnVuKSB7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocHJvakpzb25GaWxlLCBvdXRwdXQpO1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgICAgICAgLy8gdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpLCBwcm9qRGlyKTtcbiAgICAgICAgcGtnTWdyRGlzcGF0Y2hlci5zY2FuQW5kU3luY1BhY2thZ2VzKHt9KTtcbiAgICAgICAgcGxpbmsubG9nZ2VyLmluZm8ocHJvakpzb25GaWxlICsgJyBpcyB1cGRhdGVkLicpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwbGluay5sb2dnZXIuZXJyb3IoYFRoZSB0YXJnZXQgZmlsZSAke2ZpbGV9IGlzIG5vdCB1bmRlciBhbnkgb2YgYXNzb2NpYXRlZCBwcm9qZWN0IGRpcmVjdG9yaWVzOlxcbmBcbiAgICAgICAgKyBzcmNEaXJzLmpvaW4oJ1xcbicpXG4gICAgICAgICsgJ1xcbiAgQSBUeXBlc2NyaXB0IGZpbGUgd2lsbCBub3QgZ2V0IHByb3BlciB0eXBlIGNoZWNrZWQgaW4gRWRpdG9yIHdpdGhvdXQgdHNjb25maWcgZmlsZSwgUGxpbmsgXCJzeW5jXCIgY29tbWFuZCBjYW4gJyArXG4gICAgICAgICcgaGVscCB0byBnZW5lcmF0ZSBhbiBFZGl0b3IgZnJpZW5kbHkgdHNjb25maWcgZmlsZSwgYnV0IGl0IG11c3QgYmUgb25lIG9mIGFzc29jaWF0ZWQgcHJvamVjdCBkaXJlY3RvcnknKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtZ2NmZycpLCBQYXRoLmRpcm5hbWUoZmlsZSksIHtcbiAgICBmaWxlTWFwcGluZzogWyBbL2Zvb2JhclxcLnRzLywgUGF0aC5iYXNlbmFtZShmaWxlKV0gXSxcbiAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgc2V0dGluZ1ZhbHVlOiBpbnNwZWN0KHBsaW5rLmNvbmZpZygpLCBmYWxzZSwgNSkucmVwbGFjZSgvKFxccj9cXG4pKFteXSkvbWcsIChtYXRjaCwgcDEsIHAyKSA9PiBwMSArICcgICAgLy8gJyArIHAyKVxuICAgIH1cbiAgfSwge2RyeXJ1bjogb3B0LmRyeVJ1bn0pO1xufVxuIl19