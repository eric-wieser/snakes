var util = require("util");
var events = require("events");

Player = function Player(socket, name, color) {
    events.EventEmitter.call(this);
	this.socket = socket;
	this.color = color;
	this.name = name;
	this.connected = true;
	//this.resendAllEntities();
	

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


Player.prototype.spawnSnake = function(world) {
	if(this.connected) {
		if(this.snake) this.snake.destroy();
		this.emit('spawn');

		var $this = this;
		var snake = new Snake(
			10,
			this.color,
			world.randomPosition(),
			world
		);
		snake.owner = this;
		snake.target = snake.head.position.clone();
		snake
			.on('death', function(killer) {
				$this.snake = null;
				$this.emit('death', 'enemy', killer.owner)
			})
			.on('eat.tail', function(ball) {
				if(ball.ownerSnake && ball.ownerSnake.owner)
					util.log($this.coloredName +" ate some of "+ball.ownerSnake.owner.coloredName);
			});
		this.snake = snake;

	}
}