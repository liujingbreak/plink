module.exports = {
	/**
	 * Application configuration section
	 * http://pm2.keymetrics.io/docs/usage/application-declaration/
	 */
	apps: [

		{
			name: 'log4js-intercom',
			script: 'dist/cmd.js',
			env: {},
			env_production: {
				NODE_ENV: 'production'
			},
			merge_logs: true
		}
	]
};
