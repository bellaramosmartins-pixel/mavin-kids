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
const MCQ_SECONDS = Number(process.env.MCQ_SECONDS)||60;
const TF_SECONDS = Number(process.env.TF_SECONDS)||30;
const REVEAL_SECONDS = Number(process.env.REVEAL_SECONDS)||5;
const questionSeconds = q=>q.kind==='tf'?TF_SECONDS:MCQ_SECONDS;
const QUESTIONS = [
  {mission:0,kind:'emoji',emoji:'🌧️ 🚢 🦒 🐘 🌈',text:'Qual história bíblica está nos emojis?',choices:['Moisés e o mar','Noé e a arca','Daniel na cova'],correct:1,ref:'Gênesis 6–9',detail:'Deus cuidou de Noé, de sua família e dos animais durante o dilúvio.'},
  {mission:0,kind:'emoji',emoji:'👦 🪨 🎯 🛡️',text:'Quem derrotou um gigante?',choices:['Davi','Salomão','Samuel'],correct:0,ref:'1 Samuel 17',detail:'Davi confiou em Deus ao enfrentar Golias.'},
  {mission:0,kind:'emoji',emoji:'🧔 🌊 🐟 🙏',text:'Quem passou três dias dentro de um grande peixe?',choices:['Pedro','Jonas','José'],correct:1,ref:'Jonas 1–2',detail:'Jonas orou a Deus enquanto estava dentro do grande peixe.'},
  {mission:0,kind:'emoji',emoji:'🙏 🦁 🦁 👨',text:'Quem foi protegido por Deus na cova dos leões?',choices:['Daniel','Abraão','Josué'],correct:0,ref:'Daniel 6',detail:'Deus enviou um anjo e fechou a boca dos leões.'},
  {mission:0,kind:'emoji',emoji:'👶 🧺 🌊 👸',text:'Qual bebê foi colocado em um cesto no rio?',choices:['Jesus','Isaque','Moisés'],correct:2,ref:'Êxodo 2',detail:'A mãe de Moisés o colocou em um cesto, e Deus cuidou dele.'},
  {mission:0,kind:'emoji',emoji:'🎺 🧱 🏙️ 🙌',text:'Qual cidade teve suas muralhas derrubadas?',choices:['Jericó','Belém','Nazaré'],correct:0,ref:'Josué 6',detail:'O povo obedeceu às instruções de Deus e as muralhas de Jericó caíram.'},
  {mission:1,kind:'clue',emoji:'🔎',text:'Deus pediu a Moisés que tirasse algo dos pés. O que era?',choices:['Uma coroa','As sandálias','Uma capa'],correct:1,ref:'Êxodo 3:5',detail:'Deus disse que o lugar onde Moisés estava era terra santa.'},
  {mission:1,kind:'clue',emoji:'🔎',text:'O que Noé construiu seguindo a ordem de Deus?',choices:['Uma torre','Um palácio','Uma arca'],correct:2,ref:'Gênesis 6:14',detail:'A arca abrigou Noé, sua família e muitos animais.'},
  {mission:1,kind:'clue',emoji:'🔎',text:'O que Jesus usou para enxugar os pés dos discípulos?',choices:['Uma toalha','Um cobertor','Um lenço de cabeça'],correct:0,ref:'João 13:4–5',detail:'Jesus mostrou humildade e ensinou a servir.'},
  {mission:1,kind:'clue',emoji:'🔎',text:'Com que objeto Davi enfrentou Golias?',choices:['Um arco','Uma funda','Uma lança'],correct:1,ref:'1 Samuel 17:40',detail:'Davi levou sua funda e pedras lisas.'},
  {mission:1,kind:'clue',emoji:'🔎',text:'O que um menino ofereceu, ajudando a alimentar a multidão?',choices:['Cinco pães e dois peixes','Sete maçãs','Um saco de arroz'],correct:0,ref:'João 6:9',detail:'Jesus multiplicou os pães e peixes.'},
  {mission:1,kind:'clue',emoji:'🔎',text:'O que ficou preso em um arbusto e foi oferecido no lugar de Isaque?',choices:['Um cordeiro recém-nascido','Um carneiro','Uma pomba'],correct:1,ref:'Gênesis 22:13',detail:'Abraão encontrou um carneiro preso pelos chifres.'},
  {mission:2,kind:'tf',emoji:'🎁',text:'Daniel foi lançado em uma fornalha de fogo.',choices:['Verdadeiro','Falso'],correct:1,ref:'Daniel 3 e 6',detail:'Daniel foi lançado na cova dos leões. Os três amigos foram lançados na fornalha.'},
  {mission:2,kind:'tf',emoji:'🎁',text:'Jesus nasceu em Belém.',choices:['Verdadeiro','Falso'],correct:0,ref:'Lucas 2:4–7',detail:'Maria deu à luz Jesus na cidade de Belém.'},
  {mission:2,kind:'tf',emoji:'🎁',text:'A primeira mulher se chamava Sara.',choices:['Verdadeiro','Falso'],correct:1,ref:'Gênesis 3:20',detail:'A primeira mulher se chamava Eva.'},
  {mission:2,kind:'tf',emoji:'🎁',text:'Jesus escolheu doze apóstolos.',choices:['Verdadeiro','Falso'],correct:0,ref:'Lucas 6:13',detail:'Jesus escolheu doze apóstolos entre seus discípulos.'},
  {mission:2,kind:'tf',emoji:'🎁',text:'Zaqueu subiu em uma árvore para ver Jesus.',choices:['Verdadeiro','Falso'],correct:0,ref:'Lucas 19:4',detail:'Zaqueu subiu em um sicômoro porque queria ver Jesus.'},
  {mission:2,kind:'tf',emoji:'🎁',text:'Deus criou o mundo em dez dias.',choices:['Verdadeiro','Falso'],correct:1,ref:'Gênesis 1–2',detail:'A Bíblia descreve seis dias de criação e o descanso no sétimo.'},
  {mission:3,kind:'enigma',emoji:'👑',text:'Fui uma rainha corajosa que ajudou a salvar meu povo. Quem sou?',choices:['Ester','Rute','Marta'],correct:0,ref:'Ester 4–8',detail:'Ester teve coragem para interceder pelo seu povo.'},
  {mission:3,kind:'enigma',emoji:'🌊',text:'Eu era pescador e andei sobre as águas em direção a Jesus. Quem sou?',choices:['João Batista','Pedro','Paulo'],correct:1,ref:'Mateus 14:28–31',detail:'Pedro saiu do barco e caminhou na direção de Jesus.'},
  {mission:3,kind:'enigma',emoji:'🌈',text:'Ganhei uma túnica especial e fui vendido pelos irmãos. Quem sou?',choices:['José','Samuel','Elias'],correct:0,ref:'Gênesis 37',detail:'José passou por dificuldades, mas Deus estava com ele.'},
  {mission:3,kind:'enigma',emoji:'👂',text:'Quando eu era menino, ouvi Deus chamar meu nome durante a noite. Quem sou?',choices:['Timóteo','Samuel','Gideão'],correct:1,ref:'1 Samuel 3',detail:'Samuel respondeu: “Fala, porque o teu servo ouve.”'},
  {mission:3,kind:'enigma',emoji:'🔥',text:'Orei e Deus respondeu com fogo diante dos profetas de Baal. Quem sou?',choices:['Moisés','Elias','Eliseu'],correct:1,ref:'1 Reis 18',detail:'Elias mostrou que o Senhor é Deus.'},
  {mission:3,kind:'enigma',emoji:'🌳',text:'Eu era baixinho e subi numa árvore para ver Jesus. Quem sou?',choices:['Zaqueu','Mateus','Bartimeu'],correct:0,ref:'Lucas 19:1–10',detail:'Jesus visitou Zaqueu, e a vida dele foi transformada.'}
];
const MISSIONS = [
  {name:'Portal dos Emojis',icon:'🧩',subtitle:'Decifre histórias bíblicas',time:60,points:10},
  {name:'Caça às Pistas',icon:'🔎',subtitle:'Descubra o objeto da história',time:60,points:10},
  {name:'Baús Misteriosos',icon:'🎁',subtitle:'Verdadeiro ou falso?',time:30,points:10},
  {name:'O Grande Enigma',icon:'🗝️',subtitle:'Quem é esse personagem?',time:60,points:15}
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
 return {code:room.code,phase:room.phase,questionIndex:room.index,total:QUESTIONS.length,missions:MISSIONS,now,deadline:room.deadline,question:visibleQuestion?{mission:q.mission,kind:q.kind,emoji:q.emoji,text:q.text,choices:q.choices,points:MISSIONS[q.mission].points,reference:showCorrect||isHost?q.ref:null,detail:showCorrect||isHost?q.detail:null,...((showCorrect||isHost)?{correct:q.correct}:{})}:null,participants:scores.length,answeredCount:[...room.players.values()].filter(p=>p.answers[room.index]).length,ranking: isHost? scores : (showCorrect||room.phase==='lobby'||room.phase==='ready'||room.phase==='finished' ? scores.map(({selected,...p})=>p) : scores.map(p=>({id:p.id,name:p.name,avatar:p.avatar,answered:p.answered}))),champions:room.phase==='finished'?scores.filter(p=>p.score===high):[],me:player?{id:player.id,name:player.name,avatar:player.avatar,score:player.score,answered:player.answers[room.index]?.choice??null,wasCorrect:showCorrect && player.answers[room.index]?.choice===q.correct}:null,host:isHost,seconds: q?questionSeconds(q):60,revealSeconds:REVEAL_SECONDS};
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
