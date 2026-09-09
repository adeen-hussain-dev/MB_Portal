import { PATCH as handleAnswerPatch } from '../route'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleAnswerPatch(request, context)
}
