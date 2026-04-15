import { Injectable } from '@nestjs/common';
import { ISiiRepository } from '../../domain/repositories/ISiiRepository';
import { Factura, TipoDocumento, EstadoSII, calcularIva, calcularTotal } from '../../domain/entities/Factura';

/**
 * ==========================================================================
 * InMemorySiiRepository — Dev Adapter
 * ==========================================================================
 *
 * Mock implementation of ISiiRepository for development and testing.
 *
 * In production, this would be replaced by SiiApiProxyRepository, which:
 * 1. Connects to the SII SOAP/REST web services
 * 2. Uses a server-side session (never exposed to clients)
 * 3. Implements exponential backoff and circuit breaking
 * 4. Logs all access to the audit trail
 *
 * SECURITY: Even in dev mode, password is accepted but never stored or logged.
 *
 * ==========================================================================
 */
@Injectable()
export class InMemorySiiRepository implements ISiiRepository {
  // Simulates active session tokens (in-memory, lost on restart)
  private readonly activeSessions = new Map<string, { expiresAt: number }>();

  async authenticateWithClaveTributaria(rut: string, _password: string): Promise<string> {
    // Simulate network latency
    await this.delay(600);

    // NEVER store _password — it's intentionally discarded.
    // In production: POST to SII authentication endpoint with
    // the credentials and receive a session cookie.

    // Generate a mock encrypted token (in prod: AES-256-GCM encrypted SII cookie)
    const token = `sii_sess_${rut}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Store with 30-minute TTL
    this.activeSessions.set(token, { expiresAt: Date.now() + 30 * 60 * 1000 });

    return token;
  }

  async isSessionValid(encryptedToken: string): Promise<boolean> {
    const session = this.activeSessions.get(encryptedToken);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(encryptedToken);
      return false;
    }
    return true;
  }

  async getFacturasEmitidas(_token: string, rut: string, periodo: string): Promise<Factura[]> {
    await this.delay(400);
    return this.generateMockFacturas('emitidas', rut, periodo);
  }

  async getFacturasRecibidas(_token: string, rut: string, periodo: string): Promise<Factura[]> {
    await this.delay(400);
    return this.generateMockFacturas('recibidas', rut, periodo);
  }

  // ---------------------------------------------------------------------------
  // Mock data generator
  // ---------------------------------------------------------------------------

  private generateMockFacturas(
    tipo: 'emitidas' | 'recibidas',
    rut: string,
    periodo: string,
  ): Factura[] {
    const year  = parseInt(periodo.slice(0, 4));
    const month = parseInt(periodo.slice(4, 6)) - 1;

    const emisores = [
      { rut: '76.543.210-K', razon: 'Servicios Tecnológicos SPA' },
      { rut: '77.123.456-3', razon: 'Consultoría Empresarial Ltda.' },
      { rut: '96.542.890-2', razon: 'Distribuidora Industrial S.A.' },
      { rut: '82.331.000-7', razon: 'Marketing Digital SpA' },
      { rut: '79.221.445-1', razon: 'Suministros Oficina Ltda.' },
    ];

    const receptores = [
      { rut: rut + '-0', razon: 'Mi Empresa SpA' },
    ];

    const estados: EstadoSII[] = ['ACEPTADO', 'ACEPTADO', 'ACEPTADO', 'ACEPTADO_CON_REPAROS', 'PENDIENTE'];
    const tipos: TipoDocumento[] = ['FACTURA_AFECTA', 'FACTURA_AFECTA', 'FACTURA_AFECTA', 'FACTURA_NO_AFECTA'];
    const montos = [450000, 1200000, 890000, 2300000, 560000, 3400000, 780000, 1800000, 450000, 920000];

    const count = tipo === 'emitidas' ? 8 : 12;
    const facturas: Factura[] = [];

    for (let i = 0; i < count; i++) {
      const emisorIdx   = tipo === 'emitidas' ? 0 : i % emisores.length;
      const receptorIdx = tipo === 'emitidas' ? i % emisores.length : 0;

      const emisor   = tipo === 'emitidas'  ? { rut: rut, razon: 'Mi Empresa SpA' } : emisores[emisorIdx];
      const receptor = tipo === 'recibidas' ? { rut: rut, razon: 'Mi Empresa SpA' } : emisores[receptorIdx];

      const tipoDoc   = tipos[i % tipos.length];
      const montoNeto = montos[i % montos.length];
      const iva       = tipoDoc === 'FACTURA_AFECTA' ? calcularIva(montoNeto) : 0;

      facturas.push({
        folio:               1000 + i,
        tipoDocumento:       tipoDoc,
        fechaEmision:        new Date(year, month, 1 + (i * 3) % 28),
        rutEmisor:           emisor.rut,
        razonSocialEmisor:   emisor.razon,
        rutReceptor:         receptor.rut,
        razonSocialReceptor: receptor.razon,
        montoNeto,
        iva,
        montoTotal:          calcularTotal(montoNeto) - calcularIva(montoNeto) + iva,
        estado:              estados[i % estados.length],
        glosa:               tipo === 'emitidas' ? `Servicio ${i + 1} — ${periodo}` : undefined,
      });
    }

    return facturas;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}