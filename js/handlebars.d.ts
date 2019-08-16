declare class Handlebars {
	static registerHelper (helper: string, fn: (...args: any[]) => any)
	static SafeString (input: string)
}
