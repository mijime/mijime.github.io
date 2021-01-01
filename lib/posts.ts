import fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'
import { buildMetadataByFrontMatter } from '@/lib/markdown'

type ISODateFormat = string

export type PostData = {
  slug: string
  content: string
  title: string
  description: string
  tags: string[]
  date: ISODateFormat
  draft: boolean
}

export async function readdirRecursively(targetDir: string): Promise<string[]> {
  const dirents = await fs.promises.readdir(targetDir, { withFileTypes: true })
  const dirs = []
  const files = []
  for (const dirent of dirents) {
    if (dirent.isDirectory()) dirs.push(`${targetDir}/${dirent.name}`)
    if (dirent.isFile()) files.push(`${targetDir}/${dirent.name}`)
  }

  const filesByDir = await Promise.all(dirs.map(readdirRecursively))
  return Promise.resolve(files.concat(filesByDir.flat()))
}

function convertSlugFromFile(filename: string) {
  return filename
    .replace(/\.mdx?$/, '')
    .replace(/index$/, '')
    .replace(/\/$/, '')
    .replace(/^.*\/pages\/post\//, '')
}

function fetchPostFiles() {
  return readdirRecursively(path.resolve('pages/post/'))
}

async function fetchPostFromFile(filename: string): Promise<PostData> {
  const slug = convertSlugFromFile(filename)
  const rawContent = await fs.promises.readFile(filename, 'utf8')
  const { data, content } = matter(rawContent)

  const metadata = buildMetadataByFrontMatter(data)

  return {
    ...metadata,
    slug,
    content
  }
}

export async function fetchPostSlugs() {
  const filenames = await fetchPostFiles()
  return filenames
    .filter(filename => filename.endsWith('.md') || filename.endsWith('.mdx'))
    .map(convertSlugFromFile)
}

export function fetchPostBySlug(slug: string) {
  return fetchPostFromFile(path.resolve(`pages/post/${slug}/index.md`))
}

export async function fetchAllPosts() {
  const slugs = await fetchPostSlugs()
  const posts = await Promise.all(slugs.map(fetchPostBySlug))
  return posts.sort((curr, next) => (curr.date > next.date ? -1 : 1))
}

export async function fetchAllTags() {
  const slugs = await fetchPostSlugs()
  const posts = await Promise.all(slugs.map(fetchPostBySlug))

  const countByTagNames = posts
    .map(post => post.tags)
    .flat()
    .reduce((acc: Map<string, number>, tag: string) => {
      acc.set(
        tag,
        acc.get(tag) !== undefined ? (acc.get(tag) as number) + 1 : 1
      )
      return acc
    }, new Map<string, number>())

  return Array.from(countByTagNames.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((curr, next) => (curr.count > next.count ? -1 : 1))
}

export async function fetchPostsByTag(tagName: string) {
  const posts = await fetchAllPosts()
  return posts.filter(post => post.tags.includes(tagName))
}
