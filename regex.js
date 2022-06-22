function Regex(regex) {
	this.nfa = new NFA();
	
	if (typeof regex == "string") {
		this.AddRegex(regex);
	}
	
	else if (typeof regex == 'object' && regex.constructor == Array) {
		let n = regex.length;
		
		for (let i = 0; i < n; i++) {
			this.AddRegex(regex[i]);
		}
	}
	
	
	//let nfa = new NFA();
	//nfa.AddRegex("abc");
	//console.log(nfa.transitionTable);
}

Regex.prototype.AddRegex = function(regex) {
	console.log(this.RegexToTree(regex));
}


Regex.prototype.Findall = function(expr) {
	return expr;
}

Regex.prototype.RegexToTree = function(regex) {
	return this.TokenizeRegex(regex);
}

Regex.prototype.TokenizeRegex = function(regex) {
	return regex;
}

Regex.prototype.Token = function(type, value) {
	this.type = type;
	this.value = value;
}


RE = {};

RE.Findall = function(regex, expr) {
	let re = new Regex(regex);
	return re.Findall(expr);
}




function NFA() {
	this.transitionTable = {};
	this.size = 0;
}

NFA.prototype.AddRegex = function(regex) {
	let n = regex.length;
	let state = 0;
	
	// Add 0 as a new state if not already added.
	if (this.size == 0)
		this.size = 1;
	
	for (let i = 0; i < n; i++)
		state = this.AddValue(state, regex[i]);
}

NFA.prototype.AddValue = function(oldState, value) {
	// If the old state doesn't have any other transitions yet, add an empty object to add
	// transitions to.
	if (!this.transitionTable.hasOwnProperty(oldState))
		this.transitionTable[oldState] = {};
	
	// If the old state doesn't already have this transition, add the transition and set the next
	// state to a new node name (theoretically, this could overflow given too many states).
	if (!this.transitionTable[oldState].hasOwnProperty(value))
		this.transitionTable[oldState][value] = this.size++;
	
	// Return the name of the next node.
	return this.transitionTable[oldState][value];
}