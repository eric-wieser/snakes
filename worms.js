"use strict"; 

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
}
Array.prototype.forAdjacentPairs = function(callback, thisPtr) {
	var l = this.length;
	for (var i = 0, j = 1; j < l; i = j++) {
		var ti = this[i], tj = this[j];
		if(ti !== undefined && tj !== undefined)
			callback.call(thisPtr, ti, tj, i, j, this);
	}
}

var alertFallback = true; 
if (typeof console === "undefined" || typeof console.log === "undefined") { 
	console = {}; 
	if (alertFallback) { 
		console.log = function(msg) { 
			alert(msg); 
		}; 
	} else {
		console.log = function() {}; 
	} 
} 

var randomInt = function(min, max) {
	if(max === undefined) {
		max = min;
		min = 0;
	}
	return Math.floor(Math.random() * (max - min) + min);
};


var width = 0, height = 0;
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame  || window.oRequestAnimationFrame || function(callback) {
	window.setTimeout(function() {callback(Date.now())}, 1000 / 60.0);
};

var canvas = $('#canvas').get(0);

$(window).resize(function(){
	width = canvas.width = $(canvas).width();
	height = canvas.height = $(canvas).height();
}).resize();

var ctx = canvas.getContext('2d');
var keycodes = [{
	up:    87,
	down:  83,
	left:  65,
	right: 68
}, {
	up:    38,
	down:  40,
	left:  37,
	right: 39
}]


function Ball(pos, radius, color, pole) {
	this.position = pos;
	this.velocity = new Vector(0, 0);
	this.forces = {};
	this.radius = radius;
	this.color = color || 'red';
	this.id = "b" + (Ball.n++);

	this.pole = pole;
}
Ball.n = 0;
Ball.prototype.getAcceleration = function() {
	var sum = Vector.zero();
	for(var i in this.forces) {
		sum.plusEquals(this.forces[i]);
	}
	return sum.overEquals(this.getMass());
};
Ball.prototype.getMass = function() {
	return Math.PI*this.radius*this.radius;
};

Ball.prototype.update = function(dt) {
	this.velocity.plusEquals(this.getAcceleration().times(dt));
	this.position.plusEquals(this.velocity.times(dt));

	this.velocity.timesEquals(0.95);
};

Ball.prototype.touches = function(that) {
	return this.position.minus(that.position).magnitude() <= this.radius + that.radius;
};

Ball.prototype.bounceOffWalls = function() {
	if(this.position.x < this.radius) {
		this.velocity.x = Math.abs(this.velocity.x);
		this.position.x = this.radius;
	} else if(this.position.x > width - this.radius) {
		this.velocity.x = -Math.abs(this.velocity.x);
		this.position.x = width - this.radius;
	}

	if(this.position.y < this.radius) {
		this.velocity.y = Math.abs(this.velocity.y);
		this.position.y = this.radius;
	} else if(this.position.y > height - this.radius) {
		this.velocity.y = -Math.abs(this.velocity.y);
		this.position.y = height - this.radius;
	}
};

Ball.prototype.updateForceFrom = function(that) {
	if(that instanceof Array) {
		for (var i = 0; i < that.length; i++) {
			if(this != that[i]) this.updateForceFrom(that[i]);
		}
		return;
	}
	delete this.forces["contact."+that.id]
	delete that.forces["contact."+this.id]

	var diff = this.position.minus(that.position);
	var dist = diff.magnitude();
	diff.overEquals(dist);

	var overlap = this.radius + that.radius - dist;
	if(overlap > 0 && dist != 0) {
		var meanmass = 1 / ((1 / this.getMass()) + (1 / that.getMass()))
		overlap *= meanmass;
		this.forces["contact."+that.id] = diff.times(overlap*200);
		that.forces["contact."+this.id] = diff.times(-overlap*200);
	}
}

Ball.prototype.draw = function() {
	ctx.save();
	ctx.fillStyle = this.color.toString();
	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);

	ctx.fill();
	ctx.restore();
};

Ball.prototype.follow = function(that) {
	delete this.forces["following." + that.id] 

	delete that.forces["following." + this.id] 
	this.position.minusEquals(that.position)
		.normalize()
		.timesEquals(this.radius + that.radius)
		.plusEquals(that.position);

	//this.forces["following." + that.id] = target.minus(this.position).times(200000);
	//that.forces["following." + this.id] = target.minus(this.position).times(-200000);
};
var worms = [];
var Worm = function(length, color, pos) {
	var ballSize = 10;
	this.balls = [];
	this.balls[0] = this.head = new Ball(pos, ballSize, color.randomNear(16))
	for (var i = 1; i < length; i++) {
		tryplaceballs: for(var j = 0; j < 100; j++) {
			var newPos = pos.plus(Vector.fromPolarCoords(ballSize*2, Math.random() * Math.PI * 2))
			var b = new Ball(newPos, ballSize, color.randomNear(16));
			for(var k = 0; k < this.balls.length; k++) {
				if(this.balls[k].touches(b))
					continue tryplaceballs;
			}
			pos = newPos;
			this.balls[i] = b;
			break;
		}
		pos = newPos;
	};
}
Worm.prototype.draw = function() {
	for (var i = 0; i < this.balls.length; i++) {
		this.balls[i].draw();
	};
	ctx.save();
	ctx.fillStyle = "white";
	ctx.beginPath();
	ctx.arc(this.head.position.x, this.head.position.y, 5, 0, Math.PI * 2, false);
	ctx.fill();
	ctx.restore();
};
Worm.prototype.eat = function(ball) {
	if(this.balls.contains(ball)) return;
	if(this.balls.length > 15) {
		this.balls.splice(10);
		this.balls.forEach(function(b) {
			b.radius+=5;
		});
	}
	ball.radius = this.head.radius;
	ball.forces = {};
	this.balls.push(ball);
}
var balls = [];
Worm.prototype.update = function(dt) {
	this.balls[0].update(dt);
	this.balls[0].bounceOffWalls();
	this.balls[0].updateForceFrom(this.balls);

	this.balls.forAdjacentPairs(function(bi, bj, i, j) {
		for(var k = 1; k < this.balls.length; k++) {
<<<<<<< Updated upstream
			bj.updateForceFrom(this.balls[k]);
=======
			if(k > j+1 || k < j - 1)
				this.balls[j].updateForceFrom(this.balls[k]);
>>>>>>> Stashed changes
		}
		bj.color = bj.color.lerp(this.head.color, 0.01);
		bj.update(dt);
		bj.follow(bi);
		bj.bounceOffWalls();
	}, this);

	balls.forEach(function(ball, i) {
		if(ball.touches(this.head)) {
			var b = balls.splice(i, 1)[0];
<<<<<<< Updated upstream
			this.eat(b);
		} else {
			this.balls.forEach(function(b) {
				b.updateForceFrom(ball);
			});
=======
			this.balls.push(b);
			b.color = b.color.lerp(this.head.color, 0.5);
			b.forces = {};
			b.radius = this.head.radius;
>>>>>>> Stashed changes
		}
	}, this);

	if(this.balls.length > 20) {
		this.balls = this.balls.slice(0, 10);
		this.balls.forEach(function(ball) {
			ball.radius *= 1.5;
		})
	}

	worms.forEach(function(w) {
		if(w == this) return;
		this.balls.forEach(function(segment1) {
			w.balls.forEach(function(segment2, index) {
				segment1.updateForceFrom(segment2);
				if(segment1 == this.head && segment2 != w.head && this.head.touches(segment2)) {
					var removed = w.balls.splice(index);
					var b = removed.shift()
					b.color = b.color.lerp(this.head.color, 0.5);
					b.radius = this.head.radius;
					this.balls.push(b);
					removed.forEach(function(b) {
						balls.push(b);
						b.forces = {}
					});
				};
			}, this);
		}, this);
	}, this);
};

for(var i = 0; i <= 50; i++) {
	var r = Math.random()
	if(r < 0.33) {
		balls[i] = new Ball(new Vector(randomInt(width), randomInt(height)), randomInt(10,20),
			Color.random(256, 0, 0, 64), "N"
		);
	}
	else if(r < 0.66) {
		balls[i] = new Ball(new Vector(randomInt(width), randomInt(height)), randomInt(10,20),
			Color.random(0, 256, 0, 64), null
		);
	}
	else {
		balls[i] = new Ball(new Vector(randomInt(width), randomInt(height)), randomInt(10,20),
			Color.random(0, 0, 256, 64), "S"
		);
	}
}

worms[0] = new Worm(10, new Color(255, 255, 0), new Vector(100, 100));
worms[1] = new Worm(10, new Color(0, 255, 0), new Vector(500, 500));

var ball = balls[0];
var lastt = Date.now();
var lastdrawt = lastt;
function draw(t) {
	var dt = (t - lastt) / 1000.0;
	//ctx.clearRect(0, 0, canvas.width, canvas.height)
	
	balls.forEach(function(b1, i) {
		if(b1 != ball) {
			for(var j = i+1; j <= balls.length - 1; j++) {
				var b2 = balls[j];
				b1.updateForceFrom(b2, dt);
			}
		}
		b1.forces.gravity = new Vector(0, 200).times(b1.mass);
		b1.update(dt);
		b1.bounceOffWalls();
	});
	worms[0].update(dt);
	worms[1].update(dt);

	ctx.globalCompositeOperation = "source-over";
	//ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, width, height);
	ctx.globalCompositeOperation = "lighter";
	balls.forEach(function(ball) {
		ball.draw();
	});
	worms[0].draw();
	worms[1].draw();
	lastt = t;
	requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
worms[0].head.forces.player = Vector.zero();
worms[1].head.forces.player = Vector.zero();
$(window).keydown(function(e) {
	keycodes.forEach(function(k, i) {
		var a = 200* worms[i].head.getMass();
		if(k.up    == e.which) worms[i].head.forces.player.y = -a;
		if(k.down  == e.which) worms[i].head.forces.player.y = a;
		if(k.left  == e.which) worms[i].head.forces.player.x = -a;
		if(k.right == e.which) worms[i].head.forces.player.x = a;
	});
})
$(window).keyup(function(e) {
	keycodes.forEach(function(k, i) {
		if(k.up    == e.which) worms[i].head.forces.player.y = 0;
		if(k.down  == e.which) worms[i].head.forces.player.y = 0;
		if(k.left  == e.which) worms[i].head.forces.player.x = 0;
		if(k.right == e.which) worms[i].head.forces.player.x = 0;
	});
})
