var util = require("util");
var events = require("events");

Player = function Player(socket, name, color) {
    events.EventEmitter.call(this);
	this.socket = socket;
	this.color = color;
	this.name = name;
	this.connected = true;
	this.resendAllEntities();
	

	var $this = this;


	socket.on('playercontrol', function(target) {
		if($this.snake) {
			target = Vector.ify(target);
			if(target)
				$this.snake.target = target;
		}
	});

	socket.on('chat', function(msg) {
		$this.chat(msg);
	});

	socket.on('disconnect', function() {
		$this.disconnect();
	});
}

util.inherits(Player, events.EventEmitter);
Object.defineProperty(Player.prototype, 'coloredName', {
	get: function() {
		return this.name.colored(this.color);
	}
})
Player.prototype.disconnect = function() {
	if(this.connected) {
		this.emit('quit');
		this.connected = false;
		this.name = null;
		if(this.snake) this.snake.destroy();
		this.snake = null;
	}
}
Player.prototype.kill = function() {
	if(this.connected && this.snake) {
		this.snake.destroy();
		this.snake = null;
		this.emit('death', 'console');
	}
}
Player.prototype.chat = function(msg) {
	msg = (""+msg).trim();

	if(this.connected && msg.length < 1024 && msg.length != 0) {
		this.emit('chat', msg);
	}
}
Player.prototype.resendAllEntities = function() {
	var p = this;
	universe.entities.forEach(function(e) {
		p.socket.emit('entityadded', {
			p: e.position.toFixed(2),
			r: e.radius,
			c: e.color.toInt(),
			i: e._id
		});
	});
}

Player.prototype.spawnSnake = function() {
	var $this = this;
	var snake = new Snake(
		10,
		this.color,
		universe.randomPosition(),
		universe
	);
	snake.owner = this;
	snake.target = snake.head.position.clone();
	snake.onDeath.playerDeath = function(killer) {
		$this.snake = null;
		$this.emit('death', 'enemy', killer.owner)
	};
	snake.onBallEaten.notify = function(ball, type) {
		console.log($this.coloredName +" ate a "+type+" ball");
	}
	this.snake = snake;
}

//returns a function that listens to a socket, and calls onJoined when a player joins
Player.listener = function(onJoined) {
	return function(socket) {
		var gotResponse = false;
		socket.on('join', function(data, callback) {
			if(gotResponse) return;

			var name = data.name;
			if(typeof name != "string") return;

			name = name.replace(/^\s+|\s+$/, '');
			if(name.length < 3 || name.length > 64) {
				callback({error: "Name length invalid"});
			} else if(!(name in players)) {
				gotResponse = true;
				onJoined.call(new Player(socket, name, Color.niceColor(data.color)));
				callback(true);
			} else {
				//Name already taken
				callback({error: "Someone else has that name"});
				console.log();
			}
		});
	}
}
