'use client'
import { useEffect, useState } from 'react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIos, setIsIos] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (standalone) return
    if (localStorage.getItem('vestilib_install_banner_dismissed')) return

    const ua = window.navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    setIsIos(ios)
    if (ios) setVisible(true)

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem('vestilib_install_banner_dismissed', 'true')
    setVisible(false)
  }

  const handleInstall = async () => {
    if (isIos) { setShowIosModal(true); return }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <>
      <div className="bg-[#272757] px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#F5C84A]/15 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C84A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <p className="text-white text-xs flex-1 leading-tight">
          Installez l'app <strong className="text-[#F5C84A]">VESTILIB</strong> pour un accès plus rapide
        </p>
        <button onClick={handleInstall}
          className="bg-[#F5C84A] text-[#272757] text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 active:scale-95 transition-all">
          Installer
        </button>
        <button onClick={dismiss} className="text-white/40 hover:text-white/70 text-lg leading-none flex-shrink-0 px-1">
          x
        </button>
      </div>

      {showIosModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
          onClick={() => setShowIosModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-4 text-center">Installer</div>
            <h2 className="text-base font-bold text-[#272757] text-center mb-4">Installer VESTILIB</h2>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#272757]/10 text-[#272757] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <p className="text-sm text-gray-600">Appuyez sur l'icone Partager en bas de Safari</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#272757]/10 text-[#272757] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <p className="text-sm text-gray-600">Selectionnez Sur l'ecran d'accueil</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-[#272757]/10 text-[#272757] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <p className="text-sm text-gray-600">Appuyez sur Ajouter</p>
              </div>
            </div>
            <button onClick={() => { setShowIosModal(false); dismiss() }}
              className="w-full bg-[#272757] text-[#F5C84A] font-semibold py-3 rounded-xl hover:bg-[#0C2447] transition-colors">
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  )
}
