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
	magnitude: function() {
		return Math.sqrt(this.dot(this));
	},
	angle: function() {
		return Math.atan2(this.x, this.y);
	},
	unit: function() {
		return this.times(1 / this.magnitude());
	},
	plus: function(that) {
		return new Vector(this.x + that.x, this.y + that.y);
	},
	minus: function(that) {
		if(!that)
			return new Vector(-this.x, -this.y);
		else
			return new Vector(this.x - that.x, this.y - that.y);
	},
	times: function(factor) {
		if(factor instanceof Vector)
			return new Vector(this.x * factor.x, this.y * factor.y);
		else
			return new Vector(this.x * factor, this.y * factor);
	},
	over: function(factor) {
		return new Vector(this.x / factor, this.y / factor);
	},
	dot: function(that) {
		return this.x * that.x + this.y * that.y;
	},
	distanceTo: function(that) {
		return this.subtract(that).magnitude();
	},
	lerp: function(that, t) {
		return that.times(t).plus(this.times(1-t));
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
		return new Vector(x, y);
	}
};

Vector.zero = new Vector(0,0);
Vector.i = new Vector(1,0);
Vector.j = new Vector(0,1);