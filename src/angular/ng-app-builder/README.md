# Angular App builder

## Purpose
- Encapuslate build logic into a centralized node package, so that can be shared between difference projects, and can be upgraded by npm tool. 

- Also avoid being changed from project to project which eventually will lead to too diversified to share resuable components. So all projects can always share same best-practise build script.

- Expand webpack config file to support 3rd-party webpack features that angular cli does not provide.

- Enable Angular 5 project to be built with legacy AngularJS project (which is compiled by different webpack loaders and plugins)
