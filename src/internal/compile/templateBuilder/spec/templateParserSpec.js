var parser = require('../template-parser').parser;
var Path = require('path');
var fs = require('fs');

describe('template-parser.js', ()=> {
	var lexer;
	beforeEach(()=> {
		parser.lexer.options.ranges = true;
		lexer = parser.lexer;
	});
	it('lexer should work', ()=> {
		lexer.setInput('yyy {% name="xxx" %} {= a.b(1) =}');
		var texts = [];
		var token;
		do {
			token = lexer.lex();
			//console.log('token %s, text: "%s"', token, lexer.yytext);
			texts.push(lexer.yytext);
			//console.log('\tlineno: %d, loc: %j', lexer.yylineno, lexer.yylloc);
		} while (token !== lexer.EOF);
		expect(texts).toEqual(['{%',
			'name',
			'=',
			'"xxx"',
			'%}',
			'{=',
			'a',
			'.',
			'b',
			'(',
			'1',
			')',
			'=}',
			'',
			'']);
	});

	it('parser should work', ()=> {
		try {
			var result = parser.parse(fs.readFileSync(Path.resolve(__dirname, 'res', 'layout.html'), 'utf8'));
			console.log(result);
		} catch (e) {
			console.log(e.message);
			throw new Error(e.message + '');
		}
	});
});
