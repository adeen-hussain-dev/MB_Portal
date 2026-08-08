import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">Mustaqbil Bridge</p>
        <h1 className="mt-3 text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to manage volunteer tasks and team coordination.</p>

        <form className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block text-slate-300">Email</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-0"
              type="email"
              placeholder="volunteer@example.com"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-2 block text-slate-300">Password</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-0"
              type="password"
              placeholder="••••••••"
            />
          </label>

          <button className="w-full rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-400" type="submit">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Need access? Contact an admin through the bridge operations team.
        </p>

        <Link href="/" className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300">
          Back to home
        </Link>
      </div>
    </main>
  );
}
