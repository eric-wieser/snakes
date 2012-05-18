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
	},
	hjkl: {
		up:    74,
		down:  75,
		left:  72,
		right: 76
	}
};
var snakes = [];

//Generate the gray balls
for(var i = 0; i <= 50; i++) {
	var r = Math.random();
	var color, radius;

	if     (r < 0.33) color = new Color(192, 192, 192), radius = randomInt(5,  10);
	else if(r < 0.66) color = new Color(128, 128, 128), radius = randomInt(10, 20);
	else              color = new Color( 64,  64,  64), radius = randomInt(20, 40);

	universe.addEntity(
		new Ball(universe.randomPosition(), radius, color)
	);
}

//Add the two snakes

if(location.search == '?4') {
	snakes[0] = new Snake(10, new Color(255, 128, 0), new Vector(  universe.width/3,   universe.height / 3), universe);
	snakes[0].controls = keycodes.wasd
	snakes[1] = new Snake(10, new Color(0, 128, 255), new Vector(  universe.width/3, 2*universe.height / 3), universe);
	snakes[1].controls = keycodes.numpad
	snakes[2] = new Snake(10, new Color(255, 64, 64), new Vector(2*universe.width/3,   universe.height / 3), universe);
	snakes[2].controls = keycodes.arrows
	snakes[3] = new Snake(10, new Color(64, 64, 255), new Vector(2*universe.width/3, 2*universe.height / 3), universe);
	snakes[3].controls = keycodes.hjkl
}
else if(location.search == '?3') {
	snakes[0] = new Snake(10, new Color(255, 128, 0), new Vector(  universe.width/3,   universe.height / 3), universe);
	snakes[0].controls = keycodes.wasd
	snakes[1] = new Snake(10, new Color(0, 255, 128), new Vector(2*universe.width/3,   universe.height / 3), universe);
	snakes[1].controls = keycodes.arrows
	snakes[2] = new Snake(10, new Color(128, 0, 255), new Vector(  universe.width/2, 2*universe.height / 3), universe);
	snakes[2].controls = keycodes.numpad
}
else {
	snakes[0] = new Snake(10, new Color(255, 128, 0), new Vector(  universe.width/3,   universe.height / 2), universe);
	snakes[0].controls = keycodes.wasd
	snakes[1] = new Snake(10, new Color(0, 128, 255), new Vector(2*universe.width/3,   universe.height / 2), universe);
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
	universe.entities.forEach(function(ball) {
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
		if(!h) return;
		if(!("player" in h.forces)) h.forces.player = Vector.zero
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
		if(!h) return;
		if(!("player" in h.forces)) h.forces.player = Vector.zero

		if(controlStyle == "absolute") {
			if(s.controls.up    == e.which) h.forces.player.y = 0;
			if(s.controls.down  == e.which) h.forces.player.y = 0;
			if(s.controls.left  == e.which) h.forces.player.x = 0;
			if(s.controls.right == e.which) h.forces.player.x = 0;
		}
	});
})

//Show the scores
var scoreValues = $('.scores').children();
var scoreBarElems = $('.score-bar').children();
setInterval(function() {
	var mass = universe.totalMass;
	var mostLeft = 0;
	var mostRight = 0;
	snakes.forEach(function(s, i) {
		var m = s.mass;
		scoreValues.eq(i)
			.text(Math.round(m / 500))
			.css('color', s.color.toString());
		var bar = scoreBarElems.eq(i);
		if(i%2 == 0) {
			bar.css({
				backgroundColor: s.color.toString()
			}).stop().animate({
				width: (100 * m / mass) + '%',
				left: (100 * mostLeft / mass) + '%'
			})
			mostLeft += m;
		}
		else {
			bar.css({
				backgroundColor: s.color.toString()
			}).stop().animate({
				width: (100 * m / mass) + '%',
				right: (100 * mostRight / mass) + '%'
			})
			mostRight += m;
		}
	});
}, 250);