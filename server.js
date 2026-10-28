'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, 'public');
const rooms = new Map();
const PHASES = ['lobby','ready','active','revealed','finished'];
const DURATION_MIN = 10, DURATION_MAX = 90;
const MAX_BODY = 16 * 1024;
const MAX_AGE = 8 * 60 * 60 * 1000;
// Every avatar is composed of harmless indexed, built-in shapes. No uploaded images.
const AVATAR_PARTS = {skin:6,hair:8,hairColor:8,eyes:5,mouth:4,shirt:9,accessory:8,background:8};
const DEFAULT_AVATAR={skin:2,hair:0,hairColor:1,eyes:0,mouth:0,shirt:0,accessory:0,background:0};
function validAvatar(raw){
 const result={...DEFAULT_AVATAR};
 for(const [key,length] of Object.entries(AVATAR_PARTS)){
  const n=raw && raw[key];
  if(Number.isInteger(n) && n>=0 && n<length)result[key]=n;
 }
 return result;
}
function randomAvatar(){const a={};for(const [k,n] of Object.entries(AVATAR_PARTS))a[k]=crypto.randomInt(n);return a;}
const MCQ_SECONDS = Number(process.env.MCQ_SECONDS)||30;
const TF_SECONDS = Number(process.env.TF_SECONDS)||30;
const REVEAL_SECONDS = Number(process.env.REVEAL_SECONDS)||5;
const questionSeconds = q=>q.kind==='tf'?TF_SECONDS:MCQ_SECONDS;
const QUESTIONS = [
  {"mission":0,"kind":"emoji","emoji":"❔","text":"O que Eliseu fez flutuar na água?","choices":["Uma pedra","O ferro de um machado","Um vaso"],"correct":1,"ref":"2 Reis 6:5–7","detail":"Eliseu lançou um pedaço de madeira na água, e o ferro do machado flutuou."},
  {"mission":0,"kind":"emoji","emoji":"❔","text":"Quais aves Deus usou para levar comida a Elias?","choices":["Corvos","Pombas","Gaivotas"],"correct":0,"ref":"1 Reis 17:4–6","detail":"Os corvos levavam pão e carne para Elias perto do ribeiro de Querite."},
  {"mission":0,"kind":"emoji","emoji":"❔","text":"Quem deu água aos camelos do servo de Abraão?","choices":["Lia","Abigail","Rebeca"],"correct":2,"ref":"Gênesis 24:18–20","detail":"Rebeca ofereceu água ao servo de Abraão e também aos seus camelos."},
  {"mission":0,"kind":"emoji","emoji":"❔","text":"Quem explicou os sonhos do faraó sobre fartura e fome?","choices":["Arão","José","Josué"],"correct":1,"ref":"Gênesis 41:25–32","detail":"José explicou que haveria sete anos de fartura seguidos por sete anos de fome."},
  {"mission":0,"kind":"emoji","emoji":"❔","text":"Onde Pedro encontrou uma moeda, como Jesus havia orientado?","choices":["Dentro de um jarro","Debaixo de uma pedra","Na boca de um peixe"],"correct":2,"ref":"Mateus 17:27","detail":"Jesus orientou Pedro a pescar e encontrar uma moeda na boca do primeiro peixe."},
  {"mission":0,"kind":"emoji","emoji":"❔","text":"O que Deus multiplicou na casa de uma viúva por meio de Eliseu?","choices":["Azeite","Pães","Peixes"],"correct":0,"ref":"2 Reis 4:1–7","detail":"O azeite encheu várias vasilhas, ajudando a viúva a pagar suas dívidas."},
  {"mission":1,"kind":"clue","emoji":"❔","text":"Que instrumento Miriã pegou para celebrar a travessia do mar?","choices":["Uma harpa","Um tamborim","Uma flauta"],"correct":1,"ref":"Êxodo 15:20","detail":"Miriã pegou um tamborim, e as mulheres celebraram com música e dança."},
  {"mission":1,"kind":"clue","emoji":"❔","text":"O que Gideão colocou no chão para pedir a Deus um sinal?","choices":["Um pedaço de lã","Uma sandália","Uma pedra"],"correct":0,"ref":"Juízes 6:36–40","detail":"Gideão pediu sinais envolvendo o orvalho sobre um pedaço de lã."},
  {"mission":1,"kind":"clue","emoji":"❔","text":"Qual sinal Raabe amarrou na janela de sua casa?","choices":["Uma fita azul","Um ramo de oliveira","Um cordão vermelho"],"correct":2,"ref":"Josué 2:18–21","detail":"Raabe amarrou um cordão vermelho na janela conforme a orientação dos espias."},
  {"mission":1,"kind":"clue","emoji":"❔","text":"Dentro de que objeto Paulo foi descido pela muralha de Damasco?","choices":["Um barril","Um cesto","Uma caixa"],"correct":1,"ref":"Atos 9:25","detail":"Os discípulos desceram Paulo num cesto por uma abertura na muralha."},
  {"mission":1,"kind":"clue","emoji":"❔","text":"O que uma mulher derramou sobre Jesus em Betânia para honrá-lo?","choices":["Perfume precioso","Água do rio","Azeite de cozinha"],"correct":0,"ref":"Mateus 26:6–13","detail":"Uma mulher derramou perfume precioso sobre Jesus em Betânia."},
  {"mission":1,"kind":"clue","emoji":"❔","text":"O que os servos encheram de água nas bodas de Caná?","choices":["Cestos de palha","Copos de ouro","Talhas de pedra"],"correct":2,"ref":"João 2:6–9","detail":"Jesus pediu que enchessem as talhas de pedra antes de transformar água em vinho."},
  {"mission":2,"kind":"tf","emoji":"❔","text":"Rute era nora de Noemi.","choices":["Verdadeiro","Falso"],"correct":0,"ref":"Rute 1:4,16","detail":"Rute era casada com um dos filhos de Noemi e escolheu permanecer com ela."},
  {"mission":2,"kind":"tf","emoji":"❔","text":"Paulo e Silas cantaram louvores enquanto estavam presos.","choices":["Verdadeiro","Falso"],"correct":0,"ref":"Atos 16:25–26","detail":"Eles oraram e cantaram hinos a Deus na prisão."},
  {"mission":2,"kind":"tf","emoji":"❔","text":"Deus fez uma égua falar com Balaão.","choices":["Verdadeiro","Falso"],"correct":1,"ref":"Números 22:28","detail":"Segundo a Bíblia, Deus fez a jumenta de Balaão falar, não uma égua."},
  {"mission":2,"kind":"tf","emoji":"❔","text":"Na parábola, o bom samaritano ignorou o homem ferido.","choices":["Verdadeiro","Falso"],"correct":1,"ref":"Lucas 10:33–34","detail":"O samaritano teve compaixão e cuidou do homem ferido."},
  {"mission":2,"kind":"tf","emoji":"❔","text":"Salomão construiu o templo do Senhor em Jerusalém.","choices":["Verdadeiro","Falso"],"correct":0,"ref":"1 Reis 6:1","detail":"Salomão construiu o templo do Senhor em Jerusalém."},
  {"mission":2,"kind":"tf","emoji":"❔","text":"Na parábola do filho pródigo, o pai expulsou o filho quando ele voltou.","choices":["Verdadeiro","Falso"],"correct":1,"ref":"Lucas 15:20–24","detail":"O pai recebeu seu filho com alegria e preparou uma festa."},
  {"mission":3,"kind":"enigma","emoji":"❔","text":"Eu aconselhava o povo de Israel debaixo de uma palmeira. Quem sou?","choices":["Miriã","Débora","Ana"],"correct":1,"ref":"Juízes 4:4–5","detail":"Débora era profetisa e julgava Israel debaixo da palmeira de Débora."},
  {"mission":3,"kind":"enigma","emoji":"❔","text":"Eu era copeiro do rei e ajudei a reconstruir os muros de Jerusalém. Quem sou?","choices":["Neemias","Esdras","Gideão"],"correct":0,"ref":"Neemias 1:11; 2:1; 6:15","detail":"Neemias servia como copeiro do rei e liderou a reconstrução dos muros."},
  {"mission":3,"kind":"enigma","emoji":"❔","text":"Deus me enviou para orar por Saulo em Damasco, para que ele voltasse a enxergar. Quem sou?","choices":["Barnabé","Timóteo","Ananias"],"correct":2,"ref":"Atos 9:10–18","detail":"Ananias colocou as mãos sobre Saulo, e ele recuperou a visão."},
  {"mission":3,"kind":"enigma","emoji":"❔","text":"Eu só acreditei na ressurreição de Jesus depois de vê-lo. Quem sou?","choices":["Tomé","André","Filipe"],"correct":0,"ref":"João 20:24–29","detail":"Tomé disse que queria ver Jesus; depois reconheceu que ele havia ressuscitado."},
  {"mission":3,"kind":"enigma","emoji":"❔","text":"Um anjo me contou que eu teria um filho chamado João. Quem sou?","choices":["José","Zacarias","Simeão"],"correct":1,"ref":"Lucas 1:11–13","detail":"O anjo disse a Zacarias que Isabel teria um filho chamado João."},
  {"mission":3,"kind":"enigma","emoji":"❔","text":"Trabalhei fazendo tendas com Áquila e Priscila. Quem sou?","choices":["Pedro","Barnabé","Paulo"],"correct":2,"ref":"Atos 18:2–3","detail":"Paulo ficou com Áquila e Priscila porque tinham a mesma profissão: fabricar tendas."}
];
const MISSIONS = [
  {name:'Portal dos Mistérios',icon:'🧩',subtitle:'Responda aos desafios bíblicos',time:30,points:10},
  {name:'Caça às Pistas',icon:'🔎',subtitle:'Descubra o objeto da história',time:30,points:10},
  {name:'Baús Misteriosos',icon:'🎁',subtitle:'Verdadeiro ou falso?',time:30,points:10},
  {name:'O Grande Enigma',icon:'🗝️',subtitle:'Quem é esse personagem?',time:30,points:15}
];
function token(){return crypto.randomBytes(24).toString('hex');}
function roomCode(){let x; do {x=String(crypto.randomInt(100000,999999));} while(rooms.has(x)); return x;}
function cleanName(name){return String(name||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,32);}
function makeRoom(){const room={code:roomCode(),hostToken:token(),players:new Map(),listeners:new Set(),phase:'lobby',index:0,deadline:0,startedAt:0,timer:null,createdAt:Date.now(),updatedAt:Date.now()}; rooms.set(room.code,room);return room;}
function getQuestion(room){return QUESTIONS[room.index]||null;}
function serialize(room,role,playerToken){
 const now=Date.now();
 const q=getQuestion(room);
 const isHost=role==='host';
 const visibleQuestion=q && (isHost || room.phase==='active' || room.phase==='revealed' || room.phase==='finished');
 const showCorrect=room.phase==='revealed' || room.phase==='finished';
 const player=room.players.get(playerToken);
 const scores=[...room.players.values()].map(p=>({id:p.id,name:p.name,avatar:p.avatar,score:p.score,answered:p.answers[room.index]?.choice!==undefined,selected:isHost?p.answers[room.index]?.choice??null:null})).sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name,'pt-BR')); 
 let rank=0,last=null;
 scores.forEach((p,i)=>{if(p.score!==last){rank=i+1;last=p.score;}p.rank=rank;});
 const high=scores.length ? scores[0].score : null;
 return {code:room.code,phase:room.phase,questionIndex:room.index,total:QUESTIONS.length,missions:MISSIONS,now,deadline:room.deadline,question:visibleQuestion?{mission:q.mission,kind:q.kind,emoji:q.emoji,text:q.text,choices:q.choices,points:MISSIONS[q.mission].points,reference:showCorrect||isHost?q.ref:null,detail:showCorrect||isHost?q.detail:null,...((showCorrect||isHost)?{correct:q.correct}:{})}:null,participants:scores.length,answeredCount:[...room.players.values()].filter(p=>p.answers[room.index]).length,ranking: isHost? scores : (showCorrect||room.phase==='lobby'||room.phase==='ready'||room.phase==='finished' ? scores.map(({selected,...p})=>p) : scores.map(p=>({id:p.id,name:p.name,avatar:p.avatar,answered:p.answered}))),champions:room.phase==='finished'?scores.filter(p=>p.score===high):[],me:player?{id:player.id,name:player.name,avatar:player.avatar,score:player.score,answered:player.answers[room.index]?.choice??null,wasCorrect:showCorrect && player.answers[room.index]?.choice===q.correct}:null,host:isHost,seconds: q?questionSeconds(q):30,revealSeconds:REVEAL_SECONDS};
}
function broadcast(room){room.updatedAt=Date.now();for(const client of [...room.listeners]){try{client.res.write('data: '+JSON.stringify(serialize(room,client.role,client.token))+'\n\n');}catch(e){room.listeners.delete(client);}}}
function reveal(room){
 if(room.phase!=='active')return;
 clearTimeout(room.timer);room.timer=null;
 const q=getQuestion(room);
 for(const p of room.players.values()){
  const a=p.answers[room.index];
  if(a&&a.choice===q.correct)p.score+=MISSIONS[q.mission].points;
 }
 room.phase='revealed';room.deadline=Date.now()+REVEAL_SECONDS*1000;
 room.timer=setTimeout(()=>advance(room),REVEAL_SECONDS*1000);broadcast(room);
}
function advance(room){
 if(room.phase!=='revealed')return;
 clearTimeout(room.timer);room.timer=null;
 if(room.index===QUESTIONS.length-1){room.phase='finished';room.deadline=0;broadcast(room);return;}
 room.index++;startQuestion(room);
}
function startQuestion(room){
 if(!['lobby','revealed'].includes(room.phase))throw Error('Aguarde o momento correto para começar.');
 if(!getQuestion(room))throw Error('Não há mais perguntas.');
 room.phase='active';room.startedAt=Date.now();
 room.deadline=room.startedAt+questionSeconds(getQuestion(room))*1000;
 room.timer=setTimeout(()=>reveal(room),room.deadline-Date.now());broadcast(room);
}
function hostAction(room,action){
 if(action==='play'){if(room.phase!=='lobby')throw Error('A partida já começou.');if(room.players.size===0)throw Error('Espere pelo menos uma criança entrar na sala.');startQuestion(room);return;}
 if(action==='reset'){clearTimeout(room.timer);room.timer=null;room.phase='lobby';room.index=0;room.deadline=0;for(const p of room.players.values()){p.score=0;p.answers={};}broadcast(room);return;}
 throw Error('Ação desconhecida.');
}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'same-origin'});res.end(JSON.stringify(data));}
async function readBody(req){let n=0,parts=[];for await(const part of req){n+=part.length;if(n>MAX_BODY)throw Error('Requisição muito grande.');parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString()||'{}');}catch{throw Error('Dados inválidos.');}}
function handleError(res,e){send(res,400,{error:e.message||'Erro inesperado.'});}
function getRoom(code){const r=rooms.get(String(code||''));if(!r)throw Error('Sala não encontrada. Confira o código.');return r;}
function authorise(room,role,id){if(role==='host'&&id===room.hostToken)return; if(role==='player'&&room.players.has(id))return; throw Error('Não autorizado nesta sala.');}
const server=http.createServer(async(req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost');}catch{return send(res,400,{error:'URL inválida'});}
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,rooms:rooms.size});
 if(req.method==='GET'&&url.pathname==='/api/room'){try{const room=getRoom(url.searchParams.get('room'));return send(res,200,{ok:true,phase:room.phase,participants:room.players.size});}catch(e){return send(res,404,{error:e.message||'Sala não encontrada.'});}}
 if(req.method==='GET'&&url.pathname==='/api/events'){
  try{const room=getRoom(url.searchParams.get('room'));const role=url.searchParams.get('role');const t=url.searchParams.get('token');authorise(room,role,t);res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 2500\n\n');const client={role,token:t,res};room.listeners.add(client);res.write('data: '+JSON.stringify(serialize(room,role,t))+'\n\n');const ping=setInterval(()=>{if(!res.destroyed)res.write(': ping\n\n');},20000);req.on('close',()=>{clearInterval(ping);room.listeners.delete(client);});}
  catch(e){handleError(res,e);}return;
 }
 if(req.method==='POST'&&url.pathname.startsWith('/api/')){
  try{
   const b=await readBody(req);
   if(url.pathname==='/api/create'){const room=makeRoom();return send(res,200,{code:room.code,token:room.hostToken});}
   if(url.pathname==='/api/join'){
    const room=getRoom(b.room);
    if(b.token&&room.players.has(b.token)){const p=room.players.get(b.token);broadcast(room);return send(res,200,{token:p.token,name:p.name});}
    if(room.phase==='finished')throw Error('A partida já terminou.');
    const name=cleanName(b.name);if(name.length<2)throw Error('Escreva seu nome (pelo menos 2 letras).');
    const normalized=name.toLocaleLowerCase('pt-BR');if([...room.players.values()].some(p=>p.name.toLocaleLowerCase('pt-BR')===normalized))throw Error('Esse nome já está na sala. Use seu sobrenome ou uma inicial.');
    const p={token:token(),id:crypto.randomUUID(),name,avatar:validAvatar(b.avatar||randomAvatar()),score:0,answers:{}};room.players.set(p.token,p);broadcast(room);return send(res,200,{token:p.token,name:p.name});
   }
   if(url.pathname==='/api/avatar'){
    const room=getRoom(b.room);authorise(room,'player',b.token);
    if(room.phase!=='lobby')throw Error('O jogo já começou!');
    const p=room.players.get(b.token);p.avatar=validAvatar(b.avatar);broadcast(room);return send(res,200,{ok:true});
   }
   if(url.pathname==='/api/host'){
    const room=getRoom(b.room);authorise(room,'host',b.token);hostAction(room,b.action);return send(res,200,{ok:true});
   }
   if(url.pathname==='/api/answer'){
    const room=getRoom(b.room);authorise(room,'player',b.token);
    if(room.phase!=='active'||Date.now()>=room.deadline){if(room.phase==='active')reveal(room);throw Error('O tempo para responder terminou.');}
    const p=room.players.get(b.token);const q=getQuestion(room);
    if(p.answers[room.index])throw Error('Você já respondeu. Sua resposta está salva!');
    const choice=b.choice;if(!Number.isInteger(choice)||choice<0||choice>=q.choices.length)throw Error('Escolha uma resposta.');
    p.answers[room.index]={choice,at:Date.now()};broadcast(room);return send(res,200,{ok:true});
   }
   return send(res,404,{error:'Ação não encontrada.'});
  }catch(e){return handleError(res,e);}
 }
 if(req.method!=='GET')return send(res,405,{error:'Método inválido.'});
 const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(file!=='index.html' && file!=='favicon.svg')return send(res,404,{error:'Não encontrado.'});
 const f=path.join(ROOT,file);fs.readFile(f,(err,content)=>{if(err)return send(res,404,{error:'Arquivo não encontrado.'});res.writeHead(200,{'Content-Type':file.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(content);});
});
setInterval(()=>{const now=Date.now();for(const [code,room] of rooms){if(now-room.updatedAt>MAX_AGE){clearTimeout(room.timer);for(const c of room.listeners)c.res.end();rooms.delete(code);}}},60000).unref();
server.listen(PORT,()=>console.log(`Mavin Kids ao vivo em http://localhost:${PORT}`));
