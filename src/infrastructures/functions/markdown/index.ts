interface Metadata {
  slug: string
  title: string
  description: string
  date: string
  tags: string[]
  draft: boolean
}

export function buildMetadataByFrontMatter(data: {
  [key: string]: any
}): Metadata {
  const originMetadata = {
    title: data.title || data.Title || '',
    description: data.description || data.Description || '',
    date: data.date || data.Date || new Date().toISOString(),
    tags: data.tags || data.Tags || [],
    draft: !!data.draft || !!data.Draft,
    slug:
      data.__resourcePath !== undefined
        ? data.__resourcePath.replace(/\/index\.mdx?$/, '')
        : ''
  }
  return {
    ...originMetadata,
    date: new Date(originMetadata.date).toISOString(),
    tags: originMetadata.tags.map((tag: string) => tag.toLowerCase())
  }
}