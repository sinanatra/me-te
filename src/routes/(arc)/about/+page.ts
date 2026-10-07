export const load = async ({ parent }) => ({
	page: (await parent()).pages.about
});
