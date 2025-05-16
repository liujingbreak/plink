# Google's material-components-web encapsulated in React and RxJS

https://material-components.github.io/material-components-web-catalog/#/

This library is work-in-progress, it is used by **Plink** (a monorepo management tool) internally, not all the components are available yet.

### layout Grid

```html
<div class="mdc-layout-grid">
  <div class="mdc-layout-grid__inner">
    <div class="mdc-layout-grid__cell"></div>
    <div class="mdc-layout-grid__cell"></div>
    <div class="mdc-layout-grid__cell"></div>
  </div>
</div>
```

#### Nested grid
To nest layout grid, add a new `mdc-layout-grid__inner` to wrap around nested `mdc-layout-grid__cell` within an existing mdc-layout-grid__cell
```html
<div class="mdc-layout-grid">
  <div class="mdc-layout-grid__inner">
    <div class="mdc-layout-grid__cell">
      <div class="mdc-layout-grid__inner">
        <div class="mdc-layout-grid__cell"><span>Second level</span></div>
        <div class="mdc-layout-grid__cell"><span>Second level</span></div>
      </div>
    </div>
    <div class="mdc-layout-grid__cell">First level</div>
    <div class="mdc-layout-grid__cell">First level</div>
  </div>
</div>
```
