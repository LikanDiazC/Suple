import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ---------------------------------------------------------------------------
// Internal: fetch facturas from the sibling route
// ---------------------------------------------------------------------------

async function fetchFacturas(
  baseUrl: string,
  tipo: 'emitidas' | 'recibidas',
  periodo: string | null,
  cookieHeader: string,
) {
  const url = new URL(`${baseUrl}/api/sii/facturas`);
  url.searchParams.set('tipo', tipo);
  if (periodo) url.searchParams.set('periodo', periodo);

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: { Cookie: cookieHeader },
  });

  if (!res.ok) {
    throw new Error(`facturas/${tipo} returned ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// GET /api/sii/iva?periodo=2026-04
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const siiSession = request.cookies.get('sii_session')?.value;
    const nextAuthToken = await getToken({ req: request });

    if (!siiSession && !nextAuthToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in via SII or the app.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { searchParams } = request.nextUrl;
    const periodo = searchParams.get('periodo');

    // Forward cookies to the internal facturas request
    const cookieHeader = request.headers.get('cookie') ?? '';
    const { protocol, host } = request.nextUrl;
    const baseUrl = `${protocol}//${host}`;

    const [emitidasRes, recibidasRes] = await Promise.all([
      fetchFacturas(baseUrl, 'emitidas', periodo, cookieHeader),
      fetchFacturas(baseUrl, 'recibidas', periodo, cookieHeader),
    ]);

    const emitidas: Array<{
      tipo: string;
      iva: number;
      montoNeto: number;
    }> = emitidasRes.facturas ?? [];

    const recibidas: Array<{
      tipo: string;
      iva: number;
      montoNeto: number;
    }> = recibidasRes.facturas ?? [];

    // IVA calculation — same logic as the SII frontend page
    const afectasEmitidas = emitidas.filter(
      (f) => f.tipo === 'Factura Afecta' && f.iva > 0,
    );
    const afectasRecibidas = recibidas.filter(
      (f) => f.tipo === 'Factura Afecta' && f.iva > 0,
    );

    const ivaDebito = afectasEmitidas.reduce((s, f) => s + f.iva, 0);
    const ivaCredito = afectasRecibidas.reduce((s, f) => s + f.iva, 0);
    const ivaAPagar = Math.max(0, ivaDebito - ivaCredito);
    const remanente = Math.max(0, ivaCredito - ivaDebito);
    const ventasNetas = afectasEmitidas.reduce(
      (s, f) => s + f.montoNeto,
      0,
    );
    const comprasNetas = afectasRecibidas.reduce(
      (s, f) => s + f.montoNeto,
      0,
    );

    const isMock = emitidasRes.mock || recibidasRes.mock;

    return NextResponse.json(
      {
        ivaDebito,
        ivaCredito,
        ivaAPagar,
        remanente,
        ventasNetas,
        comprasNetas,
        periodo: periodo ?? 'current',
        mock: isMock,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', detail: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
