import classnames from 'classnames'
import Link from 'next/link'
import { PropsWithChildren } from 'react'

import styles from '@/styles/components/github-edit-button/index.module.css'

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
    <button className={classnames(styles.githubButton)}>
      <Link href={`${githubURL}/${filepath}`}>{children || 'Edit'}</Link>
    </button>
  )
}
