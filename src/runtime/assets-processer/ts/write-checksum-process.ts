import fs from 'fs';

const file = process.argv[2];

process.send({log: 'start'});
process.on('message', msg => {
	process.send({log: 'I got you'});
	if (msg.checksum) {
		fs.writeFileSync(file, JSON.stringify(msg.checksum, null, '  '), 'utf8');
		process.send({log: 'written to ' + file});
		process.exit(0);
	}
});
