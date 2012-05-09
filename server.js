var express = require('express');
var socketio = require('socket.io');

Array.prototype.contains = function(x) { return this.indexOf(x) != -1; }

Array.prototype.forEveryPair = function(callback, thisPtr) {
	var l = this.length;
	for(var i = 0; i < l; i++) {
		for(var j = i + 1; j < l; j++) {
			var ti = this[i], tj = this[j];
			if(ti !== undefined && tj !== undefined)
				callback.call(thisPtr, ti, tj, i, j, this);
		}
	}
};
Array.prototype.forAdjacentPairs = function(callback, thisPtr) {
	var l = this.length;
	for (var i = 0, j = 1; j < l; i = j++) {
		var ti = this[i], tj = this[j];
		if(ti !== undefined && tj !== undefined)
			callback.call(thisPtr, ti, tj, i, j, this);
	}
};

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

require('./color');
require('./vector');
require('./entity');
require('./ball');
require('./world');


var app = express.createServer();
app.listen(8090);
app.use(express.static(__dirname));
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

var players = {};
var universe = new World(750, 500);


io = socketio.listen(app);
io.set('log level', 2);
io.sockets.on('connection', function (socket) {
	var name;
	var ball;
	socket.on('join', function(n, callback) {
		if(!(n in players)) {
			name = n;
			console.log("Name set!");

			universe.entities.forEach(function(e) {
				socket.emit('entityadded', e);
			});

			//Tell the other players a new ball has appeared
			for(p in players) {
				var b = players[p];
				socket.emit('newplayer', {name: p, p: b.position, c: b.color, r: b.radius});
			}
			ball = players[n] = new Ball(
				universe.randomPosition(),
				10, Color.random(),
				"player-"+n
			)
			universe.addEntity(ball);
			ball.target = ball.position.clone();
			socket.broadcast.emit('newplayer', {name: n, p:ball.position, c: ball.color, r: ball.radius});
			callback({name: n, p: ball.position, c: ball.color, r: ball.radius});
		} else {
			callback(false);
			console.log("Name " + n + " invalid!");
		}
	});


	socket.on('playercontrol', function (target) {
		if(name) {
			ball.target = Vector.ify(target);
			//socket.broadcast.emit('playercontrol', {p: name, f: data});
		}
	});

	socket.on('disconnect', function () {
		socket.broadcast.emit('playerquit', {name: name});
		universe.removeEntity(players[name])
		delete players[name];
		name = null;
		ball = null;
	});

});


universe.onEntityRemoved.updateClients = function(e) {
	io.sockets.emit('entitylost', e._id);
}
universe.onEntityAdded.updateClients = function(e) {
	io.sockets.emit('entityadded', e);
}
universe.onUpdated.updateClients = function() {
	var data = {};
	this.entities.forEach(function(e) {
		var entityUpdate = {};
		entityUpdate.pos = e.position;
		entityUpdate.color = e.color;
		entityUpdate.radius = e.radius;

		data[e._id] = entityUpdate;
	});
	io.sockets.emit('entityupdates', data);
}
var randomInt = function(min, max) {
	if(max === undefined) {
		max = min;
		min = 0;
	}
	return Math.floor(Math.random() * (max - min) + min);
};

var balls = [];
//Generate ALL THE BALLS
for(var i = 0; i <= 50; i++) {
	var r = Math.random();
	var color, radius;

	if     (r < 0.33) color = new Color(192, 192, 192), radius = randomInt(5,  10);
	else if(r < 0.66) color = new Color(128, 128, 128), radius = randomInt(10, 20);
	else              color = new Color( 64,  64,  64), radius = randomInt(20, 40);

	balls[i] = new Ball(universe.randomPosition(), radius, color);
	universe.addEntity(balls[i]);
}

var lastt = +Date.now();
var i;

var lastSync = lastt;

i = setInterval(function() {
	var t = +Date.now();
	var dt = (t - lastt) / 1000.0;
	
	//box.forces.resistance = box.velocity.times(100*-box.velocity.magnitude());
	for(p in players) {
		var displacement = players[p].target.minus(players[p].position);
		var distance = displacement.length;
		var force = Math.min(distance, 200)*players[p].mass;

		players[p].forces.player = distance > 1 ? displacement.timesEquals(force / distance) : Vector.zero;
		console.log(p, force);
	}
	universe.update(dt);
	lastt = t;
}, 1000 / 60.0)