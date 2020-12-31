import ArticleListItem from '@/components/article-list-item'
import { PostData } from '@/lib/posts'

type ArticleListProps = {
  posts: PostData[]
}

export default function ArticleList({ posts }: ArticleListProps) {
  return (
    <div className="articles">
      {posts.map(post => (
        <ArticleListItem key={post.slug} {...post} />
      ))}
    </div>
  )
}
