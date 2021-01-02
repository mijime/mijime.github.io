import { PostsUsecase } from '@/usecases/posts'
import { MarkdownPostsRepository } from '@/infrastructures/repositories/markdown-posts'

export const PostsApp: PostsUsecase = new MarkdownPostsRepository()
