import Link from 'next/link';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/team', label: 'Team' },
  { href: '/login', label: 'Login' },
];

export function Sidebar() {
  return (
    <aside className="w-72 border-r border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Mustaqbil</p>
        <h2 className="mt-2 text-xl font-semibold">Bridge Portal</h2>
      </div>

      <nav className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-cyan-400"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
