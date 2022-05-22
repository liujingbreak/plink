"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
const path_1 = __importDefault(require("path"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamVzdC5jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqZXN0LmNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7R0FHRztBQUNILGdEQUF3QjtBQUd4QixNQUFNLFNBQVMsR0FBdUM7SUFDcEQsVUFBVSxFQUFFLFlBQVk7SUFDeEIsVUFBVSxFQUFFO1FBQ1YsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsRUFBRTtZQUM1QyxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNyRTtLQUNGO0NBQ0YsQ0FBQztBQUVGLE1BQU0sTUFBTSxHQUEwQjtJQUNwQyxvRUFBb0U7SUFDcEUsbUJBQW1CO0lBRW5CLHdDQUF3QztJQUN4QyxXQUFXO0lBRVgsMEVBQTBFO0lBQzFFLHNGQUFzRjtJQUV0RixvRkFBb0Y7SUFDcEYscUJBQXFCO0lBRXJCLDBGQUEwRjtJQUMxRiwwQkFBMEI7SUFFMUIseUdBQXlHO0lBQ3pHLGtDQUFrQztJQUVsQyw0REFBNEQ7SUFDNUQsZ0NBQWdDO0lBRWhDLHNFQUFzRTtJQUN0RSxnQ0FBZ0M7SUFDaEMscUJBQXFCO0lBQ3JCLEtBQUs7SUFFTCwwRUFBMEU7SUFDMUUsZ0JBQWdCLEVBQUUsSUFBSTtJQUV0Qix3RUFBd0U7SUFDeEUsdUJBQXVCO0lBQ3ZCLFlBQVk7SUFDWixZQUFZO0lBQ1osWUFBWTtJQUNaLGFBQWE7SUFDYixLQUFLO0lBRUwsK0VBQStFO0lBQy9FLGdDQUFnQztJQUVoQywwQ0FBMEM7SUFDMUMsa0NBQWtDO0lBRWxDLDREQUE0RDtJQUM1RCw0QkFBNEI7SUFFNUIsNENBQTRDO0lBQzVDLGdCQUFnQjtJQUNoQiw0QkFBNEI7SUFDNUIsS0FBSztJQUVMLCtFQUErRTtJQUMvRSwwQkFBMEI7SUFFMUIsbUdBQW1HO0lBQ25HLDBCQUEwQjtJQUUxQixrR0FBa0c7SUFDbEcsNkJBQTZCO0lBRTdCLCtFQUErRTtJQUMvRSxlQUFlO0lBRWYsaU9BQWlPO0lBQ2pPLHFCQUFxQjtJQUVyQixpR0FBaUc7SUFDakcsdUJBQXVCO0lBQ3ZCLG1CQUFtQjtJQUNuQixLQUFLO0lBRUwsK0NBQStDO0lBQy9DLDBCQUEwQjtJQUMxQixVQUFVO0lBQ1YsV0FBVztJQUNYLFdBQVc7SUFDWCxXQUFXO0lBQ1gsVUFBVTtJQUNWLFdBQVc7SUFDWCxZQUFZO0lBQ1osV0FBVztJQUNYLEtBQUs7SUFFTCxvSUFBb0k7SUFDcEksd0JBQXdCO0lBRXhCLHdIQUF3SDtJQUN4SCxnQ0FBZ0M7SUFFaEMsMkNBQTJDO0lBQzNDLGlCQUFpQjtJQUVqQixzRUFBc0U7SUFDdEUsZ0NBQWdDO0lBRWhDLDJEQUEyRDtJQUMzRCxxQkFBcUI7SUFFckIsc0NBQXNDO0lBQ3RDLHVCQUF1QjtJQUV2QixnRUFBZ0U7SUFDaEUsd0JBQXdCO0lBRXhCLG1EQUFtRDtJQUNuRCxxQkFBcUI7SUFFckIsZ0VBQWdFO0lBQ2hFLHVCQUF1QjtJQUV2Qiw4QkFBOEI7SUFDOUIsdUJBQXVCO0lBRXZCLHdFQUF3RTtJQUN4RSx1QkFBdUI7SUFFdkIsd0VBQXdFO0lBQ3hFLHNCQUFzQjtJQUV0Qiw2RUFBNkU7SUFDN0UsS0FBSyxFQUFFLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUVoQywwRUFBMEU7SUFDMUUseUJBQXlCO0lBRXpCLDBHQUEwRztJQUMxRyxrQkFBa0I7SUFFbEIsOEdBQThHO0lBQzlHLDBCQUEwQjtJQUUxQixzR0FBc0c7SUFDdEcsd0JBQXdCO0lBRXhCLHNGQUFzRjtJQUN0RiwyQkFBMkI7SUFFM0IscURBQXFEO0lBQ3JELDRDQUE0QztJQUU1QyxxREFBcUQ7SUFDckQsOEJBQThCO0lBRTlCLHdDQUF3QztJQUN4QyxnQ0FBZ0M7SUFFaEMsbURBQW1EO0lBQ25ELFNBQVMsRUFBRTtRQUNULGdIQUFnSDtRQUNoSCxnQ0FBZ0M7S0FDakM7SUFFRCx3R0FBd0c7SUFDeEcsNEJBQTRCO0lBQzVCLHFCQUFxQjtJQUNyQixLQUFLO0lBRUwsOEVBQThFO0lBQzlFLGlCQUFpQjtJQUVqQiwyREFBMkQ7SUFDM0QsbUNBQW1DO0lBRW5DLGlEQUFpRDtJQUNqRCxvQ0FBb0M7SUFFcEMsMERBQTBEO0lBQzFELFNBQVM7SUFFVCw0SEFBNEg7SUFDNUgsNkJBQTZCO0lBQzdCLHNCQUFzQjtJQUN0Qix3QkFBd0I7SUFDeEIsS0FBSztJQUVMLDZJQUE2STtJQUM3SSx5Q0FBeUM7SUFFekMsMkVBQTJFO0lBQzNFLHNCQUFzQjtJQUV0QixtSEFBbUg7SUFDbkgsK0JBQStCO0lBRS9CLDRDQUE0QztJQUM1QyxrQkFBa0I7Q0FDbkIsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBGb3IgYSBkZXRhaWxlZCBleHBsYW5hdGlvbiByZWdhcmRpbmcgZWFjaCBjb25maWd1cmF0aW9uIHByb3BlcnR5IGFuZCB0eXBlIGNoZWNrLCB2aXNpdDpcbiAqIGh0dHBzOi8vamVzdGpzLmlvL2RvY3MvY29uZmlndXJhdGlvblxuICovXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB0eXBlIHtDb25maWd9IGZyb20gJ0BqZXN0L3R5cGVzJztcblxuY29uc3QgdHJhbnNmb3JtOiBDb25maWcuSW5pdGlhbE9wdGlvbnNbJ3RyYW5zZm9ybSddID0ge1xuICAnXFxcXC5qc3g/JCc6ICdiYWJlbC1qZXN0JyxcbiAgJ1xcXFwudHN4PyQnOiBbXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3RzLXRyYW5zZm9ybWVyLmpzJyksIHtcbiAgICAgIHJvb3RGaWxlczogcHJvY2Vzcy5hcmd2LnNwbGljZSgyKS5maWx0ZXIoYXJnID0+IC9cXC50c3g/JC8udGVzdChhcmcpKVxuICAgIH1cbiAgXVxufTtcblxuY29uc3QgY29uZmlnOiBDb25maWcuSW5pdGlhbE9wdGlvbnMgPSB7XG4gIC8vIEFsbCBpbXBvcnRlZCBtb2R1bGVzIGluIHlvdXIgdGVzdHMgc2hvdWxkIGJlIG1vY2tlZCBhdXRvbWF0aWNhbGx5XG4gIC8vIGF1dG9tb2NrOiBmYWxzZSxcblxuICAvLyBTdG9wIHJ1bm5pbmcgdGVzdHMgYWZ0ZXIgYG5gIGZhaWx1cmVzXG4gIC8vIGJhaWw6IDAsXG5cbiAgLy8gVGhlIGRpcmVjdG9yeSB3aGVyZSBKZXN0IHNob3VsZCBzdG9yZSBpdHMgY2FjaGVkIGRlcGVuZGVuY3kgaW5mb3JtYXRpb25cbiAgLy8gY2FjaGVEaXJlY3Rvcnk6IFwiL3ByaXZhdGUvdmFyL2ZvbGRlcnMvbHMvMjhtd19obngzNmc3NGhyMG5tczB0dzAwMDAwMGduL1QvamVzdF9keFwiLFxuXG4gIC8vIEF1dG9tYXRpY2FsbHkgY2xlYXIgbW9jayBjYWxscywgaW5zdGFuY2VzLCBjb250ZXh0cyBhbmQgcmVzdWx0cyBiZWZvcmUgZXZlcnkgdGVzdFxuICAvLyBjbGVhck1vY2tzOiBmYWxzZSxcblxuICAvLyBJbmRpY2F0ZXMgd2hldGhlciB0aGUgY292ZXJhZ2UgaW5mb3JtYXRpb24gc2hvdWxkIGJlIGNvbGxlY3RlZCB3aGlsZSBleGVjdXRpbmcgdGhlIHRlc3RcbiAgLy8gY29sbGVjdENvdmVyYWdlOiBmYWxzZSxcblxuICAvLyBBbiBhcnJheSBvZiBnbG9iIHBhdHRlcm5zIGluZGljYXRpbmcgYSBzZXQgb2YgZmlsZXMgZm9yIHdoaWNoIGNvdmVyYWdlIGluZm9ybWF0aW9uIHNob3VsZCBiZSBjb2xsZWN0ZWRcbiAgLy8gY29sbGVjdENvdmVyYWdlRnJvbTogdW5kZWZpbmVkLFxuXG4gIC8vIFRoZSBkaXJlY3Rvcnkgd2hlcmUgSmVzdCBzaG91bGQgb3V0cHV0IGl0cyBjb3ZlcmFnZSBmaWxlc1xuICAvLyBjb3ZlcmFnZURpcmVjdG9yeTogdW5kZWZpbmVkLFxuXG4gIC8vIEFuIGFycmF5IG9mIHJlZ2V4cCBwYXR0ZXJuIHN0cmluZ3MgdXNlZCB0byBza2lwIGNvdmVyYWdlIGNvbGxlY3Rpb25cbiAgLy8gY292ZXJhZ2VQYXRoSWdub3JlUGF0dGVybnM6IFtcbiAgLy8gICBcIi9ub2RlX21vZHVsZXMvXCJcbiAgLy8gXSxcblxuICAvLyBJbmRpY2F0ZXMgd2hpY2ggcHJvdmlkZXIgc2hvdWxkIGJlIHVzZWQgdG8gaW5zdHJ1bWVudCBjb2RlIGZvciBjb3ZlcmFnZVxuICBjb3ZlcmFnZVByb3ZpZGVyOiAndjgnLFxuXG4gIC8vIEEgbGlzdCBvZiByZXBvcnRlciBuYW1lcyB0aGF0IEplc3QgdXNlcyB3aGVuIHdyaXRpbmcgY292ZXJhZ2UgcmVwb3J0c1xuICAvLyBjb3ZlcmFnZVJlcG9ydGVyczogW1xuICAvLyAgIFwianNvblwiLFxuICAvLyAgIFwidGV4dFwiLFxuICAvLyAgIFwibGNvdlwiLFxuICAvLyAgIFwiY2xvdmVyXCJcbiAgLy8gXSxcblxuICAvLyBBbiBvYmplY3QgdGhhdCBjb25maWd1cmVzIG1pbmltdW0gdGhyZXNob2xkIGVuZm9yY2VtZW50IGZvciBjb3ZlcmFnZSByZXN1bHRzXG4gIC8vIGNvdmVyYWdlVGhyZXNob2xkOiB1bmRlZmluZWQsXG5cbiAgLy8gQSBwYXRoIHRvIGEgY3VzdG9tIGRlcGVuZGVuY3kgZXh0cmFjdG9yXG4gIC8vIGRlcGVuZGVuY3lFeHRyYWN0b3I6IHVuZGVmaW5lZCxcblxuICAvLyBNYWtlIGNhbGxpbmcgZGVwcmVjYXRlZCBBUElzIHRocm93IGhlbHBmdWwgZXJyb3IgbWVzc2FnZXNcbiAgLy8gZXJyb3JPbkRlcHJlY2F0ZWQ6IGZhbHNlLFxuXG4gIC8vIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIGZha2UgdGltZXJzXG4gIC8vIGZha2VUaW1lcnM6IHtcbiAgLy8gICBcImVuYWJsZUdsb2JhbGx5XCI6IGZhbHNlXG4gIC8vIH0sXG5cbiAgLy8gRm9yY2UgY292ZXJhZ2UgY29sbGVjdGlvbiBmcm9tIGlnbm9yZWQgZmlsZXMgdXNpbmcgYW4gYXJyYXkgb2YgZ2xvYiBwYXR0ZXJuc1xuICAvLyBmb3JjZUNvdmVyYWdlTWF0Y2g6IFtdLFxuXG4gIC8vIEEgcGF0aCB0byBhIG1vZHVsZSB3aGljaCBleHBvcnRzIGFuIGFzeW5jIGZ1bmN0aW9uIHRoYXQgaXMgdHJpZ2dlcmVkIG9uY2UgYmVmb3JlIGFsbCB0ZXN0IHN1aXRlc1xuICAvLyBnbG9iYWxTZXR1cDogdW5kZWZpbmVkLFxuXG4gIC8vIEEgcGF0aCB0byBhIG1vZHVsZSB3aGljaCBleHBvcnRzIGFuIGFzeW5jIGZ1bmN0aW9uIHRoYXQgaXMgdHJpZ2dlcmVkIG9uY2UgYWZ0ZXIgYWxsIHRlc3Qgc3VpdGVzXG4gIC8vIGdsb2JhbFRlYXJkb3duOiB1bmRlZmluZWQsXG5cbiAgLy8gQSBzZXQgb2YgZ2xvYmFsIHZhcmlhYmxlcyB0aGF0IG5lZWQgdG8gYmUgYXZhaWxhYmxlIGluIGFsbCB0ZXN0IGVudmlyb25tZW50c1xuICAvLyBnbG9iYWxzOiB7fSxcblxuICAvLyBUaGUgbWF4aW11bSBhbW91bnQgb2Ygd29ya2VycyB1c2VkIHRvIHJ1biB5b3VyIHRlc3RzLiBDYW4gYmUgc3BlY2lmaWVkIGFzICUgb3IgYSBudW1iZXIuIEUuZy4gbWF4V29ya2VyczogMTAlIHdpbGwgdXNlIDEwJSBvZiB5b3VyIENQVSBhbW91bnQgKyAxIGFzIHRoZSBtYXhpbXVtIHdvcmtlciBudW1iZXIuIG1heFdvcmtlcnM6IDIgd2lsbCB1c2UgYSBtYXhpbXVtIG9mIDIgd29ya2Vycy5cbiAgLy8gbWF4V29ya2VyczogXCI1MCVcIixcblxuICAvLyBBbiBhcnJheSBvZiBkaXJlY3RvcnkgbmFtZXMgdG8gYmUgc2VhcmNoZWQgcmVjdXJzaXZlbHkgdXAgZnJvbSB0aGUgcmVxdWlyaW5nIG1vZHVsZSdzIGxvY2F0aW9uXG4gIC8vIG1vZHVsZURpcmVjdG9yaWVzOiBbXG4gIC8vICAgXCJub2RlX21vZHVsZXNcIlxuICAvLyBdLFxuXG4gIC8vIEFuIGFycmF5IG9mIGZpbGUgZXh0ZW5zaW9ucyB5b3VyIG1vZHVsZXMgdXNlXG4gIC8vIG1vZHVsZUZpbGVFeHRlbnNpb25zOiBbXG4gIC8vICAgXCJqc1wiLFxuICAvLyAgIFwibWpzXCIsXG4gIC8vICAgXCJjanNcIixcbiAgLy8gICBcImpzeFwiLFxuICAvLyAgIFwidHNcIixcbiAgLy8gICBcInRzeFwiLFxuICAvLyAgIFwianNvblwiLFxuICAvLyAgIFwibm9kZVwiXG4gIC8vIF0sXG5cbiAgLy8gQSBtYXAgZnJvbSByZWd1bGFyIGV4cHJlc3Npb25zIHRvIG1vZHVsZSBuYW1lcyBvciB0byBhcnJheXMgb2YgbW9kdWxlIG5hbWVzIHRoYXQgYWxsb3cgdG8gc3R1YiBvdXQgcmVzb3VyY2VzIHdpdGggYSBzaW5nbGUgbW9kdWxlXG4gIC8vIG1vZHVsZU5hbWVNYXBwZXI6IHt9LFxuXG4gIC8vIEFuIGFycmF5IG9mIHJlZ2V4cCBwYXR0ZXJuIHN0cmluZ3MsIG1hdGNoZWQgYWdhaW5zdCBhbGwgbW9kdWxlIHBhdGhzIGJlZm9yZSBjb25zaWRlcmVkICd2aXNpYmxlJyB0byB0aGUgbW9kdWxlIGxvYWRlclxuICAvLyBtb2R1bGVQYXRoSWdub3JlUGF0dGVybnM6IFtdLFxuXG4gIC8vIEFjdGl2YXRlcyBub3RpZmljYXRpb25zIGZvciB0ZXN0IHJlc3VsdHNcbiAgLy8gbm90aWZ5OiBmYWxzZSxcblxuICAvLyBBbiBlbnVtIHRoYXQgc3BlY2lmaWVzIG5vdGlmaWNhdGlvbiBtb2RlLiBSZXF1aXJlcyB7IG5vdGlmeTogdHJ1ZSB9XG4gIC8vIG5vdGlmeU1vZGU6IFwiZmFpbHVyZS1jaGFuZ2VcIixcblxuICAvLyBBIHByZXNldCB0aGF0IGlzIHVzZWQgYXMgYSBiYXNlIGZvciBKZXN0J3MgY29uZmlndXJhdGlvblxuICAvLyBwcmVzZXQ6IHVuZGVmaW5lZCxcblxuICAvLyBSdW4gdGVzdHMgZnJvbSBvbmUgb3IgbW9yZSBwcm9qZWN0c1xuICAvLyBwcm9qZWN0czogdW5kZWZpbmVkLFxuXG4gIC8vIFVzZSB0aGlzIGNvbmZpZ3VyYXRpb24gb3B0aW9uIHRvIGFkZCBjdXN0b20gcmVwb3J0ZXJzIHRvIEplc3RcbiAgLy8gcmVwb3J0ZXJzOiB1bmRlZmluZWQsXG5cbiAgLy8gQXV0b21hdGljYWxseSByZXNldCBtb2NrIHN0YXRlIGJlZm9yZSBldmVyeSB0ZXN0XG4gIC8vIHJlc2V0TW9ja3M6IGZhbHNlLFxuXG4gIC8vIFJlc2V0IHRoZSBtb2R1bGUgcmVnaXN0cnkgYmVmb3JlIHJ1bm5pbmcgZWFjaCBpbmRpdmlkdWFsIHRlc3RcbiAgLy8gcmVzZXRNb2R1bGVzOiBmYWxzZSxcblxuICAvLyBBIHBhdGggdG8gYSBjdXN0b20gcmVzb2x2ZXJcbiAgLy8gcmVzb2x2ZXI6IHVuZGVmaW5lZCxcblxuICAvLyBBdXRvbWF0aWNhbGx5IHJlc3RvcmUgbW9jayBzdGF0ZSBhbmQgaW1wbGVtZW50YXRpb24gYmVmb3JlIGV2ZXJ5IHRlc3RcbiAgLy8gcmVzdG9yZU1vY2tzOiBmYWxzZSxcblxuICAvLyBUaGUgcm9vdCBkaXJlY3RvcnkgdGhhdCBKZXN0IHNob3VsZCBzY2FuIGZvciB0ZXN0cyBhbmQgbW9kdWxlcyB3aXRoaW5cbiAgLy8gcm9vdERpcjogdW5kZWZpbmVkLFxuXG4gIC8vIEEgbGlzdCBvZiBwYXRocyB0byBkaXJlY3RvcmllcyB0aGF0IEplc3Qgc2hvdWxkIHVzZSB0byBzZWFyY2ggZm9yIGZpbGVzIGluXG4gIHJvb3RzOiBbUGF0aC5kaXJuYW1lKF9fZGlybmFtZSldLFxuXG4gIC8vIEFsbG93cyB5b3UgdG8gdXNlIGEgY3VzdG9tIHJ1bm5lciBpbnN0ZWFkIG9mIEplc3QncyBkZWZhdWx0IHRlc3QgcnVubmVyXG4gIC8vIHJ1bm5lcjogXCJqZXN0LXJ1bm5lclwiLFxuXG4gIC8vIFRoZSBwYXRocyB0byBtb2R1bGVzIHRoYXQgcnVuIHNvbWUgY29kZSB0byBjb25maWd1cmUgb3Igc2V0IHVwIHRoZSB0ZXN0aW5nIGVudmlyb25tZW50IGJlZm9yZSBlYWNoIHRlc3RcbiAgLy8gc2V0dXBGaWxlczogW10sXG5cbiAgLy8gQSBsaXN0IG9mIHBhdGhzIHRvIG1vZHVsZXMgdGhhdCBydW4gc29tZSBjb2RlIHRvIGNvbmZpZ3VyZSBvciBzZXQgdXAgdGhlIHRlc3RpbmcgZnJhbWV3b3JrIGJlZm9yZSBlYWNoIHRlc3RcbiAgLy8gc2V0dXBGaWxlc0FmdGVyRW52OiBbXSxcblxuICAvLyBUaGUgbnVtYmVyIG9mIHNlY29uZHMgYWZ0ZXIgd2hpY2ggYSB0ZXN0IGlzIGNvbnNpZGVyZWQgYXMgc2xvdyBhbmQgcmVwb3J0ZWQgYXMgc3VjaCBpbiB0aGUgcmVzdWx0cy5cbiAgLy8gc2xvd1Rlc3RUaHJlc2hvbGQ6IDUsXG5cbiAgLy8gQSBsaXN0IG9mIHBhdGhzIHRvIHNuYXBzaG90IHNlcmlhbGl6ZXIgbW9kdWxlcyBKZXN0IHNob3VsZCB1c2UgZm9yIHNuYXBzaG90IHRlc3RpbmdcbiAgLy8gc25hcHNob3RTZXJpYWxpemVyczogW10sXG5cbiAgLy8gVGhlIHRlc3QgZW52aXJvbm1lbnQgdGhhdCB3aWxsIGJlIHVzZWQgZm9yIHRlc3RpbmdcbiAgLy8gdGVzdEVudmlyb25tZW50OiBcImplc3QtZW52aXJvbm1lbnQtbm9kZVwiLFxuXG4gIC8vIE9wdGlvbnMgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgdGVzdEVudmlyb25tZW50XG4gIC8vIHRlc3RFbnZpcm9ubWVudE9wdGlvbnM6IHt9LFxuXG4gIC8vIEFkZHMgYSBsb2NhdGlvbiBmaWVsZCB0byB0ZXN0IHJlc3VsdHNcbiAgLy8gdGVzdExvY2F0aW9uSW5SZXN1bHRzOiBmYWxzZSxcblxuICAvLyBUaGUgZ2xvYiBwYXR0ZXJucyBKZXN0IHVzZXMgdG8gZGV0ZWN0IHRlc3QgZmlsZXNcbiAgdGVzdE1hdGNoOiBbXG4gICAgLy8gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vX190ZXN0c19fJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvKiovKi5banRdcz8oeCknXG4gICAgJyoqLz8oKi4pKyhzcGVjfHRlc3QpLlt0al1zPyh4KSdcbiAgXSxcblxuICAvLyBBbiBhcnJheSBvZiByZWdleHAgcGF0dGVybiBzdHJpbmdzIHRoYXQgYXJlIG1hdGNoZWQgYWdhaW5zdCBhbGwgdGVzdCBwYXRocywgbWF0Y2hlZCB0ZXN0cyBhcmUgc2tpcHBlZFxuICAvLyB0ZXN0UGF0aElnbm9yZVBhdHRlcm5zOiBbXG4gIC8vICAgXCIvbm9kZV9tb2R1bGVzL1wiXG4gIC8vIF0sXG5cbiAgLy8gVGhlIHJlZ2V4cCBwYXR0ZXJuIG9yIGFycmF5IG9mIHBhdHRlcm5zIHRoYXQgSmVzdCB1c2VzIHRvIGRldGVjdCB0ZXN0IGZpbGVzXG4gIC8vIHRlc3RSZWdleDogW10sXG5cbiAgLy8gVGhpcyBvcHRpb24gYWxsb3dzIHRoZSB1c2Ugb2YgYSBjdXN0b20gcmVzdWx0cyBwcm9jZXNzb3JcbiAgLy8gdGVzdFJlc3VsdHNQcm9jZXNzb3I6IHVuZGVmaW5lZCxcblxuICAvLyBUaGlzIG9wdGlvbiBhbGxvd3MgdXNlIG9mIGEgY3VzdG9tIHRlc3QgcnVubmVyXG4gIC8vIHRlc3RSdW5uZXI6IFwiamVzdC1jaXJjdXMvcnVubmVyXCIsXG5cbiAgLy8gQSBtYXAgZnJvbSByZWd1bGFyIGV4cHJlc3Npb25zIHRvIHBhdGhzIHRvIHRyYW5zZm9ybWVyc1xuICB0cmFuc2Zvcm1cblxuICAvLyBBbiBhcnJheSBvZiByZWdleHAgcGF0dGVybiBzdHJpbmdzIHRoYXQgYXJlIG1hdGNoZWQgYWdhaW5zdCBhbGwgc291cmNlIGZpbGUgcGF0aHMsIG1hdGNoZWQgZmlsZXMgd2lsbCBza2lwIHRyYW5zZm9ybWF0aW9uXG4gIC8vIHRyYW5zZm9ybUlnbm9yZVBhdHRlcm5zOiBbXG4gIC8vICAgXCIvbm9kZV9tb2R1bGVzL1wiLFxuICAvLyAgIFwiXFxcXC5wbnBcXFxcLlteXFxcXC9dKyRcIlxuICAvLyBdLFxuXG4gIC8vIEFuIGFycmF5IG9mIHJlZ2V4cCBwYXR0ZXJuIHN0cmluZ3MgdGhhdCBhcmUgbWF0Y2hlZCBhZ2FpbnN0IGFsbCBtb2R1bGVzIGJlZm9yZSB0aGUgbW9kdWxlIGxvYWRlciB3aWxsIGF1dG9tYXRpY2FsbHkgcmV0dXJuIGEgbW9jayBmb3IgdGhlbVxuICAvLyB1bm1vY2tlZE1vZHVsZVBhdGhQYXR0ZXJuczogdW5kZWZpbmVkLFxuXG4gIC8vIEluZGljYXRlcyB3aGV0aGVyIGVhY2ggaW5kaXZpZHVhbCB0ZXN0IHNob3VsZCBiZSByZXBvcnRlZCBkdXJpbmcgdGhlIHJ1blxuICAvLyB2ZXJib3NlOiB1bmRlZmluZWQsXG5cbiAgLy8gQW4gYXJyYXkgb2YgcmVnZXhwIHBhdHRlcm5zIHRoYXQgYXJlIG1hdGNoZWQgYWdhaW5zdCBhbGwgc291cmNlIGZpbGUgcGF0aHMgYmVmb3JlIHJlLXJ1bm5pbmcgdGVzdHMgaW4gd2F0Y2ggbW9kZVxuICAvLyB3YXRjaFBhdGhJZ25vcmVQYXR0ZXJuczogW10sXG5cbiAgLy8gV2hldGhlciB0byB1c2Ugd2F0Y2htYW4gZm9yIGZpbGUgY3Jhd2xpbmdcbiAgLy8gd2F0Y2htYW46IHRydWUsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjb25maWc7XG5cbiJdfQ==