import { error } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { HOME_PAGE_SLUG, WP_API } from '$lib/config';
import { decode, plain } from '$lib/text';

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
	media_details?: { width: number; height: number; sizes?: Record<string, { source_url: string }> };
};
type WPPost = {
	id: number;
	slug: string;
	date: string;
	title: WPRendered;
	excerpt: WPRendered;
	content: WPRendered;
	meta?: { external_url?: string };
	_embedded?: {
		'wp:featuredmedia'?: WPMedia[];
	};
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

function contentLinks(html: string): Link[] {
	const links = new Map<string, Link>();
	for (const [, href, label] of html.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
		if (new URL(href).hostname.endsWith('mete.fyi') || links.has(href)) continue;
		links.set(href, { href, label: plain(label).trim() || new URL(href).hostname });
	}
	return [...links.values()];
}

const unstyled = (html: string) => html.replace(/\sstyle="[^"]*"/gi, '');

const cleanContent = (html: string) => unstyled(html).replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');

function toProject(post: WPPost): Project {
	const media = post._embedded?.['wp:featuredmedia']?.[0];
	const images = contentImages(post.content.rendered);

	return {
		id: post.id,
		slug: post.slug,
		title: post.title.rendered,
		date: post.date,
		excerpt: post.excerpt.rendered,
		content: cleanContent(post.content.rendered),
		categories: [],
		cover: media
			? {
					src: media.source_url,
					thumb: media.media_details?.sizes?.medium_large?.source_url ?? media.source_url,
					alt: media.alt_text,
					width: media.media_details?.width ?? 0,
					height: media.media_details?.height ?? 0
				}
			: (images[0] ?? null),
		images,
		links: contentLinks(post.content.rendered),
		externalUrl: post.meta?.external_url || null,
		video: null,
		detail: true
	};
}

const POST_QUERY = '_embed=wp:featuredmedia&per_page=100';

type GalleryItem = {
	premium_gallery_img_name: string;
	premium_gallery_img_desc?: string;
	premium_gallery_img_category?: string;
	premium_gallery_img?: { url?: string; id?: number };
	premium_gallery_img_link?: { url?: string } | null;
	premium_gallery_img_existing?: string | number | null;
	premium_gallery_video?: string | null;
	premium_gallery_video_url?: string | null;
};

// the homepage's Elementor gallery is the full portfolio: order, categories, and projects that have no post
async function getGallery(fetch: Fetch): Promise<GalleryItem[]> {
	const [page] = await get<WPPage[]>(fetch, `/pages?slug=${HOME_PAGE_SLUG}`);
	const settings = page?.content.rendered.match(/data-settings="([^"]*premium_gallery_img_name[^"]*)"/)?.[1];
	return settings ? JSON.parse(decode(settings)).premium_gallery_img_content ?? [] : [];
}

type GalleryMedia = { thumb: string | null; width: number; height: number };

async function galleryMedia(fetch: Fetch, gallery: GalleryItem[]): Promise<Map<number, GalleryMedia>> {
	const ids = gallery.map((item) => item.premium_gallery_img?.id).filter((id): id is number => !!id);
	if (!ids.length) return new Map();
	const media = await get<(WPMedia & { id: number; mime_type: string })[]>(
		fetch,
		`/media?include=${ids.join(',')}&per_page=100&_fields=id,source_url,mime_type,media_details`
	);
	return new Map(
		media.map((m) => [
			m.id,
			{
				thumb:
					m.mime_type === 'image/gif'
						? null
						: (m.media_details?.sizes?.medium_large?.source_url ?? m.media_details?.sizes?.large?.source_url ?? m.source_url),
				width: m.media_details?.width ?? 0,
				height: m.media_details?.height ?? 0
			}
		])
	);
}

function embedUrl(url: string): string | null {
	const youtube = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1];
	if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube}`;
	const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
	return vimeo ? `https://player.vimeo.com/video/${vimeo}` : null;
}

const slugify = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

function fromGallery(item: GalleryItem, index: number, post: Project | undefined, media: Map<number, GalleryMedia>): Project {
	const name = item.premium_gallery_img_name;
	const titleHtml = name.match(/<b>([\s\S]*?)<\/b>/i)?.[1] ?? name;
	const title = plain(titleHtml.replace(/<br\s*\/?>/gi, ' ')).replace(/\s+/g, ' ').trim();
	const subtitle = plain(name.replace(titleHtml, '').replace(/<br\s*\/?>/gi, ' ')).replace(/\s+/g, ' ').trim();
	const categories = (item.premium_gallery_img_category ?? '').split(',').map((c) => slugify(c)).filter(Boolean);
	const src = item.premium_gallery_img?.url;
	const file = media.get(item.premium_gallery_img?.id ?? 0);
	const cover = src ? { src, thumb: file?.thumb ?? src, alt: title, width: file?.width ?? 0, height: file?.height ?? 0 } : null;

	const videoUrl = (item.premium_gallery_video === 'true' && item.premium_gallery_video_url) || '';
	const video = videoUrl ? embedUrl(videoUrl) : null;

	if (post) return { ...post, categories, cover: cover ?? post.cover, video };

	const url = item.premium_gallery_img_link?.url ?? '';
	const external = /^https?:\/\//.test(url) && !new URL(url).hostname.endsWith('mete.fyi') ? url : null;
	const role = item.premium_gallery_img_desc ?? '';
	return {
		id: -(index + 1),
		slug: slugify(title),
		title,
		date: null,
		excerpt: subtitle,
		content: [subtitle, role].filter(Boolean).map((t) => `<p>${t}</p>`).join(''),
		categories,
		cover,
		images: cover ? [cover] : [],
		links: [external, videoUrl]
			.filter((href): href is string => !!href)
			.map((href) => ({ href, label: new URL(href).hostname.replace(/^www\./, '') })),
		externalUrl: external,
		video,
		detail: !!video
	};
}

export async function getProjects(fetch: Fetch): Promise<Project[]> {
	const [posts, gallery] = await Promise.all([get<WPPost[]>(fetch, `/posts?${POST_QUERY}`).then((p) => p.map(toProject)), getGallery(fetch)]);
	const media = await galleryMedia(fetch, gallery);
	const byId = new Map(posts.map((p) => [p.id, p]));
	const bySlug = new Map(posts.map((p) => [p.slug, p]));
	const used = new Set<number>();
	const slugs = new Set<string>();

	const projects = gallery.map((item, i) => {
		const url = item.premium_gallery_img_link?.url ?? '';
		const postSlug = url.match(/mete\.fyi\/([^/?#]+)/)?.[1];
		const post = byId.get(Number(item.premium_gallery_img_existing)) ?? (postSlug ? bySlug.get(postSlug) : undefined);
		if (post) used.add(post.id);
		const project = fromGallery(item, i, post, media);
		let slug = project.slug;
		for (let n = 2; slugs.has(slug); n++) slug = `${project.slug}-${n}`;
		slugs.add(slug);
		return { ...project, slug };
	});

	return [...projects, ...posts.filter((p) => !used.has(p.id) && !slugs.has(p.slug))];
}

const CATEGORY_ORDER = ['visual', 'video', 'curation', 'web'];

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
