'use client'
// app/host/onboard/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { TARIFS_VESTILIB, CATEGORIES } from '@/lib/tarifs'
import type { Horaires, JourHoraire } from '@/types'

const JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'] as const
const JOURS_LABELS: Record<string, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
}

const horairesDefaut: Horaires = Object.fromEntries(
  JOURS.map(j => [j, { ouvert: j !== 'dimanche', ouverture: '09:00', fermeture: '19:00' }])
) as Horaires

export default function OnboardHostPage() {
  const router = useRouter()
  const [etape, setEtape] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState('')

  // Utilisateur déjà connecté
  const [existingUid, setExistingUid] = useState<string | null>(null)
  const [dejaConnecte, setDejaConnecte] = useState(false)

  // Étape 1 — Identité
  const [prenom,     setPrenom]     = useState('')
  const [nom,        setNom]        = useState('')
  const [email,      setEmail]      = useState('')
  const [telephone,  setTelephone]  = useState('')
  const [adresse,    setAdresse]    = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville,      setVille]      = useState('')
  const [password,   setPassword]   = useState('')
  const [password2,  setPassword2]  = useState('')

  // Étape 2 — Horaires
  const [horaires, setHoraires] = useState<Horaires>(horairesDefaut)

  // Étape 3 — Prestations
  const [prestations,      setPrestations]      = useState<string[]>([])
  const [capaciteMax,      setCapaciteMax]      = useState<number>(20)
  const [capaciteMaxMoto,  setCapaciteMaxMoto]  = useState<number>(5)
  const [capaciteMaxVelo,  setCapaciteMaxVelo]  = useState<number>(5)
  const [capaciteMaxDepot, setCapaciteMaxDepot] = useState<number>(10)

  // Détecter si utilisateur déjà connecté et pré-remplir
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        setExistingUid(firebaseUser.uid)
        setDejaConnecte(true)
        setEmail(firebaseUser.email ?? '')
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setPrenom(data.prenom ?? '')
            setNom(data.nom ?? '')
            setTelephone(data.telephone ?? '')
          }
        } catch { /* silencieux */ }
      }
      setCheckingAuth(false)
    })
    return () => unsub()
  }, [])

  const togglePrestation = (id: string) => {
    setPrestations(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const updateHoraire = (jour: string, field: keyof JourHoraire, value: string | boolean) => {
    setHoraires(prev => ({
      ...prev,
      [jour]: { ...prev[jour as keyof Horaires], [field]: value },
    }))
  }

  const validerEtape1 = () => {
    if (!prenom || !nom || !email || !telephone || !adresse || !codePostal || !ville) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalide.')
      return
    }
    if (!dejaConnecte) {
      if (!password || password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.')
        return
      }
      if (password !== password2) {
        setError('Les mots de passe ne correspondent pas.')
        return
      }
    }
    setError('')
    setEtape(2)
  }

  const validerEtape2 = () => {
    const jourOuvert = JOURS.some(j => horaires[j].ouvert)
    if (!jourOuvert) {
      setError("Sélectionnez au moins un jour d'ouverture.")
      return
    }
    setError('')
    setEtape(3)
  }

  const soumettre = async () => {
    if (prestations.length === 0) {
      setError('Sélectionnez au moins une prestation.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/onboard-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emai