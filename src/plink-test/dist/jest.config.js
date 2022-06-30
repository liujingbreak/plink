"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
const path_1 = tslib_1.__importDefault(require("path"));
const transform = {
    '\\.jsx?$': 'babel-jest',
    '\\.tsx?$': [
        path_1.default.resolve(__dirname, 'ts-transformer.js'), {
            rootFiles: process.argv.splice(2).filter(arg => /\.tsx?$/.test(arg))
        }
    ]
};
const config = {
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
    roots: [path_1.default.dirname(__dirname)],
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
        // Path.relative(process.cwd(), Path.resolve(__dirname, '../__tests__')).replace(/\\/g, '/') + '/**/*.[jt]s?(x)'
        '**/?(*.)+(spec|test).[tj]s?(x)'
    ],
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
    transform
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
exports.default = config;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamVzdC5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqZXN0LmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7O0dBR0c7QUFDSCx3REFBd0I7QUFHeEIsTUFBTSxTQUFTLEdBQXVDO0lBQ3BELFVBQVUsRUFBRSxZQUFZO0lBQ3hCLFVBQVUsRUFBRTtRQUNWLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLEVBQUU7WUFDNUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDckU7S0FDRjtDQUNGLENBQUM7QUFFRixNQUFNLE1BQU0sR0FBMEI7SUFDcEMsb0VBQW9FO0lBQ3BFLG1CQUFtQjtJQUVuQix3Q0FBd0M7SUFDeEMsV0FBVztJQUVYLDBFQUEwRTtJQUMxRSxzRkFBc0Y7SUFFdEYsb0ZBQW9GO0lBQ3BGLHFCQUFxQjtJQUVyQiwwRkFBMEY7SUFDMUYsMEJBQTBCO0lBRTFCLHlHQUF5RztJQUN6RyxrQ0FBa0M7SUFFbEMsNERBQTREO0lBQzVELGdDQUFnQztJQUVoQyxzRUFBc0U7SUFDdEUsZ0NBQWdDO0lBQ2hDLHFCQUFxQjtJQUNyQixLQUFLO0lBRUwsMEVBQTBFO0lBQzFFLGdCQUFnQixFQUFFLElBQUk7SUFFdEIsd0VBQXdFO0lBQ3hFLHVCQUF1QjtJQUN2QixZQUFZO0lBQ1osWUFBWTtJQUNaLFlBQVk7SUFDWixhQUFhO0lBQ2IsS0FBSztJQUVMLCtFQUErRTtJQUMvRSxnQ0FBZ0M7SUFFaEMsMENBQTBDO0lBQzFDLGtDQUFrQztJQUVsQyw0REFBNEQ7SUFDNUQsNEJBQTRCO0lBRTVCLDRDQUE0QztJQUM1QyxnQkFBZ0I7SUFDaEIsNEJBQTRCO0lBQzVCLEtBQUs7SUFFTCwrRUFBK0U7SUFDL0UsMEJBQTBCO0lBRTFCLG1HQUFtRztJQUNuRywwQkFBMEI7SUFFMUIsa0dBQWtHO0lBQ2xHLDZCQUE2QjtJQUU3QiwrRUFBK0U7SUFDL0UsZUFBZTtJQUVmLGlPQUFpTztJQUNqTyxxQkFBcUI7SUFFckIsaUdBQWlHO0lBQ2pHLHVCQUF1QjtJQUN2QixtQkFBbUI7SUFDbkIsS0FBSztJQUVMLCtDQUErQztJQUMvQywwQkFBMEI7SUFDMUIsVUFBVTtJQUNWLFdBQVc7SUFDWCxXQUFXO0lBQ1gsV0FBVztJQUNYLFVBQVU7SUFDVixXQUFXO0lBQ1gsWUFBWTtJQUNaLFdBQVc7SUFDWCxLQUFLO0lBRUwsb0lBQW9JO0lBQ3BJLHdCQUF3QjtJQUV4Qix3SEFBd0g7SUFDeEgsZ0NBQWdDO0lBRWhDLDJDQUEyQztJQUMzQyxpQkFBaUI7SUFFakIsc0VBQXNFO0lBQ3RFLGdDQUFnQztJQUVoQywyREFBMkQ7SUFDM0QscUJBQXFCO0lBRXJCLHNDQUFzQztJQUN0Qyx1QkFBdUI7SUFFdkIsZ0VBQWdFO0lBQ2hFLHdCQUF3QjtJQUV4QixtREFBbUQ7SUFDbkQscUJBQXFCO0lBRXJCLGdFQUFnRTtJQUNoRSx1QkFBdUI7SUFFdkIsOEJBQThCO0lBQzlCLHVCQUF1QjtJQUV2Qix3RUFBd0U7SUFDeEUsdUJBQXVCO0lBRXZCLHdFQUF3RTtJQUN4RSxzQkFBc0I7SUFFdEIsNkVBQTZFO0lBQzdFLEtBQUssRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFaEMsMEVBQTBFO0lBQzFFLHlCQUF5QjtJQUV6QiwwR0FBMEc7SUFDMUcsa0JBQWtCO0lBRWxCLDhHQUE4RztJQUM5RywwQkFBMEI7SUFFMUIsc0dBQXNHO0lBQ3RHLHdCQUF3QjtJQUV4QixzRkFBc0Y7SUFDdEYsMkJBQTJCO0lBRTNCLHFEQUFxRDtJQUNyRCw0Q0FBNEM7SUFFNUMscURBQXFEO0lBQ3JELDhCQUE4QjtJQUU5Qix3Q0FBd0M7SUFDeEMsZ0NBQWdDO0lBRWhDLG1EQUFtRDtJQUNuRCxTQUFTLEVBQUU7UUFDVCxnSEFBZ0g7UUFDaEgsZ0NBQWdDO0tBQ2pDO0lBRUQsd0dBQXdHO0lBQ3hHLDRCQUE0QjtJQUM1QixxQkFBcUI7SUFDckIsS0FBSztJQUVMLDhFQUE4RTtJQUM5RSxpQkFBaUI7SUFFakIsMkRBQTJEO0lBQzNELG1DQUFtQztJQUVuQyxpREFBaUQ7SUFDakQsb0NBQW9DO0lBRXBDLDBEQUEwRDtJQUMxRCxTQUFTO0lBRVQsNEhBQTRIO0lBQzVILDZCQUE2QjtJQUM3QixzQkFBc0I7SUFDdEIsd0JBQXdCO0lBQ3hCLEtBQUs7SUFFTCw2SUFBNkk7SUFDN0kseUNBQXlDO0lBRXpDLDJFQUEyRTtJQUMzRSxzQkFBc0I7SUFFdEIsbUhBQW1IO0lBQ25ILCtCQUErQjtJQUUvQiw0Q0FBNEM7SUFDNUMsa0JBQWtCO0NBQ25CLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogRm9yIGEgZGV0YWlsZWQgZXhwbGFuYXRpb24gcmVnYXJkaW5nIGVhY2ggY29uZmlndXJhdGlvbiBwcm9wZXJ0eSBhbmQgdHlwZSBjaGVjaywgdmlzaXQ6XG4gKiBodHRwczovL2plc3Rqcy5pby9kb2NzL2NvbmZpZ3VyYXRpb25cbiAqL1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgdHlwZSB7Q29uZmlnfSBmcm9tICdAamVzdC90eXBlcyc7XG5cbmNvbnN0IHRyYW5zZm9ybTogQ29uZmlnLkluaXRpYWxPcHRpb25zWyd0cmFuc2Zvcm0nXSA9IHtcbiAgJ1xcXFwuanN4PyQnOiAnYmFiZWwtamVzdCcsXG4gICdcXFxcLnRzeD8kJzogW1xuICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0cy10cmFuc2Zvcm1lci5qcycpLCB7XG4gICAgICByb290RmlsZXM6IHByb2Nlc3MuYXJndi5zcGxpY2UoMikuZmlsdGVyKGFyZyA9PiAvXFwudHN4PyQvLnRlc3QoYXJnKSlcbiAgICB9XG4gIF1cbn07XG5cbmNvbnN0IGNvbmZpZzogQ29uZmlnLkluaXRpYWxPcHRpb25zID0ge1xuICAvLyBBbGwgaW1wb3J0ZWQgbW9kdWxlcyBpbiB5b3VyIHRlc3RzIHNob3VsZCBiZSBtb2NrZWQgYXV0b21hdGljYWxseVxuICAvLyBhdXRvbW9jazogZmFsc2UsXG5cbiAgLy8gU3RvcCBydW5uaW5nIHRlc3RzIGFmdGVyIGBuYCBmYWlsdXJlc1xuICAvLyBiYWlsOiAwLFxuXG4gIC8vIFRoZSBkaXJlY3Rvcnkgd2hlcmUgSmVzdCBzaG91bGQgc3RvcmUgaXRzIGNhY2hlZCBkZXBlbmRlbmN5IGluZm9ybWF0aW9uXG4gIC8vIGNhY2hlRGlyZWN0b3J5OiBcIi9wcml2YXRlL3Zhci9mb2xkZXJzL2xzLzI4bXdfaG54MzZnNzRocjBubXMwdHcwMDAwMDBnbi9UL2plc3RfZHhcIixcblxuICAvLyBBdXRvbWF0aWNhbGx5IGNsZWFyIG1vY2sgY2FsbHMsIGluc3RhbmNlcywgY29udGV4dHMgYW5kIHJlc3VsdHMgYmVmb3JlIGV2ZXJ5IHRlc3RcbiAgLy8gY2xlYXJNb2NrczogZmFsc2UsXG5cbiAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGNvdmVyYWdlIGluZm9ybWF0aW9uIHNob3VsZCBiZSBjb2xsZWN0ZWQgd2hpbGUgZXhlY3V0aW5nIHRoZSB0ZXN0XG4gIC8vIGNvbGxlY3RDb3ZlcmFnZTogZmFsc2UsXG5cbiAgLy8gQW4gYXJyYXkgb2YgZ2xvYiBwYXR0ZXJucyBpbmRpY2F0aW5nIGEgc2V0IG9mIGZpbGVzIGZvciB3aGljaCBjb3ZlcmFnZSBpbmZvcm1hdGlvbiBzaG91bGQgYmUgY29sbGVjdGVkXG4gIC8vIGNvbGxlY3RDb3ZlcmFnZUZyb206IHVuZGVmaW5lZCxcblxuICAvLyBUaGUgZGlyZWN0b3J5IHdoZXJlIEplc3Qgc2hvdWxkIG91dHB1dCBpdHMgY292ZXJhZ2UgZmlsZXNcbiAgLy8gY292ZXJhZ2VEaXJlY3Rvcnk6IHVuZGVmaW5lZCxcblxuICAvLyBBbiBhcnJheSBvZiByZWdleHAgcGF0dGVybiBzdHJpbmdzIHVzZWQgdG8gc2tpcCBjb3ZlcmFnZSBjb2xsZWN0aW9uXG4gIC8vIGNvdmVyYWdlUGF0aElnbm9yZVBhdHRlcm5zOiBbXG4gIC8vICAgXCIvbm9kZV9tb2R1bGVzL1wiXG4gIC8vIF0sXG5cbiAgLy8gSW5kaWNhdGVzIHdoaWNoIHByb3ZpZGVyIHNob3VsZCBiZSB1c2VkIHRvIGluc3RydW1lbnQgY29kZSBmb3IgY292ZXJhZ2VcbiAgY292ZXJhZ2VQcm92aWRlcjogJ3Y4JyxcblxuICAvLyBBIGxpc3Qgb2YgcmVwb3J0ZXIgbmFtZXMgdGhhdCBKZXN0IHVzZXMgd2hlbiB3cml0aW5nIGNvdmVyYWdlIHJlcG9ydHNcbiAgLy8gY292ZXJhZ2VSZXBvcnRlcnM6IFtcbiAgLy8gICBcImpzb25cIixcbiAgLy8gICBcInRleHRcIixcbiAgLy8gICBcImxjb3ZcIixcbiAgLy8gICBcImNsb3ZlclwiXG4gIC8vIF0sXG5cbiAgLy8gQW4gb2JqZWN0IHRoYXQgY29uZmlndXJlcyBtaW5pbXVtIHRocmVzaG9sZCBlbmZvcmNlbWVudCBmb3IgY292ZXJhZ2UgcmVzdWx0c1xuICAvLyBjb3ZlcmFnZVRocmVzaG9sZDogdW5kZWZpbmVkLFxuXG4gIC8vIEEgcGF0aCB0byBhIGN1c3RvbSBkZXBlbmRlbmN5IGV4dHJhY3RvclxuICAvLyBkZXBlbmRlbmN5RXh0cmFjdG9yOiB1bmRlZmluZWQsXG5cbiAgLy8gTWFrZSBjYWxsaW5nIGRlcHJlY2F0ZWQgQVBJcyB0aHJvdyBoZWxwZnVsIGVycm9yIG1lc3NhZ2VzXG4gIC8vIGVycm9yT25EZXByZWNhdGVkOiBmYWxzZSxcblxuICAvLyBUaGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBmYWtlIHRpbWVyc1xuICAvLyBmYWtlVGltZXJzOiB7XG4gIC8vICAgXCJlbmFibGVHbG9iYWxseVwiOiBmYWxzZVxuICAvLyB9LFxuXG4gIC8vIEZvcmNlIGNvdmVyYWdlIGNvbGxlY3Rpb24gZnJvbSBpZ25vcmVkIGZpbGVzIHVzaW5nIGFuIGFycmF5IG9mIGdsb2IgcGF0dGVybnNcbiAgLy8gZm9yY2VDb3ZlcmFnZU1hdGNoOiBbXSxcblxuICAvLyBBIHBhdGggdG8gYSBtb2R1bGUgd2hpY2ggZXhwb3J0cyBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IGlzIHRyaWdnZXJlZCBvbmNlIGJlZm9yZSBhbGwgdGVzdCBzdWl0ZXNcbiAgLy8gZ2xvYmFsU2V0dXA6IHVuZGVmaW5lZCxcblxuICAvLyBBIHBhdGggdG8gYSBtb2R1bGUgd2hpY2ggZXhwb3J0cyBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IGlzIHRyaWdnZXJlZCBvbmNlIGFmdGVyIGFsbCB0ZXN0IHN1aXRlc1xuICAvLyBnbG9iYWxUZWFyZG93bjogdW5kZWZpbmVkLFxuXG4gIC8vIEEgc2V0IG9mIGdsb2JhbCB2YXJpYWJsZXMgdGhhdCBuZWVkIHRvIGJlIGF2YWlsYWJsZSBpbiBhbGwgdGVzdCBlbnZpcm9ubWVudHNcbiAgLy8gZ2xvYmFsczoge30sXG5cbiAgLy8gVGhlIG1heGltdW0gYW1vdW50IG9mIHdvcmtlcnMgdXNlZCB0byBydW4geW91ciB0ZXN0cy4gQ2FuIGJlIHNwZWNpZmllZCBhcyAlIG9yIGEgbnVtYmVyLiBFLmcuIG1heFdvcmtlcnM6IDEwJSB3aWxsIHVzZSAxMCUgb2YgeW91ciBDUFUgYW1vdW50ICsgMSBhcyB0aGUgbWF4aW11bSB3b3JrZXIgbnVtYmVyLiBtYXhXb3JrZXJzOiAyIHdpbGwgdXNlIGEgbWF4aW11bSBvZiAyIHdvcmtlcnMuXG4gIC8vIG1heFdvcmtlcnM6IFwiNTAlXCIsXG5cbiAgLy8gQW4gYXJyYXkgb2YgZGlyZWN0b3J5IG5hbWVzIHRvIGJlIHNlYXJjaGVkIHJlY3Vyc2l2ZWx5IHVwIGZyb20gdGhlIHJlcXVpcmluZyBtb2R1bGUncyBsb2NhdGlvblxuICAvLyBtb2R1bGVEaXJlY3RvcmllczogW1xuICAvLyAgIFwibm9kZV9tb2R1bGVzXCJcbiAgLy8gXSxcblxuICAvLyBBbiBhcnJheSBvZiBmaWxlIGV4dGVuc2lvbnMgeW91ciBtb2R1bGVzIHVzZVxuICAvLyBtb2R1bGVGaWxlRXh0ZW5zaW9uczogW1xuICAvLyAgIFwianNcIixcbiAgLy8gICBcIm1qc1wiLFxuICAvLyAgIFwiY2pzXCIsXG4gIC8vICAgXCJqc3hcIixcbiAgLy8gICBcInRzXCIsXG4gIC8vICAgXCJ0c3hcIixcbiAgLy8gICBcImpzb25cIixcbiAgLy8gICBcIm5vZGVcIlxuICAvLyBdLFxuXG4gIC8vIEEgbWFwIGZyb20gcmVndWxhciBleHByZXNzaW9ucyB0byBtb2R1bGUgbmFtZXMgb3IgdG8gYXJyYXlzIG9mIG1vZHVsZSBuYW1lcyB0aGF0IGFsbG93IHRvIHN0dWIgb3V0IHJlc291cmNlcyB3aXRoIGEgc2luZ2xlIG1vZHVsZVxuICAvLyBtb2R1bGVOYW1lTWFwcGVyOiB7fSxcblxuICAvLyBBbiBhcnJheSBvZiByZWdleHAgcGF0dGVybiBzdHJpbmdzLCBtYXRjaGVkIGFnYWluc3QgYWxsIG1vZHVsZSBwYXRocyBiZWZvcmUgY29uc2lkZXJlZCAndmlzaWJsZScgdG8gdGhlIG1vZHVsZSBsb2FkZXJcbiAgLy8gbW9kdWxlUGF0aElnbm9yZVBhdHRlcm5zOiBbXSxcblxuICAvLyBBY3RpdmF0ZXMgbm90aWZpY2F0aW9ucyBmb3IgdGVzdCByZXN1bHRzXG4gIC8vIG5vdGlmeTogZmFsc2UsXG5cbiAgLy8gQW4gZW51bSB0aGF0IHNwZWNpZmllcyBub3RpZmljYXRpb24gbW9kZS4gUmVxdWlyZXMgeyBub3RpZnk6IHRydWUgfVxuICAvLyBub3RpZnlNb2RlOiBcImZhaWx1cmUtY2hhbmdlXCIsXG5cbiAgLy8gQSBwcmVzZXQgdGhhdCBpcyB1c2VkIGFzIGEgYmFzZSBmb3IgSmVzdCdzIGNvbmZpZ3VyYXRpb25cbiAgLy8gcHJlc2V0OiB1bmRlZmluZWQsXG5cbiAgLy8gUnVuIHRlc3RzIGZyb20gb25lIG9yIG1vcmUgcHJvamVjdHNcbiAgLy8gcHJvamVjdHM6IHVuZGVmaW5lZCxcblxuICAvLyBVc2UgdGhpcyBjb25maWd1cmF0aW9uIG9wdGlvbiB0byBhZGQgY3VzdG9tIHJlcG9ydGVycyB0byBKZXN0XG4gIC8vIHJlcG9ydGVyczogdW5kZWZpbmVkLFxuXG4gIC8vIEF1dG9tYXRpY2FsbHkgcmVzZXQgbW9jayBzdGF0ZSBiZWZvcmUgZXZlcnkgdGVzdFxuICAvLyByZXNldE1vY2tzOiBmYWxzZSxcblxuICAvLyBSZXNldCB0aGUgbW9kdWxlIHJlZ2lzdHJ5IGJlZm9yZSBydW5uaW5nIGVhY2ggaW5kaXZpZHVhbCB0ZXN0XG4gIC8vIHJlc2V0TW9kdWxlczogZmFsc2UsXG5cbiAgLy8gQSBwYXRoIHRvIGEgY3VzdG9tIHJlc29sdmVyXG4gIC8vIHJlc29sdmVyOiB1bmRlZmluZWQsXG5cbiAgLy8gQXV0b21hdGljYWxseSByZXN0b3JlIG1vY2sgc3RhdGUgYW5kIGltcGxlbWVudGF0aW9uIGJlZm9yZSBldmVyeSB0ZXN0XG4gIC8vIHJlc3RvcmVNb2NrczogZmFsc2UsXG5cbiAgLy8gVGhlIHJvb3QgZGlyZWN0b3J5IHRoYXQgSmVzdCBzaG91bGQgc2NhbiBmb3IgdGVzdHMgYW5kIG1vZHVsZXMgd2l0aGluXG4gIC8vIHJvb3REaXI6IHVuZGVmaW5lZCxcblxuICAvLyBBIGxpc3Qgb2YgcGF0aHMgdG8gZGlyZWN0b3JpZXMgdGhhdCBKZXN0IHNob3VsZCB1c2UgdG8gc2VhcmNoIGZvciBmaWxlcyBpblxuICByb290czogW1BhdGguZGlybmFtZShfX2Rpcm5hbWUpXSxcblxuICAvLyBBbGxvd3MgeW91IHRvIHVzZSBhIGN1c3RvbSBydW5uZXIgaW5zdGVhZCBvZiBKZXN0J3MgZGVmYXVsdCB0ZXN0IHJ1bm5lclxuICAvLyBydW5uZXI6IFwiamVzdC1ydW5uZXJcIixcblxuICAvLyBUaGUgcGF0aHMgdG8gbW9kdWxlcyB0aGF0IHJ1biBzb21lIGNvZGUgdG8gY29uZmlndXJlIG9yIHNldCB1cCB0aGUgdGVzdGluZyBlbnZpcm9ubWVudCBiZWZvcmUgZWFjaCB0ZXN0XG4gIC8vIHNldHVwRmlsZXM6IFtdLFxuXG4gIC8vIEEgbGlzdCBvZiBwYXRocyB0byBtb2R1bGVzIHRoYXQgcnVuIHNvbWUgY29kZSB0byBjb25maWd1cmUgb3Igc2V0IHVwIHRoZSB0ZXN0aW5nIGZyYW1ld29yayBiZWZvcmUgZWFjaCB0ZXN0XG4gIC8vIHNldHVwRmlsZXNBZnRlckVudjogW10sXG5cbiAgLy8gVGhlIG51bWJlciBvZiBzZWNvbmRzIGFmdGVyIHdoaWNoIGEgdGVzdCBpcyBjb25zaWRlcmVkIGFzIHNsb3cgYW5kIHJlcG9ydGVkIGFzIHN1Y2ggaW4gdGhlIHJlc3VsdHMuXG4gIC8vIHNsb3dUZXN0VGhyZXNob2xkOiA1LFxuXG4gIC8vIEEgbGlzdCBvZiBwYXRocyB0byBzbmFwc2hvdCBzZXJpYWxpemVyIG1vZHVsZXMgSmVzdCBzaG91bGQgdXNlIGZvciBzbmFwc2hvdCB0ZXN0aW5nXG4gIC8vIHNuYXBzaG90U2VyaWFsaXplcnM6IFtdLFxuXG4gIC8vIFRoZSB0ZXN0IGVudmlyb25tZW50IHRoYXQgd2lsbCBiZSB1c2VkIGZvciB0ZXN0aW5nXG4gIC8vIHRlc3RFbnZpcm9ubWVudDogXCJqZXN0LWVudmlyb25tZW50LW5vZGVcIixcblxuICAvLyBPcHRpb25zIHRoYXQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIHRlc3RFbnZpcm9ubWVudFxuICAvLyB0ZXN0RW52aXJvbm1lbnRPcHRpb25zOiB7fSxcblxuICAvLyBBZGRzIGEgbG9jYXRpb24gZmllbGQgdG8gdGVzdCByZXN1bHRzXG4gIC8vIHRlc3RMb2NhdGlvbkluUmVzdWx0czogZmFsc2UsXG5cbiAgLy8gVGhlIGdsb2IgcGF0dGVybnMgSmVzdCB1c2VzIHRvIGRldGVjdCB0ZXN0IGZpbGVzXG4gIHRlc3RNYXRjaDogW1xuICAgIC8vIFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL19fdGVzdHNfXycpKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLyoqLyouW2p0XXM/KHgpJ1xuICAgICcqKi8/KCouKSsoc3BlY3x0ZXN0KS5bdGpdcz8oeCknXG4gIF0sXG5cbiAgLy8gQW4gYXJyYXkgb2YgcmVnZXhwIHBhdHRlcm4gc3RyaW5ncyB0aGF0IGFyZSBtYXRjaGVkIGFnYWluc3QgYWxsIHRlc3QgcGF0aHMsIG1hdGNoZWQgdGVzdHMgYXJlIHNraXBwZWRcbiAgLy8gdGVzdFBhdGhJZ25vcmVQYXR0ZXJuczogW1xuICAvLyAgIFwiL25vZGVfbW9kdWxlcy9cIlxuICAvLyBdLFxuXG4gIC8vIFRoZSByZWdleHAgcGF0dGVybiBvciBhcnJheSBvZiBwYXR0ZXJucyB0aGF0IEplc3QgdXNlcyB0byBkZXRlY3QgdGVzdCBmaWxlc1xuICAvLyB0ZXN0UmVnZXg6IFtdLFxuXG4gIC8vIFRoaXMgb3B0aW9uIGFsbG93cyB0aGUgdXNlIG9mIGEgY3VzdG9tIHJlc3VsdHMgcHJvY2Vzc29yXG4gIC8vIHRlc3RSZXN1bHRzUHJvY2Vzc29yOiB1bmRlZmluZWQsXG5cbiAgLy8gVGhpcyBvcHRpb24gYWxsb3dzIHVzZSBvZiBhIGN1c3RvbSB0ZXN0IHJ1bm5lclxuICAvLyB0ZXN0UnVubmVyOiBcImplc3QtY2lyY3VzL3J1bm5lclwiLFxuXG4gIC8vIEEgbWFwIGZyb20gcmVndWxhciBleHByZXNzaW9ucyB0byBwYXRocyB0byB0cmFuc2Zvcm1lcnNcbiAgdHJhbnNmb3JtXG5cbiAgLy8gQW4gYXJyYXkgb2YgcmVnZXhwIHBhdHRlcm4gc3RyaW5ncyB0aGF0IGFyZSBtYXRjaGVkIGFnYWluc3QgYWxsIHNvdXJjZSBmaWxlIHBhdGhzLCBtYXRjaGVkIGZpbGVzIHdpbGwgc2tpcCB0cmFuc2Zvcm1hdGlvblxuICAvLyB0cmFuc2Zvcm1JZ25vcmVQYXR0ZXJuczogW1xuICAvLyAgIFwiL25vZGVfbW9kdWxlcy9cIixcbiAgLy8gICBcIlxcXFwucG5wXFxcXC5bXlxcXFwvXSskXCJcbiAgLy8gXSxcblxuICAvLyBBbiBhcnJheSBvZiByZWdleHAgcGF0dGVybiBzdHJpbmdzIHRoYXQgYXJlIG1hdGNoZWQgYWdhaW5zdCBhbGwgbW9kdWxlcyBiZWZvcmUgdGhlIG1vZHVsZSBsb2FkZXIgd2lsbCBhdXRvbWF0aWNhbGx5IHJldHVybiBhIG1vY2sgZm9yIHRoZW1cbiAgLy8gdW5tb2NrZWRNb2R1bGVQYXRoUGF0dGVybnM6IHVuZGVmaW5lZCxcblxuICAvLyBJbmRpY2F0ZXMgd2hldGhlciBlYWNoIGluZGl2aWR1YWwgdGVzdCBzaG91bGQgYmUgcmVwb3J0ZWQgZHVyaW5nIHRoZSBydW5cbiAgLy8gdmVyYm9zZTogdW5kZWZpbmVkLFxuXG4gIC8vIEFuIGFycmF5IG9mIHJlZ2V4cCBwYXR0ZXJucyB0aGF0IGFyZSBtYXRjaGVkIGFnYWluc3QgYWxsIHNvdXJjZSBmaWxlIHBhdGhzIGJlZm9yZSByZS1ydW5uaW5nIHRlc3RzIGluIHdhdGNoIG1vZGVcbiAgLy8gd2F0Y2hQYXRoSWdub3JlUGF0dGVybnM6IFtdLFxuXG4gIC8vIFdoZXRoZXIgdG8gdXNlIHdhdGNobWFuIGZvciBmaWxlIGNyYXdsaW5nXG4gIC8vIHdhdGNobWFuOiB0cnVlLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgY29uZmlnO1xuXG4iXX0=