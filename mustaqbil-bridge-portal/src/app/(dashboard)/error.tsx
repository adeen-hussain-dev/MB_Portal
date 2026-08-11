'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-[2rem] border border-[#D8E0EA] bg-white p-8 shadow-sm">
      <h1 className="font-heading text-2xl font-semibold text-[#101828]">Could not load dashboard data</h1>
      <p className="mt-3 text-sm text-[#64748B]">The portal data request failed. You can retry loading this section.</p>
      <p className="mt-4 rounded-xl bg-[#F5F7FA] px-4 py-3 text-sm text-[#DC2626]">{error.message}</p>
      <button onClick={reset} className="mt-6 rounded-xl bg-[#0F3F7F] px-4 py-2.5 font-semibold text-white">
        Retry
      </button>
    </div>
  )
}