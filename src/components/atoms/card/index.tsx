import classnames from 'classnames'

import styles from '@/styles/components/card/index.module.css'

export default function Card({ children }: { children: any }) {
  return <div className={classnames(styles.card)}>{children}</div>
}
