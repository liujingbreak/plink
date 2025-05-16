import _ from 'lodash';
// var {EOL} = require('os');

var seq = 0;

export function toAssignment(parsedInfo: ParseInfo, valueStr: string): string {
	var dec = '';

	var importsVarName: string;
	importsVarName = '__imp' + uid() + '__';
	if (parsedInfo.defaultVar) {
		dec += `, ${parsedInfo.defaultVar} = ${importsVarName}["default"]`;
	}
	if (parsedInfo.namespaceVar) {
		dec += `, ${parsedInfo.namespaceVar} = ${importsVarName}`;
	}
	_.each(parsedInfo.vars, (member, name) => {
		dec += ', ' + name + ' = ' + importsVarName + '[' + JSON.stringify(member ? member : name) + ']';
	});
	if (dec.length > 0) {
		return `var ${importsVarName} = ${valueStr}${dec};`;
	} else {
		return valueStr + ';';
	}
}

export class ParseInfo {
	vars: {[k: string]: string} = {}; // import {foo as bar ...}
	defaultVar: string; // import foo from ...
	namespaceVar: string; // import * as ...
	from: string;
}

export class ParseExportInfo {
	exported: {[name: string]: string} = {}; // Empty means ExportAllDeclaration "export * from ..."
	from: string;
}

export function parse(ast: any): ParseInfo {
	var res: ParseInfo = new ParseInfo();
	ast.specifiers.forEach(function(speci: any) {
		if (speci.type === 'ImportDefaultSpecifier') {
			res.defaultVar = _.get(speci, 'local.name');
			return;
		}
		var imported = _.get(speci, 'imported.name');
		if (!imported)
			res.namespaceVar = speci.local.name;
		else
			res.vars[speci.local.name] = imported;
	});
	res.from = ast.source.value;
	return res;
}

export function parseExport(ast: any): ParseExportInfo {
	var res: ParseExportInfo = new ParseExportInfo();
	ast.specifiers.forEach(function(speci: any) {
		var name = _.get(speci, 'exported.name');
		res.exported[name] = speci.local.name;
	});
	res.from = ast.source.value;
	return res;
}

function uid() {
	return ++seq;
}
