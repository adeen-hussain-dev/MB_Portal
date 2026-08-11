export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-6 text-[#101828]">
      <div className="w-full max-w-md rounded-[2rem] border border-[#D8E0EA] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-10 w-40 animate-pulse rounded-full bg-[#E6EDF5]" />
        <div className="mt-8 space-y-3">
          <div className="h-4 rounded-full bg-[#E6EDF5]" />
          <div className="h-4 w-5/6 rounded-full bg-[#E6EDF5]" />
          <div className="h-4 w-2/3 rounded-full bg-[#E6EDF5]" />
        </div>
      </div>
    </main>
  )
}