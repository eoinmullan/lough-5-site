(function() {
  'use strict';

  angular
    .module('lough5Site')
    .run(runBlock);

  /** @ngInject */
  function runBlock($log) {

    $log.debug('runBlock end');
  }

})();
