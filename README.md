# SDK GoApp (Gestão EAP) - Módulo de Saídas

Este SDK permite a integração externa com o sistema Gestão EAP para envio de dados do módulo de **Saídas (Custos Realizados)**, de forma a interagir com o banco de dados Supabase mesmo quando as portas do PostgreSQL não estão expostas externamente.

A comunicação é feita via requisições HTTP seguras à API do Gestão EAP, autenticadas por meio de um token Bearer.

---

## Requisitos

- **Node.js** v18.0.0 ou superior (o SDK usa a API nativa `fetch` do Node.js e possui **zero dependências externas**).

---

## Instalação e Configuração

### 1. Configurando o Token de Acesso

No arquivo `.env` ou `.env.local` da sua aplicação Gestão EAP, certifique-se de definir o token secreto do SDK:

```env
# SDK Integration Access Token
SDK_ACCESS_TOKEN="eap_sdk_secure_token_2026_q"
```

No sistema externo que for utilizar este SDK, você deverá informar a URL base do servidor Gestão EAP (ex: `https://goapp.rotaria.net` ou `http://localhost:3000`) e esse mesmo token.

---

## Como Usar

### Inicialização do SDK

```javascript
import { GestaoEapSDK } from "goapp-sdk";

const sdk = new GestaoEapSDK({
  baseUrl: "http://localhost:3000", // URL do servidor Gestão EAP
  token: "eap_sdk_secure_token_2026_q", // Token configurado
});
```

---

### Inserir uma Saída Única (`addSaida`)

O método `addSaida` recebe um objeto com todos os campos da saída. O SDK validará os campos obrigatórios localmente antes de enviar para o servidor.

#### Exemplo de Código

```javascript
try {
  const saida = {
    // ── Campos Obrigatórios para Processamento ──
    CODEAP: "0001-0002-0003-00004", // Código EAP completo (EEEE-DDDD-CCCC-IIIII)
    CODCONTR: 65212, // Código Livre/external_code do contrato (mais comum) ou ID UUID do contrato
    PAGO: 1500.75, // Custo Executado do pagamento desta EAP (número) (ex-TOTAL)
    DATA: "2026-06-09", // Data de pagamento (Formato AAAA-MM-DD)

    // ── Campos Adicionais (Salvos no JSON do metadata) ──
    CODEMP: "EMP-01", // Código da empresa (novo)
    CODIGO: "TRANS-998877", // Identificador Único da Saída (Evita duplicados)
    VINCULO: "Vinculo A",
    CODFREE: "CF-123",
    ORIGEM: "ERP-Externo", // Origem do lançamento (Ex: ERP, manual, etc.)
    APAGAR: "N",
    GRUPO: "Grupo Despesa",
    CNPJ: "00.000.000/0001-00",
    FORNECEDOR: "Fornecedor Exemplo LTDA",
    SERIE: "1",
    DOC: "Nota Fiscal 12345",
    DETALHE: "Pagamento referente à prestação de serviços executados na EAP",
    CHAVENFE: "35260600000000000000000000000000000000000000",
    CODITCONTR: "IT-999",
  };

  const response = await sdk.addSaida(saida);
  console.log("Resultado:", response);

  if (response.success) {
    if (response.data.action === "ignored") {
      console.log(`Lançamento ignorado: Transação ${saida.CODIGO} já existe.`);
    } else {
      console.log(`Lançamento criado com sucesso! ID: ${response.data.id}`);
    }
  } else {
    console.error("Falha ao inserir:", response.error);
  }
} catch (error) {
  console.error("Erro na chamada do SDK:", error);
}
```

---

### Inserir Saídas em Lote (`addSaidas`)

Caso precise integrar múltiplos lançamentos de uma vez, envie um array de objetos. O servidor processará cada registro sequencialmente e retornará o status individual de cada um.

#### Exemplo de Código

```javascript
try {
  const saidas = [
    {
      CODEAP: "0001-0002-0003-00004",
      CODCONTR: 123,
      PAGO: 450.0,
      DATA: "2026-06-09",
      CODEMP: "EMP-01",
      CODIGO: "TRANS-1001",
      FORNECEDOR: "Fornecedor A",
    },
    {
      CODEAP: "0001-0002-0003-00005",
      CODCONTR: 123,
      PAGO: 1200.0,
      DATA: "2026-06-10",
      CODEMP: "EMP-01",
      CODIGO: "TRANS-1002",
      FORNECEDOR: "Fornecedor B",
    },
  ];

  const response = await sdk.addSaidas(saidas);
  console.log("Resultado do Lote:", response);

  if (response.success) {
    response.data.results.forEach((item, index) => {
      if (item.success) {
        console.log(
          `Item ${index} (${item.codigo}): Ação -> ${item.action} (ID: ${item.id})`,
        );
      } else {
        console.error(`Item ${index} (${item.codigo}) falhou:`, item.error);
      }
    });
  } else {
    console.error("Erro geral no lote:", response.error);
  }
} catch (error) {
  console.error("Erro no lote:", error);
}
```

---

## Estrutura do Payload e Mapeamento no Banco de Dados

Quando uma saída é inserida com sucesso no sistema, o banco de dados `executed_output` realiza o seguinte mapeamento:

| Campo Enviado     | Tipo no SDK   | Mapeamento no Banco (`executed_output`) | Descrição                                                                                                             |
| :---------------- | :------------ | :-------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **CODEAP**        | String        | `wbsId` (UUID)                          | Validado no banco; se o código EAP existir para o contrato, seu ID UUID é associado à saída.                          |
| **CODCONTR**      | String/Number | `contractId` (UUID)                     | Resolvido para o ID UUID do contrato (busca por `externalCode`, que é o mais comum, ou por `id`).                     |
| **PAGO**          | Number        | `paidValue` (numeric)                   | Valor monetário pago referente a este custo realizado (ex-TOTAL).                                                     |
| **DATA**          | String        | `date` (date)                           | Data do pagamento. O servidor mapeará automaticamente para o período de medição correspondente.                       |
| **DETALHE**       | String        | `notes` (text)                          | Informações adicionais salvas na coluna padrão `notes`.                                                               |
| _Todos os campos_ | JSON          | `metadata` (jsonb)                      | **Todos os campos** recebidos pelo SDK (incluindo `CODEMP`, `ANO` e `MES` extraídos) são salvos na coluna `metadata`. |

### Prevenção de Duplicidade (Idempotência)

Se um campo `CODIGO` (identificador único da transação financeira) for informado, o servidor verificará antes do insert se já existe alguma saída para aquele contrato com esse `CODIGO` salvo no `metadata`.

- **Se já existir**: A inserção da saída correspondente é **ignorada** de forma a evitar duplicidades, retornando `action: 'ignored'`.
- **Se não existir**: O lançamento é inserido normalmente, retornando `action: 'created'`.
