/* MNAC KART - art-karts.js: painted karts (96x80) and driver portraits (48x48) */
'use strict';
(function(){
const A=window.MNACArt,{TAU,rng,shade,mix,cv,lg,rg,rr,ell}=A.H;
function tire(x,cx,cy,w,h,glow){
  if(glow){x.save();x.shadowColor=glow;x.shadowBlur=8;}
  rr(x,cx-w/2,cy-h/2,w,h,w*0.38);x.fillStyle=lg(x,cx-w/2,0,cx+w/2,0,[[0,'#1a1a1f'],[.5,'#3d3d46'],[1,'#141418']]);x.fill();
  if(glow)x.restore();
  x.strokeStyle='#0a0a0d';x.lineWidth=1;x.stroke();
  x.strokeStyle='rgba(255,255,255,.12)';
  for(let t=cy-h/2+3;t<cy+h/2-2;t+=3){x.beginPath();x.moveTo(cx-w/2+1.5,t);x.lineTo(cx+w/2-1.5,t);x.stroke();}
  ell(x,cx,cy,w*0.2,h*0.16);x.fillStyle='#e6c24a';x.fill();
}
function wingFeathers(x,cx,cy,side,col,n,len){
  for(let i=0;i<n;i++){
    const a=-0.5+i*(1.7/n);
    x.save();x.translate(cx,cy);x.rotate(side*(0.4+a));
    const L=len*(1-i*0.07);
    x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(side*L*0.5,-6,side*L,2+i*1.5);x.quadraticCurveTo(side*L*0.5,8,0,5);x.closePath();
    x.fillStyle=lg(x,0,0,side*L,0,[[0,'#ffffff'],[1,col]]);x.fill();
    x.strokeStyle='rgba(120,100,60,.55)';x.lineWidth=.8;x.stroke();x.restore();
  }
}
function batWing(x,cx,cy,side,col,rib){
  x.save();x.translate(cx,cy);x.scale(side,1);
  x.beginPath();x.moveTo(0,0);x.lineTo(20,-12);x.quadraticCurveTo(30,-14,34,-6);
  x.quadraticCurveTo(28,-2,33,6);x.quadraticCurveTo(24,4,26,14);x.quadraticCurveTo(14,8,8,16);x.lineTo(0,10);x.closePath();
  x.fillStyle=lg(x,0,0,34,0,[[0,shade(col,-.2)],[1,shade(col,.1)]]);x.fill();
  x.strokeStyle=rib;x.lineWidth=1.3;x.stroke();
  x.beginPath();x.moveTo(0,2);x.lineTo(30,-6);x.moveTo(2,4);x.lineTo(26,14);x.moveTo(1,3);x.lineTo(33,6);x.stroke();
  x.restore();
}
A.wingFeathers=wingFeathers;A.batWing=batWing;

function kart(d){
  const W=96,H=80,c=cv(W,H),x=c.getContext('2d');
  const body=d.body,trim=d.trim,skin=d.skin,hat=d.hat,ex=d.extra||'',id=d.id;
  x.lineJoin='round';x.lineCap='round';
  if(id==='serafi'){wingFeathers(x,34,40,-1,'#e8dcae',6,34);wingFeathers(x,62,40,1,'#e8dcae',6,34);}
  if(id==='gargola'){batWing(x,32,44,-1,'#5d5d66','#2a2a30');batWing(x,64,44,1,'#5d5d66','#2a2a30');}
  if(id==='diable'){batWing(x,32,44,-1,'#8a1c2a','#2b0810');batWing(x,64,44,1,'#8a1c2a','#2b0810');}
  if(id==='crist'){
    x.save();x.beginPath();x.moveTo(48,2);x.bezierCurveTo(82,22,82,58,48,78);x.bezierCurveTo(14,58,14,22,48,2);x.closePath();
    x.fillStyle=rg(x,48,40,4,40,[[0,'rgba(255,240,170,.9)'],[.6,'rgba(255,200,70,.45)'],[1,'rgba(255,170,30,.05)']]);x.fill();
    x.strokeStyle='#ffd75e';x.lineWidth=2.2;x.stroke();x.strokeStyle='#fff6c8';x.lineWidth=.8;x.stroke();x.restore();
  }
  const glow=id==='santlluc'?'#ff6a00':null;
  const wr=[[19,64,15,22],[77,64,15,22],[17,17,11,15],[79,17,11,15]];
  if(ex==='seven'){wr.length=0;wr.push([20,66,14,20],[76,66,14,20],[16,42,13,18],[80,42,13,18],[18,16,11,14],[78,16,11,14],[48,9,12,12]);}
  wr.forEach(w=>tire(x,w[0],w[1],w[2],w[3],glow));
  x.fillStyle='#2a2a31';x.fillRect(26,62,44,4);x.fillRect(26,15,44,3);
  x.save();rr(x,12,68,72,8,3);x.fillStyle=lg(x,0,68,0,76,[[0,shade(trim,.35)],[1,shade(trim,-.25)]]);x.fill();
  x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=1;x.stroke();
  x.fillStyle='#e6c24a';x.fillRect(10,66,4,12);x.fillRect(82,66,4,12);x.restore();
  [[39,74],[57,74]].forEach(p=>{x.fillStyle=lg(x,p[0]-3,0,p[0]+3,0,[[0,'#333'],[.5,'#9a9aa5'],[1,'#222']]);rr(x,p[0]-3,p[1]-6,6,10,2);x.fill();ell(x,p[0],p[1]+4,2.6,1.6);x.fillStyle='#ff9a2a';x.fill();});
  x.beginPath();
  x.moveTo(41,5);x.quadraticCurveTo(48,1,55,5);
  x.bezierCurveTo(60,12,63,22,66,32);x.bezierCurveTo(72,42,73,52,70,64);
  x.quadraticCurveTo(48,70,26,64);x.bezierCurveTo(23,52,24,42,30,32);x.bezierCurveTo(33,22,36,12,41,5);x.closePath();
  x.fillStyle=lg(x,22,0,74,0,[[0,shade(body,-.35)],[.3,shade(body,.2)],[.55,body],[1,shade(body,-.4)]]);x.fill();
  x.lineWidth=1.8;x.strokeStyle=shade(body,-.65);x.stroke();
  x.save();x.clip();
  ell(x,44,22,9,16,-0.05);x.fillStyle='rgba(255,255,255,.22)';x.fill();
  x.fillStyle=lg(x,0,0,0,76,[[0,trim],[1,shade(trim,-.4)]]);x.fillRect(44,0,8,76);
  x.fillStyle='rgba(255,255,255,.3)';x.fillRect(44,0,2,76);
  x.fillStyle='rgba(0,0,0,.18)';x.fillRect(22,44,10,22);x.fillRect(64,44,10,22);
  x.restore();
  ell(x,48,20,5,5);x.fillStyle='#f4e7c8';x.fill();x.strokeStyle=shade(trim,-.4);x.lineWidth=1;x.stroke();
  if(id==='musa'){
    x.strokeStyle='#ffd75e';x.lineWidth=1.6;
    [-1,1].forEach(s=>{x.beginPath();x.moveTo(48+s*3,8);x.bezierCurveTo(48+s*14,12,48+s*4,22,48+s*14,30);x.bezierCurveTo(48+s*20,36,48+s*10,44,48+s*16,52);x.stroke();
      ell(x,48+s*16,52,2.2,2.2);x.fillStyle='#ffd75e';x.fill();});
  }
  if(id==='mestre'){
    x.save();x.translate(73,36);x.rotate(.25);rr(x,-1.5,-18,3,22,1);x.fillStyle='#7a5524';x.fill();rr(x,-2,-24,4,8,1.5);x.fillStyle='#d8412a';x.fill();x.restore();
    ell(x,24,46,8,6,-.4);x.fillStyle='#d9b57a';x.fill();x.strokeStyle='#5a3a12';x.lineWidth=1;x.stroke();
    [['#e03a2a',-3,-1],['#2a6bd8',1,-3],['#ffd23a',3,1],['#2aa84a',-1,2]].forEach(p=>{ell(x,24+p[1]*1.4,46+p[2]*1.2,1.7,1.5);x.fillStyle=p[0];x.fill();});
  }
  if(id==='gargola'){const r=rng(5);x.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<60;i++)x.fillRect(28+r()*40,10+r()*55,1.5,1.5);x.fillStyle='rgba(0,0,0,.14)';for(let i=0;i<40;i++)x.fillRect(28+r()*40,10+r()*55,1.5,1.5);}
  if(id==='santlluc'){x.strokeStyle='#ffcf40';x.lineWidth=1.4;for(let i=0;i<3;i++){x.beginPath();x.moveTo(34+i*3,56);x.quadraticCurveTo(38+i*3,44,34+i*3,34);x.stroke();x.beginPath();x.moveTo(62-i*3,56);x.quadraticCurveTo(58-i*3,44,62-i*3,34);x.stroke();}}
  rr(x,33,34,30,28,8);x.fillStyle=lg(x,0,34,0,62,[[0,'#3b2a20'],[1,'#17100c']]);x.fill();x.strokeStyle='#0b0705';x.lineWidth=1.2;x.stroke();
  ell(x,48,35,8,3.4);x.strokeStyle='#201a16';x.lineWidth=2.2;x.stroke();x.strokeStyle='#e6c24a';x.lineWidth=.8;x.stroke();
  const tc=id==='serafi'?'#f1ead0':(id==='agnus'?'#fffaf0':(id==='gargola'?'#7a7a84':(id==='diable'?'#6a1a30':body)));
  x.beginPath();x.moveTo(36,56);x.bezierCurveTo(34,46,36,41,42,40);x.lineTo(54,40);x.bezierCurveTo(60,41,62,46,60,56);x.closePath();
  x.fillStyle=lg(x,34,0,62,0,[[0,shade(tc,-.3)],[.45,shade(tc,.25)],[1,shade(tc,-.35)]]);x.fill();x.strokeStyle='rgba(0,0,0,.5)';x.lineWidth=1.2;x.stroke();
  const sleeve=shade(tc,.05);
  [-1,1].forEach(s=>{x.beginPath();x.moveTo(48+s*10,43);x.quadraticCurveTo(48+s*15,38,48+s*9,35);x.lineWidth=5;x.strokeStyle=sleeve;x.stroke();x.lineWidth=1;x.strokeStyle='rgba(0,0,0,.4)';x.stroke();ell(x,48+s*8,35,2.6,2.2);x.fillStyle=skin;x.fill();});
  if(id==='crist'||id==='mestre'||id==='musa'||id==='santlluc'){x.beginPath();x.moveTo(37,44);x.quadraticCurveTo(48,48,59,44);x.lineWidth=3;x.strokeStyle=trim;x.stroke();}
  x.save();x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=3;
  ell(x,48,38,8.4,9);x.fillStyle=rg(x,45,35,1,11,[[0,shade(skin,.25)],[1,shade(skin,-.25)]]);x.fill();x.restore();
  const hairTop=()=>{ell(x,48,36.5,8.8,8.2);x.fillStyle=rg(x,45,33,1,11,[[0,shade(hat,.3)],[1,shade(hat,-.3)]]);x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=1;x.stroke();};
  if(id==='mestre'){
    ell(x,50,34.5,12,9,.2);x.fillStyle=rg(x,46,31,1,14,[[0,'#d94d3a'],[1,'#7a1f16']]);x.fill();x.strokeStyle='#3a0c08';x.lineWidth=1;x.stroke();
    ell(x,48,28.5,1.6,1.6);x.fillStyle='#3a0c08';x.fill();
  }else if(id==='serafi'){hairTop();
    ell(x,48,28,12,5);x.strokeStyle='#ffe58a';x.lineWidth=2.4;x.stroke();x.strokeStyle='#fff9d0';x.lineWidth=.9;x.stroke();
  }else if(id==='crist'){hairTop();
    ell(x,48,27,12,6);x.strokeStyle='#ffd75e';x.lineWidth=2.4;x.stroke();
    x.fillStyle='#b8860b';x.fillRect(46.8,22,2.4,10);x.fillRect(44,25.5,8,2.2);
  }else if(id==='santlluc'){hairTop();
    [-5,-2,1,4,7].forEach((o,i)=>{x.beginPath();x.moveTo(48+o-2.5,31);x.quadraticCurveTo(48+o+(i%2?3:-3),22-i%2*3,48+o+1,19-i%3*2);x.quadraticCurveTo(48+o+1,26,48+o+3,31);x.closePath();x.fillStyle=i%2?'#ffcf40':'#ff6a00';x.fill();});
  }else if(id==='agnus'){
    [[-6,-1],[0,-4],[6,-1],[-4,4],[4,4],[0,0],[-7,5],[7,5]].forEach(p=>{ell(x,48+p[0],37+p[1],5.2,5);x.fillStyle=rg(x,48+p[0]-1,36+p[1],1,6,[[0,'#ffffff'],[1,'#d8cfae']]);x.fill();x.strokeStyle='rgba(120,100,60,.35)';x.lineWidth=.7;x.stroke();});
    ell(x,48,26.5,11,4.6);x.strokeStyle='#ffe58a';x.lineWidth=2.2;x.stroke();
  }else if(id==='gargola'){hairTop();
    [-1,1].forEach(s=>{x.beginPath();x.moveTo(48+s*6,32);x.quadraticCurveTo(48+s*12,26,48+s*8,20);x.quadraticCurveTo(48+s*5,25,48+s*3,31);x.closePath();x.fillStyle='#4a4a52';x.fill();x.strokeStyle='#1a1a1f';x.lineWidth=1;x.stroke();});
  }else if(id==='musa'){hairTop();
    ell(x,48,28,5,4.6);x.fillStyle='#1d4a3c';x.fill();
    [0,1,2,3,4].forEach(i=>{const a=i*TAU/5;ell(x,52+Math.cos(a)*3.2,31+Math.sin(a)*3.2,2.4,2);x.fillStyle=i%2?'#ff7ab0':'#ffd75e';x.fill();});
    ell(x,52,31,1.4,1.4);x.fillStyle='#fff';x.fill();
  }else if(id==='diable'){hairTop();
    [-1,1].forEach(s=>{x.beginPath();x.moveTo(48+s*5,32);x.quadraticCurveTo(48+s*13,28,48+s*10,18);x.quadraticCurveTo(48+s*6,25,48+s*2,30);x.closePath();x.fillStyle='#e8d9c0';x.fill();x.strokeStyle='#3a0f0f';x.lineWidth=1;x.stroke();});
    x.beginPath();x.moveTo(48,66);x.bezierCurveTo(56,76,68,72,64,62);x.lineWidth=2;x.strokeStyle='#b03a2e';x.stroke();
    x.beginPath();x.moveTo(62,58);x.lineTo(68,62);x.lineTo(61,66);x.closePath();x.fillStyle='#b03a2e';x.fill();
  }else{hairTop();}
  ell(x,39.5,39,1.6,2.4);x.fillStyle=shade(skin,-.1);x.fill();ell(x,56.5,39,1.6,2.4);x.fill();
  return c;
}

function portrait(d){
  const S=48,c=cv(S,S),x=c.getContext('2d');
  const id=d.id,skin=d.skin,body=d.body,trim=d.trim;
  x.lineJoin='round';
  x.fillStyle=rg(x,24,20,2,34,[[0,shade(trim,.45)],[.55,mix(trim,body,.55)],[1,shade(body,-.55)]]);x.fillRect(0,0,S,S);
  x.save();x.globalAlpha=.16;x.fillStyle='#fff';for(let i=0;i<8;i++){x.beginPath();x.moveTo(24,22);const a=i*TAU/8;x.lineTo(24+Math.cos(a)*40,22+Math.sin(a)*40);x.lineTo(24+Math.cos(a+.2)*40,22+Math.sin(a+.2)*40);x.fill();}x.restore();
  if(id==='serafi'){wingFeathers(x,10,34,-1,'#e8dcae',5,14);wingFeathers(x,38,34,1,'#e8dcae',5,14);}
  if(id==='gargola'){batWing(x,10,36,-1,'#5d5d66','#2a2a30');batWing(x,38,36,1,'#5d5d66','#2a2a30');}
  if(id==='diable'){batWing(x,10,36,-1,'#8a1c2a','#2b0810');batWing(x,38,36,1,'#8a1c2a','#2b0810');}
  if(id==='crist'){x.beginPath();x.moveTo(24,0);x.bezierCurveTo(46,12,46,36,24,48);x.bezierCurveTo(2,36,2,12,24,0);x.fillStyle='rgba(255,230,120,.35)';x.fill();x.strokeStyle='#ffd75e';x.lineWidth=1.4;x.stroke();}
  const tc=id==='serafi'?'#f1ead0':(id==='agnus'?'#fffaf0':(id==='gargola'?'#7a7a84':(id==='diable'?'#6a1a30':body)));
  x.beginPath();x.moveTo(4,48);x.bezierCurveTo(4,36,12,33,24,33);x.bezierCurveTo(36,33,44,36,44,48);x.closePath();
  x.fillStyle=lg(x,0,33,0,48,[[0,shade(tc,.2)],[1,shade(tc,-.4)]]);x.fill();x.strokeStyle='rgba(0,0,0,.5)';x.lineWidth=1;x.stroke();
  x.beginPath();x.moveTo(15,35);x.quadraticCurveTo(24,41,33,35);x.lineWidth=2.4;x.strokeStyle=trim;x.stroke();
  x.fillStyle=shade(skin,-.2);x.fillRect(20,28,8,8);
  x.save();x.shadowColor='rgba(0,0,0,.4)';x.shadowBlur=3;
  ell(x,24,21,10.5,12.5);x.fillStyle=rg(x,21,16,2,16,[[0,shade(skin,.3)],[.7,skin],[1,shade(skin,-.3)]]);x.fill();x.restore();
  x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=1;ell(x,24,21,10.5,12.5);x.stroke();
  const eye=ex=>{ell(x,ex,20.5,2.3,1.6);x.fillStyle=id==='diable'||id==='santlluc'?'#ffe9a0':'#fff8e8';x.fill();ell(x,ex,20.7,1.1,1.1);x.fillStyle=id==='diable'?'#b01010':(id==='gargola'?'#ffd040':'#2a1a0e');x.fill();
    x.beginPath();x.moveTo(ex-3,17.6);x.lineTo(ex+3,id==='diable'||id==='gargola'?16.2:17.2);x.strokeStyle='rgba(30,15,5,.8)';x.lineWidth=1;x.stroke();};
  eye(19.5);eye(28.5);
  x.beginPath();x.moveTo(24,21);x.lineTo(22.8,25.2);x.lineTo(25.2,25.2);x.strokeStyle='rgba(90,40,20,.55)';x.lineWidth=.9;x.stroke();
  x.beginPath();x.moveTo(20,29);x.quadraticCurveTo(24,id==='diable'?31.5:30.6,28,29);x.strokeStyle='#5a1a10';x.lineWidth=1.1;x.stroke();
  if(id==='mestre'){x.beginPath();x.moveTo(19,29.5);x.quadraticCurveTo(24,36,29,29.5);x.fillStyle='#3a2410';x.fill();}
  if(id==='crist'){x.beginPath();x.moveTo(18,28);x.quadraticCurveTo(24,40,30,28);x.fillStyle='#4a2a14';x.fill();}
  if(id==='mestre'){ell(x,26,11.5,14,7.5,.15);x.fillStyle=rg(x,22,9,1,16,[[0,'#d94d3a'],[1,'#7a1f16']]);x.fill();x.strokeStyle='#3a0c08';x.lineWidth=1;x.stroke();}
  else if(id==='serafi'){x.beginPath();x.moveTo(13,18);x.quadraticCurveTo(24,0,35,18);x.quadraticCurveTo(24,9,13,18);x.fillStyle='#f7d77a';x.fill();ell(x,24,6,12,3.6);x.strokeStyle='#ffe58a';x.lineWidth=2;x.stroke();}
  else if(id==='crist'){x.beginPath();x.moveTo(13,19);x.quadraticCurveTo(24,-2,35,19);x.quadraticCurveTo(24,8,13,19);x.fillStyle='#4a2a14';x.fill();ell(x,24,6,12.5,4);x.strokeStyle='#ffd75e';x.lineWidth=2.2;x.stroke();x.fillStyle='#b8860b';x.fillRect(22.8,0.5,2.4,7);x.fillRect(20.5,3,7,2);}
  else if(id==='santlluc'){x.beginPath();x.moveTo(13,19);x.quadraticCurveTo(24,2,35,19);x.quadraticCurveTo(24,10,13,19);x.fillStyle='#3a0f00';x.fill();
    [-8,-4,0,4,8].forEach((o,i)=>{x.beginPath();x.moveTo(24+o-2.5,9);x.quadraticCurveTo(24+o+(i%2?3:-3),0,24+o+1,-3+(i%2)*3);x.quadraticCurveTo(24+o+1,5,24+o+3,9);x.fillStyle=i%2?'#ffcf40':'#ff6a00';x.fill();});}
  else if(id==='agnus'){[[-8,-2],[-3,-7],[3,-7],[8,-2],[0,-3],[-10,4],[10,4]].forEach(p=>{ell(x,24+p[0],13+p[1]+4,5.6,5);x.fillStyle=rg(x,24+p[0]-1,12+p[1]+4,1,7,[[0,'#fff'],[1,'#d8cfae']]);x.fill();x.strokeStyle='rgba(120,100,60,.4)';x.lineWidth=.7;x.stroke();});
    ell(x,24,5,11,3.4);x.strokeStyle='#ffe58a';x.lineWidth=2;x.stroke();}
  else if(id==='gargola'){x.beginPath();x.moveTo(13,19);x.quadraticCurveTo(24,3,35,19);x.quadraticCurveTo(24,10,13,19);x.fillStyle='#565660';x.fill();
    [-1,1].forEach(s=>{x.beginPath();x.moveTo(24+s*8,10);x.quadraticCurveTo(24+s*16,5,24+s*12,-3);x.quadraticCurveTo(24+s*9,4,24+s*5,9);x.closePath();x.fillStyle='#46464e';x.fill();x.strokeStyle='#1a1a1f';x.lineWidth=1;x.stroke();});}
  else if(id==='musa'){x.beginPath();x.moveTo(13,20);x.quadraticCurveTo(24,0,35,20);x.quadraticCurveTo(24,10,13,20);x.fillStyle='#1d4a3c';x.fill();ell(x,24,5,6,5);x.fillStyle='#1d4a3c';x.fill();
    for(let i=0;i<5;i++){const a=i*TAU/5;ell(x,31+Math.cos(a)*4.4,8+Math.sin(a)*4.4,3,2.4);x.fillStyle=i%2?'#ff7ab0':'#ffd75e';x.fill();}ell(x,31,8,1.8,1.8);x.fillStyle='#fff';x.fill();}
  else if(id==='diable'){x.beginPath();x.moveTo(13,19);x.quadraticCurveTo(24,4,35,19);x.quadraticCurveTo(24,10,13,19);x.fillStyle='#5a1224';x.fill();
    [-1,1].forEach(s=>{x.beginPath();x.moveTo(24+s*8,11);x.quadraticCurveTo(24+s*18,6,24+s*14,-4);x.quadraticCurveTo(24+s*10,4,24+s*5,10);x.closePath();x.fillStyle='#e8d9c0';x.fill();x.strokeStyle='#3a0f0f';x.lineWidth=1;x.stroke();});}
  x.strokeStyle='#ffd75e';x.lineWidth=2;x.strokeRect(1,1,S-2,S-2);x.strokeStyle='rgba(0,0,0,.5)';x.lineWidth=1;x.strokeRect(2.5,2.5,S-5,S-5);
  return c;
}
A.kart=kart;A.portrait=portrait;
})();
