// tslint:disable no-console
import {Token, BaseParser, BaseLexer} from 'dr-comp-package/wfh/dist/base-LLn-parser';

export enum TokenType {
	skip,
	function,
	stringLiteral,
	any,
	space
}

export class ScssLexer extends BaseLexer<TokenType> {
	*[Symbol.iterator](): Iterator<Token<TokenType>> {
		while (true) {
			let char: string = this.la();
			const start = this.position;
			if (char == null) {
				return;
			}
			if (this.la() === '/' && (this.la(2) === '/' || this.la(2) === '*')) {
				this.comments();
				continue;
			}
			if (/\s/.test(this.la())) {
				this.spaces();
				continue;
			}
			switch (char) {
				case '"':
					yield this.stringLit('"');
					break;
				case '\'':
					yield this.stringLit('\'');
					break;
				case '@':
					yield this.identity();
					break;
				default:
					this.advance();
					yield new Token(TokenType.any, this, start);
					break;
			}
		}
	}

	identity() {
		const start = this.position;
		this.advance();
		while (/[a-zA-Z0-9_-]/.test(this.la())) {
			this.advance();
		}
		return new Token(TokenType.function, this, start);
	}

	stringLit(quote: string) {
		this.advance();
		const start = this.position;
		while (this.la() !== quote) {
			if (this.la() == null)
				this.throwError();
			// console.log(':', this.la());
			if (this.la() === '\\') {
				this.advance();
			}
			this.advance();
		}
		const tk = new Token(TokenType.stringLiteral, this, start);
		this.advance();
		return tk;
	}

	spaces() {
		const start = this.position;
		while (this.la() != null && /\s/.test(this.la())) {
			this.advance();
		}
		return new Token(TokenType.skip, this, start);
	}
	comments() {
		const start = this.position;
		this.advance();
		if (this.isNext('/')) {
			this.advance(2);
			while (this.la() !== '\n' && this.la() != null) {
				this.advance();
			}
				this.advance();
		} else if (this.isNext('*')) {
			this.advance(2);
			while (!this.isNext('*/') && this.la() != null) {
				this.advance();
			}
			this.advance(2);
		}
		return new Token(TokenType.skip, this, start);
	}
}

export class ScssParser extends BaseParser<TokenType> {
	getAllImport(): Array<Token<TokenType>> {
		const res: Array<Token<TokenType>> = [];
		while (this.la() != null) {
			if (this.isNextTypes(TokenType.function, TokenType.stringLiteral) && this.la().text === '@import') {
				res.push(this.la(2));
				this.advance(2);
			} else if (this.la() != null)
				this.advance();
		}
		return res;
	}
}
