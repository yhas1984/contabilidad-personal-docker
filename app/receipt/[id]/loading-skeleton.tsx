export default function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-10 w-40 bg-gray-200 animate-pulse rounded"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <div className="h-6 w-40 mb-2 bg-gray-200 animate-pulse rounded"></div>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="h-5 w-full mb-2 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-5 w-full mb-2 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-5 w-full mb-2 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-5 w-full mb-2 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
        
        <div>
          <div className="h-6 w-40 mb-2 bg-gray-200 animate-pulse rounded"></div>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="h-5 w-full mb-2 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-5 w-full mb-2 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-5 w-full mb-2 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </div>
      
      <div className="h-6 w-40 mb-2 bg-gray-200 animate-pulse rounded"></div>
      <div className="h-40 w-full mb-8 bg-gray-200 animate-pulse rounded"></div>
      
      <div className="h-4 w-full mb-2 bg-gray-200 animate-pulse rounded"></div>
      <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded"></div>
    </div>
  )
}