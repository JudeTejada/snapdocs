import './globals.css'
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'SnapDocs',
  description: 'A full-stack application with NestJS backend and NextJS frontend',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <main>
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  )
}
