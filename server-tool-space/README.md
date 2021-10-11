# Server tool

This package is a worktree space, it is not supposed to be packed or published individually.

Plink runs this space to serve command line server and document app.

### Stories
#### Install Plink server

#### Run Plink server
```mermaid
flowchart TD

actor((developer))
subgraph server ["Plink server"]
  direction LR
  desc["Package: @wfh/tool-misc"]
  httpServer([RESTful API for cli])
  watch([watch workspace])
  serveDoc([serve doc app])
end
actor == cli ==> start([start Plink server])
start --> server

actor == cli ==> stop([stop Plink server])
stop --> server
```
