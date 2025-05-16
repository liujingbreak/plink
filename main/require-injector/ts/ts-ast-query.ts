import * as fs from 'fs';
// import api from '__api';
import _ from 'lodash';
import ts from 'typescript';
import { SyntaxKind as sk } from 'typescript';
const {green, yellow} = require('chalk');
// const log = require('log4js').getLogger('ts-ast-query');

export function printFile(fileName: string) {
	if (!fileName) {
		// tslint:disable-next-line
		console.log('Usage:\n' + green('drcp run @dr-core/ng-app-builder/dist/utils/ts-ast-query --file <ts file>'));
		return;
	}
	new Selector(fs.readFileSync(fileName, 'utf8'), fileName).printAll();
}

export interface WalkCallback {
	query: string;
	callback: (ast: ts.Node, path: string[], parents?: ts.Node[]) => true | void;
}
// type Callback = (ast: ts.Node, path: string[]) => boolean | void;
export default class Selector {
	src: ts.SourceFile;

	constructor(src: string, file: string);
	constructor(src: ts.SourceFile);
	constructor(src: ts.SourceFile | string, file?: string) {
		if (typeof src === 'string') {
			this.src = ts.createSourceFile(file || 'unknown', src, ts.ScriptTarget.ESNext,
				true, ts.ScriptKind.TSX);
		} else {
			this.src = src;
		}
	}

	walkAst(handlers: WalkCallback[]): void;
	walkAst(ast: ts.Node, handlers: WalkCallback[]): void;
	walkAst(ast: ts.Node|WalkCallback[] , handlers?: WalkCallback[]): void {
		if (Array.isArray(ast)) {
			handlers = ast;
			ast = this.src;
		}

		const queryMap: {[str: string]: Query} = {};
		if (!handlers)
			return;
		handlers.forEach(h => queryMap[h.query] = new Query(h.query));

		this.traverse(ast, (ast, path, parents) => {
			let skip = false;
			handlers!.some(h => {
				if (queryMap[h.query].matches(path)) {
				  h.callback(ast, path, parents);
				  return true;
				}
				return false;
			});
			if (skip)
				return true;
		});
	}

	/**
	 * 
	 * @param query Like CSS select := ["^"] <selector element> (" " | ">") <selector element>
	 *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
	 *   where <index> := "[" "0"-"9" "]"
	 * 
	 * e.g.
	 *  - .elements:ImportSpecifier > .name
	 *  - .elements[2] > .name
	 *  - ^.statements[0] :ImportSpecifier > :Identifier
	 * Begining with "^" means strictly comparing from first queried AST node
	 * @param callback 
	 */
	findWith<T>(query: string, callback: (ast: ts.Node, path: string[], parents: ts.Node[]) => T): T | null;
	findWith<T>(ast: ts.Node, query: string, callback: (ast: ts.Node, path: string[], parents: ts.Node[]) => T): T | null;
	findWith<T>(...arg: any[]): T | null {
		let query: string;
		let ast: ts.Node;
		let callback: (ast: ts.Node, path: string[], parents: ts.Node[]) => T;
		if (typeof arg[0] === 'string') {
			ast = this.src;
			query = arg[0];
			callback = arg[1];
		} else {
			ast = arg[0];
			query = arg[1];
			callback = arg[2];
		}
		let res: T | null = null;
		const q = new Query(query!);

		this.traverse(ast, (ast, path, parents) => {
			if (res != null)
				return true;
			if (q.matches(path)) {
				res = callback(ast, path, parents);
				if (res != null)
				  return true;
			}
		});
		return res;
	}

	/**
	 * 
	 * @param ast root AST node
	 * @param query Like CSS select := ["^"] <selector element> (" " | ">") <selector element>
	 *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
	 *   where <index> := "[" "0"-"9" "]"
	 * e.g.
	 *  - .elements:ImportSpecifier > .name
	 *  - .elements[2] > .name
	 *  - .statements[0] :ImportSpecifier > :Identifier
	 */
	findAll(query: string): ts.Node[];
	findAll(ast: ts.Node, query: string): ts.Node[];
	findAll(ast: ts.Node | string, query?: string): ts.Node[] {
		let q: Query;
		if (typeof ast === 'string') {
			query = ast;
			q = new Query(ast);
			ast = this.src;
		} else {
			q = new Query(query!);
		}

		const res: ts.Node[] = [];
		this.traverse(ast, (ast, path, _parents, _isLeaf) => {
			if (q.matches(path)) {
				res.push(ast);
			}
		});
		return res;
	}
	/**
	 * 
	 * @param ast root AST node
	 * @param query Like CSS select := ["^"] <selector element> (" " | ">") <selector element>
	 *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
	 *   where <index> := "[" "0"-"9" "]"
	 * e.g.
	 *  - .elements:ImportSpecifier > .name
	 *  - .elements[2] > .name
	 *  - .statements[0] :ImportSpecifier > :Identifier
	 */
	findFirst(query: string): ts.Node | undefined;
	findFirst(ast: ts.Node, query: string): ts.Node | undefined;
	findFirst(ast: ts.Node | string, query?: string): ts.Node | undefined {
		let q: Query;
		if (typeof ast === 'string') {
			query = ast;
			q = new Query(query);
			ast = this.src;
		} else {
			q = new Query(query!);
		}
		let res: ts.Node | undefined;
		this.traverse(ast, (ast, path) => {
			if (res)
				return true;
			if (q.matches(path)) {
				res = ast;
				return true;
			}
		});
		return res;
	}

	list(ast: ts.Node = this.src) {
		let out = '';
		this.traverse(ast, (node, path, _parents, noChild) => {
			if (noChild) {
				out += path.join('>') + ' ' + node.getText(this.src);
				out += '\n';
			}
		});
		return out;
	}

	printAll(ast: ts.Node = this.src) {
		this.traverse(ast, (node, path, _parents, noChild) => {
			if (noChild) {
				// tslint:disable-next-line:no-console
				console.log(path.join('>'), green(node.getText(this.src)));
			}
		});
	}

	printAllNoType(ast: ts.Node = this.src) {
		this.traverse(ast, (node, path, _parents, noChild) => {
			if (noChild) {
				// tslint:disable-next-line:no-console
				console.log(path.map(name => name.split(':')[0]).join('>'), green(node.getText(this.src)));
			}
		});
	}
	/**
	 * 
	 * @param ast 
	 * @param cb return true to skip traversing child node
	 * @param level default 0
	 */
	traverse(ast: ts.Node,
		cb: (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean) => true | void,
		propName = '', parents: ts.Node[] = [], pathEls: string[] = []) {

		let needPopPathEl = false;

		// if (ast.kind !== ts.SyntaxKind.SourceFile) {
			// let propName = parents[parents.length - 1] === this.src ? '' : this._findParentPropName(ast, parents);
		let pathEl = ':' + sk[ast.kind];
		if (propName)
			pathEl = '.' + propName + pathEl;
		pathEls.push(pathEl);
		needPopPathEl = true;
		// }

		const res = cb(ast, pathEls, parents, ast.getChildCount(this.src) <= 0);

		if (res !== true) {
			parents.push(ast);
			const _value2key = new Map<any, string>();
			// tslint:disable-next-line:forin
			// for (const key in ast) {
			const self = this;
			for (const key of Object.keys(ast)) {
				if (key === 'parent' || key === 'kind')
				  continue;
				  _value2key.set((ast as any)[key], key);
			}
			ts.forEachChild(ast, sub => {
				  self.traverse(sub, cb, _value2key.get(sub), parents, pathEls);
				},
				subArray => self.traverseArray(subArray, cb, _value2key.get(subArray), parents, pathEls)
			);
			parents.pop();
		}
		if (needPopPathEl)
			pathEls.pop();
	}

	pathForAst(ast: ts.Node): string {
		const pathEls: string[] = [];
		let p = ast;
		while (p && p !== this.src) {
			pathEls.push(this.propNameForAst(p) + ':' + sk[p.kind]);
			p = p.parent;
		}
		return pathEls.reverse().join('>');
	}

	protected propNameForAst(ast: ts.Node): string {
		const p = ast.parent;
		for (const prop of Object.keys(p)) {
			const value = (p as any)[prop];
			if (prop === 'parent' || prop === 'kind')
				continue;
			if (Array.isArray(value)) {
				const idx = (value as any[]).indexOf(ast);
				if (idx >= 0) {
				  return prop + `[${idx}]`;
				}
			}
			if (value === ast) {
				return prop;
			}
		}
		return '';
	}

	protected traverseArray(nodes: ts.NodeArray<ts.Node>,
		cb: (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean) => true | void,
		propName = '', parents: ts.Node[] = [], pathEls: string[] = []) {

		let i = 0;
		for (const ast of nodes) {
			this.traverse(ast, cb, propName + `[${i++}]`, parents, pathEls);
		}
	}
}

export interface AstCharacter {
	propertyName?: string;
	propIndex?: number;
	kind?: string;
}

export interface AstQuery extends AstCharacter {
	text?: RegExp;
}

export class Query {
	queryPaths: AstCharacter[][]; // in reversed order
	private fromRoot = false;

	constructor(query: string) {
		if (query.startsWith('^')) {
			query = query.slice(1);
			this.fromRoot = true;
		}
		this.queryPaths = query.trim()
			.replace(/\s*>\s*/g, '>')
			.split(/\s+/)
			.map(paths => paths.split('>')
				.map(singleAstDesc => this._parseDesc(singleAstDesc)).reverse())
			.reverse();
	}

	matches(path: string[]): boolean {
		let testPos = path.length - 1;
		const startTestPos = testPos;
		for (const consecutiveNodes of this.queryPaths.slice(0)) {
			while (true) {
				if (this.matchesConsecutiveNodes(consecutiveNodes, path, testPos)) {
				  testPos -= consecutiveNodes.length;
				  break;
				} else if (testPos === startTestPos) {
				  return false;
				} else {
				  testPos--;
				}
				if (consecutiveNodes.length > testPos + 1)
				  return false;
			}
		}
		return this.fromRoot ? testPos === 0 : true;
	}

	protected _parseDesc(singleAstDesc: string): AstQuery {
		const astChar: AstQuery = {};
			// tslint:disable-next-line
			let m = /^(?:\.([a-zA-Z0-9_$]+)(?:\[([0-9]*)\])?)?(?:\:([a-zA-Z0-9_$]+))?$|^\*$/.exec(singleAstDesc);
			if (m == null) {
				throw new Error(`Invalid query string "${yellow(singleAstDesc)}"`);
			}
			if (m[1]) {
				astChar.propertyName = m[1];
				if (m[2])
				  astChar.propIndex = parseInt(m[2], 10);
			}
			if (m[3])
				astChar.kind = m[3];
			// if (m[4])
			// 	astChar.text = new RegExp(m[4]);
			return astChar;
	}

	private matchesAst(query: AstQuery, target: AstCharacter): boolean {
		for (const key of Object.keys(query)) {
			const value = (query as any)[key];
			if (_.isRegExp(value)) {
				if (!(value as RegExp).test((target as any)[key]))
				  return false;
			} else if ((target as any)[key] !== value)
				return false;
		}
		return true;
	}

	/**
	 * predicte if it matches ">" connected path expression 
	 * @param queryNodes all items in reversed order
	 * @param path 
	 * @param testPos starts with path.length - 1
	 */
	private matchesConsecutiveNodes(queryNodes: AstCharacter[], path: string[], testPos: number) {
		if (queryNodes.length > testPos + 1)
			return false;
		for (const query of queryNodes.slice(0)) {
			const target = this._parseDesc(path[testPos--]);
			if (!this.matchesAst(query, target))
				return false;
		}
		return true;
	}
}
