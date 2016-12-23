(function() {
  'use strict';

  angular
    .module('lough5Site')
    .config(routerConfig);

  /** @ngInject */
  function routerConfig($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('home', {
        url: '/',
        templateUrl: 'app/main/main.html'
      })
      .state('location', {
        url: '/location',
        templateUrl: 'app/location/location.html'
      })
      .state('course', {
        url: '/course',
        templateUrl: 'app/course/course.html'
      })
      .state('results', {
        url: '/results',
        templateUrl: 'app/results/results.html'
      });

    $urlRouterProvider.otherwise('/');
  }

})();
