import { PropsWithChildren } from 'react'
import Link from 'next/link'

export type GithubEditButtonProps = {
  githubURL: string
  filepath: string
}

export default function GithubEditButton({
  githubURL,
  filepath,
  children
}: PropsWithChildren<GithubEditButtonProps>) {
  return (
    <button className="border-2 bg-gray-100 border-gray-200 text-gray-600 px-2 py-1 rounded-xl">
      <Link href={`${githubURL}/${filepath}`}>
        {children !== undefined ? children : 'Edit'}
      </Link>
    </button>
  )
}
