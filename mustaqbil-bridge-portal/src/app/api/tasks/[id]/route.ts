import { NextResponse } from 'next/server';

const tasks = [
  { id: '1', title: 'Confirm volunteer availability', status: 'todo', owner: 'Amina' },
];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  Object.assign(task, body);
  return NextResponse.json(task);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const index = tasks.findIndex((item) => item.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  tasks.splice(index, 1);
  return NextResponse.json({ success: true });
}
