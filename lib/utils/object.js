/**
 * Extend 'obj' with properties from 'options'
 * @param {Object} obj
 * @param {Object} options
 */
exports.extend = function(obj, options) {
	for (var option in options) {
		obj[option] = options[option];
	}
	return obj;
};

/**
 * Shallow copy of 'obj'
 * @param {Object} obj
 * @return {Object}
 */
exports.clone = function(obj) {
	var o = {};
	for (var prop in obj) {
		o[prop] = obj[prop];
	}
	return o;
};

/**
 * Bind 'fn' to 'ctx'
 * @param {Function} fn
 * @param {Object} ctx
 */
exports.bind = function(fn, ctx) {
	return function(){
		return fn.apply(ctx, arguments);
	};
};