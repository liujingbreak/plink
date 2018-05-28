import * as ps from '../utils/ng-html-parser';

describe('ng-html-parser', () => {
	let lexer = new ps.BaseLexer('abcde');

	it('Lexer.la()  should work', () => {
		// let lexer = new ps.Lexer('abcde');
		expect(lexer.la()).toEqual('a');
		expect(lexer.la(2)).toEqual('b');
		expect(lexer.la(3)).toEqual('c');
	});

	it('Lexer.advance()  should work', () => {
		lexer.advance(2);
		expect(lexer.la()).toEqual('c');
		expect(lexer.la(3)).toEqual('e');
		expect(lexer.la(7)).toEqual(null);
	});

	it('Lexer.isNext("cde") should work', () => {
		expect(lexer.isNext('cde')).toBeTruthy();
		expect(lexer.isNext('cd')).toBeTruthy();
		expect(lexer.isNext('cdef')).toBeFalsy();
	});
});
