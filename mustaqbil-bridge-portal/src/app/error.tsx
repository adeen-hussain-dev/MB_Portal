'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 text-[#101828]">
      <div className="w-full max-w-lg rounded-[2rem] border border-[#D8E0EA] bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-[#64748B]">The page could not be loaded. Please try again.</p>
        <p className="mt-4 rounded-xl bg-[#F5F7FA] px-4 py-3 text-left text-xs text-[#DC2626]">{error.message}</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-[#0F3F7F] px-4 py-2.5 font-semibold text-white">
          Try again
        </button>
      </div>
    </main>
  )
}