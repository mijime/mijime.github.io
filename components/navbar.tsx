import { PropsWithChildren } from 'react'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/config'

function HeroTitle({ children }: PropsWithChildren<any>) {
  return (
    <section className="hero is-dark is-medium is-bold">
      <div className="hero-body">
        <div className="container has-text-centered">{children}</div>
      </div>
    </section>
  )
}

export default function Navbar() {
  return (
    <HeroTitle>
      <h1 className="title">
        <Link href="/">{SITE_NAME}</Link>
      </h1>
    </HeroTitle>
  )
}
