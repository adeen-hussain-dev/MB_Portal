export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-80 animate-pulse rounded-full bg-[#E6EDF5]" />
      <div className="h-48 animate-pulse rounded-[2rem] bg-white shadow-sm" />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-[2rem] bg-white shadow-sm" />
          <div className="h-32 animate-pulse rounded-[2rem] bg-white shadow-sm" />
          <div className="h-32 animate-pulse rounded-[2rem] bg-white shadow-sm" />
        </div>
        <div className="h-64 animate-pulse rounded-[2rem] bg-white shadow-sm" />
      </div>
    </div>
  )
}