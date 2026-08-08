import { NextResponse } from 'next/server';

const tasks = [
  {
    id: '1',
    title: 'Confirm volunteer availability',
    status: 'todo',
    owner: 'Amina',
  },
];

export async function GET() {
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const body = await request.json();
  const task = {
    id: `${Date.now()}`,
    title: body.title ?? 'Untitled task',
    status: body.status ?? 'todo',
    owner: body.owner ?? 'Unassigned',
  };

  tasks.push(task);
  return NextResponse.json(task, { status: 201 });
}
