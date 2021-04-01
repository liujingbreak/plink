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
const plink_1 = require("@wfh/plink");
// import {pathToProjKey} from '@wfh/plink/wfh/dist/package-mgr';
const log = plink_1.logger.getLogger('cra');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktaW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2RUFBNkU7QUFDN0Usb0ZBQW9GO0FBQ3BGLGtHQUE4RTtBQUM5RSxzRkFBc0Y7QUFDdEYsNENBQW9CO0FBQ3BCLHNDQUE0QztBQUU1QyxpRUFBaUU7QUFFakUsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVwQywwSEFBMEg7QUFDMUgseUJBQXlCO0FBRXpCLFNBQXNCLFlBQVk7O1FBQ2hDLHVGQUF1RjtRQUN2RixnQkFBZ0IsRUFBRSxDQUFDO0lBQ3JCLENBQUM7Q0FBQTtBQUhELG9DQUdDO0FBRUQsU0FBUyxnQkFBZ0I7SUFDdkIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO0lBRXJJLElBQUksV0FBVyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNELE1BQU0sR0FBRyxHQUFHLDBCQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDL0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEYsdUdBQXVHO0lBQ3ZHLE1BQU0sY0FBYyxHQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUUsQ0FBQyxLQUFtQixDQUFDLFVBQVUsQ0FBQztJQUNwRixNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzNFLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0YsTUFBTSxZQUFZLEdBQXFCLENBQUM7WUFDdEMsS0FBSyxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsY0FBYztZQUMxQyxXQUFXLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUM7SUFFSCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1FBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELFlBQVksQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLGNBQWM7Z0JBQzFDLFdBQVcsRUFBRSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO2FBQ3pELENBQUMsQ0FBQztTQUNKO0tBQ0Y7SUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzdCLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzNCO0lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBRSxDQUFDLEtBQWtCLENBQUM7SUFDOUQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsQ0FBQztJQUM5RSxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7UUFDbkIsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDO1lBQzdELFdBQVcsRUFBRSx1QkFBdUIsRUFBQyxDQUFDLENBQUM7S0FDMUM7SUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLFdBQVcsR0FBRyxvQkFBYyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN4RCxZQUFFLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMvQyxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7S0FDdkM7QUFDSCxDQUFDO0FBR0QsU0FBd0IsU0FBUztBQUNqQyxDQUFDO0FBREQsNEJBQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgcGFyc2VKc29uLCB7QXN0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuLy8gaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgcGFyc2UsIHsgT2JqZWN0QXN0IH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCByZXBsYWNlUGF0Y2hlcywgeyBSZXBsYWNlbWVudEluZiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtsb2dnZXIgYXMgbG9nNGpzfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQge3BhdGhUb1Byb2pLZXl9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdjcmEnKTtcblxuLy8gY29uc3QgREVGQVVMVF9ERVBTID0gWydyZWFjdC1hcHAtcG9seWZpbGwnLCAnQHdmaC9jcmEtc2NyaXB0cycsICdAd2ZoL3dlYnBhY2stY29tbW9uJywgJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJyxcbi8vICAgJ2F4aW9zLW9ic2VydmFibGUnXTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXRUc2NvbmZpZygpIHtcbiAgLy8gY29uc3Qge2RlZmF1bHQ6IHBhcnNlfSA9IGF3YWl0IGltcG9ydCgnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJyk7XG4gIG92ZXJyaWRlVHNDb25maWcoKTtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZygpIHtcbiAgY29uc3QgYmFzZUNvbXBpbGVPcHRpb25zID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSwgJ3V0ZjgnKSkuY29tcGlsZXJPcHRpb25zO1xuXG4gIGxldCBmaWxlQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYygndHNjb25maWcuanNvbicsICd1dGY4Jyk7XG4gIGNvbnN0IGFzdCA9IHBhcnNlKGZpbGVDb250ZW50KTtcbiAgbGV0IHBNYXAgPSBuZXcgTWFwKGFzdC5wcm9wZXJ0aWVzLm1hcChlbCA9PiBbL15cIiguKilcIiQvLmV4ZWMoZWwubmFtZS50ZXh0KSFbMV0sIGVsXSkpO1xuXG4gIC8vIER1ZSB0byByZWFjdC1zY3JpcHRzIGRvZXMgbm90IHJlY29nYW5pemUgXCJleHRlbmRzXCIgaW4gdHNjb25maWcuanNvbjogcmVhY3Qtc2NyaXB0cy9jb25maWcvbW9kdWxlcy5qc1xuICBjb25zdCBjdXJyQ29Qcm9wc0FzdCA9IChwTWFwLmdldCgnY29tcGlsZXJPcHRpb25zJykhLnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcztcbiAgY29uc3QgbGFzdFByb3BFbmRQb3MgPSBjdXJyQ29Qcm9wc0FzdFtjdXJyQ29Qcm9wc0FzdC5sZW5ndGggLSAxXS52YWx1ZS5lbmQ7XG4gIGNvbnN0IGN1cnJDb01hcCA9IG5ldyBNYXAoY3VyckNvUHJvcHNBc3QubWFwKGVsID0+IFsvXlwiKC4qKVwiJC8uZXhlYyhlbC5uYW1lLnRleHQpIVsxXSwgZWxdKSk7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFt7XG4gICAgc3RhcnQ6IGxhc3RQcm9wRW5kUG9zLCBlbmQ6IGxhc3RQcm9wRW5kUG9zLFxuICAgIHJlcGxhY2VtZW50OiAnXFxuJ1xuICB9XTtcblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhiYXNlQ29tcGlsZU9wdGlvbnMpKSB7XG4gICAgaWYgKCFjdXJyQ29NYXAuaGFzKGtleSkpIHtcbiAgICAgIGxvZy5pbmZvKGBBZGQgY29tcGlsZXIgb3B0aW9uOiAke2tleX06JHt2YWx1ZX1gKTtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IGxhc3RQcm9wRW5kUG9zLCBlbmQ6IGxhc3RQcm9wRW5kUG9zLFxuICAgICAgICByZXBsYWNlbWVudDogYCxcXG4gICAgXCIke2tleX1cIjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmVwbGFjZW1lbnRzLnNwbGljZSgwLCAxKTtcbiAgfVxuXG4gIGNvbnN0IGNvQXN0ID0gcE1hcC5nZXQoJ2NvbXBpbGVyT3B0aW9ucycpIS52YWx1ZSBhcyBPYmplY3RBc3Q7XG4gIGNvbnN0IHJvb3REaXIgPSBjb0FzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wicm9vdERpclwiJyk7XG4gIGlmIChyb290RGlyID09IG51bGwpIHtcbiAgICByZXBsYWNlbWVudHMucHVzaCh7c3RhcnQ6IGNvQXN0LnN0YXJ0ICsgMSwgZW5kOiBjb0FzdC5zdGFydCArIDEsXG4gICAgICByZXBsYWNlbWVudDogJ1xcbiAgICBcInJvb3REaXJcIjogXCIuXCIsJ30pO1xuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGZpbGVDb250ZW50ID0gcmVwbGFjZVBhdGNoZXMoZmlsZUNvbnRlbnQsIHJlcGxhY2VtZW50cyk7XG4gICAgZnMud3JpdGVGaWxlU3luYygndHNjb25maWcuanNvbicsIGZpbGVDb250ZW50KTtcbiAgICBsb2cuaW5mbygndHNjb25maWcuanNvbiBpcyB1cGRhdGVkLicpO1xuICB9XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdFJlZHV4KCkge1xufVxuIl19