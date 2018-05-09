import { Rule, SchematicContext, Tree/*, FileEntry*/ } from '@angular-devkit/schematics';
import * as Path from 'path';

const NM_DIR = Path.sep + 'node_modules' + Path.sep;
// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function drcpApp(/*options: any*/): Rule {
  return (tree: Tree, _context: SchematicContext) => {
	tree.visit((path: string/*, entry: FileEntry*/) => {
		if (path.startsWith(NM_DIR))
			return;
		// console.log(path);
	});
	return tree;
  };
}
