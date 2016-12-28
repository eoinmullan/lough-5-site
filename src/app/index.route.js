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
      });

    $urlRouterProvider.otherwise('/');
  }

  function TabController($location) {
    switch ($location.$$url) {
      case "/": this.tab = 1; break;
      case "/location": this.tab = 2; break;
      case "/course": this.tab = 3; break;
      case "/results": this.tab = 4; break;
    }
    this.setTab = function(newValue){
      this.tab = newValue;
    };
    this.isSet = function(tabName){
      return this.tab === tabName;
    };
  }

})();
