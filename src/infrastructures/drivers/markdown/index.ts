import fs from 'fs'

import matter from 'gray-matter'

import { readdirRecursively } from '@/infrastructures/functions/filer/'

export type MarkdownContent = {
  data: { [key: string]: string }
  content: string
}

export type MarkdownFileContent = MarkdownContent & { filepath: string }

export const fetchMarkdownPaths = async function fetchMarkdownPaths(
  targetDir: string
) {
  const filepaths = await readdirRecursively(targetDir)
  return filepaths.filter(
    filepath => filepath.endsWith('.md') || filepath.endsWith('.mdx')
  )
}

export const fetchMarkdowns = async function fetchMarkdowns(
  targetDir: string
): Promise<MarkdownFileContent[]> {
  const filepaths = await fetchMarkdownPaths(targetDir)
  return Promise.all(filepaths.map(fetchMarkdownFromFile))
}

export const fetchMarkdownFromFile = async function fetchMarkdownFromFile(
  filepath: string
) {
  const rawContent = await fs.promises.readFile(filepath, 'utf8')
  const { data, content } = matter(rawContent)

  return {
    filepath,
    data,
    content
  }
}
