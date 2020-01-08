// tslint:disable no-console
// import {LLStateMachine, StateHandler, Chunk} from '../LLn-state-machine';
import parseJson from '../utils/json-parser';
import fs from 'fs';
import Path from 'path';
// import util from 'util';

// enum TokenType {
//   EOF = 0,
//   '{', '}', '[', ']', ',', ':',
//   stringLit,
//   otherLit
// }

jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;

describe('LLn-parser', () => {
  it('json-parser', async () => {
    const str = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test.json'), {encoding: 'utf8'});
    const reader = fs.createReadStream(Path.resolve(__dirname, '../../ts/spec/test.json'), {encoding: 'utf8'});
    const ast = await parseJson(reader, token => {
      // console.log('token: ', token.text);
      expect(str.slice(token.pos, token.end)).toBe(token.text);
    });
    console.log('AST:', JSON.stringify(ast, null, '  '));
  });

});

