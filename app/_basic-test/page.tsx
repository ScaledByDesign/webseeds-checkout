'use client'

import { useState } from 'react'

export default function BasicTestPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Most Basic Input Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Email (controlled):</label>
        <br />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '300px', padding: '10px', border: '1px solid #ccc' }}
          placeholder="Type here - should work normally"
        />
        <div>Current value: {email}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>Name (controlled):</label>
        <br />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '300px', padding: '10px', border: '1px solid #ccc' }}
          placeholder="Type your name"
        />
        <div>Current value: {name}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>Uncontrolled input (for comparison):</label>
        <br />
        <input
          type="text"
          style={{ width: '300px', padding: '10px', border: '1px solid #ccc' }}
          placeholder="This should definitely work"
        />
      </div>

      <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginTop: '20px' }}>
        <strong>Debug Info:</strong>
        <br />
        Email length: {email.length}
        <br />
        Name length: {name.length}
        <br />
        Render time: {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
}