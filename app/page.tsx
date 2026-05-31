'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/app/components/NavBar'

export default function HomePage() {
  const [splash, setSplash] = useState(true)
  const [popup, setPopup] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  const handleProposer = () => {
    setPopup(true)
  }

  const handlePopupOk = () => {
    setPopup(false)
    router.push('/profil')
  }

  if (splash) return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center gap-6">
      <svg width="80" height="80" viewBox="0 0 44 44" fill="none">
        <path d="M6 8 L22 36 L38 8" stroke="#F5C84A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M16 8 Q22 4 28 8" stroke="#F5C84A" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx="22" cy="4" r="2" fi