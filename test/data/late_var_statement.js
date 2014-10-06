// The var statement is after the first usage of the variable.
// It shall find that as the declaration.

answer = 42;  // cursor:answer reference:answer

var answer;  // declaration:answer

console.log('The answer is', answer); // reference:answer
