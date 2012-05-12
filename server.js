//var process = require('process');
var express = require('express');
var socketio = require('socket.io');

require('./util');
require('./color');
require('./vector');
require('./entity');
require('./ball');
require('./world');
require('./snake');
players = {};
universe = new World(2000, 2000);
require('./player');


var app = express.createServer();
app.listen(+process.argv[2] || 8090);
app.use(express.static(__dirname, {maxAge: 60000}));
app.use(express.errorHandler());
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});
app.get('/local', function (req, res) {
	res.sendfile(__dirname + '/snakes.html');
});

io = socketio.listen(app);
io.set('log level', 2);
io.sockets.on('connection', Player.listener(function() {
	console.log("Player "+this.name+" joined");
	if(Object.keys(players).length == 1) {
		generateBalls(50);
		console.log("Balls placed");
	}

	players[this.name] = this;

	this.onQuit.stuff = function() {
		delete players[this.name];
		console.log("Player "+this.name+" quit");
		//Clear the world if the player is last to leave
		if(Object.isEmpty(players)) {
			universe.clear();
			console.log("Universe cleared");
		}
	}
}));


universe.onEntityRemoved.updateClients = function(e) {
	io.sockets.emit('entitylost', e._id);
}
universe.onEntityAdded.updateClients = function(e) {
	io.sockets.emit('entityadded', {
		p: e.position.toFixed(2),
		r: e.radius,
		c: e.color.toInt(),
		i: e._id
	});
}
updateClients = function() {
	var data = {};
	data.e = {};
	data.s = {};
	universe.entities.forEach(function(e) {
		var entityUpdate = {};
		entityUpdate.p = e.position.toFixed(2);
		entityUpdate.c = e.color.toInt();
		entityUpdate.r = e.radius;
		if(e.ownerSnake && e.ownerSnake.name) {
			entityUpdate.n = e.ownerSnake.name;
			if(e == e.ownerSnake.head) entityUpdate.h = true;
		}

		data.e[e._id] = entityUpdate;
	});
	// Object.forEach(players, function(snake, name) {
	// 	data.s[name] = snake.balls.pluck('_id');
	// });
	Object.forEach(players, function(player, name) {
	 	data.s[name] = player.snake.head._id;
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

var snakes = [];

var generateBalls = function(n) {
	//Generate the gray balls
	for(var i = 0; i <= n; i++) {
		var r = Math.random();
		var color, radius;

		if     (r < 0.33) color = new Color(192, 192, 192), radius = randomInt(5,  10);
		else if(r < 0.66) color = new Color(128, 128, 128), radius = randomInt(10, 20);
		else              color = new Color( 64,  64,  64), radius = randomInt(20, 40);

		universe.addEntity(
			new Ball(universe.randomPosition(), radius, color)
		);
	}
}

var lastt = +Date.now();
var i;

var lastSync = lastt;

i = setInterval(function() {
	var t = +Date.now();
	var dt = (t - lastt) / 1000.0;
	
	Object.forEach(players, function(player) {
		var snake = player.snake;
		if(snake.target) {
			var displacement = snake.target.minus(snake.head.position);
			var distance = displacement.length;
			var force = Math.min(distance*5, 400)*snake.head.mass;

			snake.head.forces.player = distance > 1 ?
				displacement.timesEquals(force / distance) :
				Vector.zero;
		}
	});
	universe.update(dt);
	Object.forEach(players, function(p) {
		p.snake.update(dt);
	});
	updateClients();
	lastt = t;
}, 1000 / 30.0);

setInterval(function() {
	scores = []
	var mass = universe.totalMass;
	Object.forEach(players, function(player, name) {
		scores.push([name, Math.round(1000*player.snake.mass / mass), player.snake.color.toString()])
	});
	scores.sort(function(a, b){ 
		return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
	});
	io.sockets.emit('scores', scores);
}, 500);


var stdin = process.openStdin();
stdin.resume();
stdin.on('data', function(chunk) {
	if(/^\s*players/.test(chunk)) {
		console.log(Object.keys(players).join(', '));
	} else if(/^\s*mass/.test(chunk)) {
		console.log('Total mass of the universe: '+universe.totalMass);
	} else if(matches = /^\s*balls (\d+)/.exec(chunk)) {
		generateBalls(+matches[1]);
	} else if(matches = /^\s*kick (.+)/.exec(chunk)) {
		var player = players[matches[1]]
		player && player.disconnect();
	} else {
		console.log("sending message");
		io.sockets.emit('servermessage', ""+chunk);
	}
});