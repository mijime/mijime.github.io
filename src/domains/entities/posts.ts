export type ISODate = string
export type Tag = string
export type Slug = string
export type Post = {
  title: string
  description: string
  content: string
  slug: Slug
  tags: Tag[]
  date: ISODate
  draft: boolean
}
