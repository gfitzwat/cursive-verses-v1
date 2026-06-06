import type { PageServerLoad } from './$types';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { BibleVerse, Translation } from '$lib/bible';

const BOOK_ORDER = [
	'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
	'1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
	'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
	'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
	'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
	'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
	'2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
	'1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
	'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];

function normalizeBsb(raw: Record<string, unknown>[]): BibleVerse[] {
	const refKey = Object.keys(raw[0]).find((k) => k !== '0' && k !== '__EMPTY') ?? '';
	const verses: BibleVerse[] = [];

	for (const row of raw) {
		const ref = row[refKey] as string;
		const text = row['__EMPTY'] as string;
		if (!ref || !text || ref === 'Verse') continue;

		// ref looks like "Genesis 1:1"
		const m = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
		if (!m) continue;
		const [, bookName, chapter, verse] = m;
		const bookIndex = BOOK_ORDER.indexOf(bookName);
		if (bookIndex === -1) continue;

		verses.push({
			book_name: bookName,
			book: bookIndex + 1,
			chapter: Number(chapter),
			verse: Number(verse),
			text
		});
	}
	return verses;
}

export const load: PageServerLoad = async ({ url }) => {
	const translation = (url.searchParams.get('t') as Translation) ?? 'kjv';
	const validTranslations = ['kjv', 'bsb', 'net', 'web'];
	const safe = validTranslations.includes(translation) ? translation : 'kjv';

	const filePath = join(process.cwd(), 'json-bibles', `${safe}.json`);
	const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

	const verses: BibleVerse[] =
		safe === 'bsb' ? normalizeBsb(raw as Record<string, unknown>[]) : (raw.verses as BibleVerse[]);

	const books = [...new Map(verses.map((v) => [v.book, v.book_name])).entries()].map(
		([id, name]) => ({ id, name })
	);

	return { verses, books, translation: safe as Translation };
};
