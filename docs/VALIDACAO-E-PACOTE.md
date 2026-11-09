# Validação e pacote do projeto

A rotina automatizada do GitHub Actions usa a versão de Node definida no projeto e o lockfile Bun já mantido no repositório.

Comandos executados na validação:

- `bun install --frozen-lockfile`
- `bun run test`
- `bun run build`

Se os testes e o build terminarem sem erros, a rotina cria `anywhere-ready-web.zip` com o código-fonte e publica o arquivo como artefato do workflow.

Arquivos de ambiente (`.env` e `.env.*`), dependências instaladas, saídas de build, arquivos ZIP anteriores e logs são excluídos do pacote para evitar incluir segredos ou duplicar arquivos grandes.

O pacote do workflow fica disponível na aba **Actions > Verificar e empacotar projeto > Artifacts**.
