"use strict"; 
require('./snake');
require('./explosion');
require('./color');
require('./vector');
require('./world');
require('./ball');

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

var domusic = location.search == "?music";
var music = {};
function begin() {
	if(music.ambient && music.emphasis) {
		music.ambient.play();
		music.emphasis.play();
	}
}
if(domusic) {
	//Do music!
	var clientId = "dd250c3d9ef318565e6f22e871b87fb8";
	$.getJSON(
		'http://api.soundcloud.com/resolve.json?callback=?', {
			url: "http://soundcloud.com/m3henry/snake-test-2",
			client_id: clientId
		}, function(data) {
			if(data.streamable && data.stream_url) {
				var audio = new Audio();
				audio.src = data.stream_url+'?client_id='+clientId;
				audio.loop = true;
				audio.volume = 0.5
				music.ambient = audio;
				begin();
			}
		}
	);
	$.getJSON(
		'http://api.soundcloud.com/resolve.json?callback=?', {
			url: "http://soundcloud.com/m3henry/snake-test-2-1",
			client_id: clientId
		}, function(data) {
			if(data.streamable && data.stream_url) {
				var audio = new Audio();
				audio.src = data.stream_url+'?client_id='+clientId;
				audio.loop = true;
				music.emphasis = audio;
				begin();
			}
		}
	);
}

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
var explosions = [];

var n = 50;

function makeExplosion(at) {
	var e = new Explosion(at.position);
	explosions.push(e);
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
	snakes[1] = new Snake(10, new Color(0, 255, 128), new Vector(2*universe.width/3,   universe.height / 3), universe);
	snakes[1].controls = keycodes.arrows
	snakes[2] = new Snake(10, new Color(128, 0, 255), new Vector(  universe.width/2, 2*universe.height / 3), universe);
	snakes[2].controls = keycodes.numpad
}
else if(location.search == '?1') {
	snakes[0] = new Snake(10, new Color(255, 128, 0), new Vector(  universe.width/3,   universe.height / 3), universe);
	snakes[0].controls = keycodes.wasd
}
else {
	snakes[0] = new Snake(10, new Color(255, 128, 0), new Vector(  universe.width/3,   universe.height / 2), universe);
	snakes[0].controls = keycodes.wasd
	snakes[1] = new Snake(10, new Color(0, 128, 255), new Vector(2*universe.width/3,   universe.height / 2), universe);
	snakes[1].controls = keycodes.arrows
}

snakes.forEach(function(s) {
	s.on('eat.tail', makeExplosion);
	s.on('eat.free', makeExplosion);
	s.on('eat.head', makeExplosion);
	s.on('death', function() { snakes.remove(this); });
})

//Generate the gray balls
for(var i = 0; i <= n; i++) {
	var r = Math.random();
	var color, radius;

	if  (r < 0.33) color = new Color(192, 192, 192), radius = randomInt(5,  10);
	else if(r < 0.66) color = new Color(128, 128, 128), radius = randomInt(10, 20);
	else              color = new Color( 64,  64,  64), radius = randomInt(20, 40);

	universe.addEntity(
		new Ball(universe.randomPosition(), radius, color)
	);
}

//Queue animation frames
var lastt = Date.now();
var lastdrawt = lastt;
function draw(t) {
	//Calculate frame time
	var dt = (t - lastt) / 1000.0;
	if(dt > 0.2) dt = 0.2;

	//Update physics of all the balls and snakes
	snakes.forEach(function(snake) {
		snake.head && snake.playerForce && (snake.head.forces.player = snake.playerForce.times(snake.head.mass));
	});
	universe.update(dt);
	snakes.forEach(function(snake) {
		snake.update(dt);
	});
	explosions.forEach(function(e) {
		e.update(dt);
	});

	//draw the black background
	//ctx.clearRect(0, 0, width, height);
	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = "black";
	//ctx.fillRect(0, 0, universe.width, universe.height);
	ctx.clearRect(0, 0, universe.width, universe.height);

	//draw all the things
	explosions.forEach(function(e) {
		e.bounceWithin(universe.width, universe.height);
		e.drawTo(ctx);
	});
	ctx.globalCompositeOperation = "lighter";
	universe.entities.forEach(function(ball) {
		ball.drawTo(ctx);
	});
	ctx.globalCompositeOperation = "source-over";
	snakes.forEach(function(snake) {
		snake.drawTo(ctx);
	});

	//prepare for next frame
	lastt = t;
	requestAnimationFrame(draw);

	if(domusic) {
		var dist = snakes[0].head.position.minus(snakes[1].head.position).length;
		var volume = 1 - dist * 2 / universe.width
		music.emphasis.volume = volume > 1 ? 1 : volume < 0 ? 0 : volume;
	}
}
requestAnimationFrame(draw);

//Handle keypresses
var controlStyle = "absolute";
$(window).keydown(function(e) {
	snakes.forEach(function(s) {
		s.playerForce = s.playerForce || Vector.zero;
		var a = 400;
		if(controlStyle == "absolute") {
			if(s.controls.up    == e.which) s.playerForce.y = -a;
			if(s.controls.down  == e.which) s.playerForce.y = a;
			if(s.controls.left  == e.which) s.playerForce.x = -a;
			if(s.controls.right == e.which) s.playerForce.x = a;
		}
	});
}).keyup(function(e) {
	snakes.forEach(function(s) {
		s.playerForce = s.playerForce || Vector.zero;

		if(controlStyle == "absolute") {
			if(s.controls.up    == e.which) s.playerForce .y = 0;
			if(s.controls.down  == e.which) s.playerForce .y = 0;
			if(s.controls.left  == e.which) s.playerForce .x = 0;
			if(s.controls.right == e.which) s.playerForce .x = 0;
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