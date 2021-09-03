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
        fileContent = patch_text_1.default(fileContent, replacements);
        fs_1.default.writeFileSync('tsconfig.json', fileContent);
        log.info('tsconfig.json is updated.');
    }
}
function initRedux() {
}
exports.default = initRedux;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWluaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktaW5pdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2RUFBNkU7QUFDN0Usb0ZBQW9GO0FBQ3BGLGtHQUE4RTtBQUM5RSxzRkFBc0Y7QUFDdEYsNENBQW9CO0FBQ3BCLHNDQUE0QztBQUU1QyxpRUFBaUU7QUFFakUsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVwQywwSEFBMEg7QUFDMUgseUJBQXlCO0FBRXpCLFNBQWdCLFlBQVk7SUFDMUIsdUZBQXVGO0lBQ3ZGLGdCQUFnQixFQUFFLENBQUM7QUFDckIsQ0FBQztBQUhELG9DQUdDO0FBRUQsU0FBUyxnQkFBZ0I7SUFDdkIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO0lBRXJJLElBQUksV0FBVyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzNELE1BQU0sR0FBRyxHQUFHLDBCQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDL0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEYsdUdBQXVHO0lBQ3ZHLE1BQU0sY0FBYyxHQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUUsQ0FBQyxLQUFtQixDQUFDLFVBQVUsQ0FBQztJQUNwRixNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzNFLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0YsTUFBTSxZQUFZLEdBQXFCLENBQUM7WUFDdEMsS0FBSyxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsY0FBYztZQUMxQyxXQUFXLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUM7SUFFSCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1FBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqRSxZQUFZLENBQUMsSUFBSSxDQUFDO2dCQUNoQixLQUFLLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxjQUFjO2dCQUMxQyxXQUFXLEVBQUUsV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTthQUN6RCxDQUFDLENBQUM7U0FDSjtLQUNGO0lBQ0QsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUM3QixZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUMzQjtJQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUUsQ0FBQyxLQUFrQixDQUFDO0lBQzlELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLENBQUM7SUFDOUUsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1FBQ25CLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQztZQUM3RCxXQUFXLEVBQUUsdUJBQXVCLEVBQUMsQ0FBQyxDQUFDO0tBQzFDO0lBQ0QsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMzQixXQUFXLEdBQUcsb0JBQWMsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDeEQsWUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDL0MsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0tBQ3ZDO0FBQ0gsQ0FBQztBQUdELFNBQXdCLFNBQVM7QUFDakMsQ0FBQztBQURELDRCQUNDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHBhcnNlSnNvbiwge0FzdH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbi8vIGltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHBhcnNlLCB7IE9iamVjdEFzdCB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgcmVwbGFjZVBhdGNoZXMsIHsgUmVwbGFjZW1lbnRJbmYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bG9nZ2VyIGFzIGxvZzRqc30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IHtwYXRoVG9Qcm9qS2V5fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignY3JhJyk7XG5cbi8vIGNvbnN0IERFRkFVTFRfREVQUyA9IFsncmVhY3QtYXBwLXBvbHlmaWxsJywgJ0B3ZmgvY3JhLXNjcmlwdHMnLCAnQHdmaC93ZWJwYWNrLWNvbW1vbicsICdAd2ZoL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZScsXG4vLyAgICdheGlvcy1vYnNlcnZhYmxlJ107XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0VHNjb25maWcoKSB7XG4gIC8vIGNvbnN0IHtkZWZhdWx0OiBwYXJzZX0gPSBhd2FpdCBpbXBvcnQoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcicpO1xuICBvdmVycmlkZVRzQ29uZmlnKCk7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoKSB7XG4gIGNvbnN0IGJhc2VDb21waWxlT3B0aW9ucyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay93ZmgvdHNjb25maWctYmFzZS5qc29uJyksICd1dGY4JykpLmNvbXBpbGVyT3B0aW9ucztcblxuICBsZXQgZmlsZUNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoJ3RzY29uZmlnLmpzb24nLCAndXRmOCcpO1xuICBjb25zdCBhc3QgPSBwYXJzZShmaWxlQ29udGVudCk7XG4gIGxldCBwTWFwID0gbmV3IE1hcChhc3QucHJvcGVydGllcy5tYXAoZWwgPT4gWy9eXCIoLiopXCIkLy5leGVjKGVsLm5hbWUudGV4dCkhWzFdLCBlbF0pKTtcblxuICAvLyBEdWUgdG8gcmVhY3Qtc2NyaXB0cyBkb2VzIG5vdCByZWNvZ2FuaXplIFwiZXh0ZW5kc1wiIGluIHRzY29uZmlnLmpzb246IHJlYWN0LXNjcmlwdHMvY29uZmlnL21vZHVsZXMuanNcbiAgY29uc3QgY3VyckNvUHJvcHNBc3QgPSAocE1hcC5nZXQoJ2NvbXBpbGVyT3B0aW9ucycpIS52YWx1ZSBhcyBPYmplY3RBc3QpLnByb3BlcnRpZXM7XG4gIGNvbnN0IGxhc3RQcm9wRW5kUG9zID0gY3VyckNvUHJvcHNBc3RbY3VyckNvUHJvcHNBc3QubGVuZ3RoIC0gMV0udmFsdWUuZW5kO1xuICBjb25zdCBjdXJyQ29NYXAgPSBuZXcgTWFwKGN1cnJDb1Byb3BzQXN0Lm1hcChlbCA9PiBbL15cIiguKilcIiQvLmV4ZWMoZWwubmFtZS50ZXh0KSFbMV0sIGVsXSkpO1xuICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbe1xuICAgIHN0YXJ0OiBsYXN0UHJvcEVuZFBvcywgZW5kOiBsYXN0UHJvcEVuZFBvcyxcbiAgICByZXBsYWNlbWVudDogJ1xcbidcbiAgfV07XG5cbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoYmFzZUNvbXBpbGVPcHRpb25zKSkge1xuICAgIGlmICghY3VyckNvTWFwLmhhcyhrZXkpKSB7XG4gICAgICBsb2cuaW5mbyhgQWRkIGNvbXBpbGVyIG9wdGlvbjogJHtrZXl9OiR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfWApO1xuICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICBzdGFydDogbGFzdFByb3BFbmRQb3MsIGVuZDogbGFzdFByb3BFbmRQb3MsXG4gICAgICAgIHJlcGxhY2VtZW50OiBgLFxcbiAgICBcIiR7a2V5fVwiOiAke0pTT04uc3RyaW5naWZ5KHZhbHVlKX1gXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXBsYWNlbWVudHMuc3BsaWNlKDAsIDEpO1xuICB9XG5cbiAgY29uc3QgY29Bc3QgPSBwTWFwLmdldCgnY29tcGlsZXJPcHRpb25zJykhLnZhbHVlIGFzIE9iamVjdEFzdDtcbiAgY29uc3Qgcm9vdERpciA9IGNvQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJyb290RGlyXCInKTtcbiAgaWYgKHJvb3REaXIgPT0gbnVsbCkge1xuICAgIHJlcGxhY2VtZW50cy5wdXNoKHtzdGFydDogY29Bc3Quc3RhcnQgKyAxLCBlbmQ6IGNvQXN0LnN0YXJ0ICsgMSxcbiAgICAgIHJlcGxhY2VtZW50OiAnXFxuICAgIFwicm9vdERpclwiOiBcIi5cIiwnfSk7XG4gIH1cbiAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgZmlsZUNvbnRlbnQgPSByZXBsYWNlUGF0Y2hlcyhmaWxlQ29udGVudCwgcmVwbGFjZW1lbnRzKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKCd0c2NvbmZpZy5qc29uJywgZmlsZUNvbnRlbnQpO1xuICAgIGxvZy5pbmZvKCd0c2NvbmZpZy5qc29uIGlzIHVwZGF0ZWQuJyk7XG4gIH1cbn1cblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbml0UmVkdXgoKSB7XG59XG4iXX0=