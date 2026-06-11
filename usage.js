import dotenv from 'dotenv';
// Carrega as variáveis de ambiente. .env.local tem prioridade sobre .env
dotenv.config({ path: '.env.local' });
dotenv.config();

import { GestaoEapSDK } from './index.js';

// Exemplo de uso do SDK do Gestão EAP.
//
// Para executar este arquivo de exemplo localmente:
// 1. Configure as variáveis de ambiente opcionais ou altere os valores no arquivo .env ou .env.local.
// 2. Execute o comando no terminal:
//    node usage.js


const baseUrl = process.env.SDK_BASE_URL || 'https://goapp.rotaria.net';
const token = process.env.SDK_ACCESS_TOKEN || 'HaHB1Twd7er0BMGZQ876kSwVWfARMOsVKga4xqjsE6gqugFeeIJzuhVqmr0pD1LZG6yTXAgKOpoezOo6R2K7XqyXwIaf75tH5tqDEA4rzLrCoOIvPVpOF56cri8c';

console.log(`Inicializando o Gestão EAP SDK...`);
console.log(`URL Base: ${baseUrl}`);
console.log(`Token: ${token ? token.substring(0, 6) + '... (oculto)' : 'indefinido'}`);

// 1. Inicializando o cliente do SDK
const sdk = new GestaoEapSDK({ baseUrl, token });

/**
 * Exemplo de inserção de uma saída única
 */
async function exemploSaidaUnica() {
  console.log('\n--- Exemplo 1: Inserindo uma única saída ---');

  const saida = {
    // ── Campos Obrigatórios ──
    CODEAP: '1700-1500-3500-00159', // Código EAP (WBS)
    CODCONTR: 65212,                // Código Livre/external_code do contrato (mais comum) ou ID UUID do contrato
    PAGO: 8600,                    // Valor pago (Custo Executado)
    DATA: '2026-06-11',            // Data no formato YYYY-MM-DD

    // ── Campos Adicionais (salvos em metadata no banco de dados) ──
    CODEMP: 'EMP-01',              // Código da Empresa
    CODIGO: `TRANS-${Date.now()}`, // Identificador único da transação (para evitar duplicidade)
    ORIGEM: 'ERP-Externo',         // Identifica a origem do lançamento
    FORNECEDOR: 'Fornecedor Exemplo LTDA',
    DOC: 'NF-12345',
    DETALHE: 'Último Pagamento de serviço de terraplenagem'
  };

  try {
    const response = await sdk.addSaida(saida);
    console.log('Resposta da requisição:', response);

    if (response.success) {
      if (response.data.action === 'ignored') {
        console.log(`⚠️ Lançamento ignorado: A transação ${saida.CODIGO} já existe.`);
      } else {
        console.log(`✅ Lançamento criado com sucesso! ID: ${response.data.id}`);
      }
    } else {
      console.error(`❌ Falha ao inserir saída:`, response.error);
    }
  } catch (error) {
    console.error('❌ Erro inesperado na chamada do SDK:', error);
  }
}

/**
 * Exemplo de inserção de saídas em lote (batch)
 */
async function exemploSaidasEmLote() {
  console.log('\n--- Exemplo 2: Inserindo saídas em lote ---');

  const batchId = Date.now();
  const saidas = [
    {
      CODEAP: '0001-0002-0003-00004',
      CODCONTR: 123,
      PAGO: 450.00,
      DATA: '2026-06-09',
      CODEMP: 'EMP-01',
      CODIGO: `TRANS-${batchId}-1`,
      FORNECEDOR: 'Fornecedor A',
      DETALHE: 'Primeiro item do lote'
    },
    {
      CODEAP: '0001-0002-0003-00005',
      CODCONTR: 123,
      PAGO: 1200.00,
      DATA: '2026-06-10',
      CODEMP: 'EMP-01',
      CODIGO: `TRANS-${batchId}-2`,
      FORNECEDOR: 'Fornecedor B',
      DETALHE: 'Segundo item do lote'
    }
  ];

  try {
    const response = await sdk.addSaidas(saidas);
    console.log('Resposta do processamento em lote:', response);

    if (response.success) {
      console.log('Processamento de lote concluído. Detalhes individuais:');
      response.data.results.forEach((item, index) => {
        if (item.success) {
          console.log(`  [Item ${index}] (${item.codigo}): Ação -> ${item.action} (ID: ${item.id})`);
        } else {
          console.error(`  [Item ${index}] (${item.codigo}) Falhou:`, item.error);
        }
      });
    } else {
      console.error('❌ Erro ao enviar lote para a API:', response.error);
    }
  } catch (error) {
    console.error('❌ Erro inesperado no lote:', error);
  }
}

// Execução das funções de exemplo
async function main() {
  await exemploSaidaUnica();
  // await exemploSaidasEmLote();
}

main().catch(console.error);
