var util = require('util');
var events = require('events');
require('./vector');
World = function World(width, height) {
    events.EventEmitter.call(this);
	this.entities = [];
	this.width = width || 0;
	this.height = height || 0;
}
util.inherits(World, events.EventEmitter);

World.prototype.update = function(dt) {
	this.entities.forEveryPair(function(e1, e2) {
		e1.interactWith(e2)
	});
	this.entities.forEach(function(e) {
		e.update(dt);
		e.bounceOffWalls(this.width, this.height);
	}, this);
	this.emit('update');
	return this;
};
World.prototype.clear = function(e) {
	this.entities = [];
};
World.prototype.addEntity = function(e) {
	var i = 0;
	while(this.entities[i] !== undefined)
		i++;
	e._id = i;

	this.entities[i] = e;
	this.emit('entity.add', e);
	return this;
};
World.prototype.removeEntity = function(e) {
	if(e && e._id in this.entities) {
		this.emit('entity.remove', e);
		delete this.entities[e._id];
	}
	return this;
};
World.prototype.randomPosition = function() {
	return new Vector(Math.random()*this.width, Math.random()*this.height);
},
World.prototype.entityById = function(id) {
	for(i in this.entities) {
		var e = this.entities[i]
		if(e._id == id) return e;
	}
};
Object.defineProperty(World.prototype, 'totalMass', {get: function() {
	return this.entities.reduce(function(sum, e) { return e.mass + sum; }, 0);
}});