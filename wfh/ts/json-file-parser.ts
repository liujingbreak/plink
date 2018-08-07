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
	any // .*
}

export class JsonLexer extends BaseLexer<JsonTokenType> {

	constructor(source: string) {
		super(source);
	}

	*[Symbol.iterator](): Iterator<Token<JsonTokenType>> {
		while (true) {
			const char: string = this.la();
			const start = this.position;
			if (char == null) {
				return;
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
		while (/\s/.test(this.la())) {
			this.advance();
		}
	}
}

export class JsonParser extends BaseParser<JsonTokenType, JsonLexer> {
	skip() {}
}
