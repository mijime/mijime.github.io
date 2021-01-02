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
    <button className="button">
      <Link href={`${githubURL}/${filepath}`}>
        {children !== undefined ? children : 'Edit'}
      </Link>
    </button>
  )
}
