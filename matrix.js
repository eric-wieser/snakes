function Matrix(a, b, c, d) {
	this.a = a;
	this.b = b;
	this.c = c;
	this.d = d;
}

Matrix.fromRotation = function(angle) {
	var sinA = Math.sin(angle);
	var cosA = Math.cos(angle);
	return new Matrix(cosA, sinA, -sinA, cosA);
}
Matrix.fromCoordinateAxes = function(xAxis, yAxis) {
	return new Matrix(
		xAxis.y, yAxis.x,
		xAxis.x, yAxis.y);
}
Matrix.fromPrincipleAxis = function(axis) {
	return new Matrix(
		axis.y, axis.x,
		-axis.x, axis.y);
}

Matrix.prototype = {
	determinant: function() {
		return this.a * this.d - this.b * this.c;
	},
	inverse: function() {
		if (this.inverseMatrix == null) {
			this.inverseMatrix = new Matrix(this.d, -this.b, -this.c, this.a).divideBy(this.determinant());
			this.inverseMatrix.inverseMatrix = this;
		}
		return this.inverseMatrix;
	},

	divideBy: function(k) {
		return new Matrix(this.a / k, this.b / k, this.c / k, this.d / k);
	},
	times: function(that) {
		if(that instanceof Matrix)
			return new Matrix(
				this.a * that.a + this.b * that.c,
				this.a * that.b + this.b * that.d,
				this.c * that.a + this.d * that.c,
				this.c * that.b + this.d * that.d);
		else if(that instanceof Vector)
			return new Vector(
				this.a * that.x + this.b * that.y,
				this.c * that.x + this.d * that.y);
		else
			return new Matrix(this.a * that, this.b * that, this.c * that, this.d * that);
	},
	toString: function() {
		alert("...");
		return "Matrix: [[" + this.a + "," + this.b + "],[" + this.c + "," + this.d + "]]";
	},
	equals: function(that) {
		return that != null && this.a == that.a && this.b == that.b && this.c == that.c && this.d == that.d;
	}
};

Matrix.identity = new Matrix(1, 0, 0, 1);
Matrix.rotate90 = new Matrix(0, 1, -1, 0);
Matrix.rotate180 = new Matrix(-1, 0, 0, -1)
Matrix.rotate270 = new Matrix(0, -1, 1, 0);