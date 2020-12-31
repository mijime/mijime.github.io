interface Metadata {
  title: string
  description: string
  date: string
  tags: string[]
  draft: boolean
}

export function buildMetadataByFrontMatter(data: {
  [key: string]: any
}): Metadata {
  return {
    title: data.title || data.Title || '',
    description: data.description || data.Description || '',
    date: data.date || data.Date || new Date().toISOString(),
    tags: data.tags || data.Tags || [],
    draft: !!data.draft || !!data.Draft
  }
}
