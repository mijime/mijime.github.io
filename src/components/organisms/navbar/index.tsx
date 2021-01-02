import { PropsWithChildren } from 'react'
import Link from 'next/link'

function HeroTitle({ children }: PropsWithChildren<any>) {
  return (
    <section className="hero is-dark is-medium is-bold">
      <div className="hero-body">
        <div className="container has-text-centered">{children}</div>
      </div>
    </section>
  )
}
export type NavbarProps = {
  siteName: string
}

export default function Navbar({ siteName }: NavbarProps) {
  return (
    <HeroTitle>
      <h1 className="title font-serif">
        <Link href="/">{siteName}</Link>
      </h1>
    </HeroTitle>
  )
}
