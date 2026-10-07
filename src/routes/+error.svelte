<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const missing = $derived(page.status === 404);
</script>

<svelte:head><title>{page.status} · MeTe</title></svelte:head>

<section class="reading grid h-dvh place-items-center bg-[#dddddd] p-(--pad) text-center">
	<div>
		<h1 class="reading-title">{page.status}</h1>
		<p class="mb-(--pad)">{missing ? 'This mèta does not exist.' : page.error?.message}</p>
		<a href={resolve('/')} class="pill">Back</a>
	</div>
</section>
