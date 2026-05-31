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

  const handlePopupOk = () => {
    setPopup(false)
    router.push('/profil')
  }

  if (splash) return (
    <div className="min-h-screen bg-[#1A3A6B] flex flex-col items-center justify-center gap-6">
      <svg width="80" height=