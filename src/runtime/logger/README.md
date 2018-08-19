Logger
======

-	In node side, this module is identical to **log4js**
-	In browser side, this module is a supper simple version of window.console's wrapper.

> log4js configuration is not functional for browser side Logger.

This module is only helpful when you have code might be running in both browser and node side, and you may have some logging needs, so that you may have this unified logger interface.

You are free to use log4js directly in node side code.

Please use console.log only in debugging and test code.
