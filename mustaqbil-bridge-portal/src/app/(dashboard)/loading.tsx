export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded-full bg-[#E6EDF5]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
        <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
        <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    </div>
  )
}