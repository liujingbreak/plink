"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTsconfig = void 0;
const tslib_1 = require("tslib");
// import parseJson, {Ast} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
// import replaceCode, {ReplacementInf} from '@wfh/plink/wfh/dist/utils/patch-text';
const fs_1 = tslib_1.__importDefault(require("fs"));
const json_sync_parser_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const patch_text_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
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
    const pMap = new Map(ast.properties.map(el => [/^"(.*)"$/.exec(el.name.text)[1], el]));
    // Due to react-scripts does not recoganize "extends" in tsconfig.json: react-scripts/config/modules.js
    const currCoPropsAst = pMap.get('compilerOptions').value.properties;
    const lastPropEndPos = currCoPropsAst[currCoPropsAst.length - 1].value.end;
    const currCoMap = new Map(currCoPropsAst.map(el => [/^"(.*)"$/.exec(el.name.text)[1], el]));
    const replacements = [
        {
            start: lastPropEndPos, end: lastPropEndPos,
            replacement: '\n'
        }
    ];
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
//# sourceMappingURL=cli-init.js.map