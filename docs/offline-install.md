# Offline Install

## Purpose
We hope to install dependencies like 3rd-party Node packages and our private Node packages (Tookkits, DRCP, other common packages) offline during the deployment process on production environment, in which case, we can commit 3rd party or private packages along with product source or target code to Git repo, and make sure build in DevOps's environment is more stable.

## Solution

*Yarn* `--onffline` is the early choice we picked, but this feature seems  to be not maintained well recently by Fackbook.

Verdaccio, which is a Node.js based private NPM registry server is the next best choice for us.
```mermaid
graph TD
Developer((developer)) --> |0. npm<br>publish<br>private<br>packages| devVer[team's<br>Verdaccio]

Developer --> |1.| choose(Choose to<br>install embedded<br>Verdaccio)

Developer -->|2.| clean(clean<br>embedded<br>Verdaccio<br>local storage)
clean --> |delete<br>storage<br>directory| embVer[embedded<br>Verdaccio]
Developer -->|3.| verdaccio(install via<br>embedded<br>Verdaccio)
verdaccio -.-> npmrc(switch<br>.npmrc<br>to embedded<br>Verdaccio)
verdaccio -.-> npm-i(npm/yarn<br>install)
verdaccio -.-> drcp(drcp init)
Developer -->|4. push<br>Verdaccio<br>local storage| git[Git]
npm-i --> embVer
drcp --> embVer
embVer --> devVer

classDef entity fill:cyan;
class git,devVer,embVer entity;
```

```mermaid
graph TD

DevOps --> |1. git pull|git[Git]
DevOps((DevOps)) --> |2.| installV(install<br>embedded<br>Verdaccio)
DevOps --> |3.| install(Install<br>product<br>dependency)
install -.-> npm-i(npm/yarn<br>install)
install -.-> drcp(drcp init)
npm-i --> embVer[embedded<br>Verdaccio]
drcp --> embVer

installV --> outerVer[npmjs.org]

classDef entity fill:cyan;
class git,outerVer,devVer,embVer entity;
```
