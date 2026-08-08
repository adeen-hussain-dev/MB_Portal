import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ comments: [] });
}

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json(
    {
      message: 'Comment added',
      comment: {
        id: `${Date.now()}`,
        taskId: body.taskId ?? '1',
        content: body.content ?? 'No content',
      },
    },
    { status: 201 },
  );
}
