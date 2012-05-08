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
};
Array.prototype.forAdjacentPairs = function(callback, thisPtr) {
	var l = this.length;
	for (var i = 0, j = 1; j < l; i = j++) {
		var ti = this[i], tj = this[j];
		if(ti !== undefined && tj !== undefined)
			callback.call(thisPtr, ti, tj, i, j, this);
	}
};
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

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


window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame  || window.oRequestAnimationFrame || function(callback) {
	window.setTimeout(function() {callback(Date.now())}, 1000 / 60.0);
};

var canvas = $('#canvas').get(0);

var universe = new World();
$(window).resize(function(){
	universe.width = canvas.width = $(canvas).width();
	universe.height = canvas.height = $(canvas).height();
}).resize();

var ctx = canvas.getContext('2d');
var keycodes = {
	wasd: {
		up:    87,
		down:  83,
		left:  65,
		right: 68
	},
	arrows: {
		up:    38,
		down:  40,
		left:  37,
		right: 39
	},
	numpad: {
		up:    104,
		down:  101,
		left:  100,
		right: 102
	}
};


var snakes = [];
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
	ball.forces = {};
	ball.forces.contact = {};
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
Snake.prototype.eat = function(ball) {
	if(this.balls.contains(ball)) return false;
	if(this.maxMass * 2 < ball.mass) return false;

	this.maxMass *= 1.05;
	this.addBall(ball);
	return true;
}
var balls = [];
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
		b.color.lerp(this.color, 0.01);
	}, this);

	//Force them into a line
	this.balls.forAdjacentPairs(function(b1, b2) {
		b2.follow(b1);
	}, this);

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
				if(removed.length > that.balls.length) {
					delete that.head.forces.player;
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

//Add the two snakes

if(location.hash == '#3') {
	snakes[0] = new Snake(10, new Color(255, 128, 0), new Vector(  universe.width/3,   universe.height / 3));
	snakes[0].controls = keycodes.wasd
	snakes[1] = new Snake(10, new Color(0, 255, 128), new Vector(2*universe.width/3,   universe.height / 3));
	snakes[1].controls = keycodes.arrows
	snakes[2] = new Snake(10, new Color(128, 0, 255), new Vector(  universe.width/2, 2*universe.height / 3));
	snakes[2].controls = keycodes.numpad
}
else {
	snakes[0] = new Snake(10, new Color(255, 128, 0), new Vector(  universe.width/3,   universe.height / 2));
	snakes[0].controls = keycodes.wasd
	snakes[1] = new Snake(10, new Color(0, 128, 255), new Vector(2*universe.width/3,   universe.height / 2));
	snakes[1].controls = keycodes.arrows
}


//Queue animation frames
var lastt = Date.now();
var lastdrawt = lastt;
function draw(t) {
	//Calculate frame time
	var dt = (t - lastt) / 1000.0;
	if(dt > 0.2) dt = 0.2;

	//Update physics of all the balls and snakes
	universe.update(dt);
	snakes.forEach(function(snake) {
		snake.update(dt);
	});

	//draw the black background
	//ctx.clearRect(0, 0, width, height);
	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, universe.width, universe.height);

	//draw all the things
	ctx.globalCompositeOperation = "lighter";
	balls.forEach(function(ball) {
		ball.drawTo(ctx);
	});
	snakes.forEach(function(snake) {
		snake.drawTo(ctx);
	});

	//prepare for next frame
	lastt = t;
	requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

//Handle keypresses
var controlStyle = "absolute";
$(window).keydown(function(e) {
	snakes.forEach(function(s) {
		var h = s.head;
		if(!("player" in h.forces)) h.forces.player = Vector.zero()
		var a = 400* h.mass;
		if(controlStyle == "absolute") {
			if(s.controls.up    == e.which) h.forces.player.y = -a;
			if(s.controls.down  == e.which) h.forces.player.y = a;
			if(s.controls.left  == e.which) h.forces.player.x = -a;
			if(s.controls.right == e.which) h.forces.player.x = a;
		}
	});
}).keyup(function(e) {
	snakes.forEach(function(s) {
		var h = s.head;
		if(!("player" in h.forces)) h.forces.player = Vector.zero()

		if(controlStyle == "absolute") {
			if(s.controls.up    == e.which) h.forces.player.y = 0;
			if(s.controls.down  == e.which) h.forces.player.y = 0;
			if(s.controls.left  == e.which) h.forces.player.x = 0;
			if(s.controls.right == e.which) h.forces.player.x = 0;
		}
	});
})

//Show the scores
var scores = $('.scores').children();
setInterval(function() {
	snakes.forEach(function(s, i) {
		var elem = scores.eq(i);
		elem
			.text(Math.round(s.mass / 500))
			.css('color', s.color.toString());
	});
}, 250);