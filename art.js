/* =========================================================================
   MNAC KART - art.js (core helpers, themes, light and post effects)
   Painted procedural art: canvas vector paths, gradients, noise.
   No external assets. Loaded before game.js, after nothing.
   Other art-*.js files attach to window.MNACArt.
   ========================================================================= */
'use strict';
(function(){
const TAU=Math.PI*2;
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function hex(c){c=c.replace('#','');if(c.length===3)c=c.split('').map(h=>h+h).join('');return[parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)];}
function rgb(a){return'rgb('+(a[0]|0)+','+(a[1]|0)+','+(a[2]|0)+')';}
function shade(c,f){const a=hex(c);return f>=0?rgb(a.map(v=>v+(255-v)*f)):rgb(a.map(v=>v*(1+f)));}
function mix(c1,c2,t){const a=hex(c1),b=hex(c2);return rgb(a.map((v,i)=>v+(b[i]-v)*t));}
function cv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function lg(x,x0,y0,x1,y1,stops){const g=x.createLinearGradient(x0,y0,x1,y1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
function rg(x,cx,cy,r0,r1,stops){const g=x.createRadialGradient(cx,cy,r0,cx,cy,r1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g;}
function rr(x,px,py,w,h,r){x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();}
function ell(x,cx,cy,rx,ry,rot){x.beginPath();x.ellipse(cx,cy,rx,ry,rot||0,0,TAU);}

const THEME={
 vestibul:{key:'v',stone:'#d9b678',stoneD:'#8d6b3a',floorA:'#c9ad7d',floorB:'#a98a5c',road:'#e2c48f',road2:'#c7a56e',inlay:'#ffb000',wall:'#b08848',sky0:'#4a2e14',sky1:'#f0b55a',fog:'#d9a24c',glow:'255,190,90',kerbA:'#b3262b',kerbB:'#f4e7c8'},
 capitells:{key:'c',stone:'#b9b3c4',stoneD:'#5e5870',floorA:'#8f8a9c',floorB:'#767184',road:'#cfc9d6',road2:'#b0aabd',inlay:'#e8c34a',wall:'#7f7a8e',sky0:'#1e1730',sky1:'#8e7ab5',fog:'#6e6290',glow:'200,170,255',kerbA:'#2f6d9e',kerbB:'#f4e7c8'},
 tauell:{key:'t',stone:'#d99a58',stoneD:'#7a3f1c',floorA:'#b9783f',floorB:'#9d6232',road:'#e3ac6a',road2:'#c98d4d',inlay:'#ffd75e',wall:'#a8612b',sky0:'#3a1608',sky1:'#e0803a',fog:'#c8622a',glow:'255,150,70',kerbA:'#8f1d1d',kerbB:'#f1dfb5'},
 mirador:{key:'m',stone:'#8e95b8',stoneD:'#3a3f66',floorA:'#4a4f78',floorB:'#3f4468',road:'#8c93bd',road2:'#737aa5',inlay:'#7de3ff',wall:'#454a73',sky0:'#050818',sky1:'#33406e',fog:'#2a3566',glow:'120,200,255',kerbA:'#e0397a',kerbB:'#dce8ff'}
};
function themeOf(def){return THEME[def.id]||THEME.vestibul;}

const FX={};
function postFx(ctx,def,t,speed){
  const th=themeOf(def),VW=480,VH=270,HOR=104;
  let g=FX['haze'+def.id];
  if(!g){g=cv(1,60);const x=g.getContext('2d');const gg=x.createLinearGradient(0,0,0,60);gg.addColorStop(0,'rgba('+hex(th.fog).join(',')+',.6)');gg.addColorStop(1,'rgba('+hex(th.fog).join(',')+',0)');x.fillStyle=gg;x.fillRect(0,0,1,60);FX['haze'+def.id]=g;}
  ctx.imageSmoothingEnabled=true;ctx.drawImage(g,0,HOR-2,VW,56);
  ctx.save();ctx.globalCompositeOperation='screen';
  const bl=ctx.createRadialGradient(VW/2,-30,10,VW/2,-30,330);bl.addColorStop(0,'rgba('+th.glow+',.2)');bl.addColorStop(1,'rgba('+th.glow+',0)');ctx.fillStyle=bl;ctx.fillRect(0,0,VW,VH);
  ctx.restore();
  ctx.fillStyle='rgba('+th.glow+',.5)';
  for(let i=0;i<22;i++){const px=(i*97.3+t*(4+i%5))%VW,py=(HOR-30+(i*53.1+Math.sin(t*.6+i)*10))%(VH-40);ctx.fillRect(px,py,1.3,1.3);}
  let v=FX.vig;
  if(!v){v=cv(VW,VH);const x=v.getContext('2d');const rgd=x.createRadialGradient(VW/2,VH*.55,VH*.45,VW/2,VH*.55,VW*.62);rgd.addColorStop(0,'rgba(0,0,0,0)');rgd.addColorStop(1,'rgba(6,3,10,.55)');x.fillStyle=rgd;x.fillRect(0,0,VW,VH);FX.vig=v;}
  ctx.drawImage(v,0,0);
  if(speed>0.75){ctx.strokeStyle='rgba(255,255,255,'+((speed-.75)*.6)+')';ctx.lineWidth=1;for(let i=0;i<8;i++){const a=(i*.9+t*7)%1,sx=VW/2+(i%2?1:-1)*(120+i*14),sy=HOR+30+a*120;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+(sx>VW/2?1:-1)*a*30,sy+a*40);ctx.stroke();}}
}

/* perimeter wall bays: one painted arcade bay per 3 tiles, themed per hall */
function perimeter(def){
  const k=themeOf(def).key,out=[],kind='arcada_'+k;
  for(let x=1;x<def.w-1;x+=3){out.push([x,0.3,kind]);out.push([x,def.h-1.3,kind]);}
  for(let y=1;y<def.h-1;y+=3){out.push([0.3,y,kind]);out.push([def.w-1.3,y,kind]);}
  return out;
}
function themedKind(kind,def){return kind+'_'+themeOf(def).key;}

window.MNACArt={H:{TAU,rng,hex,rgb,shade,mix,cv,lg,rg,rr,ell},THEME,themeOf,postFx,perimeter,themedKind};
})();
