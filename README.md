# VERSÃO 6 — Sem emojis que revelam respostas 🎮

**Mudança:** todos os 24 cartões de perguntas agora usam somente o símbolo neutro ❔. A primeira missão passou a chamar **Portal dos Mistérios**. Nenhum emoji ilustra a resposta durante a pergunta. O estilo do jogo, os avatares, a decoração, as perguntas da Versão 5, as respostas, o tempo de 30 segundos, a pontuação ao vivo da apresentadora, o PLAY único e a permissão de empates foram mantidos.

**Para atualizar o GitHub/Render:** substitua `server.js` e `public/index.html` na mesma estrutura de pastas. `TESTE_LOCAL.html` é apenas para testes offline e também foi atualizado. Depois de salvar o commit, o Render poderá implantar automaticamente a nova versão. Use um momento fora da célula: a publicação reinicia o servidor e encerra salas/placares em andamento.

---

# O Grande Desafio Bíblico — Mavin Kids 💜

**VERSÃO ATUALIZADA — perguntas inéditas, 30 segundos por pergunta e placar da apresentadora. Sem senha.**

Este pacote tem duas versões, com finalidades diferentes:

## 1. Quero experimentar agora, sem servidor

Abra o arquivo **`TESTE_LOCAL.html`** com o navegador.

1. Clique em **🎤 Sou apresentadora**. A sala de demonstração será criada.
2. Clique em **👧 Testar como criança**. Digite o nome.
3. Personalize o avatar, clique em **Pronto! Entrar na sala**.
4. No topo, clique em **🎤 Ver apresentadora** e, então, em **▶ PLAY**.
5. Para responder como criança, clique no topo em **👧 Ver criança**.
6. Você pode acompanhar o relógio, a correção automática e o placar.

**Atenção:** esta demonstração funciona **somente neste navegador**. Ela não conecta celulares de pessoas em casas diferentes. É um teste real das telas e da lógica do jogo, não uma sala de internet.

## 2. Quero que as crianças joguem juntas pelos celulares

O projeto online está em `server.js`, `package.json`, `render.yaml` e `public/index.html`.
Ele precisa ser executado em um servidor **Node.js 18 ou superior** (hospedagem web). **Abrir `public/index.html` sozinho não cria uma partida compartilhada.**

### Teste em um computador com Node.js instalado

1. Abra o terminal na pasta deste projeto.
2. Execute `npm start`.
3. Abra **http://localhost:3000/** no computador.
4. Clique em **Sou apresentadora**: a sala será criada sem pedir senha.
5. Clique em **Copiar link para as crianças** e abra esse link em outra aba/janela para simular uma criança.

### Para colocar na internet (exemplo: serviço Node.js como Render)

1. Envie os arquivos de **dentro desta pasta** a um repositório no GitHub; mantenha `server.js`, `package.json`, `render.yaml` e a pasta `public/`.
2. Na plataforma de hospedagem, crie um **Web Service** Node.js conectado ao repositório. Use `npm install` (build) e `npm start` (start), conforme o serviço exigir.
3. Abra o endereço **HTTPS** que a plataforma fornecer. Não use `localhost` nem o arquivo HTML local como link da célula.
4. No site publicado, clique em **Sou apresentadora**. Você verá o link específico daquela sala. Envie esse link aos responsáveis/crianças.
5. Quem abrir o link pelo celular precisará digitar **apenas o nome** e depois personalizar o avatar: **não há campo de senha nem código da sala**.
6. Espere as crianças aparecerem no seu painel e aperte **PLAY UMA VEZ**.

A criação de contas, publicação e eventual cobrança da hospedagem dependem da plataforma e não foram feitos neste pacote. Verifique o plano disponível e faça um teste antes do encontro.

## O que ficou corrigido

- **Sou apresentadora** cria uma sala, sem senha ou login; na demonstração local, funciona sem servidor.
- **Crianças entram somente pelo link da sala**: o código já vem no link, não precisa digitar.
- **Entrada: nome → personalização do avatar → sala de espera**.
- Se o link não for de uma sala válida, a criança recebe aviso antes de personalizar o avatar.
- Uma única ação de **PLAY** inicia todo o jogo.
- **30 segundos** tanto para alternativas quanto para verdadeiro/falso. O jogo avança automaticamente após o tempo e mostra a resposta correta durante **5 segundos**.
- **24 novas perguntas** em quatro missões, placar com pontos ao lado de cada nome da criança no painel da apresentadora e ✅ para quem respondeu. Os pontos são atribuídos depois da correção automática. **Empates permitidos na premiação**.
- As crianças não veem as alternativas marcadas pelos colegas. A apresentadora tem opção de verificar detalhes das respostas **no painel dela**, mas não deve compartilhar essa parte da tela.

## Cuidados importantes

- Peça apenas o primeiro nome (ou um apelido) das crianças; evite nomes completos.
- Compartilhe o link da sala apenas com as famílias participantes.
- As salas e os pontos ficam na memória do servidor: **se ele reiniciar, a sala e o placar serão perdidos**.
- O servidor deve ficar ativo durante a partida. Plataformas de hospedagem podem ter pausa por inatividade ou limites de uso.
- O `TESTE_LOCAL.html` não sincroniza aparelhos; para várias casas use o site hospedado.

## Como atualizar seu jogo já publicado no GitHub + Render

**Não é necessário criar outro repositório nem outro Web Service.** O endereço do jogo no Render continua o mesmo.

1. No GitHub, abra o repositório `mavin-kids`. Escolha **Add file → Upload files**.
2. Envie os arquivos atualizados: `server.js`, `README.md`, `TESTE_LOCAL.html` e a pasta `public` com o `index.html` (e favicon). Arraste os arquivos **a partir da raiz da pasta deste pacote**, preservando a subpasta `public`.
3. Confira que aparece o caminho `public/index.html` (e não apenas `index.html` na raiz) e confirme em **Commit changes**.
4. No Render, o **Auto-Deploy** normalmente faz a publicação após o commit. Se estiver desabilitado, use **Manual Deploy → Deploy latest commit**. Espere o status **Live**.
5. Reabra o site do Render e teste com uma sala nova. Se o navegador mostrar a versão antiga, recarregue com Ctrl+F5.

**Atenção:** ao atualizar, o servidor é reiniciado. Isso apaga as salas e os pontos em andamento; faça a mudança fora do horário da célula.

O placar da apresentadora exibe a **pontuação acumulada** ao lado do nome e o ✅ da rodada. Pontos da resposta atual só entram após o tempo acabar e a correção aparecer, para evitar revelações antecipadas.
