/**
 * Usage:
 *
cluster.setupMaster({
  exec: Path.resolve(__dirname, '<your worker js file>'),
  args: [
   // your parameter passed to workers
  ]
});

startCluster(2);
*/
export declare function startCluster(num?: number): void;
