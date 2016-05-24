import $ from 'jquery';
import ko from 'knockout';
import toastr from 'toastr';
import _ from 'lodash';
import koValidationUtilities from 'validation-utilities';
import koMappingUtilities from 'mapping-utilities';
import KoDisposer from 'disposer';
import i18n from 'i18next';


var ContentDialogViewModel = function(params) {
    var self = this;

    self.selectedInList = ko.observable();
    self.mappingOptions = params.mappingOptions;
    self.dialogTitle = params.dialogTitle;
    self.originalItem = params.originalItem;
    self.searchOnDisplay = self.getSearchOnDisplay();
    self.defaultItem = params.defaultItem;
    self.close = params.close;

    //HACK: Il faudrait probablement créer un objet de base et un SearchableContentViewModel, à investiguer.
    self.isSearchable = params.isSearchable;

    //TODO: Investiguer pourquoi ca prend un "defaultItem" pour que les règles de validation s'appliquent
    self.selectedItem = ko.validatedObservable(self.buildModel(params.defaultItem));

    self.selectedItem.extend({
        bootstrapValidation: {}
    });

    self.koDisposer = new KoDisposer();
    self.koDisposer.add(self.selectedInList.subscribe(self.selectedInListChanged.bind(self)));

    self.validatedObservables = [self.selectedItem];

    self.originalItemSelected = ko.pureComputed(function() {
        return self.getOriginalItemSelected();
    });
    self.koDisposer.add(self.originalItemSelected);

    self.undoSelectionVisible = ko.pureComputed(function() {
        return self.getUndoSelectionVisible();
    });
    self.koDisposer.add(self.undoSelectionVisible);

    self.hasSelectedItem = ko.pureComputed(function() {
        return self.getHasSelectedItem();
    });
    self.koDisposer.add(self.hasSelectedItem);
};

ContentDialogViewModel.prototype.getUndoSelectionVisible = function() {
    var self = this;

    return ko.unwrap(self.originalItem) && !self.originalItemSelected();
};

ContentDialogViewModel.prototype.getHasSelectedItem = function() {
    var self = this;

    var selectedItem = koMappingUtilities.toJS(self.selectedItem);

    return !!(selectedItem && selectedItem.id);
};

ContentDialogViewModel.prototype.getOriginalItemSelected = function() {
    var self = this;

    var originalItem = koMappingUtilities.toJS(self.originalItem);

    return !!(originalItem && self.isSame(originalItem));
};

ContentDialogViewModel.prototype.selectedInListChanged = function(selectedInfo) {
    var self = this;

    if (selectedInfo && selectedInfo.item) {
        if (!self.isSame(selectedInfo.item)) {
            self.selectItem(selectedInfo.item);
        }

        if (selectedInfo.event.type === 'dblclick') {
            self.save();
        }
    }
};

ContentDialogViewModel.prototype.getSearchOnDisplay = function() {
    var self = this;

    return !ko.unwrap(self.originalItem);
};

ContentDialogViewModel.prototype.isSame = function(item) {
    var self = this;

    var selectedItem = koMappingUtilities.toJS(self.selectedItem);

    return selectedItem && item && selectedItem.id === item.id;
};

ContentDialogViewModel.prototype.isOriginalItem = function(item) {
    var self = this;

    var originalItem = koMappingUtilities.toJS(self.originalItem);

    return originalItem && item && originalItem.id === item.id;
};

ContentDialogViewModel.prototype.undoSelection = function() {
    var self = this;

    if (ko.unwrap(self.originalItem)) {
        self.selectItem(ko.unwrap(self.originalItem));
    }
};

ContentDialogViewModel.prototype.activate = function() {
    var self = this;

    if (self.loadLookups) {
        return self.loadLookups().then(function() {
            return self.start();
        });
    } else {
        return self.start();
    }
};

ContentDialogViewModel.prototype.start = function() {
    var self = this;

    self.selectItem(ko.unwrap(self.originalItem));

    return $.Deferred().resolve().promise();
};

ContentDialogViewModel.prototype.prepareScreenForValidationErrors = function(dfd) {
    var self = this;

    toastr.error(i18n.t('koco-content-dialog-utilities.content-dialog-edit-form.form-error'));

    $('html, body').animate({
        scrollTop: 0
    }, 'slow', function() {
        dfd.resolve();
    });
};

ContentDialogViewModel.prototype.selectItem = function(inputModel) {
    var self = this;

    var model = self.buildModel(inputModel);

    self.selectedItem(model);
};

ContentDialogViewModel.prototype.buildModel = function(inputModel) {
    var self = this;

    var item = self.fromInputModel(inputModel);

    if (item) {
        self.addValidationToModel(item);
    }

    return item;
};

ContentDialogViewModel.prototype.fromInputModel = function(inputModel) {
    var self = this;

    if (inputModel) {
        if (self.mappingOptions) {
            return ko.mapping.fromJS(inputModel, self.mappingOptions);
        }

        return ko.mapping.fromJS(inputModel);
    }

    return null;
};

ContentDialogViewModel.prototype.addValidationToModel = function( /*model*/ ) {
    //var self = this;
};

ContentDialogViewModel.prototype.save = function() {
    var self = this;

    var promise = new $.Deferred(function(dfd) {
        try {
            //self.serverSideValidationErrors([]);

            var validateError = self.validate();

            if (validateError) {
                toastr.error(validateError);

                $('html, body').animate({
                    scrollTop: 0
                }, 'slow', function() {
                    dfd.resolve();
                });
            } else {
                koValidationUtilities.validateObservables(self.validatedObservables)
                    .then(function(isValid) {
                        if (isValid) {
                            var writeModel = self.toOutputModel();
                            dfd.resolve();
                            self.close(writeModel);
                        } else {
                            self.prepareScreenForValidationErrors(dfd);
                        }
                    }).fail(function() {
                        dfd.reject.apply(this, arguments);
                    });
            }
        } catch (error) {
            dfd.reject(error);
        }
    }).promise();

    promise.fail(function( /*error*/ ) {
        //TODOX: logger error
        //TODO: Appeler un fail global à l'app pour streamliner le tout
        self.handleUnknownError();
    });

    return promise;
};

ContentDialogViewModel.prototype.validate = function(dfd) {
    var self = this;

    //HACK: Il faudrait probablement créer un objet de base et un SearchableContentViewModel, à investiguer.
    if (self.isSearchable && self.hasSelectedItem() === false) {
        return i18n.t('koco-content-dialog-utilities.content-dialog-edit-form.no-item-selected');
    }
};

ContentDialogViewModel.prototype.handleUnknownError = function( /*error*/ ) {
    //todo: scoop api devrait retourner un 400 pour erreurs de validations mais il retourne un 500...
    //toto: log erreur!?
    //toastr.error(jqXhr.responseText);
    toastr.error(i18n.t('koco-content-dialog-utilities.content-dialog-edit-form.unknown-error'));
};

ContentDialogViewModel.prototype.toOutputModel = function() {
    var self = this;

    var outputModel = koMappingUtilities.toJS(self.selectedItem);

    self.cleanOutputModel(outputModel);

    return outputModel;
};

ContentDialogViewModel.prototype.cleanOutputModel = function( /*outputModel*/ ) {
    //var self = this;

    //CLeanup added properties
};

ContentDialogViewModel.prototype.cancel = function() {
    var self = this;

    self.close();
};

ContentDialogViewModel.prototype.dispose = function() {
    var self = this;

    self.koDisposer.dispose();
};

export default ContentDialogViewModel;
