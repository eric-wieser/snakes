"use strict";

var World = require('./world');
var Ball = require('./ball');
var Vector = require('./vector');
var Color = require('./color');

$(function() {

var colorId = Math.random();
var color = Color.niceColor(colorId);
$('.box').css({
	borderTopColor: color.toString(),
	borderBottomColor: color.toString(),
});
$('a').css({
	borderBottomColor: color.toString(),
});
$('#login input, h2, a').css({
	color: color.toString()
});
$('#about .box').click(function(e) {
	e.stopPropagation();
});
if(location.search == "?music") (function(){
	//Do music!
	var clientId = "dd250c3d9ef318565e6f22e871b87fb8";
	var musicUrl = "http://soundcloud.com/alex-nicholls/snakes-theme";
	$.getJSON(
		'http://api.soundcloud.com/resolve.json?callback=?', {
			url: musicUrl,
			client_id: clientId
		}, function(data) {
			if(data.streamable && data.stream_url) {
				var music = new Audio();
				music.src = data.stream_url+'?client_id='+clientId;
				music.loop = true;
				music.play();
			}
		}
	);
})();


//Show and hide the about box
$('#about-link').click(function() {
	$('#login')
		.fadeOut()
		.queue(function(next) { $('#about').fadeIn(next);       })
		.queue(function(next) { $('#about').one('click', next); })
		.queue(function(next) { $('#about').fadeOut(next);      })
		.fadeIn();
	return false;
})
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame  || window.oRequestAnimationFrame || function(callback) {
		window.setTimeout(function() {callback(Date.now())}, 1000 / 60.0);
	};


//Get canvas stuff
var canvas = $('#canvas').get(0);
var width = canvas.width, height = canvas.height;

$(window).resize(function(){
	width = canvas.width = $(canvas).width();
	height = canvas.height = $(canvas).height();
}).resize();

// $(window).resize(function(){
// 	width = canvas.width = $(canvas).width();
// 	height = canvas.height = $(canvas).height();
// }).resize();

var ctx = canvas.getContext('2d');
var ball;
var opponents = {};

var keycodes = {
	up:    87,
	down:  83,
	left:  65,
	right: 68
};

var universe = new World(2000, 2000);



var socket = io.connect(':'+port);
//var socket = io.connect('/');
var name;
var head;
var heads;
var viewOrigin = Vector.zero;
function nextViewOrigin() {
	var x, y
	if(!head) {
		x = (universe.width - width) / 2;
		y = (universe.height - height) / 2;
	} else {
		var border = 20;
		x = head.position.x - width / 2;
		y = head.position.y - height / 2;

		if(x < -border)
			x = -border;
		else if(x > border + universe.width - width)
			x = border + universe.width - width;
		if(universe.width + 2 * border < width)
			x = (universe.width - width) / 2;

		if(y < -border)
			y = -border;
		else if(y > border + universe.height - height)
			y = border + universe.height - height;
		if(universe.height + 2 * border < height)
			y = (universe.height - height) / 2;
	}
	return new Vector(x, y);
}
var nameinput = $('#name');
if(localStorage['name'])
	nameinput.val(localStorage['name']);

var isTrying = false;
var playing = false;

$('#login').hide();
socket.on('connect', function() {
	socket.emit('room', gameName, function(user) {
		//It knows who we are
		if(user) {
			name = user.name;
			playing = true;
			requestAnimationFrame(draw);
		}
		else $('#login').show();
	});
});
$('#join').submit(function() {
	//Stop things happening while the response is being waited for
	if(!isTrying) {
		isTrying = true;
		var n = nameinput.val();

		socket.emit('join', {
			name: n,
			color: colorId,
			game: gameName
		}, function(data) {
			if(data === true) {
				localStorage['name'] = name = n;
				requestAnimationFrame(draw);
				$('#login').fadeOut(function() {
					isTrying = false;
					playing = true;
				});
			} else if(data instanceof Object && data.error) {
				alert(data.error);
				isTrying = false;
			}
		});
	}
	return false;
});

// socket.on('entityadded', function (data) {
// 	if(data.i in universe.entities) return;

// 	var b = new Ball(
// 		Vector.ify(data.p),
// 		data.r,
// 		Color.ify(data.c)
// 	);
// 	b._id = data.i; //probably going to regret this
// 	universe.addEntity(b);
// });
// socket.on('entitylost', function (id) {
// 	delete universe.entities[id];
// });
socket.on('servermessage', function (str) {
	$('#message').html(str);
});
socket.on('serverstop', function (str) {
	playing = false;
});
socket.on('ping', function() {
	socket.emit('ping');
});
socket.on('scores', function (scores) {
	//Get the DOM elements
	var scoreList = $('#scores').empty();
	var scoreBar = $('.score-bar').empty();

	if(scores) {
		//Expand to an objects - data sent as array to save space
		scores = scores.map(function(score) {
			return { name: score[0], value: score[1], color: score[2] };
		});

		//Calculate the spacing of the bars
		var unclaimed = 1000 - scores.pluck('value').reduce(function(a, b) { return a + b; }, 0);
		var gap = unclaimed / (scores.length - 1);

		//Keep track of leftmost bar
		var left = 0;

		//draw bars
		scores.forEach(function(score) {
			//left
			$('<div />').css({
				backgroundColor: score.color,
				width: (score.value / 10) + '%',
				left:  (left        / 10) + '%'
			}).appendTo(scoreBar);
			left += score.value + gap;
		});

		scores.sort(function(a, b) { return a.score - b.score; })

		//draw numbers and names
		scores.forEach(function(score, i) {
			$('<li />').append(
				$('<span class="name"/>').text(score.name), " ", 
				$('<span />').text(score.value)
			).css('color', score.color).appendTo(scoreList);
		});
	}
});
socket.on('entityupdates', function (data) {
	Object.forEach(data.e, function(edata, id) {
		var p = Vector.ify(edata.p);
		var c = Color.ify(edata.c);
		var r = edata.r;
		if(+id in universe.entities) {
			var e = universe.entities[+id];
			e.position = p;
			e.color = c;
			e.radius = r;
		} else {
			var b = new Ball(p,	r, c);
			b._id = +id;
			universe.entities[+id] = b;
		}
	});
	for(var id in universe.entities)
		if(!(id in data.e))
			delete universe.entities[id];

	var newHeads = {};
	Object.forEach(data.s, function(id, name) {
		newHeads[name] = universe.entities[id];
	});
	head = newHeads[name];
	heads = newHeads;

	if(playing) socket.emit('playercontrol', target.plus(viewOrigin));
});
var target = new Vector();

if(navigator.msPointerEnabled)
	$(document).on('MSPointerMove', function(e) {
		// e = e.originalEvent
		// for(var i in e)
		// 	console.log("pointer", i);
		var offset = $(canvas).offset();
		target.set(e.pageX - offset.left, e.pageY - offset.top);
		return false;
	});
else
	$(document).on('mousemove', function(e) {
		// for(var i in e)
		// 	console.log("pointer", i);
		var offset = $(canvas).offset();
		target.set(e.pageX - offset.left, e.pageY - offset.top);
		return false;
	}).on('touchmove', function(e) {
		// console.log("touch", JSON.stringify(e));
		var touch = e.touches[0];
		var offset = $(canvas).offset();
		target.set(touch.pageX - offset.left, touch.pageY - offset.top);
		return false;
	});

$(document).keydown(function() {
	if(playing) $('#chat input').focus();
})

$('#chat').submit(function() {
	if(playing) {
		var input = $(this).find('input');
		var msg = input.val();
		input.val('');
		socket.emit('chat', msg);
	}
	return false;
});

socket.on('chat', function (data) {
	var name = data.n;
	var color = Color.ify(data.c);
	var message = data.m;
	var history = $('#chat .history');
	//alert(name + ":" + message);
	$('<li />').text(' '+message).prepend(
		$('<span />').css('color', color+"").text(name)
	).appendTo('#chat .history');

	while(history.children().size() > 10)
		history.children().first().remove();
});
function drawArrow(x, y, angle) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(angle);
	ctx.beginPath();
	ctx.moveTo(5, 0);
	ctx.lineTo(20,-7.5);
	ctx.lineTo(20, 7.5);
	ctx.restore();
}
var lastt = Date.now();
function draw(t) {
	//Calculate frame time
	var dt = (t - lastt) / 1000.0;
	ctx.clearRect(0, 0, width, height);
	ctx.save();
	viewOrigin = nextViewOrigin();

	ctx.translate(-viewOrigin.x, -viewOrigin.y);
	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, 2000, 2000);

	ctx.globalCompositeOperation = "lighter";
	universe.entities.forEach(function(e) {
		e.drawTo(ctx);
	});
	Object.forEach(heads, function(h) {
		var off = {
			left:   h.position.x + h.radius < viewOrigin.x,
			right:  h.position.x - h.radius > viewOrigin.x + width,
			top:    h.position.y + h.radius < viewOrigin.y,
			bottom: h.position.y - h.radius > viewOrigin.y + height
		}
		off.any = off.right || off.left || off.top || off.bottom;
		if(!off.any) {
			ctx.beginPath();
			ctx.arc(h.position.x, h.position.y, h.radius / 2, 0, Math.PI * 2, false);
			ctx.fillStyle = "white";
			ctx.fill();
		}
		else {
			if(off.left && off.top)
				drawArrow(viewOrigin.x,         viewOrigin.y,          Math.PI / 4);
			else if(off.right && off.top)
				drawArrow(viewOrigin.x + width, viewOrigin.y,          3*Math.PI / 4);
			else if(off.left && off.bottom)
				drawArrow(viewOrigin.x,         viewOrigin.y + height, -Math.PI / 4);
			else if(off.right && off.bottom)
				drawArrow(viewOrigin.x + width, viewOrigin.y + height, -3*Math.PI / 4);

			else if(off.left)
				drawArrow(viewOrigin.x, h.position.y, 0);
			else if(off.right)
				drawArrow(viewOrigin.x + width, h.position.y, Math.PI);
			else if(off.top)
				drawArrow(h.position.x, viewOrigin.y,  Math.PI / 2);
			else if(off.bottom)
				drawArrow(h.position.x, viewOrigin.y + height, -Math.PI / 2);
			
			ctx.fillStyle = h.color+"";
			ctx.fill();
		}
	});
	//prepare for next frame
	lastt = t;
	ctx.restore();
	requestAnimationFrame(draw);
}

});