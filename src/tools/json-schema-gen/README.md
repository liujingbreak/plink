# JSON schema generator commond line tool

This tool generates JSON schema file, we use json schema based object stringify solution over `JSON.stringify` function.
In this way it offers better performance in Node.js (e.g. `fast-json-stringify`).

```
Usage: json-schema-gen [options] [...packages]

Scan packages and generate json schema.
You package.json file must contains:
  "dr": {jsonSchema: "<interface files whose path is relative to package directory>"}

Options:
  -V, --version                                   output the version number
  -c, --config <config-file>                      Read config files, if there are multiple files, the latter one overrides previous one (default: [])
  --prop <property-path=value as JSON | literal>  <property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string
   e.g.
   (default: [])
  -h, --help                                      display help for command
```
