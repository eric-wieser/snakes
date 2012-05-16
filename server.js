//var process = require('process');
var express = require('express');
var socketio = require('socket.io');
var readline = require('readline');
var colors = require('colors');

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

var gameRunning = false;

var tryStartGame = function() {
	if(!gameRunning) {
		if(Object.keys(players).length >= 2) {
			generateBalls(50);
			Object.forEach(players, function(p) {
				p.spawnSnake();
			});
			console.log("Balls placed");
			gameRunning = true;
			return true;
		}
	}
	return false;
}


function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var io = socketio.listen(app);
io.set('log level', 1);
io.set('close timeout', 5);
io.sockets.on('connection', Player.listener(function() {
	console.log("Player ".grey + this.coloredName + " joined".grey);

	players[this.name] = this;

	if(tryStartGame()) {
	}
	else if(gameRunning) {
		var totalPlayerMass = Object.reduce(players, function(sum, p) { return sum + (p.snake ? p.snake.mass : 0) }, 0);
		if(totalPlayerMass <= universe.totalMass / 3)
			this.spawnSnake();
		else
			this.socket.emit('servermessage', 'You\'ll have to wait for the next game');
	} else {
		this.socket.emit('servermessage', 'Waiting for more players');
	}
	this.on('quit', function() {
		delete players[this.name];
		console.log("Player ".grey + this.coloredName + " quit".grey);
		//Clear the world if the player is last to leave
		if(Object.every(players, function(p) {return p.snake == null})) {
			gameRunning = false;
			universe.clear();
			tryStartGame();
		}
	}).on('chat', function(msg) {	
		var data = {n: this.name, c: this.color.toInt(), m: msg};
		this.socket.emit('chat', data);
		this.socket.broadcast.emit('chat', data);
		console.log(this.coloredName + ": ".grey + msg)
	}).on('death', function(type, killer) {
		if(type == "enemy") {
			console.log(this.coloredName + " was killed by " + killer.coloredName);
			// var data = {n: "", c: new Color(192, 192, 192).toInt(), m: "Killed by "+ killer.name};
			// this.socket.emit('chat', data);
			io.sockets.emit(
				'servermessage',
				'<span style="color:' +killer.color.toString()+'">' + htmlEntities(killer.name) + '</span> killed ' + 
				'<span style="color:' +this.color.toString()+'">' +	 htmlEntities(this.name) + '</span>!');
			killer.snake && (killer.snake.maxMass *= 2);
		}
		else if(type == "console")
			console.log(this.name.yellow + " eliminated");
	});

}));


// universe.onEntityRemoved.updateClients = function(e) {
// 	io.sockets.emit('entitylost', e._id);
// }
// universe.onEntityAdded.updateClients = function(e) {
// 	io.sockets.emit('entityadded', {
// 		p: e.position.toFixed(2),
// 		r: e.radius,
// 		c: e.color.toInt(),
// 		i: e._id
// 	});
// }
updateClients = function() {
	var data = {};
	data.e = {};
	data.s = {};
	universe.entities.forEach(function(e) {
		var entityUpdate = {};
		entityUpdate.p = e.position.toFixed(2);
		entityUpdate.c = e.color.toInt();
		entityUpdate.r = e.radius;
		if(e.ownerSnake && e.ownerSnake.owner) {
			entityUpdate.n = e.ownerSnake.owner.name;
			if(e == e.ownerSnake.head) entityUpdate.h = true;
		}

		data.e[e._id] = entityUpdate;
	});
	// Object.forEach(players, function(snake, name) {
	// 	data.s[name] = snake.balls.pluck('_id');
	// });
	Object.forEach(players, function(player, name) {
	 	player.snake && (data.s[name] = player.snake.head._id);
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
		if(snake && snake.target) {
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
		try {p.snake && p.snake.update(dt); }
		catch(e) { console.log("O shit", e, p); }
	});
	updateClients();
	lastt = t;
}, 1000 / 30.0);

setInterval(function() {
	scores = []
	var mass = universe.totalMass;
	Object.forEach(players, function(player, name) {
		player.snake && scores.push([name, Math.round(1000*player.snake.mass / mass), player.snake.color.toString()])
	});
	scores.sort(function(a, b){ 
		return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
	});
	io.sockets.emit('scores', scores);
}, 500);


var cli = readline.createInterface(
	process.stdin,
	process.stdout,
	function (line) {
		var playercommands = ['kick', 'kill', 'spawn', 'help'];
		var commands = ['mass', 'balls'];
		var allCommands = playercommands.concat(commands)

		for(var i = 0; i < playercommands.length; i++) {
			var command = playercommands[i]
			if(line.indexOf(command) == 0) {
				var name = line.substr(command.length + 1);
				var completions = [];
				Object.forEach(players, function(p, n) {
					if(n.indexOf(name) == 0)
						completions.push(command + ' ' + n);
				})
				return [completions, line];
			}
		}

		var hits = allCommands.filter(function(c) {
			return c.indexOf(line) == 0;
		});
		return [hits && hits.length ? hits : completions, line];
	}
);
cli.setPrompt("> ".grey, 2);
var log = console.log;
console.log = function() {
	cli.pause();
	cli.output.write('\x1b[2K\r');
	log.apply(console, Array.prototype.slice.call(arguments));
	cli.resume();
	cli._refreshLine();
}
cli.on('line', function(line) {
	if(/^\s*players/.test(line)) {
		console.log(Object.values(players).pluck('coloredName').join(', '));
	} else if(/^\s*mass/.test(line)) {
		console.log('Total mass of the universe: '+universe.totalMass);
	} else if(/^\s*score/.test(line)) {
		var width = cli.columns;
		var perMass = width / universe.totalMass;
		var bar = "";
		var barLength = 0;
		var scoreSoFar = 0;

		Object.forEach(players, function(p) {
			if(p.snake) {
				var score = p.snake.mass;
				scoreSoFar += score;
				var thisBar = "";
				while(barLength + thisBar.length < scoreSoFar * perMass)
					thisBar += '█';

				barLength += thisBar.length;
				bar += thisBar.colored(p.color);
			}
		});

		console.log(bar);
		console.log(Object.values(players).pluck('coloredName').join(', '));
	} else if(matches = /^\s*balls (\d+)/.exec(line)) {
		generateBalls(+matches[1]);
	} else if(matches = /^\s*kick (.+)/.exec(line)) {
		var player = players[matches[1]]
		player && player.disconnect();
	} else if(matches = /^\s*kill (.+)/.exec(line)) {
		var player = players[matches[1]]
		player && player.kill();
	} else if(matches = /^\s*spawn (.+)/.exec(line)) {
		var player = players[matches[1]]
		player && !player.snake && player.spawnSnake();
	} else if(matches = /^\s*help (.+)/.exec(line)) {
		var player = players[matches[1]]
		player && player.snake && (player.snake.maxMass *= 2);
	} else {
		console.log('sending "'.grey+line+'"'.grey);
		io.sockets.emit('servermessage', ""+line);
	}
	cli.prompt();
}).on('close', function() {
	io.sockets.emit('servermessage', 'Server going down!');
	process.exit(0);
});
cli.prompt();