/* eslint no-console: 0, max-lines: 1 */
var yargs = require('yargs');
var _ = require('lodash');
var chalk = require('chalk');

exports.drcpCommand = drcpCommand;

var WIDTH = Math.min(130, yargs.terminalWidth());

function drcpCommand(startTime) {
	var cli = require('./gulp/cli');
	cli.setStartTime(startTime);
	var ret = yargs.usage(`Command format: ${hl('drcp <command> <options>')}\n` +
		`${hl('drcp -h')} to see brief help information.\n` +
		`${hl('drcp help <command>')} to see help for each command.\n` +
		`${hl('drcp <command> -h')} to see help for each command.\n` +
		`${hl('drcp <command> -c <config-name1> <config-name2> ...')} to apply proper config yaml files to the processing command.`)
	.command('init', 'Initialize workspace, copy project  and other basic configuration', {
		aliases: ['init-workspace'],
		builder: {},
		handler: argv => {
			require('./config').init(argv);
			cli.init(argv);
		}
	})
	.command('project [add|remove] [project-dir..]', 'Associate, disassociate or list associated project folders', {
		builder: yargs => {
			yargs.positional('add', {
				desc: 'Associate or disassociate a project to/from this workspace'
			});
			yargs.positional('project-dir', {
				describe: 'directories of projects which to be associated to or disassociated from this workspace '
			});
			yargs.options({
				a: {
					describe: '(Deprecated) Associate project-dir',
					type: 'array'
				}
			})
			.implies('add', 'projectDir')
			.usage('Associate projects:\n' + hlDesc('drcp project add <project-dir..>') +
			'\nDisassociate projects:\n' + hlDesc('drcp project remove <project-dir..>') +
			'\nList associated projects:\n' + hlDesc('drcp project'));
		},
		handler: argv => {
			if (argv.a)
				return cli.addProject(argv, argv.a);
			if (argv.add === 'add')
				return cli.addProject(argv, argv.projectDir);
			else if (argv.remove === 'remove')
				return cli.removeProject(argv, argv.projectDir);
			return cli.listProject(argv);
		}
	})
	// .command(['install', 'i'], 'Execute "yarn install", if you are using "node_moduels/dr-comp-package" as a symlink, Yarn (>1.0.0) deletes any symlinks' +
	// 	' during "yarn install", this command will recreate symlink right after "yarn install", convenient for DRCP tool developer', {
	// 	builder: {},
	// 	handler: argv => cli.install(argv)
	// })
	.command('clean', 'Clean "destDir" and symbolic links from node_modules', {
		builder: {},
		handler: argv => {
			require('./config').init(argv);
			cli.clean(argv);
		}
	})
	.command(['ls', 'list'], 'If you want to know how many components will actually run, this command prints out a list and the priorities, including installed components', {
		builder: {},
		handler: argv => {
			require('./config').init(argv);
			cli.ls(argv);
		}
	})
	.command('run <target> [package..]', 'Run specific exported function of specific packages one by one, in random order', {
		builder: yargs => {
			yargs
			.positional('target', {
				desc: 'FilePath and exported function name, eg. ' + chalk.green('dist/prerender.js#prepare'),
				type: 'string'
			})
			.positional('package', {describe: 'Default is all component packages which has "dr" property in package.json file'})
			.options({
				arguments: {
					desc: 'argument array to be passed to <target>',
					type: 'array'
				}
			})
			.usage('drcp run <target> [package]\ne.g. drcp run dist/file.js#exec');
		},
		handler: argv => {
			require('./config').init(argv);
			return cli.runPackages(argv);
		}
	})
	// .command('compile [package..]', 'compile packages into static browser bundles', {
	// 	builder: yargs => {
	// 		yargs.positional('package', {
	// 			describe: 'component packages of which package.json has a property "dr"'
	// 		});
	// 		yargs.options({
	// 			p: {
	// 				describe: '(Deprecated) <package-short-name> Entry package',
	// 				type: 'array'
	// 			}, x: {
	// 				describe: '<package-short-name> exclude entry packages',
	// 				type: 'array'
	// 			}, l: {
	// 				describe: '<locale> e.g. "en", should be one of "locale" values defined in config.yaml',
	// 				type: 'string',
	// 				alias: 'locale'
	// 			}, ng: {
	// 				describe: 'Use AngularCompiler (@angular/cli@1.7.3)',
	// 				type: 'boolean'
	// 			},
	// 			dll: {
	// 				describe: '<library name> Generate Webpack DLL chunk with manifest, output to directory dist/dll',
	// 				type: 'string'
	// 			}, 'ref-dll': {
	// 				describe: '<library..> Reuse existing Webpack DLL chunks and manifest',
	// 				type: 'array',
	// 				alias: 'rd'
	// 			}, pgs: {
	// 				alias: 'progress',
	// 				describe: 'Use Webpack ProgressPlugin to show build progress',
	// 				type: 'boolean'
	// 			}, report: {
	// 				describe: 'Run webpack-bundle-analyzer to generate report file "dist/static/bundle-report.html"',
	// 				type: 'boolean'
	// 			}, 'open-report': {
	// 				describe: 'Run webpack-bundle-analyzer to generate report file "dist/static/bundle-report.html", and open it with default browser',
	// 				type: 'boolean'
	// 			}
	// 		})
	// 		.usage(hlDesc('drcp compile <package..> [-c config-files..]') +
	// 			'\n Compile specificy entry components, <package> can be short name of an Entry component\n' +
	// 			hlDesc('drcp compile [-c config-files ..]') +
	// 			'\n Compile all entry components from associated projects and installed components in current workspace\n' +
	// 			hlDesc('drcp compile -x <package..> [-c config-files..]') +
	// 			'\n Compile all entry components but exclude <package..>\n' +
	// 			hlDesc('drcp compile <module..> --dll <as-library-name>') +
	// 			'\n Compile specific components into a single DLL library named with <as-library-name>\n' +
	// 			hlDesc('drcp compile [package..] --rd <dll-library..>') +
	// 			'\n Compile entry components with existing DLL chunks, <dll-library> can be an absolute path or file name from dist/dll\n' +
	// 			hlDesc('drcp compile <module..> --dll <as-library-name> --rd <other-dll-library..>') +
	// 			'\n Compile specific components into a single DLL library to work with other existing DLL chunks\n'
	// 		);
	// 	},
	// 	handler: argv => {
	// 		if (argv.ng && argv.package.length > 0) {
	// 			argv.package.push('@dr-core/ng-app-builder');
	// 		}
	// 		if (argv.p != null)
	// 			argv.package.push(...argv.p);
	// 		argv.p = argv.package; // For legacy
	// 		cli.compile(argv);
	// 	}
	// })
	.command('tsc [package..]', 'run typescript compiler', {
		builder: yargs => {
			yargs.positional('package', {
				describe: 'component package, in which package.json has a property "dr"'
			})
			.options({
				watch: {
					alias: 'w',
					describe: 'Typescript compiler watch mode',
					type: 'boolean'
				},
				pj: {
					describe: '<project-dir..> only watch server components from specific project directory',
					type: 'array',
					alias: 'project'
				},
				'source-map': {
					describe: 'Source map style',
					choices: ['inline', 'file'],
					'default': 'file'
				}
			})
			.usage('Run gulp-typescript to compile Node.js side typescript files\n' +
				'It compiles "<component-directory>/ts/**/*.ts" to "<component-directory>/dist" for each component,' +
				'you can add properties like "dr.ts.src" and "dr.ts.dest" to component package.json file which changes source and destination directry.\n\n' +
				hlDesc('drcp tsc <package..>\n') + ' Only compile specific components by providing package name or short name\n' +
				hlDesc('drcp tsc\n') + ' Compile all components belong to associated projects, not including installed components\n' +
				hlDesc('drcp tsc --pj <project directory...>\n') + ' Compile components belong to specific projects\n' +
				hlDesc('drcp tsc [package...] -w\n') + ' Watch components change and compile when new typescript file is changed or created\n\n');
		},
		handler: argv => {
			require('./config').init(argv);
			cli.tsc(argv);
		}
	})
	.command('eol <dir..>', 'Convert CRLF to LF from files (before "publish" to NPM registry server).', {
		builder: yargs => {
			yargs.positional('dir', {
				describe: 'target source code directories'
			})
			.usage('drcp eol <dir...>\n\nFor windows system, This command helps to convert CRLF to LF for local files.\n' +
			'Before "publish" to NPM registry server, you need to make sure local files contain no CRLF.');
		},
		handler: argv => {
			require('./gulp/crlf-guarder')(argv.dir);
		}
	})
	.command('lint [package..]', 'source code style check', {
		builder: yargs => {
			yargs
			// .positional('package', {
			// 	describe: 'component package, in which package.json has a property "dr"'
			// })
			.options({
				pj: {
					describe: '<project-dir> lint only JS code from specific project',
					type: 'array',
					alias: 'project'
				},
				fix: {
					describe: 'Run eslint/tslint fix, this could cause your source code being changed unexpectedly',
					type: 'boolean',
				}
			})
			.usage(hl('drcp lint --pj <project-dir..> [--fix]') + ' Lint JS files from specific project directory\n' +
				hl('\ndrcp lint <component-package..> [--fix]') + ' Lint JS files from specific component packages');
		},
		handler: argv => {
			require('./config').init(argv);
			cli.lint(argv);
		}
	})
	.command('publish [project-dir..]', 'npm publish every pakages in source code folder including all mapped recipes', {
		builder: yargs => {
			yargs.positional('project-dir', {
				desc: 'project directories in which all components need to be published'
			})
			.options({
				pj: {
					describe: '<project-dir> only publish component packages from specific project directory',
					type: 'array',
					alias: 'project'
				}
			});
		},
		handler: argv => {
			require('./config').init(argv);
			if (argv.pj)
				argv.projectDir.push(...argv.pj);
			cli.publish(argv);
		}
	})
	.command('unpublish [project-dir..]', 'npm unpublish every pakages in source code folder including all mapped recipes', {
		builder: yargs => {
			yargs.positional('project-dir', {
				desc: 'project directories in which all components need to be unpublished'})
			.options({
				pj: {
					describe: '<project-dir> only publish component packages from specific project directory',
					type: 'array',
					alias: 'project'
				}
			});
		},
		handler: argv => {
			require('./config').init(argv);
			if (argv.pj)
				argv.projectDir.push(...argv.pj);
			cli.unpublish(argv);
		}
	})
	.command('bump [dir..]', 'bump version number of all package.json from specific directories', {
		builder: yargs => {
			yargs.positional('dir', {
				describe: 'directories under which looking up for component packages to bump'
			})
			.options({
				pj: {
					describe: '<project-dir> only bump component packages from specific project directory',
					type: 'array',
					alias: 'project'
				},
				i: {
					describe: 'version increment',
					choices: ['major', 'minor', 'patch', 'prerelease'],
					'default': 'patch',
					alias: 'incre-version'
				}
			})
			.usage(hl('drcp bump <dir-1> <dir-2> ...') + 'to recursively bump package.json from multiple directories\n' +
				hl('drcp bump <dir> -i minor') + 'to bump minor version number, default is patch number');
		},
		handler: argv => {
			require('./config').init(argv);
			cli.bumpDirs(argv.dir, argv.v);
			if (argv.pj) {
				cli.bumpProjects(argv.pj, argv.v);
			}
		}
	})
	.command('test [package..]', 'run Jasmine for specific or all packages', {
		builder: yargs => {
			yargs.positional('package', {
				describe: 'component package, in which package.json has a property "dr"'
			});
			yargs.options({
				f: {
					describe: '<file..> only run specific test files',
					type: 'array'
				}
			});
		},
		handler: argv => {
			require('./config').init(argv);
			cli.runUnitTest(argv);
		}
	})
	// .command('e2e [file..]', 'run Jasmine for end-to-end tests', {
	// 	builder: yargs => {
	// 		yargs.positional('file', {
	// 			describe: 'Spec JS files'
	// 		});
	// 		yargs.options({
	// 			d: {
	// 				describe: '<test-suit-dir>',
	// 				type: 'array'
	// 			},
	// 			f: {
	// 				describe: '<spec-file-path>',
	// 				type: 'array'
	// 			},
	// 			server: {
	// 				describe: '<start-js-file>',
	// 				type: 'string'
	// 			},
	// 			dir: {
	// 				describe: '<working-directory>',
	// 				type: 'string'
	// 			},
	// 			browser: {
	// 				describe: 'Browser engine',
	// 				choices: ['chrome', 'firefox', 'ie', 'opera', 'edge', 'safari'],
	// 				'default': 'chrome'
	// 			}
	// 		});
	// 	},
	// 	handler: argv => {
	// 		require('./config').init(argv);
	// 		if (argv.file.length > 0)
	// 			argv.f = argv.file;
	// 		cli.runE2eTest(argv);
	// 	}
	// })
	.command(['completion', 'ac'], 'Adds autocomplete functionality to commands and subcommands', {
		builder: {},
		handler: argv => {
			yargs.showCompletionScript();
		}
	});
	return globalOptions(ret)
		.demandCommand(1, 'You need at least one command before moving on')
		.help()
		.alias('help', 'h')
		.epilog('copyright 2016')
		.argv;
}

function nodeAppCommand(callback) {
	var cli = require('./gulp/cli');
	var argv = yargs.usage(
		hlDesc('node app --ww [-c config-name ...] [-p package-name ...]') + '\n Start app in Webpack watch mode\n' +
		hlDesc('node app watch [package-name ...] [-c config-name ...]') + '\n Start app in Webpack watch mode\n' +
		hlDesc('node app [-c config-name ...]') + '\n Only start Express and HTTP service and run server side Node.js component\n' +
		hlDesc('node app watch [package..] --rd <dll-library..>') +
		'\n Start app in Webpack watch mode, compile entry components with existing DLL chunks, <dll-library> can be an absolute path or file name from dist/dll\n' +
		hlDesc('node app watch-server [package..] [--pj <project-dir..>]') +
		'\n Start app in server side Typescript file watch mode, once <component>/ts/**/*.ts is changed or added, ' +
		'the changed server side Typescript file will be compiled and server will restart.\n (ps. No client file will be compiled)')
		.command('*', 'Start app', {
			builder: yargs => {},
			handler
		})
		// .command('watch [package..]', 'Start app in Webpack watch mode (Compile and host client side components)', {
		// 	builder: yargs => {
		// 		yargs.positional('package', {
		// 			describe: 'component packages of which package.json has a property "dr"'
		// 		});
		// 		yargs.options({
		// 			poll: {
		// 				describe: 'webpack watch poll mode, try this if "--ww" does not work for you environment',
		// 				alias: 'wwp',
		// 				type: 'boolean'
		// 			},
		// 			p: {
		// 				describe: '<package-short-name> Entry package short name like "comp" for "@dr/comp"',
		// 				type: 'array'
		// 			}, x: {
		// 				describe: '<package-short-name> exclude entry packages',
		// 				type: 'array'
		// 			},
		// 			ng: {
		// 				describe: 'Use AngularCompiler (@angular/cli@1.7.3)',
		// 				type: 'boolean'
		// 			},
		// 			hmr: {
		// 				describe: 'Use Webapck "Hot Module Replacement" instead of live-reload,\n' +
		// 					'this will disable extract-text-webpack-plugin for CSS bundle split loading',
		// 				type: 'boolean',
		// 				'default': false
		// 			},
		// 			l: {
		// 				describe: '<locale> e.g. "en", should be one of "locale" values defined in config.yaml',
		// 				type: 'string',
		// 				alias: 'locale'
		// 			}, 'ref-dll': {
		// 				describe: '<library..> Reuse existing Webpack DLL chunks and manifest',
		// 				type: 'array',
		// 				alias: 'rd'
		// 			}, pgs: {
		// 				alias: 'progress',
		// 				describe: 'Use Webpack ProgressPlugin to show build progress',
		// 				type: 'boolean'
		// 			}, report: {
		// 				describe: 'Run webpack-bundle-analyzer to generate report file "dist/static/bundle-report.html"',
		// 				type: 'boolean'
		// 			}, 'open-report': {
		// 				describe: 'Run webpack-bundle-analyzer to generate report file "dist/static/bundle-report.html", and open it with default browser',
		// 				type: 'boolean'
		// 			}
		// 		});
		// 	},
		// 	handler: argv => {
		// 		argv.ww = argv.webpackWatch = argv['webpack-watch'] = true;
		// 		handler(argv);
		// 	}
		// })
		.command('watch-server [package..]', 'Start app in server watch mode (Compile and watch server side Typescript components)', {
			builder: yargs => {
				yargs.options({
					pj: {
						describe: '<project-dir> only watch server components from specific project directory',
						type: 'array',
						alias: 'project'
					}
				});
			},
			handler: argv => {
				argv.watch = true;
				cli.setStartTime(new Date().getTime());
				var processUtils = require('./gulp/processUtils');
				var childProcArgv = process.argv.slice();
				childProcArgv.splice(childProcArgv.indexOf('watch-server'), 1);
				var lastProc;
				var waitPromise = Promise.resolve();
				cli.tsc(argv, () => {
					waitPromise = waitPromise.then(() => {
						if (lastProc) {
							var wait = lastProc.promise.then(restartServer);
							lastProc.childProcess.kill('SIGINT');
							return wait;
						} 	else {
							restartServer();
						}
					})
					.catch(err => console.error(err));
				});

				function restartServer() {
					console.log('Restart Node.js server');
					console.log(childProcArgv);
					lastProc = processUtils.exe(...childProcArgv);
				}
			}
		});
	function handler(argv) {
		require('./config').init(argv);
		try {
			if (argv.ng && argv.package.length > 0) {
				argv.package.push('@dr-core/ng-app-builder');
			}
			if (argv.package && argv.package.length > 0 || (argv.x && argv.x.length > 0)) {
				argv.p = argv.package;
				if (!argv.poll)
					argv.ww = argv.webpackWatch = true;
			} else if (argv.p) {
				if (!argv.package)
					argv.package = [];
				argv.package.push(...argv.p);
			}
			callback(argv);
		} catch (err) {
			console.error(err);
			process.exit(1);
		}
	}

	return globalOptions(argv, {
		ww: {
			describe: '(Deprecated) Webpack watch mode, use "node app watch" instead pls.',
			alias: 'webpack-watch',
			type: 'boolean'
		}
	})
	.help()
	.alias('help', 'h')
	.epilog('copyright 2016')
	.argv;
}

exports.nodeAppCommand = nodeAppCommand;
function globalOptions(argv, overrides) {
	var options = {
		c: {
			describe: '<config-name..> ' + hlDesc('Read config files, if there are multiple files, the latter one overrides previous one'),
			type: 'array'
		},
		prop: {
			describe: '<property-path>=<value as JSON | literal> ...' + hlDesc('directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n') +
				'--prop port=8080 devMode=false @dr/foobar.api=http://localhost:8080\n' +
				'--prop port=8080 devMode=false @dr/foobar.api=http://localhost:8080\n' +
				'--prop arraylike.prop[0]=foobar\n' +
				'--prop ["@dr/foo.bar","prop",0]=true',
			type: 'array'
		},
		// offline: {
		// 	describe: 'Use Yarn install "--offline" instead of default "--prefer-offline" mode during installation process',
		// 	type: 'boolean'
		// }
		// root: {
		// 	describe: '<workspace-directory>  default is `process.cwd()`',
		// 	default: process.env.DR_ROOT_DIR || process.cwd()
		// }
	};
	if (overrides)
		options = Object.assign(options, overrides);
	return argv.options(options).wrap(WIDTH);
}

function hl(text) {
	return chalk.green(_.padEnd(text, WIDTH >> 1, ' '));
}

function hlDesc(text) {
	return chalk.green(text);
}
