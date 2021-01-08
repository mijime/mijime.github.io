import classnames from 'classnames'
import Link from 'next/link'
import { PropsWithChildren } from 'react'

import styles from './index.module.css'

import Card from '@/components/atoms/card/'
import TagList from '@/components/molecules/tag-list/'

type ArticleCardProps = {
  slug: string
  title: string
  date: string
  tags: string[]
}

export default function ArticleCard({
  slug,
  title,
  date,
  tags = [],
  children
}: PropsWithChildren<ArticleCardProps>) {
  return (
    <Card>
      <h1 className={classnames(styles.title)}>
        <Link href={`/${slug}/`}>{title}</Link>
      </h1>
      <TagList tags={tags} date={date} />
      <div className={classnames(styles.content)}>{children}</div>
    </Card>
  )
}
