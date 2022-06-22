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