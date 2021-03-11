/**
 * If a source code package uses Plink's __plink API ( like `.logger`) or extends Plink's command line,
 * they need ensure some Plink's dependencies are installed as 1st level dependency in their workspace,
 * otherwise Visual Code Editor can not find correct type definitions while referencing Plink's logger or
 * Command interface.
 *
 * So I need to make sure these dependencies are installed in each workspace
 */
