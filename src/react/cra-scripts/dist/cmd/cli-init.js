"use strict";
// import parseJson, {Ast} from 'dr-comp-package/wfh/dist/utils/json-sync-parser';
// import replaceCode, {ReplacementInf} from 'dr-comp-package/wfh/dist/utils/patch-text';
// import Path from 'path';
// import fs from 'fs';
Object.defineProperty(exports, "__esModule", { value: true });
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
