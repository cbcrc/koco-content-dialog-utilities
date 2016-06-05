(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'jquery', 'knockout', 'toastr', 'lodash', 'validation-utilities', 'koco-mapping-utilities', 'koco-disposer', 'i18next'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('jquery'), require('knockout'), require('toastr'), require('lodash'), require('validation-utilities'), require('koco-mapping-utilities'), require('koco-disposer'), require('i18next'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.jquery, global.knockout, global.toastr, global.lodash, global.validationUtilities, global.kocoMappingUtilities, global.kocoDisposer, global.i18next);
    global.contentDialogBaseViewmodel = mod.exports;
  }
})(this, function (exports, _jquery, _knockout, _toastr, _lodash, _validationUtilities, _kocoMappingUtilities, _kocoDisposer, _i18next) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _jquery2 = _interopRequireDefault(_jquery);

  var _knockout2 = _interopRequireDefault(_knockout);

  var _toastr2 = _interopRequireDefault(_toastr);

  var _lodash2 = _interopRequireDefault(_lodash);

  var _validationUtilities2 = _interopRequireDefault(_validationUtilities);

  var _kocoMappingUtilities2 = _interopRequireDefault(_kocoMappingUtilities);

  var _kocoDisposer2 = _interopRequireDefault(_kocoDisposer);

  var _i18next2 = _interopRequireDefault(_i18next);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

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

    self.koDisposer = new _kocoDisposer2.default();
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

    var selectedItem = _kocoMappingUtilities2.default.toJS(self.selectedItem);

    return !!(selectedItem && selectedItem.id);
  };

  ContentDialogViewModel.prototype.getOriginalItemSelected = function () {
    var self = this;

    var originalItem = _kocoMappingUtilities2.default.toJS(self.originalItem);

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

    var selectedItem = _kocoMappingUtilities2.default.toJS(self.selectedItem);

    return selectedItem && item && selectedItem.id === item.id;
  };

  ContentDialogViewModel.prototype.isOriginalItem = function (item) {
    var self = this;

    var originalItem = _kocoMappingUtilities2.default.toJS(self.originalItem);

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

    return Promise.resolve();
  };

  ContentDialogViewModel.prototype.prepareScreenForValidationErrors = function () {
    return new Promise(function (resolve) {
      _toastr2.default.error(_i18next2.default.t('koco-content-dialog-utilities.content-dialog-edit-form.form-error'));

      (0, _jquery2.default)('html, body').animate({
        scrollTop: 0
      }, 'slow', resolve);
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

  ContentDialogViewModel.prototype.addValidationToModel = function () /*model*/{};

  ContentDialogViewModel.prototype.save = function () {
    var _this = this;

    var promise = new Promise(function (resolve, reject) {
      var validateError = self.validate();

      if (validateError) {
        _toastr2.default.error(validateError);

        (0, _jquery2.default)('html, body').animate({
          scrollTop: 0
        }, 'slow', resolve);
      } else {
        _validationUtilities2.default.validateObservables(self.validatedObservables).then(function (isValid) {
          if (isValid) {
            var writeModel = self.toOutputModel();

            self.close(writeModel);

            return Promise.resolve();
          }

          return self.prepareScreenForValidationErrors();
        }).then(resolve).catch(reject);
      }
    });

    promise.catch(function (ex) {
      // TODO: logger error
      // TODO: Appeler un fail global à l'app pour streamliner le tout
      _this.handleUnknownError(ex);
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

    var outputModel = _kocoMappingUtilities2.default.toJS(self.selectedItem);

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
});