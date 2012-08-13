var faceplate = require('faceplate');
var express = require('express');

exports.middleware = faceplate.middleware({
	app_id: process.env.FACEBOOK_APP_ID,
	secret: process.env.FACEBOOK_SECRET,
	scope: 'user_likes,user_photos,user_photo_video_tags'
});

var ckmw = express.cookieParser();
exports.getAPI = function(socket, cb) {
	var req = socket.handshake;
	ckmw(req, null, function() {
		if(req.cookies) {
			req.body = {};
			exports.middleware(req, null, function() {
				cb(req.facebook);
			});
		} else {
			cb();
		}
	});
}