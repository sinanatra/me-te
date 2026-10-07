<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ArcCarousel from '$lib/components/ArcCarousel.svelte';
	import CategoryNav from '$lib/components/CategoryNav.svelte';
	import PageDetail from '$lib/components/PageDetail.svelte';
	import ProjectDetail from '$lib/components/ProjectDetail.svelte';
	import { nav } from '$lib/nav.svelte';
	import type { Page, Project } from '$lib/wp';

	let { data, children } = $props();

	const slug = $derived(page.params.slug ?? null);
	const sitePage = $derived((page.data.page as Page | undefined) ?? null);
	const open = $derived(!!slug || !!sitePage);
	let category = $state<string | null>(null);
	let shown = $state<{ project: Project } | { page: Page } | null>(null);

	$effect(() => {
		if (slug) {
			const project = data.projects.find((p) => p.slug === slug);
			if (project) shown = { project };
			return;
		}
		if (sitePage) {
			shown = { page: sitePage };
			return;
		}
		category = page.params.category ?? null;
		nav.list = page.url.pathname;
	});

	const projects = $derived(
		category ? data.projects.filter((p) => p.categories.includes(category!)) : data.projects
	);

	const shownProject = $derived(shown && 'project' in shown ? shown.project : null);

	const close = () => goto(nav.list, { noScroll: true, keepFocus: true });

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) close();
	}
</script>

<svelte:window {onkeydown} />

<ArcCarousel
	{projects}
	current={slug}
	{open}
	onnavigate={(p) => goto(resolve(`/projects/${p.slug}`), { replaceState: true, noScroll: true, keepFocus: true })}
	onclose={close}
>
	{#if shown && 'page' in shown}
		<PageDetail page={shown.page} closeHref={nav.list} />
	{:else if shownProject}
		<ProjectDetail project={shownProject} closeHref={nav.list} />
	{/if}
</ArcCarousel>
{#if !open}
	<CategoryNav categories={data.categories} />
{/if}
{@render children()}
