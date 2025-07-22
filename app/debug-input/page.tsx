'use client'

import { useState, ChangeEvent } from 'react'

export default function DebugInputPage() {
  const [values, setValues] = useState({
    test1: '',
    test2: '',
    test3: ''
  })

  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 9)])
  }

  const handleChange1 = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    addLog(`Input 1 - New value: "${value}" (length: ${value.length})`)
    setValues(prev => ({ ...prev, test1: value }))
  }

  const handleChange2 = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    addLog(`Input 2 - New value: "${value}" (length: ${value.length})`)
    setValues(prev => ({ ...prev, test2: value }))
  }

  const handleChange3 = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    addLog(`Input 3 - Name: ${name}, Value: "${value}" (length: ${value.length})`)
    setValues(prev => ({ ...prev, [name]: value }))
  }

  // Inline styles to avoid any CSS interference
  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #ccc',
    borderRadius: '4px',
    fontSize: '16px',
    marginBottom: '10px'
  }

  const containerStyle = {
    maxWidth: '600px',
    margin: '20px auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px'
  }

  return (
    <div style={containerStyle}>
      <h1>Debug Input Issue</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h3>Test 1: Direct handler</h3>
        <input
          type="text"
          value={values.test1}
          onChange={handleChange1}
          placeholder="Type here... should work normally"
          style={inputStyle}
        />
        <div>Current value: "{values.test1}" (length: {values.test1.length})</div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Test 2: Separate handler</h3>
        <input
          type="text"
          value={values.test2}
          onChange={handleChange2}
          placeholder="Another input test"
          style={inputStyle}
        />
        <div>Current value: "{values.test2}" (length: {values.test2.length})</div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Test 3: Generic handler with name</h3>
        <input
          name="test3"
          type="text"
          value={values.test3}
          onChange={handleChange3}
          placeholder="Generic handler test"
          style={inputStyle}
        />
        <div>Current value: "{values.test3}" (length: {values.test3.length})</div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Test 4: Uncontrolled (should always work)</h3>
        <input
          type="text"
          placeholder="Uncontrolled input - should definitely work"
          style={inputStyle}
          onChange={(e) => addLog(`Uncontrolled input: "${e.target.value}"`)}
        />
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '4px' }}>
        <h3>Event Log:</h3>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>No events yet - start typing!</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ fontSize: '12px', color: '#333', marginBottom: '2px' }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}