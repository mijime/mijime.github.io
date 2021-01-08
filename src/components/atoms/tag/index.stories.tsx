import classnames from 'classnames'

import Tag from '.'

export default {
  title: 'Tag',
  component: Tag
}

export const Default = () => <Tag>Default Tag</Tag>

export const CustomClassNames = () => (
  <Tag className={classnames('border-red-200', 'bg-red-100', 'text-red-400')}>
    Custom ClassNames
  </Tag>
)
