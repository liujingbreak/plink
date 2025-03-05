"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.stdin.setRawMode(true);
const Term = require('../../__tests__/tty-events');
const term = new Term();
term.enableMouse(3);
term.on('mousedown', evt => console.log(evt));
term.on('keypress', (key) => {
    console.log('You pressed %s.', key.toString());
    if (key === 'Ctrl+c') {
        term.pause(); // Exit the program
    }
});
//# sourceMappingURL=test-tty-events.js.map