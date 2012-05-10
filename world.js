World = function(width, height) {
	this.entities = [];
	this.width = width || 0;
	this.height = height || 0;
	Object.defineEvent(this, 'onEntityRemoved', true);
	Object.defineEvent(this, 'onEntityAdded');
	Object.defineEvent(this, 'onUpdated');
}
World.prototype.update = function(dt) {
	this.entities.forEveryPair(function(e1, e2) {
		e1.interactWith(e2)
	});
	this.entities.forEach(function(e) {
		e.update(dt);
		e.bounceOffWalls(this.width, this.height);
	}, this);
	this.onUpdated();
	return this;
}
World.prototype.addEntity = function(e) {
	this.entities[e._id] = e;
	this.onEntityAdded(e);
	return this;
}
World.prototype.removeEntity = function(e) {
	if(e && e._id in this.entities && this.onEntityRemoved(e))
		delete this.entities[e._id];
	return this;
}
World.prototype.randomPosition = function() {
	return new Vector(Math.random()*this.width, Math.random()*this.height);
}
World.prototype.entityById = function(id) {
	for(i in this.entities) {
		var e = this.entities[i]
		if(e._id == id) return e;
	}
}
World.prototype.totalMass = function(id) {
	return this.entities.reduce(function(sum, e) { return e.mass + sum; }, 0);
}