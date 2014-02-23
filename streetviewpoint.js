//streetviewpoint.js

//Class: StreetViewPoint
//========================
//Generates and stores information of a single street view image call,
//generating the source URL and latLng.

function StreetViewPoint(latLng, heading, imgOptions){
	this.latLng = latLng;
	this.heading = heading;
	var self = this;

	function createSrc(){
        var src = 'http://maps.googleapis.com/maps/api/streetview?location='+
                    self.latLng.toUrlValue() +
                    '&heading=' +
                    self.heading +
                    '&size=' +
                    imgOptions.width + 'x' + imgOptions.height +
                    '&fov=' +
                    imgOptions.fov +
                    '&pitch=' +
                    imgOptions.pitch +
                    '&sensor=false&key=' +
                    imgOptions.key;
        self.src = src;
    }

    createSrc();
}
