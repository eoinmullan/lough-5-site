(function() {
  'use strict';

  angular
    .module('lough5Site')
    .directive('loughCarousel', loughCarousel);

  /** @ngInject */
  function loughCarousel() {
    var directive = {
      restrict: 'E',
      templateUrl: 'app/components/loughCarousel/loughCarousel.html'
    };

    return directive;
  }

})();