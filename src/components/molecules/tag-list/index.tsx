import classnames from 'classnames'
import Link from 'next/link'

import Tag from '@/components/atoms/tag/'
import { humanReadableDate } from '@/infrastructures/functions/date'
import styles from '@/styles/components/tag-list/index.module.css'

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
