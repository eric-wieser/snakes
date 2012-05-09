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
var universe = new World(1000, 800);

var snakes = [];

io = socketio.listen(app);
io.set('log level', 2);
io.sockets.on('connection', function (socket) {
	var name;
	var snake;
	socket.on('join', function(n, callback) {
		if(!(n in players)) {
			name = n;
			console.log("Name set!");

			universe.entities.forEach(function(e) {
				socket.emit('entityadded', e);
			});

			//Tell the other players a new ball has appeared
			snake = players[n] = new Snake(
				10,
				Color.random(),
				universe.randomPosition()
			);
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
			snake.target = Vector.ify(target);
		}
	});

	socket.on('disconnect', function () {
		socket.broadcast.emit('playerquit', {name: name});
		universe.removeEntity(players[name])
		delete players[name];
		name = null;
		snake = null;
	});

});


universe.onEntityRemoved.updateClients = function(e) {
	io.sockets.emit('entitylost', e._id);
}
universe.onEntityAdded.updateClients = function(e) {
	io.sockets.emit('entityadded', e);
}
updateClients = function() {
	var data = {};
	universe.entities.forEach(function(e) {
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

var Snake = function(length, color, pos) {
	var ballSize = 10;
	this.color = color;
	this.balls = [];
	this.balls[0] = this.head = new Ball(pos, ballSize, color.randomized(16))
	this.maxMass = this.head.mass;
	for (var i = 1; i < length; i++) {
		this.addBall(new Ball(new Vector(), ballSize, color.randomized(16)));
	};
	this.balls.forEach(function(b) {
		universe.addEntity(b);
	});
}
Object.defineProperty(Snake.prototype, 'tail', {
	get: function() { return this.balls[this.balls.length - 1]; }
});
Object.defineProperty(Snake.prototype, 'mass', {
	get: function() { return this.balls.reduce(function(sum, x) { return sum + x.mass }, 0); }
});
Object.defineProperty(Snake.prototype, 'length', {
	get: function() { return this.balls.length; }
});
Snake.prototype.drawTo = function(ctx) {
	for (var i = 0; i < this.balls.length; i++) {
		this.balls[i].drawTo(ctx);
	};
	ctx.save();
	ctx.fillStyle = "white";
	ctx.beginPath();
	ctx.arc(this.head.position.x, this.head.position.y, 5, 0, Math.PI * 2, false);
	ctx.fill();
	ctx.restore();
	return this;
};
Snake.prototype.addBall = function(ball) {
	ball.clearForces();
	ball.velocity.set(0, 0);

	var pos = this.tail.position
	var dist = ball.radius + this.tail.radius;
	for(var j = 0; j < 100; j++) {
		var p = Vector.fromPolarCoords(dist, Math.random() * Math.PI * 2)
		ball.position = p.plusEquals(pos);
		var collides = this.balls.some(function(b) {b.touches(ball)});
		if(collides) break;
	}

	this.balls.push(ball);
}
Snake.prototype.canEat = function(ball) {
	if(this.balls.contains(ball)) return false;
	if(this.maxMass * 2 < ball.mass) return false;
	return true;
}
Snake.prototype.eat = function(ball) {
	if(!this.canEat(ball)) return false;

	this.maxMass *= 1.05;
	this.addBall(ball);
	return true;
}
var balls = [];
var snakes = [];
Snake.prototype.update = function(dt) {

	//Shortening
	this.balls.forAdjacentPairs(function(a, b, ai, bi) {
		var rate = 50;// + 5*(this.length - ai);
		var aMass = a.mass;
		var diff = aMass - this.maxMass;
		if(diff > rate) {
			a.mass = aMass - rate;
			b.mass += rate;
		} else if(diff < -rate) {
			a.mass = aMass + rate;
			b.mass -= rate;
		} else {
			a.mass = this.maxMass;
			b.mass += diff;
		}
	}, this);
	var last = this.tail;
	if(!(last.mass > 0)) { //NaNs
		this.balls.pop();
		universe.removeEntity(last);
	}
	
	//Update ball colors
	this.balls.forEach(function(b) {
		b.color.lerp(this.color, 0.05);
	}, this);

	//Force them into a line
	this.balls.forAdjacentPairs(function(b1, b2) {
		b2.follow(b1);
	}, this);
	console.log("THEY ARE FOLLOWING")

	//Eat free balls
	balls.forEach(function(ball, i) {
		if(ball.touches(this.head) && this.eat(ball)) {
			balls.splice(i, 1);
		}
	}, this);

	//Snake/snake collisions
	snakes.forEach(function(that) {
		if(that == this) return;
		that.balls.forEach(function(segment, index) {
			//Eat and split if the head makes contact
			if(segment != that.head && this.head.touches(segment) && this.eat(segment)) {
				var removed = that.balls.splice(index);
				removed.shift();
				var removedMass = removed.reduce(function(sum, b) {return sum + b.mass}, 0)
				var remainingMass = this.mass;
				//Reverse the snake if too much was taken off
				if(removedMass > remainingMass) {
					delete that.head.forces.player;
					var r = that.balls;
					that.balls = removed.reverse();
					that.head = that.balls[0];
					removed = r;
				}
				removed.forEach(function(b) {
					balls.push(b);
					b.clearForces();
				});
			}
		}, this);
	}, this);


};
//Generate the gray balls
for(var i = 0; i <= 50; i++) {
	var r = Math.random();
	var color, radius;

	if     (r < 0.33) color = new Color(192, 192, 192), radius = randomInt(5,  10);
	else if(r < 0.66) color = new Color(128, 128, 128), radius = randomInt(10, 20);
	else              color = new Color( 64,  64,  64), radius = randomInt(20, 40);

	balls[i] = new Ball(new Vector(randomInt(universe.width), randomInt(universe.height)), radius, color);
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
		var displacement = players[p].target.minus(players[p].head.position);
		var distance = displacement.length;
		var force = Math.min(distance, 200)*players[p].head.mass;

		players[p].head.forces.player = distance > 1 ? displacement.timesEquals(force / distance) : Vector.zero;
	}
	universe.update(dt);
	snakes.forEach(function(s) {
		s.update(dt);
	});
	updateClients();
	lastt = t;
}, 1000 / 60.0)