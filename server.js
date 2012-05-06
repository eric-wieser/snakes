var express = require('express');
var socketio = require('socket.io');
require('./client/vector.js');
require('./client/entity.js');

console.log(new Vector(4, 4));

var app = express.createServer();
app.listen(8090);
app.use(express.static(__dirname));
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

var box = new Entity(new Vector(50, 50));

io = socketio.listen(app);
io.sockets.on('connection', function (socket) {
	var name;
	socket.on('set-name', function (n) {
		name = n;
		console.log("Name set!");
	});

	socket.on('playercontrol', function (data) {
		if(name) {
			var f = Vector.prototype.clone.call(data);
			box.forces[name] = f;
			console.log(box.forces, box.velocity);
		}
	});

	socket.on('disconnect', function () {
		delete box.forces[name];
	});

});
var lastt = +Date.now();
var i;
i = setInterval(function() {
	var t = +Date.now();
	var dt = (t - lastt) / 1000.0;
	var speed = box.velocity.magnitude();
	if(speed != speed) {
		clearInterval(i);
	}
	console.log(dt, box.forces, box.velocity.magnitude());


	//box.forces.resistance = box.velocity.times(100*-box.velocity.magnitude());
	box.update(dt);
	io.sockets.volatile.emit('update', box.position);

	lastt = t;
}, 1000 / 60.0)