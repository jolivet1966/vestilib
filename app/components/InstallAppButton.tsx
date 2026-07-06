'use client'
import { useEffect, useState } from 'react'

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIos, setIosInstructions] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [alreadyInstalled, setAlreadyInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (standalone) { setAlreadyInstalled(true); return }

    const ua = window.navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    setIosInstructions(ios)

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (alreadyInstalled) return null
  if (!deferredPrompt && !isIos) return null

  const handleClick = async () => {
    if (isIos) {
      setShowIosModal(true)
      return
    }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    }
  }

  return (
    <>
      <button onClick={handleClick}
        className="flex items-center gap-3 w-full bg-white border-2 border-[#1A3A6B] px-5 py-4 rounded-2xl active:scale-95 transition-all">
        <div className="w-10 h-10 bg-[#1A3A6B] rounded-xl flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C84A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="text-left flex-1">
          <p className="text-[#1A3A6B] font-bold text-sm">Installer l'application</p>
          <p className="text-gray-400 text-xs">Accès rapide depuis votre écran d'accueil</p>
        </div>
      </button>

      {showIosModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
          onClick={() => setShowIosModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-4 text-center">📲</div>
            <h2 className="text-base font-bold text-[#1A3A6B] text-center mb-4">Installer VESTILIB</h2>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#1A3A6B]/10 text-[#1A3A6B] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p className="text-sm text-gray-600">Appuyez sur l'icône <strong>Partager</strong> en bas de Safari</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#1A3A6B]/10 text-[#1A3A6B] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p className="text-sm text-gray-600">Sélectionnez <strong>Sur l'écran d'accueil</strong></p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#1A3A6B]/10 text-[#1A3A6B] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p className="text-sm text-gray-600">Appuyez sur <strong>Ajouter</strong></p>
              </div>
            </div>
            <button onClick={() => setShowIosModal(false)}
              className="w-full bg-[#1A3A6B] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  )
}