import { Post, Slug, Tag } from '@/domains/entities/posts'
import { PagerRequest } from '@/domains/repositories/'

export type FetchPostsResponse = {
  posts: Post[]
  count: number
}
export type FetchPostsByPageRequest = PagerRequest
export type FetchPostsByTagAndPageRequest = PagerRequest & { tag: Tag }

export interface PostsRepository {
  fetchPostBySlug(slug: Slug): Promise<Post>
  fetchPosts(): Promise<FetchPostsResponse>
  fetchPostsByPage(req: FetchPostsByPageRequest): Promise<FetchPostsResponse>
  fetchPostsByTag(tag: Tag): Promise<FetchPostsResponse>
  fetchPostsByTagAndPage(
    req: FetchPostsByTagAndPageRequest
  ): Promise<FetchPostsResponse>
  fetchSlugs(): Promise<{ slugs: Slug[]; count: number }>
  fetchTagCounts(): Promise<{
    tagCounts: { name: Tag; count: number }[]
    count: number
  }>
  fetchTagCountsByPage(
    req: PagerRequest
  ): Promise<{
    tagCounts: { name: Tag; count: number }[]
    count: number
  }>
}
