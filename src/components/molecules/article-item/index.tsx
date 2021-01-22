import classnames from 'classnames'
import Link from 'next/link'

import Card from '@/components/atoms/card/'
import TagList from '@/components/molecules/tag-list/'
import styles from '@/styles/components/article-item/index.module.css'

const Draft = function Draft() {
  return <span className={classnames(styles.draft)}>WIP</span>
}

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
        <Link href={`/${slug}`}>{title}</Link>
      </h4>
      <TagList tags={tags} createdAt={createdAt} />
    </Card>
  )
}
