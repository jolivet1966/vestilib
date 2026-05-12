'use client'
// app/map/page.tsx
// Carte Google Maps avec recherche par ville/adresse + liste des hôtes
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { TARIFS_VESTILIB } from '@/lib/tarifs'

interface Host {
  id:          string
  prenom:      string
  nom:         string
  adresse:     string
  codePostal:  string
  ville:        string
  telephone:   string
  horaires:    Record<string, { ouvert: boolean; ouverture: string; fermeture: string }>
  prestations: string[]
}

const JOURS_ORDER = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const JOURS_LABELS: Record<string, string> = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer',
  jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
}

export default function MapPage() {
  const mapRef        = useRef<HTMLDivElement>(null)
  const mapInstance   = useRef<google.maps.Map | null>(null)
  const markersRef    = useRef<google.maps.Marker[]>([])
  const searchBoxRef  = useRef<google.maps.places.SearchBox | null>(null)
  const inputRef      = useRef<HTMLInputElement>(null)

  const [hosts,        setHosts]        = useState<Host[]>([])
  const [selectedHost, setSelectedHost] = useState<Host | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [mapsReady,    setMapsReady]    = useState(false)

  // 1. Charger les hôtes depuis Firestore via API
  useEffect(() => {
    fetch('/api/hosts')
      .then(r => r.json())
      .then(d => setHosts(d.hosts ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // 2. Charger le script Google Maps
  useEffect(() => {
    if (window.google?.maps) { setMapsReady(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.onload = () => setMapsReady(true)
    document.head.appendChild(script)
  }, [])

  // 3. Initialiser la carte quand Maps est prêt
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapInstance.current) return

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center:    { lat: 46.603354, lng: 1.888334 }, // Centre France
      zoom:      6,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    // SearchBox
    if (inputRef.current) {
      searchBoxRef.current = new google.maps.places.SearchBox(inputRef.current)
      mapInstance.current.addListener('bounds_changed', () => {
        searchBoxRef.current?.setBounds(mapInstance.current!.getBounds()!)
      })
      searchBoxRef.current.addListener('places_changed', () => {
        const places = searchBoxRef.current?.getPlaces()
        if (!places?.length) return
        const bounds = new google.maps.LatLngBounds()
        places.forEach(place => {
          if (place.geometry?.viewport) bounds.union(place.geometry.viewport)
          else if (place.geometry?.location) bounds.extend(place.geometry.location)
        })
        mapInstance.current?.fitBounds(bounds)
        mapInstance.current?.setZoom(13)
      })
    }
  }, [mapsReady])

  // 4. Placer les marqueurs quand hôtes + carte sont prêts
  const geocodeAndPlace = useCallback(async () => {
    if (!mapsReady || !mapInstance.current || !hosts.length) return

    // Nettoyer anciens marqueurs
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    const geocoder = new google.maps.Geocoder()

    for (const host of hosts) {
      const adresseComplete = `${host.adresse}, ${host.codePostal} ${host.ville}, France`

      geocoder.geocode({ address: adresseComplete }, (results, status) => {
        if (status !== 'OK' || !results?.[0]) return

        const position = results[0].geometry.location

        const marker = new google.maps.Marker({
          position,
          map: mapInstance.current!,
          title: `${host.prenom} ${host.nom}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#1A3A6B',
            fillOpacity: 1,
            strokeColor: '#F5C84A',
            strokeWeight: 2,
          },
        })

        marker.addListener('click', () => {
          setSelectedHost(host)
          mapInstance.current?.panTo(position)
          mapInstance.current?.setZoom(15)
        })

        markersRef.current.push(marker)
      })
    }
  }, [mapsReady, hosts])

  useEffect(() => { geocodeAndPlace() }, [geocodeAndPlace])

  const joursOuverts = (host: Host) =>
    JOURS_ORDER.filter(j => host.horaires?.[j]?.ouvert)

  const aujourdHui = () => {
    const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
    return jours[new Date().getDay()]
  }

  const statutOuverture = (host: Host) => {
    const jour = aujourdHui()
    const h = host.horaires?.[jour]
    if (!h?.ouvert) return { ouvert: false, label: 'Fermé aujourd\'hui' }
    return { ouvert: true, label: `Ouvert · ${h.ouverture} – ${h.fermeture}` }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">

      {/* Header */}
      <div className="bg-[#1A3A6B] px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <Link href="/" className="text-[#F5C84A] font-bold tracking-widest text-lg">VESTILIB</Link>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher une ville, une adresse..."
            className="w-full bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:bg-white/20 transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Liste des hôtes */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Chargement...</div>
          ) : hosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
              <span className="text-2xl">📍</span>
              Aucun hôte disponible
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-xs text-gray-400 px-1 mb-3">{hosts.length} hôte{hosts.length > 1 ? 's' : ''} disponible{hosts.length > 1 ? 's' : ''}</p>
              {hosts.map(host => {
                const statut = statutOuverture(host)
                const isSelected = selectedHost?.id === host.id
                return (
                  <div
                    key={host.id}
                    onClick={() => setSelectedHost(isSelected ? null : host)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1A3A6B] bg-[#1A3A6B]/5 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {/* Nom + statut */}
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900">{host.prenom} {host.nom}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                        statut.ouvert ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'
                      }`}>
                        {statut.ouvert ? 'Ouvert' : 'Fermé'}
                      </span>
                    </div>

                    {/* Adresse */}
                    <p className="text-xs text-gray-400 mb-2">📍 {host.adresse}, {host.ville}</p>

                    {/* Horaire aujourd'hui */}
                    <p className="text-xs text-gray-500 mb-2">{statut.label}</p>

                    {/* Prestations */}
                    <div className="flex flex-wrap gap-1">
                      {host.prestations?.slice(0, 3).map(pid => {
                        const t = TARIFS_VESTILIB.find(t => t.id === pid)
                        return t ? (
                          <span key={pid} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {t.label}
                          </span>
                        ) : null
                      })}
                      {(host.prestations?.length ?? 0) > 3 && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          +{host.prestations.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Bouton réserver */}
                    {isSelected && (
                      <Link
                        href={`/host/${host.id}`}
                        className="mt-3 block w-full text-center bg-[#1A3A6B] text-[#F5C84A] text-xs font-semibold py-2 rounded-lg hover:bg-[#0C2447] transition-colors"
                      >
                        Voir et réserver →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Carte */}
        <div className="flex-1 relative">
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
      </div>
    </div>
  )
}