import ArticleCard from '.'

export default {
  title: 'ArticleCard',
  component: ArticleCard
}

const defaultProps = {
  slug: '',
  title: 'title',
  date: '2020-01-01T00:00:00.000Z',
  tags: []
}

export const Default = () => (
  <ArticleCard {...defaultProps}>Default ArticleCard</ArticleCard>
)

export const AddTags = () => (
  <ArticleCard {...{ ...defaultProps, tags: ['a', 'b'] }}>
    Default ArticleCard
  </ArticleCard>
)
