Object.defineEvent = function(object, name, cancellable) {
	if(cancellable) {
		object[name] = function fire() {
			for(var i in fire) {
				if(fire[i].apply(object, Array.prototype.slice.call(arguments)) === false)
					return false;
			}
			return true;
		}
	} else {
		object[name] = function fire() {
			for(var i in fire) {
				fire[i].apply(object, Array.prototype.slice.call(arguments));
			}
		}
	}
}
Object.values = function(obj) {
	var values = [];
	Object.forEach(obj, function(v) { values.push(v) });
	return values;
}
Object.reduce = function(obj, f, start, thisPtr) {
	current = start || 0;
	for(var k in obj) {
		if(obj.hasOwnProperty(k)) {
			current = f.call(thisPtr, current, obj[k], k, obj)
		}
	}
	return current;
};

Array.prototype.contains = function(x) { return this.indexOf(x) != -1; };
Array.prototype.pluck = function(prop) { return this.map(function(x) { return x[prop]; }); };

Array.prototype.forEveryPair = function(callback, thisPtr) {
	var l = this.length;
	for(var i = 0; i < l; i++) {
		for(var j = i + 1; j < l; j++) {
			var ti = this[i], tj = this[j];
			if(ti !== undefined && tj !== undefined)
				callback.call(thisPtr, ti, tj, i, j, this);
		}
	}
};
Object.forEach = function(obj, f, thisPtr) {
	for(var i in obj) {
		var oi = obj[i];
		if(oi !== undefined) {
			f.call(thisPtr, oi, i, obj);
		}
	}
}
Object.some = function(obj, f, thisPtr) {
	for(var i in obj) {
		var oi = obj[i];
		if(oi !== undefined && f.call(thisPtr, oi, i, obj) === true) {
			return true;
		}
	}
	return false;
}
Object.every = function(obj, f, thisPtr) {
	for(var i in obj) {
		var oi = obj[i];
		if(oi !== undefined && f.call(thisPtr, oi, i, obj) !== true) {
			return false;
		}
	}
	return true;
}
Object.forEachPair = function(obj, f, thisPtr) {
	for(var i in obj) {
		for(var j in obj) {
			var oi = obj[i], oj = obj[j];
			if(i < j && oi !== undefined && oj !== undefined) {
				f.call(thisPtr, oi, oj, i, j, obj);
			}
		}
	}
}
Array.prototype.forAdjacentPairs = function(callback, thisPtr) {
	var l = this.length;
	for (var i = 0, j = 1; j < l; i = j++) {
		var ti = this[i], tj = this[j];
		if(ti !== undefined && tj !== undefined)
			callback.call(thisPtr, ti, tj, i, j, this);
	}
};
Array.prototype.pluck = function(property) {
	return this.map(function(x) {return x[property]; });
};
Object.isEmpty = function(obj) {
	for (var prop in obj) if (obj.hasOwnProperty(prop)) return false;
	return true;
}