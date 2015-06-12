/*jshint -W117 */
//page.js
//Creates all needed JavaScript objects and reads button submissions

//initialize the map
var searchMap;
google.maps.event.addDomListener(window, 'load', initializeSearchMap);
var miniMap;
google.maps.event.addDomListener(window, 'load', initializeMiniMap);
var panoDisplay = null;
google.maps.event.addDomListener(window, 'load', initializePano);

var rendererOptions = {
  draggable: true
};
var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
var directionsService = new google.maps.DirectionsService();

//initialize the street view grabber
var options = { key: 'AIzaSyDlPz-ZPQjYceZvOJInQzWbIHB2EkRWDJY' };
var streetVG = new StreetViewGrabber(options);
// var streetVG = new StreetViewGrabber();
var tutorial = 0;

// var sanFrancisco = new google.maps.LatLng(37.774950000000004, -122.41929);
//Initializes Google Maps and Directions
function initializeSearchMap() {
  var manhattan = new google.maps.LatLng(40.756319,-73.98468);

  var mapOptions = {
    zoom: 11,
    center: manhattan
  };

  searchMap = new google.maps.Map(document.getElementById('search-map'), mapOptions);
  directionsDisplay.setMap(searchMap);

  google.maps.event.addListener(directionsDisplay, 'directions_changed', function() {
    streetVG.changeRoute(directionsDisplay.getDirections());
  });
}

function initializeMiniMap() {
  // var directionsDisplay = new google.maps.DirectionsRenderer();
  var manhattan = new google.maps.LatLng(40.756319,-73.98468);
  var mapOptions = {
    zoom: 11,
    center: manhattan,
    streetViewControl: false,
    mapTypeControl: false
  };

  miniMap = new google.maps.Map(document.getElementById('minimap'), mapOptions);
  directionsDisplay.setMap(miniMap);
}

function initializePano(){
  var panoramaOptions = {
    addressControlOptions: {
      position: google.maps.ControlPosition.BOTTOM
    },
    zoom: 1,
    linksControl: false,
    panControl: false,
    zoomControl: false,
    enableCloseButton: false
  };
  panoDisplay = new google.maps.StreetViewPanorama(document.getElementById('pano-display'), panoramaOptions);
}

function handleRouteSearch(){
  streetVG.findRoute(document.getElementById('start').value, document.getElementById('end').value);
}

function handleStreetViewSearch(){
  streetVG.findStreetViews();
  togglePanel();
  toggleMinimap();
  toggleMinimapHider();
  $('#images-btn').prop('disabled', true);
  $('#panorama-btn').prop('disabled', true);
  scrollDistance = 0;
  $('#pano-display').css('display', 'none');
  panoDisplay.setVisible(false);
}

//===========
//===========

$(document).ready(function() {
  //Spinner courtesy of:
  //fgnass.github.com/spin.js#v1.3.3
  var opts = {
    lines: 12, // The number of lines to draw
    length: 8, // The length of each line
    width: 3, // The line thickness
    radius: 10, // The radius of the inner circle
    corners: 1, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#fff', // #rgb or #rrggbb or array of colors
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: null, // Top position relative to parent in px
    left: null // Left position relative to parent in px
  };
  var target = document.getElementById('loading-screen');
  var spinner = new Spinner(opts).spin(target);


  $('.tab').on('click', function() {
    togglePanel();
    toggleMinimap();
    toggleMinimapHider();
    toggleTrackerbar();
    toggleScrollable();
    toggleBlocker();
  });

  $('#minimap-hider').on('click', function() {
    $('.nav-container').animate({
      'right': parseInt($('.nav-container').css('right'), 10) === -295 ? '+=295px' : '-=295px'
      },
      300
    );
  });

  $('#home-btn').on('click', function() {
    toggleHome();
    toggleApp();
  });
  $('#get-started').on('click', function() {
    toggleHome();
    toggleApp();
  });

  $('#about-btn').on('click', function(){
    toggleNav();
  });

  $('#minimap-btn').on('click', function(){
    toggleNav();
  });

  $('#panorama-btn').on('click', function(){
    togglePanorama();
    $('#panorama-btn').prop('disabled', true);
    $('#images-btn').prop('disabled', false);
    $('#trackerbar').animate({
      'bottom': '-=51'
      },
      300
    );
  });

  $('#images-btn').on('click', function(){
    togglePanorama();
    $('#panorama-btn').prop('disabled', false);
    $('#images-btn').prop('disabled', true);
    $('#trackerbar').animate({
      'bottom': '+=51'
      },
      300
    );
  });
});



//Reads scroll input and parses it accordingly.
//Changes images, moves marker, updates progress bar.
var displayedImage = 1;
var currImage = 1;
var scrollable = false;
var sensitivity = 150;
var pageHeight;
var windowHeight = $(window).height();
var scrollDistance = 0;
var scrollPercentage;
var numImages;
var mobile = false;
var MOBILE_WIDTH = 585;

$(document).ready(function(){
  if ($(window).width() <= MOBILE_WIDTH){
    mobile = true;
  }
  $(window).resize(function() {
    setPageHeight();
    if ($(window).width() <= MOBILE_WIDTH){
      mobile = true;
      if (parseInt($('.panel-with-tab').css('left')) == -570){
        $('.panel-with-tab').css('left', -280);
      }
    } else {
      mobile = false;
      if (parseInt($('.panel-with-tab').css('left')) == -280){
        $('.panel-with-tab').css('left', -570);
      }
    }
  });
  $('body').bind('touchmove', function(e) { 
    $(document).scroll();
  });

  $(document).scroll(function(){
    if (scrollable){
      scrollDistance = getScrollDistance();
      scrollPercentage = getScrollPercentage();
      moveTracker(scrollPercentage);
      currImage = getCurrImage();

      //If calculated image is different from currently displayed image, update image
      if (currImage != displayedImage){
        updateDisplayedImage(currImage);
        updateMarker(currImage);
        displayedImage = currImage;
        if (tutorial < 3) {
          tutorial++;
        } else {
          $('#tutorial').fadeOut(1000);
        }
      }
    }
  });
});

function setPageHeight(){
  numImages = streetVG.numImages();
  windowHeight = $(window).height();
  //subtract 1 so the very bottom pixel of the page is the last image, rather than leaving extra space for unnecessary scrolling
  pageHeight = windowHeight + ((numImages-1) * sensitivity);
  $('#container').css('height', pageHeight);
}

function getScrollDistance(){
  var dist = $(document).scrollTop();
  if (dist<0){
    dist = 0;
  } else if (dist>pageHeight - windowHeight) {
    dist = pageHeight - windowHeight;
  }
  return dist;
}

function getScrollPercentage(){
  var percentage = scrollDistance/(pageHeight - windowHeight) * 100;
  //constrain
  if (percentage>100){
    percentage = 100;
  } else if (percentage<0){
    percentage = 0;
  }
  return percentage;
}

function moveTracker(percentage){
  $('.tracker').css('left', percentage+'%');
}

function getCurrImage(){
  //currImage and numImages are 1-indexed.
  var currImg = Math.floor(scrollDistance/sensitivity) + 1;
  //constrain
  if (currImg<1) {
    currImg = 1;
  } else if (currImg>numImages){
    currImg = numImages;
  }
  return currImg;
}

//Sets currently displayed image to currImg
function updateDisplayedImage(currImg){
  //currImg is 1 indexed so subtract 1
  $('#streetview-display').css('background-image', 'url(' + streetVG.getImg(currImg-1) + ')');
}

//Moves marker to location of currImg
function updateMarker(currImg){
  //currImg is 1 indexed so subtract 1
  streetVG.moveMarker(currImg-1);
}

//Toggles visibility of search panel
function togglePanel(){
  if (!mobile){
    $('.panel-with-tab').animate({
      'left': parseInt($('.panel-with-tab').css('left'), 10)==0 ? '-=570px' : '+=570px'
      }, 
      300
    );
  } else {
    $('.panel-with-tab').animate({
      'left': parseInt($('.panel-with-tab').css('left'), 10)==0 ? '-=280px' : '+=280px'
      }, 
      300
    );
  }
}

//Toggles visibility of minimap
function toggleMinimap(){
  if (parseInt($('.nav-container').css('right'), 10) === -294 ){
    $('.nav-container').animate({
      'right': '+=294px'
      },
      300
    );
  } else if ( parseInt($('.nav-container').css('right'), 10) === 0 ){
    $('.nav-container').animate({
      'right': '-=294px'
      },
      300
    );
  }
}

//Toggles visibility of landing page
function toggleHome(){
  $('#home-container').animate({
    'top': parseInt($('#home-container').css('top'), 10) === 0 ? '-=200%' : '+=200%'
    },
    450
  );
}

//Toggles visibility of the app
function toggleApp(){
  $('#app-container').animate({
    'top': parseInt($('#app-container').css('top'), 10) === 0 ? '+=200%' : '-=200%'
    },
    450
  );
}

//Toggles visibility of trackerbar
function toggleTrackerbar(){
  if (parseInt($('#trackerbar').css('bottom'), 10) === 0 ){
    $('#trackerbar').animate({
      'bottom': '-=50px'
      },
      300
    );
  } else if ( parseInt($('#trackerbar').css('bottom'), 10) === -50 ){
    $('#trackerbar').animate({
      'bottom': '+=50px'
      },
      300
    );
  }
}

//Toggles ability to scroll.
function toggleScrollable(){
  if (scrollable){
    scrollable = false;
  } else {
    //If we reach here, it means the user is going back to the image gallery.
    //Set the scroll distance to the last saved scroll distance
    scrollable = true;
    $(document).scrollTop(scrollDistance);
  }
}

function toggleMinimapHider(){
  $('#minimap-hider').animate({
    'right': parseInt($('#minimap-hider').css('right'), 10) === 0 ? '-=50' : '+=50'
    },
    300
  );
}

function toggleNav(){
  var miniMapDisplayed = $('#minimap-container').css('display');
  //If minimap is currently displayed...
  if (miniMapDisplayed == 'block'){
    //Show about
    $('#minimap-container').css('display', 'none');
    $('#about-container').css('display', 'block');
    $('#minimap-btn').prop('disabled', false);
    $('#about-btn').prop('disabled', true);
  } else {
    //Show minimap
    $('#minimap-container').css('display', 'block');
    $('#about-container').css('display', 'none');
    $('#minimap-btn').prop('disabled', true);
    $('#about-btn').prop('disabled', false);
  }
}

function togglePanorama(){
  if ( $('#pano-display').css('display') == 'none'){
    $('#pano-display').css('display', 'block');
    var location = streetVG.getLatLng(currImage-1);
    panoDisplay.setPosition(location);
    panoDisplay.setPov({
      heading: streetVG.getHeading(currImage-1),
      pitch: 25
    });
    panoDisplay.setVisible(true);

  } else {
    $('#pano-display').css('display', 'none');
    panoDisplay.setVisible(false);
  }
}

function toggleBlocker(){
  var val = $('#blocker').css('display');
  $('#blocker').css('display', (val=='none' ? 'block' : 'none'));
}
