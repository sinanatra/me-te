import { getProjects } from '$lib/wp';

export const load = async ({ fetch }) => ({
	projects: await getProjects(fetch)
});
