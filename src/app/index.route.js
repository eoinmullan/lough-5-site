(function() {
  'use strict';

  angular
    .module('lough5Site')
    .config(routerConfig)
    .controller('TabController', ['$location', TabController]);

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
      })
      .state('fastest50', {
        url: '/fastest50',
        templateUrl: 'app/fastest50/fastest50.html'
      })
      .state('age-categories', {
        url: '/age-categories',
        templateUrl: 'app/age-categories/age-categories.html'
      });

    $urlRouterProvider.otherwise('/');
  }

  function TabController($location) {
    var vm = this;
    switch ($location.path()) {
      case "":
      case "/": vm.tab = 1; break;
      case "/location": vm.tab = 2; break;
      case "/course": vm.tab = 3; break;
      case "/results": vm.tab = 4; break;
      case "/fastest50": vm.tab = 5; break;
    }
    vm.setTab = function(newValue){
      vm.tab = newValue;
    };
    vm.isSet = function(tabName){
      return vm.tab === tabName;
    };
  }

})();
