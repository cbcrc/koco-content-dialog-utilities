'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _knockout = require('knockout');

var _knockout2 = _interopRequireDefault(_knockout);

var _toastr = require('toastr');

var _toastr2 = _interopRequireDefault(_toastr);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _validationUtilities = require('validation-utilities');

var _validationUtilities2 = _interopRequireDefault(_validationUtilities);

var _mappingUtilities = require('mapping-utilities');

var _mappingUtilities2 = _interopRequireDefault(_mappingUtilities);

var _disposer = require('disposer');

var _disposer2 = _interopRequireDefault(_disposer);

var _i18next = require('i18next');

var _i18next2 = _interopRequireDefault(_i18next);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ContentDialogViewModel = function ContentDialogViewModel(params) {
    var self = this;

    self.selectedInList = _knockout2.default.observable();
    self.mappingOptions = params.mappingOptions;
    self.dialogTitle = params.dialogTitle;
    self.originalItem = params.originalItem;
    self.searchOnDisplay = self.getSearchOnDisplay();
    self.defaultItem = params.defaultItem;
    self.close = params.close;

    //HACK: Il faudrait probablement créer un objet de base et un SearchableContentViewModel, à investiguer.
    self.isSearchable = params.isSearchable;

    //TODO: Investiguer pourquoi ca prend un "defaultItem" pour que les règles de validation s'appliquent
    self.selectedItem = _knockout2.default.validatedObservable(self.buildModel(params.defaultItem));

    self.selectedItem.extend({
        bootstrapValidation: {}
    });

    self.koDisposer = new _disposer2.default();
    self.koDisposer.add(self.selectedInList.subscribe(self.selectedInListChanged.bind(self)));

    self.validatedObservables = [self.selectedItem];

    self.originalItemSelected = _knockout2.default.pureComputed(function () {
        return self.getOriginalItemSelected();
    });
    self.koDisposer.add(self.originalItemSelected);

    self.undoSelectionVisible = _knockout2.default.pureComputed(function () {
        return self.getUndoSelectionVisible();
    });
    self.koDisposer.add(self.undoSelectionVisible);

    self.hasSelectedItem = _knockout2.default.pureComputed(function () {
        return self.getHasSelectedItem();
    });
    self.koDisposer.add(self.hasSelectedItem);
};

ContentDialogViewModel.prototype.getUndoSelectionVisible = function () {
    var self = this;

    return _knockout2.default.unwrap(self.originalItem) && !self.originalItemSelected();
};

ContentDialogViewModel.prototype.getHasSelectedItem = function () {
    var self = this;

    var selectedItem = _mappingUtilities2.default.toJS(self.selectedItem);

    return !!(selectedItem && selectedItem.id);
};

ContentDialogViewModel.prototype.getOriginalItemSelected = function () {
    var self = this;

    var originalItem = _mappingUtilities2.default.toJS(self.originalItem);

    return !!(originalItem && self.isSame(originalItem));
};

ContentDialogViewModel.prototype.selectedInListChanged = function (selectedInfo) {
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

ContentDialogViewModel.prototype.getSearchOnDisplay = function () {
    var self = this;

    return !_knockout2.default.unwrap(self.originalItem);
};

ContentDialogViewModel.prototype.isSame = function (item) {
    var self = this;

    var selectedItem = _mappingUtilities2.default.toJS(self.selectedItem);

    return selectedItem && item && selectedItem.id === item.id;
};

ContentDialogViewModel.prototype.isOriginalItem = function (item) {
    var self = this;

    var originalItem = _mappingUtilities2.default.toJS(self.originalItem);

    return originalItem && item && originalItem.id === item.id;
};

ContentDialogViewModel.prototype.undoSelection = function () {
    var self = this;

    if (_knockout2.default.unwrap(self.originalItem)) {
        self.selectItem(_knockout2.default.unwrap(self.originalItem));
    }
};

ContentDialogViewModel.prototype.activate = function () {
    var self = this;

    if (self.loadLookups) {
        return self.loadLookups().then(function () {
            return self.start();
        });
    } else {
        return self.start();
    }
};

ContentDialogViewModel.prototype.start = function () {
    var self = this;

    self.selectItem(_knockout2.default.unwrap(self.originalItem));

    return _jquery2.default.Deferred().resolve().promise();
};

ContentDialogViewModel.prototype.prepareScreenForValidationErrors = function (dfd) {
    var self = this;

    _toastr2.default.error(_i18next2.default.t('koco-content-dialog-utilities.content-dialog-edit-form.form-error'));

    (0, _jquery2.default)('html, body').animate({
        scrollTop: 0
    }, 'slow', function () {
        dfd.resolve();
    });
};

ContentDialogViewModel.prototype.selectItem = function (inputModel) {
    var self = this;

    var model = self.buildModel(inputModel);

    self.selectedItem(model);
};

ContentDialogViewModel.prototype.buildModel = function (inputModel) {
    var self = this;

    var item = self.fromInputModel(inputModel);

    if (item) {
        self.addValidationToModel(item);
    }

    return item;
};

ContentDialogViewModel.prototype.fromInputModel = function (inputModel) {
    var self = this;

    if (inputModel) {
        if (self.mappingOptions) {
            return _knockout2.default.mapping.fromJS(inputModel, self.mappingOptions);
        }

        return _knockout2.default.mapping.fromJS(inputModel);
    }

    return null;
};

ContentDialogViewModel.prototype.addValidationToModel = function () /*model*/{
    //var self = this;
};

ContentDialogViewModel.prototype.save = function () {
    var self = this;

    var promise = new _jquery2.default.Deferred(function (dfd) {
        try {
            //self.serverSideValidationErrors([]);

            var validateError = self.validate();

            if (validateError) {
                _toastr2.default.error(validateError);

                (0, _jquery2.default)('html, body').animate({
                    scrollTop: 0
                }, 'slow', function () {
                    dfd.resolve();
                });
            } else {
                _validationUtilities2.default.validateObservables(self.validatedObservables).then(function (isValid) {
                    if (isValid) {
                        var writeModel = self.toOutputModel();
                        dfd.resolve();
                        self.close(writeModel);
                    } else {
                        self.prepareScreenForValidationErrors(dfd);
                    }
                }).fail(function () {
                    dfd.reject.apply(this, arguments);
                });
            }
        } catch (error) {
            dfd.reject(error);
        }
    }).promise();

    promise.fail(function () /*error*/{
        //TODOX: logger error
        //TODO: Appeler un fail global à l'app pour streamliner le tout
        self.handleUnknownError();
    });

    return promise;
};

ContentDialogViewModel.prototype.validate = function (dfd) {
    var self = this;

    //HACK: Il faudrait probablement créer un objet de base et un SearchableContentViewModel, à investiguer.
    if (self.isSearchable && self.hasSelectedItem() === false) {
        return _i18next2.default.t('koco-content-dialog-utilities.content-dialog-edit-form.no-item-selected');
    }
};

ContentDialogViewModel.prototype.handleUnknownError = function () /*error*/{
    //todo: scoop api devrait retourner un 400 pour erreurs de validations mais il retourne un 500...
    //toto: log erreur!?
    //toastr.error(jqXhr.responseText);
    _toastr2.default.error(_i18next2.default.t('koco-content-dialog-utilities.content-dialog-edit-form.unknown-error'));
};

ContentDialogViewModel.prototype.toOutputModel = function () {
    var self = this;

    var outputModel = _mappingUtilities2.default.toJS(self.selectedItem);

    self.cleanOutputModel(outputModel);

    return outputModel;
};

ContentDialogViewModel.prototype.cleanOutputModel = function () /*outputModel*/{
    //var self = this;

    //CLeanup added properties
};

ContentDialogViewModel.prototype.cancel = function () {
    var self = this;

    self.close();
};

ContentDialogViewModel.prototype.dispose = function () {
    var self = this;

    self.koDisposer.dispose();
};

exports.default = ContentDialogViewModel;