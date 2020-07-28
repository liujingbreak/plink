/* eslint no-console: 0 */
const glob = require('glob');
const _ = require('lodash');
const fs = require('fs');

module.exports = function(dirs) {
	dirs.forEach(dir => {
		dir = dir.replace(/\\/g, '/');
		dir = _.trimEnd(dir, '/');
		glob(dir + '/**/*.{js,jsx,ts,tsx,html,css,less,scss,bin,md,json,yaml,yml,txt}', {}, (err, files) => {
			files.forEach(file => {
				try {
					if (!fs.statSync(file).isFile())
						return;
					fs.readFile(file, 'utf8', (error, content) => {
						if (error)
							console.error(file, error);

						var count = 0;
						content = content.replace(/\r\n/g, () => {
							count++;
							return '\n';
						});

						if (count > 0) {
							fs.writeFile(file, content, 'utf8');
						}
						console.log(`${file}: ${count}`);
					});
				} catch (e) {
					console.error(file, e);
				}
			});
		});
	});
};
