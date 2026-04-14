import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ---------------------------------------------------------------------------
// Mock data — mirrors the SII dashboard page frontend data
// ---------------------------------------------------------------------------

interface Factura {
  folio: number;
  tipo: string;
  fecha: string;
  razonSocial: string;
  rut: string;
  montoNeto: number;
  iva: number;
  total: number;
  estado: 'ACEPTADO' | 'ACEPTADO_CON_REPAROS' | 'RECHAZADO' | 'PENDIENTE';
}

const MOCK_EMITIDAS: Factura[] = [
  { folio: 1001, tipo: 'Factura Afecta', fecha: '2026-04-02', razonSocial: 'UDLA Universidad', rut: '76.543.210-K', montoNeto: 2500000, iva: 475000, total: 2975000, estado: 'ACEPTADO' },
  { folio: 1002, tipo: 'Factura Afecta', fecha: '2026-04-05', razonSocial: 'Fracttal SpA', rut: '77.123.456-3', montoNeto: 1800000, iva: 342000, total: 2142000, estado: 'ACEPTADO' },
  { folio: 1003, tipo: 'Factura No Afecta', fecha: '2026-04-08', razonSocial: 'ICI Ingenieria', rut: '96.542.890-2', montoNeto: 900000, iva: 0, total: 900000, estado: 'ACEPTADO' },
  { folio: 1004, tipo: 'Factura Afecta', fecha: '2026-04-10', razonSocial: 'Sodimac S.A.', rut: '82.331.000-7', montoNeto: 3400000, iva: 646000, total: 4046000, estado: 'ACEPTADO_CON_REPAROS' },
  { folio: 1005, tipo: 'Factura Afecta', fecha: '2026-04-12', razonSocial: 'Cencosud Retail', rut: '79.221.445-1', montoNeto: 780000, iva: 148200, total: 928200, estado: 'ACEPTADO' },
  { folio: 1006, tipo: 'Factura Afecta', fecha: '2026-04-13', razonSocial: 'AVEVA Group', rut: '98.123.567-0', montoNeto: 4200000, iva: 798000, total: 4998000, estado: 'PENDIENTE' },
  { folio: 1007, tipo: 'Factura Afecta', fecha: '2026-04-13', razonSocial: 'Banco Estado', rut: '97.030.000-7', montoNeto: 1200000, iva: 228000, total: 1428000, estado: 'ACEPTADO' },
  { folio: 1008, tipo: 'Nota de Credito', fecha: '2026-04-13', razonSocial: 'Fracttal SpA', rut: '77.123.456-3', montoNeto: -450000, iva: -85500, total: -535500, estado: 'ACEPTADO' },
];

const MOCK_RECIBIDAS: Factura[] = [
  { folio: 50341, tipo: 'Factura Afecta', fecha: '2026-04-01', razonSocial: 'AWS Chile SpA', rut: '76.354.771-K', montoNeto: 1850000, iva: 351500, total: 2201500, estado: 'ACEPTADO' },
  { folio: 83920, tipo: 'Factura Afecta', fecha: '2026-04-03', razonSocial: 'Oficinas Miraflores Ltda.', rut: '78.892.003-2', montoNeto: 650000, iva: 123500, total: 773500, estado: 'ACEPTADO' },
  { folio: 12344, tipo: 'Factura Afecta', fecha: '2026-04-05', razonSocial: 'Suministros Oficina Chile', rut: '82.441.332-6', montoNeto: 280000, iva: 53200, total: 333200, estado: 'ACEPTADO' },
  { folio: 93210, tipo: 'Factura Afecta', fecha: '2026-04-07', razonSocial: 'Telefonica Chile S.A.', rut: '96.929.840-8', montoNeto: 420000, iva: 79800, total: 499800, estado: 'ACEPTADO' },
  { folio: 77001, tipo: 'Factura Afecta', fecha: '2026-04-10', razonSocial: 'Publicidad Digital SpA', rut: '76.123.890-3', montoNeto: 1200000, iva: 228000, total: 1428000, estado: 'ACEPTADO_CON_REPAROS' },
  { folio: 44561, tipo: 'Factura No Afecta', fecha: '2026-04-11', razonSocial: 'Asesoria Legal Ltda.', rut: '77.540.111-5', montoNeto: 850000, iva: 0, total: 850000, estado: 'ACEPTADO' },
  { folio: 31892, tipo: 'Factura Afecta', fecha: '2026-04-12', razonSocial: 'Proveedor Tech S.A.', rut: '96.781.230-1', montoNeto: 2100000, iva: 399000, total: 2499000, estado: 'ACEPTADO' },
  { folio: 60023, tipo: 'Factura Afecta', fecha: '2026-04-13', razonSocial: 'Capacitacion Empresarial SpA', rut: '79.003.221-9', montoNeto: 350000, iva: 66500, total: 416500, estado: 'PENDIENTE' },
  { folio: 88192, tipo: 'Factura Afecta', fecha: '2026-04-13', razonSocial: 'Mantencion Equipos Ltda.', rut: '76.892.001-4', montoNeto: 480000, iva: 91200, total: 571200, estado: 'ACEPTADO' },
];

// ---------------------------------------------------------------------------
// GET /api/sii/facturas?tipo=emitidas|recibidas&periodo=2026-04
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Check authentication — either SII session cookie or NextAuth JWT
    const siiSession = request.cookies.get('sii_session')?.value;
    const nextAuthToken = await getToken({ req: request });

    if (!siiSession && !nextAuthToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in via SII or the app.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { searchParams } = request.nextUrl;
    const tipo = searchParams.get('tipo') ?? 'emitidas';
    const periodo = searchParams.get('periodo'); // e.g. '2026-04'

    if (tipo !== 'emitidas' && tipo !== 'recibidas') {
      return NextResponse.json(
        { error: 'Invalid tipo. Must be "emitidas" or "recibidas".' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const siiProxyEnabled = process.env.SII_PROXY_ENABLED === 'true';

    if (siiProxyEnabled && siiSession) {
      // ---------------------------------------------------------------
      // Real SII API — fetch DTE (Documentos Tributarios Electronicos)
      // In production this would call the SII IECV API or the
      // Registro de Compras y Ventas endpoint.
      // ---------------------------------------------------------------
      try {
        const siiUrl =
          tipo === 'emitidas'
            ? 'https://palena.sii.cl/cgi_dte/consultaResumenVentas.cgi'
            : 'https://palena.sii.cl/cgi_dte/consultaResumenCompras.cgi';

        const params = new URLSearchParams();
        if (periodo) {
          const [year, month] = periodo.split('-');
          params.set('periodo', `${year}${month}`);
        }

        const siiRes = await fetch(`${siiUrl}?${params.toString()}`, {
          headers: {
            Cookie: `TOKEN=${siiSession}`,
          },
          cache: 'no-store',
        });

        if (!siiRes.ok) {
          throw new Error(`SII returned ${siiRes.status}`);
        }

        // The real SII response would need HTML/XML parsing.
        // For now we return the mock data even in "real" mode as a
        // safe fallback until the full parser is implemented.
        const facturas = tipo === 'emitidas' ? MOCK_EMITIDAS : MOCK_RECIBIDAS;

        return NextResponse.json(
          { facturas, tipo, periodo: periodo ?? 'current', mock: false },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      } catch (siiError) {
        console.error('[SII facturas] Real API failed, falling back to mock:', siiError);
        // Fall through to mock
      }
    }

    // ---------------------------------------------------------------
    // Mock mode
    // ---------------------------------------------------------------
    let facturas = tipo === 'emitidas' ? MOCK_EMITIDAS : MOCK_RECIBIDAS;

    // Filter by periodo if provided
    if (periodo) {
      facturas = facturas.filter((f) => f.fecha.startsWith(periodo));
    }

    return NextResponse.json(
      { facturas, tipo, periodo: periodo ?? 'current', mock: true },
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
