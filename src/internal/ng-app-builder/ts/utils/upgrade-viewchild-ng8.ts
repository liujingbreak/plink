import Selector from './ts-ast-query';
import ts from 'typescript';
import replaceCode, {Replacement} from './patch-text';
const log = require('log4js').getLogger('Modify Ng8 ViewChild arguments');

export function transform(content: string, file: string) {
  const sel = new Selector(content, file);
  // sel.printAll();

  const ObjectLiteralExpressionKind = ts.SyntaxKind.ObjectLiteralExpression;

  const replacements = sel.findAll(':ClassDeclaration>.members:PropertyDeclaration>.decorators:Decorator>.expression:CallExpression>.expression:Identifier')
  .filter(id => (id as ts.Identifier).text === 'ViewChild')
  .map(id => id.parent)
  .map((call: ts.CallExpression) => {
    if (call.arguments.length < 2) {
      // sel.printAll(call);
      return new Replacement(call.arguments[0].getEnd(), call.arguments[0].getEnd(), ', {static: false}');
    } else if (call.arguments[1] && call.arguments[1].kind === ObjectLiteralExpressionKind) {
      const obj: ts.ObjectLiteralExpression = call.arguments[1] as any;
      // sel.printAll(obj);
      // console.log(obj.properties.map(p => p.name!.getText(p.getSourceFile())));
      const hasStatic = obj.properties.some(prop => prop.name && (prop.name.getText() === 'static' ||
        prop.name.getText() === '\'static\'' ||
        prop.name.getText() === '"static"'));
      if (!hasStatic) {
        return new Replacement(obj.getEnd() - 1, obj.getEnd() -1, ', static: false');
      }
      return null;
    }
    throw new Error('Unsupported @ViewChild argument' + sel.printAll(call.arguments[1]));
  })
  .filter(item => item != null);
  if (replacements.length > 0) {
    log.warn('in', file);
    return replaceCode(content, replacements as any, true);
  }
  return content;
}
