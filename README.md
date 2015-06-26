## koco-content-dialog-utilites

Utilities for searching and picking media from content repositories, for use within the `koco` framework

## Installation

```bash
bower install koco-content-dialog-utilites
```

## Usage

### Registration example:

```javascript
koUtilities.registerComponent('koco-content-dialog-search-results-container', {
    htmlOnly: true,
    basePath: 'bower_components/koco-content-dialog-utilities'
});
koUtilities.registerComponent('koco-content-dialog-search-form', {
    htmlOnly: true,
    basePath: 'bower_components/koco-content-dialog-utilities'
});
koUtilities.registerComponent('koco-content-dialog-edit-form', {
    htmlOnly: true,
    basePath: 'bower_components/koco-content-dialog-utilities'
});
```

### LESS import:

`@import "../bower_components/koco-content-dialog-utilities/koco-content-dialog-utilities.less";`

### Require example:

```javascript
paths: {
	'content-dialog-base-viewmodel': 'bower_components/koco-content-dialog-utilities/content-dialog-base-viewmodel',
	'content-dialog-search-base-viewmodel': 'bower_components/koco-content-dialog-utilities/content-dialog-search-base-viewmodel',
}
```
