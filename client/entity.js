var reduceObject = function(o, f, start, thisPtr) {
	current = start || 0;
	for(k in o) {
		if(o.hasOwnProperty(k)) {
			current = f.call(thisPtr, current, o[k], k, o)
		}
	}
	return current;
}

Entity = function(position, velocity) {
	this.position = position || Vector.zero();
	this.velocity = velocity || Vector.zero();
	this.forces = {};
}

Entity.prototype.getMass = function() { return 1; }
Entity.prototype.getAcceleration = function() {
	return reduceObject(this.forces, function sumVectors(total, current) {
		if(current instanceof Vector)
			return total.plusEquals(current);
		else if(current instanceof Array)
			return current.reduce(sumVectors, total);
		else if(current instanceof Object)
			return reduceObject(current, sumVectors, total);
		else
			return total;
	}, Vector.zero()).overEquals(this.getMass());
}
Entity.prototype.update = function(dt) {
	this.velocity.plusEquals(this.getAcceleration().times(dt))
	this.position.plusEquals(this.velocity.times(dt))
	return this;
}