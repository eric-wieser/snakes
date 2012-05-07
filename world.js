World = function() {
	this.entities = [];
	this.width = 0;
	this.height = 0;
}
World.prototype.update = function(dt) {
	this.entities.forEveryPair(function(e1, e2) {
		e1.updateForceFrom(e2)
	});
	this.entities.forEach(function(e) {
		e.update(dt);
		e.bounceOffWalls(this.width, this.height);
	});
	return this;
}
World.prototype.addEntity = function(e) {
	this.entities[e._id] = e;
	return this;
}
World.prototype.removeEntity = function(e) {
	delete this.entities[e._id];
	return this;
}
