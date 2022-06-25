/**
 * Takes a regular expression, converts it into a DFA, and compares input strings against it.
 *
 * @param {string} regex The regex string to parse.
 */
function Regex(regex) {
	this.AddRegex(regex);
	this.dfa;
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
	
	this.dfa = new SubsetConstruction(nfa);
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
	if (token.type == 'expr' && token.value.constructor == Array) {
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
		if (token.repetitions[1] == -1)
			ab = nfa.Asterisk(ab);
		
		return ab;
	}
	
	// If the token represents a single character ('a'), return the NFA of this.
	else {
		return nfa.Singular(token.value.value);
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
	if (token.type == 'expr' && token.value.constructor == Array) {
		
		// Signify that this is the start of an expression by using a left parenthesis.
		str += '(';

		// For every child of the given token, recursively add its value to the string.
		for (let i = 0; i < token.value.length; i++) {
			//console.log("--",token.value);
			str = this.AsString(token.value[i], str);
		}
		
		// Signify that this is the end of an expression by using a right parenthesis.
		str += ')';
		
		// Signify that this token can be repeated 0 or more times.
		if (token.repetitions[1] == -1)
			str += '*';
	}
	
	// If 
	else if (token.type == 'expr' && token.value.constructor == this.Token){
		str = this.AsString(token.value, str);
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
	// Input:
	// <'meta', '(', (1,1)>
	// <'char', 'a', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'b', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'c', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'd', (1,1)>
	// <'meta', ')', (1,-1)>
	// <'char', 'b', (3,5)>
	// <'meta', '(', (1,1)>
	// <'char', 'c', (1,1)>
	// <'char', 'b', (0,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'd', (1,1)>
	// <'meta', ')', (0,-1)>
	
	// Output:
	// <'expr', [<'expr', [<'expr', [<'expr', [<'expr', 'a', (1,1)>,
	//                                         <'meta', '|', (1,1)>,
	//                                         <'expr', 'b', (1,1)>], (1,1)>,
	//                               <'meta', '|', (1,1)>,
	//                               <'expr', 'c', (1,1)>], (1,1)>,
	//                     <'meta', '|', (1,1)>,
	//                     <'expr', 'd', (1,1)>], (1,1)>,
	//           <'expr', [<'expr', [<'expr', [<'expr', [<'expr', [<'expr', 'a', (1,1)>,
	//                                                             <'meta', '|', (1,1)>,
	//                                                             <'expr', 'b', (1,1)>], (1,1)>,
	//                                                   <'meta', '|', (1,1)>,
	//                                                   <'expr', 'c', (1,1)>], (1,1)>,
	//                                         <'meta', '|', (1,1)>,
	//                                         <'expr', 'd', (1,1)>], (0,-1)>,
	//                               <'expr', [<'expr', [<'expr', [<'expr', [<'expr', <'char', 'b', (1,1)>, (1,1)>,
	//                                                                       <'expr', <'char', 'b', (1,1)>, (1,1)>], (1,1)>,
	//                                                             <'expr', <'char', 'b', (1,1)>, (1,1)>], (1,1)>,
	//                                                   <'expr', [<'char', null, (1,1)>,
	//	                                                           <'meta', '|', (1,1)>,
	//	                                                           <'char', 'b', (1,1)>], (1,1)>], (1,1)>,
	//                                         <'expr', [<'char', null, (1,1)>,
	//	                                                 <'meta', '|', (1,1)>,
	//	                                                 <'char', 'b', (1,1)>], (1,1)>], (1,1)>], (1,1)>,
	//                     <'expr', [<'expr', [<'expr', <'char', 'c', (1,1)>, (1,1)>,
	//                                         <'expr', [<'char', null, (1,1)>,
	//	                                                 <'meta', '|', (1,1)>,
	//	                                                 <'char', 'b', (1,1)>], (1,1)>], (1,1)>,
	//                               <'meta', '|', (1,1)>,
	//                               <'expr', <'char', 'd', (1,1)>, (1,1)>], (0,-1)>], (1,1)>], (1,1)>
	//
	// (I don't believe there are any errors in the above, but it was quite tedious to work out, so I may have missed a couple.)
	
	// Assigns repetition values to the tokens, allowing the regex to be represented via only
	// characters, '|', parentheses, and '*'.
	//tokens = this.AssignRepetitions(tokens);
	tokens = this.CharsToExprs(tokens);
	
	return this.TokenArrayToTree(tokens);
}

Regex.prototype.TokenArrayToTree = function(tokens) {
	// The number of repeats of expanding and merging before the loop is forceably exited.
	let repeatsLeft = 10;
	
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

Regex.prototype.CharsToExprs = function(tokens) {
	// Input:
	// <'meta', '(', (1,1)>
	// <'char', 'a', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'b', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'c', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'd', (1,1)>
	// <'meta', ')', (1,-1)>
	// <'char', 'b', (3,5)>
	// <'meta', '(', (1,1)>
	// <'char', 'c', (1,1)>
	// <'char', 'b', (0,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'd', (1,1)>
	// <'meta', ')', (0,-1)>
	
	// Output:
	// <'meta', '(', (1,1)>
	// <'expr', <'char', 'a', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'b', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'c', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'd', (1,1)>, (1,1)>
	// <'meta', ')', (1,-1)>
	// <'expr', <'char', 'b', (1,1)>, (3,5)>
	// <'meta', '(', (1,1)>
	// <'expr', <'char', 'c', (1,1)>, (1,1)>
	// <'expr', <'char', 'b', (1,1)>, (0,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'd', (1,1)>, (1,1)>
	// <'meta', ')', (0,-1)>
	
	let n = tokens.length;
	let newTokens = [];
	let newToken;
	
	// For each character token, assign it as the only leaf node of an expression.
	for (let i = 0; i < n; i++) {
		if (tokens[i].type == 'char') {
			// Set the character repetitions to [1,1], and assign the characters original repetitions to the expression.
			newToken = new this.Token(tokens[i].type, tokens[i].value, [1,1]);
			newTokens.push(new this.Token('expr', newToken, tokens[i].repetitions));
		} else {
			// Add the non-character token to the array.
			newTokens.push(tokens[i].Copy());
		}
	}
	
	return newTokens;
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
		new this.Token('expr',new this.Token('char',null,[1,1]),[1,1]),
		new this.Token('meta','|',[1,1]),
		orToken
	];
	
	// Add the expression to a new token.
	let newToken = new this.Token('expr', expression, [1,1]);
	
	// Return the new token.
	return newToken;
}

Regex.prototype.ExpandExpressions = function(tokens) {
	// Input:
	// <'meta', '(', (1,1)>
	// <'expr', <'char', 'a', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'b', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'c', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'd', (1,1)>, (1,1)>
	// <'meta', ')', (1,-1)>
	// <'expr', <'char', 'b', (1,1)>, (3,5)>
	// <'meta', '(', (1,1)>
	// <'expr', <'char', 'c', (1,1)>, (1,1)>
	// <'expr', <'char', 'b', (1,1)>, (0,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'd', (1,1)>, (1,1)>
	// <'meta', ')', (0,-1)>
	
	// Output:
	// <'meta', '(', (1,1)>
	// <'expr', <'char', 'a', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'b', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'c', (1,1)>, (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'd', (1,1)>, (1,1)>
	// <'meta', ')', (1,-1)>
	// <'expr', <'char', 'b', (1,1)>, (1,1)>
	// <'expr', <'char', 'b', (1,1)>, (1,1)>
	// <'expr', <'char', 'b', (1,1)>, (1,1)>
	// <'expr', [<'char', null, (1,1)>,
	//	         <'meta', '|', (1,1)>,
	//	         <'char', 'b', (1,1)>], (1,1)>
	// <'expr', [<'char', null, (1,1)>,
	//	         <'meta', '|', (1,1)>,
	//	         <'char', 'b', (1,1)>], (1,1)>
	// <'meta', '(', (1,1)>
	// <'expr', <'char', 'c', (1,1)>, (1,1)>
	// <'expr', [<'char', null, (1,1)>,
	//	         <'meta', '|', (1,1)>,
	//	         <'char', 'b', (1,1)>], (1,1)>
	// <'meta', '|', (1,1)>
	// <'expr', <'char', 'd', (1,1)>, (1,1)>
	// <'meta', ')', (0,-1)>
	
	let n = tokens.length;
	let newTokens = [];
	let minimum, maximum;
	let newToken;
	let newExpressions;
	
	
	// Repeat all expressions the required number of times.
	for (let i = 0; i < n; i++) {
		newToken = tokens[i].Copy();
		
		if (tokens[i].type == 'expr') {
			[minimum, maximum] = tokens[i].repetitions;
			
			// The token is a*, so add it as is.
			if (minimum == 0 && maximum == -1) {
				newTokens.push(newToken);
			}
			
			// The token is a{0,n} where n > 0, so add n (empty|a) expressions.
			else if (minimum == 0 && maximum > 0) {
				newExpressions = this.PushExpressions([], maximum, this.GetEmptyOr(newToken));
				newTokens.push(this.TokenArrayToTree(newExpressions)[0]);
			}
			
			// The token is a{n,n} where n > 0, so add n 'a' expressions.
			else if (minimum > 0 && minimum == maximum) {
				newToken.repetitions = [1,1]
				newExpressions = this.PushExpressions([], minimum, newToken);
				newTokens.push(this.TokenArrayToTree(newExpressions)[0]);
			}
			
			// The token is a{n,m} where 0 < n < m, so add n 'a' expressions and m-n (empty|a) expressions.
			else if (minimum > 0 && minimum < maximum) {
				newToken.repetitions = [1,1]
				newExpressions = this.PushExpressions([], minimum, newToken);
				newExpressions = this.PushExpressions(newExpressions, maximum - minimum, this.GetEmptyOr(newToken));
				newTokens.push(this.TokenArrayToTree(newExpressions)[0]);
			}
			
			// The token is a{n,-1}, so add n 'a' expressions and a single a* expression.
			else if (minimum > 0 && maximum == -1) {
				newToken.repetitions = [1,1]
				newExpressions = this.PushExpressions([], minimum, newToken);
				
				newToken.repetitions = [0,-1]
				newExpressions.push(newToken.Copy());
				
				newTokens.push(this.TokenArrayToTree(newExpressions)[0]);
				
			}
			
			// The token is none of the above, so something must be wrong.
			// The token must be undefined or a{n,m} where:
			//   - n < 0 or
			//   - m < -1 or
			//   - n > m and m != -1 or
			//   - n = 0 and m = 0
			else {
				throw "ERROR", newToken;
			}
		}
		
		// The token wasn't an expression, so add it as is.
		else {
			newTokens.push(newToken);
		}
	}
	
	return newTokens;
}

Regex.prototype.EqualRepetitions = function(repetitionsA, repetitionsB) {
	// True if the two repetition arrays represent the same number of repetitions.
	return (repetitionsA[0] == repetitionsB[0] && repetitionsA[1] == repetitionsB[1]);
}

Regex.prototype.HasRepetitions = function(token, repetitionOptions) {
	let n = repetitionOptions.length;
	
	// True if at least one of the repetition options given represents the number of repetitions of the given token.
	for (let i = 0; i < n; i++) {
		if (this.EqualRepetitions(token.repetitions, repetitionOptions[i]))
			return true;
	}
	
	return false;
}

Regex.prototype.MergeExpressions = function(tokens) {
	// Input:
	// 00 <'meta', '(', (1,1)>
	// 01 <'expr', <'char', 'a', (1,1)>, (1,1)>
	// 02 <'meta', '|', (1,1)>
	// 03 <'expr', <'char', 'b', (1,1)>, (1,1)>
	// 04 <'meta', '|', (1,1)>
	// 05 <'expr', <'char', 'c', (1,1)>, (1,1)>
	// 06 <'meta', '|', (1,1)>
	// 07 <'expr', <'char', 'd', (1,1)>, (1,1)>
	// 08 <'meta', ')', (1,-1)>
	// 09 <'expr', <'char', 'b', (1,1)>, (1,1)>
	// 10 <'expr', <'char', 'b', (1,1)>, (1,1)>
	// 11 <'expr', <'char', 'b', (1,1)>, (1,1)>
	// 12 <'expr', [<'char', null, (1,1)>,
	//	            <'meta', '|', (1,1)>,
	//	            <'char', 'b', (1,1)>], (1,1)>
	// 13 <'expr', [<'char', null, (1,1)>,
	//	            <'meta', '|', (1,1)>,
	//	            <'char', 'b', (1,1)>], (1,1)>
	// 14 <'meta', '(', (1,1)>
	// 15 <'expr', <'char', 'c', (1,1)>, (1,1)>
	// 16 <'expr', [<'char', null, (1,1)>,
	//	            <'meta', '|', (1,1)>,
	//	            <'char', 'b', (1,1)>], (1,1)>
	// 17 <'meta', '|', (1,1)>
	// 18 <'expr', <'char', 'd', (1,1)>, (1,1)>
	// 19 <'meta', ')', (0,-1)>
	
	// Output:
	// 20. Merge 1, 2 and 3 into an expression. a|b
	// 21. Merge 20, 4 and 5 into an expression. (a|b)|c
	// 22. Merge 21, 6 and 7 into an expression. ((a|b)|c)|d
	// 23. Merge 0, 22 and 8 into an expression. (((a|b)|c)|d){1,-1}
	// 24. Merge 9 and 10 into an expression. bb
	// 25. Merge 24 and 11 into an expression (bb)b
	// 26. Merge 25 and 12 into an expression ((bb)b)(empty|b)
	// 27. Merge 26 and 13 into an expression (((bb)b)(empty|b))(empty|b)
	// 28. Merge 15 and 16 into an expression c(empty|b)
	// 29. Merge 28, 17 and 18 into an expression (c(empty|b))|d
	// 30. Merge 14, 29 and 19 into an expression ((c(empty|b))|d){0,-1}
	// Return [23, 27, 30]
	//
	// <'expr', [<'expr', [<'expr', [<'expr', 'a', (1,1)>,
	//                               <'meta', '|', (1,1)>,
	//                               <'expr', 'b', (1,1)>], (1,1)>,
	//                     <'meta', '|', (1,1)>,
	//                     <'expr', 'c', (1,1)>], (1,1)>,
	//           <'meta', '|', (1,1)>,
	//           <'expr', 'd', (1,1)>], (1,-1)>
	// <'expr', [<'expr', [<'expr', [<'expr', [<'expr', <'char', 'b', (1,1)>, (1,1)>,
	//                                         <'expr', <'char', 'b', (1,1)>, (1,1)>], (1,1)>,
	//                               <'expr', <'char', 'b', (1,1)>, (1,1)>], (1,1)>,
	//                     <'expr', [<'char', null, (1,1)>,
	//	                             <'meta', '|', (1,1)>,
	//	                             <'char', 'b', (1,1)>], (1,1)>], (1,1)>,
	//           <'expr', [<'char', null, (1,1)>,
	//	                   <'meta', '|', (1,1)>,
	//	                   <'char', 'b', (1,1)>], (1,1)>], (1,1)>
	// <'expr', [<'expr', [<'expr', <'char', 'c', (1,1)>, (1,1)>,
	//                     <'expr', [<'char', null, (1,1)>,
	//	                             <'meta', '|', (1,1)>,
	//	                             <'char', 'b', (1,1)>], (1,1)>], (1,1)>,
	//           <'meta', '|', (1,1)>,
	//           <'expr', <'char', 'd', (1,1)>, (1,1)>], (0,-1)>
	//
	// (I don't believe there are any errors in the above, but it was quite tedious to work out, so I may have missed a couple.)
	
	let n = tokens.length;
	let newTokens = [];
	let token0, token1, token2;
	
	// If there are only two expressions in the array of expressions and they both have valid repetitions, merge them.
	if (n == 2 && tokens[0].type == 'expr' && tokens[1].type == 'expr') {
		if (this.HasRepetitions(tokens[0], [[0,-1],[1,1]]) && this.HasRepetitions(tokens[1], [[0,-1],[1,1]])) {
			newTokens.push(new this.Token('expr', [tokens[0].Copy(), tokens[1].Copy()], [1,1]));
			return newTokens;
		}
	}
	
	// If the array is empty or only contains 1 element, return it.
	else if (n < 3) {
		return tokens;
	}
	
	newTokens[0] = tokens[0].Copy();
	newTokens[1] = tokens[1].Copy();
	
	for (let i = 2; i < n; i++) {
		// If there aren't enough tokens in the new tokens array to merge, don't bother trying.
		if (newTokens.length < 2) {
			newTokens.push(tokens[i].Copy());
		}
		
		// Try to merge the incoming token with the tail of the token array.
		else {
			token0 = newTokens[newTokens.length - 2];
			token1 = newTokens[newTokens.length - 1];
			
			token2 = tokens[i].Copy();

			// If a single expression (surrounded by parentheses) is found, remove the parentheses.
			if (token0.value == '(' && token1.type == 'expr' && token2.value == ')') {
				token1.repetitions = token2.repetitions;
				newTokens.splice(newTokens.length - 2, 2);
				newTokens.push(token1);
			}
			
			// If an expression of the form 'a|b' is found, merge it into a single expression.
			else if (token0.type == 'expr' && token1.type == 'meta' && token1.value == '|' && token2.type == 'expr') {
				token1 = new this.Token('expr', [token0, new this.Token('meta','|',[1,1]), token2], [1,1]);
				newTokens.splice(newTokens.length - 2, 2);
				newTokens.push(token1);
			}
			
			// If an expression 'ab' is found, try to merge this into a single expression.
			else if (token1.type == 'expr' && token2.type == 'expr') {
				if (this.HasRepetitions(token1, [[0,-1],[1,1]]) && this.HasRepetitions(token2, [[0,-1],[1,1]])) {
					token1 = new this.Token('expr', [token1.Copy(), token2.Copy()], [1,1]);
					newTokens.splice(newTokens.length - 1, 1);
					newTokens.push(token1);
				}
				
				// If it can't be merged, just add the expression.
				else {
					newTokens.push(token2);
				}
			}
			
			// If no merge can be found, just add the token to the new token array.
			else {
				newTokens.push(token2);
			}
		}
	}

	// Return the array of new tokens.
	return newTokens;
}

Regex.prototype.TokenizeRegex = function(regex) {
	// Input:
	// (a|b|c|d)+b{3,5}(cb?|d)*
	
	// Output:
	// <'meta', '(', (1,1)>
	// <'char', 'a', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'b', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'c', (1,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'd', (1,1)>
	// <'meta', ')', (1,-1)>
	// <'char', 'b', (3,5)>
	// <'meta', '(', (1,1)>
	// <'char', 'c', (1,1)>
	// <'char', 'b', (0,1)>
	// <'meta', '|', (1,1)>
	// <'char', 'd', (1,1)>
	// <'meta', ')', (0,-1)>

	
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
					
					tokens[tokens.length - 1].ChangeRepetitions([valA,valB])
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
			tokens.push(new this.Token('char', value, [1,1]));
			notCommand = false;
		}

		else {
			switch (value) {
				case '[':
				case '(':
				case ')':
				case '|':
					tokens.push(new this.Token('meta', value, [1,1]));
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
					tokens[tokens.length - 1].ChangeRepetitions([0,-1]);
					break;
				case '+':
					tokens[tokens.length - 1].ChangeRepetitions([1,-1])
					break;
				case '?':
					tokens[tokens.length - 1].ChangeRepetitions([0,1])
					break;
					
				default:
					tokens.push(new this.Token('char', value, [1,1]));
					break;
			}
		}
	}
	
	return tokens;
}

Regex.prototype.Token = function(type, value, repetitions) {
	this.type = type;
	this.value = value;
	this.repetitions = repetitions;
	
	this.ChangeRepetitions = function(newRepetitions) {
		this.repetitions = newRepetitions
	}
	
	this.Copy = function() {
		return new this.constructor(this.type, this.value, this.repetitions);
	}
}


Regex.prototype.IsValidWord = function(word) {
	return this.dfa.IsValidWord(word);
}

Regex.prototype.FindAll = function(word) {
	return this.dfa.FindAll(word);
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


DFA.prototype.IsValidWord = function(word) {
	let state = 0;
	
	for (let i = 0; i < word.length; i++) {
		if (!this.transitionTable.hasOwnProperty(state) || !this.transitionTable[state].hasOwnProperty(word[i]))
			return false;
		
		state = this.transitionTable[state][word[i]];
	}
	
	if (this.transitionTable[state]['end'])
		return true;
	
	return false;
}

DFA.prototype.FindAll = function(word) {
	let state = 0;
	let valid = [];
	let w, x;
	
	for (let i = 0; i < word.length; i++) {
		x = this.ValidWordLength(word, i);
		
		if (x != -1) {
			w = '';
			
			for (let j = i; j <= x; j++) {
				w += word[j];
			}
			
			i = x;
			
			if (!valid.includes(w))
				valid.push(w);
		}
	}

	return valid;
}

DFA.prototype.ValidWordLength = function(word, start) {
	let state = 0;
	let lastValid = -1;
	
	for (let i = start; i < word.length; i++) {
		
		if (!this.transitionTable.hasOwnProperty(state) || !this.transitionTable[state].hasOwnProperty(word[i])) {
			return lastValid;
		}
		
		else if (this.IsDeadState(this.transitionTable[state][word[i]])) {
			return lastValid;
		}
			
		state = this.transitionTable[state][word[i]];
		
		if (this.transitionTable[state]['end'])
			lastValid = i;
	}
	
	return lastValid;
}

DFA.prototype.IsDeadState = function(state) {
	return this.IsDeadStateRecursive(state, []);
}

DFA.prototype.IsDeadStateRecursive = function(state, checked) {
	let symbols = Object.keys(this.transitionTable[state]);
	
	// False if end.
	if (this.transitionTable[state]['end'])
		return false;
	
	// True if dead state or cyclic (so we don't re-check it).
	if (symbols.length == 2 || checked.includes(state))
		return true;
	
	checked.push(state);
	
	// Search all branches for at least one end or all dead.
	for (let i = 0; i < symbols.length; i++) {
		if (symbols[i] != 'start' && symbols[i] != 'end') {
			if (!this.IsDeadStateRecursive(this.transitionTable[state][symbols[i]], checked)) {
				return false;
			}
		}
	}
	
	return true;
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
	
	this.AddDeadState(nfa.values);
	this.SimplifyDeadStates();
	//this.Minimise(nfa.values);
	return this.dfa;
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

SubsetConstruction.prototype.AddDeadState = function(symbols) {
	for (let i = 0; i < this.mappings; i++) {
		for (let j = 0; j < symbols.length; j++) {
			if (symbols[j] != null && !this.dfa.transitionTable[i].hasOwnProperty(symbols[j])) {
				if (!this.dfa.transitionTable.hasOwnProperty(this.mappings))
					this.dfa.transitionTable[this.mappings] = { start: false, end: false };
				
				this.dfa.transitionTable[i][symbols[j]] = this.mappings;
			}
		}
	}
	
	if (this.dfa.transitionTable.hasOwnProperty(this.mappings))
		this.mappings += 1;
}

SubsetConstruction.prototype.IsDeadState = function(state) {
	return this.IsDeadStateRecursive(state, []);
}


SubsetConstruction.prototype.IsDeadStateRecursive = function(state, checked) {
	let symbols = Object.keys(this.dfa.transitionTable[state]);
	
	// False if end.
	if (this.dfa.transitionTable[state]['end'])
		return false;
	
	// True if dead state or cyclic (so we don't re-check it).
	if (symbols.length == 2 || checked.includes(state))
		return true;
	
	checked.push(state);
	
	// Search all branches for at least one end or all dead.
	for (let i = 0; i < symbols.length; i++) {
		if (symbols[i] != 'start' && symbols[i] != 'end') {
			if (!this.IsDeadStateRecursive(this.dfa.transitionTable[state][symbols[i]], checked)) {
				return false;
			}
		}
	}
	
	return true;
}


SubsetConstruction.prototype.SimplifyDeadStates = function() {
	let deadStates = [];
	
	for (let i = 0; i < this.mappings - 1; i++) {
		if (this.IsDeadState(i)) {
			this.RemoveState(i, this.mappings - 1);
		}
	}
}

SubsetConstruction.prototype.RemoveState = function(state, newState) {
	// For every state i where i > state to remove, assign object at i to i-1.
	// Remove the last object and decrement mappings.
	for (let i = 0; i < this.mappings; i++) {
		let symbols = Object.keys(this.dfa.transitionTable[state]);
		
		for (let j = 0; j < symbols.length; j++) {
			if (symbols[j] != 'start' && symbols[j] != 'end') {
				if (this.dfa.transitionTable[i][symbols[j]] == state)
					this.dfa.transitionTable[i][symbols[j]] = newState;
				
				if (this.dfa.transitionTable[i][symbols[j]] > state)
					this.dfa.transitionTable[i][symbols[j]] -= 1;
			}
		}
		
		if (i > state) {
			this.dfa.transitionTable[i - 1] = this.dfa.transitionTable[i];
		}
	}
	
	delete this.dfa.transitionTable[this.mappings - 1];
	this.mappings -= 1;
}


// SubsetConstruction.prototype.Minimise will use Hopcroft's algorithm, but I haven't gotten yet figured out how to do this.