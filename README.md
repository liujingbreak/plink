# DR. web component package toolkit
It is designed to accomplish various web frontend tasks:

- Command line tool for managing packages, symlinks, CI process.
- Node package management system
- Yaml File and TS file based configuration management system.


Main purpose is to facilitate out web teams to:
- modularize their HTML5 + NodeJS based web app products.
- unify, share and reuse pluggable components between different products
- reuse a lot of predefined HTTP server with a lot of shared fundamental middlewares
- work on a consistent platform

Inspired by Chrome app store and a lot of other Node.js based pluggable system design.

Refer to the offcial doc in Chinese at [http://dr-web-house.github.io](http://dr-web-house.github.io).



### Design features
- A Component package (Node package) can contain both Client side code and server side code, even isomorphic code.

- Be compliant (or work with) to modern web framework's command line tools like `Angulr cli` and `CreateReactApp`

- Support developing library package through symlinks

- A share environment configuration system which can be avaible 
to runtime client side (in browser), compile time server side and Node.js express http server side.

- Component package can take multiple roles:
   - tooling like Webpack plugin or Angular cli extension
   - client side business logic, server side logic
   - isomorphic logic as shared library which can be run in both sides, if it is needed.

