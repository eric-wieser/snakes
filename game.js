var util = require('util');
var events = require("events");

Game = function Game() {
	this.players = {};
	this.livingPlayers = {};
	this.running = false;

	var lastt = +Date.now();
	setInterval((function() {
		var t = +Date.now();
		var dt = (t - lastt) / 1000.0;
		this.tick(dt);
		lastt = t;
	}).bind(this), 1000 / 30.0)
}

util.inherits(Game, events.EventEmitter);
Game.prototype.addPlayer = function(p) {
	var game = this;

	this.players[p.name] = p;

	p.on('quit', function() {
		delete game.players[this.name];
		delete game.livingPlayers[this.name];
		game.emit('player.quit', this);
	}).on('spawn', function() {
		game.livingPlayers[this.name] = this;
		game.emit('player.spawn', this);
	}).on('death', function(cause, killer) {
		delete game.livingPlayers[this.name];
		game.emit('player.death', this, cause, killer);
	});

	this.emit('player.join', p);
}
Game.prototype.playerByName = function(name) {
	return this.players[name];
}
Game.prototype.playerListener = function() {
	var game = this;
	return function(socket) {
		var gotResponse = false;
		socket.on('join', function(data, callback) {
			//Already had a player join from this socket
			if(gotResponse) return;

			//Sanitize the name - check if a string, and trim
			var name = data.name;
			if(typeof name != "string") return;
			name = name.trim();

			//Prevent names of stupid lengths
			if(name.length < 3 || name.length > 64) {
				callback({error: "Name length invalid"});
			}
			//Is this a unique name?
			else if(!game.playerByName(name)) {
				gotResponse = true;
				callback(true);
				game.addPlayer(new Player(socket, name, Color.niceColor(data.color)));
			}
			//Name already taken
			else {
				callback({error: "Someone else has that name"});
			}
		});
	}
}

Game.prototype.joinable = function(n) {
	if(!this.running) return false;
	else {
		var totalMass = this.world.totalMass;
		var totalPlayerMass = this.world.entities
			.filter(function(e) { return e.ownerSnake; })
			.reduce(function(sum, e) { return sum + e.mass }, 0);

		return totalPlayerMass < totalMass / 3;
	}
}

Game.prototype.connectedPlayerCount = function() {
	return Object.keys(this.players).length;
}

Game.prototype.updateClients = function() {
	var data = {};
	data.e = {};
	data.s = {};
	this.world.entities.forEach(function(e) {
		var entityUpdate = {};
		entityUpdate.p = e.position.toFixed(2);
		entityUpdate.c = e.color.toInt();
		entityUpdate.r = e.radius;
		if(e.ownerSnake && e.ownerSnake.owner) {
			//entityUpdate.n = e.ownerSnake.owner.name;
			//if(e == e.ownerSnake.head) entityUpdate.h = true;
		}

		data.e[e._id] = entityUpdate;
	});

	Object.forEach(this.players, function(player, name) {
	 	player.snake  && player.snake.head && (data.s[name] = player.snake.head._id);
	});
	Object.forEach(this.players, function(p) {
		p.socket.volatile.emit('entityupdates', data);
	});
}

Game.prototype.tick = function(dt) {
	if(this.running) {		
		Object.forEach(this.livingPlayers, function(p) {
			var snake = p.snake;
			if(snake.target) {
				var displacement = snake.target.minus(snake.head.position);
				var distance = displacement.length;
				var force = Math.min(distance*5, 400)*snake.head.mass;

				snake.head.forces.player = distance > 1 ?
					displacement.timesEquals(force / distance) :
					Vector.zero;
			}
		});
		this.world.update(dt);
		Object.forEach(this.livingPlayers, function(p) {
			p.snake.update(dt);
		});
		this.updateClients();
	} else {
		Object.forEach(this.players, function(p) {
			p.socket.emit('ping');
		});
	}
}

//Generate the gray balls
Game.prototype.generateBalls = function(n) {
	if(!this.running) throw new Error('Game not running');

	for(var i = 0; i <= n; i++) {
		var r = Math.random() * 3;
		var color, radius;

		if     (r < 1) color = new Color(192, 192, 192), radius = Math.random() * 5  + 5 ;
		else if(r < 2) color = new Color(128, 128, 128), radius = Math.random() * 10 + 10;
		else           color = new Color( 64,  64,  64), radius = Math.random() * 20 + 20;

		this.world.addEntity(
			new Ball(this.world.randomPosition(), radius, color)
		);
	}
}

Game.prototype.start = function() {
	if(this.running) throw new Error('Game already running');
	this.running = true;
	this.world = new World(2000, 2000);
	Object.forEach(this.players, function(p) {
		p.spawnSnake(this.world);
	}, this);
	this.generateBalls(50);
	this.emit('start');
}

Game.prototype.reset = function() {
	if(!this.running) return;

	Object.forEach(this.players, function(p) {
		p.kill();
	});
	delete this.world;
	this.running = false;
}

Game.prototype.scores = function() {
	if(!this.running) return;
	var scores = []
	var mass = this.world.totalMass;
	Object.forEach(this.livingPlayers, function(p, name) {
		scores.push([
			name, Math.round(1000*p.snake.mass / mass), p.color.toString()
		]);
	});
	scores.sort(function(a, b){ 
		return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
	});
	return scores;
}