import { handleShoppingOperation } from '../../server/shoppingStore';

export function GET() {
  return Response.json({ ok: true, service: 'shopping-sync' });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: 'BAD_REQUEST',
        message: 'Die Anfrage konnte nicht gelesen werden.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await handleShoppingOperation(body);
    return Response.json(result, {
      status: result.ok ? 200 : result.status,
    });
  } catch (error) {
    console.error('[shopping] Unerwarteter Fehler:', error);
    return Response.json(
      {
        ok: false,
        error: 'SERVER_ERROR',
        message: 'Der Server konnte die Anfrage nicht verarbeiten.',
      },
      { status: 500 },
    );
  }
}
