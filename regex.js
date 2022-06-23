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
	
	// Build an NFA for the parse tree.
	let nfa = this.BuildNFA(regexTree[0]);
	
	// Outputs the parse tree.
	this.Print(regexTree);
	
	// Output the NFA.
	nfa.Print();
	
	let dfa = new SubsetConstruction(nfa);
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
 * Builds an NFA from the root nodes.
 *
 * @param {Token} token A token representing some subtree of the regex parse tree.
 * @returns {NFA} An NFA representing the current subtree.
 */
Regex.prototype.BuildNFA = function(token) {
	let nfa = new NFA();
	
	// If the token represents an 'ab' or 'a|b' NFA, return said NFA.
	if (token.type == 'expression' && typeof token.value == 'object') {
		let a, b, ab;
		
		// The token has two values, so must be an 'ab' NFA.
		if (token.value.length == 2) {
			a = this.BuildNFA(token.value[0]);
			b = this.BuildNFA(token.value[1]);
			ab = nfa.And(a, b);
		}
		
		// The token has three values, so must be an 'a|b' NFA.
		else if (token.value.length == 3) {
			a = this.BuildNFA(token.value[0]);
			b = this.BuildNFA(token.value[2]);
			ab = nfa.Or(a, b);
		}
		
		// The token has 0, 1, or more than 3 values, so is unknown.
		else {
			throw "ERROR";
		}
		
		// If the token is encapsulated by a * (zero or more occurances), find the NFA representing this.
		if (token.repetitions.end == -1)
			ab = nfa.Asterisk(ab);
		
		return ab;
	}
	
	// If the token represents a single character ('a'), return the NFA of this.
	else {
		return nfa.Singular(token.value);
	}
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

/**
 * Create a new expression representing (empty | a) for some expression a = 'orToken'.
 *
 * @param {Token} orToken The token to be combined with 'empty' in an or expression.
 *
 * @returns {Token} The token representing the or expression.
 */
Regex.prototype.GetEmptyOr = function(orToken) {
	// Create an (empty | a) expression.
	let expression = [
		new this.Token('empty',null),
		new this.Token('or','|'),
		orToken
	];
	
	// Add the expression to a new token.
	let newToken = new this.Token('expression', expression);
	
	// Set the individual repetitions to 1.
	expression[0].repetitions = new this.Repetition(1,1);
	expression[1].repetitions = new this.Repetition(1,1);
	expression[2].repetitions = new this.Repetition(1,1);
	
	// Set the total repetitions to 1.
	newToken.repetitions = new this.Repetition(1,1);
	
	// Return the new token.
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
					else {
						newTokens.push(token2);
					}
				}
				else {
					newTokens.push(token2);
				}
			}
			else {
				newTokens.push(token2);
			}
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

function NFA() {
	this.transitionTable = {};
	this.end = 0;
	this.values = [];
}

NFA.prototype.Print = function() {
	let value;
	let n = this.values.length
	
	let str = "Start: 0\nEnd: " + this.end + "\n";
	
	
	for (let i = 0; i < this.end; i++) {
		if (!this.transitionTable.hasOwnProperty(i))
			continue;
		
		
		str += "\nState: " + i + ":";
		
		for (let j = 0; j < n; j++) {
			value = this.values[j];
			
			str += " [" + value + ": ";
			
			if (!this.transitionTable[i].hasOwnProperty(value))
				str += "/";
			else {
				let values = this.transitionTable[i][value];
				str += values[0];
				
				for (let k = 1; k < values.length; k++)
					str += ", " + values[k];
			}
			
			str += "]";
		}
	}
	
	console.log(str);
}

NFA.prototype.AddTransition = function(state0, value, state1) {
	if (!this.transitionTable.hasOwnProperty(state0))
		this.transitionTable[state0] = {};
	
	if (!this.transitionTable[state0].hasOwnProperty(value))
		this.transitionTable[state0][value] = [];
	
	this.transitionTable[state0][value].push(state1);
	
	if (state1 > this.end)
		this.end = state1;
	
	if (!this.values.includes(value))
		this.values.push(value);
}

NFA.prototype.Singular = function(value) {
	let nfa = new this.constructor();
	
	nfa.AddTransition(0, value, 1);
	
	return nfa;
}

NFA.prototype.AddTransitions = function(nfa, start) {
	let n = nfa.values.length;
	let value, states;
	
	for (let i = 0; i < nfa.end; i++) {
		this.transitionTable[start + i] = {};
		
		for (let j = 0; j < n; j++) {
			value = nfa.values[j];
			
			if (nfa.transitionTable[i].hasOwnProperty(value)) {
				states = nfa.transitionTable[i][value];
				
				for (let k = 0; k < states.length; k++)
					this.AddTransition(start + i, value, start + states[k]);
			}
		}
	}
}

NFA.prototype.And = function(nfaA, nfaB) {
	let nfa = new this.constructor();

	nfa.AddTransitions(nfaA, 0);
	nfa.AddTransition(nfaA.end, null, nfaA.end + 1);
	nfa.AddTransitions(nfaB, nfaA.end + 1);
	
	return nfa;
}

NFA.prototype.Or = function(nfaA, nfaB) {
	let nfa = new this.constructor();
	let k = 1;
	
	nfa.AddTransition(0, null, 1);
	nfa.AddTransitions(nfaA, 1);
	
	nfa.AddTransition(0, null, nfaA.end + 2);
	nfa.AddTransitions(nfaB, nfaA.end + 2);
	
	nfa.AddTransition(nfaA.end + 1, null, nfaA.end + nfaB.end + 3);
	nfa.AddTransition(nfaA.end + nfaB.end + 2, null, nfaA.end + nfaB.end + 3);
	return nfa;
}

NFA.prototype.Asterisk = function(nfa) {
	let nfaNew = new this.constructor();

	nfaNew.AddTransition(0, null, 1);
	nfaNew.AddTransitions(nfa, 1);
	
	nfaNew.AddTransition(nfa.end + 1, null, 1);
	
	nfaNew.AddTransition(nfa.end + 1, null, nfa.end + 2);
	nfaNew.AddTransition(0, null, nfa.end + 2);
	
	return nfaNew;
}




NFA.prototype.eClosure = function(startStates) {
	let reachable = [];
	let r0, r1;
	let state;
	
	// Add all states reachable, and the eClosure of all those states.
	for (let i = 0; i < startStates.length; i++) {
		state = startStates[i];
		
		// Add the current state to reachable states.
		reachable.push(state);
		
		// If the state doesn't exist, ignore it.
		if (!this.transitionTable.hasOwnProperty(state))
			continue;
		
		// If the state has no eClosure, ignore it.
		if (!this.transitionTable[state].hasOwnProperty(null))
			continue;
		
		// Get all states immediately reachable by eClosure.
		r0 = this.transitionTable[state][null];
		
		// Recursively call eClosure for all immediately reachable states.
		r1 = this.eClosure(r0);
			
		for (let j = 0; j < r0.length; j++) {
			// Add all immediately reachable states.
			if (!reachable.includes(r0[j])) {
				reachable.push(r0[j]);
			}
		}
			
		for (let j = 0; j < r1.length; j++) {
			// Add all non-immediately reachable states.
			if (!reachable.includes(r1[j])) {
				reachable.push(r1[j]);
			}
		}
	}
	
	// Return all reachable states.
	return reachable;
}

NFA.prototype.Move = function(startStates, symbol) {
	let reachable = [];
	let resultantStates;
	let state;
	
	// Add all states reachable, after symbol 'symbol' has been input.
	for (let i = 0; i < startStates.length; i++) {
		state = startStates[i];

		// If there is a transition from this state given the symbol, add all resultant states to reachable.
		if (this.transitionTable.hasOwnProperty(state) && this.transitionTable[state].hasOwnProperty(symbol)) {
			resultantStates = this.transitionTable[state][symbol];
			
			for (let j = 0; j < resultantStates.length; j++) {
				reachable.push(resultantStates[j]);
			}
		}
	}
	
	// Return all reachable states.
	return reachable;
}




function DFA() {
	this.transitionTable = {};
}


function SubsetConstruction(nfa) {
	this.StateMapping = {};
	this.dfa = new DFA();
	
	this.mappings = 0;
	
	this.Build(nfa);
	
	for (let i = 0; i < this.mappings; i++) {
		if (this.StateMapping[i].includes(0))
			this.dfa.transitionTable[i]['start'] = true;
		else
			this.dfa.transitionTable[i]['start'] = false;
		
		if (this.StateMapping[i].includes(nfa.end))
			this.dfa.transitionTable[i]['end'] = true;
		else
			this.dfa.transitionTable[i]['end'] = false;
	}
	
	console.log(this.dfa);
}

SubsetConstruction.prototype.GetMapping = function(nfaStates) {
	let memStates, flag;
	
	// Return a pre-exisiting mapping, if one exists.
	for (let i = 0; i < this.mappings; i++) {
		memStates = this.StateMapping[i];
		flag = true;
		
		if (memStates.length != nfaStates.length)
			continue;
		
		// Neither state array should contain duplicate state elements.
		for (let j = 0; j < nfaStates.length; j++) {
			if (!memStates.includes(nfaStates[j])) {
				flag = false;
				break;
			}
		}
		
		if (flag) {
			return i;
		}
	}
	
	// Add a new mapping if no existing mapping exists.
	this.StateMapping[this.mappings] = nfaStates;
	this.dfa.transitionTable[this.mappings] = {};
	this.mappings += 1;
	
	
	// Return the newly created mapping.
	return this.mappings - 1;
}


SubsetConstruction.prototype.HasMapping = function(nfaStates) {
	let memStates, flag;
	
	// Return a pre-exisiting mapping, if one exists.
	for (let i = 0; i < this.mappings; i++) {
		memStates = this.StateMapping[i];
		flag = true;
		
		if (memStates.length != nfaStates.length)
			continue;
		
		// Neither state array should contain duplicate state elements.
		for (let j = 0; j < nfaStates.length; j++) {
			if (!memStates.includes(nfaStates[j])) {
				flag = false;
				break;
			}
		}
		
		if (flag) {
			return true;
		}
	}
	
	return false;
}

SubsetConstruction.prototype.Build = function(nfa) {
	let symbols = [];
	
	// Get all starting states via eClosure of state 0.
	let startStates = nfa.eClosure([0]);
	
	// Populate the array of symbols with all symbols excluding null (empty).
	for (let i = 0; i < nfa.values.length; i++) {
		if (nfa.values[i] != null) {
			symbols.push(nfa.values[i]);
		}
	}

	this.Recursive(nfa, this.GetMapping(startStates), symbols);
}

SubsetConstruction.prototype.Recursive = function(nfa, state, symbols) {
	let symbol, states, mapping;
	
	for (let i = 0; i < symbols.length; i++) {
		symbol = symbols[i];
		
		let move = nfa.Move(this.StateMapping[state], symbol);
		
		states = nfa.eClosure(move);
		
		if (states.length > 0 && !this.HasMapping(states)) {
			mapping = this.GetMapping(states);
			this.dfa.transitionTable[state][symbol] = mapping;
			this.Recursive(nfa, mapping, symbols);
		} else {
			this.dfa.transitionTable[state][symbol] = this.GetMapping(states);
		}
	}
}