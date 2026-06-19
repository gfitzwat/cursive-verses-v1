# Cursive Verses

A handwriting worksheet generator for Bible verses. Choose a translation, book, chapter, and verse — then print with ruled lines and your selected verse in cursive or print lettering.

**Live site:** https://gfitzwat.github.io/cursive-verses-v1/

## Features

- 4 Bible translations: KJV, BSB, NET, WEB
- Cursive and print lettering styles
- Tracing and copywork modes
- One-click PDF download
- Advanced print settings: font size, line density, line darkness, word spacing
- Fully static — no server, no account required

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) with Svelte 5 runes
- [Tailwind CSS v4](https://tailwindcss.com/)
- [html2canvas](https://html2canvas.hertzen.com/) + [jsPDF](https://github.com/parallax/jsPDF) for PDF export
- Deployed to GitHub Pages via GitHub Actions

## Developing

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
npm run preview
```

## License

MIT — see [LICENSE](LICENSE)
