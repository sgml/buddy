var path = require('path')
	, fs = require('fs');

var RE_REQUIRE = /require[\s|\(]['|"](.*?)['|"]\)?/g
	, RE_IMPORT = /@import\s['|"](.*?)['|"];?/g
	, RE_INCLUDE = /(?:{>|include)\s?(.*?)[\s|}]/g
	, RE_JS_COMMENT_LINES = /^\s*(?:\/\/|#).+$/gm
	, RE_CSS_COMMENT_LINES = /((?:\/\*(?:[^*]|(?:\*+[^*\/]))*\*+\/))$/gm
	, RE_JSON = /\.json$/;

/**
 * Retrieve all dependency references in 'file' content
 * @param {Object} file
 * @param {Object} options
 * @param {Function} fn(err, file)
 */
module.exports = function (file, options, fn) {
	var deps = []
		, content = file.content
		, re_comments, re_dep, match, inlineErrors, inlined;

	if (file.type == 'js') {
		// remove commented lines
		content = content.replace(RE_JS_COMMENT_LINES, '');
		re_dep = RE_REQUIRE;
		inlineErrors = [];
	} else if (file.type == 'css') {
		// remove commented lines
		content = content.replace(RE_CSS_COMMENT_LINES, '');
		re_dep = RE_IMPORT;
	} else {
		re_dep = RE_INCLUDE;
	}

	// Find dependency references
	while (match = re_dep.exec(content)) {
		// Inline json require
		if (file.type == 'js' && RE_JSON.test(match[1])) {
			inlined = inlineJSON(file, match[1], match[0]);
			// Store errors
			if (inlined) inlineErrors.push(inlined);
		// Store dependency
		} else {
			if (!~deps.indexOf(match[1])) deps.push(match[1]);
		}
	}

	console.log(deps)
	file.dependencies = deps;

	return fn(inlineErrors.length ? inlineErrors : null, file);
};

/**
 * Inline a require('file.json') statement
 * @param {String} jsonPath
 * @param {String} requireStatement
 * @param {Regexp} match
 */
function inlineJSON (file, jsonPath, requireStatement) {
	var filepath = path.resolve(path.dirname(file.filepath), jsonPath)
		, json = fs.existsSync(filepath)
			? fs.readFileSync(filepath, 'utf8')
			: '';
	try {
		json = JSON.stringify(JSON.parse(json));
	} catch (err) {
		json = '{}';
	}
	file.content = file.content.replace(requireStatement, json);
	// Return filepath if error
	return (json == '{}')
		? filepath
		: '';
}