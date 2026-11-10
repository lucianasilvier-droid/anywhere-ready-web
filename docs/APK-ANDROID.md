# Aplicativo Android — Google NFC Connect

Este pacote prepara um aplicativo Android instalável que abre o sistema web oficial dentro de uma janela nativa (Capacitor).

## Como gerar o APK

1. O workflow **Gerar APK Android** deve estar disponível na branch principal do GitHub.
2. Abra **Actions → Gerar APK Android → Run workflow**.
3. Informe o endereço HTTPS público do sistema, sem proteção SSO/login da Vercel.
4. Aguarde a compilação e baixe o artefato **google-nfc-connect-android-apk**.
5. Extraia o arquivo `app-debug.apk` e instale no Android.

O APK de depuração é assinado automaticamente para instalação e testes. Para distribuição pública em larga escala, gere uma versão release assinada com um keystore privado armazenado como segredo do GitHub.

## Observações

- O aplicativo precisa de internet, pois autenticação, banco de dados e funções continuam no servidor.
- A sessão de login é mantida pelo WebView do Android, sujeita às regras de cookies do domínio.
- Não inclui banco de dados nem credenciais no APK.
- Não publicar o site é independente da compilação do APK.
- O endereço de destino precisa estar publicado e acessível publicamente. Endereços de preview protegidos por SSO não servem para os representantes.
