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

var snakes = [];
var Snake = function(length, color, pos) {
	var ballSize = 10;
	this.color = color;
	this.balls = [];
	this.balls[0] = this.head = new Ball(pos, ballSize, color.randomized(16))
	this.maxMass = this.head.getMass();
	for (var i = 1; i < length; i++) {
		tryplaceballs: for(var j = 0; j < 100; j++) {
			var newPos = pos.plus(Vector.fromPolarCoords(ballSize*2, Math.random() * Math.PI * 2))
			var b = new Ball(newPos, ballSize, color.randomized(16));
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
Snake.prototype.eat = function(ball) {
	if(this.balls.contains(ball)) return false;
	if(this.maxMass * 4 < ball.getMass()) return false;

	this.maxMass *= 1.05;
	ball.forces = {};
	ball.forces.contact = {};
	this.balls.push(ball);
	return true;
}
Snake.prototype.getMass = function(ball) {
	return this.balls.reduce(function(sum, x) { return sum + x.getMass(); }, 0);
}
var balls = [];
Snake.prototype.update = function(dt) {

	//Shortening
	var rate = 50;
	this.balls.forAdjacentPairs(function(a, b) {
		var aMass = a.getMass();
		var diff = aMass - this.maxMass;
		if(diff > rate) {
			a.setMass(aMass - rate);
			b.setMass(b.getMass() + rate);
		} else if(diff < -rate) {
			a.setMass(aMass + rate);
			b.setMass(b.getMass() - rate);
		} else {
			a.setMass(this.maxMass);
			b.setMass(b.getMass() + diff);
		}
	}, this);
	var last = this.balls[this.balls.length - 1];
	if(last.getMass() < rate) {
		this.balls.pop();
	}
	
	//Add bounce forces
	this.balls.forEveryPair(function(b1, b2) {
		b1.updateForceFrom(b2);
	}, this);
	//Update balls
	this.balls.forEach(function(b) {
		b.update(dt);
		b.bounceOffWalls(width, height);
		b.color.lerp(this.color, 0.01);
	}, this);
	//Force them into a line
	this.balls.forAdjacentPairs(function(b1, b2) {
		b2.follow(b1);
	}, this);

	//Interactions with free balls
	balls.forEach(function(ball, i) {
		//eat ones touching the head
		if(ball.touches(this.head) && this.eat(ball)) {
			balls.splice(i, 1)[0];
		}
		//bounce off the rest
		else {
			this.balls.forEach(function(b) {
				b.updateForceFrom(ball);
			});
		}
	}, this);

	//Snake/snake collisions
	snakes.forEach(function(that) {
		if(that == this) return;
		this.balls.forEach(function(segment1) {
			that.balls.forEach(function(segment2, index) {
				//Eat and split if the head makes contact
				if(segment1 == this.head && segment2 != that.head && this.head.touches(segment2) && this.eat(segment2)) {
					var removed = that.balls.splice(index);
					removed.shift();
					if(removed.length > that.balls.length) {
						var r = that.balls;
						that.balls = removed.reverse();
						that.head = that.balls[0];
						removed = r;
					}
					removed.forEach(function(b) {
						balls.push(b);
						b.forces = {};
						b.forces.contact = {};
					});
				}
				//Else, update forces
				else {
					segment1.updateForceFrom(segment2);
				}
			}, this);
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

	balls[i] = new Ball(new Vector(randomInt(width), randomInt(height)), radius, color);
}

//Add the two snakes
snakes[0] = new Snake(10, new Color(255, 128, 0), new Vector(  width/3, height / 2));
snakes[1] = new Snake(10, new Color(0, 128, 255), new Vector(2*width/3, height / 2));

//Queue animation frames
var lastt = Date.now();
var lastdrawt = lastt;
function draw(t) {
	//Calculate frame time
	var dt = (t - lastt) / 1000.0;
	if(dt > 0.2) dt = 0.2;

	//Update physics of all the balls and snakes
	balls.forEach(function(b1, i) {
		for(var j = i+1; j <= balls.length - 1; j++) {
			var b2 = balls[j];
			b1.updateForceFrom(b2, dt);
		}
		//b1.forces.gravity = new Vector(0, 200).times(b1.getMass());
		b1.update(dt);
		b1.bounceOffWalls(width, height);
	});
	snakes[0].update(dt);
	snakes[1].update(dt);

	//draw the black background
	//ctx.clearRect(0, 0, width, height);
	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, width, height);

	//draw all the things
	ctx.globalCompositeOperation = "lighter";
	balls.forEach(function(ball) {
		ball.drawTo(ctx);
	});
	snakes[0].drawTo(ctx);
	snakes[1].drawTo(ctx);

	//prepare for next frame
	lastt = t;
	requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

//Handle keypresses
$(window).keydown(function(e) {
	keycodes.forEach(function(k, i) {
		var h = snakes[i].head;
		if(!("player" in h.forces)) h.forces.player = Vector.zero()
		var a = 200* h.getMass();
		if(k.up    == e.which) h.forces.player.y = -a;
		if(k.down  == e.which) h.forces.player.y = a;
		if(k.left  == e.which) h.forces.player.x = -a;
		if(k.right == e.which) h.forces.player.x = a;
	});
}).keyup(function(e) {
	keycodes.forEach(function(k, i) {
		var h = snakes[i].head;
		if(!("player" in h.forces)) h.forces.player = Vector.zero()

		if(k.up    == e.which) h.forces.player.y = 0;
		if(k.down  == e.which) h.forces.player.y = 0;
		if(k.left  == e.which) h.forces.player.x = 0;
		if(k.right == e.which) h.forces.player.x = 0;
	});
})

//Show the scores
var bluescore = $('#blue-score');
var orangescore = $('#orange-score');
setInterval(function() {
	orangescore.text(Math.round(snakes[0].getMass() / 500));
	bluescore.text(Math.round(snakes[1].getMass() / 500));
}, 250);