//TODO: mixin avec content-list-page-viewmodel

define([
        'knockout',
        'jquery',
        'toastr',
        'object-utilities',
        'lodash',
        'mapping-utilities',
        'disposer',
        'i18next'
    ],
    function(ko, $, toastr, objectUtilities, _, koMappingUtilities, KoDisposer, i18n) {
        'use strict';

        var defaultPagingFields = {
            pageNumber: null,
            pageSize: null
        };

        var ContentDialogSearchViewModelExtender = function(params) {
            var self = this;

            self.koDisposer = new KoDisposer();
            self.selectedInList = ko.observable();
            self.items = ko.observableArray();
            self.apiResourceName = params.apiResourceName;
            self.searchArguments = null;
            self.searchOnDisplay = params.searchOnDisplay;
            self.selected = params.selected;
            self.hasSearched = ko.observable(false);
            self.isSame = params.isSame;
            self.isOriginalItem = params.isOriginalItem;
            self.lastSearchSnapshot = params.lastSearchSnapshot;
            self.searchArgumentsFields = Object.keys(params.defaultSearchFields).concat(Object.keys(defaultPagingFields));
            self.searchFields = ko.mapping.fromJS(params.defaultSearchFields);
            self.isSearchInProgress = ko.observable(self.searchOnDisplay);
            self.searchQuery = null;
            self.searchCanceled = false;
            self.api = params.api;

            //#region Paging
            self.pagingFields = ko.mapping.fromJS(defaultPagingFields);
            self.remainingItemsToLoad = ko.observable(false);
            self.pagingDisabled = ko.pureComputed(function() {
                return !self.remainingItemsToLoad() || self.isSearchInProgress();
            });
            self.koDisposer.add(self.pagingDisabled);

            self.isPaging = ko.observable(false);
        };

        ContentDialogSearchViewModelExtender.prototype.activate = function() {
            var self = this;
            var promisesStep1 = [];

            var promise = $.when.apply($, promisesStep1).then(function() {
                if (self.loadLookups) {
                    return self.loadLookups().then(function() {
                        return self.start();
                    });
                } else {
                    return self.start();
                }
            });

            return promise;
        };

        ContentDialogSearchViewModelExtender.prototype.loadLookups = function() {
            //var self = this;

            return $.Deferred().resolve().promise();
        };

        ContentDialogSearchViewModelExtender.prototype.start = function() {
            var self = this;

            self.correctLastSearchSnapshot(self.lastSearchSnapshot);
            self.updateSearchFieldsFromLastSearchSnapshot();

            if (self.searchOnDisplay) {
                self.searchForItems();
            }
        };

        ContentDialogSearchViewModelExtender.prototype.cancelSearch = function() {
            var self = this;

            if (self.searchQuery) {
                self.searchQuery.abort();
            }

            self.searchCanceled = true;
            self.isSearchInProgress(false);
        };

        ContentDialogSearchViewModelExtender.prototype.updateSearchArgumentsWithPagingFields = function() {
            var self = this;

			/* ADDED TO MAP FROM THE OLD FIELD TO THE NEW FIELD WHILE TRYING TO KEEP THE OBSERVER ON THE OLD OBJECT */
			var pagingAttr = {
				pageNumber: 'page',
				pageSize: 'pageSize'
			};

			// Added safety check just in case
			if(typeof self.settings === "undefined") { 
				self.settings = {};
			}
			if(typeof defaultPagingArguments === "undefined") { 
				var defaultPagingArguments = {};
			}
			
			self.settings.defaultPagingAttr = $.extend({}, pagingAttr);

			_.each(self.settings.defaultPagingAttr, function(key, value) {
				defaultPagingArguments[key] = self.pagingFields[value];
			});
			
            self.searchArguments = $.extend({}, self.searchArguments,
                objectUtilities.pickNonFalsy(koMappingUtilities.toJS(defaultPagingArguments)));
        };

        ContentDialogSearchViewModelExtender.prototype.search = function() {
            var self = this;
            self.isSearchInProgress(true);
            self.searchCanceled = false;

            self.searchQuery = self.api
                .getJson(ko.unwrap(self.apiResourceName) , {
                    data: $.param(self.searchArguments, false)
                })
                .done(function(pagedListOfItems) {
                        self.hasSearched(true);
                        self.bindSearchResults(pagedListOfItems);
                })
                .fail(function(jqXhr, textStatus, errorThrown) {
                    //if (errorThrown) {
                        if (errorThrown !== 'abort') {
                            //toastr.error(errorThrown);
                            toastr.error(i18n.t('koco-content-dialog-utilities.content-dialog-edit-form.unknown-error'));
                        }
                    //}
                })
                .always(function() {
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

        ContentDialogSearchViewModelExtender.prototype.bindSearchResults = function(pagedListOfItems) {
            var self = this;

            if (!self.searchCanceled) {
                pagedListOfItems.items = _.compact(pagedListOfItems.items);

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

        ContentDialogSearchViewModelExtender.prototype.goToNextPage = function() {
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

        ContentDialogSearchViewModelExtender.prototype.searchForItems = function() {
            var self = this;

            var searchFields = koMappingUtilities.toJS(self.searchFields);
            self.lastSearchSnapshot.searchFields = searchFields;
            self.pagingFields.pageNumber(null);
            self.itemsDispose();
            self.hasSearched(false);

            self.searchArguments = self.getSearchArgumentsFromFields();
            self.updateSearchArgumentsWithPagingFields();

            return self.search();
        };

        ContentDialogSearchViewModelExtender.prototype.getSearchArgumentsFromFields = function() {
            var searchFields = koMappingUtilities.toJS(this.searchFields);
            var searchArguments = _.pick(searchFields, this.searchArgumentsFields);

            return searchArguments;
        };

        ContentDialogSearchViewModelExtender.prototype.updateSearchFieldsFromLastSearchSnapshot = function() {
            var self = this;

            if (self.lastSearchSnapshot.searchFields) {
                ko.mapping.fromJS(self.lastSearchSnapshot.searchFields, {}, self.searchFields);
            }
        };

        ContentDialogSearchViewModelExtender.prototype.addPropertiesToItem = function(item) {
            var self = this;

            if (item) {
                item.isSelected = ko.pureComputed(function() {
                    return self.isSame(item);
                });
            }

            return item;
        };

        ContentDialogSearchViewModelExtender.prototype.addPropertiesToItems = function(data) {
            var self = this;

            var mappedData = ko.utils.arrayMap(data, function(item) {
                return self.addPropertiesToItem(item);
            });

            return mappedData;
        };

        ContentDialogSearchViewModelExtender.prototype.selectItem = function(item, event) {
            var self = this;

            self.selected({
                item: self.cleanUpItem(item),
                event: event
            });
        };

        ContentDialogSearchViewModelExtender.prototype.cleanUpItem = function(item) {
            //var self = this;
            var result = _.cloneDeep(item);

            //remove added properties
            delete result.isSelected;

            return result;
        };

        ContentDialogSearchViewModelExtender.prototype.dispose = function() {
            var self = this;

            self.pagingDisabled.dispose();
            self.itemsDispose();
            self.koDisposer.dispose();
        };

        ContentDialogSearchViewModelExtender.prototype.itemsDispose = function() {
            var self = this;

            var items = self.items();

            _(items).forEach(function(item) {
                self.itemDispose(item);
            });

            self.items([]);
        };

        ContentDialogSearchViewModelExtender.prototype.itemDispose = function(item) {
            //var self = this;

            item.isSelected.dispose();
        };

        ContentDialogSearchViewModelExtender.prototype.updateViewModelPagingFields = function(pagedListOfIndexedDocuments) {
            var self = this;

            self.pagingFields.pageNumber(pagedListOfIndexedDocuments.pageNumber);
            self.pagingFields.pageSize(pagedListOfIndexedDocuments.pageSize);
        };

        ContentDialogSearchViewModelExtender.prototype.correctLastSearchSnapshot = function(lastSearchSnapshot) {
            //var self = this;


            return lastSearchSnapshot;
        };

        return ContentDialogSearchViewModelExtender;
    });
