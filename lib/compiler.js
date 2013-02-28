/**
 * @overview Compiler module.
 */

var vm = require('vm'),
	fs = require('fs'),
	regs = require('./regs'),
	params = require('./params'),
	escapers = require('./escapers');

function SysContext() {
	this.initInstruments = function(code /*, toggle*/ ) {
		var toggle = {
			show: true,
			isolation: true
		};
		if (typeof arguments[1] === 'object') {
			for (var key in arguments[1]) {
				toggle[key] = arguments[1][key];
			}
		}

		var header = '',
			footer = '';

		header += ';toShow="";';
		if (toggle.show) {
			header += ';function show(value) { return toShow += value; };';
			footer += ';toShow;';
		} else {
			header += ';function show() {};';
			header += ';show();';
		}

		if (toggle.isolation) {
			if (toggle.show) {
				header = ';(function () {' + header;
				footer += ';return toShow;})();';
			} else {
				header = ';(function () {' + header + ';return ';
				footer += ';})();';
			}
		}

		return header + code + footer;
	};
	this.show = function() {};
	this.toShow = '';
}

function CompiledTemplate(content, inputParams) {
	this.inputParams = inputParams;
	this.compile = function() {
		var systemContext = new SysContext();
		content = '#>' + content + '<#';
		content = compileParse(content);
		content = systemContext.initInstruments(content);
		this.script = vm.createScript(content.toString());
		return this;
	};
}

CompiledTemplate.prototype.run = function(context) {
	if (this.compile && this.script) {
		return this.script.runInNewContext(context);
	} else throw new Error('no way');
};

exports.CompiledTemplate = CompiledTemplate;

/**
 * Merge and returns result parsed string as object with additional properties.
 *
 * @property {string} result.status is "success" or "error"
 * @returns {string} String-object with additional properties
 */

function compileParse(str) {
	var inclusions;
	if (inclusions = str.match(regs.compile.all)) {
		inclusions.forEach(function(val) {
			var code = val.replace(regs.compile.only, '$1');
			code = escapers.compileEscape(code);
			code = ";show('" + code + "');";
			code = simpleParse(code);
			str = str.replace(regs.compile.first, function() {
				return code;
			});
		});
	}
	return str;
}

function simpleParse(str) {
	var inclusions;
	if (inclusions = str.match(regs.simple.all)) {
		inclusions.forEach(function(val) {
			var code = val.replace(regs.simple.only, '$1');
			code = escapers.compileUnescape(code);
			code = escapers.simpleEscape(code);
			code = "'+(" + code + ")+'";
			str = str.replace(regs.simple.first, function() {
				return code;
			});
		});
	}
	return str;
}