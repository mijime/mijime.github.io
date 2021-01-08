interface Metadata {
  slug: string
  title: string
  description: string
  createdAt: string
  tags: string[]
  draft: boolean
}

export const buildMetadataByFrontMatter = function buildMetadataByFrontMatter(data: {
  [key: string]: any
}): Metadata {
  const originMetadata = {
    title: data.title || data.Title || '',
    description: data.description || data.Description || '',
    createdAt: data.createdAt || data.CreatedAt || new Date().toISOString(),
    tags: data.tags || data.Tags || [],
    draft: Boolean(data.draft) || Boolean(data.Draft),
    slug: data.__resourcePath
      ? data.__resourcePath.replace(/\/index\.mdx?$/u, '')
      : ''
  }
  return {
    ...originMetadata,
    createdAt: new Date(originMetadata.createdAt).toISOString(),
    tags: originMetadata.tags.map((tag: string) => tag.toLowerCase())
  }
}
