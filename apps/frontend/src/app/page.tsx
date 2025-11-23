'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<string>('Checking...')
  const [healthStatus, setHealthStatus] = useState<any>(null)

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}`)
        const data = await response.text()
        setBackendStatus(data)
        
        const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/health`)
        const healthData = await healthResponse.json()
        setHealthStatus(healthData)
      } catch (error) {
        setBackendStatus('Backend not reachable')
        console.error('Backend connection error:', error)
      }
    }

    checkBackend()
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '3rem', 
        fontWeight: 'bold', 
        marginBottom: '1rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        SnapDocs
      </h1>
      
      <p style={{ 
        fontSize: '1.2rem', 
        color: '#666', 
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        Full-stack application with NestJS backend and NextJS frontend
      </p>
      
      <div style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '12px',
        border: '1px solid #e9ecef',
        minWidth: '300px',
        maxWidth: '500px'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>
          Backend Status
        </h2>
        <p style={{ 
          fontSize: '1rem', 
          marginBottom: '1rem',
          color: backendStatus === 'Backend not reachable' ? '#dc3545' : '#28a745'
        }}>
          {backendStatus}
        </p>
        
        {healthStatus && (
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            <p>Status: {healthStatus.status}</p>
            <p>Uptime: {Math.round(healthStatus.uptime)}s</p>
            <p>Time: {new Date(healthStatus.timestamp).toLocaleTimeString()}</p>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>
          Built with ❤️ using pnpm workspace, NestJS, and NextJS
        </p>
      </div>
    </div>
  )
}
