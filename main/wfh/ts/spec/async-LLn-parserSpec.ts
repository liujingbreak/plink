/* eslint-disable no-console */
// eslint-disable  no-console
// import {LLStateMachine, StateHandler, Chunk} from '../LLn-state-machine';
import fs from 'fs';
import Path from 'path';
import {jest, xit, describe, it, expect} from '@jest/globals';
import parseJson from '../utils/json-parser';
import parseJsonSync from '../utils/json-sync-parser';

// jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;
jest.setTimeout(300000);

describe('JSON parser', () => {
  xit('async json-parser', async () => {
    const str = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test.json'), {encoding: 'utf8'});
    const reader = fs.createReadStream(Path.resolve(__dirname, '../../ts/spec/test.json'), {encoding: 'utf8'});
    const ast = await parseJson(reader, token => {
      // console.log('token: ', token.text);
      expect(str.slice(token.pos, token.end)).toBe(token.text);
    });
    console.log('AST:', JSON.stringify(ast, null, '  '));
  });

  it('sync json-parser', () => {
    const str = fs.readFileSync(Path.resolve(__dirname, '../../ts/spec/test.json'), {encoding: 'utf8'});
    const ast = parseJsonSync(str);
    console.log('AST:', JSON.stringify(ast, null, '  '));
  });

});

