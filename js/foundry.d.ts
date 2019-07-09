declare class HTML extends Array<HTMLElement> {
	find (query: string): HTML[]
}

interface CharacterClass {
	name: string,
	custom: string,
	subclass: string,
	levels: number,
	hd: number
}
