import { readFile } from 'fs/promises'
import { join } from 'path'
import type { DeckSpec } from '@tlslides/tldraw'

export const dynamic = 'force-dynamic'

// In-memory store for deck updates (resets on server restart)
// In a real app, this would be a database (e.g., FastAPI + PostgreSQL)
const deckStore = new Map<string, DeckSpec>()

// Validate deckId to prevent directory traversal
function isValidDeckId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-z0-9-]+$/.test(id)
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const { deckId } = await params

  if (!isValidDeckId(deckId)) {
    return Response.json({ error: 'Invalid deckId' }, { status: 400 })
  }

  // Check in-memory store first
  if (deckStore.has(deckId)) {
    return Response.json(deckStore.get(deckId))
  }

  // Fall back to file system
  try {
    const filePath = join(process.cwd(), 'data', 'decks', `${deckId}.json`)
    const content = await readFile(filePath, 'utf-8')
    const spec = JSON.parse(content) as DeckSpec
    return Response.json(spec)
  } catch (error) {
    return Response.json({ error: 'Deck not found' }, { status: 404 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const { deckId } = await params

  if (!isValidDeckId(deckId)) {
    return Response.json({ error: 'Invalid deckId' }, { status: 400 })
  }

  try {
    const spec = (await req.json()) as DeckSpec
    deckStore.set(deckId, spec)
    return Response.json(spec)
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
