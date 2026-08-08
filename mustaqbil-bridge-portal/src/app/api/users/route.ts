import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json(
    {
      message: 'Volunteer account created',
      user: {
        email: body.email ?? 'volunteer@example.com',
        role: body.role ?? 'volunteer',
      },
    },
    { status: 201 },
  );
}
