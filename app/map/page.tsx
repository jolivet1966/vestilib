'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { TARIFS_VESTILIB } from '@/lib/tarifs'

interface Host {
  id: string; prenom: string; nom: string; adresse: string
  codePostal: string; ville: string; telephone: string
  horaires: Record<string, { ouvert: boolean; ouverture: string; fermeture: string }>
  prestations: string[]
}

declare global { interface Window { google: any } }

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const searchBoxRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [hosts, setHosts] = useState<Host[]>([])
  const [selectedHost, setSelectedHost] = useState<Host | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapsReady, setMapsReady] = useState(false)

  useEffect(() => {
    fetch('/api/hosts').then(r => r.json()).then(d => setHosts(d.hosts ?? [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (window.google?.maps) { setMapsReady(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.onload = () => setMapsReady(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstance.current) return
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 46.5, lng: 2.5 }, zoom: 7,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f0' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
      ],
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      zoomControlOptions: { position: 7 },
    })
    if (inputRef.current) {
      searchBoxRef.current = new window.google.maps.places.SearchBox(inputRef.current)
      mapInstance.current.addListener('bounds_changed', () => searchBoxRef.current?.setBounds(mapInstance.current.getBounds()))
      searchBoxRef.current.addListener('places_changed', () => {
        const places = searchBoxRef.current?.getPlaces()
        if (!places?.length) return
        const bounds = new window.google.maps.LatLngBounds()
        places.forEach((place: any) => {
          if (place.geometry?.viewport) bounds.union(place.geometry.viewport)
          else if (place.geometry?.location) bounds.extend(place.geometry.location)
        })
        mapInstance.current.fitBounds(bounds)
        mapInstance.current.setZoom(13)
      })
    }
  }, [mapsReady])

  const geocodeAndPlace = useCallback(async () => {
    if (!mapsReady || !mapInstance.current || !hosts.length) return
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    const geocoder = new window.google.maps.Geocoder()
    for (const host of hosts) {
      geocoder.geocode({ address: `${host.adresse}, ${host.codePostal} ${host.ville}, France` }, (results: any, status: any) => {
        if (status !== 'OK' || !results?.[0]) return
        const position = results[0].geometry.location
        const marker = new window.google.maps.Marker({
          position, map: mapInstance.current, title: `${host.prenom} ${host.nom}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: '#1A3A6B',
            fillOpacity: 1,
            strokeColor: '#F5C84A',
            strokeWeight: 3,
          },
        })
        marker.addListener('click', () => {
          setSelectedHost(host)
          mapInstance.current.panTo(position)
          mapInstance.current.setZoom(15)
        })
        markersRef.current.push(marker)
      })
    }
  }, [mapsReady, hosts])

  useEffect(() => { geocodeAndPlace() }, [geocodeAndPlace])

  const aujourdHui = () => ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][new Date().getDay()]
  const statutOuverture = (host: Host) => {
    const h = host.horaires?.[aujourdHui()]
    if (!h?.ouvert) return { ouvert: false, label: 'Fermé aujourd\'hui' }
    return { ouvert: true, label: `${h.ouverture} — ${h.fermeture}` }
  }

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: '100dvh' }}>

      {/* Header */}
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-lg">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-[#F5C84A]/20 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 44 44" fill="none">
              <path d="M6 8 L22 36 L38 8" stroke="#F5C84A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M16 8 Q22 4 28 8" stroke="#F5C84A" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <circle cx="22" cy="4" r="2" fill="#F5C84A"/>
            </svg>
          </div>
          <span className="text-[#F5C84A] font-black tracking-widest text-sm">VESTILIB</span>
        </Link>
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input ref={inputRef} type="text" placeholder="Ville, adresse, événement..."
            className="w-full bg-white/15 text-white placeholder-white/40 border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white/25 transition-colors" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* CARTE */}
        <div className="h-64 md:h-auto md:flex-1 relative order-first md:order-last flex-shrink-0">
          <div ref={mapRef} className="w-full h-full" />
          {!mapsReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">Chargement de la carte...</p>
              </div>
            </div>
          )}
        </div>

        {/* LISTE */}
        <div className="flex-1 md:flex-none md:w-80 overflow-y-auto bg-gray-50 order-last md:order-first">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-3 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2 px-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl mb-1">📍</div>
              <p className="text-sm font-medium text-gray-600">Aucun hôte disponible</p>
              <p className="text-xs text-gray-400">Revenez bientôt, le réseau s'agrandit !</p>
            </div>
          ) : (
            <div className="p-3 space-y-2 pb-24">
              {/* Compteur */}
              <div className="flex items-center gap-2 px-1 py-2">
                <div className="w-6 h-6 bg-[#1A3A6B] rounded-lg flex items-center justify-center">
                  <span className="text-[#F5C84A] text-[10px] font-black">{hosts.length}</span>
                </div>
                <p className="text-xs font-semibold text-[#1A3A6B]">
                  hôte{hosts.length > 1 ? 's' : ''} disponible{hosts.length > 1 ? 's' : ''} près de vous
                </p>
              </div>

              {hosts.map(host => {
                const statut = statutOuverture(host)
                const isSelected = selectedHost?.id === host.id
                return (
                  <div key={host.id} onClick={() => setSelectedHost(isSelected ? null : host)}
                    className={`rounded-2xl border cursor-pointer transition-all overflow-hidden ${
                      isSelected
                        ? 'border-[#1A3A6B] shadow-md shadow-[#1A3A6B]/10'
                        : 'border-gray-100 bg-white hover:shadow-sm hover:border-gray-200'
                    }`}>

                    {/* Bande colorée en haut si sélectionné */}
                    {isSelected && <div className="h-1 bg-gradient-to-r from-[#1A3A6B] to-[#F5C84A]" />}

                    <div className={`p-4 ${isSelected ? 'bg-white' : ''}`}>
                      {/* Nom + badge */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-[#1A3A6B]">
                          {capitalize(host.prenom)} {host.nom.toUpperCase()}
                        </p>
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${
                          statut.ouvert
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-50 text-red-500'
                        }`}>
                          {statut.ouvert ? '● Ouvert' : '○ Fermé'}
                        </span>
                      </div>

                      {/* Adresse */}
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <svg className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <p className="text-xs text-gray-500 leading-tight">{host.adresse}, {host.ville}</p>
                      </div>

                      {/* Horaires */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <p className="text-xs text-gray-500">{statut.label}</p>
                      </div>

                      {/* Prestations */}
                      <div className="flex flex-wrap gap-1.5">
                        {host.prestations?.slice(0, 3).map(pid => {
                          const t = TARIFS_VESTILIB.find(t => t.id === pid)
                          return t ? (
                            <span key={pid} className="text-[10px] bg-[#1A3A6B]/8 text-[#1A3A6B] px-2.5 py-1 rounded-full font-medium border border-[#1A3A6B]/10">
                              {t.label}
                            </span>
                          ) : null
                        })}
                        {(host.prestations?.length ?? 0) > 3 && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                            +{host.prestations.length - 3}
                          </span>
                        )}
                      </div>

                      {/* CTA si sélectionné */}
                      {isSelected && (
                        <Link href={`/host/${host.id}`}
                          className="mt-4 flex items-center justify-center gap-2 w-full bg-[#1A3A6B] text-[#F5C84A] text-sm font-bold py-3 rounded-xl hover:bg-[#0C2447] transition-colors active:scale-95">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Voir les prestations et réserver
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}