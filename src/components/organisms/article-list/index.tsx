import classnames from 'classnames'

import ArticleItem from '@/components/molecules/article-item/'
import { Post } from '@/domains/entities/posts/'
import styles from '@/styles/components/article-list/index.module.css'

type ArticleListProps = {
  posts: Post[]
}

export default function ArticleList({ posts }: ArticleListProps) {
  return (
    <ul>
      {posts.map(post => (
        <li key={post.slug} className={classnames(styles.articleItem)}>
          <ArticleItem {...post} />
        </li>
      ))}
    </ul>
  )
}
