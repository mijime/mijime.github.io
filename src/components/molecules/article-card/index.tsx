import classnames from 'classnames'
import Link from 'next/link'
import { PropsWithChildren } from 'react'

import Card from '@/components/atoms/card/'
import Draft from '@/components/atoms/draft/'
import TagList from '@/components/molecules/tag-list/'
import styles from '@/styles/components/article-card/index.module.css'

type ArticleCardProps = {
  slug: string
  title: string
  createdAt: string
  tags: string[]
  draft: boolean
}

export default function ArticleCard({
  slug,
  title,
  createdAt,
  tags = [],
  draft,
  children
}: PropsWithChildren<ArticleCardProps>) {
  return (
    <Card>
      <h1 className={classnames(styles.title)}>
        {draft ? <Draft /> : <></>}
        <Link href={`/post/${slug}/`}>{title}</Link>
      </h1>
      <TagList tags={tags} createdAt={createdAt} />
      <div className={classnames(styles.content)}>{children}</div>
    </Card>
  )
}
