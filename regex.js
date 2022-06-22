/**
 * Takes a regular expression, converts it into a DFA, and compares input strings against it.
 *
 * @param {string} regex The regex string to parse.
 */
function Regex(regex) {
	this.AddRegex(regex);
}

/**
 * Creates and outputs a parse tree of the passed regex.
 *
 * @param {string} regex The regex string to parse.
 */
Regex.prototype.AddRegex = function(regex) {
	// Builds a parse tree from the passed regex.
	let regexTree = this.BuildParseTree(regex);
	
	// Outputs the parse tree.
	this.Print(regexTree);
}

/**
 * Tokenizes the regex and builds a parse tree from this.
 *
 * @param {string} regex The regex string to parse.
 * @returns {tree} A parse tree representing the input regex.
 */
Regex.prototype.BuildParseTree = function(regex) {
	// Get an array of tokens representing the regex string.
	let tokens = this.TokenizeRegex(regex);
	
	// Convert and return the array of tokens to a tree of tokens.
	return this.ParseTokens(tokens);
}

/**
 * Outputs a string interpretation of the given parse tree.
 *
 * @param {tree} tree The parse tree representing a regex string.
 */
Regex.prototype.Print = function(tree) {
	// Output the parse tree to the console as a string.
	console.log(this.AsString(tree[0], ""));
}

/**
 * Finds and returns a string interpretation of the given parse tree.
 *
 * @param {Token} token A 'Token' object that represents a regex expression.
 * @param {string} str The string to append values to.
 * @returns {string} A string interpretation of the regex parse tree.
 */
Regex.prototype.AsString = function(token, str) {
	// If the token represents an expression and has an object (Array) type, add its children to the string.
	if (token.type == 'expression' && typeof token.value == 'object') {
		
		// Signify that this is the start of an expression by using a left parenthesis.
		str += '(';

		// For every child of the given token, recursively add its value to the string.
		for (let i = 0; i < token.value.length; i++) {
			str = this.AsString(token.value[i], str);
		}
		
		// Signify that this is the end of an expression by using a right parenthesis.
		str += ')';
		
		// Signify that this token can be repeated 0 or more times.
		if (token.repetitions.end == -1)
			str += '*';
	}
	
	// If the token has a null value, it represents an empty symbol.
	else if (token.value == null) {
		str += '{}';
	}
	
	// Otherwise, the token represents a character or an or (|).
	else {
		str += token.value;
	}
	
	// Return the generated string.
	return str;
}

/**
 * Repeatedly expand and merge the token arrays until either all expressions are represented as
 * part of one main expression, or the number of repeats accepted (to prevent an infinite loop from
 * occuring) has been reached.
 *
 * @param {Array<Token>} tokens An array of 'Token' objects that represent the regular expression.
 * @returns {Array<Token>} An array of tokens, containing only one element (assuming the maximum
 *           number of repeats hasn't been reached) that acts as a root node to the tree.
 */
Regex.prototype.ParseTokens = function(tokens) {
	// The number of repeats of expanding and merging before the loop is forceably exited.
	let repeatsLeft = 10;
	
	// Assigns repetition values to the tokens, allowing the regex to be represented via only
	// characters, '|', parentheses, and '*'.
	tokens = this.AssignRepetitions(tokens);
	
	// While the array of tokens has more than one root, keep trying to merge to a single root.
	while (tokens.length != 1 && repeatsLeft > 0) {
		
		// The tokens are expanded by explicitly repeating sequences such as a+, a{3,5}, etc, and
		// by converting a{0, n} to n repeats of (a|empty).
		tokens = this.ExpandExpressions(tokens);
		
		// The tokens are merged by combining expanded sub-expressions into compound expressions.
		tokens = this.MergeExpressions(tokens);
		
		// Decrement the number of repeats left.
		repeatsLeft -= 1;
	}
	
	// Return the array of token(s).
	return tokens;
}

/**
 * Push copies of a given expression onto the token array n times.
 *
 * @param {Array<Token>} tokens An array of 'Token' objects.
 * @param {int} n The number of times to add a copy of the token onto the array.
 * @param {Token} token The token to copy onto the array.
 *
 * @returns {Array<Token>} The array of token objects, with n repeats of the expression added on.
 */
Regex.prototype.PushExpressions = function(tokens, n, token) {
	// Add n copies of the token to the array of tokens.
	for (let i = 0; i < n; i++) {
		tokens.push(token.Copy());
	}
	
	// Return the array of tokens with the copied tokens added.
	return tokens;
}

Regex.prototype.GetEmptyOr = function(orToken) {
	let expression = [
		new this.Token('structure','('),
		new this.Token('empty',null),
		new this.Token('or','|'),
		orToken,
		new this.Token('structure',')')
	];
	
	let newToken = new this.Token('expression', expression);
	
	expression[0].repetitions = new this.Repetition(1,1);
	expression[1].repetitions = new this.Repetition(1,1);
	expression[2].repetitions = new this.Repetition(1,1);
	expression[3].repetitions = new this.Repetition(1,1);
	expression[4].repetitions = new this.Repetition(1,1);
	newToken.repetitions = new this.Repetition(1,1);
	
	return newToken;
}

Regex.prototype.ExpandExpressions = function(tokens) {
	let n = tokens.length;
	let newTokens = [];
	let minimum, maximum;
	let newToken;
	
	
	for (let i = 0; i < n; i++) {
		newToken = tokens[i].Copy();
		
		if (tokens[i].type == 'expression') {
			minimum = tokens[i].repetitions.start;
			maximum = tokens[i].repetitions.end;
			
			if (minimum == 0 && maximum == -1) {
				newTokens.push(tokens[i]);
			} else if (minimum == 0 && maximum > 0) {
				newTokens = this.PushExpressions(newTokens, maximum, this.GetEmptyOr(newToken));
			} else if (minimum > 0 && minimum == maximum) {
				newToken.repetitions.start = 1;
				newToken.repetitions.end = 1;
				newTokens = this.PushExpressions(newTokens, minimum, newToken);
			} else if (minimum > 0 && minimum < maximum) {
				newToken.repetitions.start = 1;
				newToken.repetitions.end = 1;
				newTokens = this.PushExpressions(newTokens, minimum, newToken);
				newTokens = this.PushExpressions(newTokens, maximum - minimum, this.GetEmptyOr(newToken));
			} else if (minimum > 0 && maximum == -1) {
				newToken.repetitions.start = 1;
				newToken.repetitions.end = 1;
				newTokens = this.PushExpressions(newTokens, minimum, newToken.Copy());
				newToken.repetitions.start = 0;
				newToken.repetitions.end = -1;
				newTokens.push(newToken.Copy());
			} else {
				throw "ERROR", newToken;
			}
		}
		
		else {
			newTokens.push(newToken);
		}
	}
	
	return newTokens;
}

Regex.prototype.MergeExpressions = function(tokens) {
	let n = tokens.length;
	let newTokens = [];
	let token0, token1, token2;
	
	
	if (n == 2 && tokens[0].type == 'expression' && tokens[1].type == 'expression') {
		if ((tokens[0].repetitions.start == 0 && tokens[0].repetitions.end == -1) || (tokens[0].repetitions.start == 1 && tokens[0].repetitions.end == 1)) {
			if ((tokens[1].repetitions.start == 0 && tokens[1].repetitions.end == -1) || (tokens[1].repetitions.start == 1 && tokens[1].repetitions.end == 1)) {
				newTokens.push(new this.Token('expression', [tokens[0].Copy(), tokens[1].Copy()]));
				newTokens[0].repetitions = new this.Repetition(1, 1);
				return newTokens;
			}
		}
	} else if (n < 3) {
		return tokens;
	}

	newTokens[0] = tokens[0].Copy();
	newTokens[1] = tokens[1].Copy();
	
	for (let i = 2; i < n; i++) {
		
		
		if (newTokens.length < 2) {
			newTokens.push(tokens[i].Copy());
		} else {
			token0 = newTokens[newTokens.length - 2];
			token1 = newTokens[newTokens.length - 1];
			token2 = tokens[i].Copy();
			
			if (token0.value == '(' && token1.type == 'expression' && token2.value == ')') {
				token1.repetitions = token2.repetitions.Copy();
				newTokens.splice(newTokens.length - 2, 2);
				newTokens.push(token1);
			} else if (token0.type == 'expression' && token1.type == 'or' && token2.type == 'expression') {
				token1 = new this.Token('expression', [token0, new this.Token('or','|'), token2]);
				token1.value[1].repetitions = new this.Repetition(1,1);
				token1.repetitions = new this.Repetition(1,1);
				
				newTokens.splice(newTokens.length - 2, 2);
				newTokens.push(token1);
			} else if (token1.type == 'expression' && token2.type == 'expression') {
				if ((token1.repetitions.start == 0 && token1.repetitions.end == -1) || (token1.repetitions.start == 1 && token1.repetitions.end == 1)) {
					if ((token2.repetitions.start == 0 && token2.repetitions.end == -1) || (token2.repetitions.start == 1 && token2.repetitions.end == 1)) {
						token1 = new this.Token('expression', [token1.Copy(), token2.Copy()]);
						token1.repetitions = new this.Repetition(1,1);
						
						newTokens.splice(newTokens.length - 1, 1);
						newTokens.push(token1);
					}
					else
						newTokens.push(token2);
				}
				else
					newTokens.push(token2);
			}
			else
				newTokens.push(token2);
		}
	}

	return newTokens;
}

Regex.prototype.AssignRepetitions = function(tokens) {
	let n = tokens.length;
	
	if (n < 1)
		return tokens;
	
	let prev = tokens[0];
	let newTokens = [];
	
	for (let i = 1; i < n; i++) {
		if (prev.constructor == this.Token) {
			if (tokens[i].constructor == this.Token) {
				prev.repetitions = new this.Repetition(1,1);
			} else if (tokens[i].constructor == this.Repetition) {
				prev.repetitions = tokens[i];
			} else {
				throw "ERROR";
			}
			
			if (prev.type == 'character')
				prev.type = 'expression';
			
			newTokens.push(prev);
		}
		else if (prev.constructor == this.Repetition) {
			if (tokens[i].constructor != this.Token) {
				throw "ERROR";
			}
		}
		else {
			throw "ERROR";
		}
		
		prev = tokens[i];
	}
	
	if (prev.constructor == this.Token) {
		if (prev.type == 'character')
				prev.type = 'expression';
			
		prev.repetitions = new this.Repetition(1,1);
		newTokens.push(prev);
	}
	
	return newTokens;
}

Regex.prototype.TokenizeRegex = function(regex) {
	let n = regex.length;
	let tokens = [];
	let value;
	let notCommand = false;
	let brackets = { isTrue : false, ranges: [] }
	let longRep = { isTrue : false, valueA : '', valueB: '', val: 0 }
	
	for (let i = 0; i < n; i++) {
		value = regex[i];
		
		// A character can never be part of both longRep {a,b} and brackets [a-z].
		if (longRep.isTrue && brackets.isTrue) {
			throw "ERROR";
		}
		
		// A longRep character must be a digit, a comma, or a brace.
		else if (longRep.isTrue) {
			switch (value) {
				case '0':
				case '1':
				case '2':
				case '3':
				case '4':
				case '5':
				case '6':
				case '7':
				case '8':
				case '9':
					if (longRep.val == 0)
						longRep.valueA += value;
					else
						longRep.valueB += value;
					
					break;
				case ',':
					if (longRep.val == 0)
						longRep.val = 1;
					else
						throw "ERROR";
					
					break;
					
				case '}':
					let valA, valB;
					
					if (longRep.valueA == '')
						valA = 0;
					else
						valA = parseInt(longRep.valueA);
					
					if (longRep.val == 0)
						valB = valA;
					else if (longRep.valueB == '')
						valB = -1;
					else
						valB = parseInt(longRep.valueB);
					
					longRep.isTrue = false;
					longRep.valueA = '';
					longRep.valueB = '';
					longRep.val = 0;
					
					if (valB != -1 && valB < valA)
						throw "PARSE ERROR";
					
					tokens.push(new this.Repetition(valA, valB));
					break;
				default:
					throw "ERROR";
			}
		}
		
		else if (value == '\\') {
			notCommand = true;
		}
		
		// Ignore brackets for now.
		// else if (brackets.isTrue) {
		// }
			

		else if (notCommand) {
			tokens.push(new this.Token('character', value));
			notCommand = false;
		}

		else {
			switch (value) {
				case '[':
				case '(':
				case ')':
					tokens.push(new this.Token('structure', value));
					break;
					
				case '{':
					longRep.isTrue = true;
					break;
					
				case ']':
				case '}':
				case ',':
					throw "ERROR";
					
				case '\\':
					notCommand = true;
					break;
					
				case '*':
					tokens.push(new this.Repetition(0, -1));
					break;
				case '+':
					tokens.push(new this.Repetition(1, -1));
					break;
				case '?':
					tokens.push(new this.Repetition(0, 1));
					break;
					
				case '|':
					tokens.push(new this.Token('or', value));
					break;
					
				default:
					tokens.push(new this.Token('character', value));
					break;
			}
		}
	}
	
	return tokens;
}

Regex.prototype.Token = function(type, value) {
	this.type = type;
	this.value = value;
	this.repetitions = null;
	
	this.Copy = function() {
		let newToken = new this.constructor(this.type, this.value);
		newToken.repetitions = this.repetitions.Copy();
		return newToken;
	}
}

Regex.prototype.Repetition = function(start, end) {
	this.start = start;
	this.end = end;
	
	this.Copy = function() {
		return new this.constructor(this.start, this.end);
	}
}

