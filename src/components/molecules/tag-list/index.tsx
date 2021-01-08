import classnames from 'classnames'
import Link from 'next/link'

import styles from './index.module.css'

import Tag from '@/components/atoms/tag/'
import { humanReadableDate } from '@/infrastructures/functions/date'

type TagListProps = {
  tags: string[]
  createdAt: string
}

export default function TagList({ tags, createdAt }: TagListProps) {
  return (
    <div className={classnames(styles.tagList)}>
      {tags.map((tag: string) => (
        <Tag key={tag} className={classnames(styles.tagLink)}>
          <Link href={`/tag/${tag}/posts/1/`}>{tag}</Link>
        </Tag>
      ))}
      <Tag className={classnames(styles.tagDate)}>
        {humanReadableDate(new Date(createdAt))}
      </Tag>
    </div>
  )
}
