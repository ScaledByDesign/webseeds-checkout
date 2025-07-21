import Image from 'next/image'

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white py-6 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <Image src="/assets/images/Logo.svg" alt="Fitspresso Logo" width={140} height={40} style={{ width: 'auto', height: 'auto' }} priority />
          <p className="text-gray-600 font-medium">Order #2334453</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Thank You Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-green-500 rounded-full p-2">
              <Image src="/assets/images/circle-check.svg" alt="Success" width={24} height={24} className="filter brightness-0 invert" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Thank you John!</h1>
              <p className="text-gray-600">Your order is confirmed.</p>
            </div>
          </div>

          {/* Video Section */}
          <div className="relative mb-8">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src="/assets/images/thumbnail.webp"
                alt="Video thumbnail"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-lg transform hover:scale-105 transition-transform">
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
              <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded text-sm font-medium">
                Click To Play ↗
              </div>
            </div>
            <div className="bg-red-600 text-white text-center py-3 text-lg font-bold">
              AN IMPORTANT MESSAGE
            </div>
            <div className="bg-gray-600 text-white text-center py-2 text-base">
              From Kristi Before You Start Taking Fitspresso
            </div>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Customer */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer</h3>
            <div className="space-y-2 text-gray-600">
              <p>Lav Dev Awasthi</p>
              <p>melavdev423@gmail.com</p>
              <p>888 821 2688</p>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipping</h3>
            <div className="space-y-2 text-gray-600">
              <p>11824 13th Ave N</p>
              <p>St. Petersburg, FL 33716</p>
              <p>United States</p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Order Summary</h3>
          
          <div className="space-y-4">
            {/* Main Product */}
            <div className="flex items-center gap-4 pb-4">
              <Image src="/assets/images/6-bottles.png" alt="Fitspresso" width={60} height={60} style={{ width: 'auto', height: 'auto' }} className="rounded" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">Fitspresso</h4>
                <p className="text-sm text-gray-600">6 Bottle Super Pack</p>
                <p className="text-xs text-gray-500">Most Popular</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">$294</p>
              </div>
            </div>

            {/* Bonus Items */}
            <div className="flex items-center gap-4 py-2">
              <Image src="/assets/images/bonus-ebooks.png" alt="Bonus eBooks" width={60} height={60} className="rounded" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">Bonus eBooks</h4>
                <p className="text-sm text-gray-600">First Time Customer</p>
              </div>
              <div className="text-right">
                <p className="text-green-600 font-semibold">FREE</p>
              </div>
            </div>

            <div className="flex items-center gap-4 py-2">
              <Image src="/assets/images/bonus-call.png" alt="Bonus Coaching Call" width={60} height={60} style={{ width: 'auto', height: 'auto' }} className="rounded" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">Bonus Coaching Call</h4>
                <p className="text-sm text-gray-600">Limited Time</p>
              </div>
              <div className="text-right">
                <p className="text-green-600 font-semibold">FREE</p>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Shipping</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Total</span>
                <span>USD $294</span>
              </div>
            </div>
          </div>
        </div>

        {/* Addons */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Addons</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4">
              <Image src="/assets/images/6-bottles.png" alt="Fitspresso" width={60} height={60} style={{ width: 'auto', height: 'auto' }} className="rounded" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">Fitspresso</h4>
                <p className="text-sm text-gray-600">New Customer 12 Bottle Discount (50% OFF)</p>
                <p className="text-xs text-gray-500">Most Popular</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">$297</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Shipping</span>
                <span className="text-green-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold">
                <span>Total</span>
                <span>USD $297</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}