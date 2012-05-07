Ball = function(pos, radius, color) {
	Entity.call(this, pos)
	this.radius = radius;
	this.color = color || 'red';

	this.forces.contact = {};
}
Ball.n = 0;
Ball.prototype = new Entity;

Ball.prototype.__defineGetter__('mass', function() {
	return Math.PI*this.radius*this.radius;
});
Ball.prototype.__defineSetter__('mass', function(m) {
	this.radius = Math.sqrt(m / Math.PI);
});
Ball.prototype.update = function(dt) {
	//resistance = k * A * v^2
	this.forces.resistance = this.velocity.times(0.05*-this.velocity.magnitude()*this.radius*2);
	
	Entity.prototype.update.call(this, dt);
	this.forces.contact = {};
	this.forces.following = {};

	return this;
};

Ball.prototype.touches = function(that) {
	return this.position.minus(that.position).magnitude() <= this.radius + that.radius;
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

Ball.prototype.updateForceFrom = function(that) {
	if(that instanceof Array) {
		for (var i = 0; i < that.length; i++) {
			if(this != that[i]) this.updateForceFrom(that[i]);
		}
	} else {
		var diff = this.position.minus(that.position);
		var dist = diff.magnitude();
		diff.overEquals(dist);

		var overlap = this.radius + that.radius - dist;
		if(overlap > 0 && dist != 0) {
			var meanmass = 1 / ((1 / this.mass) + (1 / that.mass))
			overlap *= meanmass;
			this.forces.contact[that.id] = diff.times(overlap*200);
			that.forces.contact[this.id] = diff.times(-overlap*200);
		}
	}
	return this;
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
	target = this.position.minus(that.position)
		.normalize()
		.timesEquals(this.radius + that.radius)
		.plusEquals(that.position);

	this.forces.following[that.id] = target.minus(this.position).times(20000);
	that.forces.following[this.id] = target.minus(this.position).times(-20000);
	this.position = target
	return this;
};
Ball.prototype.__defineGetter__('id', function() {
	return 'b' + this._id;
})