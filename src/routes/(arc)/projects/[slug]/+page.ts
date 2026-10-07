import { error } from '@sveltejs/kit';
import { getProjects } from '$lib/wp';

export const entries = async () => (await getProjects(fetch)).filter((p) => p.detail).map(({ slug }) => ({ slug }));

export const load = async ({ parent, params }) => {
	const { projects } = await parent();
	const project = projects.find((p) => p.slug === params.slug);
	if (!project?.detail) error(404, 'Project not found');
	return { project };
};
