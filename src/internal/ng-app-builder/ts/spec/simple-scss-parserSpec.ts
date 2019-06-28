// tslint:disable no-console
import {ScssLexer, ScssParser, TokenType} from '../utils/simple-scss-parser';
import {TokenFilter} from 'dr-comp-package/wfh/dist/base-LLn-parser';
import * as fs from 'fs';
import * as Path from 'path';

describe('simple-scss-parser', () => {
  let text: string;
  beforeAll(() => {
    text = fs.readFileSync(
      Path.join(__dirname, '../../ts/spec/simple-scss-parser-test.scss'), 'utf-8');
  });
  it('lexer should work', () => {
    const lexer = new ScssLexer(text);
    console.log('-----------');
    const tokens = Array.from(new TokenFilter(lexer, TokenType.any));
    console.log(tokens);
    // expect(tokens.length).toBe(9);
    for (const tk of tokens) {
      expect(text.slice(tk.start, tk.end)).toBe(tk.text);
    }
  });

  it('getAllImport() should work', () => {
    const lexer = new ScssLexer(text);
    const parser = new ScssParser(lexer);
    const imports = parser.getAllImport(text);
    console.log(imports);
    expect(imports.length).toBe(2);
  });

  it('getResUrl() should work', () => {
    const lexer = new ScssLexer(text);
    const parser = new ScssParser(lexer);
    const urls = parser.getResUrl(text);
    console.log(urls);
    expect(urls.length).toBe(7);
    expect(urls[4].text).toBe('../../credit-common/vendors/material/iconfont/MaterialIcons-Regular.woff');
  });
});
