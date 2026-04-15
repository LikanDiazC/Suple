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
 * BaseApiSiiRepository — Production Adapter (BaseAPI.cl)
 * ==========================================================================
 */

interface BaseApiDocument {
  "Nro"?: string;
  "Tipo Doc"?: string | number;
  "RUT Proveedor"?: string;
  "RUT Cliente"?: string;
  "RUT Receptor"?: string;
  "Razon Social"?: string;
  "Folio"?: string | number;
  "Fecha Docto"?: string;
  "Monto Exento"?: string | number;
  "Monto Neto"?: string | number;
  "Monto IVA"?: string | number;
  "Monto total"?: string | number;
  "Monto Total"?: string | number;
  [key: string]: any;
}

interface BaseApiRcvResponse {
  success: boolean;
  message?: string;
  data: {
    totalRegistros: number;
    datos: BaseApiDocument[];
    resumenPorTipo?: any[];
  } | any[]; 
}

@Injectable()
export class BaseApiSiiRepository implements ISiiRepository {
  private readonly logger = new Logger(BaseApiSiiRepository.name);
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor() {
    let envUrl = process.env.BASEAPI_URL || 'https://api.baseapi.cl';
    
    if (envUrl.startsWith('http://') && !envUrl.includes('localhost')) {
      envUrl = envUrl.replace('http://', 'https://');
    }

    envUrl = envUrl.replace(/\/+$/, '');
    envUrl = envUrl.replace(/\/api\/v1$/, '').replace(/\/v1$/, '').replace(/\/api$/, '');

    this.baseUrl = envUrl;
    this.apiToken = process.env.BASEAPI_TOKEN || '';

    if (!this.apiToken) {
      this.logger.warn('BASEAPI_TOKEN no está configurado. Llenar el header x-api-key fallará.');
    }
  }

  // =========================================================================
  // ISiiRepository implementation
  // =========================================================================

  async authenticateWithClaveTributaria(
    rutBody: string,
    password: string,
  ): Promise<string> {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const formattedRut = this.formatRutForApi(rutBody);

    try {
      this.logger.debug(`Validando credenciales para RUT ${formattedRut} en periodo ${currentPeriod}`);
      
      await this.request<BaseApiRcvResponse>(
        'POST',
        `/api/v1/sii/rcv/${currentPeriod}/compra`,
        { rut: formattedRut, password }
      );

      const token = Buffer.from(password).toString('base64');
      this.logger.log(`SII auth validada para RUT ${this.maskRut(formattedRut)}`);
      
      return token;
    } catch (error) {
      this.logger.error('Error autenticando con SII: Credenciales inválidas o servicio caído');
      throw error;
    }
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
      const password = Buffer.from(encryptedToken, 'base64').toString('utf-8');
      return password.length > 0;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // RCV data fetching
  // =========================================================================

  private async fetchRcv(
    siiToken: string,
    rut: string,
    periodo: string,
    tipo: 'emitidos' | 'recibidos',
  ): Promise<Factura[]> {
    
    let formattedPeriodo = periodo;
    if (periodo.length === 6 && !periodo.includes('-')) {
      formattedPeriodo = `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}`;
    }

    const endpointTipo = tipo === 'emitidos' ? 'venta' : 'compra';
    const password = Buffer.from(siiToken, 'base64').toString('utf-8');
    const formattedRut = this.formatRutForApi(rut);

    const response = await this.request<BaseApiRcvResponse>(
      'POST',
      `/api/v1/sii/rcv/${formattedPeriodo}/${endpointTipo}`,
      { rut: formattedRut, password }
    );

    if (!response.data || Array.isArray(response.data) || !response.data.datos) {
      this.logger.log(`RCV ${tipo}: 0 documentos para ${this.maskRut(formattedRut)} periodo ${formattedPeriodo}`);
      return [];
    }

    const documentos = response.data.datos;
    this.logger.log(`RCV ${tipo}: ${documentos.length} documentos para ${this.maskRut(formattedRut)} periodo ${formattedPeriodo}`);

    return documentos.map(doc => this.mapToFactura(doc, formattedRut, tipo));
  }

  // =========================================================================
  // Mapping
  // =========================================================================

  private mapToFactura(doc: BaseApiDocument, miRut: string, tipo: 'emitidos' | 'recibidos'): Factura {
    const tipoDocumento = this.mapTipoDocumento(Number(doc["Tipo Doc"] || 33));
    const montoNeto = Number(doc["Monto Neto"]) || 0;

    let iva = Number(doc["Monto IVA"]) || 0;
    if (tipoDocumento === 'FACTURA_AFECTA' && iva === 0 && montoNeto > 0) {
      iva = calcularIva(montoNeto);
    }

    const montoTotal = Number(doc["Monto total"] || doc["Monto Total"]) || (montoNeto + iva);

    let rutEmisor = miRut;
    let rutReceptor = doc["RUT Proveedor"] || doc["RUT Cliente"] || doc["RUT Receptor"] || '';
    let razonSocialEmisor = '';
    let razonSocialReceptor = doc["Razon Social"] || '';

    if (tipo === 'recibidos') {
      rutEmisor = doc["RUT Proveedor"] || '';
      rutReceptor = miRut;
      razonSocialEmisor = doc["Razon Social"] || '';
      razonSocialReceptor = '';
    }

    return {
      folio:               Number(doc["Folio"] || 0),
      tipoDocumento,
      fechaEmision:        this.parseDate(doc["Fecha Docto"]),
      rutEmisor,
      razonSocialEmisor,
      rutReceptor,
      razonSocialReceptor,
      montoNeto,
      iva,
      montoTotal,
      estado:              'ACEPTADO',
      glosa:               doc["Tipo Compra"] || '',
    };
  }

  private mapTipoDocumento(code: number): TipoDocumento {
    const mapped = SII_CODE_TO_TIPO[code];
    if (mapped) return mapped;
    return 'FACTURA_AFECTA';
  }

  private parseDate(dateStr: string | undefined): Date {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
    }
    return new Date(dateStr);
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  /**
   * Asegura que el RUT vaya limpio de puntos, pero estrictamente con el guion
   * antes del dígito verificador. (Ej: "123456785" o "12.345.678-5" -> "12345678-5")
   */
  private formatRutForApi(rut: string): string {
    if (!rut) return rut;
    // Quitamos todos los puntos y guiones previos
    const clean = rut.replace(/[\.\-]/g, '').toUpperCase();
    if (clean.length < 2) return rut;
    
    // Separamos el cuerpo (todo excepto el último caracter) y el dígito verificador (último caracter)
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    
    return `${body}-${dv}`;
  }

  private maskRut(rut: string): string {
    if (rut.length < 4) return '***';
    return rut.slice(0, 3) + '*'.repeat(Math.max(0, rut.length - 5)) + rut.slice(-2);
  }

  // =========================================================================
  // HTTP client (fetch-based with retry)
  // =========================================================================

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const urlString = `${this.baseUrl}${normalizedPath}`;
    
    this.logger.debug(`Llamando a la API: ${urlString}`);

    const headers: Record<string, string> = {
      'Content-Type':  'application/json',
      'x-api-key':     this.apiToken, 
      'Accept':        'application/json',
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(urlString, fetchOptions);
        const responseText = await response.text();

        if (!response.ok) {
          if (attempt === 0 && response.status >= 500) {
            await this.delay(2000);
            continue;
          }
          throw new BaseApiError(`BaseAPI HTTP ${response.status}: ${this.sanitizeErrorBody(responseText)}`, response.status);
        }

        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.success === false) {
           throw new BaseApiError(`BaseAPI Error: ${jsonResponse.message || 'Desconocido'}`, 400);
        }

        return jsonResponse as T;
      } catch (error) {
        if (error instanceof BaseApiError) throw error;
        lastError = error as Error;
        if (attempt === 0) {
          await this.delay(2000);
        }
      }
    }

    throw new BaseApiError(
      `BaseAPI request failed after 2 attempts: ${lastError?.message ?? 'unknown error'}`,
      503,
    );
  }

  private sanitizeErrorBody(body: string): string {
    return body.replace(/[\n\r]/g, ' ').slice(0, 200);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class BaseApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'BaseApiError';
  }
}