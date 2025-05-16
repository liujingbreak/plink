
Backlog
==============
-	Browser side Ajax REST API > - Pool, sync request bundle > - send with proper company security/cache related headers, > e.g. referrer

-	Node side REST API (a unified interface same as Browser side API)

-	Uniform Logger API in both node and browser-side

-	cache/pool API > e.g. lru-cache

-	Find and list packages.

-	Node side DB/DAO API (mongo DB, redis)

-	Global event/message handling API (backend events?)

	-	package life cycle events
	-	business message queue

-	Easy/unified package specific setting storage API (e.g. user profile)

-	Server report\*

#### It may contain below non-functional capabilities

-	be a Node vm container, each packages runs in own vm.
-	DB connection Pool
-	configurable caching provider(lru-cache)
-	replace 3rd-party with CDN resource
-	server report, health check function (GC status tracking, heap dump, maybe `DataDog` interface, report endpoint URL) PM2?
-	system API/package permission control
-	online package management
