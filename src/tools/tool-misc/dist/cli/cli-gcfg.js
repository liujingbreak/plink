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
async function generateConfig(file, opt) {
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
    const srcDirs = Array.from((0, recipe_manager_1.allSrcDirs)()).map(item => item.srcDir);
    for (const { srcDir } of (0, recipe_manager_1.allSrcDirs)()) {
        if (file.startsWith(srcDir + path_1.default.sep)) {
            isUnderSrcDir = true;
            break;
        }
    }
    if (!isUnderSrcDir) {
        const projDir = (0, package_mgr_1.getProjectList)().find(prj => file.startsWith(path_1.default.resolve(prj) + path_1.default.sep));
        if (projDir) {
            let output;
            const projJsonFile = path_1.default.resolve(projDir, 'package.json');
            const jsonStr = fs_1.default.readFileSync(projJsonFile, 'utf8');
            const ast = (0, json_sync_parser_1.default)(jsonStr);
            const packagesAst = ast.properties.find(item => item.name.text === '"packages"');
            if (packagesAst) {
                if (!(0, json_sync_parser_1.isArrayAst)(packagesAst.value)) {
                    throw new Error(`Invalid ${projJsonFile}, property "packages" must be Array type`);
                }
                const end = packagesAst.value.items[packagesAst.value.items.length - 1].end;
                output = (0, patch_text_1.default)(jsonStr, [
                    {
                        start: end, end,
                        text: `,\n    ${JSON.stringify(path_1.default.relative(projDir, path_1.default.dirname(file)).replace(/\\/g, '/'))}`
                    }
                ]);
            }
            else {
                const end = ast.properties[ast.properties.length - 1].value.end;
                output = (0, patch_text_1.default)(jsonStr, [
                    {
                        start: end, end,
                        text: `,\n  "packages": [${JSON.stringify(path_1.default.relative(projDir, path_1.default.dirname(file)).replace(/\\/g, '/'))}]`
                    }
                ]);
                // plink.logger.info(projJsonFile + ` is changed, you need to run command "${chalk.green('plink sync')}" to create a tsconfig file Editor`);
            }
            if (!opt.dryRun) {
                fs_1.default.writeFileSync(projJsonFile, output);
                await new Promise(resolve => setImmediate(resolve));
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
    await (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-gcfg'), path_1.default.dirname(file), {
        fileMapping: [[/foobar\.ts/, path_1.default.basename(file)]],
        textMapping: {
            settingValue: (0, util_1.inspect)(__plink_1.default.config(), false, 5).replace(/(\r?\n)([^])/mg, (match, p1, p2) => p1 + '    // ' + p2)
        }
    }, { dryrun: opt.dryRun });
}
exports.generateConfig = generateConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdjZmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZ2NmZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0ZBQWlFO0FBQ2pFLCtCQUErQjtBQUMvQixnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDZCQUE2QjtBQUM3QixzREFBNEI7QUFFNUIsK0JBQTZCO0FBQzdCLHVFQUE4RDtBQUM5RCxpRUFBcUc7QUFDckcsK0ZBQTZFO0FBQzdFLHNGQUErRDtBQUMvRCw2Q0FBMkM7QUFHM0MsMENBQTBDO0FBQ25DLEtBQUssVUFBVSxjQUFjLENBQUMsSUFBWSxFQUFFLEdBQW9EO0lBQ3JHLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtRQUNkLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztLQUNsQztJQUNELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEMsSUFBSSxNQUFNLEtBQUssRUFBRTtRQUNmLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDO1NBQ2pCLElBQUksTUFBTSxLQUFLLEtBQUssRUFBRTtRQUN6QixJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekMsaUJBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBHQUEwRyxDQUFDLENBQUM7S0FDL0g7SUFFRCxxQkFBcUI7SUFDckIseUNBQXlDO0lBQ3pDLElBQUk7SUFFSixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDMUIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFBLDJCQUFVLEdBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxD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RTtnQkFDdkUsOEJBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pDLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsY0FBYyxDQUFDLENBQUM7YUFDbEQ7U0FDRjthQUFNO1lBQ0wsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLG1CQUFtQixJQUFJLHdEQUF3RDtrQkFDOUYsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7a0JBQ2xCLG1IQUFtSDtnQkFDckgsd0dBQXdHLENBQUMsQ0FBQztZQUM1RyxPQUFPO1NBQ1I7S0FDRjtJQUVELE1BQU0sSUFBQSxzQkFBaUIsRUFBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDMUYsV0FBVyxFQUFFLENBQUUsQ0FBQyxZQUFZLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFO1FBQ3BELFdBQVcsRUFBRTtZQUNYLFlBQVksRUFBRSxJQUFBLGNBQU8sRUFBQyxpQkFBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLFNBQVMsR0FBRyxFQUFFLENBQUM7U0FDbEg7S0FDRixFQUFFLEVBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUE5RUQsd0NBOEVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGdlbmVyYXRlU3RydWN0dXJlIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdGVtcGxhdGUtZ2VuJztcbi8vIGltcG9ydCBmc2V4IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtpbnNwZWN0fSBmcm9tICd1dGlsJztcbmltcG9ydCB7YWxsU3JjRGlyc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQge2dldFByb2plY3RMaXN0LCBhY3Rpb25EaXNwYXRjaGVyIGFzIHBrZ01nckRpc3BhdGNoZXJ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuaW1wb3J0IHBhcnNlLCB7aXNBcnJheUFzdH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCByZXBsYWNlVGV4dCBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0ICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2VkaXRvci1oZWxwZXInO1xuXG5cbi8vIFRPRE86IHN1cHBvcnQgZmlsZSB0eXBlIG90aGVyIHRoYW4gXCJ0c1wiXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVDb25maWcoZmlsZTogc3RyaW5nLCBvcHQ6IHtkcnlSdW46IGJvb2xlYW47IHR5cGU6ICd0cycgfCAneWFtbCcgfCAnanNvbid9KSB7XG4gIGZpbGUgPSBQYXRoLnJlc29sdmUoZmlsZSk7XG4gIGlmIChvcHQuZHJ5UnVuKSB7XG4gICAgcGxpbmsubG9nZ2VyLmluZm8oJ0RyeXJ1biBtb2RlJyk7XG4gIH1cbiAgY29uc3Qgc3VmZml4ID0gUGF0aC5leHRuYW1lKGZpbGUpO1xuICBpZiAoc3VmZml4ID09PSAnJylcbiAgICBmaWxlID0gZmlsZSArICcudHMnO1xuICBlbHNlIGlmIChzdWZmaXggIT09ICcudHMnKSB7XG4gICAgZmlsZSA9IGZpbGUucmVwbGFjZSgvXFwuW14uL1xcXFxdJC8sICcudHMnKTtcbiAgICBwbGluay5sb2dnZXIud2FybignV2UgcmVjb21tZW5kIHVzaW5nIFR5cGVzY3JpcHQgZmlsZSBhcyBjb25maWd1cmF0aW9uLCB3aGljaCBjYW4gcHJvdmlkZSB0eXBlIGNoZWNrIGluIFZpc3VhbCBDb2RlIGVkaXRvci4nKTtcbiAgfVxuXG4gIC8vIGlmICghb3B0LmRyeVJ1bikge1xuICAvLyAgIGZzZXgubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZmlsZSkpO1xuICAvLyB9XG5cbiAgbGV0IGlzVW5kZXJTcmNEaXIgPSBmYWxzZTtcbiAgY29uc3Qgc3JjRGlycyA9IEFycmF5LmZyb20oYWxsU3JjRGlycygpKS5tYXAoaXRlbSA9PiBpdGVtLnNyY0Rpcik7XG4gIGZvciAoY29uc3Qge3NyY0Rpcn0gb2YgYWxsU3JjRGlycygpKSB7XG4gICAgaWYgKGZpbGUuc3RhcnRzV2l0aChzcmNEaXIgKyBQYXRoLnNlcCkpIHtcbiAgICAgIGlzVW5kZXJTcmNEaXIgPSB0cnVlO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFpc1VuZGVyU3JjRGlyKSB7XG4gICAgY29uc3QgcHJvakRpciA9IGdldFByb2plY3RMaXN0KCkuZmluZChwcmogPT4gZmlsZS5zdGFydHNXaXRoKFBhdGgucmVzb2x2ZShwcmopICsgUGF0aC5zZXApKTtcbiAgICBpZiAocHJvakRpcikge1xuICAgICAgbGV0IG91dHB1dDogc3RyaW5nO1xuICAgICAgY29uc3QgcHJvakpzb25GaWxlID0gUGF0aC5yZXNvbHZlKHByb2pEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGNvbnN0IGpzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocHJvakpzb25GaWxlLCAndXRmOCcpO1xuICAgICAgY29uc3QgYXN0ID0gcGFyc2UoanNvblN0cik7XG4gICAgICBjb25zdCBwYWNrYWdlc0FzdCA9IGFzdC5wcm9wZXJ0aWVzLmZpbmQoaXRlbSA9PiBpdGVtLm5hbWUudGV4dCA9PT0gJ1wicGFja2FnZXNcIicpO1xuICAgICAgaWYgKHBhY2thZ2VzQXN0KSB7XG4gICAgICAgIGlmICghaXNBcnJheUFzdChwYWNrYWdlc0FzdC52YWx1ZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtwcm9qSnNvbkZpbGV9LCBwcm9wZXJ0eSBcInBhY2thZ2VzXCIgbXVzdCBiZSBBcnJheSB0eXBlYCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW5kID0gcGFja2FnZXNBc3QudmFsdWUuaXRlbXNbcGFja2FnZXNBc3QudmFsdWUuaXRlbXMubGVuZ3RoIC0gMV0uZW5kO1xuICAgICAgICBvdXRwdXQgPSByZXBsYWNlVGV4dChqc29uU3RyLCBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3RhcnQ6IGVuZCwgZW5kLFxuICAgICAgICAgICAgdGV4dDogYCxcXG4gICAgJHtKU09OLnN0cmluZ2lmeShQYXRoLnJlbGF0aXZlKHByb2pEaXIsIFBhdGguZGlybmFtZShmaWxlKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpKX1gXG4gICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVuZCA9IGFzdC5wcm9wZXJ0aWVzW2FzdC5wcm9wZXJ0aWVzLmxlbmd0aCAtIDFdLnZhbHVlLmVuZDtcbiAgICAgICAgb3V0cHV0ID0gcmVwbGFjZVRleHQoanNvblN0ciwgW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHN0YXJ0OiBlbmQsIGVuZCxcbiAgICAgICAgICAgIHRleHQ6IGAsXFxuICBcInBhY2thZ2VzXCI6IFske0pTT04uc3RyaW5naWZ5KFBhdGgucmVsYXRpdmUocHJvakRpciwgUGF0aC5kaXJuYW1lKGZpbGUpKS5yZXBsYWNlKC9cXFxcL2csICcvJykpfV1gXG4gICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICAgICAgLy8gcGxpbmsubG9nZ2VyLmluZm8ocHJvakpzb25GaWxlICsgYCBpcyBjaGFuZ2VkLCB5b3UgbmVlZCB0byBydW4gY29tbWFuZCBcIiR7Y2hhbGsuZ3JlZW4oJ3BsaW5rIHN5bmMnKX1cIiB0byBjcmVhdGUgYSB0c2NvbmZpZyBmaWxlIEVkaXRvcmApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW9wdC5kcnlSdW4pIHtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwcm9qSnNvbkZpbGUsIG91dHB1dCk7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgICAgICAgLy8gdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpLCBwcm9qRGlyKTtcbiAgICAgICAgcGtnTWdyRGlzcGF0Y2hlci5zY2FuQW5kU3luY1BhY2thZ2VzKHt9KTtcbiAgICAgICAgcGxpbmsubG9nZ2VyLmluZm8ocHJvakpzb25GaWxlICsgJyBpcyB1cGRhdGVkLicpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwbGluay5sb2dnZXIuZXJyb3IoYFRoZSB0YXJnZXQgZmlsZSAke2ZpbGV9IGlzIG5vdCB1bmRlciBhbnkgb2YgYXNzb2NpYXRlZCBwcm9qZWN0IGRpcmVjdG9yaWVzOlxcbmBcbiAgICAgICAgKyBzcmNEaXJzLmpvaW4oJ1xcbicpXG4gICAgICAgICsgJ1xcbiAgQSBUeXBlc2NyaXB0IGZpbGUgd2lsbCBub3QgZ2V0IHByb3BlciB0eXBlIGNoZWNrZWQgaW4gRWRpdG9yIHdpdGhvdXQgdHNjb25maWcgZmlsZSwgUGxpbmsgXCJzeW5jXCIgY29tbWFuZCBjYW4gJyArXG4gICAgICAgICcgaGVscCB0byBnZW5lcmF0ZSBhbiBFZGl0b3IgZnJpZW5kbHkgdHNjb25maWcgZmlsZSwgYnV0IGl0IG11c3QgYmUgb25lIG9mIGFzc29jaWF0ZWQgcHJvamVjdCBkaXJlY3RvcnknKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtZ2NmZycpLCBQYXRoLmRpcm5hbWUoZmlsZSksIHtcbiAgICBmaWxlTWFwcGluZzogWyBbL2Zvb2JhclxcLnRzLywgUGF0aC5iYXNlbmFtZShmaWxlKV0gXSxcbiAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgc2V0dGluZ1ZhbHVlOiBpbnNwZWN0KHBsaW5rLmNvbmZpZygpLCBmYWxzZSwgNSkucmVwbGFjZSgvKFxccj9cXG4pKFteXSkvbWcsIChtYXRjaCwgcDEsIHAyKSA9PiBwMSArICcgICAgLy8gJyArIHAyKVxuICAgIH1cbiAgfSwge2RyeXJ1bjogb3B0LmRyeVJ1bn0pO1xufVxuIl19