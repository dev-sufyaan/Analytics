export default function DashboardLoading() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#ebebeb] gap-4">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-[#f0f0f0] rounded animate-pulse" />
          <div className="h-8 w-48 bg-[#f0f0f0] rounded animate-pulse" />
        </div>
        <div className="h-9 w-44 bg-[#f0f0f0] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#ebebeb] rounded-[4px] p-6 md:p-8">
            <div className="h-3 w-24 bg-[#f0f0f0] rounded animate-pulse mb-4" />
            <div className="h-8 w-20 bg-[#f0f0f0] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#ebebeb] rounded-[4px] p-6">
        <div className="h-3 w-32 bg-[#f0f0f0] rounded animate-pulse mb-6" />
        <div className="h-[220px] bg-[#fafafa] rounded animate-pulse" />
      </div>
    </div>
  );
}
