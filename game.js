/* =========================================================================
   MNAC KART — Curses al Museu
   Arcade retro kart racer (Mode-7 style) set inside the MNAC museum.
   100% procedural: pixel art + chiptune generated in code. No external
   assets, no third-party characters, music or trademarks.
   ========================================================================= */
'use strict';
(function(){

/* ------------------------------ utils --------------------------------- */
const TAU = Math.PI*2;
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const lerp=(a,b,t)=>a+(b-a)*t;
const wrapAngle=a=>{while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a;};
const dist2=(x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1;return dx*dx+dy*dy;};
let seed=1234567;
const srand=s=>{seed=s>>>0||1;};
const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[(rnd()*a.length)|0];

/* ------------------------------ audio --------------------------------- */
/* Chiptune engine, 80s arcade style (reference: Black Tiger): pulse lead  */
/* with echo, fast arpeggio channel, octave-pumping bass, kick+hat drums, */
/* and a speed-driven engine drone. All notes and sounds are original.    */
const Audio8 = {
  ctx:null, master:null, musicGain:null, sfxGain:null,
  enabled:true, started:false,
  song:null, songPos:0, nextNoteTime:0, timer:null,
  init(){
    if(this.ctx) return;
    const AC = window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    this.ctx=new AC();
    this.master=this.ctx.createGain(); this.master.gain.value=0.55; this.master.connect(this.ctx.destination);
    this.musicGain=this.ctx.createGain(); this.musicGain.gain.value=0.34; this.musicGain.connect(this.master);
    this.sfxGain=this.ctx.createGain(); this.sfxGain.gain.value=0.5; this.sfxGain.connect(this.master);
  },
  resume(){ this.init(); if(this.ctx&&this.ctx.state==='suspended') this.ctx.resume(); this.started=true; },
  setEnabled(on){
    this.enabled=on;
    if(this.master) this.master.gain.value=on?0.55:0;
    const b=document.getElementById('btnSound'); if(b) b.textContent=on?'🔊':'🔇';
  },
  /* ---- SFX ---- */
  tone(f,dur,type,vol,slideTo,when){
    if(!this.ctx||!this.enabled) return;
    type=type||'square'; vol=vol==null?0.5:vol; when=when||0;
    const t=this.ctx.currentTime+when;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo),t+dur);
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t+dur+0.02);
  },
  noise(dur,vol,freq,when){
    if(!this.ctx||!this.enabled) return;
    dur=dur||0.1; vol=vol||0.3; freq=freq||1200; when=when||0;
    const t=this.ctx.currentTime+when;
    const len=Math.max(1,(dur*this.ctx.sampleRate)|0);
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=0.8;
    const g=this.ctx.createGain(); g.gain.value=vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  },
  sfx(name){
    if(!this.ctx||!this.enabled) return;
    switch(name){
      case 'coin':    this.tone(1319,.07,'square',.4); this.tone(1760,.16,'square',.4,null,.07); break;
      case 'item':    this.tone(660,.06,'square',.4); this.tone(880,.06,'square',.4,null,.06); this.tone(1320,.12,'square',.4,null,.12); break;
      case 'hit':     this.noise(.22,.5,700); this.tone(300,.24,'sawtooth',.4,60); break;
      case 'spin':    this.tone(500,.3,'square',.3,150); this.noise(.2,.25,1500,.05); break;
      case 'boost':   this.noise(.35,.4,500); this.tone(180,.35,'sawtooth',.3,720); break;
      case 'drift':   this.noise(.09,.16,2600); break;
      case 'hop':     this.tone(340,.1,'square',.35,540); break;
      case 'select':  this.tone(880,.06,'square',.4); this.tone(1175,.09,'square',.4,null,.06); break;
      case 'back':    this.tone(520,.08,'square',.35); break;
      case 'count':   this.tone(660,.16,'square',.5); this.tone(330,.16,'square',.2); break;
      case 'go':      this.tone(1320,.4,'square',.55); this.noise(.25,.3,2000); break;
      case 'lap':     this.tone(988,.1,'square',.45); this.tone(1319,.14,'square',.45,null,.1); break;
      case 'finish':  [523,659,784,1047].forEach((f,i)=>this.tone(f,.16,'square',.5,null,i*.12)); break;
      case 'podium':  [523,659,784,1047,1319,1568].forEach((f,i)=>this.tone(f,.2,'square',.5,null,i*.14)); break;
      case 'shield':  this.tone(1470,.14,'triangle',.5); break;
      case 'throw':   this.tone(760,.12,'sawtooth',.3,1400); break;
      case 'record':  [1047,1319,1568,2093].forEach((f,i)=>this.tone(f,.12,'square',.45,null,i*.09)); break;
      case 'bump':    this.noise(.1,.35,500); this.tone(140,.1,'sawtooth',.3,60); break;
      case 'offroad': this.noise(.06,.1,300); break;
    }
  },
  /* ---- music ---- */
  /* Song: {tempo, lead:[[midi,dur]...], bass:[[midi,dur]...], loop:true} */
  midi(n){ return 440*Math.pow(2,(n-69)/12); },
  playSong(song){
    this.stopSong();
    if(!this.ctx||!song) return;
    this.song=song; this.songPos=0; this.nextNoteTime=this.ctx.currentTime+0.06;
    this.timer=setInterval(()=>this.pump(),40);
  },
  stopSong(){ if(this.timer){clearInterval(this.timer);this.timer=null;} this.song=null; this.engineOff(); },
  pump(){
    if(!this.song||!this.enabled) return;
    this.engineWatch();
    const ahead=0.18;
    while(this.nextNoteTime<this.ctx.currentTime+ahead){
      const s=this.song, i=this.songPos;
      const li=i%s.lead.length, bi=i%s.bass.length;
      const beat=60/s.tempo/2; /* 8th notes */
      const L=s.lead[li], B=s.bass[bi];
      const dt=this.nextNoteTime-this.ctx.currentTime;
      const ld=L?L[1]*beat:beat;
      if(L&&L[0]>0){
        this.mnote(this.midi(L[0]),L[1]*beat,'square',.15,dt);
        this.mnote(this.midi(L[0]),L[1]*beat*.8,'square',.05,dt+beat*.75); /* echo */
      }
      if(B&&B[0]>0){
        const n=B[0], steps=Math.max(1,Math.round(B[1]));
        /* driving 8th-note bass, octave pumping */
        for(let j=0;j<steps;j++){
          const o=(j%2===1)?12:0;
          this.mnote(this.midi(n+o),beat*.9,'triangle',.3,dt+j*beat);
          if(j%2===0) this.mnote(this.midi(n+7+12),beat*.35,'square',.035,dt+j*beat);
        }
        /* fast arpeggio fill: root, 5th, octave, 5th in 16ths */
        const arp=[n+12,n+19,n+24,n+19];
        const sub=beat/2;
        for(let j=0;j<steps*2;j++){
          this.mnote(this.midi(arp[j%4]),sub*.85,'square',.045,dt+j*sub);
        }
      }
      /* drums: kick on beat, hat on off-beat */
      const t0=this.nextNoteTime;
      if(i%4===0) this.kick(t0);
      if(i%2===1) this.noiseAt(.03,.07,6000,t0);
      this.songPos++; this.nextNoteTime+=ld;
    }
  },
  kick(t){
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(45,t+.09);
    g.gain.setValueAtTime(.35,t); g.gain.exponentialRampToValueAtTime(.001,t+.12);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t+.14);
  },
  /* ---- engine drone: v = 0..1 of top speed; fades if not refreshed ---- */
  engine(v){
    if(!this.ctx||!this.enabled) return;
    v=Math.max(0,Math.min(1,v||0));
    if(!this.eng){
      const o=this.ctx.createOscillator(), o2=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type='sawtooth'; o2.type='square';
      const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=600;
      g.gain.value=0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxGain);
      o.start(); o2.start();
      this.eng={o,o2,g,f};
    }
    const t=this.ctx.currentTime, e=this.eng;
    const fr=55+v*110;
    e.o.frequency.setTargetAtTime(fr,t,.05);
    e.o2.frequency.setTargetAtTime(fr*1.5,t,.05);
    e.f.frequency.setTargetAtTime(300+v*900,t,.05);
    e.g.gain.setTargetAtTime(.025+v*.05,t,.06); /* quiet: sits under music and sfx */
    this.engT=performance.now();
  },
  engineWatch(){ if(this.eng&&performance.now()-this.engT>250) this.engineOff(); },
  engineOff(){
    if(!this.eng) return;
    const e=this.eng; this.eng=null;
    try{ const t=this.ctx.currentTime; e.g.gain.setTargetAtTime(0,t,.04);
      e.o.stop(t+.3); e.o2.stop(t+.3); }catch(_){}
  },
  mnote(f,dur,type,vol,dt){
    const t=this.ctx.currentTime+Math.max(0,dt);
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.value=f;
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur*.92);
    o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t+dur);
  },
  noiseAt(dur,vol,freq,t){
    const len=Math.max(1,(dur*this.ctx.sampleRate)|0);
    const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1);
    const src=this.ctx.createBufferSource(); src.buffer=buf;
    const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=freq;
    const g=this.ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
    src.connect(f); f.connect(g); g.connect(this.musicGain); src.start(t);
  }
};

/* ------------------------------ songs --------------------------------- */
/* 8th-note sequences; midi 0 = rest. Original compositions. */
const SONGS = {
  title:{tempo:112,
    lead:[[67,2],[72,2],[74,2],[76,4],[74,2],[72,2],[74,8],
          [67,2],[72,2],[74,2],[79,4],[76,2],[74,2],[72,8],
          [69,2],[72,2],[76,2],[77,4],[76,2],[74,2],[76,8],
          [72,2],[74,2],[76,2],[74,4],[72,2],[71,2],[72,12],[0,4]],
    bass:[[48,4],[55,4],[48,4],[55,4],[45,4],[52,4],[48,4],[55,4],
          [41,4],[48,4],[45,4],[52,4],[48,4],[55,4],[48,8],[43,4]],loop:true},
  vestibul:{tempo:138,
    lead:[[72,2],[72,2],[0,2],[76,2],[72,2],[0,2],[79,4],[76,4],
          [77,2],[77,2],[0,2],[81,2],[77,2],[0,2],[84,4],[79,4],
          [72,2],[72,2],[0,2],[76,2],[72,2],[0,2],[79,4],[76,4],
          [74,2],[76,2],[74,2],[71,2],[72,8],[0,8]],
    bass:[[48,2],[48,2],[55,2],[48,2],[52,2],[48,2],[55,2],[48,2],
          [53,2],[53,2],[60,2],[53,2],[55,2],[53,2],[60,2],[53,2],
          [48,2],[48,2],[55,2],[48,2],[52,2],[48,2],[55,2],[48,2],
          [43,2],[43,2],[50,2],[43,2],[48,4],[55,4],[48,4],[43,4]],loop:true},
  capitells:{tempo:126,
    lead:[[69,2],[0,2],[72,2],[69,2],[74,2],[0,2],[72,2],[69,2],
          [71,2],[0,2],[74,2],[71,2],[76,2],[74,2],[71,4],
          [69,2],[0,2],[72,2],[76,2],[81,2],[0,2],[79,2],[76,2],
          [77,2],[76,2],[74,2],[72,2],[69,8],[0,8]],
    bass:[[45,2],[45,2],[52,2],[45,2],[48,2],[45,2],[52,2],[45,2],
          [47,2],[47,2],[54,2],[47,2],[52,2],[47,2],[54,2],[47,2],
          [45,2],[45,2],[52,2],[45,2],[48,2],[45,2],[52,2],[45,2],
          [50,2],[48,2],[47,2],[48,2],[45,4],[52,4],[45,4],[40,4]],loop:true},
  tauell:{tempo:150,
    lead:[[76,2],[79,2],[81,4],[79,2],[76,2],[74,4],[76,4],
          [77,2],[81,2],[84,4],[81,2],[79,2],[77,4],[79,4],
          [76,2],[79,2],[81,4],[84,2],[81,2],[79,4],[81,4],
          [79,2],[76,2],[74,2],[71,2],[72,8],[0,8]],
    bass:[[40,2],[47,2],[40,2],[47,2],[43,2],[50,2],[43,2],[50,2],
          [41,2],[48,2],[41,2],[48,2],[43,2],[50,2],[43,2],[50,2],
          [40,2],[47,2],[40,2],[47,2],[43,2],[50,2],[43,2],[50,2],
          [45,2],[43,2],[41,2],[43,2],[40,4],[47,4],[40,4],[36,4]],loop:true},
  mirador:{tempo:144,
    lead:[[67,2],[71,2],[74,2],[79,4],[78,2],[76,2],[74,8],
          [66,2],[69,2],[72,2],[77,4],[76,2],[74,2],[72,8],
          [64,2],[67,2],[71,2],[76,4],[74,2],[72,2],[71,8],
          [72,2],[74,2],[76,2],[74,4],[71,2],[69,2],[67,12],[0,4]],
    bass:[[43,4],[50,4],[43,4],[50,4],[42,4],[48,4],[42,4],[48,4],
          [40,4],[47,4],[40,4],[47,4],[45,4],[52,4],[43,8],[38,4]],loop:true},
  podium:{tempo:120,
    lead:[[72,2],[76,2],[79,2],[84,6],[79,2],[84,8],
          [81,2],[84,2],[88,2],[91,6],[84,2],[88,8],
          [84,2],[79,2],[76,2],[79,2],[72,12],[0,4],[0,16]],
    bass:[[48,4],[55,4],[53,4],[48,4],[45,4],[52,4],[48,4],[55,4],
          [48,4],[55,4],[48,8],[43,4],[48,8],[0,8],[0,4]],loop:true}
};

/* --------------------------- pixel sprites ---------------------------- */
/* Sprites are drawn from string maps: each char = palette key. */
function spriteFromRows(rows,pal,scale){
  scale=scale||1;
  const h=rows.length,w=rows[0].length;
  const c=document.createElement('canvas');c.width=w*scale;c.height=h*scale;
  const x=c.getContext('2d');
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const k=rows[j][i];if(k==='.'||k===' ')continue;
    x.fillStyle=pal[k]||'#f0f';x.fillRect(i*scale,j*scale,scale,scale);
  }
  return c;
}

/* Karts are drawn top-back view (facing up = forward). 24x20 grid.      */
function kartBody(bodyCol,trimCol,driverSkin,driverHat,extra){
  const P={b:bodyCol,t:trimCol,k:'#16161e',w:'#2b2b33',l:'#4a4a55',s:driverSkin,h:driverHat,g:'#ffd75e',c:'#fff2cc'};
  const rows=[
    "........................",
    "........................",
    ".....ww..........ww.....",
    "....wllw........wllw....",
    "....wllw.bbbbbb.wllw....",
    "....wllw.bttttb.wllw....",
    ".....ww..bttttb..ww.....",
    ".........bbhhbb.........",
    "........bbhhhhbb........",
    "........bhsssshb........",
    "........bssssssb........",
    ".......bbssssssbb.......",
    "......bbttttttttbb......",
    ".....wwbttggggttbww.....",
    "....wllwbttttttbwllw....",
    "....wllwbbbbbbbbwllw....",
    "....wllw.bccccb.wllw....",
    ".....ww...bttb...ww.....",
    "..........bttb..........",
    "..........bbbb.........."];
  if(extra==='seven'){ /* AgnusDei: 7 wheels — 3+3 sides + 1 front center */
    const r=rows.slice();
    const add=(j,i)=>{const row=r[j].split('');row[i]='w';row[i+1]='l';row[i+2]='l';row[i+3]='w';r[j]=row.join('');};
    add(2,1);add(2,18);add(9,0);add(9,19);add(15,1);add(15,18);
    const f=r[0].split('');f.splice(10,4,'w','l','l','w');r[0]=f.join('');
    return spriteFromRows(r,P,2);
  }
  if(extra==='wings'){ /* Serafí: little wings */
    const r=rows.slice();
    const wing=(j,i0,i1)=>{const row=r[j].split('');for(let i=i0;i<=i1;i++)row[i]='c';r[j]=row.join('');};
    wing(6,2,4);wing(6,19,21);wing(7,1,3);wing(7,20,22);
    return spriteFromRows(r,P,2);
  }
  if(extra==='ember'){ /* Sant Lluc: ember glow wheels */
    const P2=Object.assign({},P,{w:'#7a2b00',l:'#ff5a00'});
    return spriteFromRows(rows,P2,2);
  }
  return spriteFromRows(rows,P,2);
}

/* Portrait 16x16 for select screen & HUD */
function portrait(rows,pal){ return spriteFromRows(rows,pal,3); }

const DRIVERS=[
 {id:'mestre',   name:'Mestre Pintor', kart:'Cavallet V8',
  desc:'Equilibrat com una bona paleta.',
  stats:{speed:0.86,accel:0.86,grip:0.88,weight:0.9},
  body:'#c98f2e',trim:'#8a5a14',skin:'#f2c69b',hat:'#6b4a12',
  face:["....hhhhhhhh....","...hhhhhhhhhh...","..hhhhhhhhhhhh..","..hhsssssssshh..","..hsskksskkssh..","..hssssssssssh..","...ssssssssss...","...ssskkkksss...","....ssssssss....","....sbbbbbbs....","...bbbbbbbbbb...","..bbbbttbbbbbb..","..bbbttttttbbb..",".bbbbttttttbbbb.",".bbbttttttttbbb.",".bbbbttttttbbbb."],
  facePal:{h:'#6b4a12',s:'#f2c69b',k:'#241a10',b:'#c98f2e',t:'#fff2cc'}},
 {id:'serafi',   name:'Serafí', kart:'Seis Ales',
  desc:'Lleuger, accelera com un resplendor.',
  stats:{speed:0.84,accel:1.0,grip:0.9,weight:0.7},
  body:'#e8e0c8',trim:'#c9a227',skin:'#f7e3bd',hat:'#ffd75e',extra:'wings',
  face:["....cccccccc....","...cccccccccc...","..cchhhhhhhhcc..","..chhsssssshhc..","..chskksskkshc..","..cssssssssssc..","...ssssssssss...","...ssskkkksss...","....ssssssss....","....bbbbbbbb....","...bbbbbbbbbb...","..bbbbbttbbbbb..","..bbbbttttbbbb..",".bbbbttttttbbbb.",".bbbttttttttbbb.",".bbbbttttttbbbb."],
  facePal:{c:'#ffd75e',h:'#f7e3bd',s:'#f7e3bd',k:'#241a10',b:'#e8e0c8',t:'#c9a227'}},
 {id:'crist',    name:'Crist Majestat', kart:'Maiestas',
  desc:'Velocitat punta de mandorla sagrada.',
  stats:{speed:1.0,accel:0.72,grip:0.82,weight:0.95},
  body:'#8a2f2f',trim:'#ffd75e',skin:'#e8b98a',hat:'#5a3a1a',
  face:["....gggggggg....","...ghhhhhhhhg...","..ghhhhhhhhhhg..","..ghsssssssshg..","..ghskksskks....","..gsssssssssg...","...ssssssssss...","...ssskkkksss...","....ssssssss....","....bbbbbbbb....","...bbbbbbbbbb...","..bbbbttttbbbb..","..bbbttttttbbb..",".bbbbttttttbbbb.",".bbbttttttttbbb.",".bbbbttttttbbbb."],
  facePal:{g:'#ffd75e',h:'#5a3a1a',s:'#e8b98a',k:'#241a10',b:'#8a2f2f',t:'#ffd75e'}},
 {id:'santlluc', name:'Sant Lluc de les Brases Rojes', kart:'Braser Rodó',
  desc:'Ràpid i brillant; patina com una brasa.',
  stats:{speed:0.97,accel:0.85,grip:0.7,weight:0.85},extra:'ember',
  body:'#a33c00',trim:'#ff7a00',skin:'#d98f5a',hat:'#3a0f00',
  face:["....hhhhhhhh....","...hhhhhhhhhh...","..hhhhhhhhhhhh..","..hhsssssssshh..","..hsskksskkssh..","..hssssssssssh..","...ssssssssss...","...ssskkkksss...","....ssssssss....","....bbbbbbbb....","...bbbbbbbbbb...","..bbbbttttbbbb..","..bbbttttttbbb..",".bbbbttttttbbbb.",".bbbttttttttbbb.",".bbbbttttttbbbb."],
  facePal:{h:'#3a0f00',s:'#d98f5a',k:'#120600',b:'#a33c00',t:'#ff7a00'}},
 {id:'agnus',    name:'AgnusDei', kart:'Set Rodes',
  desc:'Set rodes! Agafa les corbes com ningú.',
  stats:{speed:0.78,accel:0.9,grip:1.0,weight:0.8},extra:'seven',
  body:'#f2ead2',trim:'#c9a227',skin:'#f7f0dd',hat:'#e3d9b8',
  face:["....hhhhhhhh....","...hhhhhhhhhh...","..hhhhhhhhhhhh..","..hhsssssssshh..","..hsskksskkssh..","..hssssssssssh..","...ssssssssss...","...ssskkkksss...","....ssssssss....","....bbbbbbbb....","...bbbbbbbbbb...","..bbbbttttbbbb..","..bbbttttttbbb..",".bbbbttttttbbbb.",".bbbttttttttbbb.",".bbbbttttttbbbb."],
  facePal:{h:'#e3d9b8',s:'#f7f0dd',k:'#241a10',b:'#f2ead2',t:'#c9a227'}},
 {id:'gargola',  name:'Gàrgola', kart:'Pedra Viva',
  desc:'Pesada i tossuda: aparta’t del seu camí.',
  stats:{speed:0.88,accel:0.75,grip:0.85,weight:1.15},
  body:'#6d6d75',trim:'#3f3f47',skin:'#8d8d96',hat:'#565660',
  face:["....hhhhhhhh....","...hhhhhhhhhh...","..hhhhhhhhhhhh..","..hhsssssssshh..","..hsskksskkssh..","..hssssssssssh..","...ssssssssss...","...ssskkkksss...","....ssssssss....","....bbbbbbbb....","...bbbbbbbbbb...","..bbbbttttbbbb..","..bbbttttttbbb..",".bbbbttttttbbbb.",".bbbttttttttbbb.",".bbbbttttttbbbb."],
  facePal:{h:'#565660',s:'#8d8d96',k:'#101014',b:'#6d6d75',t:'#3f3f47'}},
 {id:'musa',     name:'Musa Modernista', kart:'Flor de Ferro',
  desc:'Elegant i estable com una forja florida.',
  stats:{speed:0.87,accel:0.88,grip:0.93,weight:0.85},
  body:'#2f6d5a',trim:'#ffb000',skin:'#f2c69b',hat:'#1d4a3c',
  face:["....hhhhhhhh....","...hhhhhhhhhh...","..hhhhhhhhhhhh..","..hhsssssssshh..","..hsskksskkssh..","..hssssssssssh..","...ssssssssss...","...ssskkkksss...","....ssssssss....","....bbbbbbbb....","...bbbbbbbbbb...","..bbbbttttbbbb..","..bbbttttttbbb..",".bbbbttttttbbbb.",".bbbttttttttbbb.",".bbbbttttttbbbb."],
  facePal:{h:'#1d4a3c',s:'#f2c69b',k:'#241a10',b:'#2f6d5a',t:'#ffb000'}},
 {id:'diable',   name:'Diable de Taüll', kart:'Banyut',
  desc:'Surt disparat; aguantar-lo és un altre tema.',
  stats:{speed:0.83,accel:1.05,grip:0.72,weight:0.75},
  body:'#7a1f3d',trim:'#3d0f1f',skin:'#b03a2e',hat:'#5a1224',
  face:["....hhhhhhhh....","...hhhhhhhhhh...","..hhhhhhhhhhhh..","..hhsssssssshh..","..hsskksskkssh..","..hssssssssssh..","...ssssssssss...","...ssskkkksss...","....ssssssss....","....bbbbbbbb....","...bbbbbbbbbb...","..bbbbttttbbbb..","..bbbttttttbbb..",".bbbbttttttbbbb.",".bbbttttttttbbb.",".bbbbttttttbbbb."],
  facePal:{h:'#5a1224',s:'#b03a2e',k:'#1c0603',b:'#7a1f3d',t:'#3d0f1f'}}
];
DRIVERS.forEach(d=>{
  d.kartSprite=MNACArt.kart(d);
  d.faceSprite=MNACArt.portrait(d);
});

/* ------------------------------ tracks -------------------------------- */
/* Tiles: '.' floor  ',' floor variant  'X' wall  '#' road  '=' start     */
/*        'B' boost  'I' item  'C' coin                                    */
const TILE=64;
const T_OFFROAD=0,T_ROAD=1,T_WALL=2,T_BOOST=3,T_ITEM=4,T_START=5,T_COIN=6;
const CHAR2TILE={'.':T_OFFROAD,',':T_OFFROAD,'X':T_WALL,'#':T_ROAD,'=':T_START,'B':T_BOOST,'I':T_ITEM,'C':T_COIN};

function makeGrid(w,h){ const g=[]; for(let j=0;j<h;j++) g.push(new Array(w).fill('.')); return g; }
function stampRoad(g,wps,radius){
  const h=g.length,w=g[0].length;
  for(let i=0;i<wps.length;i++){
    const a=wps[i],b=wps[(i+1)%wps.length];
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const len=Math.hypot(dx,dy),steps=Math.ceil(len*4);
    for(let s=0;s<=steps;s++){
      const cx=a[0]+dx*s/steps,cy=a[1]+dy*s/steps;
      for(let j=Math.floor(cy-radius);j<=Math.ceil(cy+radius);j++)
        for(let ii=Math.floor(cx-radius);ii<=Math.ceil(cx+radius);ii++){
          if(j<0||ii<0||j>=h||ii>=w)continue;
          if(Math.hypot(ii+0.5-cx,j+0.5-cy)<=radius) g[j][ii]='#';
        }
    }
  }
}
function stampAt(g,tx,ty,ch,onlyOver){
  if(ty<0||tx<0||ty>=g.length||tx>=g[0].length)return;
  if(onlyOver&&g[ty][tx]!==onlyOver)return;
  g[ty][tx]=ch;
}
function stampStartLine(g,wps){
  const a=wps[0],b=wps[1];
  const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
  const px=Math.cos(ang+Math.PI/2),py=Math.sin(ang+Math.PI/2);
  for(let k=-2;k<=2;k++)
    stampAt(g,Math.round(a[0]+px*k),Math.round(a[1]+py*k),'=');
}
function stampRow(g,wps,idx,ch,count){
  for(let k=0;k<count;k++){
    const p=wps[(idx+k)%wps.length];
    stampAt(g,Math.round(p[0]),Math.round(p[1]),ch,'#');
  }
}

function segDist(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;
  let t=L2?((px-ax)*dx+(py-ay)*dy)/L2:0; t=clamp(t,0,1);
  return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));
}

const TRACKS=[
 { id:'vestibul', name:'Gran Vestíbul', song:'vestibul', laps:3,
   w:40,h:24, roadR:2.6,
   wps:[[8,19.5],[16,19.5],[26,19.5],[33,19.5],[35.5,17],[35.5,12],[35.5,6],[34,3.5],[26,3.5],[14,3.5],[5,3.5],[3.5,7],[3.5,14],[3.5,19.5]],
   itemsAt:[9], boostAt:[4], coinsAt:[2,7,12],
   obstacles:[[14,8],[19,9],[24,8],[15,14],[21,15],[25,13]],
   decor:[[14,8,'columna'],[19,9,'columna'],[24,8,'columna'],[15,14,'columna'],[21,15,'columna'],[25,13,'columna'],[20,5,'busto'],[4,21,'planta'],[37,21,'planta']],
   pal:{floorA:'#4a3a26',floorB:'#423321',roadA:'#8a7452',roadB:'#7d684a',wall:'#2e2212',wallTop:'#5a4426',skyT:'#2a1c0c',skyB:'#120b05',line:'#ffb000'} },
 { id:'capitells', name:'Sala dels Capitells', song:'capitells', laps:3,
   w:44,h:30, roadR:2.5,
   wps:[[6,25],[16,25],[24,25],[24,18],[30,18],[30,12],[36,12],[40,8],[40,4],[30,4],[20,4],[10,4],[4,8],[4,14],[10,14],[10,19],[4,22],[6,25]],
   itemsAt:[10], boostAt:[15], coinsAt:[2,5,8,13],
   obstacles:[[18,10],[24,10],[14,20],[30,22],[36,20],[18,16]],
   decor:[[18,10,'capitell'],[24,10,'capitell'],[14,20,'capitell'],[30,22,'capitell'],[36,20,'capitell'],[18,16,'vitrina'],[8,27,'planta'],[42,26,'planta']],
   pal:{floorA:'#3c3a40',floorB:'#36343a',roadA:'#6f6a60',roadB:'#655f56',wall:'#26252c',wallTop:'#4c4a55',skyT:'#241a2e',skyB:'#0e0a14',line:'#ffb000'} },
 { id:'tauell', name:'Absis de Taüll', song:'tauell', laps:3,
   w:44,h:28, roadR:2.4,
   wps:[[8,22],[16,22],[22,18],[22,14],[16,14],[10,14],[6,10],[6,5],[14,4],[24,4],[30,4],[38,5],[40,10],[36,14],[30,14],[26,18],[30,22],[36,24],[24,24],[12,24],[8,22]],
   itemsAt:[12], boostAt:[8], coinsAt:[3,10,17],
   obstacles:[[24,9],[28,9],[16,19],[20,19],[33,19],[10,19]],
   decor:[[24,9,'fresc'],[28,9,'fresc'],[16,19,'fresc'],[21,21,'vitrina'],[33,19,'fresc'],[10,19,'vitrina'],[34,8,'gargola'],[12,9,'gargola']],
   pal:{floorA:'#4d3620',floorB:'#46301b',roadA:'#93683c',roadB:'#865d35',wall:'#33200e',wallTop:'#5d3c1a',skyT:'#2e1608',skyB:'#140a04',line:'#ffb000'} },
 { id:'mirador', name:'Terrassa del Mirador', song:'mirador', laps:3,
   w:48,h:26, roadR:3.0,
   wps:[[6,20],[20,20],[34,20],[42,16],[44,10],[40,5],[28,4],[14,4],[5,8],[4,14],[6,20]],
   itemsAt:[6], boostAt:[2,9], coinsAt:[1,4,7],
   obstacles:[[24,12],[28,12],[20,12],[32,12]],
   decor:[[24,12,'fanal'],[28,12,'fanal'],[20,12,'fanal'],[32,12,'fanal'],[10,10,'planta'],[38,14,'planta'],[24,23,'busto']],
   pal:{floorA:'#2c2c3a',floorB:'#272734',roadA:'#5d5d70',roadB:'#535366',wall:'#191925',wallTop:'#3a3a4e',skyT:'#0b1026',skyB:'#05070f',line:'#ffb000',stars:true} }
];

/* Build runtime track: tile types grid + prerendered map canvas */
function buildTrack(def){
  const PAD=5;
  const off=p=>[p[0]+PAD,p[1]+PAD];
  const g=makeGrid(def.w+PAD*2,def.h+PAD*2);
  /* dark void floor all around the playfield */
  for(let j=0;j<g.length;j++)for(let i=0;i<g[0].length;i++)g[j][i]=',';
  for(let j=PAD;j<PAD+def.h;j++)for(let i=PAD;i<PAD+def.w;i++)g[j][i]='.';
  const wpsO=def.wps.map(off);
  stampRoad(g,wpsO,def.roadR);
  for(const o of def.obstacles) stampAt(g,o[0]+PAD,o[1]+PAD,'X','.');
  stampStartLine(g,wpsO);
  for(const i of def.itemsAt) stampRow(g,wpsO,i,'I',3);
  for(const b of def.boostAt) stampRow(g,wpsO,b,'B',2);
  for(const c of def.coinsAt) stampRow(g,wpsO,c,'C',3);
  /* perimeter wall */
  for(let x=PAD;x<PAD+def.w;x++){g[PAD][x]='X';g[PAD+def.h-1][x]='X';}
  for(let y=PAD;y<PAD+def.h;y++){g[y][PAD]='X';g[y][PAD+def.w-1]='X';}
  const W2=def.w+PAD*2,H2=def.h+PAD*2;
  const tiles=g.map(r=>r.map(ch=>CHAR2TILE[ch]));
  /* prerender painted map canvas, 32px/tile */
  const TS=32, mc=document.createElement('canvas');
  mc.width=W2*TS; mc.height=H2*TS;
  MNACArt.paintMap(mc,{def,tiles,g,W2,H2,TS,T:{WALL:T_WALL,ROAD:T_ROAD,START:T_START,BOOST:T_BOOST,ITEM:T_ITEM,COIN:T_COIN}});
  /* minimap */
  const mm=document.createElement('canvas'); mm.width=W2*3; mm.height=H2*3;
  const mx=mm.getContext('2d');
  for(let j=0;j<H2;j++)for(let i=0;i<W2;i++){
    const t=tiles[j][i];
    mx.fillStyle= t===T_WALL?'#000':
      (t===T_ROAD||t===T_START||t===T_BOOST||t===T_ITEM||t===T_COIN)?'#b9a88a':'#241c10';
    mx.fillRect(i*3,j*3,3,3);
  }
  /* waypoints in world units */
  const wps=wpsO.map(p=>({x:(p[0]+0.5)*TILE,y:(p[1]+0.5)*TILE}))
    .filter((p,i,a)=>i===0||Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)>1)
    .filter((p,i,a)=>i<a.length-1||Math.hypot(p.x-a[0].x,p.y-a[0].y)>1);
  const decor=def.decor.map(d=>[d[0]+PAD,d[1]+PAD,MNACArt.themedKind(d[2],def)]).concat(MNACArt.perimeter(def).map(d=>[d[0]+PAD,d[1]+PAD,d[2],1]));
  /* scenery is solid: decor pieces may not be driven through. The painted
     floor art is kept (tiles convert after the map/minimap prerender), and
     pieces sitting on the racing line itself stay passable so the AI line
     is never walled off. Perimeter bays already sit on the wall ring. */
  for(const d of decor){
    if(d[3])continue;
    const tx=d[0]|0,ty=d[1]|0;
    let dl=1/0;
    for(let i=0;i<wpsO.length;i++){
      const a=wpsO[i],b=wpsO[(i+1)%wpsO.length];
      dl=Math.min(dl,segDist(tx+0.5,ty+0.5,a[0],a[1],b[0],b[1]));
    }
    if(dl<0.95)continue;
    tiles[ty][tx]=T_WALL;
  }
  return {def,tiles,w:W2,h:H2,map:mc,minimap:mm,wps,decor,
          worldW:W2*TILE,worldH:H2*TILE};
}
function tileAt(tr,wx,wy){
  const tx=(wx/TILE)|0, ty=(wy/TILE)|0;
  if(tx<0||ty<0||tx>=tr.w||ty>=tr.h) return T_WALL;
  return tr.tiles[ty][tx];
}

/* ------------------------- decoration sprites ------------------------- */
function decorSprite(kind){
  const c=document.createElement('canvas');
  let x=c.getContext('2d');
  const pal={s:'#8a7452',d:'#4a3a26',l:'#c9b489',g:'#ffb000',w:'#fff2cc'};
  const draw=(rows,scale)=>{c.width=rows[0].length*scale;c.height=rows.length*scale;
    for(let j=0;j<rows.length;j++)for(let i=0;i<rows[0].length;i++){
      const k=rows[j][i];if(k==='.')continue;
      x.fillStyle=pal[k]||'#f0f';x.fillRect(i*scale,j*scale,scale,scale);}};
  switch(kind){
    case 'columna': draw([
      "..llll..","..llll..","..lddl..","..lddl..","..lsdl..","..lsdl..","..lsdl..","..lsdl..",
      "..lsdl..","..lsdl..","..lsdl..","..lsdl..","..lddl..",".llddll.",".llllll.",".llllll."],3); break;
    case 'capitell': draw([
      "..ssss..",".ssssss.",".sgssgs.",".ssssss.","..ssss..","..sdds..","..sdds..","..sdds..",
      "..sdds..","..sdds..",".ssddss.",".ssssss."],3); break;
    case 'fresc': draw([
      ".gggggg.",".gwwwwg.",".gwggwg.",".gwwwwg.",".gwggwg.",".gwwwwg.",".gggggg.","..dddd..",
      "..dddd..","..dddd.."],3); break;
    case 'vitrina': draw([
      ".wwwwww.",".wggggw.",".wgddgw.",".wgddgw.",".wggggw.",".wwwwww.","..dddd..","..dddd..","..dddd..",".dddddd."],3); break;
    case 'gargola': draw([
      "...dd...","..dddd..",".dddddd.",".dgddgd.",".dddddd.","..d..d..","..d..d..",".dd..dd."],3); break;
    case 'fanal': draw([
      "..gg..","..gg..","..dd..","..dd..","..dd..","..dd..",".dddd.",".dddd."],3); break;
    case 'busto': draw([
      "..ww..","..ww..",".wwww.","..dd..",".dddd.",".dddd."],4); break;
    case 'planta': draw([
      "..g.g...",".gg.gg..",".ggggg..","..ggg...","..ddd...","..ddd...",".ddddd.."],3); break;
    default: draw(["..dd..",".dddd.",".dddd.","..dd.."],3);
  }
  return c;
}
const DECOR_CACHE={};
function getDecor(kind){ return DECOR_CACHE[kind]||(DECOR_CACHE[kind]=MNACArt.decor(kind)); }

/* ------------------------------- sky ---------------------------------- */
function buildSky(def){
  return MNACArt.backdrop(def);
}
function buildSkyOld(def){
  const W=960,H=80;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d');
  const gr=x.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,def.pal.skyT); gr.addColorStop(1,def.pal.skyB);
  x.fillStyle=gr; x.fillRect(0,0,W,H);
  srand(777+def.id.length);
  if(def.pal.stars){
    x.fillStyle='#fff';
    for(let i=0;i<90;i++){const sx=rnd()*W,sy=rnd()*H*0.6;x.globalAlpha=.3+rnd()*.7;x.fillRect(sx,sy,1,1);}
    x.globalAlpha=1;
  }
  /* MNAC silhouette: long facade, two domes, campanile towers */
  x.fillStyle='rgba(0,0,0,.55)';
  const base=H-14;
  x.fillRect(0,base,W,14);
  for(let sx=0;sx<W;sx+=240){
    x.fillRect(sx+20,base-10,120,10);               /* facade block   */
    x.fillRect(sx+70,base-22,34,12);                /* drum           */
    x.beginPath();x.arc(sx+87,base-22,17,Math.PI,0);x.fill(); /* dome */
    x.fillRect(sx+8,base-18,10,18);                 /* tower L */
    x.fillRect(sx+142,base-18,10,18);               /* tower R */
    x.beginPath();x.arc(sx+13,base-18,5,Math.PI,0);x.fill();
    x.beginPath();x.arc(sx+147,base-18,5,Math.PI,0);x.fill();
  }
  x.fillStyle='rgba(255,176,0,.5)';
  for(let sx=0;sx<W;sx+=240)
    for(let wx=0;wx<8;wx++) x.fillRect(sx+28+wx*14,base-7,4,5); /* lit windows */
  return c;
}

/* ---------------------------- Mode-7 view ----------------------------- */
const VW=480, VH=270, HORIZON=104, CAM_H=66, FOCAL=110;
function renderWorld(ctx,track,cam,sky,shake){
  /* sky with parallax by camera angle */
  const skyW=sky.width;
  let off=((cam.angle/TAU)*skyW)%skyW; if(off<0)off+=skyW;
  for(let k=-1;k<=1;k++) ctx.drawImage(sky,-off+k*skyW,0,skyW,HORIZON);
  ctx.fillStyle=track.def.pal.skyB; ctx.fillRect(0,0,VW,HORIZON);
  ctx.globalAlpha=1;
  for(let k=-1;k<=1;k++) ctx.drawImage(sky,-off+k*skyW,0,skyW,HORIZON);
  /* floor via per-scanline affine */
  const cosA=Math.cos(cam.angle), sinA=Math.sin(cam.angle);
  const mw=track.map.width, mh=track.map.height;
  ctx.save();
  ctx.beginPath(); ctx.rect(0,HORIZON,VW,VH-HORIZON); ctx.clip();
  const sx0=shake?shake.x:0, sy0=shake?shake.y:0;
  for(let y=HORIZON;y<VH;y++){
    const dy=y-HORIZON+0.5;
    const dist=CAM_H*FOCAL/dy;           /* world distance of this row */
    const scale=dist/FOCAL;              /* world px per screen px     */
    const cxw=cam.x+cosA*dist - sinA*(-sx0)*scale*0+0;
    const cyw=cam.y+sinA*dist;
    /* world coords of left edge of this row */
    const lx=cxw-cosA*(VW/2)*scale + (-sinA)*(0)*scale;
    const ly=cyw-sinA*(VW/2)*scale;
    ctx.setTransform(cosA*scale,sinA*scale,-sinA*scale,cosA*scale,lx+sx0,ly+sy0);
    ctx.drawImage(track.map,0,0,mw,mh,0,y,1,1);
  }
  ctx.restore();
  ctx.setTransform(1,0,0,1,0,0);
}
/* project world point to screen; returns null when behind camera */
function project(cam,wx,wy){
  const dx=wx-cam.x, dy=wy-cam.y;
  const cosA=Math.cos(cam.angle), sinA=Math.sin(cam.angle);
  const fwd= dx*cosA+dy*sinA;         /* depth along view */
  if(fwd<10) return null;
  const side=-dx*sinA+dy*cosA;
  const scale=FOCAL/fwd;
  return {x:VW/2+side*scale, y:HORIZON+CAM_H*scale, s:scale, d:fwd};
}

/* ------------------------------- items -------------------------------- */
const ITEMS={
  pinzell:{name:'Pinzellada', icon:'🖌', desc:'Deixa una pegata de pintura fresca.'},
  llanca:{name:'Llança de Sant Jordi', icon:'➶', desc:'Persegueix el kart que tens davant.'},
  ales:{name:'Ales de Serafí', icon:'🪽', desc:'Tirada d’ala: turbo instantani.'},
  escut:{name:'Escut del Capitell', icon:'🛡', desc:'Et protegeix un temps dels cops.'}
};
function rollItem(pos){
  const r=rnd();
  if(pos<=2) return r<0.45?'pinzell':(r<0.8?'escut':'llanca');
  if(pos<=5) return r<0.35?'llanca':(r<0.65?'ales':(r<0.85?'pinzell':'escut'));
  return r<0.55?'ales':(r<0.9?'llanca':'escut');
}

/* ------------------------------- karts -------------------------------- */
const KART_R=15;
function makeKart(drv,isPlayer){
  return {
    drv,isPlayer,
    x:0,y:0,angle:0,dirAngle:0,speed:0,
    coins:0,item:null,
    spinT:0,boostT:0,shieldT:0,hopT:0,
    drift:{active:false,dir:0,charge:0,level:0},
    lap:1,wpIndex:1,progress:0,pos:1,
    finished:false,finishTime:0,
    lapStart:0,bestLap:0,lastLap:0,
    offroad:false,itemCd:0,
    aiPace:0.92+rnd()*0.1, aiItemT:0,
    wheelSpin:0
  };
}
function maxSpeed(k,ccMult){
  let m=330*k.drv.stats.speed*ccMult;
  m*=1+Math.min(k.coins,10)*0.02;
  if(k.boostT>0)m*=1.45;
  if(k.offroad)m*=0.55;
  return m;
}
function kartTile(tr,k){ return tileAt(tr,k.x,k.y); }
function roadish(t){ return t===T_ROAD||t===T_START||t===T_BOOST||t===T_ITEM||t===T_COIN; }

function stepKart(k,input,tr,dt,ccMult,race){
  const st=k.drv.stats;
  if(k.finished){ input={steer:0,drift:false,item:false,brake:false}; }
  /* AI unstick: rotate toward the waypoint in place */
  if(!k.isPlayer&&race.state==='racing'){
    if(k.aiFixT>0){
      k.aiFixT-=dt;
      const wp=tr.wps[k.wpIndex];
      const err=wrapAngle(Math.atan2(wp.y-k.y,wp.x-k.x)-k.angle);
      k.angle+=clamp(err*3,-2.4,2.4)*dt;
      k.dirAngle+=wrapAngle(k.angle-k.dirAngle)*Math.min(1,9.5*dt);
      k.speed=0;
      return;
    }
    if(k.speed<25)k.aiStuckT=(k.aiStuckT||0)+dt;else k.aiStuckT=0;
    if(k.aiStuckT>1.2){k.aiFixT=0.7;k.aiStuckT=0;}
  }
  /* spin */
  if(k.spinT>0){
    k.spinT-=dt; k.angle+=dt*14;
    k.speed=Math.max(0,k.speed-500*dt);
    moveKart(k,tr,dt,race&&race.karts);
    return;
  }
  /* acceleration (auto-accel arcade; a forward screen lean adds throttle,
     a lean back toward the player brakes, both analog) */
  const th=clamp(input.throttle||0,-1,1);
  const ms=maxSpeed(k,ccMult)*(1+0.12*Math.max(0,th));
  const acc=240*st.accel*(k.boostT>0?3:1)*(1+0.55*Math.max(0,th));
  if(input.reverse){ k.speed=Math.max(-95,k.speed-320*dt); }
  else if(input.brake){ k.speed=Math.max(0,k.speed-430*dt); }
  else if(th<0){ k.speed=Math.max(0,k.speed-430*(-th)*dt); }
  else{
    if(k.speed<ms) k.speed=Math.min(ms,k.speed+acc*dt);
    else k.speed=Math.max(ms,k.speed-180*dt);
  }
  if(k.speed<0){ /* reversing: no boost/offroad caps */ }
  if(k.offroad&&k.speed>ms) k.speed=Math.max(ms,k.speed-260*dt);
  /* steering */
  const steerFactor=clamp(k.speed/90,0,1);
  const turnRate=2.7*st.grip*(k.drift.active?1.35:1);
  if(!k.drift.active){
    k.angle+=input.steer*turnRate*steerFactor*dt;
  }else{
    k.angle+=k.drift.dir*turnRate*steerFactor*dt;
    k.drift.charge+=dt;
    const nl=k.drift.charge>1.35?2:(k.drift.charge>0.65?1:0);
    if(nl!==k.drift.level){k.drift.level=nl;if(k.isPlayer)Audio8.sfx('drift');}
    spawnSpark(k);
  }
  /* drift start */
  if(input.drift&&!k.drift.active&&k.speed>110&&!k.hopT){
    k.hopT=0.24; if(k.isPlayer)Audio8.sfx('hop');
  }
  if(k.hopT>0){
    k.hopT-=dt;
    if(k.hopT<=0&&input.drift&&Math.abs(input.steer)>0.1){
      k.drift.active=true; k.drift.dir=input.steer>0?1:-1; k.drift.charge=0; k.drift.level=0;
    }
  }
  /* drift release */
  if(!input.drift&&k.drift.active){
    if(k.drift.level===2)k.boostT=Math.max(k.boostT,0.95);
    else if(k.drift.level===1)k.boostT=Math.max(k.boostT,0.5);
    if(k.drift.level>0&&k.isPlayer)Audio8.sfx('boost');
    k.drift.active=false;k.drift.charge=0;k.drift.level=0;
  }
  /* direction follows heading with grip */
  const grip=k.drift.active?2.2:9.5;
  k.dirAngle+=wrapAngle(k.angle-k.dirAngle)*Math.min(1,grip*dt);
  /* boost pad */
  const t=kartTile(tr,k);
  if(t===T_BOOST&&k.boostT<0.6){ k.boostT=Math.max(k.boostT,0.75); if(k.isPlayer)Audio8.sfx('boost'); }
  if(t===T_ITEM&&k.itemCd<=0){ k.itemCd=0.5; }
  k.itemCd=Math.max(0,k.itemCd-dt);
  k.offroad=!roadish(t);
  if(k.offroad&&k.isPlayer&&k.speed>120&&rnd()<dt*8) Audio8.sfx('offroad');
  /* timers */
  k.boostT=Math.max(0,k.boostT-dt);
  k.shieldT=Math.max(0,k.shieldT-dt);
  /* use item */
  if(input.item&&k.item){ useItem(k,tr,race); }
  moveKart(k,tr,dt,race&&race.karts);
  /* waypoint/lap tracking: a checkpoint triggers when the kart passes it
     anywhere across the road width (crossing its plane along the track
     direction), not only within a small radius of the racing-line center;
     one checkpoint of skip-ahead tolerance unfreezes the counter if a pass
     was missed entirely. The lap counts at the start/finish line (wp 0). */
  const wps=tr.wps,N=wps.length;
  let crossed=0;
  for(let probe=0;probe<2;probe++){
    const idx=(k.wpIndex+probe)%N;
    const wp=wps[idx],pv=wps[(idx-1+N)%N];
    const sx=wp.x-pv.x,sy=wp.y-pv.y,sl=Math.hypot(sx,sy)||1;
    const ux=sx/sl,uy=sy/sl,rx=k.x-wp.x,ry=k.y-wp.y;
    const along=rx*ux+ry*uy,lat=Math.abs(rx*uy-ry*ux);
    if(rx*rx+ry*ry<130*130||(along>0&&along<320&&lat<190)){crossed=probe+1;break;}
  }
  for(let c=0;c<crossed;c++){
    k.wpIndex=(k.wpIndex+1)%N;
    if(k.wpIndex===1){ /* crossed the start/finish line */
      k.lap++;
      if(k.isPlayer&&k.lap<=race.laps){Audio8.sfx('lap');}
      const now=race.time;
      const lapT=now-k.lapStart; k.lapStart=now; k.lastLap=lapT;
      if(k.lap>1&&(!k.bestLap||lapT<k.bestLap)) k.bestLap=lapT;
      if(k.lap>race.laps&&!k.finished){
        k.finished=true; k.finishTime=now;
      }
    }
  }
  k.progress=(k.lap-1)*N+((k.wpIndex-1+N)%N);
}
/* --- wall collision: the kart body is a circle tested against wall tiles --- */
const WALL_R=KART_R*0.9;
function wallTileAt(tr,tx,ty){
  if(tx<0||ty<0||tx>=tr.w||ty>=tr.h) return T_WALL;
  return tr.tiles[ty][tx];
}
function circleHitsWall(tr,x,y,r){
  const x0=Math.floor((x-r)/TILE),x1=Math.floor((x+r)/TILE);
  const y0=Math.floor((y-r)/TILE),y1=Math.floor((y+r)/TILE);
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(wallTileAt(tr,tx,ty)!==T_WALL)continue;
    const cx=clamp(x,tx*TILE,tx*TILE+TILE),cy=clamp(y,ty*TILE,ty*TILE+TILE);
    if(dist2(x,y,cx,cy)<r*r)return true;
  }
  return false;
}
/* other karts are solid too: a move that would deepen an overlap is refused.
   The radius is a hair under full contact so karts resting in contact after
   kartContacts separation do not stick together. */
function hitsKart(others,self,x,y){
  if(!others)return false;
  const rr=KART_R*2-1;
  for(const o of others){
    if(o===self)continue;
    if(dist2(x,y,o.x,o.y)<rr*rr)return true;
  }
  return false;
}
function pushOutOfWalls(tr,k,r){
  for(let it=0;it<4;it++){
    const x0=Math.floor((k.x-r)/TILE),x1=Math.floor((k.x+r)/TILE);
    const y0=Math.floor((k.y-r)/TILE),y1=Math.floor((k.y+r)/TILE);
    let moved=false;
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
      if(wallTileAt(tr,tx,ty)!==T_WALL)continue;
      const wx0=tx*TILE,wy0=ty*TILE,wx1=wx0+TILE,wy1=wy0+TILE;
      const cx=clamp(k.x,wx0,wx1),cy=clamp(k.y,wy0,wy1);
      const dx=k.x-cx,dy=k.y-cy,d2=dx*dx+dy*dy;
      if(d2>=r*r)continue;
      if(d2<1e-8){ /* center inside the tile: exit through the nearest face */
        const L=k.x-wx0,R=wx1-k.x,Tp=k.y-wy0,B=wy1-k.y;
        const m=Math.min(L,R,Tp,B);
        if(m===L)k.x=wx0-r;else if(m===R)k.x=wx1+r;
        else if(m===Tp)k.y=wy0-r;else k.y=wy1+r;
      }else{const d=Math.sqrt(d2),need=(r-d)/d;k.x+=dx*need;k.y+=dy*need;}
      moved=true;
    }
    if(!moved)return;
  }
}
function moveKart(k,tr,dt,others){
  const dx=Math.cos(k.dirAngle)*k.speed*dt, dy=Math.sin(k.dirAngle)*k.speed*dt;
  const dist=Math.hypot(dx,dy), steps=Math.max(1,Math.ceil(dist/(WALL_R*0.5)));
  const sx=dx/steps, sy=dy/steps;
  const free=(x,y)=>!circleHitsWall(tr,x,y,WALL_R)&&!hitsKart(others,k,x,y);
  for(let s=0;s<steps;s++){
    const nx=k.x+sx, ny=k.y+sy;
    if(free(nx,ny)){k.x=nx;k.y=ny;continue;}
    if(free(nx,k.y)){k.x=nx;k.speed*=0.94;if(k.isPlayer&&Math.abs(k.speed)>150)Audio8.sfx('bump');}
    else if(free(k.x,ny)){k.y=ny;k.speed*=0.94;if(k.isPlayer&&Math.abs(k.speed)>150)Audio8.sfx('bump');}
    else if(circleHitsWall(tr,nx,ny,WALL_R)){k.speed=-k.speed*0.22;if(k.isPlayer)Audio8.sfx('bump');break;}
    else{ /* blocked by another kart alone: stop against it, never sink in */
      k.speed*=0.45;if(k.isPlayer&&Math.abs(k.speed)>120)Audio8.sfx('bump');break;}
  }
  pushOutOfWalls(tr,k,WALL_R);
}
function kartContacts(race){
  const ks=race.karts, tr=race.track;
  for(let pass=0;pass<3;pass++){
    let any=false;
    for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++){
      const a=ks[i],b=ks[j];
      if(a.spinT>0&&b.spinT>0)continue;
      const d2=dist2(a.x,a.y,b.x,b.y),rr=KART_R*2;
      if(d2<rr*rr&&d2>0.01){
        const d=Math.sqrt(d2),nx=(b.x-a.x)/d,ny=(b.y-a.y)/d,ov=(rr-d)/2;
        const wa=1/a.drv.stats.weight, wb=1/b.drv.stats.weight, wt=wa+wb;
        /* wall-safe separation: a bump may never shove a kart into a wall */
        let ax=a.x-nx*ov*2*(wa/wt), ay=a.y-ny*ov*2*(wa/wt);
        let bx=b.x+nx*ov*2*(wb/wt), by=b.y+ny*ov*2*(wb/wt);
        let aOk=!circleHitsWall(tr,ax,ay,WALL_R), bOk=!circleHitsWall(tr,bx,by,WALL_R);
        if(!aOk){ /* a stays: b takes the full separation if that is free */
          const bx2=a.x+nx*rr, by2=a.y+ny*rr;
          if(!circleHitsWall(tr,bx2,by2,WALL_R)){bx=bx2;by=by2;bOk=true;}
        }
        if(!bOk){ /* b stays: a takes the full separation if that is free */
          const ax2=b.x-nx*rr, ay2=b.y-ny*rr;
          if(!circleHitsWall(tr,ax2,ay2,WALL_R)){ax=ax2;ay=ay2;aOk=true;}
        }
        if(!aOk&&!bOk){ /* pinned between kart and wall: separate anyway,
                           pushOutOfWalls below keeps both out of the wall */
          aOk=bOk=true;
        }
        if(aOk){a.x=ax;a.y=ay;}
        if(bOk){b.x=bx;b.y=by;}
        if(pass===0){
          const bump=Math.min(a.speed,b.speed)*0.06;
          a.speed=Math.max(0,a.speed-bump*(wb/wt)*2);
          b.speed=Math.max(0,b.speed-bump*(wa/wt)*2);
          if(a.isPlayer||b.isPlayer)Audio8.sfx('bump');
        }
        any=true;
      }
    }
    for(const k of ks) pushOutOfWalls(tr,k,WALL_R);
    if(!any)break;
  }
}

/* ------------------------- items in the world ------------------------- */
function useItem(k,tr,race){
  const it=k.item; k.item=null;
  if(it==='pinzell'){
    race.slicks.push({x:k.x-Math.cos(k.angle)*30,y:k.y-Math.sin(k.angle)*30,life:14});
    if(k.isPlayer)Audio8.sfx('throw');
  }else if(it==='llanca'){
    const target=race.karts.filter(o=>o!==k&&!o.finished)
      .sort((a,b)=>b.progress-a.progress)
      .find(o=>o.progress>k.progress)||race.karts.filter(o=>o!==k).sort((a,b)=>b.progress-a.progress)[0];
    race.shots.push({x:k.x+Math.cos(k.angle)*34,y:k.y+Math.sin(k.angle)*34,angle:k.angle,speed:430,life:4.5,target,owner:k});
    if(k.isPlayer)Audio8.sfx('throw');
  }else if(it==='ales'){
    k.boostT=Math.max(k.boostT,1.15); if(k.isPlayer)Audio8.sfx('boost');
  }else if(it==='escut'){
    k.shieldT=6; if(k.isPlayer)Audio8.sfx('shield');
  }
}
function hitKart(k,withCoins){
  if(k.shieldT>0){k.shieldT=0;Audio8.sfx('shield');return;}
  k.spinT=0.95; k.speed*=0.3; k.drift.active=false;
  if(withCoins) k.coins=Math.max(0,k.coins-3);
  if(k.isPlayer)Audio8.sfx('spin');
}
function stepWorldItems(race,dt){
  const tr=race.track;
  for(const s of race.slicks){
    s.life-=dt;
    for(const k of race.karts){
      if(k.spinT>0)continue;
      if(dist2(k.x,k.y,s.x,s.y)<(KART_R+9)*(KART_R+9)){ hitKart(k,false); s.life=0; }
    }
  }
  race.slicks=race.slicks.filter(s=>s.life>0);
  for(const p of race.shots){
    p.life-=dt;
    if(p.target&&!p.target.finished){
      const want=Math.atan2(p.target.y-p.y,p.target.x-p.x);
      p.angle+=wrapAngle(want-p.angle)*Math.min(1,5*dt);
    }
    p.x+=Math.cos(p.angle)*p.speed*dt;
    p.y+=Math.sin(p.angle)*p.speed*dt;
    if(tileAt(tr,p.x,p.y)===T_WALL){p.life=0;continue;}
    for(const k of race.karts){
      if(k===p.owner)continue;
      if(dist2(k.x,k.y,p.x,p.y)<(KART_R+8)*(KART_R+8)){ hitKart(k,true); p.life=0; break; }
    }
  }
  race.shots=race.shots.filter(p=>p.life>0);
  /* coins */
  for(const k of race.karts){
    const t=kartTile(tr,k);
    if(t===T_COIN){
      const key=((k.x/TILE)|0)+','+((k.y/TILE)|0);
      if(!race.coinsTaken.has(key)){
        race.coinsTaken.add(key);
        k.coins=Math.min(10,k.coins+1);
        if(k.isPlayer)Audio8.sfx('coin');
      }
    }
    if(t===T_ITEM&&!k.item&&k.itemCd<=0.4){
      k.item=rollItem(k.pos);
      k.itemCd=1.2;
      if(k.isPlayer)Audio8.sfx('item');
    }
  }
}

/* -------------------------------- AI ---------------------------------- */
function aiInput(k,race){
  const tr=race.track,wps=tr.wps;
  const wp=wps[k.wpIndex];
  const look=wps[(k.wpIndex+1)%wps.length];
  const mix=0.22;
  const tx=lerp(wp.x,look.x,mix),ty=lerp(wp.y,look.y,mix);
  const want=Math.atan2(ty-k.y,tx-k.x);
  const err=wrapAngle(want-k.angle);
  const steer=clamp(err*2.2,-1,1);
  k.aiItemT-=1/60;
  const useIt=k.item&&k.aiItemT<=0;
  if(useIt)k.aiItemT=2+rnd()*3;
  return {steer,brake:Math.abs(err)>1.7&&k.speed>200,drift:false,item:useIt};
}

/* ------------------------------- race --------------------------------- */
function makeRace(track,playerDrv,opts){
  opts=opts||{};
  const race={
    track, laps:track.def.laps, time:0, state:'countdown', countT:3.4,
    karts:[], slicks:[], shots:[], coinsTaken:new Set(),
    particles:[], ccMult:opts.cc===150?1.18:1,
    mode:opts.mode||'quick', shake:0, go:false,
    resultsShown:false
  };
  /* grid placement: walk backward from the start line along the road */
  const gridPos=(dist,lat)=>{
    const wps=track.wps,N=wps.length;
    let remaining=dist,prev=wps[0];
    for(let kk=1;kk<=N;kk++){
      const p=wps[(N-kk)%N];
      const seg=Math.hypot(p.x-prev.x,p.y-prev.y);
      if(seg>1e-6){
        if(remaining<=seg){
          const t=remaining/seg;
          const x=lerp(prev.x,p.x,t),y=lerp(prev.y,p.y,t);
          const travel=Math.atan2(prev.y-p.y,prev.x-p.x);
          return {x:x+Math.cos(travel+Math.PI/2)*lat,
                  y:y+Math.sin(travel+Math.PI/2)*lat,angle:travel};
        }
        remaining-=seg;
      }
      prev=p;
    }
    return {x:prev.x,y:prev.y,angle:0};
  };
  const others=DRIVERS.filter(d=>d!==playerDrv);
  srand((Date.now()%100000)|0);
  for(let i=others.length-1;i>0;i--){const j=(rnd()*(i+1))|0;const t=others[i];others[i]=others[j];others[j]=t;}
  const order=race.mode==='tt'?[playerDrv]:[...others,playerDrv]; /* player last */
  order.forEach((drv,i)=>{
    const k=makeKart(drv,drv===playerDrv);
    const gp=gridPos((1.7+(i>>1)*1.5)*TILE,(i%2===0?-0.95:0.95)*TILE);
    k.x=gp.x; k.y=gp.y; k.angle=gp.angle; k.dirAngle=gp.angle;
    k.lapStart=0;
    race.karts.push(k);
  });
  race.player=race.karts.find(k=>k.isPlayer);
  return race;
}
function stepRace(race,dt,playerInput){
  race.time+=dt;
  if(race.state==='countdown'){
    const prev=Math.ceil(race.countT);
    race.countT-=dt;
    const now=Math.ceil(race.countT);
    if(now!==prev&&now>0)Audio8.sfx('count');
    if(race.countT<=0){race.state='racing';race.go=true;Audio8.sfx('go');
      race.karts.forEach(k=>k.lapStart=0); race.time=0;}
    return;
  }
  for(const k of race.karts){
    const inp=k.isPlayer?playerInput:aiInput(k,race);
    /* rubber banding: mild pace correction vs player */
    let cc=race.ccMult;
    if(!k.isPlayer&&race.player){
      const diff=race.player.progress-k.progress;
      cc*= k.aiPace*(diff>8?1.09:(diff<-8?0.93:1));
    }
    stepKart(k,inp,race.track,dt,cc,race);
    if(k.isPlayer&&!k.finished) Audio8.engine(Math.abs(k.speed)/Math.max(1,maxSpeed(k,race.ccMult)));
  }
  kartContacts(race);
  stepWorldItems(race,dt);
  /* positions */
  const sorted=[...race.karts].sort((a,b)=>
    (b.finished?1e9-(b.finishTime||0):b.progress)-
    (a.finished?1e9-(a.finishTime||0):a.progress));
  sorted.forEach((k,i)=>k.pos=i+1);
  race.player=race.karts.find(k=>k.isPlayer);
  if(race.player&&race.player.finished&&!race.resultsShown){
    race.resultsShown=true;
    Audio8.sfx('finish');
    if(race.mode==='tt'){ saveRecord(race); }
  }
  /* particles */
  for(const p of race.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  race.particles=race.particles.filter(p=>p.life>0);
  race.shake=Math.max(0,race.shake-dt*3);
}
function spawnSpark(k){
  const lvl=k.drift.level;
  const col=lvl===2?'#ffb000':(lvl===1?'#57a8ff':'#888');
  for(let i=0;i<2;i++){
    const a=k.angle+Math.PI+(rnd()-0.5)*0.8;
    k._raceParticles&&0;
    Game.race&&Game.race.particles.push({
      x:k.x+Math.cos(a)*14,y:k.y+Math.sin(a)*14,
      vx:Math.cos(a)*40+(rnd()-0.5)*30,vy:Math.sin(a)*40+(rnd()-0.5)*30,
      life:0.3+rnd()*0.2,color:col,size:2});
  }
}

/* --------------------------- race rendering --------------------------- */
function drawKartSprite(ctx,k,cam,isPlayer){
  let px,py,scale;
  if(isPlayer){
    px=VW/2; py=VH-46; scale=1.35;
  }else{
    const pr=project(cam,k.x,k.y);
    if(!pr) return;
    px=pr.x; py=pr.y; scale=pr.s*30;
    if(scale<0.15)return;
  }
  const spr=k.drv.kartSprite;
  const w=spr.width*scale,h=spr.height*scale;
  /* shadow */
  ctx.fillStyle='rgba(0,0,0,.4)';
  ctx.beginPath();ctx.ellipse(px,py-h*0.06,w*0.5,h*0.16,0,0,TAU);ctx.fill();
  ctx.save();
  ctx.translate(px,py-h*0.5-(k.hopT>0?6*scale:0));
  ctx.rotate(wrapAngle(k.angle-cam.angle)+(k.drift.active?k.drift.dir*0.18:0));
  if(k.spinT>0) ctx.rotate(k.spinT*10);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(spr,-w/2,-h/2,w,h);
  /* shield ring */
  if(k.shieldT>0){
    ctx.strokeStyle='rgba(255,215,94,.85)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,w*0.62,0,TAU);ctx.stroke();
  }
  ctx.restore();
}
function drawDeco(ctx,cam,x,y,kind){
  const pr=project(cam,x,y);
  if(!pr)return;
  const spr=getDecor(kind);
  const s=pr.s*26;
  if(s<0.12)return;
  const w=spr.width*s,h=spr.height*s;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(spr,pr.x-w/2,pr.y-h,w,h);
}
function drawCoinEnt(ctx,cam,track,key){
  const pr=project(cam,key.x,key.y);
  if(!pr)return;
  const s=pr.s*0.9;
  if(s<0.1)return;
  const w=16*s*6,h=16*s*6;
  ctx.fillStyle='#ffd75e';
  ctx.beginPath();ctx.arc(pr.x,pr.y-h*0.28,7*s*2.4,0,TAU);ctx.fill();
  ctx.fillStyle='#8a6a00';
  ctx.fillRect(pr.x-1.6*s*2.4,pr.y-h*0.28-4*s*2.4,3.2*s*2.4,8*s*2.4);
}
function drawRace(ctx,race,skies){
  const tr=race.track,p=race.player;
  const cam=race.cam;
  /* camera follows behind player */
  const ta=p?p.angle:0;
  const backX=p?p.x-Math.cos(p.dirAngle)*105:wp1x(tr);
  const backY=p?p.y-Math.sin(p.dirAngle)*105:0;
  if(!cam.init){cam.x=backX;cam.y=backY;cam.angle=ta;cam.init=true;}
  cam.x=lerp(cam.x,backX,0.28);cam.y=lerp(cam.y,backY,0.28);
  cam.angle+=wrapAngle(ta-cam.angle)*0.22;
  const shake=race.shake>0?{x:(rnd()-0.5)*4*race.shake,y:(rnd()-0.5)*4*race.shake}:null;
  renderWorld(ctx,tr,cam,skies[tr.def.id],shake);
  /* collect drawables sorted by depth */
  const draws=[];
  for(const d of tr.decor){
    const pr=project(cam,(d[0]+0.5)*TILE,(d[1]+0.5)*TILE);
    if(pr&&(!d[3]||pr.d<1700))draws.push({d:pr.d,f:()=>drawDeco(ctx,cam,(d[0]+0.5)*TILE,(d[1]+0.5)*TILE,d[2])});
  }
  for(const key of coinEntities(race)){
    const pr=project(cam,key.x,key.y);
    if(pr)draws.push({d:pr.d,f:()=>drawCoinEnt(ctx,cam,tr,key)});
  }
  for(const s of race.slicks){
    const pr=project(cam,s.x,s.y);
    if(pr)draws.push({d:pr.d,f:()=>{
      ctx.fillStyle='#3d2b5a';
      ctx.beginPath();ctx.ellipse(pr.x,pr.y,14*pr.s*1.6,6*pr.s*1.6,0,0,TAU);ctx.fill();
      ctx.fillStyle='#6b4a9e';
      ctx.beginPath();ctx.ellipse(pr.x-3*pr.s,pr.y-pr.s,5*pr.s*1.6,2.5*pr.s*1.6,0,0,TAU);ctx.fill();
    }});
  }
  for(const s of race.shots){
    const pr=project(cam,s.x,s.y);
    if(pr)draws.push({d:pr.d,f:()=>{
      ctx.save();ctx.translate(pr.x,pr.y-10*pr.s);ctx.rotate(s.angle-cam.angle);
      ctx.fillStyle='#c9c9d4';ctx.fillRect(-20*pr.s,-2*pr.s,40*pr.s,4*pr.s);
      ctx.fillStyle='#8a2f2f';ctx.beginPath();
      ctx.moveTo(26*pr.s,0);ctx.lineTo(16*pr.s,-5*pr.s);ctx.lineTo(16*pr.s,5*pr.s);ctx.fill();
      ctx.restore();
    }});
  }
  for(const k of race.karts){
    if(k.isPlayer)continue;
    const pr=project(cam,k.x,k.y);
    if(pr)draws.push({d:pr.d,f:()=>drawKartSprite(ctx,k,cam,false)});
  }
  draws.sort((a,b)=>b.d-a.d);
  for(const d of draws)d.f();
  /* particles */
  for(const pt of race.particles){
    const pr=project(cam,pt.x,pt.y);
    if(!pr)continue;
    ctx.fillStyle=pt.color;
    ctx.fillRect(pr.x-pt.size*pr.s*3,pr.y-pt.size*pr.s*3,pt.size*2*pr.s*3,pt.size*2*pr.s*3);
  }
  /* player on top */
  if(p)drawKartSprite(ctx,p,cam,true);
  MNACArt.postFx(ctx,tr.def,performance.now()/1000,p?Math.min(1,Math.abs(p.speed||0)/400):0.5);
}
function wp1x(tr){return tr.wps[0].x;}
function coinEntities(race){
  if(!race._coins){
    race._coins=[];
    const tr=race.track;
    for(let j=0;j<tr.h;j++)for(let i=0;i<tr.w;i++)
      if(tr.tiles[j][i]===T_COIN) race._coins.push({key:i+','+j,x:(i+0.5)*TILE,y:(j+0.5)*TILE});
  }
  return race._coins.filter(c=>!race.coinsTaken.has(c.key));
}

/* -------------------------------- HUD --------------------------------- */
function fmtTime(t){
  const m=(t/60)|0,s=t%60;
  return (m<10?'0':'')+m+':'+(s<10?'0':'')+s.toFixed(2);
}
function drawHUD(ctx,race){
  const p=race.player;if(!p)return;
  ctx.textBaseline='top';
  const amber='#ffb000',ink='#f5e7c8';
  const panel=(x,y,w,h)=>{ctx.fillStyle='rgba(12,8,3,.72)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='rgba(255,176,0,.5)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);};
  const isTouch=Game.touchMode;
  /* position + lap */
  panel(6,6,86,46);
  ctx.fillStyle=amber;ctx.font='bold 22px "Courier New",monospace';
  ctx.fillText(p.pos+'ª',12,10);
  ctx.font='bold 9px "Courier New",monospace';ctx.fillStyle=ink;
  ctx.fillText('de '+race.karts.length,44,20);
  ctx.fillStyle=amber;ctx.font='bold 11px "Courier New",monospace';
  ctx.fillText('VOLTA '+Math.min(p.lap,race.laps)+'/'+race.laps,12,34);
  /* times */
  panel(VW-120,6,114,46);
  ctx.fillStyle=ink;ctx.font='bold 10px "Courier New",monospace';
  ctx.fillText('TEMPS '+fmtTime(race.time),VW-114,12);
  ctx.fillStyle=amber;
  ctx.fillText('MILLOR '+(p.bestLap?fmtTime(p.bestLap):'--:--'),VW-114,26);
  if(p.lastLap){ctx.fillStyle=ink;ctx.fillText('VOLTA '+fmtTime(p.lastLap),VW-114,39);}
  /* minimap */
  const mm=race.track.minimap;
  const mw=Math.min(120,mm.width*2),mh=mw*mm.height/mm.width;
  panel(VW/2-mw/2-4,4,mw+8,mh+8);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(mm,VW/2-mw/2,8,mw,mh);
  for(const k of race.karts){
    const mx=VW/2-mw/2+(k.x/race.track.worldW)*mw;
    const my=8+(k.y/race.track.worldH)*mh;
    ctx.fillStyle=k.isPlayer?'#fff':'#e04a3a';
    ctx.fillRect(mx-1.5,my-1.5,3,3);
  }
  /* item box */
  if(!isTouch){
    panel(6,VH-56,52,52);
    ctx.strokeStyle=amber;ctx.strokeRect(8.5,VH-53.5,47,47);
    if(p.item){
      ctx.font='22px serif';ctx.textAlign='center';
      ctx.fillText(ITEMS[p.item].icon,32,VH-44);
      ctx.textAlign='left';
    }else{
      ctx.fillStyle='rgba(245,231,200,.35)';ctx.font='bold 16px "Courier New",monospace';
      ctx.textAlign='center';ctx.fillText('?',32,VH-40);ctx.textAlign='left';
    }
  }
  /* coins + speed */
  const sy=VH-(isTouch?16:24);
  ctx.fillStyle='#ffd75e';ctx.beginPath();ctx.arc(72,sy-4,5,0,TAU);ctx.fill();
  ctx.fillStyle=ink;ctx.font='bold 12px "Courier New",monospace';
  ctx.fillText('x'+p.coins,82,sy-10);
  const bw=isTouch?90:110,bx=VW-bw-8;
  panel(bx-4,sy-14,bw+8,20);
  ctx.fillStyle='#3a2a12';ctx.fillRect(bx,sy-9,bw,10);
  const ratio=clamp(p.speed/maxSpeed(p,race.ccMult),0,1);
  ctx.fillStyle=ratio>0.95?'#ff5a00':amber;
  ctx.fillRect(bx,sy-9,bw*ratio,10);
  /* drift charge indicator */
  if(p.drift.active&&p.drift.level>0){
    ctx.fillStyle=p.drift.level===2?'#ffb000':'#57a8ff';
    ctx.font='bold 13px "Courier New",monospace';ctx.textAlign='center';
    ctx.fillText(p.drift.level===2?'¡TURBO!':'turbo…',VW/2,VH-78);
    ctx.textAlign='left';
  }
  /* tilt steering indicator (touch, live) */
  if(isTouch&&Tilt.enabled&&Tilt.active&&race.state==='racing'){
    const iw=60,ix=VW/2-iw/2,iy=VH-10;
    ctx.fillStyle='rgba(12,8,3,.6)';ctx.fillRect(ix-3,iy-3,iw+6,12);
    ctx.fillStyle='rgba(245,231,200,.25)';ctx.fillRect(ix,iy+2,iw,3);
    const mx=VW/2+clamp(Tilt.steer,-1,1)*(iw/2-3);
    ctx.fillStyle='#ffb000';ctx.fillRect(mx-2,iy-1,4,9);
    const pd=clamp(Tilt.pedal,-1,1);
    if(pd!==0){ /* right of the bar: up = accelerar, down = frenar */
      ctx.fillStyle=pd>0?'#7de37d':'#ff5a4a';
      const bh=Math.max(2,Math.abs(pd)*9);
      ctx.fillRect(ix+iw+5,pd>0?iy+8-bh:iy+2,4,bh);
    }
  }
  /* item hint for touch (big, centered above buttons) */
  if(isTouch&&p.item){
    ctx.font='26px serif';ctx.textAlign='center';
    ctx.fillText(ITEMS[p.item].icon,VW/2,VH-96);
    ctx.textAlign='left';
  }
  /* countdown */
  if(race.state==='countdown'){
    const n=Math.ceil(race.countT);
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle=amber;ctx.font='bold 64px "Courier New",monospace';
    ctx.textAlign='center';
    ctx.fillText(n>0?String(n):'JA!',VW/2,VH/2-40);
    ctx.textAlign='left';
  }
}

/* ----------------------------- persistence ---------------------------- */
const SAVE_KEY='mnac-kart-v1';
function loadSave(){ try{return JSON.parse(localStorage.getItem(SAVE_KEY))||{};}catch(e){return{};} }
function saveSave(s){ try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch(e){} }
function saveRecord(race){
  const p=race.player;if(!p||!p.bestLap)return;
  const s=loadSave();s.records=s.records||{};
  const key=race.track.def.id+'_'+race.ccMult.toFixed(2);
  const prev=s.records[key];
  if(!prev||p.bestLap<prev){s.records[key]=p.bestLap;race.newRecord=true;Audio8.sfx('record');}
  saveSave(s);
}
function getRecord(trackId,ccMult){
  const s=loadSave();return s.records&&s.records[trackId+'_'+ccMult.toFixed(2)];
}

/* ------------------------------ game state ---------------------------- */
const Game={
  state:'boot', race:null, attract:null,
  mode:'quick', cc:100, charIdx:0, trackIdx:0,
  gp:null, touchMode:false, paused:false,
  built:{}, skies:{}
};
function builtTrack(i){
  if(!Game.built[i]){
    Game.built[i]=buildTrack(TRACKS[i]);
    Game.skies[TRACKS[i].id]=buildSky(TRACKS[i]);
  }
  return Game.built[i];
}

/* ------------------------------ DOM UI -------------------------------- */
const ui=document.getElementById('uiLayer');
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function clearUI(){ui.innerHTML='';}
function statBar(label,v){
  return '<div class="statRow"><span>'+label+'</span><div class="bar"><div style="width:'+Math.round(v*100)+'%"></div></div></div>';
}
let menuSel=0, menuBtns=[];
function bindMenuNav(){
  menuBtns=[...ui.querySelectorAll('[data-nav]')];
  menuSel=0; markSel();
}
function markSel(){
  menuBtns.forEach((b,i)=>b.classList.toggle('sel',i===menuSel));
}
function menuKey(dir){
  if(!menuBtns.length)return false;
  menuSel=(menuSel+dir+menuBtns.length)%menuBtns.length;
  markSel(); Audio8.sfx('back');
  return true;
}
function menuEnter(){
  if(menuBtns.length){Audio8.sfx('select');menuBtns[menuSel].click();return true;}
  return false;
}

function showTitle(){
  Game.state='title'; orientRelease(); startAttract(); updateRotateHint();
  clearUI();
  const card=el('div','uiCard titleCard');
  const logo=el('div','logoWrap');
  const lc=document.createElement('canvas');lc.width=48;lc.height=40;
  lc.getContext('2d').drawImage(DRIVERS[4].kartSprite,0,0,48,40); /* AgnusDei, 7 rodes */
  logo.appendChild(lc);
  logo.appendChild(el('h1',null,'MNAC KART'));
  card.appendChild(logo);
  card.appendChild(el('p','tagline','Curses de karts dins del Museu Nacional d’Art de Catalunya'));
  const btns=el('div','btnCol');
  const b1=el('button','menuBtn','🏆 GRAN PREMI MNAC');b1.dataset.nav=1;
  b1.onclick=()=>{Game.mode='gp';showCC();};
  const b2=el('button','menuBtn','CURSA RÀPIDA');b2.dataset.nav=1;
  b2.onclick=()=>{Game.mode='quick';showCC();};
  const b3=el('button','menuBtn','⏱ CONTRARELLOTGE');b3.dataset.nav=1;
  b3.onclick=()=>{Game.mode='tt';showCC();};
  const b4=el('button','menuBtn','❓ COM ES JUGA');b4.dataset.nav=1;
  b4.onclick=showGuide;
  btns.append(b1,b2,b3,b4);
  card.appendChild(btns);
  card.appendChild(el('p','foot','Pixel art i música xip generats en codi · v1.0'));
  ui.appendChild(card);
  bindMenuNav();
  Audio8.playSong(SONGS.title);
}
function showCC(){
  clearUI();
  const card=el('div','uiCard');
  card.appendChild(el('h2',null,'CILINDRADA'));
  const btns=el('div','btnCol');
  const a=el('button','menuBtn','100cc — tranquil');
  a.dataset.nav=1;a.onclick=()=>{Game.cc=100;showChars();};
  const b=el('button','menuBtn','150cc — a tot drap');
  b.dataset.nav=1;b.onclick=()=>{Game.cc=150;showChars();};
  const back=el('button','menuBtn backBtn','← Enrere');back.dataset.nav=1;back.onclick=showTitle;
  btns.append(a,b,back);card.appendChild(btns);
  ui.appendChild(card);bindMenuNav();
}
function showChars(){
  clearUI();
  const card=el('div','uiCard wide');
  card.appendChild(el('h2',null,'TRIA EL TEU PILOT'));
  const grid=el('div','charGrid');
  DRIVERS.forEach((d,i)=>{
    const c=el('button','charCard');
    c.dataset.nav=1;
    const fc=document.createElement('canvas');
    fc.width=48;fc.height=48;fc.className='face';
    fc.getContext('2d').drawImage(d.faceSprite,0,0);
    c.appendChild(fc);
    c.appendChild(el('div','cname',d.name));
    c.appendChild(el('div','ckart',d.kart));
    c.appendChild(el('div','cdesc',d.desc));
    c.insertAdjacentHTML('beforeend',
      statBar('VEL',d.stats.speed)+statBar('ACC',d.stats.accel)+statBar('ADH',d.stats.grip));
    c.onclick=()=>{Game.charIdx=i;
      if(Game.mode==='quick'||Game.mode==='tt')showTracks();else startGP();};
    grid.appendChild(c);
  });
  card.appendChild(grid);
  const back=el('button','menuBtn backBtn','← Enrere');back.dataset.nav=1;back.onclick=showCC;
  card.appendChild(back);
  ui.appendChild(card);bindMenuNav();
}
function showTracks(){
  clearUI();
  const card=el('div','uiCard wide');
  card.appendChild(el('h2',null,'TRIA CIRCUIT'));
  const grid=el('div','trackGrid');
  TRACKS.forEach((t,i)=>{
    const tr=builtTrack(i);
    const c=el('button','trackCard');c.dataset.nav=1;
    const mc=document.createElement('canvas');
    mc.width=tr.minimap.width*2;mc.height=tr.minimap.height*2;
    const mx=mc.getContext('2d');mx.imageSmoothingEnabled=false;
    mx.drawImage(tr.minimap,0,0,mc.width,mc.height);
    c.appendChild(mc);
    c.appendChild(el('div','cname',t.name));
    if(Game.mode==='tt'){
      const rec=getRecord(t.id,Game.cc===150?1.18:1);
      c.appendChild(el('div','cdesc',rec?'Rècord: '+fmtTime(rec):'Sense rècord'));
    }
    c.onclick=()=>{Game.trackIdx=i;startRace();};
    grid.appendChild(c);
  });
  card.appendChild(grid);
  const back=el('button','menuBtn backBtn','← Enrere');back.dataset.nav=1;back.onclick=showChars;
  card.appendChild(back);
  ui.appendChild(card);bindMenuNav();
}
function showGuide(){
  clearUI();
  const card=el('div','uiCard');
  card.appendChild(el('h2',null,'COM ES JUGA'));
  card.insertAdjacentHTML('beforeend',
    '<h3>Objectiu</h3><p>Guanya curses pels espais del MNAC contra 7 pilots del museu. '+
    'Completa '+3+' voltes abans que els rivals.</p>'+
    '<h3>Controls (mòbil)</h3><ul>'+
    '<li><span class="kbd">◀</span><span class="kbd">▶</span> gira el kart</li>'+
    '<li><span class="kbd">GIRO</span> inclina el mòbil com un volant per girar; es suma als botons ◀ ▶ i en reforça la força. Es calibra sol a l’inici de cada cursa. Toca’l per activar-lo o desactivar-lo</li>'+
    '<li>Amb el GIRO actiu, inclina la pantalla cap endavant (la vora superior s’allunya de tu) per accelerar més, i cap a tu per frenar</li>'+
    '<li><span class="kbd">DERRAP</span> mantén premut en una corba per derrapar i carrega el turbo; deixa anar per disparar-lo</li>'+
    '<li><span class="kbd">OBJETE</span> utilitza l’objecte que portis</li>'+
    '<li><span class="kbd">FRE</span> frena</li></ul>'+
    '<h3>Controls (teclat)</h3><ul>'+
    '<li><span class="kbd">←</span><span class="kbd">→</span> gira · <span class="kbd">↓</span>/<span class="kbd">S</span> frena</li>'+
    '<li><span class="kbd">Espai</span>/<span class="kbd">Maj</span> derrapa · <span class="kbd">X</span>/<span class="kbd">Intro</span> objecte</li>'+
    '<li><span class="kbd">Esc</span>/<span class="kbd">P</span> pausa</li></ul>'+
    '<h3>Objectes</h3><ul>'+
    '<li>🖌 <b>Pinzellada</b>: deixa pintura fresca que fa fer un tromp</li>'+
    '<li>➶ <b>Llança de Sant Jordi</b>: persegueix el kart de davant</li>'+
    '<li>🪽 <b>Ales de Serafí</b>: turbo instantani</li>'+
    '<li>🛡 <b>Escut del Capitell</b>: et protegeix un temps</li></ul>'+
    '<h3>Consells</h3><ul>'+
    '<li>Les <b>monedes romàniques</b> (màx. 10) pugen la velocitat punta</li>'+
    '<li>Les fletxes ambre del terra donen turbo</li>'+
    '<li>Fora de la pista vas més lent: torna al paviment</li>'+
    '<li>Les obres i elements del museu (columnes, vitrines, plantes…) són sòlids: no els travessis</li></ul>');
  const back=el('button','uiClose','TANCA');back.dataset.nav=1;
  back.onclick=()=>{ if(Game.state==='race'){hideOverlayOnly();} else showTitle(); };
  card.appendChild(back);
  ui.appendChild(card);bindMenuNav();
}
function hideOverlayOnly(){clearUI();}

function showResults(race){
  const p=race.player;
  clearUI();
  const card=el('div','uiCard');
  const posTxt=['1r','2n','3r'][p.pos-1]||(p.pos+'è');
  card.appendChild(el('h2',null,(race.mode==='tt'?'TEMPS FINAL':'HAS QUEDAT '+posTxt.toUpperCase())));
  if(race.mode==='tt'){
    card.insertAdjacentHTML('beforeend',
      '<p>Temps total: <b>'+fmtTime(p.finishTime)+'</b></p>'+
      '<p>Millor volta: <b>'+fmtTime(p.bestLap)+'</b>'+(race.newRecord?' <span class="rec">NOU RÈCORD!</span>':'')+'</p>');
  }else{
    const rows=[...race.karts].sort((a,b)=>a.pos-b.pos).map(k=>{
      const me=k.isPlayer?' me':'';
      return '<tr class="rrow'+me+'"><td>'+k.pos+'</td><td>'+k.drv.name+'</td><td>'+
        (k.finished?fmtTime(k.finishTime):'--:--.--')+'</td></tr>';
    }).join('');
    card.insertAdjacentHTML('beforeend',
      '<table class="rtable"><tr><th></th><th>Pilot</th><th>Temps</th></tr>'+rows+'</table>');
  }
  const btns=el('div','btnCol');
  if(race.mode==='gp'){
    const nx=el('button','menuBtn','SEGÜENT ➜');nx.dataset.nav=1;
    nx.onclick=showStandings;btns.appendChild(nx);
  }
  const rep=el('button','menuBtn','↻ REPETIR');rep.dataset.nav=1;
  rep.onclick=()=>startRace();btns.appendChild(rep);
  const menu=el('button','menuBtn backBtn','MENÚ PRINCIPAL');menu.dataset.nav=1;
  menu.onclick=showTitle;btns.appendChild(menu);
  card.appendChild(btns);
  ui.appendChild(card);bindMenuNav();
  Audio8.playSong(SONGS.podium);
}
function showStandings(){
  clearUI();
  const gp=Game.gp;
  const last=gp.raceIdx>=TRACKS.length;
  const card=el('div','uiCard');
  card.appendChild(el('h2',null,last?'PODI FINAL':'CLASSIFICACIÓ GENERAL'));
  const order=[...gp.order].sort((a,b)=>(gp.points[b.id]||0)-(gp.points[a.id]||0));
  const rows=order.map((d,i)=>'<tr class="rrow'+(d===DRIVERS[Game.charIdx]?' me':'')+'"><td>'+(i+1)+
    '</td><td>'+d.name+'</td><td>'+(gp.points[d.id]||0)+' pts</td></tr>').join('');
  card.insertAdjacentHTML('beforeend',
    '<table class="rtable"><tr><th></th><th>Pilot</th><th>Punts</th></tr>'+rows+'</table>');
  if(last){
    const champ=order[0];
    card.insertAdjacentHTML('beforeend','<p class="champ">🏆 Campió del Gran Premi MNAC: <b>'+champ.name+'</b></p>');
  }
  const btns=el('div','btnCol');
  if(!last){
    const nx=el('button','menuBtn','PRÒXIM CIRCUIT: '+TRACKS[gp.raceIdx].name.toUpperCase());
    nx.dataset.nav=1;nx.onclick=()=>{startRace();};btns.appendChild(nx);
  }
  const menu=el('button','menuBtn backBtn','MENÚ PRINCIPAL');menu.dataset.nav=1;
  menu.onclick=showTitle;btns.appendChild(menu);
  card.appendChild(btns);
  ui.appendChild(card);bindMenuNav();
  if(last)Audio8.sfx('podium');
}
function showPause(){
  clearUI();
  const card=el('div','uiCard');
  card.appendChild(el('h2',null,'PAUSA'));
  const btns=el('div','btnCol');
  const go=el('button','menuBtn','▶ CONTINUA');go.dataset.nav=1;
  go.onclick=togglePause;btns.appendChild(go);
  const q=el('button','menuBtn backBtn','SURT AL MENÚ');q.dataset.nav=1;
  q.onclick=()=>{Game.paused=false;showTitle();};btns.appendChild(q);
  card.appendChild(btns);
  ui.appendChild(card);bindMenuNav();
}
function togglePause(){
  if(Game.state!=='race')return;
  Game.paused=!Game.paused;
  if(Game.paused)showPause();else clearUI();
}

/* ======================= OVERRIDES (precise scale) ===================== */
function renderWorld(ctx,track,cam,sky,shake){
  const cosA=Math.cos(cam.angle),sinA=Math.sin(cam.angle);
  /* sky, parallax by angle */
  ctx.setTransform(1,0,0,1,0,0);
  const skyW=960;
  let off=((cam.angle/TAU)*skyW)%skyW; if(off<0)off+=skyW;
  for(let k=-1;k<=1;k++) ctx.drawImage(sky,-off+k*skyW,0,skyW,HORIZON+1);
  /* floor: per-scanline affine with 1px clip */
  ctx.fillStyle='#0d0905';ctx.fillRect(0,HORIZON,VW,VH-HORIZON);
  const sx0=shake?shake.x:0, sy0=shake?shake.y:0;
  const step=Game.rowStep||1;
  ctx.imageSmoothingEnabled=true;
  for(let y=HORIZON;y<VH;y+=step){
    const dy=y-HORIZON+0.5;
    const dist=CAM_H*FOCAL/dy;
    const scale=dist/FOCAL;
    const MS=TILE/(track.map.width/track.w);
    const a=-sinA/scale*MS, b=cosA/scale*MS, c=cosA/scale*MS, d=sinA/scale*MS;
    const e=(cam.x*sinA-cam.y*cosA)/scale+VW/2+sx0;
    const f=y-(cam.x*cosA+cam.y*sinA+dist)/scale+sy0;
    ctx.save();
    ctx.beginPath();ctx.rect(0,y,VW,step);ctx.clip();
    ctx.setTransform(a,b,c,d,e,f);
    ctx.drawImage(track.map,0,0);
    ctx.restore();
  }
  ctx.setTransform(1,0,0,1,0,0);
  ctx.imageSmoothingEnabled=false;
}
function drawKartSprite(ctx,k,cam,isPlayer){
  const spr=k.drv.kartSprite;
  let px,py,w,h;
  if(isPlayer){ w=82;h=68;px=VW/2;py=VH-40; }
  else{
    const pr=project(cam,k.x,k.y);
    if(!pr||pr.s<0.12)return;
    w=46*pr.s;h=38*pr.s;px=pr.x;py=pr.y;
  }
  ctx.fillStyle='rgba(0,0,0,.4)';
  ctx.beginPath();ctx.ellipse(px,py-h*0.05,w*0.52,Math.max(2,h*0.14),0,0,TAU);ctx.fill();
  ctx.save();
  ctx.translate(px,py-h*0.5-(k.hopT>0?h*0.12:0));
  ctx.rotate(wrapAngle(k.angle-cam.angle)+(k.drift.active?k.drift.dir*0.18:0));
  if(k.spinT>0)ctx.rotate(k.spinT*10);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(spr,-w/2,-h/2,w,h);
  if(k.shieldT>0){
    ctx.strokeStyle='rgba(255,215,94,.85)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,w*0.62,0,TAU);ctx.stroke();
  }
  ctx.restore();
}
function drawDeco(ctx,cam,wx,wy,kind){
  const pr=project(cam,wx,wy);
  if(!pr||pr.s<0.1)return;
  const spr=getDecor(kind);
  const h=(MNACArt.DECOR_H[kind.split('_')[0]]||92)*pr.s, w=h*spr.width/spr.height;
  ctx.imageSmoothingEnabled=true;
  if(kind.indexOf('arcada')!==0){ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath();ctx.ellipse(pr.x,pr.y,w*0.4,Math.max(1.5,h*0.08),0,0,TAU);ctx.fill();}
  ctx.drawImage(spr,pr.x-w/2,pr.y-h,w,h);
}
function drawCoinEnt(ctx,cam,track,key){
  const pr=project(cam,key.x,key.y);
  if(!pr||pr.s<0.12)return;
  const r=13*pr.s;
  ctx.fillStyle='#ffd75e';
  ctx.beginPath();ctx.arc(pr.x,pr.y-12*pr.s,r,0,TAU);ctx.fill();
  ctx.fillStyle='#8a6a00';
  ctx.fillRect(pr.x-r*0.22,pr.y-12*pr.s-r*0.6,r*0.44,r*1.2);
}

/* ------------------------------ race start ---------------------------- */
function startRace(){
  clearUI();
  const trackIdx=Game.mode==='gp'?Game.gp.raceIdx:Game.trackIdx;
  const track=builtTrack(trackIdx);
  Game.race=makeRace(track,DRIVERS[Game.charIdx],{mode:Game.mode,cc:Game.cc});
  Game.race.cam={};
  Game.race.trackIdx=trackIdx;
  Game.state='race';Game.paused=false;
  tiltRecalibrate();
  if(Game.touchMode)document.getElementById('touchUI').classList.remove('hidden');
  Audio8.playSong(SONGS[track.def.song]);
  orientRequestLock();
  updateRotateHint();
}
function startGP(){
  Game.gp={raceIdx:0,points:{},order:DRIVERS.slice()};
  startRace();
}
const GP_POINTS=[9,7,5,3,2,1,0,0];
function endRaceFlow(){
  const race=Game.race;
  if(race.mode==='gp'){
    for(const k of race.karts) Game.gp.points[k.drv.id]=(Game.gp.points[k.drv.id]||0)+GP_POINTS[k.pos-1];
    Game.gp.raceIdx++;
  }
  Game.state='results';
  document.getElementById('touchUI').classList.add('hidden');
  updateRotateHint();
  showResults(race);
}

/* ------------------------------ attract ------------------------------- */
function startAttract(){
  const tr=builtTrack((Date.now()/30000|0)%TRACKS.length);
  const r=makeRace(tr,DRIVERS[(Date.now()/7000|0)%DRIVERS.length],{mode:'quick',cc:100});
  r.attract=true;r.state='racing';r.cam={};
  Game.attract=r;
  document.getElementById('touchUI').classList.add('hidden');
}

/* ------------------------------- input -------------------------------- */
const Input={steer:0,throttle:0,brake:false,drift:false,item:false,_itemHeld:false};
const keys={};
const TILT_STEER_ADD=0.4; /* extra lock the gyro can add over a held button */
function refreshSteer(){
  let s=(keys.ArrowLeft?-1:0)+(keys.ArrowRight?1:0);
  if(touch.left)s=-1;
  if(touch.right)s=1;
  Input.throttle=0;
  if(Tilt.active&&Tilt.enabled){
    /* tilt sums directly with the buttons: it reinforces a held button and
       steers on its own when no button is pressed */
    s=clamp(s+Tilt.steer,-1-TILT_STEER_ADD,1+TILT_STEER_ADD);
    Input.throttle=Tilt.pedal;
  }
  Input.steer=s;
  Input.brake=!!(keys.ArrowDown||keys.KeyS||touch.brake);
  Input.drift=!!(keys.Space||keys.ShiftLeft||keys.ShiftRight||touch.drift);
}
const touch={left:false,right:false,drift:false,brake:false};
function bindHold(id,prop){
  const b=document.getElementById(id);
  const on=e=>{e.preventDefault();Audio8.resume();touch[prop]=true;b.classList.add('active');};
  const off=e=>{e.preventDefault();touch[prop]=false;b.classList.remove('active');};
  b.addEventListener('pointerdown',on);
  b.addEventListener('pointerup',off);
  b.addEventListener('pointercancel',off);
  b.addEventListener('pointerleave',off);
}
window.addEventListener('keydown',e=>{
  Audio8.resume();
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  keys[e.code]=true;
  if(Game.state==='race'){
    if(e.code==='Escape'||e.code==='KeyP'){togglePause();return;}
    if((e.code==='KeyX'||e.code==='Enter')&&!Input._itemHeld){Input.item=true;Input._itemHeld=true;}
  }else{
    if(e.code==='ArrowDown'||e.code==='ArrowRight')menuKey(1);
    else if(e.code==='ArrowUp'||e.code==='ArrowLeft')menuKey(-1);
    else if(e.code==='Enter'||e.code==='Space')menuEnter();
    else if(e.code==='Escape')showTitle();
  }
});
window.addEventListener('keyup',e=>{keys[e.code]=false;
  if(e.code==='KeyX'||e.code==='Enter')Input._itemHeld=false;});
window.addEventListener('pointerdown',()=>Audio8.resume(),{passive:true});
/* block browser long-press UI (selection bar / context menu) over the game */
document.addEventListener('contextmenu',e=>{e.preventDefault();});
document.addEventListener('selectstart',e=>{
  if(e.target.closest&&e.target.closest('#touchUI,#game,.cornerBtn,#rotateHint'))e.preventDefault();
});
document.addEventListener('dragstart',e=>{e.preventDefault();});

/* ------------------------- tilt steering (volant) --------------------- */
/* Steer by rolling the phone like a wheel. Works from the relative rotation
   against a baseline captured at race start, so it is pose- and
   landscape-side-independent: the steering signal is the twist about the
   screen normal, which forward/back lean never pollutes. */
const Orient={locked:false,rotated:false};
const Tilt={supported:false,enabled:true,active:false,base:null,steer:0,pedal:0};
const TILT_MAX_DEG=24;          /* twist for full lock */
const TILT_DEAD=0.06;           /* deadzone in twist units (~3.5deg) */
const TILT_PEDAL_MAX_DEG=20;    /* forward/back lean for full throttle/brake */
const TILT_PEDAL_DEAD=0.05;     /* lean deadzone (~3deg) */
function tiltMat(a,b,g){
  const D=Math.PI/180,ca=Math.cos(a*D),sa=Math.sin(a*D),cb=Math.cos(b*D),sb=Math.sin(b*D),cg=Math.cos(g*D),sg=Math.sin(g*D);
  return [
    [ca*cg-sa*sb*sg,-sa*cb,ca*sg+sa*sb*cg],
    [sa*cg+ca*sb*sg,ca*cb,sa*sg-ca*sb*cg],
    [-cb*sg,sb,cb*cg]
  ];
}
function tiltAxes(base,now){
  /* relative rotation base->now as sin-components about the base device
     axes: [0] about device-x, [1] about device-y, [2] about screen normal */
  if(!base||!now)return [0,0,0];
  const A=tiltMat(base.alpha,base.beta,base.gamma),B=tiltMat(now.alpha,now.beta,now.gamma);
  let r10=0,r01=0,r21=0,r12=0,r02=0,r20=0;
  for(let k=0;k<3;k++){
    r10+=A[k][1]*B[k][0];r01+=A[k][0]*B[k][1];
    r21+=A[k][2]*B[k][1];r12+=A[k][1]*B[k][2];
    r02+=A[k][0]*B[k][2];r20+=A[k][2]*B[k][0];
  }
  return [(r21-r12)/2,(r02-r20)/2,(r10-r01)/2];
}
function tiltTwist(base,now){ return tiltAxes(base,now)[2]; }
function tiltSteerFromTwist(w){
  if(Math.abs(w)<TILT_DEAD)return 0;
  const max=Math.sin(TILT_MAX_DEG*Math.PI/180);
  return -clamp(Math.sign(w)*(Math.abs(w)-TILT_DEAD)/(max-TILT_DEAD),-1,1);
}
function screenAngleDeg(){
  let a=0;
  try{
    if(window.screen&&screen.orientation&&typeof screen.orientation.angle==='number')a=screen.orientation.angle;
    else if(typeof window.orientation==='number')a=window.orientation;
  }catch(e){}
  return ((a%360)+360)%360;
}
function tiltEffectiveAngle(){
  /* the CSS-rotated fallback draws the game 90deg turned inside a portrait
     window: the pedal lean must be read against the content's orientation,
     not the OS one (the twist about the screen normal needs no adjustment) */
  return (screenAngleDeg()+(Orient.rotated?90:0))%360;
}
function tiltLeanFromAxes(w,angDeg){
  /* forward/back lean of the screen's top edge, landscape-side independent:
     +1 = top edge comes toward the player (brake), -1 = away (accelerate) */
  const a=(angDeg===undefined?screenAngleDeg():angDeg);
  if(a===90)return -w[1];
  if(a===270)return w[1];
  return w[0];
}
function tiltPedalFromLean(l){
  /* +1 full accelerate (top edge away), -1 full brake (toward the player) */
  if(Math.abs(l)<TILT_PEDAL_DEAD)return 0;
  const max=Math.sin(TILT_PEDAL_MAX_DEG*Math.PI/180);
  return -clamp(Math.sign(l)*(Math.abs(l)-TILT_PEDAL_DEAD)/(max-TILT_PEDAL_DEAD),-1,1);
}
function tiltRecalibrate(){Tilt.base=null;Tilt.steer=0;Tilt.pedal=0;}
function tiltRequestPermission(){
  try{
    if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
      DeviceOrientationEvent.requestPermission().catch(()=>{});
    }
  }catch(e){}
}
window.addEventListener('deviceorientation',e=>{
  if(e.alpha===null||e.alpha===undefined||e.beta===null||e.gamma===null)return;
  Tilt.supported=true;
  if(!Tilt.enabled){Tilt.active=false;Tilt.steer=0;Tilt.pedal=0;return;}
  const now={alpha:e.alpha,beta:e.beta,gamma:e.gamma};
  if(!Tilt.base){Tilt.base=now;Tilt.steer=0;Tilt.pedal=0;}
  else{
    const ax=tiltAxes(Tilt.base,now);
    Tilt.steer=tiltSteerFromTwist(ax[2]);
    Tilt.pedal=tiltPedalFromLean(tiltLeanFromAxes(ax,tiltEffectiveAngle()));
  }
  Tilt.active=true;
  updateTiltBtn();
});
function updateTiltBtn(){
  const b=document.getElementById('btnTilt');
  if(b){b.classList.toggle('off',!(Tilt.enabled&&Tilt.active));b.setAttribute('aria-pressed',Tilt.enabled?'true':'false');}
}

/* ------------------------------ touch UI ------------------------------ */
function setupTouch(){
  Game.touchMode=('ontouchstart'in window)||navigator.maxTouchPoints>0||/touch=1/.test(location.search);
  bindHold('btnLeft','left');bindHold('btnRight','right');
  bindHold('btnDrift','drift');bindHold('btnBrake','brake');
  const bt=document.getElementById('btnTilt');
  if(bt)bt.addEventListener('pointerdown',e=>{
    e.preventDefault();Audio8.resume();
    Tilt.enabled=!Tilt.enabled;
    if(Tilt.enabled)tiltRecalibrate();
    if(!Tilt.enabled){Tilt.active=false;Tilt.steer=0;Tilt.pedal=0;}
    updateTiltBtn();
  });
  document.addEventListener('pointerdown',tiltRequestPermission,{once:true});
  const bi=document.getElementById('btnItem');
  bi.addEventListener('pointerdown',e=>{e.preventDefault();Audio8.resume();Input.item=true;bi.classList.add('active');});
  const biOff=e=>{e.preventDefault();bi.classList.remove('active');};
  bi.addEventListener('pointerup',biOff);
  bi.addEventListener('pointercancel',biOff);
  bi.addEventListener('pointerleave',biOff);
  document.getElementById('btnSound').onclick=()=>{
    Audio8.resume();Audio8.setEnabled(!Audio8.enabled);
    const s=loadSave();s.sound=Audio8.enabled;saveSave(s);
  };
  document.getElementById('btnGuide').onclick=()=>{
    if(Game.state==='race'&&!Game.paused){Game.paused=true;}
    showGuide();
  };
  window.addEventListener('resize',updateRotateHint);
}
function updateRotateHint(){
  fitCanvas(); /* keeps Orient.rotated in sync with state + viewport */
  const portrait=window.innerHeight>window.innerWidth;
  const show=Game.touchMode&&portrait&&Game.state==='race'&&!Orient.rotated&&!Orient.locked;
  document.getElementById('rotateHint').classList.toggle('hidden',!show);
}

/* ------------------------------- loop --------------------------------- */
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
/* Tilting the phone to steer can make the OS auto-rotate the whole screen
   mid-race ("la pantalla gira"). Defense in two layers:
   1) real lock: fullscreen + Screen Orientation API (Chrome/Android);
   2) CSS fallback where locks don't exist (iPhone Safari): keep the game
      landscape by rotating #frame 90deg inside the portrait window. */
function orientRequestLock(){
  if(!Game.touchMode)return;
  try{
    let p=null;
    if(document.documentElement.requestFullscreen)
      p=document.documentElement.requestFullscreen({navigationUI:'hide'});
    const lock=()=>{try{
      if(window.screen&&screen.orientation&&screen.orientation.lock)
        screen.orientation.lock('landscape').then(()=>{Orient.locked=true;},()=>{});
    }catch(e){}};
    if(p&&p.then)p.then(lock,lock);else lock();
  }catch(e){}
}
function orientRelease(){
  try{if(window.screen&&screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();}catch(e){}
  try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});}catch(e){}
  Orient.locked=false;
}

/* Fit the 16:9 canvas inside the actually visible viewport. CSS vh units
   count space hidden under mobile browser chrome (URL bar / toolbars), which
   cropped the game in landscape; visualViewport reports the visible area. */
function fitCanvas(){
  const vv=window.visualViewport;
  const vw0=vv?vv.width:window.innerWidth, vh0=vv?vv.height:window.innerHeight;
  const ox=vv?vv.offsetLeft:0, oy=vv?vv.offsetTop:0;
  /* portrait mid-race without a real lock: rotate the whole frame instead of
     letting the rotate card take the screen */
  const rotated=Game.touchMode&&Game.state==='race'&&!Orient.locked&&vh0>vw0;
  Orient.rotated=rotated;
  const vw=rotated?vh0:vw0, vh=rotated?vw0:vh0;
  const s=Math.min(vw/16,vh/9);
  canvas.style.width=Math.max(1,Math.floor(s*16))+'px';
  canvas.style.height=Math.max(1,Math.floor(s*9))+'px';
  /* Anchor the fixed UI layers to the VISIBLE rect, not the layout viewport:
     mobile browser bars overlay fixed-position content, which could push the
     touch controls under the bar. Track visualViewport (+ scroll offsets).
     In rotated mode the transform on #frame turns its fixed descendants into
     frame-local boxes, so they get frame-local coordinates instead. */
  const fr=document.getElementById('frame');
  if(fr){
    if(rotated){
      fr.style.transform='rotate(90deg)';
      fr.style.left=(ox+(vw0-vh0)/2)+'px';
      fr.style.top=(oy+(vh0-vw0)/2)+'px';
      fr.style.width=vh0+'px'; fr.style.height=vw0+'px';
    }else{
      fr.style.transform='';
      fr.style.left=ox+'px'; fr.style.top=oy+'px';
      fr.style.width=vw0+'px'; fr.style.height=vh0+'px';
    }
    fr.style.right='auto'; fr.style.bottom='auto';
  }
  ['touchUI','uiLayer','rotateHint'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.style.left=(rotated?0:ox)+'px'; el.style.top=(rotated?0:oy)+'px';
    el.style.width=vw+'px'; el.style.height=vh+'px';
    el.style.right='auto'; el.style.bottom='auto';
  });
  const bs=document.getElementById('btnSound'), bg=document.getElementById('btnGuide');
  if(!bs||!bg)return;
  if(rotated){
    bs.style.left='10px'; bs.style.top='10px';
    bg.style.right='auto';
    bg.style.left=(vw-bg.offsetWidth-10)+'px'; bg.style.top='10px';
  }else{
    bs.style.left=(ox+10)+'px'; bs.style.top=(oy+10)+'px';
    bg.style.left='auto'; bg.style.right='auto';
    bg.style.left=(ox+vw0-bg.offsetWidth-10)+'px'; bg.style.top=(oy+10)+'px';
  }
}
window.addEventListener('resize',fitCanvas);
window.addEventListener('orientationchange',fitCanvas);
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',fitCanvas);
  window.visualViewport.addEventListener('scroll',fitCanvas);
}
fitCanvas();
ctx.imageSmoothingEnabled=false;
let last=0,acc=0,fpsAvg=16;
const DT=1/60;
function frame(t){
  requestAnimationFrame(frame);
  const now=t/1000;
  let dt=now-last;last=now;
  if(dt>0.25)dt=0.25;
  fpsAvg=fpsAvg*0.95+(dt*1000)*0.05;
  Game.rowStep=fpsAvg>26?2:1;
  acc+=dt;
  while(acc>=DT){
    acc-=DT;
    refreshSteer();
    if(Game.state==='race'&&Game.race){
      if(!Game.paused){
        stepRace(Game.race,DT,Input);
        if(Game.race.resultsShown){
          Game.race._endT=(Game.race._endT||0)+DT;
          if(Game.race._endT>2.2){Game.race._endT=-999;endRaceFlow();}
        }
      }
    }else if(Game.attract){
      /* attract: everyone AI, no sound spam */
      for(const k of Game.attract.karts) stepKart(k,aiInput(k,Game.attract),Game.attract.track,DT,1,Game.attract);
      kartContacts(Game.attract);
    }
    Input.item=false;
  }
  /* draw */
  if(Game.state==='race'&&Game.race){
    drawRace(ctx,Game.race,Game.skies);
    if(!Game.paused)drawHUD(ctx,Game.race);
    if(Game.race.state==='racing'&&Game.race.resultsShown&&Game.race._endT>=0){
      ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,VH/2-34,VW,68);
      ctx.fillStyle='#ffb000';ctx.font='bold 40px "Courier New",monospace';ctx.textAlign='center';
      ctx.fillText('META!',VW/2,VH/2-22);ctx.textAlign='left';
    }
  }else if(Game.attract){
    drawRace(ctx,Game.attract,Game.skies);
  }
}

/* ------------------------------- boot --------------------------------- */
function boot(){
  setupTouch();
  const s=loadSave();
  if(s.sound===false)Audio8.setEnabled(false);
  builtTrack(0);
  showTitle();
  requestAnimationFrame(frame);
}
boot();

/* ----------------------------- test hooks ----------------------------- */
window.__MK={Game,Game2:Game,DRIVERS,TRACKS,ITEMS,SONGS,Audio8,Input,Tilt,touch,refreshSteer,
  tiltMat,tiltAxes,tiltTwist,tiltSteerFromTwist,tiltLeanFromAxes,tiltPedalFromLean,tiltRecalibrate,segDist,
  buildTrack,builtTrack,makeRace,stepRace,stepKart,aiInput,kartContacts,
  circleHitsWall,pushOutOfWalls,WALL_R,KART_R,hitsKart,
  stepWorldItems,useItem,hitKart,rollItem,maxSpeed,tileAt,project,fmtTime,
  startRace,startGP,showTitle,showCC,showChars,showTracks,showGuide,TILE,
  drawRace,drawHUD,renderWorld,
  fitCanvas,updateRotateHint,Orient,orientRequestLock,orientRelease,tiltEffectiveAngle,screenAngleDeg,
  T_OFFROAD,T_ROAD,T_WALL,T_BOOST,T_ITEM,T_START,T_COIN};
})();
