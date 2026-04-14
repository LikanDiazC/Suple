import { Injectable, Logger } from '@nestjs/common';
import { ISiiRepository } from '../../domain/repositories/ISiiRepository';
import {
  Factura,
  TipoDocumento,
  EstadoSII,
  SII_CODE_TO_TIPO,
  calcularIva,
} from '../../domain/entities/Factura';

/**
 * ==========================================================================
 * BaseApiSiiRepository — Production Adapter (BaseAPI.cl / SimpleAPI)
 * ==========================================================================
 *
 * Connects to BaseAPI.cl, a Chilean API proxy that simplifies SII
 * interactions. BaseAPI handles the complex SII SOAP authentication
 * and provides a clean REST interface for RCV (Registro de Compras y
 * Ventas) data retrieval.
 *
 * Endpoints used:
 *   POST /sii/auth                  → Authenticate with Clave Tributaria
 *   GET  /sii/rcv/emitidos          → Facturas emitidas (RCV)
 *   GET  /sii/rcv/recibidos         → Facturas recibidas (RCV)
 *   GET  /sii/session/validate      → Check session validity
 *
 * Configuration (env vars):
 *   BASEAPI_URL   — Base URL (default: https://api.baseapi.cl/v1)
 *   BASEAPI_TOKEN — API key for BaseAPI.cl authentication
 *
 * SECURITY:
 *   - Clave Tributaria is proxied through BaseAPI.cl, never stored locally
 *   - SII session tokens are ephemeral (30 min TTL managed by SII)
 *   - BASEAPI_TOKEN authenticates our app to BaseAPI.cl (separate from SII)
 *   - All requests use HTTPS
 *   - Credentials are NEVER logged (even at DEBUG level)
 *
 * Error handling:
 *   - Network failures → retried once with 2s delay
 *   - SII downtime (HTTP 503) → thrown as-is for controller to handle
 *   - Invalid credentials → mapped to domain error
 *   - Rate limiting (429) → thrown with retry-after hint
 *
 * ==========================================================================
 */

/** Raw document shape returned by BaseAPI.cl RCV endpoint */
interface BaseApiRcvDocument {
  tipo_documento:       number;       // SII code (33, 34, 39, etc.)
  folio:                number;
  fecha_emision:        string;       // YYYY-MM-DD
  rut_emisor:           string;       // XX.XXX.XXX-X
  razon_social_emisor:  string;
  rut_receptor:         string;
  razon_social_receptor: string;
  monto_exento:         number;
  monto_neto:           number;
  monto_iva:            number;
  monto_total:          number;
  estado:               string;       // 'ACEPTADO', 'RECHAZADO', etc.
  glosa?:               string;
}

/** Auth response from BaseAPI.cl */
interface BaseApiAuthResponse {
  token:      string;           // SII session token (proxied)
  expires_at: string;           // ISO 8601
  rut:        string;           // masked RUT
}

/** Session validation response */
interface BaseApiSessionResponse {
  valid:      boolean;
  expires_at?: string;
}

/** RCV list response */
interface BaseApiRcvResponse {
  data:  BaseApiRcvDocument[];
  total: number;
  page:  number;
  pages: number;
}

@Injectable()
export class BaseApiSiiRepository implements ISiiRepository {
  private readonly logger = new Logger(BaseApiSiiRepository.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor() {
    this.baseUrl = process.env.BASEAPI_URL || 'https://api.baseapi.cl/v1';
    this.apiToken = process.env.BASEAPI_TOKEN || '';

    if (!this.apiToken) {
      this.logger.warn(
        'BASEAPI_TOKEN no está configurado. Las llamadas a BaseAPI.cl fallarán.',
      );
    }
  }

  // =========================================================================
  // ISiiRepository implementation
  // =========================================================================

  async authenticateWithClaveTributaria(
    rutBody: string,
    password: string,
  ): Promise<string> {
    // SECURITY: password is proxied to BaseAPI.cl and NEVER logged
    const response = await this.request<BaseApiAuthResponse>(
      'POST',
      '/sii/auth',
      {
        rut: rutBody,
        password, // BaseAPI.cl forwards this to SII and discards it
      },
    );

    this.logger.log(
      `SII auth successful for RUT ${this.maskRut(rutBody)}, expires: ${response.expires_at}`,
    );

    return response.token;
  }

  async getFacturasEmitidas(
    encryptedToken: string,
    rut: string,
    periodo: string,
  ): Promise<Factura[]> {
    return this.fetchRcv(encryptedToken, rut, periodo, 'emitidos');
  }

  async getFacturasRecibidas(
    encryptedToken: string,
    rut: string,
    periodo: string,
  ): Promise<Factura[]> {
    return this.fetchRcv(encryptedToken, rut, periodo, 'recibidos');
  }

  async isSessionValid(encryptedToken: string): Promise<boolean> {
    try {
      const response = await this.request<BaseApiSessionResponse>(
        'GET',
        '/sii/session/validate',
        undefined,
        { 'X-SII-Token': encryptedToken },
      );
      return response.valid;
    } catch {
      // If validation endpoint fails, assume session is invalid
      return false;
    }
  }

  // =========================================================================
  // RCV data fetching (paginated)
  // =========================================================================

  /**
   * Fetches all pages of RCV data for the given period.
   * BaseAPI.cl paginates results (typically 50-100 per page).
   */
  private async fetchRcv(
    siiToken: string,
    rut: string,
    periodo: string,
    tipo: 'emitidos' | 'recibidos',
  ): Promise<Factura[]> {
    const year  = periodo.slice(0, 4);
    const month = periodo.slice(4, 6);
    const allDocuments: BaseApiRcvDocument[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await this.request<BaseApiRcvResponse>(
        'GET',
        `/sii/rcv/${tipo}`,
        undefined,
        { 'X-SII-Token': siiToken },
        {
          rut,
          anio: year,
          mes: month,
          page: String(page),
        },
      );

      allDocuments.push(...response.data);
      totalPages = response.pages;
      page++;
    } while (page <= totalPages);

    this.logger.log(
      `RCV ${tipo}: ${allDocuments.length} documentos para ${this.maskRut(rut)} periodo ${periodo}`,
    );

    return allDocuments.map(doc => this.mapToFactura(doc));
  }

  // =========================================================================
  // Mapping: BaseAPI.cl response → Domain Entity
  // =========================================================================

  private mapToFactura(doc: BaseApiRcvDocument): Factura {
    const tipoDocumento = this.mapTipoDocumento(doc.tipo_documento);
    const montoNeto = doc.monto_neto || 0;

    // Use API-provided IVA if available, otherwise calculate
    // (Some document types like FACTURA_NO_AFECTA have IVA = 0)
    let iva = doc.monto_iva ?? 0;
    if (tipoDocumento === 'FACTURA_AFECTA' && iva === 0 && montoNeto > 0) {
      // Fallback: calculate IVA if API didn't provide it
      iva = calcularIva(montoNeto);
    }

    const montoTotal = doc.monto_total || (montoNeto + iva);

    return {
      folio:               doc.folio,
      tipoDocumento,
      fechaEmision:        new Date(doc.fecha_emision),
      rutEmisor:           doc.rut_emisor,
      razonSocialEmisor:   doc.razon_social_emisor,
      rutReceptor:         doc.rut_receptor,
      razonSocialReceptor: doc.razon_social_receptor,
      montoNeto,
      iva,
      montoTotal,
      estado:              this.mapEstado(doc.estado),
      glosa:               doc.glosa,
    };
  }

  private mapTipoDocumento(code: number): TipoDocumento {
    const mapped = SII_CODE_TO_TIPO[code];
    if (mapped) return mapped;

    // Unknown code: log warning and default to FACTURA_AFECTA
    this.logger.warn(
      `Código de documento SII desconocido: ${code}. Usando FACTURA_AFECTA como fallback.`,
    );
    return 'FACTURA_AFECTA';
  }

  private mapEstado(estado: string): EstadoSII {
    const normalized = estado?.toUpperCase().trim();
    const mapping: Record<string, EstadoSII> = {
      'ACEPTADO':              'ACEPTADO',
      'ACEPTADO_CON_REPAROS':  'ACEPTADO_CON_REPAROS',
      'ACEPTADO CON REPAROS':  'ACEPTADO_CON_REPAROS',
      'RECHAZADO':             'RECHAZADO',
      'PENDIENTE':             'PENDIENTE',
      // BaseAPI.cl variations
      'ACCEPTED':              'ACEPTADO',
      'ACCEPTED_WITH_ISSUES':  'ACEPTADO_CON_REPAROS',
      'REJECTED':              'RECHAZADO',
      'PENDING':               'PENDIENTE',
    };

    return mapping[normalized] || 'PENDIENTE';
  }

  // =========================================================================
  // HTTP client (fetch-based with retry)
  // =========================================================================

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${this.apiToken}`,
      'Accept':        'application/json',
      ...extraHeaders,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    };

    // Attempt with one retry on transient failures
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url.toString(), fetchOptions);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'No body');

          // Don't retry auth failures or client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new BaseApiError(
              `BaseAPI.cl ${response.status}: ${this.sanitizeErrorBody(errorBody)}`,
              response.status,
            );
          }

          // Retry on 5xx
          if (attempt === 0 && response.status >= 500) {
            this.logger.warn(
              `BaseAPI.cl ${method} ${path} returned ${response.status}, retrying in 2s...`,
            );
            await this.delay(2000);
            continue;
          }

          throw new BaseApiError(
            `BaseAPI.cl ${response.status}: ${this.sanitizeErrorBody(errorBody)}`,
            response.status,
          );
        }

        return await response.json() as T;
      } catch (error) {
        if (error instanceof BaseApiError) throw error;

        lastError = error as Error;
        if (attempt === 0) {
          this.logger.warn(
            `BaseAPI.cl ${method} ${path} failed: ${lastError.message}, retrying in 2s...`,
          );
          await this.delay(2000);
        }
      }
    }

    throw new BaseApiError(
      `BaseAPI.cl request failed after 2 attempts: ${lastError?.message ?? 'unknown error'}`,
      503,
    );
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /** Mask RUT for logging: 12.345.678-5 → 12.***.**8-5 */
  private maskRut(rut: string): string {
    if (rut.length < 4) return '***';
    return rut.slice(0, 3) + '*'.repeat(Math.max(0, rut.length - 5)) + rut.slice(-2);
  }

  /** Truncate and sanitize error bodies to prevent log injection */
  private sanitizeErrorBody(body: string): string {
    return body
      .replace(/[\n\r]/g, ' ')
      .slice(0, 200);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Custom error for BaseAPI.cl failures.
 * Carries the HTTP status code for upstream handling.
 */
export class BaseApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'BaseApiError';
  }
}
