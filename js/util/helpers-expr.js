export function registerHandlebarsExpr () {
	Handlebars.registerHelper('add', function (...args) {
		args.pop();
		return args.reduce((acc, x) => acc + x);
	});

	Handlebars.registerHelper('and', function (...args) {
		args.pop();
		return args.reduce((acc, x) => acc && !!x);
	});

	Handlebars.registerHelper('div', function (...args) {
		args.pop();
		return args.reduce((acc, x) => acc / x);
	});

	Handlebars.registerHelper('eq', function (...args) {
		args.pop();
		return args.reduce((acc, x) => acc === x);
	});

	Handlebars.registerHelper('equiv', function (...args) {
		args.pop();
		// noinspection EqualityComparisonWithCoercionJS
		return args.reduce((acc, x) => acc == x);
	});

	Handlebars.registerHelper('geq', function (...args) {
		return args[0] >= args[1];
	});

	Handlebars.registerHelper('gt', function (...args) {
		return args[0] > args[1];
	});

	Handlebars.registerHelper('leq', function (...args) {
		return args[0] <= args[1];
	});

	Handlebars.registerHelper('lt', function (...args) {
		return args[0] < args[1];
	});

	Handlebars.registerHelper('mult', function (...args) {
		args.pop();
		return args.reduce((acc, x) => acc * x);
	});

	Handlebars.registerHelper('not', function (...args) {
		return !args[0];
	});

	Handlebars.registerHelper('or', function (...args) {
		args.pop();
		return args.reduce((acc, x) => acc || !!x);
	});

	Handlebars.registerHelper('sub', function (...args) {
		args.pop();
		return args.reduce((acc, x) => acc - x);
	});
}
