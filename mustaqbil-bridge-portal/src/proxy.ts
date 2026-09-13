import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  let isSuspended = false
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error?.message?.toLowerCase().includes('banned') || error?.message?.toLowerCase().includes('suspended')) {
      isSuspended = true
    }
    user = data?.user ?? null
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.toLowerCase().includes('banned') || errMsg.toLowerCase().includes('suspended')) {
      isSuspended = true
    }
  }

  if (isSuspended) {
    try {
      await supabase.auth.signOut()
    } catch {}
    if (!request.nextUrl.pathname.startsWith('/login')) {
      const suspendedUrl = new URL('/login', request.url)
      suspendedUrl.searchParams.set('error', 'suspended')
      return NextResponse.redirect(suspendedUrl)
    }
  }
  const isPublicPath = request.nextUrl.pathname === '/'
    || request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/auth/callback')
    || request.nextUrl.pathname.startsWith('/api')
    || /\.(svg|png|jpg|jpeg|gif|webp|ico)$/i.test(request.nextUrl.pathname)

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.status?.toLowerCase() === 'inactive') {
      await supabase.auth.signOut()
      if (!request.nextUrl.pathname.startsWith('/login')) {
        const suspendedUrl = new URL('/login', request.url)
        suspendedUrl.searchParams.set('error', 'suspended')
        return NextResponse.redirect(suspendedUrl)
      }
      user = null
    }
  }

  if (!user && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    const redirectTo = request.nextUrl.pathname + request.nextUrl.search
    if (redirectTo && redirectTo !== '/' && redirectTo !== '/overview') {
      loginUrl.searchParams.set('redirectTo', redirectTo)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    if (redirectTo && redirectTo.startsWith('/') && redirectTo !== '/') {
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
    return NextResponse.redirect(new URL('/overview', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
