function Vector(x, y) {
	this.x = x;
	this.y = y;
}
Vector.fromPolarCoords = function(r, theta) {
	if(theta === undefined)
		theta = r, r = 1;
	return new Vector(r*Math.cos(theta), r*Math.sin(theta));
}
Vector.fromString = function(string) {
	var components = string.split(',');
	var x = parseFloat(components[0].replace(/[^\d\.-]/g, ''));
	var y = parseFloat(components[1].replace(/[^\d\.-]/g, ''));
	
	if(isNaN(x) || isNaN(y))
		return null;
	else
		return new Vector(x, y);
}
Vector.prototype = {
	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},
	magnitude: function() {
		return Math.sqrt(this.dot(this));
	},
	angle: function() {
		return Math.atan2(this.x, this.y);
	},
	normalized: function() {
		return this.times(1 / this.magnitude());
	},
	normalize: function() {
		var len = this.magnitude();
		return this.overEquals(len);
	},
	plus: function(that) {
		return new Vector(this.x + that.x, this.y + that.y);
	},
	plusEquals: function(that) {
		this.x += that.x;
		this.y += that.y;
		return this;
	},
	minus: function(that) {
		return new Vector(this.x - that.x, this.y - that.y);
	},
	minusEquals: function(that) {
		this.x -= that.x;
		this.y -= that.y;
		return this;
	},
	times: function(factor) {
		if(factor instanceof Vector)
			return new Vector(this.x * factor.x, this.y * factor.y);
		else
			return new Vector(this.x * factor, this.y * factor);
	},
	timesEquals: function(factor) {
		if(factor instanceof Vector) {
			this.x *= factor.x;
			this.y *= factor.y;
		} else {
			this.x *= factor;
			this.y *= factor;
		}
		return this;
	},
	over: function(factor) {
		return new Vector(this.x / factor, this.y / factor);
	},
	overEquals: function(factor) {
		if(factor instanceof Vector) {
			this.x /= factor.x;
			this.y /= factor.y;
		} else {
			this.x /= factor;
			this.y /= factor;
		}
		return this;
	},
	negated: function() {
		return new Vector(-this.x, -this.y);
	},
	negate: function() {
		this.x = -this.x;
		this.y = -this.y;
		return this;
	},
	dot: function(that) {
		return this.x * that.x + this.y * that.y;
	},
	distanceTo: function(that) {
		return this.minus(that).magnitude();
	},
	angleTo: function(that) {
		return Math.acos(this.dot(that) / (this.magnitude() * that.magnitude()))
	},
	lerp: function(that, t) {
		return that.times(t).plus(this.times(1 - t));
	},
	perp: function() {
		return new Vector(-this.y, this.x);
	},
	toDiagonalMatrix: function() {
		return new Matrix(this.x, 0, 0, this.y);
	},
	toString: function() {
		return '(' + this.x + ',' + this.y + ')';
	},
	clone: function() {
		return new Vector(this.x, this.y);
	}
};

Vector.zero = function() { return new Vector(0, 0) };
Vector.i = function() { return new Vector(1, 0) };
Vector.j = function() { return new Vector(0, 1) };
Vector.NaN = function() { return new Vector(Number.NaN, Number.NaN) };

Vector.prototype['+'] = Vector.prototype.plus
Vector.prototype['-'] = Vector.prototype.minus
Vector.prototype['*'] = Vector.prototype.times
Vector.prototype['/'] = Vector.prototype.over

Vector.prototype['+='] = Vector.prototype.plusEquals
Vector.prototype['-='] = Vector.prototype.minusEquals
Vector.prototype['*='] = Vector.prototype.timesEquals
Vector.prototype['/='] = Vector.prototype.overEquals