import classnames from 'classnames'
import Link from 'next/link'

import Card from '@/components/atoms/card/'
import Draft from '@/components/atoms/draft/'
import TagList from '@/components/molecules/tag-list/'
import styles from '@/styles/components/article-item/index.module.css'

export type ArticleItemProps = {
  title: string
  slug: string
  createdAt: string
  tags: string[]
  draft: boolean
}

export default function ArticleItem({
  title,
  slug,
  createdAt,
  tags = [],
  draft
}: ArticleItemProps) {
  return (
    <Card>
      <h4 className={classnames(styles.title)}>
        {draft ? <Draft /> : <></>}
        <Link href={`/post/${slug}`}>{title}</Link>
      </h4>
      <TagList tags={tags} createdAt={createdAt} />
    </Card>
  )
}
