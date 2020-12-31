export function buildMetadataByFrontMatter(data: { [key: string]: any }) {
  return {
    title: data.title || data.Title || '',
    description: data.description || data.Description || '',
    date: data.date || data.Date || new Date(),
    tags: data.tags || data.Tags || [],
    draft: !!data.draft || !!data.Draft
  }
}
