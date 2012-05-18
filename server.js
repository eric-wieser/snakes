//var process = require('process');
var express = require('express');
var socketio = require('socket.io');
var readline = require('readline');
var colors = require('colors');
var util = require('util');
var browserify = require('browserify');

require('./util');
require('./color');
require('./vector');
require('./entity');
require('./ball');
require('./world');
require('./snake');
require('./player');
require('./game');
//universe = new World(2000, 2000);

var game = new Game();

var app = express.createServer();
var port = +process.argv[2] || 8090;
app.listen(port);

app.configure(function() {
	app.use(express.static(__dirname, {maxAge: 60000}));
	app.use(browserify({
		require : [ 'events', 'util', './color', './snake', './vector', './ball', './entity', './world' ]
	}));
	app.set('view options', { layout: false });
	app.set('view engine', 'ejs');
	app.use(express.errorHandler());
});
app.get('/', function (req, res) {
	res.render(__dirname + '/index', {port: port});
	//res.sendfile(__dirname + '/index.html');
});
app.get('/local', function (req, res) {
	res.sendfile(__dirname + '/snakes.html');
});

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var io = socketio.listen(app);
io.configure('development', function() {
	io.set('log level', 1);
	io.set('close timeout', 2.5);
})

io.sockets.on('connection', game.playerListener());

game.on('player.join', function(p) {
	util.log("Player ".grey + p.coloredName + " joined".grey);

	if(this.running) {
		if(this.joinable())
			p.spawnSnake(game.world);
		else
			p.socket.emit('servermessage', 'You\'ll have to wait for the next game');
	} else if(this.connectedPlayerCount() >= 2) {
		this.start();
	} else {
		p.socket.emit('servermessage', 'Waiting for more players');
	}

	p.on('chat', function(msg) {	
		var data = {n: this.name, c: this.color.toInt(), m: msg};
		this.socket.emit('chat', data);
		this.socket.broadcast.emit('chat', data);
		util.log(this.coloredName + ": ".grey + msg)
	});
})
.on('player.death', function(p, type, killer) {
	if(type == "enemy") {
		util.log(p.coloredName + " was killed by " + killer.coloredName);
		// var data = {n: "", c: new Color(192, 192, 192).toInt(), m: "Killed by "+ killer.name};
		// this.socket.emit('chat', data);
		io.sockets.emit(
			'servermessage',
			'<span style="color:' +killer.color.toString()+'">' + htmlEntities(killer.name) + '</span> killed ' + 
			'<span style="color:' +p.color.toString()+'">' +	 htmlEntities(p.name) + '</span>!');
		killer.snake && (killer.snake.maxMass *= 2);
	}
	else if(type == "console")
		util.log(this.coloredName + " eliminated");
})
.on('player.quit', function(p) {
	util.log("Player ".grey + p.coloredName + " quit".grey);
})
.on('player.quit', function(p) {
	//Clear the world if the player is last to leave
	if(Object.size(this.livingPlayers) == 0) {
		this.reset();
		if(this.connectedPlayerCount() >= 2)
			this.start();
	}
})
.on('player.death', function(p) {
	//Clear the world if the player is last to leave
	if(Object.size(this.livingPlayers) == 1 && !this.joinable()) {
		var winner = Object.values(this.livingPlayers)[0]
		io.sockets.emit(
			'servermessage', '<span style="color:' +winner.color.toString()+'">' + htmlEntities(winner.name) + '</span> won!'
		);
		setTimeout(function() {
			this.reset();
			if(this.connectedPlayerCount() >= 2)
				this.start();
		}.bind(this), 2000);
	} else {
		util.log(Object.size(this.livingPlayers));
	}
})
.on('start', function() {
	io.sockets.emit('servermessage', "New game started!");
})

setInterval(function() {
	io.sockets.emit('scores', game.scores());
}, 500);

(function makeCLI() {

	//Create a command line interface from the console
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
					Object.forEach(game.players, function(p, n) {
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

	//Fix the way the cli handles logging while the user is typing
	(function() {
		var oldWrite = process.stdout.write;
		var newStdout = Object.create(process.stdout);
		newStdout.write = function() {
			cli.output.write('\x1b[2K\r');
			var result = oldWrite.apply(this, Array.prototype.slice.call(arguments));
			cli._refreshLine();
			return result;
		}
		process.__defineGetter__('stdout', function() { return newStdout; });
	})();

	//Add commands
	cli.on('line', function(line) {
		if(/^\s*players/.test(line)) {
			util.log(Object.values(game.players).pluck('coloredName').join(', '));
		} else if(/^\s*game/.test(line)) {
			console.log(game);
		} else if(/^\s*mass/.test(line)) {
			console.log('Total mass of the universe: '+game.world.totalMass);
		} else if(/^\s*score/.test(line)) {
			var width = cli.columns;
			var perMass = width / game.world.totalMass;
			var bar = "";
			var barLength = 0;
			var scoreSoFar = 0;

			Object.forEach(game.players, function(p) {
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
			console.log(Object.values(game.players).pluck('coloredName').join(', '));
		} else if(matches = /^\s*balls (\d+)/.exec(line)) {
			game.generateBalls(+matches[1]);
		} else if(matches = /^\s*kick (.+)/.exec(line)) {
			var player = game.players[matches[1]]
			player && player.disconnect();
		} else if(matches = /^\s*kill (.+)/.exec(line)) {
			var player = game.players[matches[1]]
			player && player.kill();
		} else if(matches = /^\s*spawn (.+)/.exec(line)) {
			var player = game.players[matches[1]]
			player && !player.snake && player.spawnSnake(game.world);
		} else if(matches = /^\s*help (.+)/.exec(line)) {
			var player = game.players[matches[1]]
			player && player.snake && (player.snake.maxMass *= 2);
		} else {
			util.log('sending "'.grey+line+'"'.grey);
			io.sockets.emit('servermessage', ""+line);
		}
		cli.prompt();
	}).on('close', function() {
		io.sockets.emit('servermessage', 'Server going down!');
		process.exit(0);
	});
	cli.prompt();
})();