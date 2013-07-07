"use strict";

var Explosion = function Explosion(pos) {
	this.position = pos;
	this.age = 0;
	this.rate = 50;
	this.mirrors = {};
}

Explosion.prototype.update = function(dt) {
	if(this.invalid) return;
	this.age += dt;
	Object.forEach(this.mirrors, function(mirror) {
		mirror.update(dt);
	});
}
Explosion.prototype.clone = function() {
	var e = new Explosion(this.position.clone());
	e.age = this.age;
	e.rate = this.rate;
	return e;
}
Explosion.prototype.bounceWithin = function(width, height) {
	if(this.invalid) return;
	if(this.position.x - this.radius < 0) {
		var m = this.clone();
		m.position.x = -m.position.x
		this.mirrors.left = m;
	}
	if(this.position.y - this.radius < 0) {
		var m = this.clone();
		m.position.y = -m.position.y
		this.mirrors.top = m;
	}
	if(this.position.x + this.radius > width) {
		var m = this.clone();
		m.position.x = 2*width - m.position.x
		this.mirrors.right = m;
	}
	if(this.position.y + this.radius > height) {
		var m = this.clone();
		m.position.y = 2*height - m.position.y
		this.mirrors.bottom = m;
	}
}
Object.defineProperty(Explosion.prototype, 'brightness', {
	get: function() {
		if(this.invalid) return 0;
		var b = 0.5*Math.exp(-this.age);
		if(b < 0.01)
			this.invalid = true;
		return b;
	}
});
Object.defineProperty(Explosion.prototype, 'radius', {
	get: function() {
		return this.age*this.rate
	}
});


Explosion.prototype.drawTo = function(ctx) {
	if(this.invalid) return;
	ctx.save();
	ctx.fillStyle = 'rgba(255,255,255,'+ this.brightness + ')';

	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);
	ctx.fill();

	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, 3 * this.radius / 5, 0, Math.PI * 2, false);
	ctx.fill();

	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, this.radius / 5, 0, Math.PI * 2, false);
	ctx.fill();

	ctx.restore();

	Object.forEach(this.mirrors, function(mirror) {
		mirror.drawTo(ctx);
	});
}

module.exports = Explosion;
