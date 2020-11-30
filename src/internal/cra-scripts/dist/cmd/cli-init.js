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
        // defaultDependencyTips();
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
    // const baseTsConfig = Path.relative(process.cwd(), require.resolve('@wfh/plink/wfh/tsconfig-base.json')).replace(/\\/g, '/');
    // if (!pMap.has('extends')) {
    //   replacements.push({start: 1, end: 1, replacement: `\n  "extends": "${baseTsConfig}",`});
    // } else if ((pMap.get('extends')!.value as Token).text.slice(1, -1) !== baseTsConfig) {
    //   log.info('Update ' + Path.resolve('tsconfig.json'));
    //   const extendValueToken = (pMap.get('extends')!.value as Token);
    //   replacements.push({start: extendValueToken.pos + 1, end: extendValueToken.end - 1, replacement: baseTsConfig});
    // }
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
}
// function defaultDependencyTips() {
//   const pkJson = fs.readFileSync('package.json', 'utf8');
//   const wkPkJson = JSON.parse(pkJson);
//   const deps = new Set<string>(Object.keys(wkPkJson.dependencies));
//   if (wkPkJson.devDependencies) {
//     Object.keys(wkPkJson.devDependencies).forEach(dep => deps.add(dep));
//   }
//   const ast = parse(pkJson);
//   if (wkPkJson.devDependencies == null) {
//     replacements.push()
//   }
//   const replacements: ReplacementInf[] = [];
//   for (const required of DEFAULT_DEPS) {
//     if (!deps.has(required)) {
//       replacements.push({});
//     }
//   }
// }
function initRedux() {
}
exports.default = initRedux;

//# sourceMappingURL=cli-init.js.map
