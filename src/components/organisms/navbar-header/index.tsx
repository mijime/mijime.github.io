import classnames from 'classnames'

import styles from '@/styles/components/navbar-header/index.module.css'

export default function NavbarHeader({ children }: { children: any }) {
  return (
    <section className={classnames(styles.navbarHeader)}>
      <h3 className={classnames(styles.navbarHeaderTitle)}>{children}</h3>
    </section>
  )
}
