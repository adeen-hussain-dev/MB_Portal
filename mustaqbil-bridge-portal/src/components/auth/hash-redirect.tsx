'use client'

import { useEffect } from 'react'

export function HashRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash
      if (
        hash.includes('access_token') ||
        hash.includes('type=recovery') ||
        hash.includes('type=invite')
      ) {
        window.location.replace('/auth/callback' + hash)
      }
    }
  }, [])

  return null
}
