export default function NavbarHeader({ children }: { children: any }) {
  return (
    <section className="bg-gray-600 py-8 md:py-32 text-center">
      <h3 className="text-gray-100 md:text-2xl font-serif">{children}</h3>
    </section>
  )
}
