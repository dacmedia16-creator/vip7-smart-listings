

## Auto-preenchimento de endereco pelo CEP (ViaCEP)

### O que muda

Quando o usuario digitar um CEP valido (8 digitos, com ou sem hifen), o sistema consulta a API publica ViaCEP e preenche automaticamente os campos **Endereco**, **Bairro** e **Cidade**.

### Alteracoes

**Arquivo: `src/pages/Avaliacao.tsx`**

1. Adicionar funcao `handleCepChange` que:
   - Remove caracteres nao-numericos do CEP
   - Aplica mascara automatica (formato 00000-000 conforme digita)
   - Quando atingir 8 digitos, faz fetch para `https://viacep.com.br/ws/{cep}/json/`
   - Se o CEP for valido e retornar dados, preenche automaticamente:
     - `endereco` com `logradouro`
     - `bairro` com `bairro`
     - `cidade` com `localidade`
   - Se o CEP for invalido ou nao encontrado, exibe toast de aviso

2. Substituir o campo CEP atual por versao controlada com `onChange` customizado (em vez de usar `{...field}` direto)

3. Adicionar estado `isLoadingCep` para mostrar feedback visual (spinner ou texto) enquanto busca

### Detalhes Tecnicos

- API ViaCEP e publica e gratuita, nao precisa de chave
- URL: `https://viacep.com.br/ws/{cep}/json/`
- Resposta: `{ logradouro, bairro, localidade, uf, erro? }`
- Mascara aplicada no onChange: insere hifen apos 5 digitos
- `form.setValue('endereco', data.logradouro)` para preencher campos
- Campos preenchidos automaticamente permanecem editaveis pelo usuario
- Nenhuma alteracao no backend necessaria

