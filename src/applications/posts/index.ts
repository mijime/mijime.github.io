import { MarkdownPostsRepository } from '@/infrastructures/repositories/markdown-posts/'
import { PostsUsecase } from '@/usecases/posts/'

export const PostsApp: PostsUsecase = new MarkdownPostsRepository()
