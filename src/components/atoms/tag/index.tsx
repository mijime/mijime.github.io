import classnames from 'classnames'
import { PropsWithChildren } from 'react'

import styles from '@/styles/components/tag/index.module.css'

export type TagProps = {
  className?: string
}

export default function Tag({
  className,
  children
}: PropsWithChildren<TagProps>) {
  return <span className={classnames(styles.tag, className)}>{children}</span>
}
