import { error } from '@sveltejs/kit';
import { categoriesOf, getProjects } from '$lib/wp';

export const entries = async () => categoriesOf(await getProjects(fetch)).map(({ slug }) => ({ category: slug }));

export const load = async ({ parent, params }) => {
	const { categories } = await parent();
	const category = categories.find((c) => c.slug === params.category);
	if (!category) error(404, 'Category not found');
	return { category };
};
