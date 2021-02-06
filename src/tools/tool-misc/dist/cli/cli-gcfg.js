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
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// import chalk from 'chalk';
const __plink_1 = __importDefault(require("__plink"));
const util_1 = require("util");
const recipe_manager_1 = require("@wfh/plink/wfh/dist/recipe-manager");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const json_sync_parser_1 = __importStar(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const patch_text_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
// import {updateTsconfigFileForProjects} from '@wfh/plink/wfh/dist/editor-helper';
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
        if (!opt.dryRun) {
            fs_extra_1.default.mkdirpSync(path_1.default.dirname(file));
        }
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
                    package_mgr_1.actionDispatcher.updateWorkspace({ dir: process.cwd(), isForce: false, createHook: false });
                    __plink_1.default.logger.info(projJsonFile + ' is updated.');
                }
            }
            else {
                __plink_1.default.logger.error(`The target file ${file} is not under any of associated project directories:\n`
                    + srcDirs.join('\n')
                    + '\n  A Typescript file will not get proper type checked in Editor without tsconfig file, Plink "init" command can ' +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdjZmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZ2NmZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0ZBQWlFO0FBQ2pFLHdEQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDZCQUE2QjtBQUM3QixzREFBNEI7QUFFNUIsK0JBQTZCO0FBQzdCLHVFQUE4RDtBQUM5RCxpRUFBcUc7QUFDckcsK0ZBQTZFO0FBQzdFLHNGQUErRDtBQUMvRCxtRkFBbUY7QUFHbkYsMENBQTBDO0FBQzFDLFNBQXNCLGNBQWMsQ0FBQyxJQUFZLEVBQUUsR0FBb0Q7O1FBQ3JHLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNkLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNsQztRQUNELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsSUFBSSxNQUFNLEtBQUssRUFBRTtZQUNmLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDO2FBQ2pCLElBQUksTUFBTSxLQUFLLEtBQUssRUFBRTtZQUN6QixJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDekMsaUJBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBHQUEwRyxDQUFDLENBQUM7U0FDL0g7UUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNmLGtCQUFJLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNyQztRQUVELElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztRQUMxQixNQUFNLE9BQU8s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cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQgZnNleCBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7aW5zcGVjdH0gZnJvbSAndXRpbCc7XG5pbXBvcnQge2FsbFNyY0RpcnN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHtnZXRQcm9qZWN0TGlzdCwgYWN0aW9uRGlzcGF0Y2hlciBhcyBwa2dNZ3JEaXNwYXRjaGVyfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcbmltcG9ydCBwYXJzZSwge2lzQXJyYXlBc3R9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgcmVwbGFjZVRleHQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0Jztcbi8vIGltcG9ydCB7dXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvZWRpdG9yLWhlbHBlcic7XG5cblxuLy8gVE9ETzogc3VwcG9ydCBmaWxlIHR5cGUgb3RoZXIgdGhhbiBcInRzXCJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZUNvbmZpZyhmaWxlOiBzdHJpbmcsIG9wdDoge2RyeVJ1bjogYm9vbGVhbiwgdHlwZTogJ3RzJyB8ICd5YW1sJyB8ICdqc29uJ30pIHtcbiAgZmlsZSA9IFBhdGgucmVzb2x2ZShmaWxlKTtcbiAgaWYgKG9wdC5kcnlSdW4pIHtcbiAgICBwbGluay5sb2dnZXIuaW5mbygnRHJ5cnVuIG1vZGUnKTtcbiAgfVxuICBjb25zdCBzdWZmaXggPSBQYXRoLmV4dG5hbWUoZmlsZSk7XG4gIGlmIChzdWZmaXggPT09ICcnKVxuICAgIGZpbGUgPSBmaWxlICsgJy50cyc7XG4gIGVsc2UgaWYgKHN1ZmZpeCAhPT0gJy50cycpIHtcbiAgICBmaWxlID0gZmlsZS5yZXBsYWNlKC9cXC5bXi4vXFxcXF0kLywgJy50cycpO1xuICAgIHBsaW5rLmxvZ2dlci53YXJuKCdXZSByZWNvbW1lbmQgdXNpbmcgVHlwZXNjcmlwdCBmaWxlIGFzIGNvbmZpZ3VyYXRpb24sIHdoaWNoIGNhbiBwcm92aWRlIHR5cGUgY2hlY2sgaW4gVmlzdWFsIENvZGUgZWRpdG9yLicpO1xuICB9XG5cbiAgaWYgKCFvcHQuZHJ5UnVuKSB7XG4gICAgZnNleC5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShmaWxlKSk7XG4gIH1cblxuICBsZXQgaXNVbmRlclNyY0RpciA9IGZhbHNlO1xuICBjb25zdCBzcmNEaXJzID0gQXJyYXkuZnJvbShhbGxTcmNEaXJzKCkpLm1hcChpdGVtID0+IGl0ZW0uc3JjRGlyKTtcbiAgZm9yIChjb25zdCB7c3JjRGlyfSBvZiBhbGxTcmNEaXJzKCkpIHtcbiAgICBpZiAoZmlsZS5zdGFydHNXaXRoKHNyY0RpciArIFBhdGguc2VwKSkge1xuICAgICAgaXNVbmRlclNyY0RpciA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoIWlzVW5kZXJTcmNEaXIpIHtcbiAgICBjb25zdCBwcm9qRGlyID0gZ2V0UHJvamVjdExpc3QoKS5maW5kKHByaiA9PiBmaWxlLnN0YXJ0c1dpdGgoUGF0aC5yZXNvbHZlKHByaikgKyBQYXRoLnNlcCkpO1xuICAgIGlmIChwcm9qRGlyKSB7XG4gICAgICBsZXQgb3V0cHV0OiBzdHJpbmc7XG4gICAgICBjb25zdCBwcm9qSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUocHJvakRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgY29uc3QganNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhwcm9qSnNvbkZpbGUsICd1dGY4Jyk7XG4gICAgICBjb25zdCBhc3QgPSBwYXJzZShqc29uU3RyKTtcbiAgICAgIGNvbnN0IHBhY2thZ2VzQXN0ID0gYXN0LnByb3BlcnRpZXMuZmluZChpdGVtID0+IGl0ZW0ubmFtZS50ZXh0ID09PSAnXCJwYWNrYWdlc1wiJyk7XG4gICAgICBpZiAocGFja2FnZXNBc3QpIHtcbiAgICAgICAgaWYgKCFpc0FycmF5QXN0KHBhY2thZ2VzQXN0LnZhbHVlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke3Byb2pKc29uRmlsZX0sIHByb3BlcnR5IFwicGFja2FnZXNcIiBtdXN0IGJlIEFycmF5IHR5cGVgKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbmQgPSBwYWNrYWdlc0FzdC52YWx1ZS5pdGVtc1twYWNrYWdlc0FzdC52YWx1ZS5pdGVtcy5sZW5ndGggLSAxXS5lbmQ7XG4gICAgICAgIG91dHB1dCA9IHJlcGxhY2VUZXh0KGpzb25TdHIsIFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzdGFydDogZW5kLCBlbmQsXG4gICAgICAgICAgICB0ZXh0OiBgLFxcbiAgICAke0pTT04uc3RyaW5naWZ5KFBhdGgucmVsYXRpdmUocHJvakRpciwgUGF0aC5kaXJuYW1lKGZpbGUpKS5yZXBsYWNlKC9cXFxcL2csICcvJykpfWBcbiAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZW5kID0gYXN0LnByb3BlcnRpZXNbYXN0LnByb3BlcnRpZXMubGVuZ3RoIC0gMV0udmFsdWUuZW5kO1xuICAgICAgICBvdXRwdXQgPSByZXBsYWNlVGV4dChqc29uU3RyLCBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3RhcnQ6IGVuZCwgZW5kLFxuICAgICAgICAgICAgdGV4dDogYCxcXG4gIFwicGFja2FnZXNcIjogWyR7SlNPTi5zdHJpbmdpZnkoUGF0aC5yZWxhdGl2ZShwcm9qRGlyLCBQYXRoLmRpcm5hbWUoZmlsZSkpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSl9XWBcbiAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgICAgICAvLyBwbGluay5sb2dnZXIuaW5mbyhwcm9qSnNvbkZpbGUgKyBgIGlzIGNoYW5nZWQsIHlvdSBuZWVkIHRvIHJ1biBjb21tYW5kIFwiJHtjaGFsay5ncmVlbigncGxpbmsgc3luYycpfVwiIHRvIGNyZWF0ZSBhIHRzY29uZmlnIGZpbGUgRWRpdG9yYCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghb3B0LmRyeVJ1bikge1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHByb2pKc29uRmlsZSwgb3V0cHV0KTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgICAgICAgIC8vIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKSwgcHJvakRpcik7XG4gICAgICAgIHBrZ01nckRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHByb2Nlc3MuY3dkKCksIGlzRm9yY2U6IGZhbHNlLCBjcmVhdGVIb29rOiBmYWxzZX0pO1xuICAgICAgICBwbGluay5sb2dnZXIuaW5mbyhwcm9qSnNvbkZpbGUgKyAnIGlzIHVwZGF0ZWQuJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBsaW5rLmxvZ2dlci5lcnJvcihgVGhlIHRhcmdldCBmaWxlICR7ZmlsZX0gaXMgbm90IHVuZGVyIGFueSBvZiBhc3NvY2lhdGVkIHByb2plY3QgZGlyZWN0b3JpZXM6XFxuYFxuICAgICAgICArIHNyY0RpcnMuam9pbignXFxuJylcbiAgICAgICAgKyAnXFxuICBBIFR5cGVzY3JpcHQgZmlsZSB3aWxsIG5vdCBnZXQgcHJvcGVyIHR5cGUgY2hlY2tlZCBpbiBFZGl0b3Igd2l0aG91dCB0c2NvbmZpZyBmaWxlLCBQbGluayBcImluaXRcIiBjb21tYW5kIGNhbiAnICtcbiAgICAgICAgJyBoZWxwIHRvIGdlbmVyYXRlIGFuIEVkaXRvciBmcmllbmRseSB0c2NvbmZpZyBmaWxlLCBidXQgaXQgbXVzdCBiZSBvbmUgb2YgYXNzb2NpYXRlZCBwcm9qZWN0IGRpcmVjdG9yeScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1nY2ZnJyksIFBhdGguZGlybmFtZShmaWxlKSwge1xuICAgIGZpbGVNYXBwaW5nOiBbIFsvZm9vYmFyXFwudHMvLCBQYXRoLmJhc2VuYW1lKGZpbGUpXSBdLFxuICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICBzZXR0aW5nVmFsdWU6IGluc3BlY3QocGxpbmsuY29uZmlnKCksIGZhbHNlLCA1KS5yZXBsYWNlKC8oXFxyP1xcbikoW15dKS9tZywgKG1hdGNoLCBwMSwgcDIpID0+IHAxICsgJyAgICAvLyAnICsgcDIpXG4gICAgfVxuICB9LCB7ZHJ5cnVuOiBvcHQuZHJ5UnVufSk7XG59XG4iXX0=