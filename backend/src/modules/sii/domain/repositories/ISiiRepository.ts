import { Factura } from '../entities/Factura';

/**
 * ==========================================================================
 * ISiiRepository — Hexagonal Port
 * ==========================================================================
 *
 * Defines the interface for accessing SII (Servicio de Impuestos Internos)
 * data. The concrete adapter can be an SII API proxy, an in-memory mock
 * (for dev/testing), or a cached persistence layer.
 *
 * SECURITY NOTES:
 *  - Implementations MUST NOT store raw Clave Tributaria/Clave Única tokens.
 *  - All SII session tokens passed to these methods are ephemeral and
 *    should be encrypted at rest within the session scope.
 *  - Audit logging of access is the responsibility of the controller layer.
 *
 * ==========================================================================
 */
export interface ISiiRepository {
  /**
   * Authenticate with SII using Clave Tributaria.
   * The token returned is a short-lived session token (SII cookie),
   * encrypted by the infrastructure layer before being returned.
   *
   * NEVER stores the rutBody or password.
   *
   * @returns encrypted session token (opaque string), expires in 30 min
   */
  authenticateWithClaveTributaria(rutBody: string, password: string): Promise<string>;

  /**
   * Fetch facturas emitidas (issued invoices) for the given period.
   *
   * @param encryptedToken - encrypted SII session token
   * @param rut            - taxpayer RUT (body only)
   * @param periodo        - format: AAAAMM (e.g. '202604')
   */
  getFacturasEmitidas(encryptedToken: string, rut: string, periodo: string): Promise<Factura[]>;

  /**
   * Fetch facturas recibidas (received invoices) for the given period.
   */
  getFacturasRecibidas(encryptedToken: string, rut: string, periodo: string): Promise<Factura[]>;

  /**
   * Validate that a session token is still active.
   */
  isSessionValid(encryptedToken: string): Promise<boolean>;
}

export const SII_REPOSITORY = Symbol('ISiiRepository');
