'use client'
import Link from 'next/link'

export default function OnboardSuccessPage() {
  return (
    <div style={{minHeight:'100vh',background:'#1A3A6B',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 32px',textAlign:'center'}}>
      <div style={{width:80,height:80,background:'#F5C84A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,marginBottom:24}}>✓</div>
      <h1 style={{fontSize:24,fontWeight:600,color:'#F5C84A',marginBottom:8}}>Compte hôte activé !</h1>
      <p style={{fontSize:14,color:'rgba(255,255,255,0.75)',marginBottom:32,lineHeight:1.7,maxWidth:320}}>
        Votre compte Stripe Connect est configuré. Vous allez apparaître sur la carte VESTILIB dès validation.
      </p>
      <Link href="/" style={{background:'#F5C84A',color:'#1A3A6B',borderRadius:50,padding:'14px 32px',fontSize:15,fontWeight:600,textDecoration:'none'}}>
        Retour à l'accueil
      </Link>
    </div>
  )
}