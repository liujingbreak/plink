import {Token, BaseLexer, BaseParser} from './base-LLn-parser';

export enum JsonTokenType {
	primitive,
	stringLit,
	[','],
	['['],
	[']'],
	['{'],
	['}'],
	[':'],
	skip,
	any // .*
}

export class JsonLexer extends BaseLexer<JsonTokenType> {

	*[Symbol.iterator](): Iterator<Token<JsonTokenType>> {
		while (true) {
			const char: string = this.la();
			const start = this.position;
			if (char == null) {
				return;
			}
			if (/\s/.test(this.la())) {
				yield this.skip();
				continue;
			}
			switch (char) {
				case ',':
				case '[':
				case ']':
				case '{':
				case '}':
				case ':':
					this.advance();
					yield new Token(JsonTokenType[char], this, start);
					continue;
				case '"':
					yield this.stringLit('"');
					continue;
				case '\'':
					yield this.stringLit('\'');
					continue;
				default:
					this.advance();
					yield new Token(JsonTokenType.primitive, this, start);
			}
		}
	}

	stringLit(quote: string) {
		const start = this.position;
		this.advance();
		while (this.la() !== quote) {
			if (this.la() == null)
				this.throwError();
			// console.log(':', this.la());
			if (this.la() === '\\') {
				this.advance();
			}
			this.advance();
		}
		this.advance();
		const tk = new Token(JsonTokenType.stringLit, this, start);
		return tk;
	}

	skip() {
		const start = this.position;
		while (this.la() != null && /\s/.test(this.la())) {
			this.advance();
		}
		return new Token(JsonTokenType.skip, this, start);
	}
}

export class JsonParser extends BaseParser<JsonTokenType> {
	// TODO
	skip() {}
}
