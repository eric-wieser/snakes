Color = function(r, g, b) {
	this.r = r ? Color.clipComponent(r) : 0;
	this.g = g ? Color.clipComponent(g) : 0;
	this.b = b ? Color.clipComponent(b) : 0;
}
var rand = function(min, max) { return min + (max - min) * Math.random(); }

//Mutating methods
Color.prototype.randomize = function(range) {
	this.r = rand(Color.clipComponent(this.r - range), Color.clipComponent(this.r + range));
	this.g = rand(Color.clipComponent(this.g - range), Color.clipComponent(this.g + range));
	this.b = rand(Color.clipComponent(this.b - range), Color.clipComponent(this.b + range));
	return this;
};
Color.prototype.lerp = function(that, x) {
	var y = 1 - x;
	this.r = this.r*y + that.r*x;
	this.g = this.g*y + that.g*x;
	this.b = this.b*y + that.b*x;
	return this;
};
Color.prototype.invert = function() {
	this.r = 255-this.r;
	this.g = 255-this.g;
	this.b = 255-this.b;
	return this;
}
Color.prototype.set = function(r, g, b) {
	this.r = Color.clipComponent(r);
	this.g = Color.clipComponent(g);
	this.b = Color.clipComponent(b);
	return this;
}

//Non-mutating versions
Color.prototype.inverted   = function()        { return this.clone().invert();      }
Color.prototype.lerped     = function(that, x) { return this.clone().lerp(that, x); }
Color.prototype.randomized = function(x)       { return this.clone().randomize(x);  }

Color.prototype.toString = function() {
	return 'rgb(' + Math.round(this.r) + ', ' + Math.round(this.g) + ', ' + Math.round(this.b) + ')';
};
Color.prototype.toHexString = function() {
	return '#' + this.toInt().toString(16);
};
Color.prototype.toInt = function(rgb) {
	return Math.round(this.r) << 16 | Math.round(this.g) << 8 | Math.round(this.b);
};
Object.defineProperty(String.prototype, 'colored', {
	value: function(c) {
		var r = Math.round(c.r * 5 / 255);
		var g = Math.round(c.g * 5 / 255);
		var b = Math.round(c.b * 5 / 255);
		return '\033[38;5;' + (16 + r*36 + g*6 + b) + 'm' + this + '\033[0m';
	},
	enumerable: false
});
Color.fromInt = function(rgb) {
	var b = rgb & 0xff;
	var g = (rgb >>= 8) & 0xff;
	var r = (rgb >>= 8) & 0xff;
	return new Color(r, g, b);
}
Color.prototype.clone = function() {
	var c = new Color;
	c.r = this.r, c.b = this.b, c.g = this.g
	return c;
}
Color.random = function(r, g, b, range) {
	return new Color(r || 128, g || 128, b || 128).randomize(range || 128);
}
Color.clipComponent = function(x) {
	return x > 255 ? 255 : x < 0 ? 0 : x;
}
Color.ify = function(data) {
	if(typeof data == "number")
		return Color.fromInt(data);
	else if(data instanceof Object)
		return new Color(data.r, data.g, data.b);
}
Color.randomHue = function() {
	var a = Math.random() * 6;
	var b = Math.random() * 128 - 64;

	if(a < 1)
		return new Color(255, 64 + b, 64 - b); //yellow-magenta face
	else if(a < 2)
		return new Color(64 - b, 255, 64 + b); //magenta-cyan face
	else if(a < 3)
		return new Color(64 + b, 64 - b, 255); //cyan-yellow face
	else if(a < 4)
		return new Color(0, 192 + b, 192 - b); //green-blue face
	else if(a < 5)
		return new Color(192 - b, 0, 192 + b); //blue-red face
	else
		return new Color(192 + b, 192 - b, 0); //red-green face
}

//Primaries
Color.red     = function() { return new Color(255, 0, 0); }
Color.green   = function() { return new Color(0, 255, 0); }
Color.blue    = function() { return new Color(0, 0, 255); }

//secondaries
Color.yellow  = function() { return new Color(255, 255, 0); }
Color.cyan    = function() { return new Color(0, 255, 255); }
Color.magenta = function() { return new Color(255, 0, 255); }

//grayscale
Color.white   = function() { return new Color(255, 255, 255); }
Color.gray    = function() { return new Color(128, 128, 128); }
Color.black   = function() { return new Color(  0,   0,   0); }