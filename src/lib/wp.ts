import { error } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { WP_API } from '$lib/config';
import { plain } from '$lib/text';

type Fetch = typeof fetch;

export type Image = {
	src: string;
	thumb: string;
	alt: string;
	width: number;
	height: number;
};

export type Category = {
	id: number;
	slug: string;
	name: string;
};

export type Link = {
	href: string;
	label: string;
};

export type Project = {
	id: number;
	slug: string;
	title: string;
	date: string | null;
	excerpt: string;
	content: string;
	categories: string[];
	cover: Image | null;
	images: Image[];
	links: Link[];
	externalUrl: string | null;
	video: string | null;
	detail: boolean;
};

export type Page = {
	slug: string;
	title: string;
	content: string;
};

type WPRendered = { rendered: string };
type WPMedia = {
	source_url: string;
	alt_text: string;
	mime_type?: string;
	media_details?: { width: number; height: number; sizes?: Record<string, { source_url: string }> };
};
type WPPost = {
	id: number;
	slug: string;
	date: string;
	title: WPRendered;
	content: WPRendered;
	_embedded?: { 'wp:featuredmedia'?: WPMedia[] };
};
type WPCard = WPPost & {
	meta?: { link_interno?: string; link_esterno?: string };
	_embedded?: { 'wp:term'?: { slug: string; taxonomy: string }[][] };
};
type WPPage = { slug: string; title: WPRendered; content: WPRendered };

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: Promise<unknown> }>();

async function request<T>(fetch: Fetch, path: string): Promise<T> {
	const res = await fetch(`${WP_API}${path}`);
	if (!res.ok) error(res.status, `WordPress: ${path}`);
	return res.json();
}

function get<T>(fetch: Fetch, path: string): Promise<T> {
	const hit = cache.get(path);
	if (hit && Date.now() - hit.at < CACHE_MS) return hit.data as Promise<T>;
	const data = request<T>(fetch, path);
	cache.set(path, { at: Date.now(), data });
	data.catch(() => cache.delete(path));
	return data;
}

function thumbFrom(srcset: string): string | null {
	const candidates = srcset
		.split(',')
		.map((c) => c.trim().split(/\s+/))
		.map(([url, w]) => ({ url, w: parseInt(w) }))
		.filter((c) => c.url && c.w)
		.sort((a, b) => a.w - b.w);
	return (candidates.find((c) => c.w >= 700) ?? candidates.at(-1))?.url ?? null;
}

function contentImages(html: string): Image[] {
	return [...html.matchAll(/<img\b[^>]*>/gi)].flatMap(([tag]) => {
		const attr = (name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i'))?.[1] ?? '';
		const src = attr('src');
		return src ? [{ src, thumb: thumbFrom(attr('srcset')) ?? src, alt: attr('alt'), width: Number(attr('width')) || 0, height: Number(attr('height')) || 0 }] : [];
	});
}

const host = (href: string) => {
	try {
		return new URL(href).hostname.replace(/^www\./, '');
	} catch {
		return href;
	}
};

const isMete = (href: string) => host(href).endsWith('mete.fyi');

function contentLinks(html: string): Link[] {
	const links = new Map<string, Link>();
	for (const [, href, label] of html.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
		if (isMete(href) || links.has(href)) continue;
		links.set(href, { href, label: plain(label).trim() || host(href) });
	}
	return [...links.values()];
}

const unstyled = (html: string) => html.replace(/\sstyle="[^"]*"/gi, '');

const cleanContent = (html: string) => unstyled(html).replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');

function toImage(media: WPMedia | undefined, alt: string): Image | null {
	if (!media) return null;
	const sizes = media.media_details?.sizes;
	const thumb = media.mime_type === 'image/gif' ? media.source_url : (sizes?.medium_large ?? sizes?.large)?.source_url;
	return {
		src: media.source_url,
		thumb: thumb ?? media.source_url,
		alt: media.alt_text || alt,
		width: media.media_details?.width ?? 0,
		height: media.media_details?.height ?? 0
	};
}

function embedUrl(url: string): string | null {
	const youtube = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1];
	if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube}`;
	const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
	return vimeo ? `https://player.vimeo.com/video/${vimeo}` : null;
}

const postSlug = (url: string) => (isMete(url) ? url.match(/mete\.fyi\/([^/?#]+)/)?.[1] : undefined);

function toProject(card: WPCard, post: WPPost | undefined): Project {
	const title = plain(card.title.rendered);
	const external = card.meta?.link_esterno?.trim() || null;
	const video = external ? embedUrl(external) : null;
	const images = post ? contentImages(post.content.rendered) : [];
	const cover = toImage(card._embedded?.['wp:featuredmedia']?.[0], title) ?? toImage(post?._embedded?.['wp:featuredmedia']?.[0], title) ?? images[0] ?? null;
	const links = [...(external ? [{ href: external, label: host(external) }] : []), ...(post ? contentLinks(post.content.rendered) : [])];

	return {
		id: card.id,
		slug: card.slug,
		title: card.title.rendered,
		date: card.date,
		excerpt: card.content.rendered,
		content: cleanContent(post?.content.rendered ?? card.content.rendered),
		categories: (card._embedded?.['wp:term'] ?? [])
			.flat()
			.filter((t) => t.taxonomy === 'home-card-category')
			.map((t) => t.slug),
		cover,
		images: images.length ? images : cover ? [cover] : [],
		links: links.filter((link, i) => links.findIndex((l) => l.href === link.href) === i),
		externalUrl: null,
		video,
		detail: !!post || !!video
	};
}

export async function getProjects(fetch: Fetch): Promise<Project[]> {
	const [cards, posts] = await Promise.all([
		get<WPCard[]>(fetch, '/home-card?per_page=100&_embed=wp:featuredmedia,wp:term'),
		get<WPPost[]>(fetch, '/posts?per_page=100&_embed=wp:featuredmedia')
	]);
	const bySlug = new Map(posts.map((p) => [p.slug, p]));
	return cards.map((card) => toProject(card, bySlug.get(postSlug(card.meta?.link_interno ?? '') ?? '')));
}

const CATEGORY_ORDER = ['visual', 'video', 'curation', 'web', 'writing'];

export function categoriesOf(projects: Project[]): Category[] {
	const slugs = [...new Set(projects.flatMap((p) => p.categories))];
	slugs.sort((a, b) => (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99));
	return slugs.map((slug, id) => ({ id, slug, name: slug }));
}

export async function getPage(fetch: Fetch, slug: string): Promise<Page> {
	const [page] = await get<WPPage[]>(fetch, `/pages?slug=${slug}`);
	if (!page) error(404, 'Page not found');
	return { slug: page.slug, title: page.title.rendered, content: unstyled(page.content.rendered) };
}

export const projectHref = (p: Project) => resolve(`/projects/${p.slug}`);
