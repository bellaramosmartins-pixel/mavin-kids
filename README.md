# Mavin Kids — Versão 8: correção do relógio

Esta versão corrige o problema em que uma criança ainda via tempo no celular, mas o servidor informava que a pergunta havia terminado.

## O que mudou
- Sincronização de horário pelo servidor (amostras de ida e volta). O relógio deixa de ser reajustado por notificações que possam chegar atrasadas.
- Tolerância de 1,8 segundo exclusivamente para a transmissão de respostas perto do final dos 30 segundos. O celular continua mostrando **30 segundos** e impede novos toques ao zerar.
- Reconsulta automática da rodada, quando chega uma resposta atrasada, para evitar ficar preso na pergunta anterior.
- Retorno do aplicativo à tela após bloquear o celular ou mudar de aplicativo atualiza a sala.
- Preservados: 30 segundos por pergunta, troca de alternativa dentro do prazo, perguntas e pontuação de 10 pontos na etapa final, avatares, placar da apresentadora, PLAY único e empates.

## Como atualizar
1. Extrair o arquivo ZIP.
2. Abrir o repositório existente `mavin-kids` no GitHub.
3. Substituir o `server.js` que está na raiz e `index.html` dentro de `public/` (enviar arquivos já com as pastas corretas). Você também pode atualizar todo o projeto, preservando sua estrutura de diretórios.
4. Salvar com Commit changes no branch main.
5. No Render, conferir Deploys > Live (ou Manual Deploy > Deploy latest commit).
6. Fechar partidas antigas e criar uma nova sala para testar.

Não envie apenas `TESTE_LOCAL.html`: ele é uma demonstração em um único navegador, sem salas multijogador.

Observação: a sala ainda fica em memória. Reinicializações do Render podem encerrar partidas. Esta atualização trata a contagem de tempo; não implementa persistência de salas.
