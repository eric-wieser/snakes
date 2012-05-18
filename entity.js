var util = require('util');
var events = require('events');

Entity = function Entity(position, velocity) {
    events.EventEmitter.call(this);
	this.position = position || Vector.zero;
	this.velocity = velocity || Vector.zero;
	this.forces = {};
	this._id = -1;
};
util.inherits(Entity, events.EventEmitter);

Entity.allowInteraction = function(a, b) {
	var allow = true;
	var cancelled = function(x) { if(x) {console.log(x); allow = false;} else return !allow; }
	a.emit('interaction', b, cancelled)
	b.emit('interaction', a, cancelled)
	return allow;
}

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
		}, Vector.zero).overEquals(this.mass);
	}
});
Entity.prototype.update = function(dt) {
	this.velocity.plusEquals(this.acceleration.times(dt))
	this.velocity.forceMaxLength(1000);
	this.position.plusEquals(this.velocity.times(dt))
	return this;
};
Entity.prototype.clearForces = function(dt) {
	this.forces = {}
}
Entity.prototype.mass = 1;
Entity.prototype.touches = function() { return false; };