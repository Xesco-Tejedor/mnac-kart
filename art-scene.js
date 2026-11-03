/* MNAC KART - art-scene.js: painted scenery sprites and horizon backdrops */
'use strict';
(function(){
const A=window.MNACArt,{TAU,rng,hex,shade,mix,cv,lg,rg,rr,ell}=A.H,themeOf=A.themeOf,THEME=A.THEME;
function stoneFill(x,w,h,seed,alpha){const r=rng(seed);for(let i=0;i<w*h/40;i++){x.fillStyle=r()<.5?'rgba(0,0,0,'+alpha+')':'rgba(255,255,255,'+alpha*.8+')';x.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}}
function column(x,cx,top,bot,w,th){
  const sw=w*0.62;
  x.fillStyle=lg(x,cx-sw/2,0,cx+sw/2,0,[[0,th.stoneD],[.3,shade(th.stone,.35)],[.6,th.stone],[1,shade(th.stoneD,-.2)]]);
  x.fillRect(cx-sw/2,top+w*.55,sw,bot-top-w*.9);
  x.strokeStyle='rgba(0,0,0,.18)';x.lineWidth=.8;for(let f=-1;f<=1;f+=.5){x.beginPath();x.moveTo(cx+f*sw*.38,top+w*.6);x.lineTo(cx+f*sw*.38,bot-w*.4);x.stroke();}
  x.beginPath();x.moveTo(cx-sw/2,top+w*.55);x.lineTo(cx-w*.55,top+w*.12);x.lineTo(cx+w*.55,top+w*.12);x.lineTo(cx+sw/2,top+w*.55);x.closePath();
  x.fillStyle=lg(x,0,top,0,top+w*.55,[[0,shade(th.stone,.25)],[1,shade(th.stoneD,.1)]]);x.fill();x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=1;x.stroke();
  x.fillStyle=shade(th.stone,.3);rr(x,cx-w*.6,top,w*1.2,w*.16,2);x.fill();x.stroke();
  for(let k=-2;k<=2;k++){ell(x,cx+k*w*.18,top+w*.36,w*.06,w*.1);x.fillStyle='rgba(0,0,0,.25)';x.fill();}
  x.fillStyle=shade(th.stoneD,.15);rr(x,cx-w*.55,bot-w*.35,w*1.1,w*.35,2);x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.stroke();
  x.fillStyle=shade(th.stone,.1);rr(x,cx-w*.45,bot-w*.55,w*.9,w*.25,2);x.fill();x.stroke();
}
function archPath(x,x0,x1,yBase,yTop){const r=(x1-x0)/2;x.beginPath();x.moveTo(x0,yBase);x.lineTo(x0,yTop+r);x.arc((x0+x1)/2,yTop+r,r,Math.PI,0);x.lineTo(x1,yBase);x.closePath();}
const DECOR_H={columna:128,capitell:104,fresc:112,vitrina:90,gargola:96,fanal:132,busto:92,planta:100,arcada:120};
const SIZES={columna:[40,128],capitell:[44,104],fresc:[60,112],vitrina:[52,90],gargola:[52,96],fanal:[34,132],busto:[44,92],planta:[56,100],arcada:[192,120]};

function pantocrator(x,cx,top,s,full){ /* mandorla + Christ in majesty */
  x.beginPath();x.moveTo(cx,top);x.bezierCurveTo(cx+26*s,top+30*s,cx+26*s,top+96*s,cx,top+124*s);x.bezierCurveTo(cx-26*s,top+96*s,cx-26*s,top+30*s,cx,top);
  x.fillStyle=rg(x,cx,top+62*s,3,46*s,[[0,'#fff4b8'],[.7,'#f0b038'],[1,'#c8841c']]);x.fill();x.strokeStyle='#fff';x.lineWidth=1.2;x.stroke();
  ell(x,cx,top+34*s,8*s,9*s);x.fillStyle='#e8c49a';x.fill();ell(x,cx,top+34*s,12*s,12*s);x.strokeStyle='#d33b2c';x.lineWidth=1.8;x.stroke();
  x.beginPath();x.moveTo(cx-14*s,top+128*s);x.quadraticCurveTo(cx-16*s,top+62*s,cx,top+50*s);x.quadraticCurveTo(cx+16*s,top+62*s,cx+14*s,top+128*s);x.closePath();x.fillStyle='#b8352a';x.fill();
  x.beginPath();x.moveTo(cx,top+52*s);x.lineTo(cx+12*s,top+128*s);x.lineTo(cx+2*s,top+128*s);x.closePath();x.fillStyle='#2a5aa8';x.fill();
  rr(x,cx-6*s,top+72*s,12*s,10*s,1);x.fillStyle='#ffd75e';x.fill();
}
function wallSegment(x,w,h,th,r){
  const k=th.key;
  x.fillStyle=lg(x,0,0,0,h,[[0,shade(th.stone,.12)],[1,shade(th.stoneD,.05)]]);x.fillRect(0,0,w,h);
  x.strokeStyle='rgba(0,0,0,.14)';x.lineWidth=1;
  for(let y=6;y<h;y+=12){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();for(let xx=((y/12|0)%2)*14;xx<w;xx+=28){x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+12);x.stroke();}}
  stoneFill(x,w,h,k.charCodeAt(0),.08);
  const ax0=34,ax1=w-34,ay=h-4,at=14;
  archPath(x,ax0,ax1,ay,at);
  if(k==='t'){
    x.fillStyle=lg(x,0,at,0,ay,[[0,'#16356b'],[1,'#0a1b3c']]);x.fill();
    x.save();archPath(x,ax0,ax1,ay,at);x.clip();
    pantocrator(x,w/2,24,.62,true);
    for(let i=0;i<6;i++){const fx=ax0+8+i*20;if(Math.abs(fx-w/2)<20)continue;ell(x,fx,92,3,3.5);x.fillStyle='#e8c49a';x.fill();x.fillStyle=i%2?'#c0392b':'#ddd';x.fillRect(fx-4,95,8,14);}
    x.fillStyle='#e6c24a';x.fillRect(ax0,ay-14,ax1-ax0,3);x.restore();
  }else if(k==='m'){
    x.fillStyle=lg(x,0,at,0,ay,[[0,'#070b22'],[.7,'#1c2860'],[1,'#e08a3a']]);x.fill();
    x.save();archPath(x,ax0,ax1,ay,at);x.clip();
    for(let i=0;i<18;i++){const bx=ax0+i*7,bh=6+(r()*18|0);x.fillStyle='#0a0f2a';x.fillRect(bx,ay-bh-8,6,bh+8);x.fillStyle='#ffd070';if(r()<.8)x.fillRect(bx+1,ay-bh-5,1.4,1.4);if(r()<.6)x.fillRect(bx+3.5,ay-bh,1.4,1.4);}
    x.fillStyle='#fff';for(let i=0;i<14;i++)x.fillRect(ax0+r()*(ax1-ax0),at+r()*40,1,1);
    x.restore();
  }else{
    x.fillStyle=lg(x,0,at,0,ay,k==='v'?[[0,'#2a1a0a'],[.6,'#a8702a'],[1,'#ffd48a']]:[[0,'#16102a'],[.6,'#4a3a78'],[1,'#b8a8e0']]);x.fill();
    x.save();archPath(x,ax0,ax1,ay,at);x.clip();
    for(let i=0;i<3;i++){const inset=14+i*14;archPath(x,ax0+inset,ax1-inset,ay,at+inset*1.1);x.fillStyle='rgba(0,0,0,'+(.22+i*.1)+')';x.fill();x.strokeStyle='rgba(255,230,170,.35)';x.lineWidth=1;x.stroke();}
    x.restore();
  }
  x.lineWidth=5;x.strokeStyle=lg(x,0,0,w,0,[[0,shade(th.stone,.4)],[.5,shade(th.stone,.1)],[1,shade(th.stoneD,.1)]]);archPath(x,ax0,ax1,ay,at);x.stroke();
  x.lineWidth=1.2;x.strokeStyle='rgba(0,0,0,.55)';archPath(x,ax0-2.5,ax1+2.5,ay,at-2.5);x.stroke();archPath(x,ax0+2.5,ax1-2.5,ay,at+2.5);x.stroke();
  x.fillStyle=shade(th.stone,.35);x.beginPath();x.moveTo(w/2-5,at-4);x.lineTo(w/2+5,at-4);x.lineTo(w/2+3.5,at+8);x.lineTo(w/2-3.5,at+8);x.closePath();x.fill();x.strokeStyle='rgba(0,0,0,.5)';x.lineWidth=1;x.stroke();
  column(x,16,6,h-1,26,th);column(x,w-16,6,h-1,26,th);
  x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,0,w,5);x.fillStyle=th.inlay;x.fillRect(0,5,w,1.6);
  if(k==='v'){x.fillStyle='#8a1c1c';x.beginPath();x.moveTo(w/2-14,8);x.lineTo(w/2+14,8);x.lineTo(w/2+14,34);x.lineTo(w/2,42);x.lineTo(w/2-14,34);x.closePath();x.fill();x.strokeStyle='#ffd75e';x.lineWidth=1.4;x.stroke();
    x.fillStyle='#ffd75e';x.font='bold 9px serif';x.textAlign='center';x.fillText('MNAC',w/2,27);x.textAlign='left';}
  if(k==='c'){x.fillStyle=th.inlay;for(let i=0;i<5;i++){ell(x,ax0+10+i*((ax1-ax0-20)/4),12,2.6,2.6);x.fill();}}
  if(k==='m'){x.fillStyle=lg(x,0,0,0,10,[[0,shade(th.stone,.3)],[1,th.stoneD]]);x.fillRect(0,h-16,w,5);
    for(let i=0;i<w;i+=8){rr(x,i+1,h-11,5,11,2);x.fillStyle=shade(th.stone,.15);x.fill();}}
  x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,h-3,w,3);
}
function decor(kind){
  const parts=kind.split('_'),base=parts[0],tk=parts[1]||'v';
  const th=Object.values(THEME).find(t=>t.key===tk)||THEME.vestibul;
  const S=2,sz=SIZES[base]||[40,90],w=sz[0],h=sz[1];
  const c=cv(w*S,h*S),x=c.getContext('2d');x.scale(S,S);x.lineJoin='round';x.lineCap='round';
  const r=rng(base.length*131+tk.charCodeAt(0));
  const plinth=(px,py,pw,ph)=>{x.fillStyle=lg(x,px,0,px+pw,0,[[0,shade(th.stone,.3)],[1,shade(th.stoneD,-.1)]]);rr(x,px,py,pw,ph,2);x.fill();x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=1;x.stroke();};
  switch(base){
  case 'columna':column(x,w/2,2,h-2,w*.78,th);break;
  case 'capitell':
    plinth(6,h-26,w-12,26);
    x.fillStyle=lg(x,0,0,w,0,[[0,shade(th.stone,.4)],[.5,th.stone],[1,shade(th.stoneD,-.1)]]);
    x.beginPath();x.moveTo(8,h-26);x.lineTo(2,40);x.lineTo(w-2,40);x.lineTo(w-8,h-26);x.closePath();x.fill();x.strokeStyle='rgba(0,0,0,.45)';x.stroke();
    rr(x,0,32,w,10,2);x.fillStyle=shade(th.stone,.3);x.fill();x.stroke();
    for(let k=0;k<4;k++){const fx=8+k*9;ell(x,fx,53,2.4,2.4);x.fillStyle='rgba(60,40,20,.45)';x.fill();x.fillRect(fx-2,55,4,10);ell(x,fx,66,2.2,6);x.fill();}
    x.strokeStyle='#ffd75e';x.lineWidth=1.4;x.beginPath();x.moveTo(4,43);x.lineTo(w-4,43);x.stroke();
    rr(x,w/2-10,6,20,28,3);x.fillStyle=lg(x,0,6,0,34,[[0,'#7fb8d8'],[1,'#c8e4ee']]);x.globalAlpha=.8;x.fill();x.globalAlpha=1;x.strokeStyle='#e6c24a';x.stroke();
    break;
  case 'fresc':
    x.fillStyle='#3a2a1c';x.fillRect(w/2-3,86,6,26);x.fillRect(w/2-14,106,28,6);
    archPath(x,4,w-4,86,4);x.fillStyle='#e6c24a';x.fill();
    archPath(x,8,w-8,82,8);x.fillStyle=lg(x,0,8,0,82,[[0,'#1c3f7a'],[1,'#0c1f44']]);x.fill();
    x.save();archPath(x,8,w-8,82,8);x.clip();pantocrator(x,w/2,14,.55,false);x.restore();
    break;
  case 'vitrina':
    plinth(4,h-14,w-8,14);
    rr(x,6,10,w-12,h-22,3);x.fillStyle=lg(x,6,10,w-6,h-12,[[0,'rgba(200,235,255,.5)'],[.5,'rgba(160,210,240,.25)'],[1,'rgba(220,245,255,.45)']]);x.fill();x.strokeStyle='#e6c24a';x.lineWidth=2;x.stroke();
    x.fillStyle=lg(x,0,0,w,0,[[0,'#b8860b'],[.5,'#ffe58a'],[1,'#9a6c08']]);
    x.beginPath();x.moveTo(w/2-9,28);x.quadraticCurveTo(w/2,50,w/2+9,28);x.closePath();x.fill();rr(x,w/2-1.5,40,3,16,1);x.fill();rr(x,w/2-8,56,16,4,2);x.fill();
    x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=1.3;x.beginPath();x.moveTo(11,16);x.lineTo(11,h-24);x.stroke();x.beginPath();x.moveTo(15,14);x.lineTo(30,h-30);x.stroke();
    break;
  case 'gargola':
    plinth(8,h-22,w-16,22);
    A.batWing(x,w/2-6,h-40,-1,'#6a6a72','#2a2a30');A.batWing(x,w/2+6,h-40,1,'#6a6a72','#2a2a30');
    x.beginPath();x.moveTo(w/2-10,h-22);x.quadraticCurveTo(w/2-14,h-44,w/2-6,h-52);x.lineTo(w/2+6,h-52);x.quadraticCurveTo(w/2+14,h-44,w/2+10,h-22);x.closePath();
    x.fillStyle=lg(x,0,0,w,0,[[0,'#8a8a94'],[.5,'#6a6a73'],[1,'#44444c']]);x.fill();x.strokeStyle='#1a1a1f';x.lineWidth=1.2;x.stroke();
    ell(x,w/2,h-58,9,9);x.fill();x.stroke();
    [-1,1].forEach(s=>{x.beginPath();x.moveTo(w/2+s*5,h-64);x.lineTo(w/2+s*11,h-76);x.lineTo(w/2+s*1,h-65);x.fillStyle='#55555d';x.fill();x.stroke();ell(x,w/2+s*3.6,h-60,1.8,1.6);x.fillStyle='#ffcf40';x.fill();});
    break;
  case 'fanal':
    x.fillStyle=lg(x,0,0,w,0,[[0,'#1a1a22'],[.5,'#4a4a58'],[1,'#14141a']]);
    rr(x,w/2-2.5,24,5,h-24,1);x.fill();rr(x,w/2-8,h-10,16,10,2);x.fill();rr(x,w/2-5,h-24,10,14,2);x.fill();
    x.strokeStyle='#2a2a35';x.lineWidth=2;x.beginPath();x.moveTo(w/2,50);x.bezierCurveTo(w/2-14,48,w/2-14,36,w/2-6,34);x.moveTo(w/2,50);x.bezierCurveTo(w/2+14,48,w/2+14,36,w/2+6,34);x.stroke();
    x.save();x.shadowColor='rgba('+th.glow+',1)';x.shadowBlur=14;
    rr(x,w/2-6,6,12,20,3);x.fillStyle=rg(x,w/2,16,1,12,[[0,'#fffbe0'],[1,'rgb('+th.glow+')']]);x.fill();x.restore();
    x.strokeStyle='#14141a';x.lineWidth=1.5;rr(x,w/2-6,6,12,20,3);x.stroke();x.beginPath();x.moveTo(w/2,6);x.lineTo(w/2,26);x.stroke();
    x.beginPath();x.moveTo(w/2-9,6);x.lineTo(w/2,0);x.lineTo(w/2+9,6);x.closePath();x.fillStyle='#14141a';x.fill();
    break;
  case 'busto':
    plinth(6,h-34,w-12,34);x.fillStyle='rgba(255,255,255,.12)';x.fillRect(9,h-30,3,26);
    x.beginPath();x.moveTo(w/2-14,h-34);x.bezierCurveTo(w/2-14,h-48,w/2-9,h-50,w/2-5,h-52);x.lineTo(w/2+5,h-52);x.bezierCurveTo(w/2+9,h-50,w/2+14,h-48,w/2+14,h-34);x.closePath();
    x.fillStyle=lg(x,0,0,w,0,[[0,'#f6f2ea'],[.6,'#d8d2c4'],[1,'#a8a294']]);x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=1;x.stroke();
    ell(x,w/2,h-60,8,10);x.fill();x.stroke();
    x.fillStyle='rgba(0,0,0,.3)';ell(x,w/2-3,h-61,1.4,1);x.fill();ell(x,w/2+3,h-61,1.4,1);x.fill();
    break;
  case 'planta':
    x.fillStyle=lg(x,0,0,w,0,[[0,'#8a4a22'],[.5,'#c46a34'],[1,'#6a3416']]);
    x.beginPath();x.moveTo(w/2-12,h-24);x.lineTo(w/2+12,h-24);x.lineTo(w/2+8,h);x.lineTo(w/2-8,h);x.closePath();x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.stroke();
    x.fillStyle='#ffd75e';x.fillRect(w/2-12,h-26,24,4);
    for(let i=0;i<9;i++){const a=(i-4)*0.38;x.save();x.translate(w/2,h-26);x.rotate(a);
      x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(6,-30,0,-58+Math.abs(i-4)*5);x.quadraticCurveTo(-6,-30,0,0);x.fillStyle=lg(x,-6,0,6,0,[[0,'#1d6b34'],[.5,'#3fb35a'],[1,'#14502a']]);x.fill();x.strokeStyle='rgba(0,0,0,.25)';x.lineWidth=.8;x.stroke();x.restore();}
    break;
  case 'arcada':wallSegment(x,w,h,th,r);break;
  }
  return c;
}
function backdrop(def){
  const W=1920,H=210,c=cv(W,H),x=c.getContext('2d');
  const th=themeOf(def),k=th.key,r=rng(77+k.charCodeAt(0));
  x.fillStyle=lg(x,0,0,0,H,[[0,th.sky0],[.7,mix(th.sky0,th.sky1,.6)],[1,th.sky1]]);x.fillRect(0,0,W,H);
  if(k==='m'){
    x.fillStyle='#fff';for(let i=0;i<220;i++){x.globalAlpha=.25+r()*.75;x.fillRect(r()*W,r()*120,1+(r()<.15),1+(r()<.15));}x.globalAlpha=1;
    ell(x,1500,44,16,16);x.fillStyle=rg(x,1496,40,2,18,[[0,'#fff'],[1,'#d6e2ff']]);x.fill();
    x.fillStyle='#10163a';x.beginPath();x.moveTo(0,H);for(let i=0;i<=W;i+=24)x.lineTo(i,128+Math.sin(i/160)*14+Math.sin(i/57)*5);x.lineTo(W,H);x.closePath();x.fill();
    for(let i=0;i<W;i+=3){const hh=r()*26;x.fillStyle='#161d4a';x.fillRect(i,160-hh,3,hh+50);if(r()<.5){x.fillStyle='rgba(255,208,112,'+(.4+r()*.6)+')';x.fillRect(i,160-hh+r()*hh,1.5,1.5);}}
    for(let b=0;b<2;b++){const ox=b*960+260;
      x.fillStyle='#0a0e2a';x.fillRect(ox-110,150,220,50);x.fillRect(ox-70,128,140,26);
      x.beginPath();x.arc(ox,128,30,Math.PI,0);x.fill();x.fillRect(ox-6,86,12,12);x.beginPath();x.arc(ox,86,6,Math.PI,0);x.fill();
      [-100,100].forEach(s=>{x.fillRect(ox+s-10,112,20,50);x.beginPath();x.arc(ox+s,112,10,Math.PI,0);x.fill();});
      x.fillStyle='rgba(255,200,100,.85)';for(let i=-4;i<=4;i++)for(let j=0;j<2;j++)x.fillRect(ox+i*13-2,150+j*14,4,7);
      x.fillStyle=rg(x,ox,150,10,160,[[0,'rgba(255,190,100,.35)'],[1,'rgba(255,190,100,0)']]);x.fillRect(ox-160,0,320,H);
      x.fillStyle=rg(x,ox,196,2,50,[[0,'rgba(120,220,255,.8)'],[1,'rgba(120,220,255,0)']]);x.fillRect(ox-60,150,120,60);
    }
    [700,1660].forEach(px=>{[-24,24].forEach(s=>{x.fillStyle='#0b1032';x.fillRect(px+s-7,92,14,110);x.beginPath();x.moveTo(px+s-9,92);x.lineTo(px+s,70);x.lineTo(px+s+9,92);x.fill();x.fillStyle='rgba(255,200,110,.8)';x.fillRect(px+s-1.5,100,3,6);x.fillRect(px+s-1.5,116,3,6);});});
  }else{
    for(let i=0;i<8;i++){const gx=120+i*240;x.fillStyle=rg(x,gx,10,4,150,[[0,'rgba('+th.glow+',.55)'],[1,'rgba('+th.glow+',0)']]);x.fillRect(gx-150,0,300,H);}
    const period=240,top=34,colW=12,n=W/period;
    for(let i=0;i<n;i++){
      const x0=i*period+colW,x1=(i+1)*period-colW,cx=(x0+x1)/2;
      archPath(x,x0,x1,H-6,top);
      x.fillStyle=lg(x,0,top,0,H,[[0,mix(th.sky0,'#000000',.5)],[.6,mix(th.sky0,th.fog,.35)],[1,mix(th.fog,'#ffffff',.15)]]);x.fill();
      x.save();archPath(x,x0,x1,H-6,top);x.clip();
      if(k==='t'&&i%2===0){
        x.fillStyle=lg(x,0,top,0,H,[[0,'#18386f'],[1,'#0b1c40']]);x.fillRect(x0,top,x1-x0,H);
        pantocrator(x,cx,top+12,.95,true);
        for(let a=0;a<5;a++){const ax=x0+10+a*((x1-x0-20)/4);if(Math.abs(ax-cx)<28)continue;ell(x,ax,top+118,4.5,5);x.fillStyle='#e8c49a';x.fill();x.fillStyle=a%2?'#c0392b':'#e8e0cc';x.fillRect(ax-6,top+123,12,30);}
        x.fillStyle='#e8c34a';x.fillRect(x0,top+36,x1-x0,2);
      }else{
        for(let a=1;a<4;a++){const ins=a*(x1-x0)*.11;archPath(x,x0+ins,x1-ins,H-6,top+ins*1.3);x.fillStyle='rgba(0,0,0,.2)';x.fill();x.strokeStyle='rgba('+th.glow+',.28)';x.lineWidth=1;x.stroke();}
        x.fillStyle=rg(x,cx,H-40,2,60,[[0,'rgba('+th.glow+',.55)'],[1,'rgba('+th.glow+',0)']]);x.fillRect(x0,top,x1-x0,H);
      }
      x.restore();
      x.lineWidth=colW*0.55;x.strokeStyle=shade(th.stone,.05);archPath(x,x0,x1,H-6,top);x.stroke();
      x.lineWidth=1;x.strokeStyle='rgba(0,0,0,.5)';archPath(x,x0-colW*.28,x1+colW*.28,H-6,top-colW*.28);x.stroke();
    }
    for(let i=0;i<n;i++)column(x,i*period,top+10,H-3,colW*1.9,th);
    x.fillStyle='rgba(0,0,0,.28)';x.fillRect(0,0,W,12);x.fillStyle=th.inlay;x.fillRect(0,12,W,2);
    if(k==='v')for(let b=0;b<4;b++){const bx=b*480+240;
      x.fillStyle='#8a1c1c';x.beginPath();x.moveTo(bx-12,14);x.lineTo(bx+12,14);x.lineTo(bx+12,52);x.lineTo(bx,62);x.lineTo(bx-12,52);x.closePath();x.fill();x.strokeStyle='#ffd75e';x.lineWidth=1.4;x.stroke();
      x.fillStyle='#ffd75e';x.font='bold 8px serif';x.textAlign='center';x.fillText('MNAC',bx,38);x.textAlign='left';}
    if(k==='c')for(let b=0;b<8;b++){const bx=b*240+120;ell(x,bx,24,5,5);x.fillStyle=th.inlay;x.fill();}
  }
  for(let i=0;i<9;i++){const sx=r()*W,wd=20+r()*40,sk=60+r()*80;x.fillStyle=lg(x,0,0,0,H,[[0,'rgba('+th.glow+',.28)'],[1,'rgba('+th.glow+',0)']]);
    x.beginPath();x.moveTo(sx,0);x.lineTo(sx+wd,0);x.lineTo(sx+wd+sk,H);x.lineTo(sx+sk-wd*.2,H);x.closePath();x.fill();}
  const fc=hex(th.fog).join(','),g=x.createLinearGradient(0,H-36,0,H);g.addColorStop(0,'rgba('+fc+',0)');g.addColorStop(1,'rgba('+fc+',.85)');x.fillStyle=g;x.fillRect(0,H-36,W,36);
  return c;
}
A.decor=decor;A.DECOR_H=DECOR_H;A.backdrop=backdrop;
})();
