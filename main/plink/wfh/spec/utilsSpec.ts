import {WordLexer, boxString} from '../ts/utils/misc';

describe('utils', () => {
	it('WordLexer should work', () => {
		const lexer = new WordLexer('abc efg\n\n123');

		const words = Array.from(lexer);
		for (const word of words) {
			console.log(word);
		}
		expect(words.length).toBe(6);
	});

	it('boxString should work', () => {
		const res = boxString('abc efg\n\n123');
		console.log(res);
	});
});
