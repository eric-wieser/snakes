Object.reduce = function(obj, f, start, thisPtr) {
	current = start || 0;
	for(k in obj) {
		if(obj.hasOwnProperty(k)) {
			current = f.call(thisPtr, current, obj[k], k, obj)
		}
	}
	return current;
};

Entity = function(position, velocity) {
	this.position = position || Vector.zero();
	this.velocity = velocity || Vector.zero();
	this.forces = {};
	this._id = Entity.generateIdNo();
};
Entity.generateIdNo = (function(id) {
	return function() {	return id++; }
})(0);

Object.defineProperty(Entity.prototype, 'id', {
	get: function() { return 'e' + this._id; }
});
Object.defineProperty(Entity.prototype, 'acceleration', {
	get: function() {
		return Object.reduce(this.forces, function sumVectors(total, current) {
			if(current instanceof Vector)
				return current.isFinite() ? total.plusEquals(current) : total;
			else if(current instanceof Array)
				return current.reduce(sumVectors, total);
			else if(current instanceof Object)
				return Object.reduce(current, sumVectors, total);
			else
				return total;
		}, Vector.zero()).overEquals(this.mass);
	}
});
Entity.prototype.update = function(dt) {
	this.velocity.plusEquals(this.acceleration.times(dt))
	this.position.plusEquals(this.velocity.times(dt))
	return this;
};
Entity.prototype.clearForces = function(dt) {
	this.forces = {}
}
Entity.prototype.mass = 1;