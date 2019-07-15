/**
 * Basically it is a copy of require-injector/dist/dir-tree, but for browser side
 * and not related to local file system, as a pure data structure
 */

import _has from 'lodash/has';
import _repeat from 'lodash/repeat';
import _each from 'lodash/each';

export interface TreeNode<T> {
  map: {[child: string]: TreeNode<T>};
  name: string;
  data?: T;
}
export class DirTree<T> {
  root: TreeNode<T> = {map: {}, name: ''};

  constructor(private caseSensitive = false) {}

  putData(path: string, data: T) {
    var tree = this.ensureNode(path);
    tree.data = data;
  }

  getData(path: string): T {
    var tree = this.findNode(path);
    return tree ? tree.data : null;
  }

  /**
	 * @return Array of data
	 */
  getAllData(path: string | string[]): T[] {
    if (!Array.isArray(path)) {
      if (this.caseSensitive)
        path = path.toLowerCase();
      return this.getAllData(path.replace(/\\/g, '/').split('/'));
    }
    var tree = this.root;
    var datas: T[] = [];
    if (_has(tree, 'data'))
      datas.push(tree.data);
    path.every(name => {
      if (_has(tree, ['map', name])) {
        tree = tree.map[name];
        if (_has(tree, 'data'))
          datas.push(tree.data);
        return true;
      }
      tree = null;
      return false;
    });
    return datas;
  }

  ensureNode(path: string | string[]): TreeNode<T> {
    if (!Array.isArray(path)) {
      if (this.caseSensitive)
        path = path.toLowerCase();
      return this.ensureNode(path.replace(/\\/g, '/').split('/'));
    }
    var tree = this.root;
    _each(path, name => {
      if (_has(tree, ['map', name])) {
        tree = tree.map[name];
      } else {
        var child = {map: {}, name};
        tree.map[name] = child;
        tree = child;
      }
    });
    return tree;
  }

  findNode(path: string | string[]): TreeNode<T> {
    if (!Array.isArray(path)) {
      if (this.caseSensitive)
        path = path.toLowerCase();
      return this.findNode(path.replace(/\\/g, '/').split('/'));
    }
    var tree = this.root;
    path.every(name => {
      if (_has(tree, ['map', name])) {
        tree = tree.map[name];
        return true;
      }
      tree = null;
      return false;
    });
    return tree;
  }

  traverse(level: number = 0, tree?: TreeNode<T>, lines?: string[]) {
    var isRoot = false;
    if (!tree)
      tree = this.root;
    if (!lines) {
      isRoot = true;
      lines = [];
    }
    var indent = _repeat('│  ', level);
    lines.push(indent + '├─ ' + tree.name + (tree.data ? ' [x]' : ''));
    _each(tree.map, (subTree) => {
      this.traverse(level + 1, subTree, lines);
    });
    return isRoot ? lines.join('\n') : lines;
  }

  toString() {
    return this.traverse() as string;
  }
}
