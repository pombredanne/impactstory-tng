angular.module('aboutPages', [])



    .config(function($routeProvider) {
        $routeProvider.when('/about/data', {
            templateUrl: 'about-pages/about-data.tpl.html',
            controller: 'aboutPageCtrl'
        })
    })

    .config(function($routeProvider) {
        $routeProvider.when('/about/orcid', {
            templateUrl: 'about-pages/about-orcid.tpl.html',
            controller: 'aboutPageCtrl'
        })
    })

    .config(function($routeProvider) {
        $routeProvider.when('/about/legal', {
            templateUrl: 'about-pages/about-legal.tpl.html',
            controller: 'aboutPageCtrl'
        })
    })

    .config(function($routeProvider) {
        $routeProvider.when('/about', {
            templateUrl: 'about-pages/about.tpl.html',
            controller: 'aboutPageCtrl'
        })
    })

    .config(function($routeProvider) {
        $routeProvider.when('/search', {
            templateUrl: 'about-pages/search.tpl.html',
            controller: 'searchPageCtrl'
        })
    })

    .config(function($routeProvider) {
        $routeProvider.when('/sample', {
            templateUrl: 'about-pages/sample.tpl.html',
            controller: 'samplePageCtrl'
        })
    })

    .config(function($routeProvider) {
        $routeProvider.when('/about/achievements', {
            templateUrl: 'about-pages/about-badges.tpl.html',
            controller: 'aboutPageCtrl',
            resolve: {
                badgesResp: function($http, $route, BadgeDefs){
                    console.log("loaded the badge defs in the route def")
                    return BadgeDefs.load()
                }
            }
        })
    })

    .controller("searchPageCtrl", function($scope, $http, $location){
        $scope.ctrl = {}

        $scope.onSearchSelect = function(selection){
            console.log("selection!", selection)
            $scope.loading = true
            $location.url("u/" + selection.orcid_id)

        }

        $scope.search = function(searchName) {
            return $http.get("api/search/" + searchName)
                .then(function(resp){
                    console.log("got search results back", resp)
                    return resp.data.list
                })
        }
        $http.get("/api/people")
            .success(function(resp){
                $scope.numProfiles = resp.count
            })
    })

    .controller("samplePageCtrl", function($scope, $http){
        console.log("sample page ctrl!")
        $http.get("/api/products").success(
            function(resp){
                console.log("got /api/product resp back", resp)
                $scope.products = resp.list
            }
        )

    })


    // used for about/achievements
    // used for about/data
    // used for about
    .controller("aboutPageCtrl", function($scope,
                                          $auth,
                                          $timeout,
                                           $routeParams,
                                           $anchorScroll,
                                           BadgeDefs){
        $scope.badgeDefs = BadgeDefs

        $timeout(function(){
            $anchorScroll();
        }, 500)
        
        // copied from person page
        var subscoreSortOrder = {
            buzz: 1,
            engagement: 2,
            openness: 3,
            fun: 4
        }

        // convert to a list in a kinda dumb way, whatevs.
        var badgesList = []
        _.each(BadgeDefs.d, function(v, k){
            var myBadge = _.extend({}, v);
            myBadge.id = k
            myBadge.description = myBadge.description.replace("{value}", "<em class='n'>n</em>")
            badgesList.push(myBadge)
        })

        console.log("badges", badgesList)




        // group the badges by Badge Group
        var badgesByGroup = _.groupBy(badgesList, "group")
        var badgeGroups = []
        _.each(badgesByGroup, function(badges, groupName){
            console.log("group name" , groupName)
            if (groupName  && groupName != "null"){ // hack
                badgeGroups.push({
                    name: groupName,
                    sortLevel: subscoreSortOrder[groupName],
                    badges: badges
                })
            }

        })

        $scope.badgeGroups = badgeGroups

        // group everything by Aggregation Level (person or product)
        //var badges = _.groupBy(badgeGroups, "aggregationLevel")
        //$scope.badges = badges





        //if ($auth.isAuthenticated()){
        //    var myOrcidId = $auth.getPayload()["sub"]
        //    Person.load(myOrcidId).success(function(resp){
        //        console.log("loaded the person", Person.d)
        //        $scope.iHaveThisBadge = function(badgeId){
        //            return _.findWhere(Person.d.badges, {name: badgeId})
        //        }
        //    })
        //}









    })




angular.module('app', [
    // external libs

    'ngRoute',
    'ngMessages',
    'satellizer',

    'ngResource',
    'ngSanitize',
    'ngMaterial',

    'templates.app',  // this is how it accesses the cached templates in ti.js

    'staticPages',

    'badgeDefs',
    'productPage', // MUST be above personPage because personPage route is greedy for /p/
    'personPage',
    'settingsPage',
    'badgePage',
    'aboutPages',

    'numFormat'

]);




angular.module('app').config(function ($routeProvider,
                                       $authProvider,
                                       $mdThemingProvider,
                                       $locationProvider) {


    $locationProvider.html5Mode(true);

    // handle 404s by redirecting to landing page.
    $routeProvider.otherwise({ redirectTo: '/' })

    $mdThemingProvider.theme('default')
        .primaryPalette('deep-orange')
        .accentPalette("blue")


    $authProvider.twitter({
      url: '/auth/twitter',
      authorizationEndpoint: 'https://api.twitter.com/oauth/authenticate',
      redirectUri: window.location.origin + "/twitter-login",
      type: '1.0',
      popupOptions: { width: 495, height: 645 }
    });



});


angular.module('app').run(function($route,
                                   $rootScope,
                                   $timeout,
                                   $auth,
                                   $http,
                                   $location,
                                   Person) {


    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-23384030-1', 'auto');


    $rootScope.$on('$routeChangeStart', function(next, current){
    })
    $rootScope.$on('$routeChangeSuccess', function(next, current){
        window.scrollTo(0, 0)
        ga('send', 'pageview', { page: $location.url() });
        window.Intercom('update')

    })

    $rootScope.sendCurrentUserToIntercom = function(){
        if (!$auth.isAuthenticated()){
            return false
        }

        $http.get("api/person/" + $auth.getPayload().sub)
            .success(function(resp){
                $rootScope.sendToIntercom(resp)
                console.log("sending current user to intercom")
            })
    }

    $rootScope.sendToIntercom = function(personResp){
        var resp = personResp
        var percentOA = resp.percent_oa
        if (percentOA === null) {
            percentOA = undefined
        }
        else {
            percentOA * 100
        }

        var intercomInfo = {
            // basic user metadata
            app_id: "z93rnxrs",
            name: resp._full_name,
            user_id: resp.orcid_id, // orcid ID
            claimed_at: moment(resp.claimed_at).unix(),
            email: resp.email,

            // user stuff for analytics
            percent_oa: percentOA,
            num_posts: resp.num_posts,
            num_mentions: resp.num_mentions,
            num_products: resp.products.length,
            num_badges: resp.badges.length,
            num_twitter_followers: resp.num_twitter_followers,
            campaign: resp.campaign,

            // we don't send person responses for deleted users (just 404s).
            // so if we have a person response, this user isn't deleted.
            // useful for when users deleted profile, then re-created later.
            is_deleted: false

        }
        console.log("sending to intercom", intercomInfo)
        window.Intercom("boot", intercomInfo)
    }

    $rootScope.sendCurrentUserToIntercom()
    








    $rootScope.$on('$routeChangeError', function(event, current, previous, rejection){
        console.log("$routeChangeError")
        $rootScope.setPersonIsLoading(false)
        $location.path("/")
        window.scrollTo(0, 0)
    });




});





angular.module('app').controller('AppCtrl', function(
    $rootScope,
    $scope,
    $route,
    $location,
    NumFormat,
    $auth,
    $interval,
    $http,
    $mdDialog,
    $sce){

    $scope.auth = $auth
    $scope.numFormat = NumFormat
    $scope.moment = moment // this will break unless moment.js loads over network...

    $scope.global = {}
    $rootScope.setPersonIsLoading = function(isLoading){
        $scope.global.personIsLoading = !!isLoading
    }


    $scope.pageTitle = function(){
        if (!$scope.global.title){
            $scope.global.title = "Discover the online impact of your research"
        }
        return "Impactstory: " + $scope.global.title
    }


    $rootScope.$on('$routeChangeSuccess', function(next, current){
        $scope.global.showBottomStuff = true
        $scope.global.loggingIn = false
        $scope.global.title = null
        $location.search("source", null)
    })

    $scope.trustHtml = function(str){
        return $sce.trustAsHtml(str)
    }
    $scope.pluralize = function(noun, number){
        //pluralize.addSingularRule(/slides$/i, 'slide deck')
        return pluralize(noun, number)
    }



    // config stuff
    // badge group configs
    var badgeGroupIcons = {
        engagement: "user",
        openness: "unlock-alt",
        buzz: "bullhorn",
        fun: "smile-o"
    }
    $scope.getBadgeIcon = function(group){
        if (badgeGroupIcons[group]){
            return badgeGroupIcons[group]
        }
        else {
            return "fa-trophy"
        }
    }

    // genre config
    var genreIcons = {
        'article': "file-text-o",
        'blog': "comments",
        'dataset': "table",
        'figure': "bar-chart",
        'image': "picture-o",
        'poster': "map-o",
        'conference-poster': "map-o",
        'slides': "desktop",
        'software': "save",
        'twitter': "twitter",
        'video': "facetime-video",
        'webpage': "laptop",
        'online-resource': "desktop",
        'preprint': "paper-plane-o",
        'other': "ellipsis-h",
        'unknown': "file-o",
        "conference-paper": "list-alt",  // conference proceeding
        "book": "book",
        "book-chapter": "bookmark-o",  // chapter anthology
        "thesis": "graduation-cap",
        "dissertation": "graduation-cap",
        "peer-review": "comments-o"
    }
    $scope.getGenreIcon = function(genre){
        if (genreIcons[genre]){
            return genreIcons[genre]
        }
        else {
            return genreIcons.unknown
        }
    }







    var redirectUri = window.location.origin + "/login"
    var orcidAuthUrl = "https://orcid.org/oauth/authorize" +
        "?client_id=APP-PF0PDMP7P297AU8S" +
        "&response_type=code" +
        "&scope=/authenticate" +
        "&redirect_uri=" + redirectUri

    // used in the nav bar, also for signup on the landing page.
    var authenticate = function (showLogin) {
        console.log("authenticate!")

        if (showLogin == "signin"){
            // will show the signup screen
        }
        else {
            // show the login screen (defaults to this)
            orcidAuthUrl += "&show_login=true"
        }

        window.location = orcidAuthUrl
        return true

    }

    $rootScope.authenticate = authenticate
    $scope.authenticate = authenticate



    var showAlert = function(msgText, titleText, okText){
        if (!okText){
            okText = "ok"
        }
          $mdDialog.show(
                  $mdDialog.alert()
                    .clickOutsideToClose(true)
                    .title(titleText)
                    .textContent(msgText)
                    .ok(okText)
            );
    }
    $rootScope.showAlert = showAlert









    /********************************************************
     *
     *  stripe stuff
     *
    ********************************************************/



    var stripeInfo = {
        email: null,
        tokenId: null,
        cents: 0,

        // optional
        fullName: null,
        orcidId: null
    }

    var stripeHandler = StripeCheckout.configure({
        key: stripePublishableKey,
        locale: 'auto',
        token: function(token) {
            stripeInfo.email = token.email
            stripeInfo.tokenId = token.id

            console.log("now we are doing things with the user's info", stripeInfo)
            $http.post("/api/donation", stripeInfo)
                .success(function(resp){
                    console.log("the credit card charge worked!", resp)
                    showAlert(
                        "We appreciate your donation, and we've emailed you a receipt.",
                        "Thanks so much!"
                    )
                })
                .error(function(resp){
                    console.log("error!", resp.message)
                    if (resp.message){
                        var reason = resp.message
                    }
                    else {
                        var reason = "Sorry, we had a server error! Drop us a line at team@impactstory.org and we'll fix it."
                    }
                    showAlert(reason, "Credit card error")
                })
        }
      });
    $scope.donate = function(cents){
        console.log("donate", cents)
        stripeInfo.cents = cents
        var me = $auth.getPayload() // this might break on the donate page.
        if (me){
            stripeInfo.fullName = me.given_names + " " + me.family_name
            stripeInfo.orcidId = me.sub
        }

        stripeHandler.open({
          name: 'Impactstory donation',
          description: "We're a US 501(c)3",
          amount: cents
        });
    }


})



.controller('badgeItemCtrl', function($scope){
    $scope.showMaxItems = 3
    $scope.getIconUrl = function(name){
    }
})

.controller('tweetRollupCtrl', function($scope){
    $scope.showTweets = false
})

.controller('mendeleyRollupCtrl', function($scope){
    $scope.showMendeley = false
})
    
.directive('subscorehelp', function(){
        return {
            restrict: "E",
            templateUrl: 'helps.tpl.html',
            scope:{
                subscoreName: "=name"
            },
            link: function(scope, elem, attrs){
            }
        }
    })

.directive('short', function(){
        return {
            restrict: "E",
            template: '{{shortText}}<span ng-show="shortened">&hellip;</span>',
            scope:{
                text: "=text",
                len: "=len"
            },
            link: function(scope, elem, attrs){

                var newLen
                if (scope.len) {
                    newLen = scope.len
                }
                else {
                    newLen = 40
                }
                if (scope.text.length > newLen){
                    var short = scope.text.substring(0, newLen)
                    short = short.split(" ").slice(0, -1).join(" ")
                    scope.shortText = short
                    scope.shortened = true
                }
                else {
                    scope.shortText = scope.text
                }

            }
        }
    })















angular.module('badgePage', [
    'ngRoute',
    'person'
])



    .config(function($routeProvider) {
        $routeProvider.when('/u/:orcid/badge/:badgeName', {
            templateUrl: 'badge-page/badge-page.tpl.html',
            controller: 'badgePageCtrl',
            resolve: {
                personResp: function($http, $route, Person){
                    console.log("loaded the person response in the route def")
                    return Person.load($route.current.params.orcid)
                },
                badgesResp: function($http, $route, BadgeDefs){
                    console.log("loaded the badge defs in the route def")
                    return BadgeDefs.load()
                }
            }
        })
    })



    .controller("badgePageCtrl", function($scope,
                                           $routeParams,
                                           Person,
                                           BadgeDefs,
                                           badgesResp,
                                           personResp){
        $scope.person = Person.d
        $scope.badgeDefs = BadgeDefs

        var badges = Person.getBadgesWithConfigs(BadgeDefs.d)

        var badge = _.findWhere(badges, {name: $routeParams.badgeName})
        $scope.badge = badge
        $scope.badgeProducts = _.filter(Person.d.products, function(product){
            return _.contains(badge.dois, product.doi)
        })

        console.log("we found these products fit the badge", $scope.badgeProducts)





        console.log("loaded the badge page!", $scope.person, $scope.badgeDefs)








    })




angular.module("filterService", [])

.factory("FilterService", function($location){

    var filters = {
      only_academic: "true",
      language: "python",
      tag: null,
      type: "pacakges"
    }

    var setFromUrl = function(){
      filters.only_academic = $location.search().only_academic
      filters.tag = $location.search().tag
      filters.language = $location.search().language
      filters.type = $location.search().type
      if (!filters.language){
        set("language", "python")
      }
      if (!filters.type){
        set("type", "people")
      }
      console.log("set filters from url", filters)
    }

    var set = function(k, v){
      filters[k] = v
      $location.search(k, v)
    }
    var toggle = function(k){
      // for booleans
      if (filters[k]) {
        filters[k] = null
      }
      else {
        filters[k] = "true"  // must be string or won't show up in url
      }
      $location.search(k, filters[k])
    }

    var unset = function(k){
      filters[k] = null
    }
    var unsetAll = function(){
        console.log("unset all!")
        _.each(filters, function(v, k){
            filters[k] = null
            $location.search(k, null)
        })
    }

    var asQueryStr = function(){
      var ret = []
      _.each(filters, function(v, k){
        if (v){
          ret.push(k + "=" + v)
        }
      })
      return ret.join("&")
    }


  return {
    d: filters,
    set: set,
    toggle: toggle,
    unset: unset,
    setFromUrl: setFromUrl,
    asQueryStr: asQueryStr,
    unsetAll: unsetAll
  }
});
angular.module('footer', [
])



    .controller("footerCtrl", function($scope,
                                       $location,
                                       $rootScope,
                                       FormatterService,
                                       FilterService,
                                       $http){


        //$scope.hideEmailSignup = !!$.cookie("hideEmailSignup")
        //
        //
        //$scope.dismissEmailSignup = function(){
        //    console.log("dismiss the signup")
        //    $scope.hideEmailSignup = true
        //    !$.cookie("hideEmailSignup", true)
        //}



    })







angular.module('header', [
  ])



  .controller("headerCtrl", function($scope,
                                     $location,
                                     $rootScope,
                                     FormatterService,
                                     FilterService,
                                     $http){



    $scope.searchResultSelected = ''
    $scope.format = FormatterService
    $scope.foo = 42

    $rootScope.$on('$routeChangeSuccess', function(next, current){
      $scope.searchResultSelected = ''
      document.getElementById("search-box").blur()
    })
    $rootScope.$on('$routeChangeError', function(event, current, previous, rejection){
      $scope.searchResultSelected = ''
      document.getElementById("search-box").blur()
    });


    $scope.onSelect = function(item ){
      console.log("select!", item)
      if (item.type=='pypi_project') {
        $location.path("package/python/" + item.name)
      }
      else if (item.type=='cran_project') {
        $location.path("package/r/" + item.name)
      }
      else if (item.type=='person') {
        $location.path("person/" + item.id)
      }
      else if (item.type=='tag') {
        FilterService.unsetAll()
        $location.path("tag/" + encodeURIComponent(encodeURIComponent( item.name)))
      }
    }

    $scope.doSearch = function(val){
      console.log("doing search")
      return $http.get("/api/search/" + val)
        .then(
          function(resp){
            //return resp.data.list
            return _.map(resp.data.list, function(match){
              //return match
              match.urlName = encodeURIComponent(encodeURIComponent(match.name))
              return match
            })

            var names = _.pluck(resp.data.list, "name")
            console.log(names)
            return names
          }
        )
    }

  })

.controller("searchResultCtrl", function($scope, $sce){


    $scope.trustHtml = function(str){
      console.log("trustHtml got a thing", str)

      return $sce.trustAsHtml(str)
    }




  })







angular.module('personPage', [
    'ngRoute',
    'person'
])



    .config(function($routeProvider) {
        $routeProvider.when('/u/:orcid/:tab?/:filter?', {
            templateUrl: 'person-page/person-page.tpl.html',
            controller: 'personPageCtrl',
            reloadOnSearch: false,
            resolve: {
                personResp: function($q, $http, $rootScope, $route, $location, Person){
                    $rootScope.setPersonIsLoading(true)
                    console.log("person is loading!", $rootScope)
                    var urlId = $route.current.params.orcid

                    if (urlId.indexOf("0000-") === 0){ // got an ORCID
                        return Person.load(urlId)
                    }
                    else { // got a twitter name
                        console.log("got something other than an orcid in the slug. trying as twitter ID")
                        var deferred = $q.defer()

                        $http.get("/api/person/twitter_screen_name/" + urlId)
                            .success(function(resp){
                                console.log("this twitter name has an ORCID. redirecting there: ", resp.id)
                                // we don't reject of resolve the promise. that's
                                // to keep this route from resolving and showing garbage while
                                // the redirect is loading.
                                $location.url("/u/" + resp.id)
                            })
                            .error(function(resp){
                                console.log("got 404 resp back about the twitter name")
                                deferred.reject()
                            })
                        return deferred.promise
                    }
                }
            }
        })
    })



    .controller("personPageCtrl", function($scope,
                                           $routeParams,
                                           $rootScope,
                                           $route,
                                           $http,
                                           $auth,
                                           $mdDialog,
                                           $location,
                                           $timeout,
                                           $sce,
                                           Person,
                                           personResp){





        $scope.global.personIsLoading = false
        $scope.global.title = Person.d.given_names + " " + Person.d.family_name
        $scope.person = Person.d
        $scope.products = Person.d.products
        $scope.sources = Person.d.sources
        $scope.badges = Person.badgesToShow()
        $scope.d = {}


        var ownsThisProfile = $auth.isAuthenticated() && $auth.getPayload().sub == Person.d.orcid_id

        $scope.ownsThisProfile = ownsThisProfile


        console.log("retrieved the person", $scope.person)

        $scope.profileStatus = "all_good"
        $scope.tab =  $routeParams.tab || "overview"

        // overview tab
        if (!$routeParams.tab){
            $scope.tab = "overview"
        }

        // someone is linking to a specific badge. show overview page behind a popup
        else if ($routeParams.tab == "a") {
            $scope.tab = "achievements"
            var badgeName = $routeParams.filter
            console.log("show the badges modal, for this badge", badgeName)


            var badgeToShow = _.find(Person.d.badges, function(badge){
                return badgeName == badge.display_name.toLowerCase().replace(" ", "-")
            })
            var badgeDialogCtrl = function($scope){
                $scope.badge = badgeToShow

                // this dialog has isolate scope so doesn't inherit this function
                // from the application scope.
                $scope.trustHtml = function(str){
                    return $sce.trustAsHtml(str)
                }
                $scope.cancel = function() {
                    $mdDialog.cancel();
                };
                $scope.firstName = Person.d.first_name
            }

            var dialogOptions = {
                clickOutsideToClose: true,
                templateUrl: 'badgeDialog.tpl.html',
                controller: badgeDialogCtrl
            }


            var showDialog = function(){
                $mdDialog.show(dialogOptions).then(function(result) {
                    console.log("ok'd the setFulltextUrl dialog")

                }, function() {
                    console.log("cancelled the setFulltextUrl dialog")
                    $location.url("u/" + Person.d.orcid_id + "/achievements")
                });
            }

            $timeout(showDialog, 0)


        }

        // the other tabs
        else {
            $scope.tab = $routeParams.tab
        }

        $scope.userForm = {}

        if (ownsThisProfile && !Person.d.email ) {
            $scope.profileStatus = "no_email"
            $scope.setEmailMethod = "twitter"
        }
        else if (ownsThisProfile && !Person.d.products.length) {
            $scope.profileStatus = "no_products"
        }
        else {
            $scope.profileStatus = "all_good"
        }

        console.log("routeparamas", $routeParams)
        if ($routeParams.filter == "mendeley"){
            $scope.d.showMendeleyDetails = true
        }
        else {
            $scope.showMendeleyDetails = false
        }



        var reloadWithNewEmail = function(){
            Person.reload().then(
                function(resp){
                    window.Intercom("update", {
                        user_id: $auth.getPayload().sub, // orcid ID
                        email: Person.d.email
                    })
                    console.log("Added this person's email in Intercom. Reloading page.", Person)
                    $route.reload()
                },
                function(resp){
                    console.log("bad! Person.reload() died in finishing the profile.", resp)
                }
            )
        }

        $scope.submitEmail = function(){
            console.log("setting the email!", $scope.userForm.email)
            $rootScope.setPersonIsLoading(true)
            $scope.profileStatus = "blank"
            $http.post("/api/me", {email: $scope.userForm.email})
                .success(function(resp){
                    reloadWithNewEmail()
                })
        }

        $scope.linkTwitter = function(){
            console.log("link twitter!")
            $scope.profileStatus = "blank"
            $rootScope.setPersonIsLoading(true)

            // on the server, when we link twitter we also set the email
            $auth.authenticate('twitter').then(
                function(resp){
                    console.log("authenticate successful.", resp)
                    reloadWithNewEmail()
                },
                function(resp){
                    console.log("linking twitter didn't work!", resp)
                }
            )
        }


        $scope.pullFromOrcid = function(){
            console.log("ah, refreshing!")
            $scope.d.syncing = true
            $http.post("/api/person/" + Person.d.orcid_id)
                .success(function(resp){
                    // jason or heather might be refreshing this profile
                    // for admin/debug reasons using Secret Button.
                    // don't send event for that.
                    if (ownsThisProfile){
                        $rootScope.sendToIntercom(resp)
                        Intercom('trackEvent', 'synced');
                        Intercom('trackEvent', 'synced-to-signup');
                    }

                    // force the Person to reload. without this
                    // the newly-synced data never gets displayed.
                    console.log("reloading the Person")
                    Person.reload().then(
                        function(resp){
                            $scope.profileStatus = "all_good"
                            console.log("success, reloading page.")
                            $route.reload()
                        }
                    )
                })
        }



        $scope.shareProfile = function(){
            if (!ownsThisProfile){
                return false // just to make sure
            }
            var myOrcid = $auth.getPayload().sub // orcid ID

            console.log("sharing means caring")
            var aDayAgo = moment().subtract(24, 'hours')
            var claimedAt = moment(Person.d.claimed_at)

            // which came first: a day ago, or when this was claimed?
            if (moment.min(aDayAgo, claimedAt) == aDayAgo){
                console.log("this profile is brand spankin' new! logging it.")

                $http.post("api/person/" + myOrcid + "/tweeted-quickly", {})
                    .success(function(resp){
                        console.log("logged the tweet with our DB", resp)
                    })

                window.Intercom("update", {
                    user_id: myOrcid,
                    tweeted_quickly: true
                })
            }

        }

        $scope.shareBadge = function(badgeName){
            window.Intercom('trackEvent', 'tweeted-badge', {
                name: badgeName
            });
            var myOrcid = $auth.getPayload().sub // orcid ID
            window.Intercom("update", {
                user_id: myOrcid,
                latest_tweeted_badge: badgeName
            })
        }







        // posts and activity stuff
        var posts = []
        _.each(Person.d.products, function(product){
            var myDoi = product.doi
            var myPublicationId = product.id
            var myTitle = product.title
            _.each(product.posts, function(myPost){
                myPost.citesDoi = myDoi
                myPost.citesPublication = myPublicationId
                myPost.citesTitle = myTitle
                posts.push(myPost)
            })
        })

        function makePostsWithRollups(posts){
            var sortedPosts = _.sortBy(posts, "posted_on")
            var postsWithRollups = []
            function makeRollupPost(){
                return {
                    source: 'tweetRollup',
                    posted_on: '',
                    count: 0,
                    tweets: []
                }
            }
            var currentRollup = makeRollupPost()
            _.each(sortedPosts, function(post){
                if (post.source == 'twitter'){

                    // we keep tweets as regular posts too
                    postsWithRollups.push(post)

                    // put the tweet in the rollup
                    currentRollup.tweets.push(post)

                    // rollup posted_on date will be date of *first* tweet in group
                    if (!currentRollup.posted_on){
                        currentRollup.posted_on = post.posted_on
                    }
                }
                else {
                    postsWithRollups.push(post)

                    // save the current rollup
                    if (currentRollup.tweets.length){
                        postsWithRollups.push(currentRollup)
                    }

                    // clear the current rollup
                    currentRollup = makeRollupPost()
                }
            })

            // there may be rollup still sitting around because no regular post at end
            if (currentRollup.tweets.length){
                postsWithRollups.push(currentRollup)
            }
            return postsWithRollups
        }

        $scope.posts = makePostsWithRollups(posts)
        $scope.mendeleySource = _.findWhere(Person.d.sources, {source_name: "mendeley"})
        $scope.mendeleyCountries = _.map(_.pairs(Person.d.mendeley.country_percent), function(countryPair){
            return {
                name: countryPair[0],
                percent: countryPair[1]
            }
        })

        $scope.mendeleyDisciplines = _.map(_.pairs(Person.d.mendeley.subdiscipline_percent), function(pair){
            return {
                name: pair[0],
                percent: pair[1]
            }
        })

        $scope.postsFilter = function(post){
            if ($scope.selectedChannel) {
                return post.source == $scope.selectedChannel.source_name
            }
            else { // we are trying to show unfiltered view

                // but even in unfiltered view we want to hide tweets.
                return post.source != 'twitter'

            }
        }

        $scope.postsSum = 0
        _.each(Person.d.sources, function(v){
            $scope.postsSum += v.posts_count
        })

        $scope.d.viewItemsLimit = 20
        $scope.selectedChannel = _.findWhere(Person.d.sources, {source_name: $routeParams.filter})

        $scope.toggleSelectedChannel = function(channel){
            console.log("toggling selected channel", channel)
            if (channel.source_name == $routeParams.filter){
                $location.url("u/" + Person.d.orcid_id + "/activity")
            }
            else {
                $location.url("u/" + Person.d.orcid_id + "/activity/" + channel.source_name)
            }
        }










        // genre stuff
        var genreGroups = _.groupBy(Person.d.products, "genre")
        var genres = []
        _.each(genreGroups, function(v, k){
            genres.push({
                name: k,
                display_name: k.split("-").join(" "),
                count: v.length
            })
        })

        $scope.genres = genres
        $scope.selectedGenre = _.findWhere(genres, {name: $routeParams.filter})
        $scope.toggleSeletedGenre = function(genre){
            if (genre.name == $routeParams.filter){
                $location.url("u/" + Person.d.orcid_id + "/publications")
            }
            else {
                $location.url("u/" + Person.d.orcid_id + "/publications/" + genre.name)
            }
        }











        // achievements stuff
        var subscoreSortOrder = {
            buzz: 1,
            engagement: 2,
            openness: 3,
            fun: 4
        }
        
        // put the badge counts in each subscore
        var subscores = _.map(Person.d.subscores, function(subscore){
            var matchingBadges = _.filter(Person.badgesToShow(), function(badge){
                return badge.group == subscore.name
            })
            subscore.badgesCount = matchingBadges.length
            subscore.sortOrder = subscoreSortOrder[subscore.name]
            return subscore
        })
        $scope.subscores = subscores
        $scope.selectedSubscore = _.findWhere(subscores, {name: $routeParams.filter})

        $scope.toggleSeletedSubscore = function(subscore){
            console.log("toggle subscore", subscore)
            if (subscore.name == $routeParams.filter){
                $location.url("u/" + Person.d.orcid_id + "/achievements")
            }
            else {
                $location.url("u/" + Person.d.orcid_id + "/achievements/" + subscore.name)
            }
        }

        //$scope.showBadgeDialog = function(displayName){
        //    console.log("show badge dialog!", displayName)
        //    $location.url("u/" + Person.d.orcid_id + "/a/" + displayName.toLowerCase().replace(" ", "-"))
        //}








    })




angular.module('productPage', [
    'ngRoute',
    'person'
])



    .config(function($routeProvider) {
        $routeProvider.when('/u/:orcid/doi/:id*/:filter?', {
            templateUrl: 'product-page/product-page.tpl.html',
            controller: 'productPageCtrl'
            ,
            resolve: {
                personResp: function($http, $route, Person){
                    console.log("loaded the person response in the route def")
                    return Person.load($route.current.params.orcid)
                }
            }
        })
    })

    .config(function($routeProvider) {
        $routeProvider.when('/u/:orcid/p/:id/:filter?', {
            templateUrl: 'product-page/product-page.tpl.html',
            controller: 'productPageCtrl'
            ,
            resolve: {
                personResp: function($http, $route, Person){
                    console.log("loaded the person response in the route def")
                    return Person.load($route.current.params.orcid)
                }
            }
        })
    })



    .controller("productPageCtrl", function($scope,
                                           $routeParams,
                                           $route,
                                           $location,
                                           $http,
                                           $mdDialog,
                                           $auth,
                                           Person,
                                           personResp){


        var possibleChannels = _.pluck(Person.d.sources, "source_name")

        var ownsThisProfile = $auth.isAuthenticated() && $auth.getPayload().sub == Person.d.orcid_id

        var id
        id = $routeParams.id
        var product = _.findWhere(Person.d.products, {id: id})

        if (!product){
            $location.url("/u/" + Person.d.orcid_id + "/publications")
        }

        $scope.person = Person.d
        $scope.sources = product.sources
        $scope.product = product
        $scope.displayGenre = product.genre.replace("-", " ")
        $scope.ownsThisProfile = ownsThisProfile
        $scope.d = {}


        console.log("$scope.product", $scope.product, $routeParams.filter)




        function makePostsWithRollups(posts){
            var sortedPosts = _.sortBy(posts, "posted_on")
            var postsWithRollups = []
            function makeRollupPost(){
                return {
                    source: 'tweetRollup',
                    posted_on: '',
                    count: 0,
                    tweets: []
                }
            }
            var currentRollup = makeRollupPost()
            _.each(sortedPosts, function(post){
                if (post.source == 'twitter'){

                    // we keep tweets as regular posts too
                    postsWithRollups.push(post)

                    // put the tweet in the rollup
                    currentRollup.tweets.push(post)

                    // rollup posted_on date will be date of *first* tweet in group
                    if (!currentRollup.posted_on){
                        currentRollup.posted_on = post.posted_on
                    }
                }
                else {
                    postsWithRollups.push(post)

                    // save the current rollup
                    if (currentRollup.tweets.length){
                        postsWithRollups.push(currentRollup)
                    }

                    // clear the current rollup
                    currentRollup = makeRollupPost()
                }
            })

            // there may be rollup still sitting around because no regular post at end
            if (currentRollup.tweets.length){
                postsWithRollups.push(currentRollup)
            }
            return postsWithRollups
        }

        $scope.posts = makePostsWithRollups(product.posts)
        $scope.mendeleySource = _.findWhere(product.sources, {source_name: "mendeley"})

        $scope.postsFilter = function(post){
            if ($scope.selectedChannel) {
                return post.source == $scope.selectedChannel.source_name
            }
            else { // we are trying to show unfiltered view

                // but even in unfiltered view we want to hide tweets.
                return post.source != 'twitter'

            }
        }

        $scope.postsSum = 0
        _.each($scope.sources, function(v){
            $scope.postsSum += v.posts_count
        })


        $scope.d.postsLimit = 20
        $scope.selectedChannel = _.findWhere($scope.sources, {source_name: $routeParams.filter})

        $scope.toggleSelectedChannel = function(channel){
            console.log("toggling selected channel", channel)
            var rootUrl = "u/" + Person.d.orcid_id + "/p/" + id
            if (channel.source_name == $routeParams.filter){
                $location.url(rootUrl)
            }
            else {
                $location.url(rootUrl + "/" + channel.source_name)
            }
        }

        $scope.setFulltextUrl = function(ev){
            console.log("stetting fulltext url for ", id)
            var confirm = $mdDialog.prompt()
                .clickOutsideToClose(true)
                .title('Add link to free fulltext')
                .textContent("(No free fulltext anywhere? Consider uploading this work to an open repository like Zenodo or Figshare.)")
                .placeholder("What's the free fulltext URL?")
                .targetEvent(ev)
                .ok('Okay!')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function(result) {
                Person.setFulltextUrl(id, result)


            }, function() {
                console.log("cancelled the setFulltextUrl dialog")
            });
        }




    })




angular.module('resourcesModule', [])
  .factory('Leaders', function($resource) {
    return $resource('api/leaderboard')
  })


  .factory('PackageResource', function($resource) {
    return $resource('/api/package/:namespace/:name')
  })
angular.module('articleService', [
  ])



  .factory("ArticleService", function($http,
                                      $timeout,
                                      $location){

    var data = {}

    function getArticle(pmid){
      var url = "api/article/" + pmid
      console.log("getting article", pmid)
      return $http.get(url).success(function(resp){
        console.log("got response for api/article/" + pmid, resp)
        data.article = resp
      })
    }

    return {
      data: data,
      getArticle: getArticle
    }


  })
angular.module('badgeDefs', [
])

    .factory("BadgeDefs", function($http){

      var data = {}

      function load(){

        var url = "/api/badges"
        return $http.get(url).success(function(resp){

          // clear the data object
          for (var member in data) delete data[member];

          // put the response in the data object
          _.each(resp, function(v, k){
            data[k] = v
          })

        })
      }

      return {
        d: data,
        load: load
      }
    })
angular.module("numFormat", [])

    .factory("NumFormat", function($location){

        var commas = function(x) { // from stackoverflow
            if (!x) {
                return x
            }
            var parts = x.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        }


        var short = function(num, fixedAt){
            if (typeof num === "string"){
                return num  // not really a number
            }

            // from http://stackoverflow.com/a/14994860/226013
            if (num === null){
                return 0
            }
            if (num === 0){
                return 0
            }

            if (num >= 1000000) {
                return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            }
            if (num >= 100000) { // no decimal if greater than 100thou
                return (num / 1000).toFixed(0).replace(/\.0$/, '') + 'k';
            }

            if (num >= 1000) {
                return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
            }


            if (num < 1) {
                return Math.round(num * 100) / 100;  // to two decimals
            }

            return Math.ceil(num);
        }

        var round = function(num){
            return Math.round(num)
        }

        var doubleUrlEncode = function(str){
            return encodeURIComponent( encodeURIComponent(str) )
        }

        // from http://cwestblog.com/2012/09/28/javascript-number-getordinalfor/
        var ordinal = function(n) {
            n = Math.round(n)
            var s=["th","st","nd","rd"],
                v=n%100;
            return n+(s[(v-20)%10]||s[v]||s[0]);
        }

        var decimalToPerc = function(decimal, asOrdinal){
            var ret = Math.round(decimal * 100)
            if (asOrdinal){
                ret = ordinal(ret)
            }
            return ret
        }
        return {
            short: short,
            commas: commas,
            round: round,
            ordinal: ordinal,
            doubleUrlEncode: doubleUrlEncode,
            decimalToPerc: decimalToPerc

        }
    });
angular.module('pageService', [
  ])



  .factory("PageService", function(){

    var data = {}
    var defaultData = {}

    function reset(){
      console.log("resetting the page service data")
      _.each(defaultData, function(v, k){
        data[k] = v
      })
    }

    return {
      d: data,
      reset: reset
    }


  })
angular.module('person', [
])



    .factory("Person", function($http, $q, $route){

        var data = {}
        var badgeSortLevel = {
            "gold": 1,
            "silver": 2,
            "bronze": 3
        }
        var beltDescriptions = {
            white: "initial",
            yellow: "promising",
            orange: "notable",
            brown: "extensive",
            black: "exceptional"
        }

        function load(orcidId, force){


            // if the data for this profile is already loaded, just return it
            // unless we've been told to force a refresh from the server.
            if (data.orcid_id == orcidId && !force){
                console.log("Person Service getting from cache:", orcidId)
                return $q.when(data)
            }


            var url = "/api/person/" + orcidId
            console.log("Person Service getting from server:", orcidId)
            return $http.get(url).success(function(resp){

                // clear the data object and put the new data in
                for (var member in data) delete data[member];
                overwriteData(resp)

            })
        }

        function overwriteData(newData){
            // put the response in the data object
            _.each(newData, function(v, k){
                data[k] = v
            })

            // add computed properties

            // total posts
            var postCounts = _.pluck(data.sources, "posts_count")
            data.numPosts = postCounts.reduce(function(a, b){return a + b}, 0)

            // date of earliest publication
            var earliestPubYear = _.min(_.pluck(data.products, "year"))
            if (earliestPubYear > 0 && earliestPubYear <= 2015) {
                data.publishingAge = 2016 - earliestPubYear
            }
            else {
                data.publishingAge = 1
            }
        }

        function setFulltextUrl(productId, fulltextUrl) {
            _.each(data.products, function(myProduct){
                if (myProduct.id == productId){
                    myProduct.fulltext_url = fulltextUrl
                }
            });
            // todo un-hardcode this
            var apiUrl = "https://impactstory.org/api/person/" + data.orcid_id
            var postBody = {
                product: {
                    id: productId,
                    fulltext_url: fulltextUrl
                }
            }

            $http.post(apiUrl, postBody)
                .success(function(resp){
                    console.log("we set the fulltext url!", resp)
                    overwriteData(resp)

                    // todo: figure out if we actually need this
                    $route.reload()
                })
                .error(function(resp){
                    console.log("we failed to set the fulltext url", resp)
                    $route.reload()
                })

        }


        function getBadgesWithConfigs(configDict) {
            var ret = []
            _.each(data.badges, function(myBadge){
                var badgeDef = configDict[myBadge.name]
                var enrichedBadge = _.extend(myBadge, badgeDef)
                enrichedBadge.sortLevel = badgeSortLevel[enrichedBadge.level]
                ret.push(enrichedBadge)
            })

            return ret
        }


        return {
            d: data,
            load: load,
            badgesToShow: function(){
                return _.filter(data.badges, function(badge){
                    return !!badge.show_in_ui
                })
            },
            getBadgesWithConfigs: getBadgesWithConfigs,
            setFulltextUrl: setFulltextUrl,
            reload: function(){
                return load(data.orcid_id, true)
            }
        }
    })
angular.module('profileService', [
  ])



  .factory("ProfileService", function($http,
                                      $timeout,
                                      $location){

    var data = {
      profile: {
        articles:[]
      }
    }

    function profileStillLoading(){
      console.log("testing if profile still loading", data.profile.articles)
      return _.any(data.profile.articles, function(article){
        return _.isNull(article.percentile)
      })
    }

    function getProfile(slug){
      var url = "/profile/" + slug
      console.log("getting profile for", slug)
      return $http.get(url).success(function(resp){
        data.profile = resp

        if (profileStillLoading()){
          $timeout(function(){
            getProfile(slug)
          }, 1000)
        }

      })
    }

    return {
      data: data,
      foo: function(){
        return "i am in the profile service"
      },

      createProfile: function(name, pmids, coreJournals) {
        console.log("i am making a profile:", name, pmids)
        var postData = {
          name: name,
          pmids: pmids,
          core_journals: coreJournals
        }
        $http.post("/profile",postData)
          .success(function(resp, status, headers){
            console.log("yay got a resp from /profile!", resp)
            $location.path("/u/" + resp.slug)
          })
      },

      getProfile: getProfile
    }


  })
angular.module('settingsPage', [
    'ngRoute'
])



    .config(function($routeProvider) {
        $routeProvider.when('/me/settings', {
            templateUrl: 'settings-page/settings-page.tpl.html',
            controller: 'settingsPageCtrl',
            resolve: {
                isAuth: function($q, $auth){
                    if ($auth.isAuthenticated()){
                        return $q.resolve()
                    }
                    else {
                        return $q.reject("/settings only works if you're logged in.")
                    }
                }
            }
        })
    })



    .controller("settingsPageCtrl", function($scope, $rootScope, $auth, $route, $location, $http, Person){

        console.log("the settings page loaded")
        var myOrcidId = $auth.getPayload().sub
        $scope.orcidId = myOrcidId
        $scope.givenNames = $auth.getPayload()["given_names"]

        $scope.wantToDelete = false
        $scope.deleteProfile = function() {
            $http.delete("/api/me")
                .success(function(resp){
                    // let Intercom know
                    window.Intercom("update", {
                        user_id: myOrcidId,
                        is_deleted: true
                    })


                    $auth.logout()
                    $location.path("/")
                    alert("Your profile has been deleted.")
                })
                .error(function(){
                    alert("Sorry, something went wrong!")
                })
        }


        $scope.syncState = 'ready'

        $scope.pullFromOrcid = function(){
            console.log("ah, refreshing!")
            $scope.syncState = "working"
            $http.post("/api/person/" + myOrcidId)
                .success(function(resp){
                    // force a reload of the person
                    Intercom('trackEvent', 'synced-to-edit');
                    $rootScope.sendToIntercom(resp)
                    Person.load(myOrcidId, true).then(
                        function(resp){
                            $scope.syncState = "success"
                            console.log("we reloaded the Person after sync")
                        }
                    )
                })
        }

    })













angular.module('staticPages', [
    'ngRoute',
    'satellizer',
    'ngMessages'
])

    .config(function ($routeProvider) {
        $routeProvider.when('/', {
            templateUrl: "static-pages/landing.tpl.html",
            controller: "LandingPageCtrl",
            resolve: {
                isLoggedIn: function($auth, $q, $location){
                    var deferred = $q.defer()
                    if ($auth.isAuthenticated()){
                        var url = "/u/" + $auth.getPayload().sub
                        $location.path(url)
                    }
                    else {
                        return $q.when(true)

                        deferred.resolve()
                    }

                    return deferred.promise
                }
            }
        })
    })


    

    .config(function ($routeProvider) {
        $routeProvider.when('/login', {
            templateUrl: "static-pages/login.tpl.html",
            controller: "LoginCtrl"
        })
    })

    .config(function ($routeProvider) {
        $routeProvider.when('/twitter-login', {
            templateUrl: "static-pages/twitter-login.tpl.html",
            controller: "TwitterLoginCtrl"
        })
    })

    .controller("TwitterLoginCtrl", function($scope){
        console.log("twitter page controller is running!")

    })


    .controller("LoginCtrl", function ($scope, $location, $http, $auth, $rootScope, Person) {
        console.log("kenny loggins page controller is running!")


        var searchObject = $location.search();
        var code = searchObject.code
        if (!code){
            $location.path("/")
            return false
        }

        var requestObj = {
            code: code,
            redirectUri: window.location.origin + "/login"
        }

        $http.post("api/auth/orcid", requestObj)
            .success(function(resp){
                console.log("got a token back from ye server", resp)
                $auth.setToken(resp.token)
                var payload = $auth.getPayload()

                $rootScope.sendCurrentUserToIntercom()
                $location.url("u/" + payload.sub)
            })
            .error(function(resp){
              console.log("problem getting token back from server!", resp)
                $location.url("/")
            })






    })

    .controller("LandingPageCtrl", function ($scope,
                                             $mdDialog,
                                             $rootScope,
                                             $timeout) {
        $scope.global.showBottomStuff = false;
        console.log("landing page!", $scope.global)

        var orcidModalCtrl = function($scope){
            console.log("IHaveNoOrcidCtrl ran" )
            $scope.modalAuth = function(){
                $mdDialog.hide()
            }
        }

        $scope.noOrcid = function(ev){
            $mdDialog.show({
                controller: orcidModalCtrl,
                templateUrl: 'orcid-dialog.tmpl.html',
                clickOutsideToClose:true,
                targetEvent: ev
            })
                .then(
                function(){
                    $rootScope.authenticate("signin")
                },
                function(){
                    console.log("they cancelled the dialog")
                }
            )


        }

    })
    .controller("IHaveNoOrcidCtrl", function($scope){
        console.log("IHaveNoOrcidCtrl ran" )
    })











angular.module('templates.app', ['about-pages/about-badges.tpl.html', 'about-pages/about-data.tpl.html', 'about-pages/about-legal.tpl.html', 'about-pages/about-orcid.tpl.html', 'about-pages/about.tpl.html', 'about-pages/sample.tpl.html', 'about-pages/search.tpl.html', 'badge-page/badge-page.tpl.html', 'footer/footer.tpl.html', 'header/header.tpl.html', 'header/search-result.tpl.html', 'helps.tpl.html', 'loading.tpl.html', 'person-page/person-page-text.tpl.html', 'person-page/person-page.tpl.html', 'product-page/product-page.tpl.html', 'settings-page/settings-page.tpl.html', 'sidemenu.tpl.html', 'static-pages/landing.tpl.html', 'static-pages/login.tpl.html', 'static-pages/twitter-login.tpl.html', 'workspace.tpl.html']);

angular.module("about-pages/about-badges.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("about-pages/about-badges.tpl.html",
    "<div class=\"page about-badges\">\n" +
    "    <h2>Impactstory achievements</h2>\n" +
    "    <div class=\"intro\">\n" +
    "        <p>Achievements are a way of looking beyond the numbers to find stories that matter:\n" +
    "            stories the buzz your research is generating, the level of engagement with your work,\n" +
    "            your openness, and some lighthearted fun from time to time.\n" +
    "\n" +
    "        </p>\n" +
    "    </div>\n" +
    "    <div class=\"main\">\n" +
    "\n" +
    "        <div class=\"badge-group\" ng-repeat=\"badgeGroup in badgeGroups | orderBy: 'sortLevel'\">\n" +
    "            <div class=\"about {{ badgeGroup.name }}\">\n" +
    "                <h4 class=\"badge-group {{ badgeGroup.name }}\" id=\"{{ badgeGroup.name }}\">\n" +
    "                    <i class=\"fa fa-{{ getBadgeIcon(badgeGroup.name) }}\"></i>\n" +
    "                    <span class=\"name\">{{ badgeGroup.name }}</span>\n" +
    "                </h4>\n" +
    "\n" +
    "\n" +
    "                <p class=\"def buzz\" ng-show=\"badgeGroup.name=='buzz'\">\n" +
    "                    <strong>Buzz</strong> is the volume of discussion (good and bad)\n" +
    "                    around your research. It's a good&mdash;if coarse&mdash;measure of online interest around\n" +
    "                    your work.\n" +
    "                </p>\n" +
    "                <p class=\"def engagement\" ng-show=\"badgeGroup.name=='engagement'\">\n" +
    "                    <strong>Engagement</strong> is about <em>how</em> people are interacting with your\n" +
    "                        research online. What's the quality of the discussion, who is having it, and where?\n" +
    "                </p>\n" +
    "                <p class=\"def openness\" ng-show=\"badgeGroup.name=='openness'\">\n" +
    "                    <strong>Openness</strong> makes it easy for people to read and use\n" +
    "                    your research.\n" +
    "                </p>\n" +
    "                <p class=\"def fun\" ng-show=\"badgeGroup.name=='fun'\">\n" +
    "                    <strong>Fun</strong> achievements are Not So Serious.\n" +
    "                </p>\n" +
    "            </div>\n" +
    "            <div class=\"badges-wrapper row\"\n" +
    "                 ng-include=\"'badge-item.tpl.html'\"\n" +
    "                 ng-repeat=\"badge in badgeGroup.badges\">\n" +
    "\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "</div>");
}]);

angular.module("about-pages/about-data.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("about-pages/about-data.tpl.html",
    "<div class=\"page about about-data\">\n" +
    "    <h2>About the data</h2>\n" +
    "\n" +
    "\n" +
    "    <h3 id=\"data-sources\">Data sources</h3>\n" +
    "    <ul>\n" +
    "        <li>\n" +
    "            <a href=\"http://www.altmetric.com\">Altmetric</a> supplies most of our data for tracking the online\n" +
    "            impact of publications.\n" +
    "        </li>\n" +
    "        <li>\n" +
    "            <a href=\"https://www.base-search.net/\">BASE</a> helps us find free fulltext for articles.\n" +
    "        </li>\n" +
    "        <li>\n" +
    "            <a href=\"http://dev.mendeley.com\">Mendeley</a> gives us information about how articles are saved on their\n" +
    "            reference manager platform.\n" +
    "        </li>\n" +
    "        <li>\n" +
    "            <a href=\"http://www.crossref.org\">CrossRef</a> helps us find metadata for articles that have DOIs.\n" +
    "        </li>\n" +
    "        <li>\n" +
    "            <a href=\"http://www.orcid.org\">ORCID</a> provides researcher identity management services that form the backbone\n" +
    "            of our profile system.\n" +
    "        </li>\n" +
    "        <li>\n" +
    "            <a href=\"http://twitter.com\">Twitter</a> supplies a convenient identity provider for signin (also, more Twitter\n" +
    "            analytics are on the roadmap).\n" +
    "        </li>\n" +
    "    </ul>\n" +
    "\n" +
    "    <!--\n" +
    "    <h3 id=\"metrics\">Metrics</h3>\n" +
    "    <p>\n" +
    "        We're currently working on this section. Stay tuned...\n" +
    "    </p>\n" +
    "    -->\n" +
    "\n" +
    "    <h3 id=\"publications\">Publications</h3>\n" +
    "    <p>\n" +
    "        Impactstory uses ORCID to find and import your scholarly works.\n" +
    "        Are you missing publications on Impactstory? Here's how to fix it.\n" +
    "    </p>\n" +
    "    <div class=\"ways-to-fix-missing-publications\">\n" +
    "        <h4>\n" +
    "            <strong>1.</strong>\n" +
    "            Get your publications into your ORCID</h4>\n" +
    "        <p>\n" +
    "            Since we import from ORCID, if your ORCID is missing articles then so are we.\n" +
    "            Visit your ORCID to make sure it's got all your work. If not,\n" +
    "            use their <em>Scopus</em> importer to remedy that situation:\n" +
    "            <img src=\"static/img/gif/orcid-import-scopus.gif\" width=\"400\">\n" +
    "        </p>\n" +
    "\n" +
    "        <h4>\n" +
    "            <strong>2.</strong>\n" +
    "            Ensure your works are Public on ORCID\n" +
    "        </h4>\n" +
    "        <p>\n" +
    "            Once you've got all your publications on your ORCID, we need to make sure\n" +
    "            Impactstory can see them. To do that, make sure their privacy is set to Public.\n" +
    "            If not, it's easy to fix:\n" +
    "            <img src=\"static/img/gif/orcid-set-public.gif\" width=\"400\">\n" +
    "        </p>\n" +
    "        <h4>\n" +
    "            <strong>3.</strong>\n" +
    "            Re-sync Impactstory ORCID\n" +
    "        </h4>\n" +
    "        <p>\n" +
    "           If you've made any changes to your ORCID, they'll get synced over to Impactstory\n" +
    "            automatically within 24 hours. Or if you're feeling like some instant gratification,\n" +
    "            you can sync manually from your Settings page: just click the\n" +
    "            <i class=\"fa fa-gear\"></i> icon at the top right of the page, then\n" +
    "            click \"Sync with my ORCID now.\"\n" +
    "        </p>\n" +
    "        <!--\n" +
    "        <h4><i class=\"fa fa-check\"></i>Get DOIs for your remaining works</h4>\n" +
    "        <p>\n" +
    "            Some small publishers don't assign DOIs. Neither do YouTube, SlideShare, or\n" +
    "            other mainstream content hosts. You can't fix this for the original versions.\n" +
    "\n" +
    "            But you can archive your publications\n" +
    "            in a <em>repository</em> to get a DOI for the new, persistently-archived version. Then you can import the new DOI into\n" +
    "            ORCID and Impactstory as normal. Here's an article detailing how:\n" +
    "            <a href=\"http://blog.impactstory.org/impact-challenge-dois/\">\n" +
    "                Archive your articles, slides, datasets, and more.\n" +
    "            </a>\n" +
    "        </p>\n" +
    "        -->\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "</div>");
}]);

angular.module("about-pages/about-legal.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("about-pages/about-legal.tpl.html",
    "<div class=\"page about-legal\">\n" +
    "    <h2>Coming real soon</h2>\n" +
    "\n" +
    "</div>");
}]);

angular.module("about-pages/about-orcid.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("about-pages/about-orcid.tpl.html",
    "<div class=\"page about about-orcid\">\n" +
    "    <h2>Impactstory and ORCID</h2>\n" +
    "\n" +
    "    <h3>Auto-generated profiles</h3>\n" +
    "    <p>\n" +
    "        ORCID users control all access to their data, but many ORCID users choose to make their data public.\n" +
    "    </p>\n" +
    "    <p>\n" +
    "        We've used open data from public ORCID profiles to help us auto-generate some Impactstory profiles. These\n" +
    "        auto-generated profiles help us build robust percentile information, since we can compare any given\n" +
    "        user to a nice large set of scholars at large.\n" +
    "    </p>\n" +
    "    <p>\n" +
    "        If you've got an auto-generated ORCID profile, you'll probably want to log in to claim it&mdash;it's\n" +
    "        as simple as logging in to your ORCID account and takes just a few seconds. Once you've logged in,\n" +
    "        you can get start getting email updates on new online impacts, as well as also modify or delete your\n" +
    "        profile if you'd like.\n" +
    "    </p>\n" +
    "    <p>\n" +
    "        If you have any trouble logging in, just drop us a line and we'll be glad to help.\n" +
    "    </p>\n" +
    "\n" +
    "\n" +
    "\n" +
    "</div>");
}]);

angular.module("about-pages/about.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("about-pages/about.tpl.html",
    "<div class=\"page about about-page\" id=\"about\">\n" +
    "\n" +
    "   <div class=\"wrapper\">\n" +
    "      <h2 class=\"infopage-heading\">About</h2>\n" +
    "\n" +
    "\n" +
    "      <p>Impactstory is an open-source website that helps researchers explore and share the the\n" +
    "          online impact of their research.\n" +
    "      </p>\n" +
    "       <p>\n" +
    "\n" +
    "          By helping researchers tell data-driven stories about their work,\n" +
    "          we're helping to build a new scholarly reward system that values and encourages web-native scholarship.\n" +
    "          We’re funded by the National Science Foundation and the Alfred P. Sloan Foundation and\n" +
    "          incorporated as a 501(c)(3) nonprofit corporation.\n" +
    "       </p>\n" +
    "       <p>\n" +
    "           Contact us via <a href=\"mailto:team@impactstory.org\">email</a> or\n" +
    "           <a href=\"http://twitter.com/impactstory\">Twitter.</a>\n" +
    "\n" +
    "       </p>\n" +
    "       <p>\n" +
    "           Learn more on our\n" +
    "           <a href=\"about/data\">data sources</a> and\n" +
    "           <a href=\"about/achievements\">achievements</a> pages.\n" +
    "       </p>\n" +
    "\n" +
    "      <!--\n" +
    "      <p>Impactstory delivers <em>open metrics</em>, with <em>context</em>, for <em>diverse products</em>:</p>\n" +
    "      <ul>\n" +
    "         <li><b>Open metrics</b>: Our data (to the extent allowed by providers’ terms of service), <a href=\"https://github.com/total-impact\">code</a>, and <a href=\"http://blog.impactstory.org/2012/03/01/18535014681/\">governance</a> are all open.</li>\n" +
    "         <li><b>With context</b>: To help scientists move from raw <a href=\"http://altmetrics.org/manifesto/\">altmetrics</a> data to <a href=\"http://asis.org/Bulletin/Apr-13/AprMay13_Piwowar_Priem.html\">impact profiles</a> that tell data-driven stories, we sort metrics by <em>engagement type</em> and <em>audience</em>. We also normalize based on comparison sets: an evaluator may not know if 5 forks on GitHub is a lot of attention, but they can understand immediately if their project ranked in the 95th percentile of all GitHub repos created that year.</li>\n" +
    "         <li><b>Diverse products</b>: Datasets, software, slides, and other research products are presented as an integrated section of a comprehensive impact report, alongside articles&mdash;each genre a first-class citizen, each making its own kind of impact.</li>\n" +
    "      </ul>\n" +
    "      -->\n" +
    "\n" +
    "      <h3 id=\"team\">team</h3>\n" +
    "\n" +
    "      <div class=\"team-member first\">\n" +
    "         <img src=\"/static/img/heather.jpg\" height=100/>\n" +
    "         <p><strong>Heather Piwowar</strong> is a cofounder of Impactstory and a leading researcher in research data availability and data reuse. She wrote one of the first papers measuring the <a href=\"http://www.plosone.org/article/info:doi/10.1371/journal.pone.0000308\">citation benefit of publicly available research data</a>, has studied  <a href=\"http://www.plosone.org/article/info:doi/10.1371/journal.pone.0018657\">patterns in  data archiving</a>, <a href=\"https://peerj.com/preprints/1/\">patterns of data reuse</a>, and the <a href=\"http://researchremix.wordpress.com/2010/10/12/journalpolicyproposal\">impact of journal data sharing policies</a>.</p>\n" +
    "\n" +
    "         <p>Heather has a bachelor’s and master’s degree from MIT in electrical engineering, 10 years of experience as a software engineer, and a Ph.D. in Biomedical Informatics from the U of Pittsburgh.  She is an <a href=\"http://www.slideshare.net/hpiwowar\">frequent speaker</a> on research data archiving, writes a well-respected <a href=\"http://researchremix.wordpress.com\">research blog</a>, and is active on twitter (<a href=\"http://twitter.com/researchremix\">@researchremix</a>). </p>\n" +
    "      </div>\n" +
    "\n" +
    "      <div class=\"team-member subsequent\">\n" +
    "         <img src=\"/static/img/jason.jpg\" height=100/>\n" +
    "         <p><strong>Jason Priem</strong> is a cofounder of Impactstory and a doctoral student in information science (currently on leave of absence) at the University of North Carolina-Chapel Hill. Since <a href=\"https://twitter.com/jasonpriem/status/25844968813\">coining the term \"altmetrics,\"</a> he's remained active in the field, organizing the annual <a href=\"http:altmetrics.org/altmetrics12\">altmetrics workshops</a>, giving <a href=\"http://jasonpriem.org/cv/#invited\">invited talks</a>, and publishing <a href=\"http://jasonpriem.org/cv/#refereed\">peer-reviewed altmetrics research.</a></p>\n" +
    "\n" +
    "         <p>Jason has contributed to and created several open-source software projects, including <a href=\"http://www.zotero.org\">Zotero</a> and <a href=\"http://feedvis.com\">Feedvis</a>, and has experience and training in art, design, and information visualisation.  Sometimes he writes on a <a href=\"http://jasonpriem.org/blog\">blog</a> and <a href=\"https://twitter.com/#!/jasonpriem\">tweets</a>.</p>\n" +
    "      </div>\n" +
    "\n" +
    "      <div class=\"clearfix\"></div>\n" +
    "\n" +
    "\n" +
    "      <h3 id=\"history\">history</h3>\n" +
    "      <p>Impactstory began life as total-impact, a hackathon project at the Beyond Impact workshop in 2011. As the hackathon ended, a few of us migrated into a hotel hallway to continue working, eventually completing a 24-hour coding marathon to finish a prototype. Months of spare-time development followed, then funding.  We’ve got the same excitement for Impactstory today.</p>\n" +
    "\n" +
    "      <p>In early 2012, Impactstory was given £17,000 through the <a href=\"http://beyond-impact.org/\">Beyond Impact project</a> from the <a href=\"http://www.soros.org/\">Open Society Foundation</a>.  Today Impactstory is funded by the <a href=\"http://sloan.org/\">Alfred P. Sloan Foundation</a>, first through <a href=\"http://blog.impactstory.org/2012/03/29/20131290500/\">a $125,000 grant</a> in mid 2012 and then <a href=\"http://blog.impactstory.org/2013/06/17/sloan/\">a two-year grant for $500,000</a> starting in 2013.  We also received <a href=\"http://blog.impactstory.org/2013/09/27/impactstory-awarded-300k-nsf-grant/\">a $300,000 grant</a> from the National Science Foundation to study how automatically-gathered impact metrics can improve the reuse of research software. </p>\n" +
    "\n" +
    "      <h3 id=\"why\">philosophy</h3>\n" +
    "      <p>As a philanthropically-funded not-for-profit, we're in this because we believe open altmetrics are key for building the coming era of Web-native science. We're committed to:</p>\n" +
    "      <ul>\n" +
    "         <li><a href=\"https://github.com/impactstory\">open source</a></li>\n" +
    "         <li><a href=\"http://blog.impactstory.org/2012/06/08/24638498595/\">free and open data</a>, to the extent permitted by data providers</li>\n" +
    "         <li><a href=\"http://en.wikipedia.org/wiki/Radical_transparency\">Radical transparency</a> and <a href=\"http://blog.impactstory.org\">open communication</a></li>\n" +
    "      </ul>\n" +
    "\n" +
    "      <h3 id=\"board\">board of directors</h3>\n" +
    "\n" +
    "      <div class=\"board-member\">\n" +
    "         <img src=\"http://i.imgur.com/G4wUQb8.png\" height=100/>\n" +
    "         <p><strong>Heather Joseph</strong> is the Executive Director of the <a href=\"http://www.sparc.arl.org/\">Scholarly Publishing and Academic Resources Coalition (SPARC)</a> and the convener of the\n" +
    "            <a href=\"http://www.taxpayeraccess.org/\">Alliance for Taxpayer Access</a>. Prior to coming to SPARC, she spent 15 years as a publisher in both commercial and not-for-profit publishing organizations. She served as the publishing director at the American Society for Cell Biology, which became the first journal to commit its full content to the NIH’s pioneering open repository, PubMed Central.</p>\n" +
    "\n" +
    "         <p>Heather serves on the Board of Directors of numerous not-for-profit organizations, including the\n" +
    "            <a href=\"http://www.plos.org\">Public Library of Science</a>.  She is a frequent speaker and writer on scholarly communications in general, and on open access in particular.</p>\n" +
    "      </div>\n" +
    "\n" +
    "      <div class=\"board-member\">\n" +
    "         <img src=\"http://i.imgur.com/dVJPqlw.png\" height=100/>\n" +
    "         <p><strong>Ethan White</strong> is an Associate Professor and Moore Investigator in the Department of Wildlife Ecology and Conservation and the Informatics Institute at the University of Florida.\n" +
    "\n" +
    "\n" +
    "             He studies ecological systems using data-intensive approaches and is actively involved in open approaches to science. He has written papers on <a href=\"http://dx.doi.org/10.4033/iee.2013.6b.6.f\">data management and sharing</a>, <a href=\"http://dx.doi.org/10.1371/journal.pbio.1001745\">best practices in computational science</a>, and <a href=\"http://dx.doi.org/10.1371/journal.pbio.1001563\">the benefits of preprints in biology</a>.</p>\n" +
    "         <p>Ethan has a PhD in Biology from the University of New Mexico, was a National Science Foundation Postdoctoral Fellow in biological informatics, and is the recipient of a National Science Foundation CAREER 'Young Investigators' Award. He speaks frequently about data-intensive approaches to ecology, co-writes a <a href=\"http://jabberwocky.weecology.org\">blog on ecology, academia, and open science</a>, develops material and serves as an instructor for <a href=”http://software-carpentry.org/”>Software Carpentry</a>, and is active on Twitter(<a href=\"https://twitter.com/ethanwhite/\">@ethanwhite</a>).</p>\n" +
    "      </div>\n" +
    "\n" +
    "      <div class=\"board-member\">\n" +
    "         <img src=\"http://static.tumblr.com/2d33e55fcae6625ea29a0ea14e6b99df/5mlmvbq/O15n1w7ty/tumblr_static_headshot_informal.jpg\" height=100/>\n" +
    "         <p><strong>John Wilbanks</strong> works at <a href=\"http://www.sagebase.org/our-leadership/\">Sage Bionetworks</a>, which helps build <a href=\"http://www.sagebase.org/governance/\">tools and policies</a> that help <a href=\"http://www.sagebase.org/bridge/\">networks of people who have their health data</a> share it with <a href=\"http://synapse.sagebase.org\">networks of people who like to analyze health data</a>.\n" +
    "         </p>\n" +
    "         <p>Previously, John worked at Harvard’s <a href=\"http://cyber.law.harvard.edu\">Berkman Center for Internet &amp; Society</a>, the <a href=\"http://www.w3.org/2001/sw/\" title=\"Semantic Web - World Wide Web Consortium\" target=\"_self\">World Wide Web Consortium</a>, the <a href=\"http://en.wikipedia.org/wiki/Pete_Stark\" title='Fortney \"Pete\" Stark' target=\"_self\">US House of Representatives</a>, <a href=\"http://creativecommons.org\" title=\"Creative Commons\" target=\"_self\">Creative Commons</a>, and the <a href=\"http://kauffman.org\">Ewing Marion Kauffman Foundation</a>. John also serves on the board of the non-profit\n" +
    "            <a href=\"http://earthsciencefoundation.org/\">Foundation for Earth Science</a> and advisory boards for companies including <a href=\"http://www.boundlesslearning.com/\">Boundless Learning</a>,  <a href=\"http://www.crunchbase.com/company/curious-inc\">Curious</a>,  <a href=\"http://genomera.com\">Genomera</a>, <a href=\"http://www.qualcommlife.com/\">Qualcomm Life</a>, <a href=\"http://patientslikeme.com\">Patients Like Me</a>, and <a href=\"http://www.genospace.com/\">GenoSpace</a>.</p>\n" +
    "      </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "      <div id=\"contact\">\n" +
    "         <h3>Contact</h3>\n" +
    "         <p>We'd love to hear your feedback, ideas, or just chat! Reach us at <a href=\"mailto:team@impactstory.org\">team@impactstory.org</a> or on <a href=\"http://twitter.com/Impactstory\">twitter</a>.\n" +
    "      </div>\n" +
    "\n" +
    "\n" +
    "   </div><!-- end wrapper -->\n" +
    "</div>");
}]);

angular.module("about-pages/sample.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("about-pages/sample.tpl.html",
    "<div class=\"page products-sample\">\n" +
    "    <h2>Here's a sample of {{ products.length }} articles</h2>\n" +
    "\n" +
    "    <div class=\"main\">\n" +
    "        <div class=\"product row\" ng-repeat=\"product in products\">\n" +
    "            <div class=\"id col-xs-2\">{{ product.id }}</div>\n" +
    "            <div class=\"link col-xs-10\">\n" +
    "                <a href=\"http://doi.org/{{ product.doi }}\">{{ product.title }}</a>\n" +
    "\n" +
    "            </div>\n" +
    "\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("about-pages/search.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("about-pages/search.tpl.html",
    "<div class=\"page search\">\n" +
    "    <h2>Search for people</h2>\n" +
    "\n" +
    "    <div class=\"main\" ng-show=\"!loading\">\n" +
    "        <md-autocomplete\n" +
    "                md-selected-item=\"ctrl.selectedItem\"\n" +
    "                md-search-text=\"ctrl.searchText\"\n" +
    "                md-selected-item-change=\"onSearchSelect(person)\"\n" +
    "                md-items=\"person in search(ctrl.searchText)\"\n" +
    "                md-item-text=\"person.name\"\n" +
    "                md-min-length=\"3\"\n" +
    "                md-autofocus=\"true\">\n" +
    "\n" +
    "            <md-item-template>\n" +
    "                <span class=\"search-item\" md-highlight-text=\"ctrl.searchText\">{{person.name}}</span>\n" +
    "            </md-item-template>\n" +
    "\n" +
    "        </md-autocomplete>\n" +
    "        <p>\n" +
    "            You're searching against\n" +
    "            <span class=\"count\">{{ numProfiles }}</span>\n" +
    "            Impactstory profiles.\n" +
    "        </p>\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("badge-page/badge-page.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("badge-page/badge-page.tpl.html",
    "<div class=\"page badge-page\">\n" +
    "    <a href=\"/u/{{ person.orcid_id }}\" class=\"back-to-profile\">\n" +
    "        <i class=\"fa fa-chevron-left\"></i>\n" +
    "        Back to {{ person.given_names }}'s profile\n" +
    "\n" +
    "    </a>\n" +
    "    <div class=\"who-earned-it\">\n" +
    "        {{ person.given_names }} earned this badge\n" +
    "        <span class=\"earned-time\">\n" +
    "         {{ moment(badge.created).fromNow() }}:\n" +
    "        </span>\n" +
    "    </div>\n" +
    "\n" +
    "    <h2>\n" +
    "        <i class=\"fa fa-circle badge-level-{{ badge.level }}\"></i>\n" +
    "        <span class=\"name\">\n" +
    "            {{ badge.display_name }}\n" +
    "        </span>\n" +
    "    </h2>\n" +
    "    <div class=\"various-descriptions\">\n" +
    "        <div class=\"description\">\n" +
    "            {{ badge.description }}\n" +
    "        </div>\n" +
    "        <div class=\"extra-description\" ng-show=\"badge.extra_description\">\n" +
    "            <i class=\"fa fa-info-circle\"></i>\n" +
    "            <div class=\"text\" ng-bind-html=\"trustHtml(badge.extra_description)\"></div>\n" +
    "        </div>\n" +
    "        <div class=\"level-description\">\n" +
    "            <span class=\"gold\" ng-show=\"badge.level=='gold'\">\n" +
    "                This is a <span class=\"level badge-level-gold\">gold-level badge.</span>\n" +
    "                That's impressive, gold badges are rarely awarded!\n" +
    "            </span>\n" +
    "            <span class=\"silver\" ng-show=\"badge.level=='silver'\">\n" +
    "                This is a <span class=\"level badge-level-silver\">silver-level badge.</span>\n" +
    "                That's pretty good, Silver badges are not easy to get!\n" +
    "            </span>\n" +
    "            <span class=\"gold\" ng-show=\"badge.level=='bronze'\">\n" +
    "                This is a <span class=\"level badge-level-bronze\">bronze-level badge.</span>\n" +
    "                They are relatively easy to get but nothing to sneeze at!\n" +
    "            </span>\n" +
    "\n" +
    "            <span class=\"learn-more\">\n" +
    "                You can learn more about badges on our <a href=\"/about/badges\">About Badges page.</a>\n" +
    "            </span>\n" +
    "\n" +
    "        </div>\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"support\" ng-show=\"badge.support\">\n" +
    "        <pre>{{ badge.support }}</pre>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"products\" ng-show=\"badge.dois.length\">\n" +
    "        <h3>{{ person.given_names }} earned this badge based on\n" +
    "            {{ badge.dois.length }} product<span ng-show=\"badge.dois.length > 1\">s</span>:</h3>\n" +
    "        <table>\n" +
    "            <thead>\n" +
    "                <th class=\"biblio\"></th>\n" +
    "                <th class=\"sources\"></th>\n" +
    "                <tn class=\"score\"></tn>\n" +
    "                <tn class=\"has-new\"></tn>\n" +
    "            </thead>\n" +
    "            <tbody>\n" +
    "                <tr ng-repeat=\"product in badgeProducts | orderBy : '-altmetric_score'\">\n" +
    "                    <td class=\"biblio\">\n" +
    "                        <div class=\"title\">\n" +
    "                            {{ product.title }}\n" +
    "                        </div>\n" +
    "                        <div class=\"more\">\n" +
    "                            <span class=\"year\">{{ product.year }}</span>\n" +
    "                            <span class=\"journal\">{{ product.journal }}</span>\n" +
    "                        </div>\n" +
    "                    </td>\n" +
    "                    <td class=\"sources has-oodles-{{ product.sources.length > 6 }}\">\n" +
    "                        <span class=\"source-icon\"\n" +
    "                              tooltip=\"a million wonderful things\"\n" +
    "                              ng-repeat=\"source in product.sources | orderBy: 'posts_count'\">\n" +
    "                            <img src=\"/static/img/favicons/{{ source.source_name }}.ico\">\n" +
    "                        </span>\n" +
    "                    </td>\n" +
    "                    <td class=\"score\">\n" +
    "                        {{ numFormat.short(product.altmetric_score) }}\n" +
    "                    </td>\n" +
    "                    <td class=\"has-new\">\n" +
    "                        <i class=\"fa fa-arrow-up\" ng-show=\"product.events_last_week_count > 0\"></i>\n" +
    "                    </td>\n" +
    "\n" +
    "                </tr>\n" +
    "            </tbody>\n" +
    "\n" +
    "        </table>\n" +
    "\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "</div>");
}]);

angular.module("footer/footer.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("footer/footer.tpl.html",
    "<div id=\"footer\" ng-controller=\"footerCtrl\">\n" +
    "\n" +
    "\n" +
    "\n" +
    "    <div class=\"links\">\n" +
    "        <a href=\"/about\">\n" +
    "            <i class=\"fa fa-info-circle\"></i>\n" +
    "            About\n" +
    "        </a>\n" +
    "        <a href=\"https://github.com/Impactstory/depsy\">\n" +
    "            <i class=\"fa fa-github\"></i>\n" +
    "            GitHub\n" +
    "        </a>\n" +
    "        <a href=\"https://twitter.com/depsy_org\">\n" +
    "            <i class=\"fa fa-twitter\"></i>\n" +
    "            Twitter\n" +
    "        </a>\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "    <div id=\"mc_embed_signup\">\n" +
    "        <form action=\"//impactstory.us4.list-manage.com/subscribe/post?u=26fcc4e14b24319755845d9e0&amp;id=c9dd1339cd\" method=\"post\" id=\"mc-embedded-subscribe-form\" name=\"mc-embedded-subscribe-form\" class=\"validate\" target=\"_blank\" novalidate>\n" +
    "\n" +
    "            <div id=\"mc_embed_signup_scroll\" class=\"input-group\">\n" +
    "                <input class=\"form-control text-input\" type=\"email\" value=\"\" name=\"EMAIL\" class=\"email\" id=\"mce-EMAIL\" placeholder=\"Join the mailing list\" required>\n" +
    "           <span class=\"input-group-btn\">\n" +
    "              <input class=\"btn btn-default\" type=\"submit\" value=\"Go\" name=\"subscribe\" id=\"mc-embedded-subscribe\" class=\"button\">\n" +
    "           </span>\n" +
    "\n" +
    "                <!-- real people should not fill this in and expect good things - do not remove this or risk form bot signups-->\n" +
    "                <div style=\"position: absolute; left: -5000px;\"><input type=\"text\" name=\"b_26fcc4e14b24319755845d9e0_c9dd1339cd\" tabindex=\"-1\" value=\"\"></div>\n" +
    "            </div>\n" +
    "        </form>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"built-by\">\n" +
    "        Built with <i class=\"fa fa-heart\"></i> at <a href=\"http://impactstory.org/about\">Impactstory</a>,\n" +
    "        <br>\n" +
    "        with support from the National Science Foundation\n" +
    "    </div>\n" +
    "\n" +
    "</div>");
}]);

angular.module("header/header.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("header/header.tpl.html",
    "<div class=\"ti-header\" ng-controller=\"headerCtrl\">\n" +
    "   <h1>\n" +
    "      <a href=\"/\">\n" +
    "         <img src=\"static/img/logo-circle.png\" alt=\"\"/>\n" +
    "      </a>\n" +
    "   </h1>\n" +
    "\n" +
    "   <div class=\"ti-menu\">\n" +
    "      <a href=\"leaderboard?type=people\"\n" +
    "         popover=\"Top authors\"\n" +
    "         popover-trigger=\"mouseenter\"\n" +
    "         popover-placement=\"bottom\"\n" +
    "         class=\"menu-link\" id=\"leaders-menu-link\">\n" +
    "         <i class=\"fa fa-user\"></i>\n" +
    "      </a>\n" +
    "      <a href=\"leaderboard?type=packages\"\n" +
    "         popover=\"Top projects\"\n" +
    "         popover-trigger=\"mouseenter\"\n" +
    "         popover-placement=\"bottom\"\n" +
    "         class=\"menu-link\" id=\"leaders-menu-link\">\n" +
    "         <i class=\"fa fa-archive\"></i>\n" +
    "      </a>\n" +
    "      <a href=\"leaderboard?type=tags\"\n" +
    "         popover=\"Top topics\"\n" +
    "         popover-trigger=\"mouseenter\"\n" +
    "         popover-placement=\"bottom\"\n" +
    "         class=\"menu-link\" id=\"leaders-menu-link\">\n" +
    "         <i class=\"fa fa-tag\"></i>\n" +
    "      </a>\n" +
    "\n" +
    "      <!-- needs weird style hacks -->\n" +
    "      <a href=\"about\"\n" +
    "         class=\"menu-link about\" id=\"leaders-menu-link\">\n" +
    "         <i\n" +
    "         popover=\"Learn more about Depsy\"\n" +
    "         popover-trigger=\"mouseenter\"\n" +
    "         popover-placement=\"bottom\" class=\"fa fa-question-circle\"></i>\n" +
    "      </a>\n" +
    "\n" +
    "\n" +
    "   </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "   <div class=\"search-box\">\n" +
    "    <input type=\"text\"\n" +
    "           id=\"search-box\"\n" +
    "           ng-model=\"searchResultSelected\"\n" +
    "           placeholder=\"Search packages, authors, and topics\"\n" +
    "           typeahead=\"result as result.name for result in doSearch($viewValue)\"\n" +
    "           typeahead-loading=\"loadingLocations\"\n" +
    "           typeahead-no-results=\"noResults\"\n" +
    "           typeahead-template-url=\"header/search-result.tpl.html\"\n" +
    "           typeahead-focus-first=\"false\"\n" +
    "           typeahead-on-select=\"onSelect($item)\"\n" +
    "           class=\"form-control input-lg\">\n" +
    "   </div>\n" +
    "\n" +
    "\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "");
}]);

angular.module("header/search-result.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("header/search-result.tpl.html",
    "\n" +
    "<div class=\"typeahead-group-header\" ng-if=\"match.model.is_first\">\n" +
    "   <span class=\"group-header-type pypy-package\" ng-if=\"match.model.type=='pypi_project'\">\n" +
    "      <img src=\"static/img/python.png\" alt=\"\"/>\n" +
    "      Python packages <span class=\"where\">on <a href=\"https://pypi.python.org/pypi\">PyPI</a></span>\n" +
    "   </span>\n" +
    "   <span class=\"group-header-type cran-package\" ng-if=\"match.model.type=='cran_project'\">\n" +
    "      <img src=\"static/img/r-logo.png\" alt=\"\"/>\n" +
    "      R packages <span class=\"where\">on <a href=\"https://cran.r-project.org/\">CRAN</a></span>\n" +
    "   </span>\n" +
    "   <span class=\"group-header-type people\" ng-if=\"match.model.type=='person'\">\n" +
    "      <i class=\"fa fa-user\"></i>\n" +
    "      People\n" +
    "   </span>\n" +
    "   <span class=\"group-header-type tags\" ng-if=\"match.model.type=='tag'\">\n" +
    "      <i class=\"fa fa-tag\"></i>\n" +
    "      Tags\n" +
    "   </span>\n" +
    "\n" +
    "</div>\n" +
    "<a ng-href=\"package/python/{{ match.model.name }}\" ng-if=\"match.model.type=='pypi_project'\">\n" +
    "   <span class=\"name\">\n" +
    "      {{ match.model.name }}\n" +
    "   </span>\n" +
    "   <span  class=\"summary\">\n" +
    "      {{ match.model.summary }}\n" +
    "   </span>\n" +
    "</a>\n" +
    "<a ng-href=\"package/r/{{ match.model.name }}\" ng-if=\"match.model.type=='cran_project'\">\n" +
    "   <span class=\"name\">\n" +
    "      {{ match.model.name }}\n" +
    "   </span>\n" +
    "   <span  class=\"summary\">\n" +
    "      {{ match.model.summary }}\n" +
    "   </span>\n" +
    "</a>\n" +
    "<a ng-href=\"person/{{ match.model.id }}\" ng-if=\"match.model.type=='person'\">\n" +
    "   <span class=\"name\">\n" +
    "      {{ match.model.name }}\n" +
    "   </span>\n" +
    "</a>\n" +
    "<a ng-href=\"tag/{{ match.model.urlName }}\" ng-if=\"match.model.type=='tag'\">\n" +
    "   <span class=\"name\">\n" +
    "      {{ match.model.name }}\n" +
    "   </span>\n" +
    "   <span class=\"tag summary\">\n" +
    "      {{ match.model.impact }} packages\n" +
    "   </span>\n" +
    "</a>\n" +
    "\n" +
    "\n" +
    "");
}]);

angular.module("helps.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("helps.tpl.html",
    "\n" +
    "\n" +
    "\n" +
    "<p class=\"def buzz\" ng-show=\"subscoreName=='buzz'\">\n" +
    "    <strong>Buzz</strong> is the volume of discussion (good and bad)\n" +
    "    around your research, represented by\n" +
    "    the count of times your research is discussed online.\n" +
    "</p>\n" +
    "<p class=\"def influence\" ng-show=\"subscoreName=='influence'\">\n" +
    "    <strong>Influence</strong> is the average estimated <em>significance</em> of the sources\n" +
    "    discussing your research: Wikipedia counts for more than Facebook, and a tweeter\n" +
    "    with a million followers counts for more than one with a hundred.\n" +
    "</p>\n" +
    "<p class=\"def openness\" ng-show=\"subscoreName=='openness'\">\n" +
    "    <strong>Openness</strong> is how easy it is for people to actually read and use\n" +
    "    your research, estimated by the percent of your publications in\n" +
    "    <a href=\"https://en.wikipedia.org/wiki/Open_access#Journals:_gold_open_access\">Gold open-access</a>\n" +
    "    journals and repositories.\n" +
    "\n" +
    "</p>\n" +
    "<p class=\"def fun\" ng-show=\"subscoreName=='fun'\">\n" +
    "    <strong>Fun</strong> achievements are Not So Serious.\n" +
    "\n" +
    "</p>");
}]);

angular.module("loading.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("loading.tpl.html",
    "<div id=\"loading\">\n" +
    "     <md-progress-circular class=\"md-primary\"\n" +
    "                           md-diameter=\"100px\">\n" +
    "     </md-progress-circular>\n" +
    "</div>");
}]);

angular.module("person-page/person-page-text.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("person-page/person-page-text.tpl.html",
    "<div class=\"person-page-text\">\n" +
    "    <h1>{{ person.given_names }} {{ person.family_name }}</h1>\n" +
    "\n" +
    "    <h2>Top achievements</h2>\n" +
    "    yay me!\n" +
    "</div>");
}]);

angular.module("person-page/person-page.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("person-page/person-page.tpl.html",
    "<div ng-show=\"profileStatus=='blank'\" class=\"page person-incomplete blank\">\n" +
    "</div>\n" +
    "<div ng-show=\"profileStatus=='no_email'\" class=\"page person-incomplete set-email\">\n" +
    "    <div class=\"content\">\n" +
    "        <div class=\"encouragement\" ng-show=\"setEmailMethod=='twitter'\">\n" +
    "            <h2>\n" +
    "                <i class=\"fa fa-check\"></i>\n" +
    "                Nice work, you're nearly there!\n" +
    "            </h2>\n" +
    "            <p class=\"instructions twitter\">\n" +
    "                Once you've connected your Twitter account, your profile is complete.\n" +
    "            </p>\n" +
    "\n" +
    "        </div>\n" +
    "        <div class=\"encouragement\" ng-show=\"setEmailMethod=='direct'\">\n" +
    "            <h2  ng-show=\"setEmailMethod=='direct'\">\n" +
    "                No Twitter? No problem!\n" +
    "            </h2>\n" +
    "            <p class=\"instructions twitter\">\n" +
    "                Email is great, too. Enter it below and <em>poof</em>, your profile's ready.\n" +
    "            </p>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"action twitter\"\n" +
    "             ng-show=\"setEmailMethod=='twitter'\">\n" +
    "            <div class=\"btn btn-primary btn-lg\"\n" +
    "             ng-click=\"linkTwitter()\">\n" +
    "                <i class=\"fa fa-twitter\"></i>\n" +
    "                Connect my Twitter\n" +
    "            </div>\n" +
    "            <div class=\"btn btn-default btn-lg\" ng-click=\"setEmailMethod='direct'\">\n" +
    "                <i class=\"fa fa-times\"></i>\n" +
    "                I'm not on Twitter\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"action direct\" ng-show=\"setEmailMethod=='direct'\">\n" +
    "            <form class=\"user-input\" ng-submit=\"submitEmail()\">\n" +
    "                <div class=\"input-group\">\n" +
    "                    <span class=\"input-group-addon\">\n" +
    "                        <i class=\"fa fa-envelope-o\"></i>\n" +
    "                    </span>\n" +
    "                    <input ng-model=\"userForm.email\"\n" +
    "                           type=\"email\"\n" +
    "                           class=\"form-control input-lg\"\n" +
    "                           id=\"user-email\"\n" +
    "                           required\n" +
    "                           placeholder=\"Email\">\n" +
    "\n" +
    "                </div>\n" +
    "                <button type=\"submit\" class=\"btn btn-primary btn-lg\">Make my profile!</button>\n" +
    "            </form>\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "    </div>\n" +
    "\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "<div ng-show=\"profileStatus=='no_products'\" class=\"page person-incomplete add-products\">\n" +
    "    <div class=\"content\">\n" +
    "\n" +
    "        <h2>Uh-oh, we couldn't find any publications in your ORCID!</h2>\n" +
    "        <p>\n" +
    "            But don't worry, there's a solution! Go to\n" +
    "            <a href=\"http://orcid.org/{{ person.orcid_id }}\">your ORCID profile</a>\n" +
    "            and add some works using the Scopus importer. When you're done, make sure the\n" +
    "            works' visibility is set to \"Public,\"\n" +
    "\n" +
    "            <img class=\"inline\" src=\"static/img/gif/orcid-set-public-small.gif\">\n" +
    "\n" +
    "            then come back here and sync with ORCID.\n" +
    "            You'll be good to go in no time!\n" +
    "        </p>\n" +
    "        <div class=\"refresh\">\n" +
    "            <div class=\"btn btn-lg btn-primary\"  ng-show=\"!d.syncing\" ng-click=\"pullFromOrcid()\">\n" +
    "                <i class=\"fa fa-refresh\"></i>\n" +
    "                Did it, now sync me up!\n" +
    "            </div>\n" +
    "            <a href=\"/about/data#publications\" target=\"_blank\" ng-show=\"!d.syncing\">\n" +
    "                <i class=\"fa fa-question-circle-o\"></i>\n" +
    "                Nope, still not working\n" +
    "            </a>\n" +
    "            <div class=\"alert alert-info\" ng-show=\"d.syncing\">\n" +
    "                <i class=\"fa fa-refresh fa-spin\"></i>\n" +
    "                Syncing now...\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"screencast\">\n" +
    "            <img src=\"static/img/gif/orcid-import-scopus-from-nothing.gif\">\n" +
    "\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<div ng-show=\"profileStatus=='all_good'\" class=\"page person\">\n" +
    "    <div class=\"autogenerated\" ng-show=\"!person.claimed_at\">\n" +
    "        <span class=\"this-is\">\n" +
    "            This is an <a href=\"about/orcid\">auto-generated profile</a> and may be missing some data.\n" +
    "        </span>\n" +
    "        <span class=\"claim-this\">\n" +
    "            To update it,\n" +
    "            <a href=\"\" class=\"login\" ng-click=\"authenticate()\">log in with ORCID.</a>\n" +
    "        </span>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"person-header row\">\n" +
    "        <div class=\"col-md-9 person-about\">\n" +
    "            <div class=\"content\">\n" +
    "                <div class=\"avatar\">\n" +
    "                    <img ng-src=\"{{ person.picture }}\" alt=\"\"/>\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"bio\">\n" +
    "                    <h2 class=\"name\">\n" +
    "                       {{ person.given_names }} {{ person.family_name }}\n" +
    "\n" +
    "                        <span class=\"accounts\">\n" +
    "                            <a href=\"http://orcid.org/{{ person.orcid_id }}\">\n" +
    "                                <img src=\"static/img/favicons/orcid.ico\" alt=\"\">\n" +
    "                            </a>\n" +
    "                            <a href=\"http://depsy.org/person/{{ person.depsy_id }}\"\n" +
    "                                    ng-show=\"person.depsy_id\">\n" +
    "                                <img src=\"static/img/favicons/depsy.png\" alt=\"\">\n" +
    "                            </a>\n" +
    "                            <a href=\"http://twitter.com/{{ person.twitter }}\"\n" +
    "                               ng-show=\"person.twitter\"\n" +
    "                               class=\"twitter\">\n" +
    "                                <img src=\"static/img/favicons/twitter.ico\" alt=\"\">\n" +
    "                            </a>\n" +
    "                            <span class=\"link-twitter loading\" ng-show=\"d.linkTwitterLoading\">\n" +
    "                                <i class=\"fa fa-refresh fa-spin\"></i>\n" +
    "                                linking Twitter...\n" +
    "                            </span>\n" +
    "                            <a href=\"\" class=\"link-twitter btn btn-default btn-xs\"\n" +
    "                               ng-click=\"linkTwitter()\"\n" +
    "                               ng-show=\"!person.twitter && ownsThisProfile && !d.linkTwitterLoading\">\n" +
    "                                <i class=\"fa fa-twitter\"></i>\n" +
    "                                Connect your Twitter\n" +
    "                            </a>\n" +
    "\n" +
    "                        </span>\n" +
    "                    </h2>\n" +
    "                    <div class=\"aff\">\n" +
    "                        <span class=\"institution\">{{ person.affiliation_name }}</span>\n" +
    "                        <span class=\"role\">\n" +
    "                            {{ person.affiliation_role_title }}\n" +
    "                        </span>\n" +
    "                    </div>\n" +
    "                    <div class=\"person-profile-info\">\n" +
    "\n" +
    "                        <div class=\"person-score belt\">\n" +
    "                            <span class=\"subscore {{ subscore.name }}\"\n" +
    "                                  ng-class=\"{ unselected: selectedSubscore && selectedSubscore.name != subscore.name}\"\n" +
    "                                  ng-click=\"toggleSeletedSubscore(subscore)\"\n" +
    "                                  ng-show=\"subscore.badgesCount\"\n" +
    "                                  ng-repeat=\"subscore in subscores | orderBy: 'sortOrder' | filter: { name: '!fun' }\">\n" +
    "                                <i class=\"fa fa-{{ getBadgeIcon(subscore.name) }}\"></i>\n" +
    "                                <span class=\"number\">{{ subscore.badgesCount }}</span>\n" +
    "                            </span>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "        </div>\n" +
    "        <div class=\"col-md-3 person-actions\">\n" +
    "            <div class=\"tweet-profile\">\n" +
    "                <a href=\"https://twitter.com/intent/tweet?url=https://impactstory.org/u/{{ person.orcid_id }}&text=Check out the online impact of my research on @Impactstory:\"\n" +
    "                   target=\"_blank\"\n" +
    "                   ng-click=\"shareProfile()\"\n" +
    "                   ng-show=\"ownsThisProfile\"\n" +
    "                   class=\"btn btn-sm btn-default\">\n" +
    "                    <i class=\"fa fa-twitter\"></i>\n" +
    "                    <span class=\"text\">share</span>\n" +
    "                </a>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"no-products\" ng-show=\"!person.products.length\">\n" +
    "        <h2 class=\"main\">\n" +
    "            Looks we've got no publications for {{ person.first_name }}.\n" +
    "        </h2>\n" +
    "        <p>\n" +
    "            That's probably because {{ person.first_name }} hasn't associated any\n" +
    "            works with <a href=\"http://orcid.org/{{ person.orcid_id }}\">his or her ORCID profile.</a>\n" +
    "        </p>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"has-products\" ng-show=\"person.products.length\">\n" +
    "        <div class=\"tab-controls row tab-overview-{{ tab=='overview' }}\">\n" +
    "            <a class=\"tab overview selected-{{ tab=='overview' }}\" href=\"/u/{{ person.orcid_id }}\">overview</a>\n" +
    "            <a class=\"tab publications selected-{{ tab=='achievements' }}\" href=\"/u/{{ person.orcid_id }}/achievements\">achievements</a>\n" +
    "            <a class=\"tab publications selected-{{ tab=='activity' }}\" href=\"/u/{{ person.orcid_id }}/activity\">activity</a>\n" +
    "            <a class=\"tab publications selected-{{ tab=='publications' }}\" href=\"/u/{{ person.orcid_id }}/publications\">publications</a>\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "        <!-- OVERVIEW view -->\n" +
    "        <div class=\"tab-view overview row\" ng-if=\"tab=='overview'\">\n" +
    "            <div class=\"col-md-5\">\n" +
    "                <div class=\"badges widget\">\n" +
    "                    <div class=\"widget-header\">\n" +
    "                        <h3>Achievements</h3>\n" +
    "                        <a class=\"more\" href=\"/u/{{ person.orcid_id }}/achievements\">view all</a>\n" +
    "                    </div>\n" +
    "                    <div class=\"badges-wrapper\"\n" +
    "                         ng-include=\"'badge-item.tpl.html'\"\n" +
    "                         ng-repeat=\"badge in person.overview_badges | orderBy: '-sort_score' | limitTo: 3\">\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"col-md-7 big-col\">\n" +
    "                <div class=\"mentions activity widget\">\n" +
    "                    <div class=\"widget-header\">\n" +
    "                        <h3>Activity</h3>\n" +
    "                        <a class=\"more\" href=\"/u/{{ person.orcid_id }}/activity\">view all</a>\n" +
    "                    </div>\n" +
    "                    <div class=\"channels\">\n" +
    "                        <span class=\"val total-posts\">{{ postsSum }}</span>\n" +
    "                        <span class=\"ti-label\">Saves and shares across {{ sources.length }} channels:</span>\n" +
    "\n" +
    "                        <span class=\"channel\"\n" +
    "                              ng-class=\"{'more-than-3': $index > 3, 'more-than-8': $index > 8}\"\n" +
    "                              ng-repeat=\"channel in sources | orderBy: '-posts_count'\">\n" +
    "                            <img ng-src=\"/static/img/favicons/{{ channel.source_name }}.ico\"\n" +
    "                                 class=\"channel-icon {{ channel.source_name }}\">\n" +
    "                            <span class=\"val\">{{ numFormat.short(channel.posts_count) }}</span>\n" +
    "                        </span>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"publications widget\">\n" +
    "                    <div class=\"widget-header\">\n" +
    "                        <h3>Publications</h3>\n" +
    "                        <a class=\"more\" href=\"/u/{{ person.orcid_id }}/publications\">view all</a>\n" +
    "                    </div>\n" +
    "                    <div class=\"publication-wrapper\"\n" +
    "                         ng-include=\"'publication-item.tpl.html'\"\n" +
    "                         ng-repeat=\"product in products | orderBy: ['-num_mentions', '-is_oa_repository', '-is_oa_journal', 'doi'] | limitTo: 3\">\n" +
    "                    </div>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "        <!-- PUBLICATIONS view -->\n" +
    "        <div class=\"tab-view publications row\" ng-if=\"tab=='publications'\">\n" +
    "            <div class=\"col-md-8 publications-col main-col\">\n" +
    "                <h3>\n" +
    "                    {{ selectedGenre.count || products.length }}\n" +
    "                    <span class=\"no-filter\" ng-if=\"!selectedGenre\">\n" +
    "                        publication<span ng-show=\"products.length\">s</span>\n" +
    "                    </span>\n" +
    "\n" +
    "                    <span class=\"filter\" ng-if=\"selectedGenre\">\n" +
    "                        <span class=\"word\">published</span>\n" +
    "                        <span class=\"label label-default\">\n" +
    "                            <span class=\"content\">\n" +
    "                                <i class=\"fa fa-{{ getGenreIcon(selectedGenre.name) }}\"></i>\n" +
    "                                {{ pluralize(selectedGenre.display_name, selectedGenre.count) }}\n" +
    "                            </span>\n" +
    "                            <span class=\"close-button\" ng-click=\"toggleSeletedGenre(selectedGenre)\">&times;</span>\n" +
    "                        </span>\n" +
    "                    </span>\n" +
    "                    <a href=\"about/data#publications\"\n" +
    "                       ng-show=\"ownsThisProfile && !selectedGenre\"\n" +
    "                       class=\"missing-publications help hedge\">\n" +
    "                        <i class=\"fa fa-question-circle-o\"></i>\n" +
    "                        Are any missing?\n" +
    "                    </a>\n" +
    "                </h3>\n" +
    "                <div class=\"publication-wrapper\"\n" +
    "                     ng-if=\"$index < d.viewItemsLimit\"\n" +
    "                     ng-include=\"'publication-item.tpl.html'\"\n" +
    "                     ng-repeat=\"product in products | orderBy: ['-num_mentions', '-is_oa_repository', '-is_oa_journal', 'doi'] | filter:{genre: selectedGenre.name}:true as filteredPublications\">\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"more\">\n" +
    "                    <span class=\"btn btn-default btn-sm\"\n" +
    "                          ng-click=\"d.viewItemsLimit = d.viewItemsLimit + 20\"\n" +
    "                          ng-show=\"d.viewItemsLimit < filteredPublications.length\">\n" +
    "                        <i class=\"fa fa-arrow-down\"></i>\n" +
    "                        See more\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "\n" +
    "\n" +
    "            </div>\n" +
    "            <div class=\"col-md-4 badges-col small-col\">\n" +
    "\n" +
    "                <div class=\"filter-by-genre\" ng-show=\"genres.length > 1\">\n" +
    "                    <h4>Filter by genre</h4>\n" +
    "\n" +
    "                    <div class=\"genre-filter filter-option\"\n" +
    "                         ng-repeat=\"genre in genres\"\n" +
    "                         ng-class=\"{ unselected: selectedGenre && selectedGenre.name != genre.name, selected: selectedGenre.name == genre.name }\">\n" +
    "                        <span class=\"close-button\" ng-click=\"toggleSeletedGenre(genre)\">&times;</span>\n" +
    "                        <span class=\"content\" ng-click=\"toggleSeletedGenre(genre)\">\n" +
    "                            <span class=\"name\">\n" +
    "                                <i class=\"fa fa-{{ getGenreIcon(genre.name) }} icon\"></i>\n" +
    "                                {{ pluralize(genre.display_name, genre.count) }}\n" +
    "                            </span>\n" +
    "                            <span class=\"val\">({{ genre.count }})</span>\n" +
    "                        </span>\n" +
    "\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "                <div class=\"coauthors\" ng-show=\"person.coauthors.length\">\n" +
    "                    <h4>Coauthors</h4>\n" +
    "                    <div class=\"coauthor\" ng-repeat=\"coauthor in person.coauthors | orderBy: '-sort_score'\">\n" +
    "                        <span >\n" +
    "                            <a href=\"u/{{ coauthor.orcid_id }}\" class=\"name\">\n" +
    "                                {{ coauthor.name }}\n" +
    "                            </a>\n" +
    "                        </span>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "        <!-- BADGES view -->\n" +
    "        <div class=\"tab-view badges row\" ng-if=\"tab=='achievements'\">\n" +
    "            <div class=\"col-md-8 main-col\">\n" +
    "                <h3>\n" +
    "                    <span ng-show=\"filteredBadges.length\" class=\"amount\">{{ filteredBadges.length }}</span>\n" +
    "                    <span ng-show=\"!filteredBadges.length\" class=\"amount\">No</span>\n" +
    "                    achievement<span ng-hide=\"filteredBadges.length===1\">s</span>\n" +
    "                    <span ng-show=\"filteredBadges.length===0\" class=\"yet\">yet</span>\n" +
    "\n" +
    "                    <span class=\"filter\" ng-if=\"selectedSubscore\">\n" +
    "                        <span class=\"filter-intro\">in</span>\n" +
    "                        <span class=\"filter label label-default {{ selectedSubscore.name }}\">\n" +
    "                            <span class=\"content\">\n" +
    "                                <i class=\"icon fa fa-{{ getBadgeIcon(selectedSubscore.name) }}\"></i>\n" +
    "                                {{ selectedSubscore.display_name }}\n" +
    "                            </span>\n" +
    "                            <span class=\"close-button\" ng-click=\"toggleSeletedSubscore(selectedSubscore)\">&times;</span>\n" +
    "                        </span>\n" +
    "                    </span>\n" +
    "                </h3>\n" +
    "\n" +
    "                <div class=\"subscore-info\" ng-show=\"selectedSubscore\">\n" +
    "\n" +
    "\n" +
    "                    <!-- for all subscores -->\n" +
    "                    <div class=\"personalized\">\n" +
    "\n" +
    "\n" +
    "                        <span class=\"def buzz\" ng-show=\"selectedSubscore.name=='buzz'\">\n" +
    "                            <strong>Buzz</strong> is the volume of online discussion round your research.\n" +
    "                            It's a good (if coarse) measure of online interest around your work.\n" +
    "                        </span>\n" +
    "\n" +
    "                        <span class=\"def engagement\" ng-show=\"selectedSubscore.name=='engagement'\">\n" +
    "                            <strong>Engagement</strong> is about <em>how</em> people are interacting with your\n" +
    "                            research online. What's the quality of the discussion, who is having it, and where?\n" +
    "                        </span>\n" +
    "\n" +
    "\n" +
    "                        <span class=\"def openness\" ng-show=\"selectedSubscore.name=='openness'\">\n" +
    "                            <strong>Openness</strong> makes it easy for people to read and use\n" +
    "                            your research.\n" +
    "                        </span>\n" +
    "\n" +
    "                        <span class=\"def fun\" ng-show=\"selectedSubscore.name=='fun'\">\n" +
    "                            <strong>Fun</strong> achievements are Not So Serious.\n" +
    "                        </span>\n" +
    "\n" +
    "                        <span class=\"see-all-badges\">\n" +
    "                            You can see all the possible <span class=\"subscore-name\">{{ selectedSubscore.name }}</span>\n" +
    "                            achievements on their\n" +
    "                            <a class=\"{{ selectedSubscore.name }}\" href=\"/about/achievements#{{ selectedSubscore.name }}\">\n" +
    "                                help page.\n" +
    "                            </a>\n" +
    "                        </span>\n" +
    "\n" +
    "                        <div class=\"badges-count {{ selectedSubscore.name }}\">\n" +
    "\n" +
    "                            <!-- we've got some badges fro this subscore -->\n" +
    "                            <span class=\"some-badges\" ng-show=\"filteredBadges.length\">\n" +
    "                                You've earned {{ filteredBadges.length }} so far:\n" +
    "                            </span>\n" +
    "\n" +
    "                            <!-- no badges at all for this subscore-->\n" +
    "                            <span class=\"no-badges\" ng-show=\"!filteredBadges.length\">\n" +
    "                                <span class=\"subscore-badges\" ng-show=\"selectedSubscore.name!='fun'\">\n" +
    "                                    You haven't earned any yet&mdash;but if you keep doing great research and\n" +
    "                                    <a href=\"http://www.scidev.net/global/communication/practical-guide/altmetrics-audience-connect-research.html\">\n" +
    "                                        connecting it to a wide audience,\n" +
    "                                    </a>\n" +
    "                                    you will!\n" +
    "                                </span>\n" +
    "                                <span class=\"subscore-badges\" ng-show=\"selectedSubscore.name=='fun'\">\n" +
    "                                    You haven't earned any of them so far&mdash;but don't get us wrong, we know you are\n" +
    "                                    <a href=\"https://en.wikipedia.org/wiki/Happy_Fun_Ball\" class=\"fun\">super super fun.</a>\n" +
    "                                    Just, in ways our scholarly communication website cannot yet measure.\n" +
    "                                    Got an idea for a way we can fix that? Hit us up via\n" +
    "                                    <a href=\"http://twitter.com/impactstory\">Twitter</a> or\n" +
    "                                    <a href=\"mailto:team@impactstory.org\">email!</a>\n" +
    "                                </span>\n" +
    "                            </span>\n" +
    "\n" +
    "                        </div>\n" +
    "\n" +
    "\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "                <div class=\"badges-wrapper\"\n" +
    "                     ng-class=\"\"\n" +
    "                     ng-include=\"'badge-item.tpl.html'\"\n" +
    "                     ng-repeat=\"badge in badges | orderBy: '-sort_score' | filter: {group: selectedSubscore.name}:true as filteredBadges\">\n" +
    "                </div>\n" +
    "            </div>\n" +
    "\n" +
    "\n" +
    "            <div class=\"col-md-4 small-col\">\n" +
    "                <h4>Filter by dimension</h4>\n" +
    "                <div class=\"subscore filter-option {{ subscore.name }}\"\n" +
    "                    ng-class=\"{ unselected: selectedSubscore && selectedSubscore.name != subscore.name, selected: selectedSubscore.name == subscore.name }\"\n" +
    "                    ng-click=\"toggleSeletedSubscore(subscore)\"\n" +
    "                    ng-repeat=\"subscore in subscores | orderBy: 'sortOrder'\">\n" +
    "\n" +
    "                    <span class=\"close-button\">&times;</span>\n" +
    "                    <span class=\"content\">\n" +
    "                        <span class=\"name\">\n" +
    "                            <i class=\"icon fa fa-{{ getBadgeIcon(subscore.name) }}\"></i>\n" +
    "                            {{ subscore.display_name }}\n" +
    "                        </span>\n" +
    "                        <span class=\"val\" ng-show=\"subscore.badgesCount\">({{ subscore.badgesCount }})</span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "        <!-- MENTIONS view -->\n" +
    "        <div class=\"tab-view activity row\" ng-if=\"tab=='activity'\">\n" +
    "            <div class=\"col-md-8 posts-col main-col\">\n" +
    "                <h3>\n" +
    "                    <span class=\"ti-label\" ng-show=\"!selectedChannel\">saved and shared</span>\n" +
    "                    <span class=\"ti-label\" ng-show=\"selectedChannel && selectedChannel.source_name != 'mendeley'\">shared</span>\n" +
    "                    <span class=\"ti-label\" ng-show=\"selectedChannel.source_name=='mendeley'\">saved</span>\n" +
    "                    {{ selectedChannel.posts_count || postsSum }} times\n" +
    "\n" +
    "\n" +
    "                    <span class=\"filter\" ng-if=\"selectedChannel\">\n" +
    "                        <span class=\"filter-intro\">on</span>\n" +
    "                        <span class=\"filter label label-default\">\n" +
    "                            <span class=\"content\">\n" +
    "                                <img class=\"icon\" ng-src=\"/static/img/favicons/{{ selectedChannel.source_name }}.ico\">\n" +
    "                                {{ selectedChannel.source_name }}\n" +
    "                            </span>\n" +
    "                            <span class=\"close-button\" ng-click=\"toggleSelectedChannel(selectedChannel)\">&times;</span>\n" +
    "                        </span>\n" +
    "                    </span>\n" +
    "                </h3>\n" +
    "\n" +
    "                <!-- pseudo .view-item for mendeley so it can use same styles -->\n" +
    "                <div class=\"rollup mendeley-rollup view-item\"\n" +
    "                     ng-controller=\"mendeleyRollupCtrl\"\n" +
    "                     ng-show=\"mendeleySource && (!selectedChannel || selectedChannel.source_name=='mendeley')\">\n" +
    "                    <div class=\"icon\">\n" +
    "                        <img ng-src=\"/static/img/favicons/mendeley.ico\">\n" +
    "                    </div>\n" +
    "                   <div class=\"content\">\n" +
    "                       <div class=\"title\" ng-click=\"d.showMendeleyDetails = !d.showMendeleyDetails\">\n" +
    "                           <i ng-show=\"d.showMendeleyDetails\" class=\"fa fa-minus-square show-hide\"></i>\n" +
    "                           <i ng-show=\"!d.showMendeleyDetails\" class=\"fa fa-plus-square show-hide\"></i>\n" +
    "                           {{ mendeleySource.posts_count }} Mendeley saves\n" +
    "                           <span class=\"extra\">click to\n" +
    "                                <span ng-show=\"d.showMendeleyDetails\">hide</span>\n" +
    "                                <span ng-show=\"!d.showMendeleyDetails\">show</span>\n" +
    "                           </span>\n" +
    "                       </div>\n" +
    "\n" +
    "                       <div class=\"under\">\n" +
    "                            <span class=\"date-and-attr\">\n" +
    "                                over the last\n" +
    "                                <span class=\"single\" ng-show=\"person.publishingAge > 1\">\n" +
    "                                    {{ person.publishingAge }} years\n" +
    "                                </span>\n" +
    "                                <span class=\"single\" ng-show=\"person.publishingAge <= 1\">\n" +
    "                                    year\n" +
    "                                </span>\n" +
    "\n" +
    "                                by <em>multiple readers</em>\n" +
    "                            </span>\n" +
    "                       </div>\n" +
    "\n" +
    "                       <div class=\"under mendeley-summary\" ng-show=\"d.showMendeleyDetails\">\n" +
    "                           <div class=\"disclaimer\">\n" +
    "                               Mendeley is a reference manager, like Endnote. For privacy reasons, they\n" +
    "                               conceal identifiable timeline and user information.\n" +
    "                               However, here's some summary information:\n" +
    "                           </div>\n" +
    "                           <div class=\"main row\">\n" +
    "                                <div class=\"col-md-6 col top-bookmarked\">\n" +
    "                                    <h5>Most saved <span class=\"extra\">(top 3)</span></h5>\n" +
    "                                    <div class=\"product\" ng-repeat=\"product in products | orderBy: '-mendeley.readers' | limitTo: 3\">\n" +
    "                                        <div class=\"title\">\n" +
    "                                            <i class=\"fa fa-{{ getGenreIcon(product.genre) }}\"></i>\n" +
    "                                            <a class=\"target\" href=\"u/{{ person.orcid_id }}/p/{{ product.id }}\">\n" +
    "                                                <short text=\"product.title\" len=\"80\"></short>\n" +
    "                                            </a>\n" +
    "                                        </div>\n" +
    "                                        <div class=\"bookmarks\">\n" +
    "                                            {{ product.mendeley.readers }} saves\n" +
    "                                        </div>\n" +
    "                                    </div>\n" +
    "\n" +
    "\n" +
    "                                </div>\n" +
    "                                <div class=\"col-md-3 col top-countries\">\n" +
    "                                    <h5>By country <span class=\"extra\">(top 5)</span></h5>\n" +
    "                                    <table>\n" +
    "                                        <tr ng-repeat=\"country in mendeleyCountries | orderBy: '-percent' | limitTo:5\">\n" +
    "                                            <td class=\"name\">{{ country.name }}</td>\n" +
    "                                            <td class=\"percent\">\n" +
    "                                                {{ numFormat.decimalToPerc(country.percent) }}<span class=\"percent-sign\">%</span>\n" +
    "                                            </td>\n" +
    "                                        </tr>\n" +
    "                                    </table>\n" +
    "                                </div>\n" +
    "                                <div class=\"col-md-3 col top-discipline\">\n" +
    "                                    <h5>By field <span class=\"extra\">(top 5)</span></h5>\n" +
    "                                    <table>\n" +
    "                                        <tr ng-repeat=\"discipline in mendeleyDisciplines | orderBy: '-percent' | limitTo:5\">\n" +
    "                                            <td class=\"name\">{{ discipline.name }}</td>\n" +
    "                                            <td class=\"percent\">\n" +
    "                                                {{ numFormat.decimalToPerc(discipline.percent) }}<span class=\"percent-sign\">%</span>\n" +
    "                                            </td>\n" +
    "                                        </tr>\n" +
    "                                    </table>\n" +
    "                                </div>\n" +
    "                           </div>\n" +
    "                       </div>\n" +
    "                   </div>\n" +
    "                </div>\n" +
    "\n" +
    "\n" +
    "                <div class=\"posts-wrapper\"\n" +
    "                     ng-repeat=\"post in posts | orderBy: '-posted_on' | filter: postsFilter as filteredPosts\">\n" +
    "\n" +
    "                    <div class=\"post normal\"\n" +
    "                         ng-if=\"$index < d.viewItemsLimit && !(!selectedChannel && post.source=='twitter')\"\n" +
    "                         ng-include=\"'mention-item.tpl.html'\"></div>\n" +
    "\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"more\">\n" +
    "                    <span class=\"btn btn-default btn-sm\"\n" +
    "                          ng-click=\"d.viewItemsLimit = d.viewItemsLimit + 20\"\n" +
    "                          ng-show=\"d.viewItemsLimit < filteredPosts.length\">\n" +
    "                        <i class=\"fa fa-arrow-down\"></i>\n" +
    "                        See more\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"col-md-4 score-col small-col\">\n" +
    "                <h4>Filter by activity</h4>\n" +
    "                <div class=\"channel filter-option {{ channel.source_name }}\"\n" +
    "                    ng-class=\"{selected: selectedChannel.source_name==channel.source_name, unselected: selectedChannel && selectedChannel.source_name != channel.source_name}\"\n" +
    "                    ng-click=\"toggleSelectedChannel(channel)\"\n" +
    "                    ng-repeat=\"channel in sources | orderBy: '-posts_count'\">\n" +
    "\n" +
    "                    <span class=\"close-button\">&times;</span>\n" +
    "                    <span class=\"content\">\n" +
    "                        <span class=\"name\">\n" +
    "                            <img ng-src=\"/static/img/favicons/{{ channel.source_name }}.ico\">\n" +
    "                            {{ channel.display_name }}\n" +
    "                        </span>\n" +
    "                        <span class=\"val\" ng-class=\"{'has-new': channel.events_last_week_count}\">\n" +
    "                            <md-tooltip ng-if=\"channel.events_last_week_count\">\n" +
    "                                {{ channel.events_last_week_count }} new enagements this week\n" +
    "                            </md-tooltip>\n" +
    "                            ({{ numFormat.short(channel.posts_count) }}\n" +
    "                            <span class=\"new-last-week\"\n" +
    "                                  ng-show=\"channel.events_last_week_count\">\n" +
    "                                <i class=\"fa fa-arrow-up\"></i>\n" +
    "                            </span>)\n" +
    "                        </span>\n" +
    "                    </span>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "        <div class=\"row person-footer\">\n" +
    "            <div class=\"text col-md-8\">\n" +
    "                <span class=\"text\">\n" +
    "                    <span class=\"secret-sync\" ng-click=\"pullFromOrcid()\">\n" +
    "                        <i class=\"fa fa-unlock\"></i>\n" +
    "                    </span>\n" +
    "                    All the data you see here is open for re-use.\n" +
    "                </span>\n" +
    "            </div>\n" +
    "            <div class=\"buttons col-md-4\">\n" +
    "                <a class=\"btn btn-xs btn-default\"\n" +
    "                   target=\"_self\"\n" +
    "                   href=\"/api/person/{{ person.orcid_id }}\">\n" +
    "                    <i class=\"fa fa-cogs\"></i>\n" +
    "                    view as JSON\n" +
    "                </a>\n" +
    "            </div>\n" +
    "\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<script type=\"text/ng-template\" id=\"badgeDialog.tpl.html\">\n" +
    "    <md-dialog id=\"badgeDialog\">\n" +
    "        <md-dialog-content>\n" +
    "            <h2>Check it out! {{ firstName }} unlocked this nifty achievement:</h2>\n" +
    "            <div class=\"badge-container\" ng-include=\"'badge-item.tpl.html'\"></div>\n" +
    "        </md-dialog-content>\n" +
    "        <md-dialog-actions>\n" +
    "            <md-button ng-click=\"cancel()\">Dismiss</md-button>\n" +
    "        </md-dialog-actions>\n" +
    "    </md-dialog>\n" +
    "</script>\n" +
    "\n" +
    "");
}]);

angular.module("product-page/product-page.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("product-page/product-page.tpl.html",
    "<div class=\"page product-page\">\n" +
    "    <div class=\"row biblio-row\">\n" +
    "        <div class=\"biblio-col col-md-8\">\n" +
    "            <a href=\"/u/{{ person.orcid_id }}/publications\" class=\"back-to-profile\">\n" +
    "                <i class=\"fa fa-chevron-left\"></i>\n" +
    "                Back to {{ person.first_name }}'s publications\n" +
    "            </a>\n" +
    "            <div class=\"genre\" ng-show=\"product.genre != 'article' && product.genre != 'other'\">\n" +
    "                <i class=\"fa fa-{{ getGenreIcon(product.genre) }}\"></i>\n" +
    "                {{ product.genre.replace(\"-\", \" \") }}\n" +
    "            </div>\n" +
    "            <h2 class=\"title\">\n" +
    "                {{ product.title }}\n" +
    "            </h2>\n" +
    "            <div class=\"authors\">\n" +
    "                {{product.authors}}\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"journal\">\n" +
    "                <span class=\"year\">{{product.year}}</span>\n" +
    "                <a href=\"http://doi.org/{{ product.doi }}\"\n" +
    "                   ng-show=\"product.doi\"\n" +
    "                   class=\"journal\">\n" +
    "                    {{product.journal}}\n" +
    "                    <i class=\"fa fa-external-link\"></i>\n" +
    "                </a>\n" +
    "                <a href=\"{{ product.url }}\"\n" +
    "                   ng-show=\"product.url && !product.doi\"\n" +
    "                   class=\"journal\">\n" +
    "                    {{product.journal}}\n" +
    "                    <i class=\"fa fa-external-link\"></i>\n" +
    "                </a>\n" +
    "                <span ng-show=\"!product.url && !product.doi\"\n" +
    "                   class=\"journal\">\n" +
    "                    {{product.journal}}\n" +
    "                </span>\n" +
    "\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"fulltext\" ng-show=\"product.fulltext_url\">\n" +
    "                <a href=\"{{ product.fulltext_url }}\">\n" +
    "                    <i class=\"fa fa-unlock-alt\"></i>\n" +
    "                    Free fulltext available\n" +
    "                    <i class=\"fa fa-external-link\"></i>\n" +
    "                </a>\n" +
    "            </div>\n" +
    "            <div class=\"no-fulltext\" ng-show=\"!product.fulltext_url && ownsThisProfile\">\n" +
    "                <div class=\"btn btn-default\" ng-click=\"setFulltextUrl($event)\">\n" +
    "                    <i class=\"fa fa-link\"></i>\n" +
    "                    Add a link to free fulltext\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"row main-row\">\n" +
    "        <div class=\"col-md-12 no-posts\" ng-show=\"!postsSum && product.doi\">\n" +
    "            <p>We haven't found any online discussion around this publication yet.</p>\n" +
    "        </div>\n" +
    "        <div class=\"col-md-12 no-doi\" ng-show=\"!product.doi\">\n" +
    "            <div class=\"icon\">\n" +
    "                <i class=\"fa fa-adjust\"></i>\n" +
    "            </div>\n" +
    "            <div class=\"content\">\n" +
    "                <p>\n" +
    "                    <strong>Missing data:</strong> we don't have a <abbr title=\"Document Object Identifier\">DOI</abbr> for this publication. Without\n" +
    "                    <a href=\"https://en.wikipedia.org/wiki/Digital_object_identifier\">\n" +
    "                        this standard unique identifier,\n" +
    "                    </a>\n" +
    "                    it's harder to track online conversations about the work.\n" +
    "                </p>\n" +
    "                <p>\n" +
    "                    If you've\n" +
    "                    got a DOI for this publication we don't know about, you can add\n" +
    "                    it in <a href=\"http://orcid.org/{{ person.orcid_id }}\" target=\"_blank\">your ORCID</a>\n" +
    "                    and then re-sync.\n" +
    "                </p>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <!-- MENTIONS view. copied from the profile page -->\n" +
    "        <div class=\"tab-view mentions row\" ng-show=\"postsSum\">\n" +
    "            <div class=\"col-md-8 posts-col main-col\">\n" +
    "                <h3>\n" +
    "                    <span class=\"ti-label\" ng-show=\"!selectedChannel\">saved and shared</span>\n" +
    "                    <span class=\"ti-label\" ng-show=\"selectedChannel && selectedChannel.source_name != 'mendeley'\">shared</span>\n" +
    "                    <span class=\"ti-label\" ng-show=\"selectedChannel.source_name=='mendeley'\">saved</span>\n" +
    "                    {{ selectedChannel.posts_count || postsSum }} times\n" +
    "\n" +
    "                    <span class=\"filter\" ng-if=\"selectedChannel\">\n" +
    "                        <span class=\"filter-intro\">on</span>\n" +
    "                        <span class=\"filter label label-default\">\n" +
    "                            <span class=\"content\">\n" +
    "                                <img class=\"icon\" ng-src=\"/static/img/favicons/{{ selectedChannel.source_name }}.ico\">\n" +
    "                                {{ selectedChannel.source_name }}\n" +
    "                            </span>\n" +
    "                            <span class=\"close-button\" ng-click=\"toggleSelectedChannel(selectedChannel)\">&times;</span>\n" +
    "                        </span>\n" +
    "                    </span>\n" +
    "                </h3>\n" +
    "\n" +
    "\n" +
    "                <!-- pseudo .view-item for mendeley so it can use same styles\n" +
    "                this is partly copied from the person page, but is a lighter version that\n" +
    "                links users to mendeley page for this product.\n" +
    "                 -->\n" +
    "                <div class=\"rollup mendeley-rollup view-item\"\n" +
    "                     ng-controller=\"mendeleyRollupCtrl\"\n" +
    "                     ng-show=\"mendeleySource && (!selectedChannel || selectedChannel.source_name=='mendeley')\">\n" +
    "                    <div class=\"icon\">\n" +
    "                        <img ng-src=\"/static/img/favicons/mendeley.ico\">\n" +
    "                    </div>\n" +
    "                   <div class=\"content\">\n" +
    "                       <div class=\"title\">\n" +
    "                           {{ mendeleySource.posts_count }} Mendeley saves\n" +
    "                       </div>\n" +
    "\n" +
    "                       <div class=\"under\">\n" +
    "                            <span class=\"date-and-attr\">\n" +
    "                                since this article's publication in {{ product.year }}\n" +
    "                                <!--\n" +
    "                                <span class=\"single\" ng-show=\"person.publishingAge > 1\">\n" +
    "                                    {{ person.publishingAge }} years\n" +
    "                                </span>\n" +
    "                                <span class=\"single\" ng-show=\"person.publishingAge <= 1\">\n" +
    "                                    year\n" +
    "                                </span>\n" +
    "                                -->\n" +
    "\n" +
    "                            </span>\n" +
    "                       </div>\n" +
    "\n" +
    "                       <div class=\"under mendeley-summary\">\n" +
    "                           <div class=\"disclaimer perma-show\">\n" +
    "                               Mendeley is a reference manager, like Endnote. For privacy reasons, they\n" +
    "                               conceal identifiable timeline and user information.\n" +
    "                               Some summary info is available on\n" +
    "                               <a href=\"{{ product.mendeley.mendeley_url }}\" target=\"_blank\">\n" +
    "                                   Mendeley's website\n" +
    "                                   <i class=\"fa fa-external-link\"></i>\n" +
    "                               </a>\n" +
    "                           </div>\n" +
    "                       </div>\n" +
    "                   </div>\n" +
    "                </div>\n" +
    "\n" +
    "\n" +
    "                <div class=\"posts-wrapper\"\n" +
    "                     ng-repeat=\"post in posts | orderBy: '-posted_on' | filter: postsFilter as filteredPosts\">\n" +
    "\n" +
    "                    <div class=\"post normal\"\n" +
    "                         ng-if=\"$index < d.postsLimit && !(!selectedChannel && post.source=='twitter')\"\n" +
    "                         ng-include=\"'mention-item.tpl.html'\"></div>\n" +
    "\n" +
    "                </div>\n" +
    "\n" +
    "                <div class=\"more\">\n" +
    "                    <span class=\"btn btn-default btn-sm\"\n" +
    "                          ng-click=\"d.postsLimit = d.postsLimit + 10\"\n" +
    "                          ng-show=\"d.postsLimit < filteredPosts.length\">\n" +
    "                        <i class=\"fa fa-arrow-down\"></i>\n" +
    "                        See more\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"col-md-4 score-col small-col\">\n" +
    "                <h4>Filter by activity</h4>\n" +
    "                <div class=\"channel filter-option {{ channel.source_name }}\"\n" +
    "                    ng-class=\"{selected: selectedChannel.source_name==channel.source_name, unselected: selectedChannel && selectedChannel.source_name != channel.source_name}\"\n" +
    "                    ng-click=\"toggleSelectedChannel(channel)\"\n" +
    "                    ng-repeat=\"channel in sources | orderBy: '-posts_count'\">\n" +
    "\n" +
    "                    <span class=\"close-button\">&times;</span>\n" +
    "                    <span class=\"content\">\n" +
    "                        <span class=\"name\">\n" +
    "                            <img ng-src=\"/static/img/favicons/{{ channel.source_name }}.ico\">\n" +
    "                            {{ channel.display_name }}\n" +
    "                        </span>\n" +
    "                        <span class=\"val\" ng-class=\"{'has-new': channel.events_last_week_count}\">\n" +
    "                            <md-tooltip ng-if=\"channel.events_last_week_count\">\n" +
    "                                {{ channel.events_last_week_count }} new engagments this week\n" +
    "                            </md-tooltip>\n" +
    "                            ({{ numFormat.short(channel.posts_count) }}\n" +
    "                            <span class=\"new-last-week\"\n" +
    "                                  ng-show=\"channel.events_last_week_count\">\n" +
    "                                <i class=\"fa fa-arrow-up\"></i>\n" +
    "                            </span>)\n" +
    "                        </span>\n" +
    "                    </span>\n" +
    "\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("settings-page/settings-page.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("settings-page/settings-page.tpl.html",
    "<div class=\"page settings-page\">\n" +
    "    <h2>Settings</h2>\n" +
    "    <a href=\"/u/{{ orcidId }}\" class=\"back-to-profile\">\n" +
    "        <i class=\"fa fa-chevron-left\"></i>\n" +
    "        Back to my profile\n" +
    "\n" +
    "    </a>\n" +
    "\n" +
    "    <div class=\"setting-panel\">\n" +
    "        <h3>Sync data from ORCID</h3>\n" +
    "        <p>\n" +
    "            Your Impactstory profile is built on your ORCID profile, and it\n" +
    "            automatically stays in sync to pull in your new information and new works.\n" +
    "            But if you can't wait, you can also sync manually right now.\n" +
    "        </p>\n" +
    "        <div class=\"sync-controls\">\n" +
    "            <span class=\"btn btn-lg btn-default\"\n" +
    "                  ng-show=\"syncState=='ready'\"\n" +
    "                  ng-click=\"pullFromOrcid()\">\n" +
    "                <i class=\"fa fa-refresh\"></i>\n" +
    "                Sync with my ORCID now\n" +
    "            </span>\n" +
    "            <div class=\"alert alert-info\" ng-show=\"syncState=='working'\">\n" +
    "                <i class=\"fa fa-refresh fa-spin\"></i>\n" +
    "                Syncing now...\n" +
    "            </div>\n" +
    "            <div class=\"alert alert-success\" ng-show=\"syncState=='success'\">\n" +
    "                <i class=\"fa fa-check\"></i>\n" +
    "                Sync complete!\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"setting-panel\">\n" +
    "        <h3>Donate</h3>\n" +
    "        <p>\n" +
    "            Impactstory is a nonprofit, and the application you're\n" +
    "            using is free. But if you're getting value out of it,\n" +
    "            we'd love a donation to help keep us around.\n" +
    "        </p>\n" +
    "        <span class=\"btn btn-lg btn-default\" ng-click=\"donate(1000)\">\n" +
    "            <i class=\"fa fa-thumbs-o-up\"></i>\n" +
    "                Donate $10\n" +
    "            </span>\n" +
    "        <span class=\"btn btn-lg btn-default\" ng-click=\"donate(10000)\">\n" +
    "            <i class=\"fa fa-thumbs-o-up\"></i>\n" +
    "            Donate $100\n" +
    "        </span>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"setting-panel\">\n" +
    "        <h3>Delete</h3>\n" +
    "        <p>\n" +
    "            Don't like what you see? Drop us a line, we'd love to hear how\n" +
    "            Impactstory could be better. Or you can just delete this profile:\n" +
    "        </p>\n" +
    "        <div class=\"first-q\">\n" +
    "            <span ng-click=\"wantToDelete=true\"\n" +
    "                  ng-show=\"!wantToDelete\"\n" +
    "                  class=\"btn btn-lg btn-default\">\n" +
    "                <i class=\"fa fa-trash\"></i>\n" +
    "                Delete my Impactstory profile\n" +
    "            </span>\n" +
    "        </div>\n" +
    "        <div class=\"second-q\" ng-show=\"wantToDelete\">\n" +
    "            <h4>Are you sure you want to delete your profile?</h4>\n" +
    "            <span ng-click=\"deleteProfile()\"\n" +
    "                  class=\"btn btn-lg btn-danger\">Yes I'm sure!</span>\n" +
    "\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "</div>\n" +
    "\n" +
    "");
}]);

angular.module("sidemenu.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("sidemenu.tpl.html",
    "<div class=\"menu-items\">\n" +
    "    <div class=\"source last-real-source-{{ $last }} first-real-source-{{ $first }}\"\n" +
    "         ng-class=\"{viewThisSource==source.source_name}\"\n" +
    "         ng-click=\"setWorkspace('posts', source.source_name)\"\n" +
    "         ng-repeat=\"source in sources | orderBy: '-posts_count'\">\n" +
    "        <span class=\"favicon\">\n" +
    "            <img ng-src=\"/static/img/favicons/{{ source.source_name }}.ico\">\n" +
    "        </span>\n" +
    "        <span class=\"name\">{{ source.display_name }}</span>\n" +
    "        <span class=\"icon-right\">\n" +
    "            <span class=\"new-last-week\"\n" +
    "                  tooltip=\"{{ source.events_last_week_count }} new this week\"\n" +
    "                  ng-show=\"source.events_last_week_count\">\n" +
    "                <i class=\"fa fa-arrow-up\"></i>\n" +
    "            </span>\n" +
    "            <span class=\"look-right\" ng-show=\"workspace=='posts' && viewThisSource==source.source_name\">\n" +
    "                <i class=\"fa fa-chevron-right\"></i>\n" +
    "            </span>\n" +
    "        </span>\n" +
    "        <span class=\"value\">\n" +
    "            {{ numFormat.short(source.posts_count) }}\n" +
    "        </span>\n" +
    "    </div>\n" +
    "</div>\n" +
    "<a class=\"learn-more\" href=\"about/metrics\">\n" +
    "    <i class=\"fa fa-info-circle\"></i>\n" +
    "    <span class=\"text\">Learn more about metrics</span>\n" +
    "</a>");
}]);

angular.module("static-pages/landing.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("static-pages/landing.tpl.html",
    "<!-- the landing page for people who are not logged in -->\n" +
    "<div class=\"landing static-page\">\n" +
    "    <div class=\"above-the-fold\">\n" +
    "        <div class=\"tagline\">\n" +
    "            <h1>\n" +
    "                Find the online impact of your research\n" +
    "            </h1>\n" +
    "            <div class=\"sub\">\n" +
    "                Track buzz on Twitter, blogs, news outlets and more:\n" +
    "                we're like Google Scholar for your research's online reach.\n" +
    "                Making a profile takes just seconds:\n" +
    "            </div>\n" +
    "        </div>\n" +
    "\n" +
    "        <div class=\"join-button\">\n" +
    "            <md-button class=\"md-accent md-raised\" ng-click=\"authenticate()\">Join for free with ORCID</md-button>\n" +
    "            <span class=\"no-orcid\" ng-click=\"noOrcid($event)\">\n" +
    "                <i class=\"fa fa-question-circle\"></i>\n" +
    "                I don't have an ORCID\n" +
    "            </span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"featured-in\">\n" +
    "        <h4>\n" +
    "            Featured in\n" +
    "            <i class=\"fa fa-chevron-down\"></i>\n" +
    "        </h4>\n" +
    "        <div class=\"logos\">\n" +
    "            <img src=\"static/img/nature.png\">\n" +
    "            <img src=\"static/img/science.png\">\n" +
    "            <img src=\"static/img/chronicle.png\" class=\"dark\">\n" +
    "            <img src=\"static/img/bbc.png\">\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"landing-footer\">\n" +
    "        <div class=\"links col\">\n" +
    "            <a href=\"about\">About</a>\n" +
    "            <a href=\"http://twitter.com/impactstory\">Twitter</a>\n" +
    "            <a href=\"https://github.com/Impactstory/impactstory-tng\">GitHub</a>\n" +
    "        </div>\n" +
    "        <div class=\"funders col\">\n" +
    "            Supported by the\n" +
    "            <span class=\"funder\">the National Science Foundation</span>\n" +
    "            <span class=\"funder second\">and Alfred P. Sloan Foundation</span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "<script type=\"text/ng-template\" id=\"orcid-dialog.tmpl.html\">\n" +
    "<md-dialog aria-label=\"Mango (Fruit)\"  ng-cloak>\n" +
    "        <md-dialog-content>\n" +
    "            <div class=\"md-dialog-content\">\n" +
    "                <p>Signing up for Impactstory requires an ORCID ID.  But don't worry, getting an ORCID ID is fast and free.\n" +
    "                <p>ORCID IDs are used to identify scholars, unambiguously linking them to their publications.  ORCID IDs are administered by a global, international, non-profit organization. Signing up for an ORCID ID is free, quick, and is increasingly required by funders, journals, and academic employers.</p>\n" +
    "            </div>\n" +
    "        </md-dialog-content>\n" +
    "    <md-dialog-actions layout=\"row\">\n" +
    "        <md-button ng-click=\"modalAuth()\">Get my ORCID!</md-button>\n" +
    "    </md-dialog-actions>\n" +
    "\n" +
    "</md-dialog>\n" +
    "</script>\n" +
    "");
}]);

angular.module("static-pages/login.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("static-pages/login.tpl.html",
    "<div class=\"login-loading main\">\n" +
    "  <div class=\"content\">\n" +
    "     <md-progress-circular class=\"md-primary\"\n" +
    "                           md-diameter=\"100\">\n" +
    "     </md-progress-circular>\n" +
    "     <h2>Getting your profile...</h2>\n" +
    "     <img src=\"static/img/impactstory-logo-sideways.png\">\n" +
    "  </div>\n" +
    "</div>");
}]);

angular.module("static-pages/twitter-login.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("static-pages/twitter-login.tpl.html",
    "<div class=\"login-loading twitter\">\n" +
    "  <div class=\"content\">\n" +
    "     <md-progress-circular class=\"md-primary\"\n" +
    "                           md-diameter=\"100\">\n" +
    "     </md-progress-circular>\n" +
    "     <h2>Setting your Twitter...</h2>\n" +
    "     <img src=\"static/img/impactstory-logo-sideways.png\">\n" +
    "  </div>\n" +
    "</div>");
}]);

angular.module("workspace.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("workspace.tpl.html",
    "\n" +
    "<!-- achievments workspace -->\n" +
    "<div class=\"workspace-view row achievements\" ng-if=\"workspace=='achievements'\">\n" +
    "    <div class=\"achievements-list\">\n" +
    "        <div class=\"achievements workspace-item\"\n" +
    "             ng-class=\"{'featured': $index < 3}\"\n" +
    "             ng-repeat=\"badge in badges | orderBy: '-sort_score' | limitTo: badgeLimit \">\n" +
    "            <div class=\"icon\">\n" +
    "                <i class=\"fa {{ getBadgeIcon(badge.group) }}\"></i>\n" +
    "            </div>\n" +
    "            <div class=\"content\">\n" +
    "                <div class=\"title\">\n" +
    "                    <a href=\"/u/{{ person.orcid_id }}/badge/{{ badge.name }}\">\n" +
    "                        {{badge.display_name}}\n" +
    "                    </a>\n" +
    "                </div>\n" +
    "                <div class=\"under\">\n" +
    "                    {{ badge.description }}\n" +
    "                </div>\n" +
    "                <div class=\"earned-on\" ng-show=\"badge.is_for_products\">\n" +
    "                    Earned on\n" +
    "                    <a href=\"/u/{{ person.orcid_id }}/badge/{{ badge.name }}\">\n" +
    "                        {{ badge.dois.length }} products\n" +
    "                    </a>\n" +
    "                </div>\n" +
    "                <div class=\"earned-on\" ng-show=\"!badge.is_for_products\">\n" +
    "                    Earned on whole profile\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"show-more\"\n" +
    "             ng-show=\"badgeLimit==3 && badges.length > 3\"\n" +
    "             ng-click=\"badgeLimit=999999999\">\n" +
    "            <i class=\"fa fa-chevron-down\"></i>\n" +
    "            show {{ badges.length - 3 }} more\n" +
    "        </div>\n" +
    "        <div class=\"show-fewer\" ng-show=\"badgeLimit > 3\" ng-click=\"badgeLimit=3\">\n" +
    "            <i class=\"fa fa-chevron-up\"></i>\n" +
    "            show fewer\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "\n" +
    "<!-- products workspace -->\n" +
    "<div class=\"workspace-view row products\" ng-if=\"workspace=='products'\">\n" +
    "    <div class=\"products-list\">\n" +
    "        <div class=\"products workspace-item\"\n" +
    "             ng-repeat=\"product in products | orderBy : '-altmetric_score'\">\n" +
    "            <div class=\"icon\">\n" +
    "                <i class=\"fa fa-file-text-o\"></i>\n" +
    "            </div>\n" +
    "\n" +
    "            <div class=\"content\">\n" +
    "                <div class=\"title\">\n" +
    "                    <a href=\"u/{{person.orcid_id}}/product/doi/{{ product.doi }}\">{{ product.title }}</a>\n" +
    "                </div>\n" +
    "                <div class=\"under\">\n" +
    "                    <span class=\"year date\">{{ product.year }}</span>\n" +
    "                    <span class=\"attr\">\n" +
    "                        {{ product.journal }}\n" +
    "                        <span class=\"oa-icon oa-journal\" ng-show=\"product.is_oa_journal\">\n" +
    "                            <md-tooltip>\n" +
    "                                This is an Open Access journal\n" +
    "                            </md-tooltip>\n" +
    "                            <i class=\"fa fa-unlock-alt\"></i>\n" +
    "                        </span>\n" +
    "                        <span class=\"oa-icon oa-journal\" ng-show=\"product.is_oa_repository\">\n" +
    "                            <md-tooltip>\n" +
    "                                This is an open-access repository\n" +
    "                            </md-tooltip>\n" +
    "                            <i class=\"fa fa-unlock-alt\"></i>\n" +
    "                        </span>\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "                <div class=\"source-icons\">\n" +
    "            <span class=\"source-icon\"\n" +
    "                  ng-repeat=\"source in product.sources | orderBy: 'display_name'\">\n" +
    "                <md-tooltip md-direction=\"top\">\n" +
    "                    {{ source.posts_count }} {{source.display_name }}\n" +
    "                </md-tooltip>\n" +
    "                <img ng-src=\"/static/img/favicons/{{ source.source_name }}.ico\" class=\"{{source.source_name}}\">\n" +
    "            </span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "            <div class=\"metric\">\n" +
    "                <md-tooltip md-direction=\"top\">\n" +
    "                    Altmetric.com score\n" +
    "                </md-tooltip>\n" +
    "                {{ numFormat.short(product.altmetric_score) }}\n" +
    "                <i class=\"fa fa-arrow-up\" ng-show=\"product.events_last_week_count > 0\"></i>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "<!-- posts workspace -->\n" +
    "<div class=\"workspace-view row posts\" ng-if=\"workspace=='posts'\">\n" +
    "    <div class=\"posts-list\">\n" +
    "        <div class=\"posts workspace-item\"\n" +
    "             ng-repeat=\"post in posts | orderBy: '-posted_on' | filter: {source: viewThisSource}\">\n" +
    "            <div class=\"icon\">\n" +
    "                <img ng-src=\"/static/img/favicons/{{ post.source }}.ico\">\n" +
    "            </div>\n" +
    "            <div class=\"content\">\n" +
    "                <div class=\"title\">\n" +
    "                    <a href=\"{{ post.url }}\">\n" +
    "                        {{post.title}}\n" +
    "                        <i class=\"fa fa-external-link\"></i>\n" +
    "                    </a>\n" +
    "                </div>\n" +
    "                <div class=\"under\">\n" +
    "                    <span class=\"date\">\n" +
    "                        <md-tooltip>\n" +
    "                            Posted on\n" +
    "                            {{ moment(post.posted_on).format(\"dddd, MMMM Do YYYY, h:mm:ss a\") }}\n" +
    "                        </md-tooltip>\n" +
    "\n" +
    "                        <span class=\"human-readable\">\n" +
    "                            {{ moment(post.posted_on).fromNow() }}\n" +
    "                        </span>\n" +
    "                    </span>\n" +
    "                    <span class=\"attr\">{{post.attribution}}</span>\n" +
    "                    cited\n" +
    "                    <a href=\"/u/{{person.orcid_id}}/product/doi/{{ post.citesDoi }}\">\n" +
    "                        {{ post.citesTitle }}\n" +
    "                    </a>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "<!-- twitter workspace -->\n" +
    "<div class=\"workspace-view row tweeters\" ng-if=\"workspace=='twitter'\">\n" +
    "    <div class=\"tweeters-list\">\n" +
    "        <div class=\"tweeters workspace-item\"\n" +
    "             ng-repeat=\"tweeter in tweeters | orderBy: '-followers' | limitTo: 25\">\n" +
    "\n" +
    "            <div class=\"icon\">\n" +
    "                <img ng-src=\"{{ tweeter.img }}\">\n" +
    "            </div>\n" +
    "            <div class=\"content\">\n" +
    "                <div class=\"title\">\n" +
    "                    <a href=\"{{ tweeter.url }}\">\n" +
    "                        {{tweeter.name}}\n" +
    "                    </a>\n" +
    "                    <span class=\"extra\">\n" +
    "                        <span class=\"count\">\n" +
    "                            {{  numFormat.short(tweeter.followers) }}\n" +
    "                        </span>\n" +
    "                        followers\n" +
    "                    </span>\n" +
    "                </div>\n" +
    "                <div class=\"under\">\n" +
    "                    <span class=\"attr\">{{tweeter.description}}</span>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>");
}]);
