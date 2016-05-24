'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _toastr = require('toastr');

var _toastr2 = _interopRequireDefault(_toastr);

var _objectUtilities = require('object-utilities');

var _objectUtilities2 = _interopRequireDefault(_objectUtilities);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mappingUtilities = require('mapping-utilities');

var _mappingUtilities2 = _interopRequireDefault(_mappingUtilities);

var _disposer = require('disposer');

var _disposer2 = _interopRequireDefault(_disposer);

var _i18next = require('i18next');

var _i18next2 = _interopRequireDefault(_i18next);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//TODO: mixin avec content-list-page-viewmodel

var defaultPagingFields = {
    pageNumber: null,
    pageSize: null
};

var ContentDialogSearchViewModelExtender = function ContentDialogSearchViewModelExtender(params) {
    var self = this;

    self.koDisposer = new _disposer2.default();
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
    self.searchQuery = null;
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
    var promisesStep1 = [];

    var promise = _jquery2.default.when.apply(_jquery2.default, promisesStep1).then(function () {
        if (self.loadLookups) {
            return self.loadLookups().then(function () {
                return self.start();
            });
        } else {
            return self.start();
        }
    });

    return promise;
};

ContentDialogSearchViewModelExtender.prototype.loadLookups = function () {
    //var self = this;

    return _jquery2.default.Deferred().resolve().promise();
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

    if (self.searchQuery) {
        self.searchQuery.abort();
    }

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

    self.searchArguments = _jquery2.default.extend({}, self.searchArguments, _objectUtilities2.default.pickNonFalsy(_mappingUtilities2.default.toJS(defaultPagingArguments)));
};

ContentDialogSearchViewModelExtender.prototype.search = function () {
    var self = this;
    self.isSearchInProgress(true);
    self.searchCanceled = false;

    self.searchQuery = self.api.getJson(_knockout2.default.unwrap(self.apiResourceName), {
        data: _jquery2.default.param(self.searchArguments, false)
    }).done(function (pagedListOfItems) {
        self.hasSearched(true);
        self.bindSearchResults(pagedListOfItems);
    }).fail(function (jqXhr, textStatus, errorThrown) {
        //if (errorThrown) {
        if (errorThrown !== 'abort') {
            //toastr.error(errorThrown);
            _toastr2.default.error(_i18next2.default.t('koco-content-dialog-utilities.content-dialog-edit-form.unknown-error'));
        }
        //}
    }).always(function () {
        self.isSearchInProgress(false);

        if (!self.isPaging()) {
            if (self.$searchResultsElement && self.$searchResultsElement.length > 0) {
                self.$searchResultsElement.scrollTop(0);
            }
        }

        self.isPaging(false);
    });

    return self.searchQuery;
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

    var searchFields = _mappingUtilities2.default.toJS(self.searchFields);
    self.lastSearchSnapshot.searchFields = searchFields;
    self.pagingFields.pageNumber(null);
    self.itemsDispose();
    self.hasSearched(false);

    self.searchArguments = self.getSearchArgumentsFromFields();
    self.updateSearchArgumentsWithPagingFields();

    return self.search();
};

ContentDialogSearchViewModelExtender.prototype.getSearchArgumentsFromFields = function () {
    var searchFields = _mappingUtilities2.default.toJS(this.searchFields);
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