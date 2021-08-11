// import parseJson, {Ast} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
// import replaceCode, {ReplacementInf} from '@wfh/plink/wfh/dist/utils/patch-text';
import parse, { ObjectAst } from '@wfh/plink/wfh/dist/utils/json-sync-parser';
import replacePatches, { ReplacementInf } from '@wfh/plink/wfh/dist/utils/patch-text';
import fs from 'fs';
import {logger as log4js} from '@wfh/plink';
import _ from 'lodash';
// import {pathToProjKey} from '@wfh/plink/wfh/dist/package-mgr';

const log = log4js.getLogger('cra');

// const DEFAULT_DEPS = ['react-app-polyfill', '@wfh/cra-scripts', '@wfh/webpack-common', '@wfh/redux-toolkit-observable',
//   'axios-observable'];

export function initTsconfig() {
  // const {default: parse} = await import('@wfh/plink/wfh/dist/utils/json-sync-parser');
  overrideTsConfig();
}

function overrideTsConfig() {
  const baseCompileOptions = JSON.parse(fs.readFileSync(require.resolve('@wfh/plink/wfh/tsconfig-base.json'), 'utf8')).compilerOptions;

  let fileContent = fs.readFileSync('tsconfig.json', 'utf8');
  const ast = parse(fileContent);
  let pMap = new Map(ast.properties.map(el => [/^"(.*)"$/.exec(el.name.text)![1], el]));

  // Due to react-scripts does not recoganize "extends" in tsconfig.json: react-scripts/config/modules.js
  const currCoPropsAst = (pMap.get('compilerOptions')!.value as ObjectAst).properties;
  const lastPropEndPos = currCoPropsAst[currCoPropsAst.length - 1].value.end;
  const currCoMap = new Map(currCoPropsAst.map(el => [/^"(.*)"$/.exec(el.name.text)![1], el]));
  const replacements: ReplacementInf[] = [{
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

  const coAst = pMap.get('compilerOptions')!.value as ObjectAst;
  const rootDir = coAst.properties.find(prop => prop.name.text === '"rootDir"');
  if (rootDir == null) {
    replacements.push({start: coAst.start + 1, end: coAst.start + 1,
      replacement: '\n    "rootDir": ".",'});
  }
  if (replacements.length > 0) {
    fileContent = replacePatches(fileContent, replacements);
    fs.writeFileSync('tsconfig.json', fileContent);
    log.info('tsconfig.json is updated.');
  }
}


export default function initRedux() {
}
