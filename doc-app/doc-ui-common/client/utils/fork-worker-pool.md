## Recursive fork worker and pool

### Case 1, client can create action controller in master thread/process
    Execute `createWorkerControl()` with option property `pool`

### Case 2, client dispatch action of specific worker file in master thread mode.

### Case 3, worker file in master thread mode, can fork a worker and dispatch action to it

#### Case 3.1 the pool should find or create a new worker to handle the forked action
- If the amount of existing work reaches parallel value configured, then try to find an existing worker
- To find an existing worker which has least work load among all created workers

#### Case 3.2, a forked worker can recursively fork another worker and dispatch action to it.
    **Implementation**

- Client call `setForkActions([forkActionStream$])` to set action$ which should be considered as "fork" action
- Worker wraps each "setForkActions" action and dispatch `fock` action with it, and with a new `messagePort`.
- For forked worker, it should postMessage of `fork` action to pool, for master thread worker, it directly dispatch `fork`
    action to pool
- Pool should dispatch or postMessage of `onForkedFor` to choosen forked worker
- Forked worker react to `onForkedFor` action and cache `messagePort` of it locally, and dispatch wrapped action

#### Case 3.3 forked worker can notify pool that it is in idle state as `waiting for forked worker join and return result`,

- worker dispatches `waitForJoin()`

### Case 4, forked worker can send back returned result directly to the caller worker (or master thread worker), not to pool

- Worker uses `setReturnActions()` to mark action streams which is considered as action "send back returned result"
- worker-impl-util reacts to those `setReturnActions`ed actions, lookups corresponding "messagePort" which is cached
    early when recieving `onForkedFor` event, and wraps it with new action **onJoinReturn**, then `postMessage()` back to caller worker.

### Case 5, the caller worker should compare and filter corresponding "join result" message from forked worker, since there are multiple same action messages on the fly
- Worker should react to `onForkedFor` event

