import ArticleItem from '@/components/molecules/article-item/'
import { Post } from '@/domains/entities/posts/'

type ArticleListProps = {
  posts: Post[]
}

export default function ArticleList({ posts }: ArticleListProps) {
  return (
    <ul>
      {posts.map(post => (
        <li key={post.slug} className="pb-4">
          <ArticleItem {...post} />
        </li>
      ))}
    </ul>
  )
}
