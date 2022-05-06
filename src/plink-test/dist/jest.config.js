"use strict";
/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
// import Path from 'path';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    // All imported modules in your tests should be mocked automatically
    // automock: false,
    // Stop running tests after `n` failures
    // bail: 0,
    // The directory where Jest should store its cached dependency information
    // cacheDirectory: "/private/var/folders/ls/28mw_hnx36g74hr0nms0tw000000gn/T/jest_dx",
    // Automatically clear mock calls, instances, contexts and results before every test
    // clearMocks: false,
    // Indicates whether the coverage information should be collected while executing the test
    // collectCoverage: false,
    // An array of glob patterns indicating a set of files for which coverage information should be collected
    // collectCoverageFrom: undefined,
    // The directory where Jest should output its coverage files
    // coverageDirectory: undefined,
    // An array of regexp pattern strings used to skip coverage collection
    // coveragePathIgnorePatterns: [
    //   "/node_modules/"
    // ],
    // Indicates which provider should be used to instrument code for coverage
    coverageProvider: 'v8',
    // A list of reporter names that Jest uses when writing coverage reports
    // coverageReporters: [
    //   "json",
    //   "text",
    //   "lcov",
    //   "clover"
    // ],
    // An object that configures minimum threshold enforcement for coverage results
    // coverageThreshold: undefined,
    // A path to a custom dependency extractor
    // dependencyExtractor: undefined,
    // Make calling deprecated APIs throw helpful error messages
    // errorOnDeprecated: false,
    // The default configuration for fake timers
    // fakeTimers: {
    //   "enableGlobally": false
    // },
    // Force coverage collection from ignored files using an array of glob patterns
    // forceCoverageMatch: [],
    // A path to a module which exports an async function that is triggered once before all test suites
    // globalSetup: undefined,
    // A path to a module which exports an async function that is triggered once after all test suites
    // globalTeardown: undefined,
    // A set of global variables that need to be available in all test environments
    // globals: {},
    // The maximum amount of workers used to run your tests. Can be specified as % or a number. E.g. maxWorkers: 10% will use 10% of your CPU amount + 1 as the maximum worker number. maxWorkers: 2 will use a maximum of 2 workers.
    // maxWorkers: "50%",
    // An array of directory names to be searched recursively up from the requiring module's location
    // moduleDirectories: [
    //   "node_modules"
    // ],
    // An array of file extensions your modules use
    // moduleFileExtensions: [
    //   "js",
    //   "mjs",
    //   "cjs",
    //   "jsx",
    //   "ts",
    //   "tsx",
    //   "json",
    //   "node"
    // ],
    // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
    // moduleNameMapper: {},
    // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
    // modulePathIgnorePatterns: [],
    // Activates notifications for test results
    // notify: false,
    // An enum that specifies notification mode. Requires { notify: true }
    // notifyMode: "failure-change",
    // A preset that is used as a base for Jest's configuration
    // preset: undefined,
    // Run tests from one or more projects
    // projects: undefined,
    // Use this configuration option to add custom reporters to Jest
    // reporters: undefined,
    // Automatically reset mock state before every test
    // resetMocks: false,
    // Reset the module registry before running each individual test
    // resetModules: false,
    // A path to a custom resolver
    // resolver: undefined,
    // Automatically restore mock state and implementation before every test
    // restoreMocks: false,
    // The root directory that Jest should scan for tests and modules within
    // rootDir: undefined,
    // A list of paths to directories that Jest should use to search for files in
    roots: [
        __dirname
    ],
    // Allows you to use a custom runner instead of Jest's default test runner
    // runner: "jest-runner",
    // The paths to modules that run some code to configure or set up the testing environment before each test
    // setupFiles: [],
    // A list of paths to modules that run some code to configure or set up the testing framework before each test
    // setupFilesAfterEnv: [],
    // The number of seconds after which a test is considered as slow and reported as such in the results.
    // slowTestThreshold: 5,
    // A list of paths to snapshot serializer modules Jest should use for snapshot testing
    // snapshotSerializers: [],
    // The test environment that will be used for testing
    // testEnvironment: "jest-environment-node",
    // Options that will be passed to the testEnvironment
    // testEnvironmentOptions: {},
    // Adds a location field to test results
    // testLocationInResults: false,
    // The glob patterns Jest uses to detect test files
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)'
        // "**/?(*.)+(spec|test).[tj]s?(x)"
    ]
    // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
    // testPathIgnorePatterns: [
    //   "/node_modules/"
    // ],
    // The regexp pattern or array of patterns that Jest uses to detect test files
    // testRegex: [],
    // This option allows the use of a custom results processor
    // testResultsProcessor: undefined,
    // This option allows use of a custom test runner
    // testRunner: "jest-circus/runner",
    // A map from regular expressions to paths to transformers
    // transform: undefined,
    // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
    // transformIgnorePatterns: [
    //   "/node_modules/",
    //   "\\.pnp\\.[^\\/]+$"
    // ],
    // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
    // unmockedModulePathPatterns: undefined,
    // Indicates whether each individual test should be reported during the run
    // verbose: undefined,
    // An array of regexp patterns that are matched against all source file paths before re-running tests in watch mode
    // watchPathIgnorePatterns: [],
    // Whether to use watchman for file crawling
    // watchman: true,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamVzdC5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqZXN0LmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHO0FBQ0gsMkJBQTJCOztBQUUzQixrQkFBZTtJQUNiLG9FQUFvRTtJQUNwRSxtQkFBbUI7SUFFbkIsd0NBQXdDO0lBQ3hDLFdBQVc7SUFFWCwwRUFBMEU7SUFDMUUsc0ZBQXNGO0lBRXRGLG9GQUFvRjtJQUNwRixxQkFBcUI7SUFFckIsMEZBQTBGO0lBQzFGLDBCQUEwQjtJQUUxQix5R0FBeUc7SUFDekcsa0NBQWtDO0lBRWxDLDREQUE0RDtJQUM1RCxnQ0FBZ0M7SUFFaEMsc0VBQXNFO0lBQ3RFLGdDQUFnQztJQUNoQyxxQkFBcUI7SUFDckIsS0FBSztJQUVMLDBFQUEwRTtJQUMxRSxnQkFBZ0IsRUFBRSxJQUFJO0lBRXRCLHdFQUF3RTtJQUN4RSx1QkFBdUI7SUFDdkIsWUFBWTtJQUNaLFlBQVk7SUFDWixZQUFZO0lBQ1osYUFBYTtJQUNiLEtBQUs7SUFFTCwrRUFBK0U7SUFDL0UsZ0NBQWdDO0lBRWhDLDBDQUEwQztJQUMxQyxrQ0FBa0M7SUFFbEMsNERBQTREO0lBQzVELDRCQUE0QjtJQUU1Qiw0Q0FBNEM7SUFDNUMsZ0JBQWdCO0lBQ2hCLDRCQUE0QjtJQUM1QixLQUFLO0lBRUwsK0VBQStFO0lBQy9FLDBCQUEwQjtJQUUxQixtR0FBbUc7SUFDbkcsMEJBQTBCO0lBRTFCLGtHQUFrRztJQUNsRyw2QkFBNkI7SUFFN0IsK0VBQStFO0lBQy9FLGVBQWU7SUFFZixpT0FBaU87SUFDak8scUJBQXFCO0lBRXJCLGlHQUFpRztJQUNqRyx1QkFBdUI7SUFDdkIsbUJBQW1CO0lBQ25CLEtBQUs7SUFFTCwrQ0FBK0M7SUFDL0MsMEJBQTBCO0lBQzFCLFVBQVU7SUFDVixXQUFXO0lBQ1gsV0FBVztJQUNYLFdBQVc7SUFDWCxVQUFVO0lBQ1YsV0FBVztJQUNYLFlBQVk7SUFDWixXQUFXO0lBQ1gsS0FBSztJQUVMLG9JQUFvSTtJQUNwSSx3QkFBd0I7SUFFeEIsd0hBQXdIO0lBQ3hILGdDQUFnQztJQUVoQywyQ0FBMkM7SUFDM0MsaUJBQWlCO0lBRWpCLHNFQUFzRTtJQUN0RSxnQ0FBZ0M7SUFFaEMsMkRBQTJEO0lBQzNELHFCQUFxQjtJQUVyQixzQ0FBc0M7SUFDdEMsdUJBQXVCO0lBRXZCLGdFQUFnRTtJQUNoRSx3QkFBd0I7SUFFeEIsbURBQW1EO0lBQ25ELHFCQUFxQjtJQUVyQixnRUFBZ0U7SUFDaEUsdUJBQXVCO0lBRXZCLDhCQUE4QjtJQUM5Qix1QkFBdUI7SUFFdkIsd0VBQXdFO0lBQ3hFLHVCQUF1QjtJQUV2Qix3RUFBd0U7SUFDeEUsc0JBQXNCO0lBRXRCLDZFQUE2RTtJQUM3RSxLQUFLLEVBQUU7UUFDTCxTQUFTO0tBQ1Y7SUFFRCwwRUFBMEU7SUFDMUUseUJBQXlCO0lBRXpCLDBHQUEwRztJQUMxRyxrQkFBa0I7SUFFbEIsOEdBQThHO0lBQzlHLDBCQUEwQjtJQUUxQixzR0FBc0c7SUFDdEcsd0JBQXdCO0lBRXhCLHNGQUFzRjtJQUN0RiwyQkFBMkI7SUFFM0IscURBQXFEO0lBQ3JELDRDQUE0QztJQUU1QyxxREFBcUQ7SUFDckQsOEJBQThCO0lBRTlCLHdDQUF3QztJQUN4QyxnQ0FBZ0M7SUFFaEMsbURBQW1EO0lBQ25ELFNBQVMsRUFBRTtRQUNULDZCQUE2QjtRQUMvQixtQ0FBbUM7S0FDbEM7SUFFRCx3R0FBd0c7SUFDeEcsNEJBQTRCO0lBQzVCLHFCQUFxQjtJQUNyQixLQUFLO0lBRUwsOEVBQThFO0lBQzlFLGlCQUFpQjtJQUVqQiwyREFBMkQ7SUFDM0QsbUNBQW1DO0lBRW5DLGlEQUFpRDtJQUNqRCxvQ0FBb0M7SUFFcEMsMERBQTBEO0lBQzFELHdCQUF3QjtJQUV4Qiw0SEFBNEg7SUFDNUgsNkJBQTZCO0lBQzdCLHNCQUFzQjtJQUN0Qix3QkFBd0I7SUFDeEIsS0FBSztJQUVMLDZJQUE2STtJQUM3SSx5Q0FBeUM7SUFFekMsMkVBQTJFO0lBQzNFLHNCQUFzQjtJQUV0QixtSEFBbUg7SUFDbkgsK0JBQStCO0lBRS9CLDRDQUE0QztJQUM1QyxrQkFBa0I7Q0FDbkIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBGb3IgYSBkZXRhaWxlZCBleHBsYW5hdGlvbiByZWdhcmRpbmcgZWFjaCBjb25maWd1cmF0aW9uIHByb3BlcnR5IGFuZCB0eXBlIGNoZWNrLCB2aXNpdDpcbiAqIGh0dHBzOi8vamVzdGpzLmlvL2RvY3MvY29uZmlndXJhdGlvblxuICovXG4vLyBpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICAvLyBBbGwgaW1wb3J0ZWQgbW9kdWxlcyBpbiB5b3VyIHRlc3RzIHNob3VsZCBiZSBtb2NrZWQgYXV0b21hdGljYWxseVxuICAvLyBhdXRvbW9jazogZmFsc2UsXG5cbiAgLy8gU3RvcCBydW5uaW5nIHRlc3RzIGFmdGVyIGBuYCBmYWlsdXJlc1xuICAvLyBiYWlsOiAwLFxuXG4gIC8vIFRoZSBkaXJlY3Rvcnkgd2hlcmUgSmVzdCBzaG91bGQgc3RvcmUgaXRzIGNhY2hlZCBkZXBlbmRlbmN5IGluZm9ybWF0aW9uXG4gIC8vIGNhY2hlRGlyZWN0b3J5OiBcIi9wcml2YXRlL3Zhci9mb2xkZXJzL2xzLzI4bXdfaG54MzZnNzRocjBubXMwdHcwMDAwMDBnbi9UL2plc3RfZHhcIixcblxuICAvLyBBdXRvbWF0aWNhbGx5IGNsZWFyIG1vY2sgY2FsbHMsIGluc3RhbmNlcywgY29udGV4dHMgYW5kIHJlc3VsdHMgYmVmb3JlIGV2ZXJ5IHRlc3RcbiAgLy8gY2xlYXJNb2NrczogZmFsc2UsXG5cbiAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGNvdmVyYWdlIGluZm9ybWF0aW9uIHNob3VsZCBiZSBjb2xsZWN0ZWQgd2hpbGUgZXhlY3V0aW5nIHRoZSB0ZXN0XG4gIC8vIGNvbGxlY3RDb3ZlcmFnZTogZmFsc2UsXG5cbiAgLy8gQW4gYXJyYXkgb2YgZ2xvYiBwYXR0ZXJucyBpbmRpY2F0aW5nIGEgc2V0IG9mIGZpbGVzIGZvciB3aGljaCBjb3ZlcmFnZSBpbmZvcm1hdGlvbiBzaG91bGQgYmUgY29sbGVjdGVkXG4gIC8vIGNvbGxlY3RDb3ZlcmFnZUZyb206IHVuZGVmaW5lZCxcblxuICAvLyBUaGUgZGlyZWN0b3J5IHdoZXJlIEplc3Qgc2hvdWxkIG91dHB1dCBpdHMgY292ZXJhZ2UgZmlsZXNcbiAgLy8gY292ZXJhZ2VEaXJlY3Rvcnk6IHVuZGVmaW5lZCxcblxuICAvLyBBbiBhcnJheSBvZiByZWdleHAgcGF0dGVybiBzdHJpbmdzIHVzZWQgdG8gc2tpcCBjb3ZlcmFnZSBjb2xsZWN0aW9uXG4gIC8vIGNvdmVyYWdlUGF0aElnbm9yZVBhdHRlcm5zOiBbXG4gIC8vICAgXCIvbm9kZV9tb2R1bGVzL1wiXG4gIC8vIF0sXG5cbiAgLy8gSW5kaWNhdGVzIHdoaWNoIHByb3ZpZGVyIHNob3VsZCBiZSB1c2VkIHRvIGluc3RydW1lbnQgY29kZSBmb3IgY292ZXJhZ2VcbiAgY292ZXJhZ2VQcm92aWRlcjogJ3Y4JyxcblxuICAvLyBBIGxpc3Qgb2YgcmVwb3J0ZXIgbmFtZXMgdGhhdCBKZXN0IHVzZXMgd2hlbiB3cml0aW5nIGNvdmVyYWdlIHJlcG9ydHNcbiAgLy8gY292ZXJhZ2VSZXBvcnRlcnM6IFtcbiAgLy8gICBcImpzb25cIixcbiAgLy8gICBcInRleHRcIixcbiAgLy8gICBcImxjb3ZcIixcbiAgLy8gICBcImNsb3ZlclwiXG4gIC8vIF0sXG5cbiAgLy8gQW4gb2JqZWN0IHRoYXQgY29uZmlndXJlcyBtaW5pbXVtIHRocmVzaG9sZCBlbmZvcmNlbWVudCBmb3IgY292ZXJhZ2UgcmVzdWx0c1xuICAvLyBjb3ZlcmFnZVRocmVzaG9sZDogdW5kZWZpbmVkLFxuXG4gIC8vIEEgcGF0aCB0byBhIGN1c3RvbSBkZXBlbmRlbmN5IGV4dHJhY3RvclxuICAvLyBkZXBlbmRlbmN5RXh0cmFjdG9yOiB1bmRlZmluZWQsXG5cbiAgLy8gTWFrZSBjYWxsaW5nIGRlcHJlY2F0ZWQgQVBJcyB0aHJvdyBoZWxwZnVsIGVycm9yIG1lc3NhZ2VzXG4gIC8vIGVycm9yT25EZXByZWNhdGVkOiBmYWxzZSxcblxuICAvLyBUaGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBmYWtlIHRpbWVyc1xuICAvLyBmYWtlVGltZXJzOiB7XG4gIC8vICAgXCJlbmFibGVHbG9iYWxseVwiOiBmYWxzZVxuICAvLyB9LFxuXG4gIC8vIEZvcmNlIGNvdmVyYWdlIGNvbGxlY3Rpb24gZnJvbSBpZ25vcmVkIGZpbGVzIHVzaW5nIGFuIGFycmF5IG9mIGdsb2IgcGF0dGVybnNcbiAgLy8gZm9yY2VDb3ZlcmFnZU1hdGNoOiBbXSxcblxuICAvLyBBIHBhdGggdG8gYSBtb2R1bGUgd2hpY2ggZXhwb3J0cyBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IGlzIHRyaWdnZXJlZCBvbmNlIGJlZm9yZSBhbGwgdGVzdCBzdWl0ZXNcbiAgLy8gZ2xvYmFsU2V0dXA6IHVuZGVmaW5lZCxcblxuICAvLyBBIHBhdGggdG8gYSBtb2R1bGUgd2hpY2ggZXhwb3J0cyBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IGlzIHRyaWdnZXJlZCBvbmNlIGFmdGVyIGFsbCB0ZXN0IHN1aXRlc1xuICAvLyBnbG9iYWxUZWFyZG93bjogdW5kZWZpbmVkLFxuXG4gIC8vIEEgc2V0IG9mIGdsb2JhbCB2YXJpYWJsZXMgdGhhdCBuZWVkIHRvIGJlIGF2YWlsYWJsZSBpbiBhbGwgdGVzdCBlbnZpcm9ubWVudHNcbiAgLy8gZ2xvYmFsczoge30sXG5cbiAgLy8gVGhlIG1heGltdW0gYW1vdW50IG9mIHdvcmtlcnMgdXNlZCB0byBydW4geW91ciB0ZXN0cy4gQ2FuIGJlIHNwZWNpZmllZCBhcyAlIG9yIGEgbnVtYmVyLiBFLmcuIG1heFdvcmtlcnM6IDEwJSB3aWxsIHVzZSAxMCUgb2YgeW91ciBDUFUgYW1vdW50ICsgMSBhcyB0aGUgbWF4aW11bSB3b3JrZXIgbnVtYmVyLiBtYXhXb3JrZXJzOiAyIHdpbGwgdXNlIGEgbWF4aW11bSBvZiAyIHdvcmtlcnMuXG4gIC8vIG1heFdvcmtlcnM6IFwiNTAlXCIsXG5cbiAgLy8gQW4gYXJyYXkgb2YgZGlyZWN0b3J5IG5hbWVzIHRvIGJlIHNlYXJjaGVkIHJlY3Vyc2l2ZWx5IHVwIGZyb20gdGhlIHJlcXVpcmluZyBtb2R1bGUncyBsb2NhdGlvblxuICAvLyBtb2R1bGVEaXJlY3RvcmllczogW1xuICAvLyAgIFwibm9kZV9tb2R1bGVzXCJcbiAgLy8gXSxcblxuICAvLyBBbiBhcnJheSBvZiBmaWxlIGV4dGVuc2lvbnMgeW91ciBtb2R1bGVzIHVzZVxuICAvLyBtb2R1bGVGaWxlRXh0ZW5zaW9uczogW1xuICAvLyAgIFwianNcIixcbiAgLy8gICBcIm1qc1wiLFxuICAvLyAgIFwiY2pzXCIsXG4gIC8vICAgXCJqc3hcIixcbiAgLy8gICBcInRzXCIsXG4gIC8vICAgXCJ0c3hcIixcbiAgLy8gICBcImpzb25cIixcbiAgLy8gICBcIm5vZGVcIlxuICAvLyBdLFxuXG4gIC8vIEEgbWFwIGZyb20gcmVndWxhciBleHByZXNzaW9ucyB0byBtb2R1bGUgbmFtZXMgb3IgdG8gYXJyYXlzIG9mIG1vZHVsZSBuYW1lcyB0aGF0IGFsbG93IHRvIHN0dWIgb3V0IHJlc291cmNlcyB3aXRoIGEgc2luZ2xlIG1vZHVsZVxuICAvLyBtb2R1bGVOYW1lTWFwcGVyOiB7fSxcblxuICAvLyBBbiBhcnJheSBvZiByZWdleHAgcGF0dGVybiBzdHJpbmdzLCBtYXRjaGVkIGFnYWluc3QgYWxsIG1vZHVsZSBwYXRocyBiZWZvcmUgY29uc2lkZXJlZCAndmlzaWJsZScgdG8gdGhlIG1vZHVsZSBsb2FkZXJcbiAgLy8gbW9kdWxlUGF0aElnbm9yZVBhdHRlcm5zOiBbXSxcblxuICAvLyBBY3RpdmF0ZXMgbm90aWZpY2F0aW9ucyBmb3IgdGVzdCByZXN1bHRzXG4gIC8vIG5vdGlmeTogZmFsc2UsXG5cbiAgLy8gQW4gZW51bSB0aGF0IHNwZWNpZmllcyBub3RpZmljYXRpb24gbW9kZS4gUmVxdWlyZXMgeyBub3RpZnk6IHRydWUgfVxuICAvLyBub3RpZnlNb2RlOiBcImZhaWx1cmUtY2hhbmdlXCIsXG5cbiAgLy8gQSBwcmVzZXQgdGhhdCBpcyB1c2VkIGFzIGEgYmFzZSBmb3IgSmVzdCdzIGNvbmZpZ3VyYXRpb25cbiAgLy8gcHJlc2V0OiB1bmRlZmluZWQsXG5cbiAgLy8gUnVuIHRlc3RzIGZyb20gb25lIG9yIG1vcmUgcHJvamVjdHNcbiAgLy8gcHJvamVjdHM6IHVuZGVmaW5lZCxcblxuICAvLyBVc2UgdGhpcyBjb25maWd1cmF0aW9uIG9wdGlvbiB0byBhZGQgY3VzdG9tIHJlcG9ydGVycyB0byBKZXN0XG4gIC8vIHJlcG9ydGVyczogdW5kZWZpbmVkLFxuXG4gIC8vIEF1dG9tYXRpY2FsbHkgcmVzZXQgbW9jayBzdGF0ZSBiZWZvcmUgZXZlcnkgdGVzdFxuICAvLyByZXNldE1vY2tzOiBmYWxzZSxcblxuICAvLyBSZXNldCB0aGUgbW9kdWxlIHJlZ2lzdHJ5IGJlZm9yZSBydW5uaW5nIGVhY2ggaW5kaXZpZHVhbCB0ZXN0XG4gIC8vIHJlc2V0TW9kdWxlczogZmFsc2UsXG5cbiAgLy8gQSBwYXRoIHRvIGEgY3VzdG9tIHJlc29sdmVyXG4gIC8vIHJlc29sdmVyOiB1bmRlZmluZWQsXG5cbiAgLy8gQXV0b21hdGljYWxseSByZXN0b3JlIG1vY2sgc3RhdGUgYW5kIGltcGxlbWVudGF0aW9uIGJlZm9yZSBldmVyeSB0ZXN0XG4gIC8vIHJlc3RvcmVNb2NrczogZmFsc2UsXG5cbiAgLy8gVGhlIHJvb3QgZGlyZWN0b3J5IHRoYXQgSmVzdCBzaG91bGQgc2NhbiBmb3IgdGVzdHMgYW5kIG1vZHVsZXMgd2l0aGluXG4gIC8vIHJvb3REaXI6IHVuZGVmaW5lZCxcblxuICAvLyBBIGxpc3Qgb2YgcGF0aHMgdG8gZGlyZWN0b3JpZXMgdGhhdCBKZXN0IHNob3VsZCB1c2UgdG8gc2VhcmNoIGZvciBmaWxlcyBpblxuICByb290czogW1xuICAgIF9fZGlybmFtZVxuICBdLFxuXG4gIC8vIEFsbG93cyB5b3UgdG8gdXNlIGEgY3VzdG9tIHJ1bm5lciBpbnN0ZWFkIG9mIEplc3QncyBkZWZhdWx0IHRlc3QgcnVubmVyXG4gIC8vIHJ1bm5lcjogXCJqZXN0LXJ1bm5lclwiLFxuXG4gIC8vIFRoZSBwYXRocyB0byBtb2R1bGVzIHRoYXQgcnVuIHNvbWUgY29kZSB0byBjb25maWd1cmUgb3Igc2V0IHVwIHRoZSB0ZXN0aW5nIGVudmlyb25tZW50IGJlZm9yZSBlYWNoIHRlc3RcbiAgLy8gc2V0dXBGaWxlczogW10sXG5cbiAgLy8gQSBsaXN0IG9mIHBhdGhzIHRvIG1vZHVsZXMgdGhhdCBydW4gc29tZSBjb2RlIHRvIGNvbmZpZ3VyZSBvciBzZXQgdXAgdGhlIHRlc3RpbmcgZnJhbWV3b3JrIGJlZm9yZSBlYWNoIHRlc3RcbiAgLy8gc2V0dXBGaWxlc0FmdGVyRW52OiBbXSxcblxuICAvLyBUaGUgbnVtYmVyIG9mIHNlY29uZHMgYWZ0ZXIgd2hpY2ggYSB0ZXN0IGlzIGNvbnNpZGVyZWQgYXMgc2xvdyBhbmQgcmVwb3J0ZWQgYXMgc3VjaCBpbiB0aGUgcmVzdWx0cy5cbiAgLy8gc2xvd1Rlc3RUaHJlc2hvbGQ6IDUsXG5cbiAgLy8gQSBsaXN0IG9mIHBhdGhzIHRvIHNuYXBzaG90IHNlcmlhbGl6ZXIgbW9kdWxlcyBKZXN0IHNob3VsZCB1c2UgZm9yIHNuYXBzaG90IHRlc3RpbmdcbiAgLy8gc25hcHNob3RTZXJpYWxpemVyczogW10sXG5cbiAgLy8gVGhlIHRlc3QgZW52aXJvbm1lbnQgdGhhdCB3aWxsIGJlIHVzZWQgZm9yIHRlc3RpbmdcbiAgLy8gdGVzdEVudmlyb25tZW50OiBcImplc3QtZW52aXJvbm1lbnQtbm9kZVwiLFxuXG4gIC8vIE9wdGlvbnMgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgdGVzdEVudmlyb25tZW50XG4gIC8vIHRlc3RFbnZpcm9ubWVudE9wdGlvbnM6IHt9LFxuXG4gIC8vIEFkZHMgYSBsb2NhdGlvbiBmaWVsZCB0byB0ZXN0IHJlc3VsdHNcbiAgLy8gdGVzdExvY2F0aW9uSW5SZXN1bHRzOiBmYWxzZSxcblxuICAvLyBUaGUgZ2xvYiBwYXR0ZXJucyBKZXN0IHVzZXMgdG8gZGV0ZWN0IHRlc3QgZmlsZXNcbiAgdGVzdE1hdGNoOiBbXG4gICAgJyoqL19fdGVzdHNfXy8qKi8qLltqdF1zPyh4KSdcbiAgLy8gXCIqKi8/KCouKSsoc3BlY3x0ZXN0KS5bdGpdcz8oeClcIlxuICBdXG5cbiAgLy8gQW4gYXJyYXkgb2YgcmVnZXhwIHBhdHRlcm4gc3RyaW5ncyB0aGF0IGFyZSBtYXRjaGVkIGFnYWluc3QgYWxsIHRlc3QgcGF0aHMsIG1hdGNoZWQgdGVzdHMgYXJlIHNraXBwZWRcbiAgLy8gdGVzdFBhdGhJZ25vcmVQYXR0ZXJuczogW1xuICAvLyAgIFwiL25vZGVfbW9kdWxlcy9cIlxuICAvLyBdLFxuXG4gIC8vIFRoZSByZWdleHAgcGF0dGVybiBvciBhcnJheSBvZiBwYXR0ZXJucyB0aGF0IEplc3QgdXNlcyB0byBkZXRlY3QgdGVzdCBmaWxlc1xuICAvLyB0ZXN0UmVnZXg6IFtdLFxuXG4gIC8vIFRoaXMgb3B0aW9uIGFsbG93cyB0aGUgdXNlIG9mIGEgY3VzdG9tIHJlc3VsdHMgcHJvY2Vzc29yXG4gIC8vIHRlc3RSZXN1bHRzUHJvY2Vzc29yOiB1bmRlZmluZWQsXG5cbiAgLy8gVGhpcyBvcHRpb24gYWxsb3dzIHVzZSBvZiBhIGN1c3RvbSB0ZXN0IHJ1bm5lclxuICAvLyB0ZXN0UnVubmVyOiBcImplc3QtY2lyY3VzL3J1bm5lclwiLFxuXG4gIC8vIEEgbWFwIGZyb20gcmVndWxhciBleHByZXNzaW9ucyB0byBwYXRocyB0byB0cmFuc2Zvcm1lcnNcbiAgLy8gdHJhbnNmb3JtOiB1bmRlZmluZWQsXG5cbiAgLy8gQW4gYXJyYXkgb2YgcmVnZXhwIHBhdHRlcm4gc3RyaW5ncyB0aGF0IGFyZSBtYXRjaGVkIGFnYWluc3QgYWxsIHNvdXJjZSBmaWxlIHBhdGhzLCBtYXRjaGVkIGZpbGVzIHdpbGwgc2tpcCB0cmFuc2Zvcm1hdGlvblxuICAvLyB0cmFuc2Zvcm1JZ25vcmVQYXR0ZXJuczogW1xuICAvLyAgIFwiL25vZGVfbW9kdWxlcy9cIixcbiAgLy8gICBcIlxcXFwucG5wXFxcXC5bXlxcXFwvXSskXCJcbiAgLy8gXSxcblxuICAvLyBBbiBhcnJheSBvZiByZWdleHAgcGF0dGVybiBzdHJpbmdzIHRoYXQgYXJlIG1hdGNoZWQgYWdhaW5zdCBhbGwgbW9kdWxlcyBiZWZvcmUgdGhlIG1vZHVsZSBsb2FkZXIgd2lsbCBhdXRvbWF0aWNhbGx5IHJldHVybiBhIG1vY2sgZm9yIHRoZW1cbiAgLy8gdW5tb2NrZWRNb2R1bGVQYXRoUGF0dGVybnM6IHVuZGVmaW5lZCxcblxuICAvLyBJbmRpY2F0ZXMgd2hldGhlciBlYWNoIGluZGl2aWR1YWwgdGVzdCBzaG91bGQgYmUgcmVwb3J0ZWQgZHVyaW5nIHRoZSBydW5cbiAgLy8gdmVyYm9zZTogdW5kZWZpbmVkLFxuXG4gIC8vIEFuIGFycmF5IG9mIHJlZ2V4cCBwYXR0ZXJucyB0aGF0IGFyZSBtYXRjaGVkIGFnYWluc3QgYWxsIHNvdXJjZSBmaWxlIHBhdGhzIGJlZm9yZSByZS1ydW5uaW5nIHRlc3RzIGluIHdhdGNoIG1vZGVcbiAgLy8gd2F0Y2hQYXRoSWdub3JlUGF0dGVybnM6IFtdLFxuXG4gIC8vIFdoZXRoZXIgdG8gdXNlIHdhdGNobWFuIGZvciBmaWxlIGNyYXdsaW5nXG4gIC8vIHdhdGNobWFuOiB0cnVlLFxufTtcbiJdfQ==