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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const log4js_1 = __importDefault(require("log4js"));
const patch_text_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
const json_sync_parser_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const log = log4js_1.default.getLogger('cra');
function initTsconfig() {
    return __awaiter(this, void 0, void 0, function* () {
        // const {default: parse} = await import('@wfh/plink/wfh/dist/utils/json-sync-parser');
        let fileContent = fs_1.default.readFileSync('tsconfig.json', 'utf8');
        const ast = json_sync_parser_1.default(fileContent);
        let pMap = new Map(ast.properties.map(el => [/^"(.*)"$/.exec(el.name.text)[1], el]));
        const replacements = [];
        const baseTsConfig = path_1.default.relative(process.cwd(), require.resolve('@wfh/plink/wfh/tsconfig-base.json')).replace(/\\/g, '/');
        if (!pMap.has('extends')) {
            replacements.push({ start: 1, end: 1, replacement: `\n  "extends": "${baseTsConfig}",` });
        }
        else if (pMap.get('extends').value.text.slice(1, -1) !== baseTsConfig) {
            log.info('Update ' + path_1.default.resolve('tsconfig.json'));
            const extendValueToken = pMap.get('extends').value;
            replacements.push({ start: extendValueToken.pos + 1, end: extendValueToken.end - 1, replacement: baseTsConfig });
        }
        // log.warn(Array.from(pMap.keys()));
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
    });
}
exports.initTsconfig = initTsconfig;
function initRedux() {
    // const pkjsonStr = fs.readFileSync(Path.resolve('package.json'), 'utf8');
    // const pkjson = JSON.parse(pkjsonStr);
    // const replText = [] as ReplacementInf[];
    // const ast = parseJson(pkjsonStr);
    // // console.log(JSON.stringify(ast, null, '  '));
    // if (pkjson.dependencies['@reduxjs/toolkit'] == null && pkjson.devDependencies['@reduxjs/toolkit'] == null) {
    //   const devDepAst = ast.properties.find(prop => prop.name.text === 'devDependencies');
    //   if (!devDepAst) {
    //   }
    //   const insertPoint = devDepAst.start + 1;
    //   replText.push({start: insertPoint, end: insertPoint, text: '\n    "@reduxjs/toolkit": "",'});
    // }
}
exports.default = initRedux;

//# sourceMappingURL=cli-init.js.map
