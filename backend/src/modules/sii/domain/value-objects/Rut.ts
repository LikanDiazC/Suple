/**
 * ==========================================================================
 * Rut — Value Object
 * ==========================================================================
 *
 * Encapsulates a Chilean RUT (Rol Único Tributario) with full Mod-11
 * validation, normalization, and safe formatting.
 *
 * Security:
 *  - toString() returns masked version (partial RUT) to prevent accidental
 *    logging of full taxpayer identifiers.
 *  - Use toFullString() only in controlled, audited contexts.
 *
 * ==========================================================================
 */
export class Rut {
  private readonly _body: string;   // digits only (without check digit)
  private readonly _dv: string;     // check digit: 0-9 or K

  private constructor(body: string, dv: string) {
    this._body = body;
    this._dv   = dv;
  }

  // ---------------------------------------------------------------------------
  // Factory
  // ---------------------------------------------------------------------------

  static create(raw: string): Rut {
    const cleaned = raw.replace(/[\.\-\s]/g, '').toUpperCase();

    if (cleaned.length < 2) {
      throw new Error('RUT demasiado corto.');
    }

    const body = cleaned.slice(0, -1);
    const dv   = cleaned.slice(-1);

    if (!/^\d+$/.test(body)) {
      throw new Error('El cuerpo del RUT debe contener solo dígitos.');
    }

    if (!/^[0-9K]$/.test(dv)) {
      throw new Error('Dígito verificador inválido.');
    }

    if (!Rut.isValidMod11(body, dv)) {
      throw new Error('RUT inválido: dígito verificador incorrecto.');
    }

    return new Rut(body, dv);
  }

  // ---------------------------------------------------------------------------
  // Mod-11 Validation Algorithm (SII standard)
  // ---------------------------------------------------------------------------

  static isValidMod11(body: string, dv: string): boolean {
    let sum        = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      sum        += parseInt(body[i], 10) * multiplier;
      multiplier  = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const check     = 11 - remainder;

    const expectedDv =
      check === 11 ? '0' :
      check === 10 ? 'K' :
      String(check);

    return dv.toUpperCase() === expectedDv;
  }

  // ---------------------------------------------------------------------------
  // Static helper: validate without creating instance
  // ---------------------------------------------------------------------------

  static validate(raw: string): boolean {
    try {
      Rut.create(raw);
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Presentation
  // ---------------------------------------------------------------------------

  /** Formatted: XX.XXX.XXX-X */
  toFullString(): string {
    const formatted = this._body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${this._dv}`;
  }

  /** Masked for logs: XX.XXX.XXX-* (last digit hidden) */
  toString(): string {
    const formatted = this._body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-*`;
  }

  get body(): string { return this._body; }
  get dv(): string   { return this._dv;   }

  equals(other: Rut): boolean {
    return this._body === other._body && this._dv === other._dv;
  }
}
