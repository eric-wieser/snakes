function Color(r, g, b) {
	this.r = Color.clipComponent(r);
	this.g = Color.clipComponent(g);
	this.b = Color.clipComponent(b);
}
Color.prototype.randomNear = function(range) {
	return new Color(
		randomInt(Color.clipComponent(this.r - range), Color.clipComponent(this.r + range)),
		randomInt(Color.clipComponent(this.g - range), Color.clipComponent(this.g + range)),
		randomInt(Color.clipComponent(this.b - range), Color.clipComponent(this.b + range))
	)
};
Color.prototype.lerp = function(that, x) {
	var y = 1 - x;
	return new Color(
		this.r*y + that.r*x,
		this.g*y + that.g*x,
		this.b*y + that.b*x
	);
};
Color.prototype.inverted = function() {
	return new Color(
		255-this.r, 255-this.g, 255-this.b
	);
}
Color.prototype.toString = function() {
	return 'rgb(' + Math.round(this.r) + ', ' + Math.round(this.g) + ', ' + Math.round(this.b) + ')';
};
Color.random = function(r, g, b, range) {
	return new Color(r,g,b).randomNear(range);
}
Color.clipComponent = function(x) {
	return x > 255 ? 255 : x < 0 ? 0 : x;
}