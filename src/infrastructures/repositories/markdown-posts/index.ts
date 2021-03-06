import * as path from 'path'

import { Post, Slug, Tag } from '@/domains/entities/posts/'
import { PagerRequest } from '@/domains/repositories/'
import {
  FetchPostsByTagAndPageRequest,
  PostsRepository
} from '@/domains/repositories/posts/'
import {
  MarkdownFileContent,
  fetchMarkdownFromFile,
  fetchMarkdowns
} from '@/infrastructures/drivers/markdown/'
import { buildMetadataByFrontMatter } from '@/infrastructures/functions/markdown/'

const convertSlugFromFile = function convertSlugFromFile(filepath: string) {
  return filepath
    .replace(/\.mdx?$/u, '')
    .replace(/index$/u, '')
    .replace(/\/$/u, '')
    .replace(/^.*\/contents\//u, '')
}

const convertPostFromMarkdown = function convertPostFromMarkdown({
  filepath,
  data,
  content
}: MarkdownFileContent): Post {
  const slug = convertSlugFromFile(filepath)
  const metadata = buildMetadataByFrontMatter(data)
  const description =
    !metadata.description || metadata.description.length === 0
      ? content.slice(0, 100)
      : metadata.description

  return {
    ...metadata,
    slug,
    description,
    content
  }
}

export class MarkdownPostsRepository implements PostsRepository {
  private isProduction: boolean

  constructor({ isProduction }: { isProduction: boolean }) {
    this.isProduction = isProduction
  }

  async fetchPostBySlug(slug: Slug) {
    const md = await fetchMarkdownFromFile(
      path.resolve(`contents/${slug}/index.md`)
    )
    return convertPostFromMarkdown(md)
  }

  async fetchPosts() {
    const posts = (await fetchMarkdowns(path.resolve('contents/')))
      .map(convertPostFromMarkdown)
      .filter(post => !this.isProduction || !post.draft)
    const sortedPosts = posts.sort((curr, next) =>
      curr.createdAt > next.createdAt ? -1 : 1
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
        acc.set(tag, acc.get(tag) ? (acc.get(tag) as number) + 1 : 1)
        return acc
      }, new Map<Tag, number>())

    const tagCounts = Array.from(countByTagNames.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((curr, next) => (curr.name < next.name ? -1 : 1))
      .sort((curr, next) => (curr.count > next.count ? -1 : 1))
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
