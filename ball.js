require('./entity');
require('./vector');
require('./util');

var util = require('util');

Ball = function Ball(pos, radius, color) {
	Entity.call(this, pos)
	this.radius = radius;
	this.color = color || 'red';

	this.forces.contact = {};
}
util.inherits(Ball, Entity);

Object.defineProperty(Ball.prototype, 'mass', {
	get: function() {
		return Math.PI*this.radius*this.radius;
	},
	set: function(m) {
		this.radius = Math.sqrt(m / Math.PI);
	}
});
Object.defineProperty(Ball.prototype, 'id', {
	get: function() { return 'b' + this._id; }
});

Ball.prototype.update = function(dt) {
	//resistance = k * A * v^2
	this.forces.resistance = this.velocity.times(0.05*-this.velocity.length*this.radius*2);
	
	Entity.prototype.update.call(this, dt);
	this.forces.contact = {};
	this.forces.following = {};

	return this;
};

Ball.prototype.touches = function(that) {
	return this.position.minus(that.position).length <= this.radius + that.radius;
};

Ball.prototype.bounceOffWalls = function(width, height) {
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

Ball.prototype.interactWith = function(that) {
	if(this.following == that || that.following == this) { return false; } 
	else {
		var diff = this.position.minus(that.position);
		var dist = diff.length;
		diff.overEquals(dist);

		var overlap = this.radius + that.radius - dist;
		if(overlap > 0 && dist != 0 && Entity.allowInteraction(this, that)) {
			var meanmass = 1 / ((1 / this.mass) + (1 / that.mass));

			overlap *= meanmass;
			this.forces.contact[that.id] = diff.times(overlap*200);
			that.forces.contact[this.id] = diff.times(-overlap*200);
			return true;
		}
	}

	return false;
}

Ball.prototype.clearForces = function() {
	Entity.prototype.clearForces.call(this);
	this.forces.contact = {};
	this.forces.following = {};

	if(this.following) {
		delete this.following.followedBy;
		delete this.following;
	}
	if(this.followedBy) {
		delete this.followedBy.following;
		delete this.followedBy;
	}
}

Ball.prototype.drawTo = function(ctx) {
	ctx.save();
	ctx.fillStyle = this.color.toString();
	ctx.beginPath();
	ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);
	ctx.fill();
	ctx.restore();
	return this;
};

Ball.prototype.follow = function(that) {
	this.following = that;
	that.followedBy = this;

	target = this.position.minus(that.position)
		.normalize()
		.timesEquals(this.radius + that.radius)
		.plusEquals(that.position);

	if(target.isFinite()) {
		this.forces.following[that.id] = target.minus(this.position).times(this.mass);
		that.forces.following[this.id] = target.minus(this.position).times(-that.mass);
		this.position = target
	}
	return this;
};