import fs from 'fs'

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
