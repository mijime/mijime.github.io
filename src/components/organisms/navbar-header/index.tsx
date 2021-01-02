export default function NavbarHeader({ children }: { children: any }) {
  return (
    <section className="bg-gray-800 py-8 text-center">
      <h3 className="text-gray-200 text-2xl font-serif">{children}</h3>
    </section>
  )
}
