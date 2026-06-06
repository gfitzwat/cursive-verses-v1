import type { PageServerLoad } from './$types';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { BibleVerse, Translation } from '$lib/bible';

export const load: PageServerLoad = async ({ url }) => {
	const translation = (url.searchParams.get('t') as Translation) ?? 'kjv';
	const validTranslations = ['kjv', 'bsb', 'net', 'web'];
	const safe = validTranslations.includes(translation) ? translation : 'kjv';

	const filePath = join(process.cwd(), 'json-bibles', `${safe}.json`);
	const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
	const verses: BibleVerse[] = raw.verses;

	// Build book list for navigation
	const books = [...new Map(verses.map((v) => [v.book, v.book_name])).entries()].map(
		([id, name]) => ({ id, name })
	);

	return { verses, books, translation: safe as Translation };
};
