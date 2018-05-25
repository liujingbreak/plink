%lex
%s swigExp swigBlock

NEW_LINE			\n
%%
<INITIAL>"{="					this.begin("swigExp"); return yytext;
<swigExp>"=}"					this.popState(); return yytext;
<INITIAL>"{%"					this.begin("swigBlock"); return yytext;
<swigBlock>"%}"					this.popState(); return yytext;
<swigBlock>"//"[^\n]*{NEW_LINE}	// skip;
{NEW_LINE}						// skip newline
[\r\t ]+						// skip
<swigBlock>[a-zA-Z0-9_@]+			return 'ID';
<swigBlock,swigExp>\"[^\"]*\"|\'[^\']*\'	return 'STRING_LIT';
<swigBlock,swigExp>.		return 'WILD';
<INITIAL>.						// skip;
<<EOF>>							return 'EOF';
%%

/lex

%%
body: content 'EOF' {return blockAction;}
	;

content:
	element
	| content element
	;

element: '{=' blockElements '=}'
	| '{%' ID blockElements '%}'
		{
			blockAction.push({name: $ID, loc: simplifyLocation(@ID), attr: $blockElements[0]});
		}
	| '{%' ID '%}'				{ blockAction.push({name: $ID, loc: simplifyLocation(@ID)}); }
	;

blockElements: blockElement			{$$ = [$1];}
	| blockElements blockElement	{$1.push($2);}
	;
blockElement:
	ID		{$$ = {value: yytext, loc: simplifyLocation(@$)}}
	| STRING_LIT {$$ = {value: yytext, loc: simplifyLocation(@$)}}
	| '=' {$$ = {value: yytext, loc: simplifyLocation(@$)}}
	| WILD
	;

%%

var blockAction = [];
function simplifyLocation(loc) {
	return {lineno: loc.first_line, range: loc.range};
}
