//streetviewpoint.js

//Class: StreetViewPoint
//========================
//Generates and stores information of a single street view image call,
//generating the source URL and latLng.

function StreetViewPoint(latLng, heading, imgOptions){
  var self     = this;
  this.latLng  = latLng;
  this.heading = heading;
  this.src     = createSrc();

  function createSrc(){
    var src = 'http://maps.googleapis.com/maps/api/streetview?location='+ self.latLng.toUrlValue() +
              '&heading=' + self.heading +
              '&size=' + imgOptions.width + 'x' + imgOptions.height +
              '&fov=' + imgOptions.fov +
              '&pitch=' + imgOptions.pitch +
              '&sensor=false&key=' + imgOptions.key;
    return src;
  }
}
