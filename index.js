/**
 * Gestão EAP Node.js SDK
 * Zero-dependency client to interact with the Gestão EAP API.
 */
export class GestaoEapSDK {
  /**
   * Instantiate the Gestão EAP SDK client.
   * @param {Object} config
   * @param {string} config.baseUrl - The base URL of the Next.js application (e.g. http://localhost:3000 or https://goapp.rotaria.net)
   * @param {string} config.token - The authorization Bearer access token
   */
  constructor({ baseUrl, token }) {
    if (!baseUrl) {
      throw new Error('GestaoEapSDK Configuration Error: baseUrl is required.');
    }
    if (!token) {
      throw new Error('GestaoEapSDK Configuration Error: token is required.');
    }

    // Strip trailing slash if present
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  /**
   * Helper to perform HTTP POST requests.
   * @private
   */
  async _post(path, data) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const contentType = response.headers.get('content-type');
      let body;
      if (contentType && contentType.includes('application/json')) {
        body = await response.json();
      } else {
        body = { error: await response.text() };
      }

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: body.error || `HTTP error! Status: ${response.status}`,
        };
      }

      return {
        success: true,
        status: response.status,
        data: body,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Network request failed',
      };
    }
  }


  /**
   * Insert a single executed output (Saída).
   * @param {Object} saida - The Saída object
   * @param {string} saida.CODEAP - EAP Code for comparison and insertion validation (required)
   * @param {string|number} saida.CODCONTR - Contract ID (UUID) or externalCode (required)
   * @param {number} saida.PAGO - Executed cost (valor pago) (required)
   * @param {string} saida.DATA - Payment date in YYYY-MM-DD format (required)
   * @param {string} [saida.CODEMP] - Company identifier (saved in metadata)
   * @param {string} [saida.VINCULO] - Saved in metadata
   * @param {string} [saida.CODFREE] - Saved in metadata
   * @param {string} [saida.ORIGEM] - Saved in metadata (defaults to 'sdk' if not provided)
   * @param {string} [saida.CODIGO] - Unique transaction identifier used to avoid duplicates (saved in metadata)
   * @param {string} [saida.APAGAR] - Saved in metadata
   * @param {string} [saida.GRUPO] - Saved in metadata
   * @param {string} [saida.CNPJ] - Saved in metadata
   * @param {string} [saida.FORNECEDOR] - Saved in metadata
   * @param {string} [saida.SERIE] - Saved in metadata
   * @param {string} [saida.DOC] - Saved in metadata
   * @param {string} [saida.DETALHE] - Saved in metadata
   * @param {string} [saida.CHAVENFE] - Saved in metadata
   * @param {string} [saida.CODITCONTR] - Saved in metadata
   * @param {string} [saida.CODEAP_1] - Saved in metadata
   */
  async addSaida(saida) {
    if (!saida) {
      return { success: false, error: 'Saída data object is required.' };
    }
    if (!saida.CODEAP) return { success: false, error: 'CODEAP field is required.' };
    if (saida.CODCONTR === undefined || saida.CODCONTR === null) return { success: false, error: 'CODCONTR field is required.' };
    if (saida.PAGO === undefined || saida.PAGO === null) return { success: false, error: 'PAGO field is required.' };
    if (!saida.DATA) return { success: false, error: 'DATA field is required.' };

    const result = await this._post('/api/saidas', saida);
    if (!result.success) {
      return result;
    }
    return { success: true, data: result.data };
  }

  /**
   * Batch insert multiple executed outputs (Saídas).
   * @param {Array<Object>} saidasArray - Array of Saída objects
   */
  async addSaidas(saidasArray) {
    if (!Array.isArray(saidasArray)) {
      return { success: false, error: 'Input must be an array of Saída objects.' };
    }
    if (saidasArray.length === 0) {
      return { success: false, error: 'Array cannot be empty.' };
    }

    // Basic validation check on all items
    for (let i = 0; i < saidasArray.length; i++) {
      const item = saidasArray[i];
      if (!item.CODEAP || item.CODCONTR === undefined || item.CODCONTR === null || item.PAGO === undefined || item.PAGO === null || !item.DATA) {
        return {
          success: false,
          error: `Item at index ${i} is missing required fields (CODEAP, CODCONTR, PAGO, DATA).`
        };
      }
    }

    const result = await this._post('/api/saidas', saidasArray);
    if (!result.success) {
      return result;
    }
    return { success: true, data: result.data };
  }
}
