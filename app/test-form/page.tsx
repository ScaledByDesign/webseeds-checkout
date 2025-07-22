'use client'

import { SimpleCheckoutForm } from '@/components/SimpleCheckoutForm'
import { ModernCheckoutForm } from '@/components/ModernCheckoutForm'
import { useState } from 'react'

const order = {
  items: [
    {
      id: 'test-product',
      name: 'Test Product',
      price: 100,
      quantity: 1,
    }
  ]
}

export default function TestFormPage() {
  const [showComplex, setShowComplex] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Form Input Testing</h1>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowComplex(false)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                !showComplex 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Simple Form
            </button>
            <button
              onClick={() => setShowComplex(true)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                showComplex 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Complex Form
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {!showComplex ? (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-center text-green-600">
                Simple Form (No Complex Validation)
              </h2>
              <p className="text-center text-gray-600 mb-6">
                Test if multiple inputs can be filled normally
              </p>
              <SimpleCheckoutForm />
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-center text-orange-600">
                Complex Form (Original with All Features)
              </h2>
              <p className="text-center text-gray-600 mb-6">
                Test if the complex validation is causing issues
              </p>
              <ModernCheckoutForm
                order={order}
                onPaymentSuccess={() => console.log('Payment success')}
                onPaymentError={(error) => console.error('Payment error:', error)}
                apiEndpoint="/api/test"
              />
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Try filling out multiple form fields in the <strong>Simple Form</strong> - they should all work normally</li>
            <li>Switch to the <strong>Complex Form</strong> and test if you can fill multiple fields</li>
            <li>If the complex form has issues, this confirms the problem is in the validation logic</li>
            <li>Look for any console errors in the browser developer tools</li>
          </ol>
        </div>
      </div>
    </div>
  )
}