## Use case

A cheap version of Static Content update mechnism, in which case we don't need involve any
Redis like cross machine/cluster cache/storage service.

Pros: No polling required.
Cons: To make sure all (both) nodes are reached and updated, must try multiple times.

```mermaid
graph LR
buildBox((build<br>machine))
env((Runtime<br>env))

subgraph assets-processer tool
   fetchOtherZip(Fetch other<br>zip files)
   sendZip(upload<br>to all nodes<br>master<br>process)
   upload[Repeat uploading,<br>until all<br>nodes are<br>updated]
   storeZip[stored zip]
end

subgraph assets-processer runtime
   rejDupli(Accept connection,<br>verify if it is<br>duplicate<br>uploading)
   unzip(extract<br>zip files<br>and delete)
end

buildBox --> staticBuild(build<br>static only)
staticBuild -.-> |1. include| build(compile)
build ---|output| zip[zip<br>file]
staticBuild -.-> |2. include| sendZip

buildBox --> fullBuild(Full build)

fullBuild -.->|1.| build
fullBuild -.->|2.| fetchOtherZip
fullBuild -.-> |3. include| sendZip
sendZip -.->|include| upload
sendZip --> |store|storeZip
fetchOtherZip --> |get|storeZip

sendZip -.-> |include| rejDupli
rejDupli ---|store & compare| version[app name,<br>version]
rejDupli -.->|include|unzip

fullBuild -.->|5.| gitCommit(git<br>commit/push/tag<br>release/*)
fullBuild -.-> |0.| buildNode(build Node<br>side *.ts)

env --> deploy(being<br>deployed)
env --> reboot(reboot on<br>fail over)


deploy -.-> |include| unzip
admin((admin)) --> mailNotif(Can recieve mail:<br>current<br>app zip<br>names/version)
admin --> seeVersion(query version<br>and node id)
mailNotif --> version
seeVersion --> version
```
