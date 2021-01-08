import GithubEditButton from '.'

export default {
  title: 'GithubEditButton',
  component: GithubEditButton
}

const defaultProps = {
  githubURL: 'https://github.com/mijime/mijime.github.io/edit/master',
  filepath: 'README.md'
}

export const Default = () => <GithubEditButton {...defaultProps} />

export const CustomText = () => (
  <GithubEditButton {...defaultProps}>Custom text</GithubEditButton>
)
