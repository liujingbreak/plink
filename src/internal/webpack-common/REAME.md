## Common and resuable Webpack configuration

For Angular and React project.

### Purpose
I found both `react-react-app` and `Angular cli` have their own good practices in configuring Webpack, although they are command line tool of two different web frameworks.

e.g. `react-react-app` has inlineRuntimeChunkPlugin for inline runtime chunk into index HTML, `Angular cli` has more specific splitChunks configuration and LESS file process module rules and plugin settings.

So I want to extract those reusable parts for sharing in both framework based projects.

And for the other features, they are what I customized for both frameworks' webpack configuration, I lift them up in this new package.
e.g.
- _DevServer_ enhancement for CORS and express error proofing.
- Replace _file-loader_ with our own file-load which supports our monorepo package folder structure.
- _SplitChunks_ setting to support our source code package which is considered as 3rd-part modules installed in direcotry _node_modules_.
- TS, JS loader (require-injector) to replace `import` and `require` statements, which is more flexible than _resolve.alias_
- loader or function for transpiling TS expression in source code with context of Node.js during webpack compiliation time, which is more flexible than create-react-app's environment variable solution.
