# Google Material web

https://github.com/material-components/material-components-web encapsulated in React.

## Matertial Icon globa css
Import below file at beginning of your app.

```js
import '@material-icons/font/css/outline.css';
```
## Developing Material component

### Theme file must be first `use` clause in sass file

```scss
@use 'theme';
```

### Do not write style file in css module file `module.scss` if...

If Material Js class need to manipulate HTML DOM by css class name.
