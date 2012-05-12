Vector = function Vector(x, y) {
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
Vector.ify = function(data) {
	if(data instanceof Object && 'x' in data && 'y' in data)
		return new Vector(data.x, data.y);
	else if(typeof data == "string") {
		return Vector.fromString(data);
	}
}
Vector.prototype = {
	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},
	isFinite: function() {
		return isFinite(this.x) && isFinite(this.y);
	},
	get length() {
		return Math.sqrt(this.lengthSquared);
	},
	set length(x) {
		this.overEquals(x/this.length);
	},
	get lengthSquared() {
		return this.dot(this);
	},
	set lengthSquared(x) {
		this.overEquals(Math.sqrt(x/this.lengthSquared));
	},
	angle: function() {
		return Math.atan2(this.x, this.y);
	},
	forceMaxLength: function(f) {
		var l = this.length;
		if(!isFinite(l)) this.set(0, 0);
		else if(f < l) this.overEquals(f / l);
	},
	normalized: function() {
		return this.over(this.length);
	},
	normalize: function() {
		return this.overEquals(this.length);
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
	distanceTo: function(that, squared) {
		var dx = this.x - that.x;
		var dy = this.y - that.y;
		var d = dx*dx + dy*dy;
		return squared ? d : Math.sqrt(d);
	},
	angleTo: function(that) {
		return Math.acos(this.dot(that) / Math.sqrt(this.lengthSquared * that.lengthSquared))
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
	toFixed: function(precision) {
		return '(' + this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ')';
	},
	clone: function() {
		return new Vector(this.x, this.y);
	}
};

Object.defineProperties(Vector, {
	zero: {get: function() { return new Vector(0, 0)     } },
	i:    {get: function() { return new Vector(1, 0)     } },
	j:    {get: function() { return new Vector(0, 1)     } },
	NaN:  {get: function() { return new Vector(NaN, NaN) } }
});

Vector.prototype['+'] = Vector.prototype.plus
Vector.prototype['-'] = Vector.prototype.minus
Vector.prototype['*'] = Vector.prototype.times
Vector.prototype['/'] = Vector.prototype.over

Vector.prototype['+='] = Vector.prototype.plusEquals
Vector.prototype['-='] = Vector.prototype.minusEquals
Vector.prototype['*='] = Vector.prototype.timesEquals
Vector.prototype['/='] = Vector.prototype.overEquals