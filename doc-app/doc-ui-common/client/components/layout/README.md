## Why we don't use MediaQueryList
To maintain the **single trueth of source** of device layout breakpoint (media queries) in Material sass file, I don't want to separate the definition of layout breakpoints in both sass and TS/JS files.

Therefore, I go with this approach:
- Use Material sass "@material/layout-grid", listerning to window resize event, detect a hidden elements's computed style to predicate which media query rule is taking effect.
- Set state in JS "AppLayout"

## Material Layout Grid
### CSS Classes

CSS Class | Description
--- | ---
`mdc-layout-grid` | Mandatory, for the layout grid element
`mdc-layout-grid__inner` | Mandatory, for wrapping grid cell
`mdc-layout-grid__cell` | Mandatory, for the layout grid cell
`mdc-layout-grid__cell--span-<NUMBER_OF_COLUMNS>` | Optional, specifies the number of columns the cell spans
`mdc-layout-grid__cell--span-<NUMBER_OF_COLUMNS>-<TYPE_OF_DEVICE>` | Optional, specifies the number of columns the cell spans on a type of device (desktop, tablet, phone)
`mdc-layout-grid__cell--order-<INDEX>` | Optional, specifies the order of the cell
`mdc-layout-grid__cell--align-<POSITION>` | Optional, specifies the alignment of cell
`mdc-layout-grid--fixed-column-width` | Optional, specifies the grid should have fixed column width
`mdc-layout-grid--align-<GRID_POSITION>` | Optional, specifies the alignment of the whole grid

#### `mdc-layout-grid__cell--span-<NUMBER_OF_COLUMNS>`

You can set the cells span by applying one of the span classes, of the form `mdc-layout-grid__cell--span-{columns}`, where `{columns}` is an integer between 1 and 12. If the chosen span size is larger than the available number of columns at the current screen size, the cell behaves as if its chosen span size were equal to the available number of columns at that screen size. If the span classes are not set, `mdc-layout-grid__cell` will fallback to a default span size of 4 columns.


#### `mdc-layout-grid__cell--span-<NUMBER_OF_COLUMNS>-<TYPE_OF_DEVICE>`

The same as `mdc-layout-grid__cell--span-<NUMBER_OF_COLUMNS>` but for a specific type of device(`desktop`, `tablet` or `phone`).


#### `mdc-layout-grid__cell--order-<INDEX>`

By default, items are positioned in the source order. However, you can reorder them by using the
`mdc-layout-grid__cell--order-<INDEX>` classes, where `<INDEX>` is an integer between 1 and 12.
Please bear in mind that this may have an impact on accessibility, since screen readers and other tools tend to follow
source order.

#### `mdc-layout-grid__cell--align-<POSITION>`

Items are defined to stretch, by default, taking up the height of their corresponding row. You can switch to a different
behavior by using one of the `mdc-layout-grid__cell--align-<POSITION>` alignment classes, where `<POSITION>` is one of
`top`, `middle` or `bottom`.


#### `mdc-layout-grid--fixed-column-width`

You can designate each column to have a certain width by using `mdc-layout-grid--fixed-column-width` modifier. The column width can be specified through sass map `$mdc-layout-grid-column-width` or css custom properties `--mdc-layout-grid-column-width-{screen_size}`. The column width is set to 72px on all devices by default.


#### `mdc-layout-grid--align-<GRID_POSITION>`

The grid is by default center aligned. You can add `mdc-layout-grid--align-left`
or `mdc-layout-grid--align-right` modifier class to change this behavior. Note, these
modifiers will have no effect when the grid already fills its container.

