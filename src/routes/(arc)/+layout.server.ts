import { categoriesOf, getPage, getProjects } from '$lib/wp';

export const load = async ({ fetch }) => {
	const [projects, about] = await Promise.all([getProjects(fetch), getPage(fetch, 'about')]);
	return { categories: categoriesOf(projects), projects, pages: { about } };
};
