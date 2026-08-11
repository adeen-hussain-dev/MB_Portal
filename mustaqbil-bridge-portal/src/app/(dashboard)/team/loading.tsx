export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-72 animate-pulse rounded-full bg-[#E6EDF5]" />
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <div className="h-52 animate-pulse rounded-[2rem] bg-white shadow-sm" />
        <div className="h-52 animate-pulse rounded-[2rem] bg-white shadow-sm" />
        <div className="h-52 animate-pulse rounded-[2rem] bg-white shadow-sm" />
      </div>
    </div>
  )
}