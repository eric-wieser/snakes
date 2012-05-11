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


var app = express.createServer();
app.listen(8090);
app.use(express.static(__dirname, {maxAge: 60000}));
app.use(express.errorHandler());
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});
app.get('/local', function (req, res) {
	res.sendfile(__dirname + '/snakes.html');
});
var players = {};
var universe = new World(2000, 2000);

var snakes = [];

io = socketio.listen(app);
io.set('log level', 2);
io.sockets.on('connection', function (socket) {
	var name;
	var snake;
	socket.on('join', function(n, callback) {
		n = n + "";
		if(n.length < 3) {
			callback(false, true);
		} else if(!(n in players)) {
			name = n;
			console.log("Player joined:", n);

			universe.entities.forEach(function(e) {
				socket.emit('entityadded', {
					p: e.position,
					r: e.radius,
					c: e.color,
					i: e._id
				});
			});

			//Tell the other players a new ball has appeared
			if(name=="Pwn"){
			snake = players[n] = new Snake(
				120,
				Color.random(),
				universe.randomPosition(),
				universe
			);}
			else
			{			snake = players[n] = new Snake(
				10,
				Color.random(),
				universe.randomPosition(),
				universe
			);}
			snake.name = name;
			snake.target = snake.head.position.clone();
			snakes.push(snake);
			callback(true);
		} else {
			callback(false);
			console.log("Name " + n + " invalid!");
		}
	});


	socket.on('playercontrol', function (target) {
		if(name) {
			target = Vector.ify(target);
			if(target)
				snake.target = target;
		}
	});

	socket.on('disconnect', function () {
		if(name) {
			socket.broadcast.emit('playerquit', {name: name});
			console.log("Player quit:", name);
			snake.balls.forEach(function(b) {
				universe.removeEntity(b);
			})
			delete players[name];
			name = null;
			snake = null;
		}
	});

});


universe.onEntityRemoved.updateClients = function(e) {
	io.sockets.emit('entitylost', e._id);
}
universe.onEntityAdded.updateClients = function(e) {
	io.sockets.emit('entityadded', {
		p: e.position,
		r: e.radius,
		c: e.color,
		i: e._id
	});
}
updateClients = function() {
	var data = {};
	data.e = {};
	data.s = {};
	universe.entities.forEach(function(e) {
		var entityUpdate = {};
		entityUpdate.pos = e.position;
		entityUpdate.color = e.color;
		entityUpdate.radius = e.radius;
		if(e.ownerSnake && e.ownerSnake.name) {
			entityUpdate.playername = e.ownerSnake.name;
			if(e == e.ownerSnake.head) entityUpdate.head = true;
		}

		data.e[e._id] = entityUpdate;
	});
	// Object.forEach(players, function(snake, name) {
	// 	data.s[name] = snake.balls.pluck('_id');
	// });
	Object.forEach(players, function(snake, name) {
	 	data.s[name] = snake.head._id;
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
generateBalls(50);

var lastt = +Date.now();
var i;

var lastSync = lastt;

i = setInterval(function() {
	var t = +Date.now();
	var dt = (t - lastt) / 1000.0;
	
	Object.forEach(players, function(player) {
		if(player.target) {
			var displacement = player.target.minus(player.head.position);
			var distance = displacement.length;
			var force = Math.min(distance*5, 400)*player.head.mass;

			player.head.forces.player = distance > 1 ?
				displacement.timesEquals(force / distance) :
				Vector.zero;
		}
	});
	universe.update(dt);
	snakes.forEach(function(s) {
		s.update(dt);
	});
	updateClients();
	lastt = t;
}, 1000 / 60.0);

setInterval(function() {
	scores = []
	var mass = universe.totalMass;
	Object.forEach(players, function(s, name) {
		scores.push([name, Math.round(1000*s.mass / mass), s.color.toString()])
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
	} else {
		console.log("sending message");
		io.sockets.emit('servermessage', ""+chunk);
	}
});