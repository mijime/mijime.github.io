import classnames from 'classnames'
import Link from 'next/link'

import styles from './index.module.css'

import Card from '@/components/atoms/card/'
import TagList from '@/components/molecules/tag-list/'

export type ArticleItemProps = {
  title: string
  slug: string
  date: string
  tags: string[]
}

export default function ArticleItem({
  title,
  slug,
  date,
  tags = []
}: ArticleItemProps) {
  return (
    <Card>
      <h4 className={classnames(styles.title)}>
        <Link href={`/${slug}`}>{title}</Link>
      </h4>
      <TagList tags={tags} date={date} />
    </Card>
  )
}
