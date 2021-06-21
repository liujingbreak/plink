/* eslint-disable  no-console */
import parse, {HtmlTokenType, lexer, TagKind, OpenTagAst} from '../utils/ng-html-parser';
import {listTokens} from '@wfh/plink/wfh/dist/LLn-parser';
import chalk from 'chalk';

import * as fs from 'fs';
import * as _ from 'lodash';

describe('ng-html-parser', () => {

  it('parser should work for test html file', () => {
    const ngHtml = fs.readFileSync(__dirname + '/../../ts/spec/test-parser.html', 'utf8');
    listTokens('debug', ngHtml, lexer).forEach(token => {
      console.log(chalk.cyan(HtmlTokenType[token.type]), token.text);
    });
    const {allTags: ast} = parse(ngHtml);
    console.log(JSON.stringify(ast, null, '  '));
    for (const tag of ast) {
      console.log(JSON.stringify(tag, null, '  '));
      if (tag.kind === TagKind.open) {
        for (const attrValue of _.values((tag as OpenTagAst).attrs)) {
          if (attrValue.value == null)
            continue;

          expect(attrValue.value.start).not.toBe(attrValue.value.end, attrValue);
          expect(ngHtml.slice(attrValue.value.start, attrValue.value.end)).toEqual(attrValue.value.text);
        }
      }
    }
    expect(ast[0].start).toBe(0);
  });
});
