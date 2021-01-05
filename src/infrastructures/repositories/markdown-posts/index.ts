import * as path from 'path'
import { Post, Slug, Tag } from '@/domains/entities/posts/'
import { PagerRequest } from '@/domains/repositories/'
import {
  PostsRepository,
  FetchPostsByTagAndPageRequest
} from '@/domains/repositories/posts/'
import {
  MarkdownFileContent,
  fetchMarkdownFromFile,
  fetchMarkdowns
} from '@/infrastructures/drivers/markdown/'
import { buildMetadataByFrontMatter } from '@/infrastructures/functions/markdown/'

export class MarkdownPostsRepository implements PostsRepository {
  private convertPostFromMarkdown({
    filepath,
    data,
    content
  }: MarkdownFileContent): Post {
    const slug = this.convertSlugFromFile(filepath)
    const metadata = buildMetadataByFrontMatter(data)
    const description =
      metadata.description === undefined || metadata.description.length === 0
        ? content.slice(0, 100)
        : metadata.description

    return {
      ...metadata,
      slug,
      description
    }
  }

  private convertSlugFromFile(filepath: string) {
    return filepath
      .replace(/\.mdx?$/, '')
      .replace(/index$/, '')
      .replace(/\/$/, '')
      .replace(/^.*\/pages\//, '')
  }

  async fetchPostBySlug(slug: Slug) {
    const md = await fetchMarkdownFromFile(
      path.resolve(`pages/${slug}/index.md`)
    )
    return this.convertPostFromMarkdown(md)
  }

  async fetchPosts() {
    const posts = (await fetchMarkdowns(path.resolve('pages/post/'))).map(
      this.convertPostFromMarkdown.bind(this)
    )
    const sortedPosts = posts.sort((curr, next) =>
      curr.date > next.date ? -1 : 1
    )
    return { posts: sortedPosts, count: posts.length }
  }

  async fetchPostsByPage({ page, pageSize }: PagerRequest) {
    const { posts, count } = await this.fetchPosts()
    const offsetPosts = posts.slice((page - 1) * pageSize, page * pageSize)
    return {
      posts: offsetPosts,
      count
    }
  }

  async fetchPostsByTag(tag: Tag) {
    const { posts } = await this.fetchPosts()
    const filteredPosts = posts.filter(post => post.tags.includes(tag))
    return {
      posts: filteredPosts,
      count: filteredPosts.length
    }
  }

  async fetchPostsByTagAndPage({
    tag,
    page,
    pageSize
  }: FetchPostsByTagAndPageRequest) {
    const { posts, count } = await this.fetchPostsByTag(tag)
    const offsetPosts = posts.slice((page - 1) * pageSize, page * pageSize)
    return {
      posts: offsetPosts,
      count
    }
  }

  async fetchSlugs() {
    const { posts, count } = await this.fetchPosts()
    const slugs = posts.map(post => post.slug)
    return { slugs, count }
  }

  async fetchTagCounts() {
    const { posts } = await this.fetchPosts()

    const countByTagNames = posts
      .map(post => post.tags)
      .flat()
      .reduce((acc, tag) => {
        acc.set(
          tag,
          acc.get(tag) !== undefined ? (acc.get(tag) as number) + 1 : 1
        )
        return acc
      }, new Map<Tag, number>())

    const tagCounts = Array.from(countByTagNames.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((curr, next) =>
        curr.count !== next.count
          ? curr.count > next.count
            ? -1
            : 1
          : curr.name < next.name
          ? -1
          : 1
      )
    return {
      tagCounts,
      count: tagCounts.length
    }
  }

  async fetchTagCountsByPage({ page, pageSize }: PagerRequest) {
    const { tagCounts, count } = await this.fetchTagCounts()
    const offsetTagCounts = tagCounts.slice(
      (page - 1) * pageSize,
      page * pageSize
    )
    return {
      tagCounts: offsetTagCounts,
      count
    }
  }
}
