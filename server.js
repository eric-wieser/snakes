var express = require('express');
var socketio = require('socket.io');
require('./client/color.js');
require('./client/vector.js');
require('./client/entity.js');
require('./client/ball.js');

Object.isEmpty = function(obj) {
	for (var prop in obj) if (obj.hasOwnProperty(prop)) return false;
	return true;
}
Object.forEachPair = function(obj, f, thisPtr) {
	for(i in obj) {
		for(j in obj) {
			var oi = obj[i], oj = obj[j];
			if(i < j && oi && oj) {
				f.call(thisPtr, oi, oj, i, j, obj);
			}
		}
	}
}

var app = express.createServer();
app.listen(8090);
app.use(express.static(__dirname));
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

var players = {};
var width = 750, height = 500;

io = socketio.listen(app);
io.set('log level', 2);
io.sockets.on('connection', function (socket) {
	var name;
	var ball;
	socket.on('join', function(n, callback) {
		if(!(n in players)) {
			name = n;
			console.log("Name set!");

			for(p in players) {
				var b = players[p];
				socket.emit('newplayer', {name: p, p: b.position, c: b.color, r: b.radius});
			}
			ball = players[n] = new Ball(
				new Vector(Math.random()*width, Math.random()*height),
				10, Color.random(),
				"player-"+n
			)
			ball.target = ball.position.clone();
			socket.broadcast.emit('newplayer', {name: n, p:ball.position, c: ball.color, r: ball.radius});
			callback({name: n, p: ball.position, c: ball.color, r: ball.radius});
		} else {
			callback(false);
		}
	});

	socket.on('playercontrol', function (target) {
		if(name) {
			target.__proto__ = Vector.prototype;
			console.log(target);
			ball.target = target
			//socket.broadcast.emit('playercontrol', {p: name, f: data});
		}
	});

	socket.on('disconnect', function () {
		socket.broadcast.emit('playerquit', {name: name});
		delete players[name];
		name = null;
		ball = null;
	});

});
var lastt = +Date.now();
var i;

var lastSync = lastt;

i = setInterval(function() {
	var t = +Date.now();
	var dt = (t - lastt) / 1000.0;
	
	//box.forces.resistance = box.velocity.times(100*-box.velocity.magnitude());
	for(p in players) {
		for(p2 in players) {
			if(p < p2) {
				players[p].updateForceFrom(players[p2]);
			}
		}

		var displacement = players[p].target.minus(players[p].position);
		var distance = displacement.magnitude();
		var force = Math.min(distance, 200)*players[p].getMass();

		players[p].forces.player = distance > 1 ? displacement.timesEquals(force / distance) : Vector.zero();
		players[p].update(dt);
	}
	for(p in players) {
		players[p].bounceOffWalls(width, height);
	}
	lastt = t;
	if(!Object.isEmpty(players)) {
		var data = {};
		for(p in players) {
			var ball = players[p];
			data[p] = {p: ball.position, v: ball.velocity};
		}

		io.sockets.volatile.emit('update', data);
		lastSync = t;
	}

}, 1000 / 60.0)