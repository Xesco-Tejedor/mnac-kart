/* MNAC KART - art-floor.js: painted floor/road/wall texture for the Mode-7 map */
'use strict';
(function(){
const A=window.MNACArt,{TAU,rng,shade,lg,rr,ell}=A.H,themeOf=A.themeOf;
function paintMap(mc,o){
  const x=mc.getContext('2d'),TS=o.TS,th=themeOf(o.def),T=o.T,r=rng(20261103+o.def.id.length*77);
  const tiles=o.tiles,g=o.g,W=o.W2,H=o.H2;
  const roadish=t=>t===T.ROAD||t===T.START||t===T.BOOST||t===T.ITEM||t===T.COIN;
  const tt=(i,j)=>(j<0||i<0||j>=H||i>=W)?T.WALL:tiles[j][i];
  x.fillStyle='#07050a';x.fillRect(0,0,mc.width,mc.height);
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){
    const t=tiles[j][i],px=i*TS,py=j*TS,chk=(i+j)%2===0;
    if(g[j][i]===','){x.fillStyle=chk?'#0b0810':'#09060d';x.fillRect(px,py,TS,TS);continue;}
    if(t===T.WALL){
      x.fillStyle=lg(x,px,py,px,py+TS,[[0,shade(th.wall,.35)],[1,shade(th.wall,-.25)]]);x.fillRect(px,py,TS,TS);
      x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=1;
      x.strokeRect(px+.5,py+.5,TS-1,TS/2-1);x.strokeRect(px+.5,py+TS/2+.5,TS/2,TS/2-1);x.strokeRect(px+TS/2+.5,py+TS/2+.5,TS/2-1,TS/2-1);
      x.fillStyle='rgba(255,255,255,.18)';x.fillRect(px,py,TS,2);
      for(let n=0;n<10;n++){x.fillStyle=r()<.5?'rgba(0,0,0,.14)':'rgba(255,255,255,.1)';x.fillRect(px+r()*TS,py+r()*TS,2,2);}
      continue;
    }
    if(roadish(t)){
      const base=((i*7+j*13)%3===0)?th.road2:th.road;
      x.fillStyle=lg(x,px,py,px+TS,py+TS,[[0,shade(base,.08)],[1,shade(base,-.1)]]);x.fillRect(px,py,TS,TS);
      x.strokeStyle='rgba(60,40,15,.28)';x.lineWidth=1;x.strokeRect(px+.5,py+.5,TS-1,TS-1);
      x.strokeStyle='rgba(255,255,255,.16)';x.beginPath();x.moveTo(px+1.5,py+TS-1.5);x.lineTo(px+1.5,py+1.5);x.lineTo(px+TS-1.5,py+1.5);x.stroke();
      x.strokeStyle='rgba(90,60,30,.12)';
      for(let n=0;n<2;n++){x.beginPath();x.moveTo(px+r()*TS,py);x.bezierCurveTo(px+r()*TS,py+TS*.3,px+r()*TS,py+TS*.6,px+r()*TS,py+TS);x.stroke();}
      for(let n=0;n<14;n++){x.fillStyle=r()<.5?'rgba(0,0,0,.07)':'rgba(255,255,255,.08)';x.fillRect(px+r()*TS,py+r()*TS,1+r()*2,1+r()*2);}
    }else{
      const base=chk?th.floorA:th.floorB;
      x.fillStyle=lg(x,px,py,px+TS,py+TS,[[0,shade(base,.1)],[1,shade(base,-.12)]]);x.fillRect(px,py,TS,TS);
      x.strokeStyle='rgba(0,0,0,.28)';x.lineWidth=1;x.strokeRect(px+.5,py+.5,TS-1,TS-1);
      x.strokeStyle='rgba(255,255,255,.12)';x.strokeRect(px+1.5,py+1.5,TS-3,TS-3);
      for(let n=0;n<2;n++){x.beginPath();x.moveTo(px+r()*TS,py+r()*4);x.bezierCurveTo(px+r()*TS,py+TS*.3,px+r()*TS,py+TS*.7,px+r()*TS,py+TS-r()*4);x.stroke();}
      for(let n=0;n<10;n++){x.fillStyle=r()<.5?'rgba(0,0,0,.09)':'rgba(255,255,255,.1)';x.fillRect(px+r()*TS,py+r()*TS,1+r()*2,1+r()*2);}
    }
  }
  const e=TS*.16,seg=TS/4;
  const stripe=(px,py,horiz,idx)=>{for(let s=0;s<4;s++){x.fillStyle=((idx*4+s)%2===0)?th.kerbA:th.kerbB;if(horiz)x.fillRect(px+s*seg,py,seg,e);else x.fillRect(px,py+s*seg,e,seg);}};
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){
    if(!roadish(tiles[j][i]))continue;
    const px=i*TS,py=j*TS,W_=(a,b)=>tt(a,b)===T.WALL;
    /* kerb stripe at EVERY road edge; a dark lip is added on the wall side so walls read as solid */
    if(!roadish(tt(i,j-1))){stripe(px,py,true,i);if(W_(i,j-1)){x.fillStyle='rgba(0,0,0,.4)';x.fillRect(px,py,TS,e/2);}x.fillStyle=th.inlay;x.fillRect(px,py+e,TS,1.5);}
    if(!roadish(tt(i,j+1))){stripe(px,py+TS-e,true,i);if(W_(i,j+1)){x.fillStyle='rgba(0,0,0,.4)';x.fillRect(px,py+TS-e/2,TS,e/2);}x.fillStyle=th.inlay;x.fillRect(px,py+TS-e-1.5,TS,1.5);}
    if(!roadish(tt(i-1,j))){stripe(px,py,false,j);if(W_(i-1,j)){x.fillStyle='rgba(0,0,0,.4)';x.fillRect(px,py,e/2,TS);}x.fillStyle=th.inlay;x.fillRect(px+e,py,1.5,TS);}
    if(!roadish(tt(i+1,j))){stripe(px+TS-e,py,false,j);if(W_(i+1,j)){x.fillStyle='rgba(0,0,0,.4)';x.fillRect(px+TS-e/2,py,e/2,TS);}x.fillStyle=th.inlay;x.fillRect(px+TS-e-1.5,py,1.5,TS);}
  }
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){
    const t=tiles[j][i],px=i*TS,py=j*TS,cx=px+TS/2,cy=py+TS/2;
    if(t===T.START){
      const chk=(i+j)%2===0;x.fillStyle=chk?'#f4efe2':'#17120c';x.fillRect(px,py,TS,TS);
      const sub=TS/4;for(let a=0;a<4;a++)for(let b=0;b<4;b++)if((a+b+i+j)%2===0){x.fillStyle=chk?'#17120c':'#f4efe2';x.fillRect(px+a*sub,py+b*sub,sub,sub);}
    }
    if(t===T.BOOST){
      x.save();x.shadowColor='#ffb000';x.shadowBlur=8;x.fillStyle=lg(x,px,py,px,py+TS,[[0,'#ffe58a'],[1,'#e07a10']]);
      for(let a=0;a<2;a++){const d=a*.28*TS;x.beginPath();x.moveTo(cx-TS*.32,cy+TS*.22-d);x.lineTo(cx,cy-TS*.08-d);x.lineTo(cx+TS*.32,cy+TS*.22-d);x.lineTo(cx+TS*.32,cy+TS*.34-d);x.lineTo(cx,cy+TS*.04-d);x.lineTo(cx-TS*.32,cy+TS*.34-d);x.closePath();x.fill();}
      x.restore();
    }
    if(t===T.ITEM){
      x.save();x.shadowColor='#c78bff';x.shadowBlur=10;rr(x,px+TS*.18,py+TS*.18,TS*.64,TS*.64,5);x.fillStyle=lg(x,px,py,px+TS,py+TS,[[0,'#e6c2ff'],[1,'#7a3fb0']]);x.fill();x.restore();
      x.strokeStyle='#fff';x.lineWidth=1.2;rr(x,px+TS*.18,py+TS*.18,TS*.64,TS*.64,5);x.stroke();
      x.fillStyle='#fff';x.font='bold '+(TS*.5|0)+'px serif';x.textAlign='center';x.textBaseline='middle';x.fillText('?',cx,cy+1);x.textAlign='left';x.textBaseline='alphabetic';
    }
    if(t===T.COIN){ell(x,cx,cy,TS*.14,TS*.14);x.fillStyle='rgba(255,215,94,.18)';x.fill();}
  }
  return mc;
}
A.paintMap=paintMap;
})();
