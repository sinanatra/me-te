const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

export const decode = (text: string) =>
	text
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
		.replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);

export const plain = (html: string) => decode(html.replace(/<[^>]*>/g, ''));
