/*jshint -W117 */

//streetviewgrabber.js

//Class: StreetViewGrabber
//========================
//Finds a route, and then finds all street view images along the route.
//If route is found, it will create an array of objects, containing
//the latLng and appropriate heading.

var StreetViewGrabber = function(options) {
  //imgOptions are the image options for generating image URLs.
  var imgOptions = {
    width:  640,
    height: 640,
    fov:    90,
    pitch:  25,
    key:    'AIzaSyBGmssTQ26NFxp0u_JDlWjF53RKFVgrOR0'
  };
  if (options != undefined) {
    for (var prop in options) {
      if (!imgOptions.hasOwnProperty(prop)) {
        console.error('Unknown option:', prop, options[prop]);
        return;
      }
      imgOptions[prop] = options[prop];
    }
  }

  var RADIUS = 10;
  var LIMIT = 50;

  var miniDirectionsDisplay = new google.maps.DirectionsRenderer();
  var webService = new google.maps.StreetViewService();
  var minimapMarker;

  var svpArray = [];
  var path;

  //findRoute(origin, destination)
  //==============================
  //Public function. Finds directions from pointA to pointB using Google Maps API,
  //pulls up street view images between pointA and pointB, generates HTML, and
  //displays it.
  this.findRoute = function(origin, destination) {
    //parse form input.
    //check for blank inputs
    if (origin.length === 0 || destination.length === 0){
      setSearchingRouteVisibility(true);
      setSearchingRouteMsg('Fields cannot be blank');
      fadeSearchingRoute();
      return;
    //check for identical inputs
    } else if (origin.toLowerCase() == destination.toLowerCase()){
      setSearchingRouteVisibility(true);
      setSearchingRouteMsg('Fields cannot be the same');
      fadeSearchingRoute();
      return;
    }

    //begin searching for route
    directionsDisplay.setMap(null);
    setSearchingRouteVisibility(true);
    setSearchingRouteMsg('Searching for route...');
    var request = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING
    };
    //Set 300ms pause so that it's easier to see that it's loading
    setTimeout(function(){
      directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          path = response;
          //If route length is 1, there's no route, only a single point.
          if (path.routes[0].overview_path.length == 1){
            setSearchingRouteMsg('No route found');
            fadeSearchingRoute();
            setSVButtonDisabled(true);
            return;
          }
          //Display route and activate button
          directionsDisplay.setMap(searchMap);
          directionsDisplay.setDirections(path);
          setSearchingRouteMsg('Route found');
          fadeSearchingRoute();
          setSVButtonDisabled(false);
        } else {
          //Failed to find any results
          setSearchingRouteMsg('No route found');
          fadeSearchingRoute();
          setSVButtonDisabled(true);
        }
      });
    }, 300);
  };

  this.changeRoute = function(newPath){
    path = newPath;
  };

  //findStreetViews()
  //=================
  //Gets called by the 'Find Street Views' button.
  //Changes loading screens and maps to show loading screen
  this.findStreetViews = function(){
    clearSearchForm();

    if (minimapMarker) {
      minimapMarker.setMap(null);
    }

    //set loading screen
    setLoadingScreenMsg('Loading...');
    setLoadingScreenVisibility(true);
    setSpinnerVisibility(true);

    //set search-panel
    setSearchingRouteVisibility(false);
    setSVButtonDisabled(true);
    directionsDisplay.setMap(null);

    //set mini-map
    setRouteInfoDisplay(path.routes[0].legs[0].start_address, path.routes[0].legs[0].end_address);
    miniDirectionsDisplay.setMap(miniMap);
    miniDirectionsDisplay.setDirections(path);

    //Set mini-map center if route has been customized
    if (path.b){
      var bounds = new google.maps.LatLngBounds();
      bounds.extend(path.routes[0].overview_path[0]);
      bounds.extend(path.routes[0].overview_path[path.routes[0].overview_path.length-1]);
      if (path.Tb.waypoints){
        for (var i = 0; i < path.Tb.waypoints.length; i++){
          bounds.extend(path.Tb.waypoints[i].location);
        }
      }
      miniMap.fitBounds(bounds);
    }

    //gather all points along route
    var pointsArray = [];
    for(var i = 0, len = path.routes[0].legs[0].steps.length; i < len; i++){
      for (var j = 0, len2 = path.routes[0].legs[0].steps[i].lat_lngs.length; j < len2; j++){
        pointsArray.push(path.routes[0].legs[0].steps[i].lat_lngs[j]);
      }
    }

    buildStreetViews(pointsArray);
  };

  //buildStreetViews()
  //=================
  //Given an array of points, goes through them and finds panoramic images
  function buildStreetViews(pointsArray){
    var pointsLength = pointsArray.length;
    var currentIteration = 0;
    var panoArray = [];
    //If the returned route is less than the limit, use the route length.
    //Otherwise, limit the images, and GRAB EQUIDISTANT IMAGES including endpoints.
    var panoArrayLength = (pointsLength > LIMIT ? LIMIT : pointsLength);
    var increment = Math.ceil(pointsLength/panoArrayLength);
    var expectedPanoLength = Math.ceil(pointsLength/increment) + 1;

    //findPanorama()
    //==============
    //Find a single panoramic image at a point, and puts it into the specified index.
    //If no result is found, it puts null into the array.
    function findPanorama(point, index, panoArray){
      webService.getPanoramaByLocation(point, RADIUS, function(result, status){
        currentIteration++;
        panoArray[index] = result;
        if (currentIteration == expectedPanoLength){
          parsePanoramaArray(panoArray);
        }
      });
    }

    for (var i = 0; i < pointsLength; i+=increment){
      findPanorama(pointsArray[i], i, panoArray);
    }

    findPanorama(pointsArray[pointsLength-1], i, panoArray);
  }

  //parsePanoramaArray()
  //====================
  //Given an array of Panorama points, remove any null or repeated
  //elements, and then creates an array of StreetViewPoints
  function parsePanoramaArray(pArray){
    trimNull(pArray);
    removeRepeats(pArray);

    if (pArray.length === 0){
      setLoadingScreenMsg('No streetview images found for route');
      setSpinnerVisibility(false);
      return;
    }
    svpArray = [];
    svpArray = createStreetViewPoints(pArray);
    displayImages();
  }

  //createStreetViewPoints()
  //========================
  //Creates an array of StreetViewPoint objects, which contain panorama URLs and their latLngs.
  function createStreetViewPoints(pArray){
    var tmpArray = [];
    var heading = 0;
    for (var i = 0; i<pArray.length; i++){
      var latLng = pArray[i].location.latLng;
      //If we're not on the last element, calculate new heading
      if (pArray[i+1] !== undefined) {
        heading = getHeading(pArray[i], pArray[i+1]);
      }
      var svp = new StreetViewPoint(latLng, heading, imgOptions);
      tmpArray[i] = svp;
      tmpArray[i].pano = pArray[i];
    }
    return tmpArray;
  }

  //trimNull()
  //==========
  //Removes null elements from an array
  function trimNull(array){
    for(var i = 0; i < array.length; i++) {
      if(!array[i]) {
        array.splice(i--, 1);
      }
    }
  }

  //removeRepeats()
  //===============
  //Removes repeated latLng points from an array
  function removeRepeats(array){
    for(var i = 0; i < array.length; i++) {
      if(array[i] && array[i+1]){
        if(array[i].location.latLng.toString() === array[i+1].location.latLng.toString()){
          array.splice(i--, 1);
        }
      }
    }
  }

  //getHeading()
  //============
  //Given two Google Map Points, calculates heading from pointA to pointB
  function getHeading(pointA, pointB){
    if (pointA && pointB){
      return google.maps.geometry.spherical.computeHeading(pointA.location.latLng, pointB.location.latLng);
    } else {
      //This should never run
      console.error('Cannot calculate heading for null point', pointA, pointB);
    }
  }


  //========================================
  //Functions for building, loading, and displaying image gallery
  //========================================

  function displayImages(){
    document.getElementById('streetview-images').innerHTML = '';
    var imgTagsArray = buildImgTags(svpArray);
    loadImages(imgTagsArray);
  }

  function buildImgTags(){
    var imgArray = [];
    for (var i = 0; i<svpArray.length; i++){
      var img = '<img class="streetview" src="' + svpArray[i].src + '"/>';
      imgArray[i] = img;
    }
    return imgArray;
  }

  function loadImages(imgArray){
    //put the img tags onto the page
    for (var i = 0; i < imgArray.length; i++){
      document.getElementById('streetview-images').innerHTML += imgArray[i];
    }

    var imgs = $('#streetview-images > img').not(function() { return this.complete; });
    var count = imgs.length;
    var total = count;
    var progress;
    //Check if any images need to be loaded
    if (count) {
      //Wait for them to load
      imgs.load(function() {
        count--;
        progress = (total - count)/total * 100;
        //update loading screen progress bar
        $('.progress-bar').css('width', progress+'%');
        if (!count) {
          finishLoading();
        }
      });
    //If count is 0 to begin with, all images were already done loading
    } else {
      finishLoading();
    }
  }

  function finishLoading(){
    toggleTrackerbar();
    if ( parseInt($('#trackerbar').css('bottom'), 10) === -51 ){
      $('#trackerbar').animate({
        'bottom': '+=51'
        },
        300
      );
    }
    toggleScrollable();
    toggleBlocker();
    setPageHeight();
    setLoadingScreenVisibility(false);
    setSpinnerVisibility(false);
    $('.progress-bar').css('width', '0%');
    $('#streetview-display').css('background-image', 'url(' + svpArray[0].src + ')');
    $('#panorama-btn').prop('disabled', false);
    if (tutorial < 3) {
      showTutorial();
    }
    minimapMarker = new google.maps.Marker({
      map: miniMap,
      position: svpArray[0].latLng,
      visible: true
    });
    //Set scrollTop to 1 and then 0 trigger the scroll event with jQuery.
    //scrollTop quirk: If you set scrollTop to the same number it's currently at,
    //it doesn't trigger the $(document).scroll event reader
    //This line ensures that scrollTop is properly set to the top of the page
    $(document).scrollTop(1).scrollTop(0);
  }

  //=========================================
  //HTML Functions for altering page elements
  //=========================================
  function setSearchingRouteVisibility(bool){
    $('#searching-route').css('visibility', bool ? 'visible' : 'hidden');
    $('#searching-route').css('opacity', '1');
  }

  function setSearchingRouteMsg(msg){
    $('#searching-route').html('<span>'+msg+'</span>');
  }

  function fadeSearchingRoute(){
    $('#searching-route').delay(2000).animate({
      'opacity': 0
      },
      600
    );
  }

  function setLoadingScreenMsg(msg){
    $('#loading-screen > p').html(msg);
  }

  function setLoadingScreenVisibility(bool){
    $('#loading-screen').css('visibility', bool ? 'visible' : 'hidden');
    $('#loading-screen-bg').css('visibility', bool ? 'visible' : 'hidden');
  }

  //This needs to be a separate function in the case that a streetview images are searched, but
  //no images are found. In which case, on the loading screen, only display the error msg,
  //and hide the spinner.
  function setSpinnerVisibility(bool){
    $('.spinner').css('visibility', bool ? 'visible' : 'hidden');
  }

  function setSVButtonDisabled(bool){
    $('#street-view-button').prop('disabled', bool);
  }

  function setRouteInfoDisplay(origin, destination){
    $('#origin').html(origin);
    $('#destination').html(destination);
  }

  function showTutorial(){
    $('#tutorial').css('display', 'block');
    $('#tutorial').css('opacity', '0');
    $('#tutorial').delay(700).animate({
      'opacity': 1
      },
      1500
    );
  }

  function clearSearchForm(){
    $(':input').not(':button, :submit').val('');
  }

  //================================================
  //Public functions for updating images and markers
  //================================================
  this.numImages = function(){
    return svpArray.length;
  };

  this.moveMarker = function(index){
    minimapMarker.setPosition(svpArray[index].latLng);
  };

  this.getImg = function(index){
    return svpArray[index].src;
  };

  this.getLatLng = function(index){
    return svpArray[index].latLng;
  };

  this.getHeading = function(index){
    return svpArray[index].heading;
  };
}
