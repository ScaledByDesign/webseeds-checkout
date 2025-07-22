'use client'

import { useState } from 'react'

export default function SimpleTestPage() {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Simple Input Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your email here - should work normally"
              />
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your first name"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your last name"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold mb-2">Current Values:</h3>
            <pre className="text-sm">{JSON.stringify(formData, null, 2)}</pre>
          </div>

          <div className="mt-6 p-4 bg-blue-100 rounded-lg">
            <h3 className="font-bold mb-2 text-blue-800">Test Instructions:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Try typing in each field - you should be able to type multiple characters</li>
              <li>• If this works but the checkout doesn't, the issue is in the ModernCheckoutForm</li>
              <li>• Check the JSON output below to see if values are updating correctly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}