import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LegalForge AI — Multi-Agent Contract Intelligence',
  description: '6 AI agents traverse a knowledge graph to parse, detect contradictions, check compliance, score risk, and negotiate better contract terms in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#030508] text-[#f2f6fc] font-body antialiased">
        <div className="noise" />
        {children}
      </body>
    </html>
  )
}
