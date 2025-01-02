(function() {
  'use strict';

  angular
    .module('lough5Site')
    .controller('ResultsTabController', ResultsTabController);

  /** @ngInject */
  function ResultsTabController() {
    var vm = this;
    vm.tab = 16;

    vm.setTab = function(newValue){
      vm.tab = newValue;
    };
    vm.isSet = function(tabName){
      return vm.tab === tabName;
    };
  }
})();
