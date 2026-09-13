import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 20MB limit check
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Ensure 'task-attachments' bucket exists, create if missing
    const { data: bucket, error: bucketError } = await admin.storage.getBucket('task-attachments')
    if (bucketError || !bucket) {
      const { error: createBucketError } = await admin.storage.createBucket('task-attachments', {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024,
      })
      if (createBucketError && !createBucketError.message.includes('already exists')) {
        console.error('Error creating bucket:', createBucketError)
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${Date.now()}_${sanitizedName}`

    const { error: uploadError } = await admin.storage
      .from('task-attachments')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 400 })
    }

    const { data: urlData } = admin.storage.from('task-attachments').getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
      name: file.name,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
