export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-48 animate-pulse rounded-[2rem] bg-white shadow-sm" />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="h-80 animate-pulse rounded-[2rem] bg-white shadow-sm" />
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-[2rem] bg-white shadow-sm" />
          <div className="h-40 animate-pulse rounded-[2rem] bg-white shadow-sm" />
        </div>
      </div>
    </div>
  )
}