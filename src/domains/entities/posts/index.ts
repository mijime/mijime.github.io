export type ISODate = string
export type Tag = string
export type Slug = string
export type Post = {
  title: string
  description: string
  slug: Slug
  tags: Tag[]
  createdAt: ISODate
  draft: boolean
  content: string
}
