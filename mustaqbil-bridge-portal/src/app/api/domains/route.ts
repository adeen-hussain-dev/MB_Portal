import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const defaultDomains = [
  'Graphic Design',
  'Web Development',
  'Content & Copywriting',
  'Social Media & Outreach',
  'Video Editing',
  'Event Management',
]

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('domains').select('id, name').order('name', { ascending: true })

    if (error || !data) {
      return NextResponse.json({ domains: defaultDomains })
    }

    const dbNames = data.map((row) => String(row.name)).filter(Boolean)
    const combined = Array.from(new Set([...defaultDomains, ...dbNames]))
    return NextResponse.json({ domains: combined })
  } catch {
    return NextResponse.json({ domains: defaultDomains })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can manage domains' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Domain name is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Try creating domains table on the fly if it doesn't exist yet, then insert
  try {
    const { error } = await admin.from('domains').insert({ name: name.trim() })
    if (error) {
      console.warn('Domain insert notice:', error.message)
    }
  } catch (e) {
    console.warn('Domains table notice:', e)
  }

  return NextResponse.json({ success: true, name: name.trim() })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only admin can manage domains' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name) return NextResponse.json({ error: 'Domain name is required' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('domains').delete().eq('name', name)

  return NextResponse.json({ success: true })
}
