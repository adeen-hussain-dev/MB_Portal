import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    // 5MB limit check
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Profile photo exceeds 5MB limit' }, { status: 400 })
    }

    const mime = file.type || ''
    if (!mime.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image (PNG, JPG, WebP, etc.)' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Ensure 'avatars' bucket exists
    const { data: bucket, error: bucketError } = await admin.storage.getBucket('avatars')
    if (bucketError || !bucket) {
      await admin.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
      })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${user.id}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: mime,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Avatar upload failed: ${uploadError.message}` }, { status: 400 })
    }

    const { data: urlData } = admin.storage.from('avatars').getPublicUrl(filePath)
    const avatarUrl = urlData.publicUrl

    // Update profiles.avatar_url
    const { error: profileError } = await admin
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ avatar_url: avatarUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
