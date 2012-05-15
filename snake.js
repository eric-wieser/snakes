Snake = function Snake(length, color, pos, world) {
	var ballSize = 10;
	this.color = color;
	this.balls = [];
	this.world = world;
	this.balls[0] = this.head = new Ball(pos, ballSize, color.randomized(16))
	this.maxMass = this.head.mass;
	for (var i = 1; i < length; i++) {
		this.addBall(new Ball(new Vector(), ballSize, color.randomized(16)));
	};
	this.balls.forEach(function(b) {
		this.world.addEntity(b);
	}, this);
	Object.defineEvent(this, 'onDeath');
	Object.defineEvent(this, 'onBallEaten');
}
var onHeadHit = function(thing) {
	var that = thing.ownerSnake;
	if(that == undefined) {
		if(this.eat(thing)) {
			this.onBallEaten(thing, "free");
			return false; //prevent balls interacting
		}
	}
	else if(that != this) {
		if(thing == that.head) {
			if(that.length == 1 && this.head.mass > that.head.mass*2) {
				this.eat(thing);
				that.balls = [];
				this.onBallEaten(thing, "head");
				that.destroy();
				that.onDeath(this);
				return false;
			}
		}
		else if(this.canEat(thing)) {
			that.eatenAt(thing);
			this.eat(thing);
			this.onBallEaten(thing, "tail");
			return false;
		}
	}
	return true;
}
Object.defineProperty(Snake.prototype, 'tail', {
	get: function() { return this.balls[this.balls.length - 1]; }
});
Object.defineProperty(Snake.prototype, 'head', {
	get: function() { return this._head; },
	set: function(h) {
		var current = this.head;
		if(h != current) {
			var force = Vector.zero
			if(current) {
				force  = current.forces.player;
				delete current.onInteracted.eat;
				delete current.forces.player;
			} 
			if(h) {
				var snake = this;
				h.forces.player = force
				h.onInteracted.eat = function(x) {return onHeadHit.call(snake, x);}
				h.ownerSnake = this;
			}
			this._head = h;
		}
	}
});
Object.defineProperty(Snake.prototype, 'mass', {
	get: function() { return this.balls.reduce(function(sum, x) { return sum + x.mass }, 0); }
});
Object.defineProperty(Snake.prototype, 'length', {
	get: function() { return this.balls.length; }
});
Snake.prototype.drawTo = function(ctx) {
	ctx.save();
	ctx.fillStyle = "white";
	ctx.beginPath();
	ctx.arc(this.head.position.x, this.head.position.y, 5, 0, Math.PI * 2, false);
	ctx.fill();
	ctx.restore();
	return this;
};
Snake.prototype.addBall = function(ball) {
	ball.clearForces();
	ball.velocity.set(0, 0);
	ball.ownerSnake = this;

	var pos = this.tail.position
	var dist = ball.radius + this.tail.radius;
	for(var j = 0; j < 100; j++) {
		var p = Vector.fromPolarCoords(dist, Math.random() * Math.PI * 2)
		ball.position = p.plusEquals(pos);
		var collides = this.balls.some(function(b) {b.touches(ball)});
		if(collides) break;
	}
	this.balls.push(ball);
}
//Respond to being eaten
Snake.prototype.eatenAt = function(ball) {
	var index = this.balls.indexOf(ball);
	if(index > 0) {
		var removed = this.balls.splice(index);
		removed.shift();
		var removedMass = removed.reduce(function(sum, b) {return sum + b.mass}, 0);
		var remainingMass = this.mass;
		//Reverse the snake if too much was taken off
		if(removedMass > remainingMass) {
			var r = this.balls;
			this.balls = removed.reverse();
			this.head = this.balls[0];
			removed = r;
		}
		removed.forEach(function(b) {
			delete b.ownerSnake;
			b.clearForces();
		});
	}
}
Snake.prototype.canEat = function(ball) {
	if(this.balls.contains(ball)) return false;
	if(this.maxMass * 2 < ball.mass) return false;
	return true;
}
Snake.prototype.eat = function(ball) {
	if(!this.canEat(ball)) return false;

	this.maxMass *= 1.05;
	this.addBall(ball);
	return true;
}
Snake.prototype.destroy = function() {
	this.balls.forEach(function(b) {
		this.world.removeEntity(b);
		delete b.ownerSnake;
	}, this);
	this.balls = [];
	this.head = null;

	//Wipe all member functions to try and prevent problems
	for(var p in Snake.prototype)
		if(typeof this[p] == "function")
			this[p] = function() {};
}
var balls = [];
Snake.prototype.update = function(dt) {
	//Shortening
	this.balls.forAdjacentPairs(function(a, b, ai, bi) {
		var rate = 50;// + 5*(this.length - ai);
		var aMass = a.mass;
		var diff = aMass - this.maxMass;
		if(diff > rate) {
			a.mass = aMass - rate;
			b.mass += rate;
		} else if(diff < -rate) {
			var bMass = b.mass;
			if(bMass < rate) {
				b.mass = 0;
				a.mass = aMass + bMass;
			} else {
				a.mass = aMass + rate;
				b.mass = bMass - rate;
			}
		} else {
			a.mass = this.maxMass;
			b.mass += diff;
		}
	}, this);
	var last = this.tail;
	if(!(last.mass > 0)) { //NaNs
		this.balls.pop();
		this.world.removeEntity(last);
	}
	
	//Update ball colors
	this.balls.forEach(function(b) {
		b.color.lerp(this.color, 0.05);
	}, this);

	//Force them into a line
	this.balls.forAdjacentPairs(function(b1, b2) {
		b2.follow(b1);
	}, this);
};