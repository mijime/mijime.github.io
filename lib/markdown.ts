// eslint-disable-next-line no-unused-vars
export function buildMetadataByFrontMatter(data: { [key in string]: any }) {
  return {
    title: data.title || data.Title || '',
    description: data.description || data.Description || '',
    date: data.date || data.Date || new Date(),
    tags: data.tags || data.Tags || [],
    draft: !!data.draft || !!data.Draft
  }
}
