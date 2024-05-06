"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExport = exports.parse = exports.ParseExportInfo = exports.ParseInfo = exports.toAssignment = void 0;
const lodash_1 = __importDefault(require("lodash"));
// var {EOL} = require('os');
var seq = 0;
function toAssignment(parsedInfo, valueStr) {
    var dec = '';
    var importsVarName;
    importsVarName = '__imp' + uid() + '__';
    if (parsedInfo.defaultVar) {
        dec += `, ${parsedInfo.defaultVar} = ${importsVarName}["default"]`;
    }
    if (parsedInfo.namespaceVar) {
        dec += `, ${parsedInfo.namespaceVar} = ${importsVarName}`;
    }
    lodash_1.default.each(parsedInfo.vars, (member, name) => {
        dec += ', ' + name + ' = ' + importsVarName + '[' + JSON.stringify(member ? member : name) + ']';
    });
    if (dec.length > 0) {
        return `var ${importsVarName} = ${valueStr}${dec};`;
    }
    else {
        return valueStr + ';';
    }
}
exports.toAssignment = toAssignment;
class ParseInfo {
    constructor() {
        this.vars = {}; // import {foo as bar ...}
    }
}
exports.ParseInfo = ParseInfo;
class ParseExportInfo {
    constructor() {
        this.exported = {}; // Empty means ExportAllDeclaration "export * from ..."
    }
}
exports.ParseExportInfo = ParseExportInfo;
function parse(ast) {
    var res = new ParseInfo();
    ast.specifiers.forEach(function (speci) {
        if (speci.type === 'ImportDefaultSpecifier') {
            res.defaultVar = lodash_1.default.get(speci, 'local.name');
            return;
        }
        var imported = lodash_1.default.get(speci, 'imported.name');
        if (!imported)
            res.namespaceVar = speci.local.name;
        else
            res.vars[speci.local.name] = imported;
    });
    res.from = ast.source.value;
    return res;
}
exports.parse = parse;
function parseExport(ast) {
    var res = new ParseExportInfo();
    ast.specifiers.forEach(function (speci) {
        var name = lodash_1.default.get(speci, 'exported.name');
        res.exported[name] = speci.local.name;
    });
    res.from = ast.source.value;
    return res;
}
exports.parseExport = parseExport;
function uid() {
    return ++seq;
}
//# sourceMappingURL=parse-esnext-import.js.map