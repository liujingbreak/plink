interface NodeModule {
  /**
   * Refer to https://webpack.js.org/api/hot-module-replacement/
   */
  hot: {
    data: {[key: string]: any};
    accept(file?: string, cb?: () => void): void;
    accept(errorHandler: () => void): void;
    decline(dependencies: string | string[]): void;
    /**
     * Flag this module as not-update-able. This makes sense when this module has irreversible side-effects, 
     * or HMR handling is not implemented for this module yet. Depending on your HMR management code, 
     * an update to this module (or unaccepted dependencies) usually causes a full-reload of the page.
     */
    decline(): void;
    /**
     * Add a handler which is executed when the current module code is replaced. 
     * This should be used to remove any persistent resource you have claimed or created.
     * If you want to transfer state to the updated module, add it to the given data parameter.
     * This object will be available at module.hot.data after the update.
     * @param handler 
     */
    dispose(handler: (data: any) => void): void;
    /**
     * alias of dispose()
     * @param handler 
     */
    addDisposeHandler(handler: (data: {[key: string]: any}) => void): void;
    invalidate(): void;
  };
}
