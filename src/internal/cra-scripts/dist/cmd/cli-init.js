"use strict";
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
exports.initTsconfig = void 0;
// import parseJson, {Ast} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
// import replaceCode, {ReplacementInf} from '@wfh/plink/wfh/dist/utils/patch-text';
const json_sync_parser_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const patch_text_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
const fs_1 = __importDefault(require("fs"));
const log4js_1 = __importDefault(require("log4js"));
// import {pathToProjKey} from '@wfh/plink/wfh/dist/package-mgr';
const log = log4js_1.default.getLogger('cra');
// const DEFAULT_DEPS = ['react-app-polyfill', '@wfh/cra-scripts', '@wfh/webpack-common', '@wfh/redux-toolkit-observable',
//   'axios-observable'];
function initTsconfig() {
    return __awaiter(this, void 0, void 0, function* () {
        // const {default: parse} = await import('@wfh/plink/wfh/dist/utils/json-sync-parser');
        overrideTsConfig();
    });
}
exports.initTsconfig = initTsconfig;
function overrideTsConfig() {
    const baseCompileOptions = JSON.parse(fs_1.default.readFileSync(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), 'utf8')).compilerOptions;
    let fileContent = fs_1.default.readFileSync('tsconfig.json', 'utf8');
    const ast = json_sync_parser_1.default(fileContent);
    let pMap = new Map(ast.properties.map(el => [/^"(.*)"$/.exec(el.name.text)[1], el]));
    // Due to react-scripts does not recoganize "extends" in tsconfig.json: react-scripts/config/modules.js
    const currCoPropsAst = pMap.get('compilerOptions').value.properties;
    const lastPropEndPos = currCoPropsAst[currCoPropsAst.length - 1].value.end;
    const currCoMap = new Map(currCoPropsAst.map(el => [/^"(.*)"$/.exec(el.name.text)[1], el]));
    const replacements = [{
            start: lastPropEndPos, end: lastPropEndPos,
            replacement: '\n'
        }];
    for (const [key, value] of Object.entries(baseCompileOptions)) {
        if (!currCoMap.has(key)) {
            log.info(`Add compiler option: ${key}:${value}`);
            replacements.push({
                start: lastPropEndPos, end: lastPropEndPos,
                replacement: `,\n    "${key}": ${JSON.stringify(value)}`
            });
        }
    }
    if (replacements.length === 1) {
        replacements.splice(0, 1);
    }
    const coAst = pMap.get('compilerOptions').value;
    const rootDir = coAst.properties.find(prop => prop.name.text === '"rootDir"');
    if (rootDir == null) {
        replacements.push({ start: coAst.start + 1, end: coAst.start + 1,
            replacement: '\n    "rootDir": ".",' });
    }
    if (replacements.length > 0) {
        fileContent = patch_text_1.default(fileContent, replacements);
        fs_1.default.writeFileSync('tsconfig.json', fileContent);
        log.info('tsconfig.json is updated.');
    }
}
function initRedux() {
}
exports.default = initRedux;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktaW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2RUFBNkU7QUFDN0Usb0ZBQW9GO0FBQ3BGLGtHQUE4RTtBQUM5RSxzRkFBc0Y7QUFDdEYsNENBQW9CO0FBQ3BCLG9EQUE0QjtBQUU1QixpRUFBaUU7QUFFakUsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFcEMsMEhBQTBIO0FBQzFILHlCQUF5QjtBQUV6QixTQUFzQixZQUFZOztRQUNoQyx1RkFBdUY7UUFDdkYsZ0JBQWdCLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQUE7QUFIRCxvQ0FHQztBQUVELFNBQVMsZ0JBQWdCO0lBQ3ZCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztJQUVySSxJQUFJLFdBQVcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMzRCxNQUFNLEdBQUcsR0FBRywwQkFBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQy9CLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXRGLHVHQUF1RztJQUN2RyxNQUFNLGNBQWMsR0FBSSxJQUFJLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFFLENBQUMsS0FBbUIsQ0FBQyxVQUFVLENBQUM7SUFDcEYsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUMzRSxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdGLE1BQU0sWUFBWSxHQUFxQixDQUFDO1lBQ3RDLEtBQUssRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLGNBQWM7WUFDMUMsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO0lBRUgsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsRUFBRTtRQUM3RCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNqRCxZQUFZLENBQUMsSUFBSSxDQUFDO2dCQUNoQixLQUFLLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxjQUFjO2dCQUMxQyxXQUFXLEVBQUUsV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTthQUN6RCxDQUFDLENBQUM7U0FDSjtLQUNGO0lBQ0QsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUM3QixZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUMzQjtJQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUUsQ0FBQyxLQUFrQixDQUFDO0lBQzlELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLENBQUM7SUFDOUUsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1FBQ25CLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQztZQUM3RCxXQUFXLEVBQUUsdUJBQXVCLEVBQUMsQ0FBQyxDQUFDO0tBQzFDO0lBQ0QsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMzQixXQUFXLEdBQUcsb0JBQWMsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDeEQsWUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDL0MsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0tBQ3ZDO0FBQ0gsQ0FBQztBQUdELFNBQXdCLFNBQVM7QUFDakMsQ0FBQztBQURELDRCQUNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHBhcnNlSnNvbiwge0FzdH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbi8vIGltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHBhcnNlLCB7IE9iamVjdEFzdCB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgcmVwbGFjZVBhdGNoZXMsIHsgUmVwbGFjZW1lbnRJbmYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQge3BhdGhUb1Byb2pLZXl9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdjcmEnKTtcblxuLy8gY29uc3QgREVGQVVMVF9ERVBTID0gWydyZWFjdC1hcHAtcG9seWZpbGwnLCAnQHdmaC9jcmEtc2NyaXB0cycsICdAd2ZoL3dlYnBhY2stY29tbW9uJywgJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJyxcbi8vICAgJ2F4aW9zLW9ic2VydmFibGUnXTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXRUc2NvbmZpZygpIHtcbiAgLy8gY29uc3Qge2RlZmF1bHQ6IHBhcnNlfSA9IGF3YWl0IGltcG9ydCgnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJyk7XG4gIG92ZXJyaWRlVHNDb25maWcoKTtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZygpIHtcbiAgY29uc3QgYmFzZUNvbXBpbGVPcHRpb25zID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSwgJ3V0ZjgnKSkuY29tcGlsZXJPcHRpb25zO1xuXG4gIGxldCBmaWxlQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYygndHNjb25maWcuanNvbicsICd1dGY4Jyk7XG4gIGNvbnN0IGFzdCA9IHBhcnNlKGZpbGVDb250ZW50KTtcbiAgbGV0IHBNYXAgPSBuZXcgTWFwKGFzdC5wcm9wZXJ0aWVzLm1hcChlbCA9PiBbL15cIiguKilcIiQvLmV4ZWMoZWwubmFtZS50ZXh0KSFbMV0sIGVsXSkpO1xuXG4gIC8vIER1ZSB0byByZWFjdC1zY3JpcHRzIGRvZXMgbm90IHJlY29nYW5pemUgXCJleHRlbmRzXCIgaW4gdHNjb25maWcuanNvbjogcmVhY3Qtc2NyaXB0cy9jb25maWcvbW9kdWxlcy5qc1xuICBjb25zdCBjdXJyQ29Qcm9wc0FzdCA9IChwTWFwLmdldCgnY29tcGlsZXJPcHRpb25zJykhLnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcztcbiAgY29uc3QgbGFzdFByb3BFbmRQb3MgPSBjdXJyQ29Qcm9wc0FzdFtjdXJyQ29Qcm9wc0FzdC5sZW5ndGggLSAxXS52YWx1ZS5lbmQ7XG4gIGNvbnN0IGN1cnJDb01hcCA9IG5ldyBNYXAoY3VyckNvUHJvcHNBc3QubWFwKGVsID0+IFsvXlwiKC4qKVwiJC8uZXhlYyhlbC5uYW1lLnRleHQpIVsxXSwgZWxdKSk7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFt7XG4gICAgc3RhcnQ6IGxhc3RQcm9wRW5kUG9zLCBlbmQ6IGxhc3RQcm9wRW5kUG9zLFxuICAgIHJlcGxhY2VtZW50OiAnXFxuJ1xuICB9XTtcblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhiYXNlQ29tcGlsZU9wdGlvbnMpKSB7XG4gICAgaWYgKCFjdXJyQ29NYXAuaGFzKGtleSkpIHtcbiAgICAgIGxvZy5pbmZvKGBBZGQgY29tcGlsZXIgb3B0aW9uOiAke2tleX06JHt2YWx1ZX1gKTtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IGxhc3RQcm9wRW5kUG9zLCBlbmQ6IGxhc3RQcm9wRW5kUG9zLFxuICAgICAgICByZXBsYWNlbWVudDogYCxcXG4gICAgXCIke2tleX1cIjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmVwbGFjZW1lbnRzLnNwbGljZSgwLCAxKTtcbiAgfVxuXG4gIGNvbnN0IGNvQXN0ID0gcE1hcC5nZXQoJ2NvbXBpbGVyT3B0aW9ucycpIS52YWx1ZSBhcyBPYmplY3RBc3Q7XG4gIGNvbnN0IHJvb3REaXIgPSBjb0FzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wicm9vdERpclwiJyk7XG4gIGlmIChyb290RGlyID09IG51bGwpIHtcbiAgICByZXBsYWNlbWVudHMucHVzaCh7c3RhcnQ6IGNvQXN0LnN0YXJ0ICsgMSwgZW5kOiBjb0FzdC5zdGFydCArIDEsXG4gICAgICByZXBsYWNlbWVudDogJ1xcbiAgICBcInJvb3REaXJcIjogXCIuXCIsJ30pO1xuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGZpbGVDb250ZW50ID0gcmVwbGFjZVBhdGNoZXMoZmlsZUNvbnRlbnQsIHJlcGxhY2VtZW50cyk7XG4gICAgZnMud3JpdGVGaWxlU3luYygndHNjb25maWcuanNvbicsIGZpbGVDb250ZW50KTtcbiAgICBsb2cuaW5mbygndHNjb25maWcuanNvbiBpcyB1cGRhdGVkLicpO1xuICB9XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdFJlZHV4KCkge1xufVxuIl19