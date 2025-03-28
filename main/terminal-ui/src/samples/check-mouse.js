/* eslint-disable no-console */
// const rl = require('readline');

// Refer to https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h2-Mouse-Tracking
// SET_X10_MOUSE               9
// SET_VT200_MOUSE             1000
// SET_VT200_HIGHLIGHT_MOUSE   1001
// SET_BTN_EVENT_MOUSE         1002
// SET_ANY_EVENT_MOUSE         1003
//
// SET_FOCUS_EVENT_MOUSE       1004
//
// SET_ALTERNATE_SCROLL        1007
//
// SET_EXT_MODE_MOUSE          1005
// SET_SGR_EXT_MODE_MOUSE      1006
// SET_URXVT_EXT_MODE_MOUSE    1015
// SET_PIXEL_POSITION_MOUSE    1016
process.stdout.write('\x1b[?1000h');
process.stdout.write('\x1b[?1005h');
process.stdout.write('\x1b[?1003h'); // Enable all mouse events (including drag)
// process.stdout.write('\x1b[?1006h');
// process.stdout.write('\x1b[?1006h');

process.stdin.setRawMode(true);
process.stdin.resume();
function teardown() {
  process.stdout.write('\x1b[?1005l');
  // process.stdout.write('\x1b[?1006l');
  process.stdout.write('\x1b[?1003l');
  process.stdout.write('\x1b[?1000l');
}
process.on('uncaughtException', () => {
  teardown();
});
process.on('unhandledRejection', () => {
  teardown();
});
// process.stdin.setEncoding('utf8');
console.log('pid:', process.pid);
// rl.emitKeypressEvents(process.stdin);

console.log("Mouse event reporting enabled. Move or click the mouse to see events. Press 'q' to quit.");

const Q_CODE = 'q'.codePointAt(0);

process.stdin.on('data', (chunk) => {
  if (typeof chunk !== 'string') {
    if (chunk[0] === 0x1b && chunk[1] === 0x5b && chunk[2] === 0x4d) {
      const bArr = new Uint8Array(chunk).slice(3);
      console.log('mouseData buf', bArr.join());
    } else if (chunk[0] === 0x1b && chunk[1] === 0x5b && chunk[2] === 0x3c) {
      const bArr = new Uint8Array(chunk).slice(3);
      console.log('mouseData buf >', String.fromCharCode(bArr));
    } else if (chunk[0] === 0x03 || chunk[0] === Q_CODE) {
      teardown();
      process.exit();
    } else {
      console.log(chunk);
    }
    return;
  }
  if (chunk === '\u0003' || chunk === 'q') { // Ctrl+C or 'q' to exit
    // Disable mouse event reporting before exiting
    teardown();
    // process.stdout.write('\x1b[?1006l');
    process.exit();
  }

  // if (/^\x1b\[M/
  // Parse mouse event data
  if (chunk.startsWith('\x1b[M')) {
    const mouseData = chunk.slice(3);
    console.log('raw mouseData code', mouseData, ',' + [...mouseData].map(c => c.codePointAt(0)));
    // const buttonByte = mouseData.charCodeAt(0);
    // const pressType = buttonByte & 3;
    // const isMouseMoving = (buttonByte & 64) === 64;
    // const isDragging = isMouseMoving && pressType === 0;
    // const x = mouseData.charCodeAt(1) - 32;
    // const y = mouseData.charCodeAt(2) - 32;

    // // eslint-disable-next-line no-console
    // console.log(`Mouse event: button=${pressType}, x=${x}, y=${y}, buttonByte: ${buttonByte.toString(2)} ${isDragging ? '[dragging]' : isMouseMoving ? '[moving]' : ''} mouseData: ${[...mouseData].map(b => b.charCodeAt(0)).join()}`);
  } else {
    console.log('Unknown chunk code', chunk);
  }
});
