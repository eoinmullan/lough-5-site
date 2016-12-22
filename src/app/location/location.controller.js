(function() {
  'use strict';

  angular
    .module('lough5Site')
    .controller('LocationController', LocationController);

  /** @ngInject */
  function LocationController(NgMap) {
    var vm = this;
    NgMap.getMap().then(function(map) {
      vm.map = map;
    });
  }
})();
