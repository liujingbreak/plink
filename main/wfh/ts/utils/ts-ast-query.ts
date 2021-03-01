import * as fs from 'fs';
// import keysIn from 'lodash/keysIn';
import isRegExp from 'lodash/isRegExp';
import uniq from 'lodash/uniq';
import _ from 'lodash';
import ts, { SyntaxKind as sk} from 'typescript';
import chalk from 'chalk';
export {ts as typescript};

export let astSchemaCache: {[kind: string]: string[]} = {};
// let fileCounting = 0;
// let lastFile: string;

export function saveAstPropertyCache(file: string) {
  fs.writeFileSync(file, JSON.stringify(astSchemaCache, null, '  '));
}

export function setAstPropertyCache(cache: typeof astSchemaCache) {
  astSchemaCache = cache;
}

export type AstHandler<T> = (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean) => T;

/**
 * @returns true - make iteration stops, `SKIP` - to skip interating child nodes (move on to next sibling node) 
 */
// tslint:disable-next-line: max-line-length
export type traverseCbType = (ast: ts.Node, path: string[], parents: ts.Node[], isLeaf: boolean, comment?: string) => 'SKIP' | boolean | void;

export function printFile(file: string, query?: string | null, withType = true) {
  if (query) {
    const selector = new Selector(fs.readFileSync(file, 'utf8'), file);
    selector.findMapTo(query, (ast, path, parents) => {
      // tslint:disable-next-line: no-console
      console.log(chalk.cyan(
        withType ? path.join(' > ') : path.map(el => el.slice(0, el.indexOf(':'))).join(' > ')
      ));
      selector.traverse(ast, createPrintNodeCb(withType));
    });
  } else {
    if (withType)
      new Selector(fs.readFileSync(file, 'utf8'), file).printAll();
    else
      new Selector(fs.readFileSync(file, 'utf8'), file).printAllNoType();
  }
  // console.log(astSchemaCache);
}
function createPrintNodeCb(withType: boolean) {
  const printNode: traverseCbType = (child, path, parents, isLeaf, comment) => {
    if (comment) {
      // tslint:disable-next-line: no-console
      console.log(
        (withType ? path.join(' > ') : path.map(pathExp).join('')) +
          ` ${chalk.yellow(comment)}`
      );
    }
    if (!isLeaf)
      return;
    // tslint:disable-next-line: no-console
    console.log(
      (withType ? path.join(' > ') : path.map(pathExp).join('')) +
        ` ${chalk.greenBright(child.getText())}`
    );
  };

  function pathExp(pathEl: string, idx: number, path: string[]): string {
    const [exp, type] = pathEl.split(':');
    if (type === 'SourceFile') {
      return '';
    } else {
      return idx > 0 && path[idx - 1] === ':SourceFile' ? '^' + exp : ' > ' + exp;
    }
  }
  return printNode;
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
   * @param cb return true to skip rest nodes
   */
  some(ast?: ts.Node | null, query?: string | null, cb?: traverseCbType | null): boolean {
    const q = query ? new Query(query) : null;
    return !!this.traverse(ast || this.src, (ast, path, ...rest) => {
      if (q == null || q.matches(path)) {
        if (cb) {
          return cb(ast, path, ...rest);
        }
        return true;
      }
    });
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
      const skip = false;
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
   * Begining with "^" meaning strictly matching starts with root node
	 * @param callback 
	 */
  findMapTo<T>(query: string, callback: AstHandler<T>): T | null;
  findMapTo<T>(ast: ts.Node, query: string, callback: AstHandler<T>): T | null;
  // tslint:disable-next-line: max-line-length
  findMapTo<T>(...arg: [queryOrAst: string | ts.Node, callBackOrQuery: AstHandler<T>|string, callback?: AstHandler<T>]): T | null {
    let query: string;
    let ast: ts.Node;
    let callback: AstHandler<T>;
    if (typeof arg[0] === 'string') {
      ast = this.src;
      query = arg[0];
      callback = arg[1] as AstHandler<T>;
    } else {
      ast = arg[0];
      query = arg[1] as string;
      callback = arg[2] as AstHandler<T>;
    }
    let res: T | null = null;
    const q = new Query(query!);

    this.traverse(ast, (ast, path, parents, isLeaf) => {
      if (res != null)
        return true;
      if (q.matches(path)) {
        res = callback(ast, path, parents, isLeaf);
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
    this.traverse(ast, createPrintNodeCb(true));
  }

  printAllNoType(ast: ts.Node = this.src) {
    this.traverse(ast, createPrintNodeCb(false));
  }
  /**
	 * 
	 * @param ast 
	 * @param cb return true to skip traversing child node and remaining sibling nodes
	 * @param level default 0
   * @returns true - stop traverse remaining nodes
	 */
  traverse(ast: ts.Node,
    cb: traverseCbType,
    propName = '', parents: ts.Node[] = [], pathEls: string[] = []): boolean {

    let needPopPathEl = false;

    // if (ast.kind !== ts.SyntaxKind.SourceFile) {
      // let propName = parents[parents.length - 1] === this.src ? '' : this._findParentPropName(ast, parents);
    let pathEl = ':' + sk[ast.kind];
    if (propName)
      pathEl = '.' + propName + pathEl;
    pathEls.push(pathEl);

    // const jsdoc = ts.getJSDocTags(ast);
    // const comments = jsdoc ? jsdoc.map(t => t.comment).join() : '';
    const comments = this.src.getFullText().slice(ast.getStart(undefined, true), ast.getStart());
    needPopPathEl = true;
    // }

    const res = cb(ast, pathEls, parents, ast.getChildCount(this.src) <= 0, comments.trim());

    if (res !== 'SKIP' && res !== true) {
      parents.push(ast);
      const _value2key = new Map<any, string>();

      // tslint:disable-next-line:forin
      // for (const key in ast) {
      const self = this;

      createValue2KeyMap(ast, _value2key);

      /**
       * ts.forEachChild (or `Node.forEachChild()`) just can't list all the children like pure sytax tokens,
       * so I use Node.getChildrend() to get all child nodes.
       * 
       * But ts.forEachChild is the only function which can get embedded array children node in form of NodeArray,
       * so I still need it here.
       */
      ts.forEachChild(ast, child => {
        let propName = _value2key.get(child);
        if (propName == null) {
          createValue2KeyMap(ast, _value2key, true);
          propName = _value2key.get(child);
        }
        const isStop = self.traverse(child, cb, propName, parents, pathEls);
        return isStop;
          // return undefined;
      },
        subArray => {
          let propName = _value2key.get(subArray);
          if (propName == null) {
            createValue2KeyMap(ast, _value2key, true);
            propName = _value2key.get(subArray);
          }
          return self.traverseArray(subArray, cb, propName, parents, pathEls);
        }
      );
      parents.pop();
    }
    if (needPopPathEl)
      pathEls.pop();
    return res === true;
  }

  pathForAst(ast: ts.Node, withType = true): string {
    const pathEls: string[] = [];
    let p = ast;
    while (p) {
      const propExp = this.propNameForAst(p);
      pathEls.push((propExp ? '.' + propExp : '') + (withType ? ':' + sk[p.kind] : ''));
      if (p === this.src)
        break;
      p = p.parent;
    }
    return pathEls.reverse().join('>');
  }

  protected propNameForAst(ast: ts.Node): string | null {
    const p = ast.parent;
    if (p == null)
      return null;

    const cachedProperties = astSchemaCache[p.kind];

    let properties = cachedProperties;
    if (properties == null) {
      astSchemaCache[p.kind] = properties = Object.keys(p);
    }

    for (const prop of properties) {
      const value = (p as any)[prop];
      if (['parent', 'kind', '_children', 'pos', 'end'].includes(prop))
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

  protected traverseArray(nodes: ts.NodeArray<ts.Node> | ts.Node[],
    cb: traverseCbType,
    propName = '', parents: ts.Node[] = [], pathEls: string[] = []): boolean {

    let i = 0;
    for (const ast of nodes) {
      const isStop = this.traverse(ast, cb, propName + `[${i++}]`, parents, pathEls);
      if (isStop)
        return true;
    }
    return false;
  }
}

function createValue2KeyMap(ast: ts.Node, value2KeyMap: Map<any, string>, rebuild = false): string[] {
  // const props = keysIn(ast)
  let props: string[];
  const cached = astSchemaCache[ast.kind];

  if (rebuild || cached == null) {
    props = Object.keys(ast)
      .filter(prop => typeof ast[prop] !== 'function' && !['parent', 'kind', '_children', 'pos', 'end'].includes(prop));
    if (cached == null) {
      astSchemaCache[ast.kind] = props;
    } else {
      const schema = cached;
      schema.push(...props);
      uniq(schema);
      props = schema;
    }
  } else {
    props = cached;
  }
  for (const key of props!) {
    value2KeyMap.set((ast as any)[key], key);
  }
  return props!;
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
    query = query.trim();
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
      throw new Error(`Invalid query string "${chalk.yellow(singleAstDesc)}"`);
    }
    if (m[1]) {
      astChar.propertyName = m[1];
      if (m[2])
        astChar.propIndex = parseInt(m[2], 10);
    }
    if (m[3])
      astChar.kind = m[3];
    return astChar;
  }

  private matchesAst(query: AstQuery, target: AstCharacter): boolean {
    for (const key of Object.keys(query)) {
      const value = (query as any)[key];
      if (isRegExp(value)) {
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
