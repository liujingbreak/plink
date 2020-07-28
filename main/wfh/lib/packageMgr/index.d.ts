import EventEmitter from 'events';

interface PackageMgr {
	runServer(argv: any[]): Promise<() => void>;
	eventBus: EventEmitter;
}

declare const mgr: PackageMgr;

export = mgr;
