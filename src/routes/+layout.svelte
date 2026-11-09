<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import font from '$lib/assets/fonts/ABCArealSemiMonoVariable.ttf?url';
	import { LOGO } from '$lib/config';
	import './layout.css';

	let { children } = $props();

	onMount(() => {
		console.log('Website designed and developed by Giacomo Nanni');
		console.log('https://giacomo.website');
	});
</script>

<svelte:head>
	<link rel="preload" href={font} as="font" type="font/ttf" crossorigin="anonymous" />
</svelte:head>

<a href={resolve('/')} class="logo"><img src={LOGO} alt="MeTe" width="768" height="432" /></a>

<main>
	{@render children()}
</main>

<footer class="text-sm">
	<nav aria-label="Main">
		<a href={resolve('/about')} class="fixed bottom-(--pad) left-(--pad) z-2000 flex h-(--bar) items-center text-base leading-none">About</a>
	</nav>
</footer>
