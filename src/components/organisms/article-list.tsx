import ArticleItem from '@/components/molecules/article-item'
import { Post } from '@/domains/entities/posts'

type ArticleListProps = {
  posts: Post[]
}

export default function ArticleList({ posts }: ArticleListProps) {
  return (
    <ul className="articles">
      {posts.map(post => (
        <li key={post.slug} className="block">
          <ArticleItem {...post} />
        </li>
      ))}
    </ul>
  )
}
