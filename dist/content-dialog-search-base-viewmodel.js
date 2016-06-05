(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', 'jquery', 'toastr', 'koco-object-utilities', 'lodash', 'koco-mapping-utilities', 'koco-disposer', 'i18next', 'koco-url-utilities'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('jquery'), require('toastr'), require('koco-object-utilities'), require('lodash'), require('koco-mapping-utilities'), require('koco-disposer'), require('i18next'), require('koco-url-utilities'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.jquery, global.toastr, global.kocoObjectUtilities, global.lodash, global.kocoMappingUtilities, global.kocoDisposer, global.i18next, global.kocoUrlUtilities);
    global.contentDialogSearchBaseViewmodel = mod.exports;
  }
})(this, function (exports, _knockout, _jquery, _toastr, _kocoObjectUtilities, _lodash, _kocoMappingUtilities, _kocoDisposer, _i18next, _kocoUrlUtilities) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _knockout2 = _interopRequireDefault(_knockout);

  var _jquery2 = _interopRequireDefault(_jquery);

  var _toastr2 = _interopRequireDefault(_toastr);

  var _kocoObjectUtilities2 = _interopRequireDefault(_kocoObjectUtilities);

  var _lodash2 = _interopRequireDefault(_lodash);

  var _kocoMappingUtilities2 = _interopRequireDefault(_kocoMappingUtilities);

  var _kocoDisposer2 = _interopRequireDefault(_kocoDisposer);

  var _i18next2 = _interopRequireDefault(_i18next);

  var _kocoUrlUtilities2 = _interopRequireDefault(_kocoUrlUtilities);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var defaultPagingFields = {
    pageNumber: null,
    pageSize: null
  }; //TODO: mixin avec content-list-page-viewmodel

  var ContentDialogSearchViewModelExtender = function ContentDialogSearchViewModelExtender(params) {
    var self = this;

    self.koDisposer = new _kocoDisposer2.default();
    self.selectedInList = _knockout2.default.observable();
    self.items = _knockout2.default.observableArray();
    self.apiResourceName = params.apiResourceName;
    self.searchArguments = null;
    self.searchOnDisplay = params.searchOnDisplay;
    self.selected = params.selected;
    self.hasSearched = _knockout2.default.observable(false);
    self.isSame = params.isSame;
    self.isOriginalItem = params.isOriginalItem;
    self.lastSearchSnapshot = params.lastSearchSnapshot;
    self.searchArgumentsFields = Object.keys(params.defaultSearchFields).concat(Object.keys(defaultPagingFields));
    self.searchFields = _knockout2.default.mapping.fromJS(params.defaultSearchFields);
    self.isSearchInProgress = _knockout2.default.observable(self.searchOnDisplay);
    self.searchCanceled = false;
    self.api = params.api;

    //#region Paging
    self.pagingFields = _knockout2.default.mapping.fromJS(defaultPagingFields);
    self.remainingItemsToLoad = _knockout2.default.observable(false);
    self.pagingDisabled = _knockout2.default.pureComputed(function () {
      return !self.remainingItemsToLoad() || self.isSearchInProgress();
    });
    self.koDisposer.add(self.pagingDisabled);

    self.isPaging = _knockout2.default.observable(false);
  };

  ContentDialogSearchViewModelExtender.prototype.activate = function () {
    var self = this;

    if (self.loadLookups) {
      return self.loadLookups().then(function () {
        return self.start();
      });
    }

    return self.start();
  };

  ContentDialogSearchViewModelExtender.prototype.loadLookups = function () {
    //var self = this;

    return Promise.resolve();
  };

  ContentDialogSearchViewModelExtender.prototype.start = function () {
    var self = this;

    self.correctLastSearchSnapshot(self.lastSearchSnapshot);
    self.updateSearchFieldsFromLastSearchSnapshot();

    if (self.searchOnDisplay) {
      self.searchForItems();
    }
  };

  ContentDialogSearchViewModelExtender.prototype.cancelSearch = function () {
    var self = this;

    self.searchCanceled = true;
    self.isSearchInProgress(false);
  };

  ContentDialogSearchViewModelExtender.prototype.updateSearchArgumentsWithPagingFields = function () {
    var self = this;

    /* ADDED TO MAP FROM THE OLD FIELD TO THE NEW FIELD WHILE TRYING TO KEEP THE OBSERVER ON THE OLD OBJECT */
    var pagingAttr = {
      pageNumber: 'page',
      pageSize: 'pageSize'
    };

    // Added safety check just in case
    if (typeof self.settings === "undefined") {
      self.settings = {};
    }
    if (typeof defaultPagingArguments === "undefined") {
      var defaultPagingArguments = {};
    }

    self.settings.defaultPagingAttr = _jquery2.default.extend({}, pagingAttr);

    _lodash2.default.each(self.settings.defaultPagingAttr, function (key, value) {
      defaultPagingArguments[key] = self.pagingFields[value];
    });

    self.searchArguments = _jquery2.default.extend({}, self.searchArguments, _kocoObjectUtilities2.default.pickNonFalsy(_kocoMappingUtilities2.default.toJS(defaultPagingArguments)));
  };

  ContentDialogSearchViewModelExtender.prototype.search = function () {
    var self = this;
    self.isSearchInProgress(true);
    self.searchCanceled = false;

    return self.api.fetch(_kocoUrlUtilities2.default.appendParams(_knockout2.default.unwrap(self.apiResourceName), self.searchArguments)).then(function (pagedListOfItems) {
      self.hasSearched(true);
      self.bindSearchResults(pagedListOfItems);
    }).catch(function (error) {
      _toastr2.default.error(_i18next2.default.t('koco-content-dialog-utilities.content-dialog-edit-form.unknown-error'));
    }).then(function () {
      // this acts like always since there is a catch before it
      self.isSearchInProgress(false);

      if (!self.isPaging()) {
        if (self.$searchResultsElement && self.$searchResultsElement.length > 0) {
          self.$searchResultsElement.scrollTop(0);
        }
      }

      self.isPaging(false);
    });
  };

  ContentDialogSearchViewModelExtender.prototype.bindSearchResults = function (pagedListOfItems) {
    var self = this;

    if (!self.searchCanceled) {
      pagedListOfItems.items = _lodash2.default.compact(pagedListOfItems.items);

      self.searchCanceled = false;

      var mappedData = self.addPropertiesToItems(pagedListOfItems.items);
      var items = mappedData;

      if (self.isPaging()) {
        items = self.items();

        for (var i = 0; i < mappedData.length; i++) {
          items.push(mappedData[i]);
        }
      }

      self.items(items);
      self.remainingItemsToLoad(self.items().length < pagedListOfItems.totalNumberOfItems);
      self.updateViewModelPagingFields(pagedListOfItems);
    }
  };

  ContentDialogSearchViewModelExtender.prototype.goToNextPage = function () {
    var self = this;

    // Set the next page number
    var nextPageNumber = (defaultPagingFields.pageNumber || 1) + 1;

    self.pagingFields.pageNumber(nextPageNumber);
    self.isPaging(true);
    self.updateSearchArgumentsWithPagingFields();

    // Update page number in the default paging object as there is something that block updating directing in the pagingField object.
    defaultPagingFields.pageNumber = nextPageNumber;

    return self.search();
  };

  ContentDialogSearchViewModelExtender.prototype.searchForItems = function () {
    var self = this;

    var searchFields = _kocoMappingUtilities2.default.toJS(self.searchFields);
    self.lastSearchSnapshot.searchFields = searchFields;
    self.pagingFields.pageNumber(null);
    self.itemsDispose();
    self.hasSearched(false);

    self.searchArguments = self.getSearchArgumentsFromFields();
    self.updateSearchArgumentsWithPagingFields();

    return self.search();
  };

  ContentDialogSearchViewModelExtender.prototype.getSearchArgumentsFromFields = function () {
    var searchFields = _kocoMappingUtilities2.default.toJS(this.searchFields);
    var searchArguments = _lodash2.default.pick(searchFields, this.searchArgumentsFields);

    return searchArguments;
  };

  ContentDialogSearchViewModelExtender.prototype.updateSearchFieldsFromLastSearchSnapshot = function () {
    var self = this;

    if (self.lastSearchSnapshot.searchFields) {
      _knockout2.default.mapping.fromJS(self.lastSearchSnapshot.searchFields, {}, self.searchFields);
    }
  };

  ContentDialogSearchViewModelExtender.prototype.addPropertiesToItem = function (item) {
    var self = this;

    if (item) {
      item.isSelected = _knockout2.default.pureComputed(function () {
        return self.isSame(item);
      });
    }

    return item;
  };

  ContentDialogSearchViewModelExtender.prototype.addPropertiesToItems = function (data) {
    var self = this;

    var mappedData = _knockout2.default.utils.arrayMap(data, function (item) {
      return self.addPropertiesToItem(item);
    });

    return mappedData;
  };

  ContentDialogSearchViewModelExtender.prototype.selectItem = function (item, event) {
    var self = this;

    self.selected({
      item: self.cleanUpItem(item),
      event: event
    });
  };

  ContentDialogSearchViewModelExtender.prototype.cleanUpItem = function (item) {
    //var self = this;
    var result = _lodash2.default.cloneDeep(item);

    //remove added properties
    delete result.isSelected;

    return result;
  };

  ContentDialogSearchViewModelExtender.prototype.dispose = function () {
    var self = this;

    self.pagingDisabled.dispose();
    self.itemsDispose();
    self.koDisposer.dispose();
  };

  ContentDialogSearchViewModelExtender.prototype.itemsDispose = function () {
    var self = this;

    var items = self.items();

    (0, _lodash2.default)(items).forEach(function (item) {
      self.itemDispose(item);
    });

    self.items([]);
  };

  ContentDialogSearchViewModelExtender.prototype.itemDispose = function (item) {
    //var self = this;

    item.isSelected.dispose();
  };

  ContentDialogSearchViewModelExtender.prototype.updateViewModelPagingFields = function (pagedListOfIndexedDocuments) {
    var self = this;

    self.pagingFields.pageNumber(pagedListOfIndexedDocuments.pageNumber);
    self.pagingFields.pageSize(pagedListOfIndexedDocuments.pageSize);
  };

  ContentDialogSearchViewModelExtender.prototype.correctLastSearchSnapshot = function (lastSearchSnapshot) {
    //var self = this;

    return lastSearchSnapshot;
  };

  exports.default = ContentDialogSearchViewModelExtender;
});