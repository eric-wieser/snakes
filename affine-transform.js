function AffineTransform(v, m) {
	if(v instanceof Matrix)
		m = v, v = null;
	this.matrix = m || Matrix.identity;
	this.translation = v || Vector.zero;
}

AffineTransform.prototype = {
	clone: function() {
		return new AffineTransform(this.translation, this.matrix);
	},
	evaluate: function() {
		return this;
	},
	toWorldSpace: function(objectVector) {
		return this.matrix.times(objectVector).plus(this.translation);
	},
	toObjectSpace: function(worldVector) {
		return this.matrix.inverse().times(worldVector.minus(this.translation));
	},
	vectorToWorldSpace: function(objectVector) {
		return this.matrix.times(objectVector);
	},
	vectorToObjectSpace: function(worldVector) {
		return this.matrix.inverse().times(worldVector);
	},
	inverse: function() {
		var inv = this.matrix.inverse();
		return new AffineTransform(inv.times(this.translation.minus()), inv);
	},
	combine: function(that) {
		return new AffineTransform(this.toWorldSpace(that.translation), this.matrix.times(that.matrix));
	},
	translate: function(v) {
		return new AffineTransform(this.translation.plus(v), this.matrix)
	},
	rotate: function(angle, center) {
		var m = Matrix.fromRotation(angle);
		if(!center) return new AffineTransform(this.translation, this.matrix.times(m))
		else return new AffineTransform(m.times(this.translation.minus(center)).plus(center), this.matrix.times(m))
	},
	scale: function(factor, center) {
		var scaled = this.clone();
		if(factor instanceof Vector)
			factor = factor.toDiagonalMatrix();
		scaled.matrix = this.matrix.times(factor);
		if(center) {
			scaled.translation = this.translation.minus(center).times(factor).minus(center);
		}
		return scaled;
	},
	toSVGTransformString: function() {
		var m = this.matrix, v = this.translation;
		return 'M'+m.a + ' ' + m.c + ' ' + m.b + ' ' + m.d + ' ' + v.x + ' ' + v.y
	},
};

AffineTransform.identity = new AffineTransform();