# regex-js

This project will convert a regular expression into an NFA (via Thompson's construction), build a
DFA for said NFA (subset construction), and then minimise the DFA (Hopcroft's algorithm).

This project will be used as a major component of the scanner in a lexical analyser for simple
(short) expressions. As such, it should be able to take a set of REs (representing each token type)
and combine them. This would look something like:

Regexs given: A, B, C

Regex generated: (A|B|C)\*

The final DFA should then generate an array of tokens (using some form of semi-final states that
represent the end of one of the regexs given) with the attributes of token-type and token-value.



Original Expression:

A: a|b<br/>
B: (a|b)+<br/>
C: (a\[a-d]\*(b|c)+a?|b){2,4}|c<br/>
D: (a|b){2,4}

Step 1: Surround with brackets.

C: ((a\[a-d]\*(b|c)+a?|b){2,4}|c)

Step 2: Rewrite \[a-N] as (a|b|...|N):

C: ((a(a|b|c|d)\*(b|c)+a?|b){2,4}|c)

Step 3: Rewrite + as \*:

B: ((a|b)(a|b)*)<br/>
C: ((a(a|b|c|d)\*(b|c)(b|c)\*a?|b){2,4}|c)

Step 4: Rewrite ? with {0, 1}:

C: ((a(a|b|c|d)\*(b|c)(b|c)\*a{0,1}|b){2,4}|c)

Step 5: Rewrite {a,b} with {0, b-a}:

C: (a(a|b|c|d)\*(b|c)(b|c)\*a{0,1}|b)(a(a|b|c|d)\*(b|c)(b|c)\*a{0,1}|b)(a(a|b|c|d)\*(b|c)(b|c)\*a{0,1}|b){0,2}|c)<br/>
D: (a|b)(a|b)(a|b){0,2}

Step 6: Rewrite {0, a} using empty:

C: (a(a|b|c|d)\*(b|c)(b|c)\*(a|empty)|b)(a(a|b|c|d)\*(b|c)(b|c)\*(a|empty)|b)((a(a|b|c|d)\*(b|c)(b|c)\*(a|empty)|b)|empty)((a(a|b|c|d)\*(b|c)(b|c)\*(a|empty)|b)|empty)|c)<br/>
D: (a|b)(a|b)((a|b)|empty)(a|b){0,1}
D: (a|b)(a|b)((a|b)|empty)((a|b)|empty)

The resulting regex string should contain only non-special characters, \*, empty characters, and parentheses.


Repetitions will be written in the form (a,b) where a is the minimum number of repetitions and b is the maximum.

Special Cases:

\* -> {0,} -> (0,-1) -> 0 or more

+ -> {1,} -> (1,-1) -> 1 or more

? -> {0,1} -> (0,1) -> 0 or 1

{0,2} -> (0,2) -> 0, 1 or 2

{2} -> (2,2) -> Exactly 2

{2,3} -> (2,3) -> 2 or 3

{3,} -> (3,-1) -> 3 or more

{,} -> (0,-1) -> 0 or more

{,2} -> (0,2) -> 0, 1 or 2

{} -> (0,0) -> Exactly 0

{0,1,2} -> ERROR

{2,1} -> ERROR