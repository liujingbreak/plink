

function getLogger(name: string) {
  return {
    info: log,
    error: log,
    warn: log,
    debug: log,
    trace: log
  };
}

function log(...args: any[]) {
  // eslint-disable-next-line
	console.log.apply(console, arguments);
}

export {getLogger};
