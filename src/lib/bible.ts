export type BibleVerse = {
	book_name: string;
	book: number;
	chapter: number;
	verse: number;
	text: string;
};

export type Translation = 'kjv' | 'bsb' | 'net' | 'web';

export const TRANSLATIONS: { id: Translation; name: string }[] = [
	{ id: 'kjv', name: 'King James Version' },
	{ id: 'bsb', name: 'Berean Standard Bible' },
	{ id: 'net', name: 'New English Translation' },
	{ id: 'web', name: 'World English Bible' }
];

export function verseRef(v: BibleVerse) {
	return `${v.book_name} ${v.chapter}:${v.verse}`;
}

export function cleanText(text: string): string {
	// Strip paragraph markers (¶), section headings in brackets, and extra whitespace
	return text.replace(/[¶‹›]/g, '').replace(/\s+/g, ' ').trim();
}

export function searchVerses(verses: BibleVerse[], query: string): BibleVerse[] {
	const q = query.toLowerCase().trim();
	if (!q) return [];
	return verses.filter((v) => v.text.toLowerCase().includes(q)).slice(0, 50);
}

export function parseRef(verses: BibleVerse[], ref: string): BibleVerse | undefined {
	// e.g. "John 3:16"
	const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
	if (!match) return undefined;
	const [, book, ch, vs] = match;
	return verses.find(
		(v) =>
			v.book_name.toLowerCase() === book.toLowerCase() &&
			v.chapter === Number(ch) &&
			v.verse === Number(vs)
	);
}
