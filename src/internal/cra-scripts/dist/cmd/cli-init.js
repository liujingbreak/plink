"use strict";
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
    // const {default: parse} = await import('@wfh/plink/wfh/dist/utils/json-sync-parser');
    overrideTsConfig();
}
exports.initTsconfig = initTsconfig;
function overrideTsConfig() {
    const baseCompileOptions = JSON.parse(fs_1.default.readFileSync(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), 'utf8')).compilerOptions;
    let fileContent = fs_1.default.readFileSync('tsconfig.json', 'utf8');
    const ast = (0, json_sync_parser_1.default)(fileContent);
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
            log.info(`Add compiler option: ${key}:${JSON.stringify(value)}`);
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
        fileContent = (0, patch_text_1.default)(fileContent, replacements);
        fs_1.default.writeFileSync('tsconfig.json', fileContent);
        log.info('tsconfig.json is updated.');
    }
}
function initRedux() {
}
exports.default = initRedux;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktaW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2RUFBNkU7QUFDN0Usb0ZBQW9GO0FBQ3BGLGtHQUE4RTtBQUM5RSxzRkFBc0Y7QUFDdEYsNENBQW9CO0FBQ3BCLHNDQUE0QztBQUU1QyxpRUFBaUU7QUFFakUsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVwQywwSEFBMEg7QUFDMUgseUJBQXlCO0FBRXpCLFNBQWdCLFlBQVk7SUFDMUIsdUZBQXVGO0lBQ3ZGLGdCQUFnQixFQUFFLENBQUM7QUFDckIsQ0FBQztBQUhELG9DQUdDO0FBRUQsU0FBUyxnQkFBZ0I7SUFDdkIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO0lBRXJJLElBQUksV0FBVyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNELE1BQU0sR0FBRyxHQUFHLElBQUEsMEJBQUssRUFBQyxXQUFXLENBQUMsQ0FBQztJQUMvQixJQUFJLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV0Rix1R0FBdUc7SUFDdkcsTUFBTSxjQUFjLEdBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBRSxDQUFDLEtBQW1CLENBQUMsVUFBVSxDQUFDO0lBQ3BGLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDM0UsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3RixNQUFNLFlBQVksR0FBcUIsQ0FBQztZQUN0QyxLQUFLLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxjQUFjO1lBQzFDLFdBQVcsRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztJQUVILEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEVBQUU7UUFDN0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLFlBQVksQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLGNBQWM7Z0JBQzFDLFdBQVcsRUFBRSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO2FBQ3pELENBQUMsQ0FBQztTQUNKO0tBQ0Y7SUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzdCLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzNCO0lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBRSxDQUFDLEtBQWtCLENBQUM7SUFDOUQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsQ0FBQztJQUM5RSxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7UUFDbkIsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDO1lBQzdELFdBQVcsRUFBRSx1QkFBdUIsRUFBQyxDQUFDLENBQUM7S0FDMUM7SUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLFdBQVcsR0FBRyxJQUFBLG9CQUFjLEVBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3hELFlBQUUsQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLEdBQUcsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztLQUN2QztBQUNILENBQUM7QUFHRCxTQUF3QixTQUFTO0FBQ2pDLENBQUM7QUFERCw0QkFDQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCBwYXJzZUpzb24sIHtBc3R9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG4vLyBpbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBwYXJzZSwgeyBPYmplY3RBc3QgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IHJlcGxhY2VQYXRjaGVzLCB7IFJlcGxhY2VtZW50SW5mIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2xvZ2dlciBhcyBsb2c0anN9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCB7cGF0aFRvUHJvaktleX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1ncic7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2NyYScpO1xuXG4vLyBjb25zdCBERUZBVUxUX0RFUFMgPSBbJ3JlYWN0LWFwcC1wb2x5ZmlsbCcsICdAd2ZoL2NyYS1zY3JpcHRzJywgJ0B3Zmgvd2VicGFjay1jb21tb24nLCAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnLFxuLy8gICAnYXhpb3Mtb2JzZXJ2YWJsZSddO1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdFRzY29uZmlnKCkge1xuICAvLyBjb25zdCB7ZGVmYXVsdDogcGFyc2V9ID0gYXdhaXQgaW1wb3J0KCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL2pzb24tc3luYy1wYXJzZXInKTtcbiAgb3ZlcnJpZGVUc0NvbmZpZygpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKCkge1xuICBjb25zdCBiYXNlQ29tcGlsZU9wdGlvbnMgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpLCAndXRmOCcpKS5jb21waWxlck9wdGlvbnM7XG5cbiAgbGV0IGZpbGVDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKCd0c2NvbmZpZy5qc29uJywgJ3V0ZjgnKTtcbiAgY29uc3QgYXN0ID0gcGFyc2UoZmlsZUNvbnRlbnQpO1xuICBsZXQgcE1hcCA9IG5ldyBNYXAoYXN0LnByb3BlcnRpZXMubWFwKGVsID0+IFsvXlwiKC4qKVwiJC8uZXhlYyhlbC5uYW1lLnRleHQpIVsxXSwgZWxdKSk7XG5cbiAgLy8gRHVlIHRvIHJlYWN0LXNjcmlwdHMgZG9lcyBub3QgcmVjb2dhbml6ZSBcImV4dGVuZHNcIiBpbiB0c2NvbmZpZy5qc29uOiByZWFjdC1zY3JpcHRzL2NvbmZpZy9tb2R1bGVzLmpzXG4gIGNvbnN0IGN1cnJDb1Byb3BzQXN0ID0gKHBNYXAuZ2V0KCdjb21waWxlck9wdGlvbnMnKSEudmFsdWUgYXMgT2JqZWN0QXN0KS5wcm9wZXJ0aWVzO1xuICBjb25zdCBsYXN0UHJvcEVuZFBvcyA9IGN1cnJDb1Byb3BzQXN0W2N1cnJDb1Byb3BzQXN0Lmxlbmd0aCAtIDFdLnZhbHVlLmVuZDtcbiAgY29uc3QgY3VyckNvTWFwID0gbmV3IE1hcChjdXJyQ29Qcm9wc0FzdC5tYXAoZWwgPT4gWy9eXCIoLiopXCIkLy5leGVjKGVsLm5hbWUudGV4dCkhWzFdLCBlbF0pKTtcbiAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW3tcbiAgICBzdGFydDogbGFzdFByb3BFbmRQb3MsIGVuZDogbGFzdFByb3BFbmRQb3MsXG4gICAgcmVwbGFjZW1lbnQ6ICdcXG4nXG4gIH1dO1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGJhc2VDb21waWxlT3B0aW9ucykpIHtcbiAgICBpZiAoIWN1cnJDb01hcC5oYXMoa2V5KSkge1xuICAgICAgbG9nLmluZm8oYEFkZCBjb21waWxlciBvcHRpb246ICR7a2V5fToke0pTT04uc3RyaW5naWZ5KHZhbHVlKX1gKTtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IGxhc3RQcm9wRW5kUG9zLCBlbmQ6IGxhc3RQcm9wRW5kUG9zLFxuICAgICAgICByZXBsYWNlbWVudDogYCxcXG4gICAgXCIke2tleX1cIjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YFxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmVwbGFjZW1lbnRzLnNwbGljZSgwLCAxKTtcbiAgfVxuXG4gIGNvbnN0IGNvQXN0ID0gcE1hcC5nZXQoJ2NvbXBpbGVyT3B0aW9ucycpIS52YWx1ZSBhcyBPYmplY3RBc3Q7XG4gIGNvbnN0IHJvb3REaXIgPSBjb0FzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wicm9vdERpclwiJyk7XG4gIGlmIChyb290RGlyID09IG51bGwpIHtcbiAgICByZXBsYWNlbWVudHMucHVzaCh7c3RhcnQ6IGNvQXN0LnN0YXJ0ICsgMSwgZW5kOiBjb0FzdC5zdGFydCArIDEsXG4gICAgICByZXBsYWNlbWVudDogJ1xcbiAgICBcInJvb3REaXJcIjogXCIuXCIsJ30pO1xuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGZpbGVDb250ZW50ID0gcmVwbGFjZVBhdGNoZXMoZmlsZUNvbnRlbnQsIHJlcGxhY2VtZW50cyk7XG4gICAgZnMud3JpdGVGaWxlU3luYygndHNjb25maWcuanNvbicsIGZpbGVDb250ZW50KTtcbiAgICBsb2cuaW5mbygndHNjb25maWcuanNvbiBpcyB1cGRhdGVkLicpO1xuICB9XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5pdFJlZHV4KCkge1xufVxuIl19