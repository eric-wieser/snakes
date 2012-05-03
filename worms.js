"use strict"; 

Array.prototype.contains = function(x) { return this.indexOf(x) != -1; }

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
var keycodes = {
	up:    [87, 38],
	down:  [83, 40],
	left:  [65, 37],
	right: [68, 39]
}

function Color(r, g, b) {
	this.r = Color.clipComponent(r);
	this.g = Color.clipComponent(g);
	this.b = Color.clipComponent(b);
}
Color.prototype.randomNear = function(range) {
	return new Color(
		randomInt(Color.clipComponent(this.r - range), Color.clipComponent(this.r + range)),
		randomInt(Color.clipComponent(this.g - range), Color.clipComponent(this.g + range)),
		randomInt(Color.clipComponent(this.b - range), Color.clipComponent(this.b + range))
	)
};
Color.prototype.lerp = function(that, x) {
	var y = 1 - x;
	return new Color(
		this.r*y + that.r*x,
		this.g*y + that.g*x,
		this.b*y + that.b*x
	);
};
Color.prototype.inverted = function() {
	return new Color(
		255-this.r, 255-this.g, 255-this.b
	);
}
Color.prototype.toString = function() {
	return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')';
};
Color.random = function(r, g, b, range) {
	return new Color(r,g,b).randomNear(range);
}
Color.clipComponent = function(x) {
	return x > 255 ? 255 : x < 0 ? 0 : x;
}
function Ball(pos, radius, color, pole) {
	this.position = pos;
	this.velocity = new Vector(0, 0);
	this.forces = {};
	this.radius = radius;
	this.color = color || 'red';
	this.mass = Math.PI*radius*radius;
	this.id = "b" + (Ball.n++);

	this.pole = pole;
}
Ball.n = 0;
Ball.prototype.getAcceleration = function() {
	var sum = Vector.zero();
	for(var i in this.forces) {
		sum.plusEquals(this.forces[i]);
	}
	return sum.overEquals(this.mass);
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

	var vdiff = this.velocity.minus(that.velocity);
	var overlap = this.radius + that.radius - dist;
	if(overlap > 0 && dist != 0) {
		var meanmass = 1 / ((1 / this.mass) + (1 / that.mass))
		overlap *= meanmass;
		this.forces["contact."+that.id] = diff.times(overlap*100);
		that.forces["contact."+this.id] = diff.times(-overlap*100);
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
	var target = that.position.plus(this.position.minus(that.position).unit().times(this.radius + that.radius));
	this.position = target

	//this.forces["following." + that.id] = target.minus(this.position).times(20000);
};
var worms = [];
var Worm = function(length, color, pos) {
	this.balls = [];
	this.balls[0] = this.head = new Ball(pos, 20, color.randomNear(16))
	for (var i = 1; i < length; i++) {
		tryplaceballs: for(var j = 0; j < 100; j++) {
			var newPos = pos.plus(Vector.fromPolarCoords(40, Math.random() * Math.PI * 2))
			var b = new Ball(newPos, 20, color.randomNear(16));
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
};
var balls = [];
Worm.prototype.update = function(dt) {
	this.balls[0].update(dt);
	this.balls[0].bounceOffWalls();
	this.balls[0].updateForceFrom(this.balls);
	for (var i = 0, j = 1; j < this.balls.length; i = j++) {
		for(var k = 1; k < this.balls.length; k++) {
			this.balls[j].updateForceFrom(this.balls[k]);
		}
		this.balls[j].update(dt);
		this.balls[j].follow(this.balls[i]);
		this.balls[j].bounceOffWalls();
	};

	for(var i = 0; i < balls.length; i++) {
		if(balls[i].touches(this.head)) {
			var b = balls.splice(i, 1)[0];
			this.balls.push(b);
			b.color = this.head.color;
			b.forces = {};
		}
	}

	worms.forEach(function(w) {
		this.balls.forEach(function(segment1) {
			w.balls.forEach(function(segment2) {
				segment1.updateForceFrom(segment2);
				if(this);
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
	balls[i].forces.gravity = new Vector(0, 2000000);
}

worms[0] = new Worm(10, new Color(255, 255, 0), new Vector(100, 100));
worms[1] = new Worm(10, new Color(0, 255, 0), new Vector(500, 500));

var ball = balls[0];
var lastt = Date.now();
var lastdrawt = lastt;
function draw(t) {
	var dt = (t - lastt) / 1000.0;
	//ctx.clearRect(0, 0, canvas.width, canvas.height)
	
	for(var i = 0; i <= balls.length - 1; i++) {
		var b1 = balls[i];
		if(true || b1 != ball) {
			for(var j = i+1; j <= balls.length - 1; j++) {
				var b2 = balls[j];
				b1.updateForceFrom(b2, dt);
			}
		}
		b1.update(dt);
		b1.bounceOffWalls();
	}

	ctx.globalCompositeOperation = "source-over";
	//ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, width, height);
	ctx.globalCompositeOperation = "lighter";
	for (var i = 0; i < balls.length; i++) {
		balls[i].draw();
	};
	worms[0].update(dt);
	worms[0].draw();
	worms[1].update(dt);
	worms[1].draw();
	lastt = t;
	requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
worms[0].head.forces.player = Vector.zero();
worms[1].head.forces.player = Vector.zero();
$(window).keydown(function(e) {
	var a = 200* worms[0].head.mass;
	if(keycodes.up   .contains(e.which)) worms[keycodes.up   .indexOf(e.which)].head.forces.player.y = -a;
	if(keycodes.down .contains(e.which)) worms[keycodes.down .indexOf(e.which)].head.forces.player.y = a;
	if(keycodes.left .contains(e.which)) worms[keycodes.left .indexOf(e.which)].head.forces.player.x = -a;
	if(keycodes.right.contains(e.which)) worms[keycodes.right.indexOf(e.which)].head.forces.player.x = a;
})
$(window).keyup(function(e) {
	if(keycodes.up   .contains(e.which)) worms[keycodes.up   .indexOf(e.which)].head.forces.player.y = 0;
	if(keycodes.down .contains(e.which)) worms[keycodes.down .indexOf(e.which)].head.forces.player.y = 0;
	if(keycodes.left .contains(e.which)) worms[keycodes.left .indexOf(e.which)].head.forces.player.x = 0;
	if(keycodes.right.contains(e.which)) worms[keycodes.right.indexOf(e.which)].head.forces.player.x = 0;
})
