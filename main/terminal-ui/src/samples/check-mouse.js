process.stdout.write('\x1b[?1000h');
process.stdout.write('\x1b[?1003h'); // Enable all mouse events (including drag)

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

// eslint-disable-next-line no-console
console.log("Mouse event reporting enabled. Move or click the mouse to see events. Press 'q' to quit.");

process.stdin.on('data', (chunk) => {
  if (chunk === '\u0003' || chunk === 'q') { // Ctrl+C or 'q' to exit
    // Disable mouse event reporting before exiting
    process.stdout.write('\x1b[?1000l');
    process.exit();
  }

  // Parse mouse event data
  if (chunk.startsWith('\x1b[M')) {
    const mouseData = chunk.slice(3);
    const buttonCode = mouseData.charCodeAt(0) - 32;
    const x = mouseData.charCodeAt(1) - 32;
    const y = mouseData.charCodeAt(2) - 32;

    // eslint-disable-next-line no-console
    console.log(`Mouse event: button=${buttonCode}, x=${x}, y=${y}`);
  }
});
