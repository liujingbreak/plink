/* eslint-disable no-console */
type TTYEventsCon = new() => TTYEvents;
interface TTYEvents {
  enableMouse(mode?: number): void;
  on(eventType: string, h: (evt: any) => void): void;
  pause(): void;
}
process.stdin.setRawMode(true);
const Term = require('../../__tests__/tty-events') as TTYEventsCon;
const term = new Term();
term.enableMouse(3);
term.on('mousedown', evt => console.log(evt));
term.on('keypress', (key) => {
  console.log('You pressed %s.', key.toString());
  if (key === 'Ctrl+c') {
    term.pause(); // Exit the program
  }
});
