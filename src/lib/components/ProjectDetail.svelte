<script lang="ts">
	import { fade } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { detail } from '$lib/nav.svelte';
	import type { Project } from '$lib/wp';

	let { project, closeHref }: { project: Project; closeHref: string } = $props();

	const links = $derived(project.links.filter((l) => l.href !== project.externalUrl));
	const month = $derived(project.date ? new Date(project.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null);

	let article: HTMLElement;
	const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

	function resize(kind: 'split' | 'width') {
		return (event: PointerEvent) => {
			const handle = event.currentTarget as HTMLElement;
			handle.setPointerCapture(event.pointerId);
			handle.classList.add('dragging');
			detail.resizing = true;

			const move = (e: PointerEvent) => {
				if (kind === 'split') {
					const box = article.getBoundingClientRect();
					detail.split = clamp((e.clientX - box.left) / box.width, 0.15, 0.85);
				} else {
					detail.width = clamp(2 * Math.abs(e.clientX - innerWidth / 2), innerWidth * 0.25, innerWidth * 0.98);
				}
			};
			const up = () => {
				detail.resizing = false;
				handle.classList.remove('dragging');
				handle.removeEventListener('pointermove', move);
				handle.removeEventListener('pointerup', up);
			};
			handle.addEventListener('pointermove', move);
			handle.addEventListener('pointerup', up);
		};
	}
</script>

<article bind:this={article} class="relative h-full w-(--open-width) flex-none py-(--stroke) max-sm:py-14" style="--split: {detail.split}">
	<a href={closeHref} class="absolute top-[calc(var(--stroke)+var(--pad))] right-[calc(var(--stroke)+var(--pad))] z-10 text-2xl leading-none max-sm:top-4 max-sm:right-auto max-sm:left-1/2 max-sm:-translate-x-1/2" aria-label="Close">×</a>

	{#key project.slug}
		<div class="detail grid h-full" in:fade={{ duration: 300 }}>
			<section class="panel archive" aria-label={project.externalUrl ? 'Website' : 'Images'}>
				{#if project.externalUrl}
					<iframe src={project.externalUrl} title={project.title} class="site h-full w-full border-0 bg-white" loading="lazy"></iframe>
				{:else}
					<div class="flex flex-col gap-(--pad) p-(--pad)">
						{#if project.video}
							<iframe src={project.video} title={project.title} class="aspect-video w-full border-0 bg-black" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen loading="lazy"></iframe>
						{/if}
						{#each project.images as image (image.src)}
							<img src={image.src} alt={image.alt} width={image.width || undefined} height={image.height || undefined} class="w-full" />
						{/each}
					</div>
				{/if}
			</section>

			<section class="panel info reading" aria-label="information">
				<div class="p-(--pad) pb-8">
					{#if month}
						<p>{month}</p>
					{/if}
					<h1 class="reading-title">{@html project.title}</h1>
					{#if project.categories.length}
						<ul class="mb-(--pad) flex flex-wrap gap-1.5">
							{#each project.categories as category (category)}
								<li><a href={resolve(`/projects/category/${category}`)} class="pill">{category}</a></li>
							{/each}
						</ul>
					{/if}
					{#if links.length || project.externalUrl}
						<ul class="mb-(--pad)">
							{#if project.externalUrl}
								<li><a href={project.externalUrl} target="_blank" rel="external noopener" class="link">Visit site</a></li>
							{/if}
							{#each links as link (link.href)}
								<li><a href={link.href} target="_blank" rel="external noopener" class="link">{link.label}</a></li>
							{/each}
						</ul>
					{/if}
					<div class="content">{@html project.content}</div>
				</div>
			</section>
		</div>
	{/key}

	<div class="handle" style="left: calc(var(--split) * 100%)" onpointerdown={resize('split')} role="separator" aria-label="Column size" aria-orientation="vertical"></div>
	<div class="handle edge start left-0" onpointerdown={resize('width')} role="separator" aria-label="Section width" aria-orientation="vertical"></div>
	<div class="handle edge end right-0" onpointerdown={resize('width')} role="separator" aria-label="Section width" aria-orientation="vertical"></div>
</article>

<style>
	.detail {
		grid-template-columns: minmax(0, calc(var(--split) * 100%)) minmax(0, 1fr);
	}

	.handle {
		position: absolute;
		top: 0;
		bottom: 0;
		z-index: 2;
		width: 22px;
		translate: -50% 0;
		cursor: col-resize;
		touch-action: none;
	}

	.handle.edge {
		translate: none;
	}

	.handle.start::after {
		left: 0;
		translate: none;
	}

	.handle.end::after {
		left: auto;
		right: 0;
		translate: none;
	}

	.handle::after {
		content: '';
		position: absolute;
		inset: 0 auto 0 50%;
		width: var(--stroke);
		background: black;
		translate: -50% 0;
		transition: width 150ms;
	}

	.handle:hover::after,
	.handle:global(.dragging)::after {
		width: calc(var(--stroke) * 1.75);
	}

	.panel {
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.archive {
		background: #d9d9d9;
	}

	.info {
		background: white;
	}



	.content :global(img),
	.content :global(figure) {
		display: none;
	}

	@media (max-width: 640px) {
		.handle {
			display: none;
		}

		.detail {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
			overflow-y: auto;
		}

		.detail .panel {
			overflow: visible;
		}

		.site {
			height: 75vh;
		}

		.detail .panel:first-child {
			order: 1;
		}
	}

</style>
