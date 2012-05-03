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
Ball.prototype.setMass = function(m) {
	this.radius = Math.sqrt(m / Math.PI);
	return this;
};
Ball.prototype.update = function(dt) {
	//resistance = k * A * v^2
	this.forces.resistance = this.velocity.times(0.05*-this.velocity.magnitude()*this.radius*2);
	this.velocity.plusEquals(this.getAcceleration().times(dt));
	this.position.plusEquals(this.velocity.times(dt));

	return this;
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
	return this;
};

Ball.prototype.updateForceFrom = function(that) {
	if(that instanceof Array) {
		for (var i = 0; i < that.length; i++) {
			if(this != that[i]) this.updateForceFrom(that[i]);
		}
	} else {
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
	return this;
}

Ball.prototype.draw = function() {
	ctx.save();
	ctx.fillStyle = this.color.toString();
	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);

	ctx.fill();
	ctx.restore();
	return this;
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
	return this;
};
var worms = [];
var Worm = function(length, color, pos) {
	var ballSize = 10;
	this.balls = [];
	this.balls[0] = this.head = new Ball(pos, ballSize, color.randomNear(16))
	this.maxMass = this.head.getMass();
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
	if(this.balls.contains(ball)) return false;
	if(this.maxMass * 4 < ball.getMass()) return false;

	//this.maxMass *= 1.1;
	
	ball.forces = {};
	this.balls.push(ball);
	return true;
}
Worm.prototype.getMass = function(ball) {
	return this.balls.reduce(function(sum, x) { return sum + x.getMass(); })
}
var balls = [];
Worm.prototype.update = function(dt) {

	//Shortening
	/*
	var len = this.balls.length
	if(len > 10) {
		var lose = 1;
		var last = this.balls[len-1];
		last.radius -= lose;
		if(last.radius <= 0) this.balls.pop();

		this.balls.forEach(function(ball) {
			if(ball != last)
				ball.radius += lose / len;
		})
	}*/
	var last = this.balls[this.balls.length - 1];
	var eachTime = 0.1;
	this.balls.forEach(function(a, i) {
		var aMass = a.getMass();
		var neededMass = this.maxMass - aMass;
		var massLeft = Math.abs(neededMass * eachTime);
		var massAdded = 0;
		for(var j = i + 1; j < this.balls.length; j++) {
			var b = this.balls[i];
			var m = b.getMass();
			var toTake = Math.min(massLeft, m, 10);
			if(neededMass > 0)
				b.setMass(m - toTake);
			else
				b.setMass(m + toTake);

			massLeft -= toTake;
			massAdded += toTake;
		}
		if(neededMass > 0)
			a.setMass(aMass + massAdded);
		else
			a.setMass(aMass - massAdded);

	}, this);
	var theMass = last.getMass()
	if(theMass > this.maxMass) {
		var newTail = new Ball(this.head.position.clone(), 0, last.color);
		this.balls.push(newTail);
		last.setMass(theMass - 10)
		newTail.setMass(10)
	} else if (last.getMass() < 0) {
		this.balls.pop();
	}


	//Physics on the head
	this.balls[0].update(dt);
	this.balls[0].bounceOffWalls();
	this.balls[0].updateForceFrom(this.balls);

	//Iterate down the body
	this.balls.forAdjacentPairs(function(bi, bj, i, j) {
		for(var k = 1; k < this.balls.length; k++) {
			if(k > j+1 || k < j - 1)
				this.balls[j].updateForceFrom(this.balls[k]);
		}
		bj.color = bj.color.lerp(this.head.color, 0.01);
		bj.update(dt);
		bj.follow(bi);
		bj.bounceOffWalls();
	}, this);

	//Interactions with free balls
	balls.forEach(function(ball, i) {
		if(ball.touches(this.head) && this.eat(ball)) {
			balls.splice(i, 1)[0];
		} else {
			this.balls.forEach(function(b) {
				b.updateForceFrom(ball);
			});
		}
	}, this);


	//Worm/worm collisions
	worms.forEach(function(that) {
		if(that == this) return;
		this.balls.forEach(function(segment1) {
			that.balls.forEach(function(segment2, index) {
				segment1.updateForceFrom(segment2);
				if(segment1 == this.head && segment2 != that.head && this.head.touches(segment2)) {
					if(this.eat(segment2)) {
						var removed = that.balls.splice(index);
						removed.shift();
						if(removed.length > that.balls.length) {
							var r = that.balls;
							that.balls = removed.reverse();
							that.balls[0].color = that.head.color;
							that.balls[0].radius = that.head.radius;
							that.head = that.balls[0];
							removed = r;
						}
						removed.forEach(function(b) {
							balls.push(b);
							b.forces = {}
						});
					}
				};
			}, this);
		}, this);
	}, this);


};

for(var i = 0; i <= 50; i++) {
	var r = Math.random()
	if(r < 0.33) {
		balls[i] = new Ball(new Vector(randomInt(width), randomInt(height)), randomInt(5,10),
			new Color(192, 192, 192), "N"
		);
	}
	else if(r < 0.66) {
		balls[i] = new Ball(new Vector(randomInt(width), randomInt(height)), randomInt(10,20),
			new Color(128, 128, 128), null
		);
	}
	else {
		balls[i] = new Ball(new Vector(randomInt(width), randomInt(height)), randomInt(20,40),
			new Color(64, 64, 64), "S"
		);
	}
}

worms[0] = new Worm(10, new Color(255, 128, 0), new Vector(width/3, height / 2));
worms[1] = new Worm(10, new Color(0, 128, 255), new Vector(2*width/3, height / 2));

var ball = balls[0];
var lastt = Date.now();
var lastdrawt = lastt;

var bluescore = $('#blue-score');
var orangescore = $('#orange-score');
setInterval(function() {
	orangescore.text(worms[0].balls.length);
	bluescore.text(worms[1].balls.length);
}, 250);

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
		//b1.forces.gravity = new Vector(0, 200).times(b1.getMass());
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
$(window).keydown(function(e) {
	keycodes.forEach(function(k, i) {
		var h = worms[i].head;
		if(!("player" in h.forces)) h.forces.player = Vector.zero()
		var a = 200* h.getMass();
		if(k.up    == e.which) h.forces.player.y = -a;
		if(k.down  == e.which) h.forces.player.y = a;
		if(k.left  == e.which) h.forces.player.x = -a;
		if(k.right == e.which) h.forces.player.x = a;
	});
})
$(window).keyup(function(e) {
	keycodes.forEach(function(k, i) {
		var h = worms[i].head;
		if(!("player" in h.forces)) h.forces.player = Vector.zero()

		if(k.up    == e.which) h.forces.player.y = 0;
		if(k.down  == e.which) h.forces.player.y = 0;
		if(k.left  == e.which) h.forces.player.x = 0;
		if(k.right == e.which) h.forces.player.x = 0;
	});
})
