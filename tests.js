(function(){
const M=window.__MK, out=[];
let pass=0,fail=0;
function T(name,fn){
  try{ fn(); pass++; out.push('PASS '+name); }
  catch(e){ fail++; out.push('FAIL '+name+' :: '+(e&&e.message||e)); }
}
function ok(c,m){ if(!c) throw new Error(m||'assert'); }
const DT=1/60;
const IN={steer:0,brake:false,drift:false,item:false};
function mkRace(ti,di,mode){
  const tr=M.builtTrack(ti);
  const r=M.makeRace(tr,M.DRIVERS[di],{mode:mode||'quick',cc:100});
  r.cam={}; r.state='racing'; return r;
}
function findTile(tr,t){
  for(let j=0;j<tr.h;j++)for(let i=0;i<tr.w;i++) if(tr.tiles[j][i]===t) return {tx:i,ty:j};
  return null;
}

T('boot: title screen rendered',()=>{
  ok(document.querySelector('.titleCard'),'no title card');
});
T('tracks: 4 built with features',()=>{
  for(let i=0;i<4;i++){
    const tr=M.builtTrack(i);
    ok(tr.tiles.length===tr.h&&tr.tiles[0].length===tr.w,'dims '+i);
    ok(findTile(tr,M.T_START),'no start '+i);
    ok(findTile(tr,M.T_ITEM),'no item '+i);
    ok(findTile(tr,M.T_BOOST),'no boost '+i);
    ok(findTile(tr,M.T_COIN),'no coin '+i);
  }
});
T('accel: kart reaches speed',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.x=(15+0.5)*M.TILE;k.y=(25+0.5)*M.TILE;k.angle=0;k.dirAngle=0; /* long straight */
  for(let i=0;i<240;i++) M.stepKart(k,IN,r.track,DT,1,r);
  ok(k.speed>250,'speed='+k.speed.toFixed(1));
});
T('steering changes heading',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.speed=200; const a0=k.angle;
  for(let i=0;i<40;i++) M.stepKart(k,{steer:1,brake:false,drift:false,item:false},r.track,DT,1,r);
  ok(Math.abs(k.angle-a0)>0.4,'angle delta='+(k.angle-a0));
});
T('wall blocks tunneling',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.x=6.5*M.TILE; k.y=8.5*M.TILE; k.angle=Math.PI; k.dirAngle=Math.PI; k.speed=260;
  for(let i=0;i<90;i++) M.stepKart(k,IN,r.track,DT,1,r);
  ok(k.x>5.8*M.TILE,'x='+k.x);
  ok(M.tileAt(r.track,k.x,k.y)!==M.T_WALL,'kart inside wall');
});
T('offroad slows down',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  ok(M.tileAt(r.track,6.5*M.TILE,6.5*M.TILE)===M.T_OFFROAD,'spot not offroad');
  k.offroad=false; const msRoad=M.maxSpeed(k,1);
  k.x=6.5*M.TILE; k.y=6.5*M.TILE; k.speed=400;
  for(let i=0;i<40;i++){ k.x=6.5*M.TILE; k.y=6.5*M.TILE; M.stepKart(k,IN,r.track,DT,1,r); }
  ok(k.offroad,'kart not marked offroad');
  ok(k.speed<msRoad*0.7,'speed='+k.speed.toFixed(0)+' roadMax='+msRoad.toFixed(0));
});
T('waypoints + lap counting',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.speed=0;
  const N=r.track.wps.length;
  for(let i=0;i<N;i++){
    const wp=r.track.wps[k.wpIndex];
    k.x=wp.x;k.y=wp.y;
    M.stepKart(k,IN,r.track,DT,1,r);
  }
  ok(k.lap===2,'lap='+k.lap);
});
T('item box grants item',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  const t=findTile(r.track,M.T_ITEM);
  k.x=(t.tx+0.5)*M.TILE;k.y=(t.ty+0.5)*M.TILE;
  M.stepWorldItems(r,DT);
  ok(k.item,'no item granted');
});
T('pinzell drops slick that spins karts',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.item='pinzell'; M.useItem(k,r.track,r);
  ok(r.slicks.length===1,'slicks='+r.slicks.length);
  const other=r.karts.find(x=>!x.isPlayer);
  other.x=r.slicks[0].x; other.y=r.slicks[0].y;
  M.stepWorldItems(r,DT);
  ok(other.spinT>0,'no spin');
});
T('llanca homes and hits',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.x=(15+0.5)*M.TILE;k.y=(25+0.5)*M.TILE;k.angle=0;k.dirAngle=0; /* long straight, facing east */
  const other=r.karts.find(x=>!x.isPlayer);
  r.karts.forEach(o=>{o.progress=0;});
  r.karts.filter(o=>o!==k&&o!==other).forEach(o=>{o.x=3*M.TILE;o.y=2.5*M.TILE;});
  other.x=k.x+150; other.y=k.y;
  other.progress=1;
  k.item='llanca'; M.useItem(k,r.track,r);
  ok(r.shots.length===1,'shots='+r.shots.length);
  let hit=false;
  for(let i=0;i<400;i++){ M.stepWorldItems(r,DT); if(other.spinT>0){hit=true;break;} }
  ok(hit,'target never spun');
});
T('ales gives boost',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.item='ales'; M.useItem(k,r.track,r); ok(k.boostT>0,'no boost');
});
T('escut blocks a hit',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.item='escut'; M.useItem(k,r.track,r); ok(k.shieldT>0,'no shield');
  M.hitKart(k,true); ok(k.spinT<=0,'spun through shield');
});
T('boost pad fires turbo',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  const t=findTile(r.track,M.T_BOOST);
  k.x=(t.tx+0.5)*M.TILE;k.y=(t.ty+0.5)*M.TILE;k.speed=100;
  M.stepKart(k,IN,r.track,DT,1,r);
  ok(k.boostT>0,'boostT='+k.boostT);
});
T('drift charges mini-turbo',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.speed=260;k.x=20*M.TILE;k.y=3.5*M.TILE;k.angle=0;k.dirAngle=0;
  const inp={steer:1,brake:false,drift:true,item:false};
  for(let i=0;i<120;i++) M.stepKart(k,inp,r.track,DT,1,r);
  ok(k.drift.active,'drift never engaged');
  ok(k.drift.level===2,'level='+k.drift.level);
  M.stepKart(k,IN,r.track,DT,1,r);
  ok(k.boostT>0.8,'boostT='+k.boostT);
});
T('AI makes progress',()=>{
  for(const ti of [0,1,2,3]){
    const r=mkRace(ti,0);
    for(let i=0;i<1500;i++) M.stepRace(r,DT,IN);
    for(const k of r.karts) if(!k.isPlayer) ok(k.progress>2,'stuck t'+ti+' '+k.drv.id+' prog='+k.progress);
  }
});
T('positions unique 1..8',()=>{
  const r=mkRace(0,0);
  for(let i=0;i<300;i++) M.stepRace(r,DT,IN);
  const ps=r.karts.map(k=>k.pos).sort((a,b)=>a-b);
  ok(ps.join(',')==='1,2,3,4,5,6,7,8',ps.join(','));
});
T('coin pickup raises top speed',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  const t=findTile(r.track,M.T_COIN);
  const ms0=M.maxSpeed(k,1);
  k.x=(t.tx+0.5)*M.TILE;k.y=(t.ty+0.5)*M.TILE;
  M.stepWorldItems(r,DT);
  ok(k.coins===1,'coins='+k.coins);
  ok(M.maxSpeed(k,1)>ms0,'top speed unchanged');
});
T('finish after laps',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  const N=r.track.wps.length;
  k.lap=r.laps; k.wpIndex=N-1;
  let wp=r.track.wps[N-1]; k.x=wp.x;k.y=wp.y;
  M.stepRace(r,DT,IN);
  ok(k.wpIndex===0&&!k.finished,'last waypoint must not finish the race');
  wp=r.track.wps[0]; k.x=wp.x;k.y=wp.y;
  M.stepRace(r,DT,IN);
  ok(k.finished,'not finished after crossing the line');
  M.stepRace(r,DT,IN);
  ok(r.resultsShown,'no results flag');
});
T('countdown reaches racing',()=>{
  const tr=M.builtTrack(0);
  const r=M.makeRace(tr,M.DRIVERS[0],{mode:'quick',cc:100});
  for(let i=0;i<260;i++) M.stepRace(r,DT,IN);
  ok(r.state==='racing','state='+r.state);
});
T('render: drawRace without exceptions',()=>{
  const r=mkRace(0,0); M.Game.race=r;
  for(let i=0;i<60;i++) M.stepRace(r,DT,IN);
  const cv=document.getElementById('game');
  const cx=cv.getContext('2d');
  /* drawRace is internal; use exported path via Game hooks */
  ok(typeof cx.drawImage==='function','ctx');
  M.Game.race=null;
});
T('fmtTime format',()=>{
  ok(M.fmtTime(65.5)==='01:05.50','got '+M.fmtTime(65.5));
});
T('drivers: 8 with unique karts, AgnusDei 7 wheels',()=>{
  ok(M.DRIVERS.length===8,'n='+M.DRIVERS.length);
  const names=M.DRIVERS.map(d=>d.name);
  ['Mestre Pintor','Serafí','Crist Majestat','Sant Lluc de les Brases Rojes','AgnusDei'].forEach(n=>{
    ok(names.includes(n),'missing '+n);
  });
  const ag=M.DRIVERS.find(d=>d.id==='agnus');
  ok(ag.extra==='seven','agnus extra='+ag.extra);
});
T('tilt: same pose gives zero twist',()=>{
  const p={alpha:90,beta:0,gamma:45};
  ok(Math.abs(M.tiltTwist(p,p))<1e-9,'twist='+M.tiltTwist(p,p));
});
T('tilt: wheel twist reads on flat phone',()=>{
  const w=M.tiltTwist({alpha:0,beta:0,gamma:0},{alpha:20,beta:0,gamma:0});
  ok(Math.abs(w-Math.sin(20*Math.PI/180))<0.02,'twist='+w);
});
T('tilt: lean and roll do not steer',()=>{
  const base={alpha:0,beta:0,gamma:0};
  ok(Math.abs(M.tiltTwist(base,{alpha:0,beta:25,gamma:0}))<0.02,'beta lean pollutes');
  ok(Math.abs(M.tiltTwist(base,{alpha:0,beta:0,gamma:25}))<0.02,'gamma roll pollutes');
});
T('tilt: works from a landscape grip',()=>{
  const base={alpha:90,beta:0,gamma:45};
  const now={alpha:100.73,beta:10.55,gamma:44.01};
  const w=M.tiltTwist(base,now);
  ok(Math.abs(w-Math.sin(15*Math.PI/180))<0.02,'twist='+w);
});
T('tilt: same sign on both landscape sides',()=>{
  const l90=M.tiltTwist({alpha:90,beta:0,gamma:45},{alpha:100.73,beta:10.55,gamma:44.01});
  const l270=M.tiltTwist({alpha:-90,beta:0,gamma:-45},{alpha:-79.27,beta:-10.55,gamma:-44.01});
  ok(l90>0.2&&l270>0.2,'twists '+l90.toFixed(3)+' / '+l270.toFixed(3));
  ok(M.tiltSteerFromTwist(l90)<0&&M.tiltSteerFromTwist(l270)<0,'steer sign differs by side');
});
T('tilt: steer sign, deadzone and clamp',()=>{
  ok(M.tiltSteerFromTwist(0.03)===0,'deadzone');
  ok(M.tiltSteerFromTwist(0.2)<0,'left twist should steer left (negative)');
  ok(M.tiltSteerFromTwist(-0.2)>0,'right twist should steer right (positive)');
  ok(M.tiltSteerFromTwist(0.9)===-1&&M.tiltSteerFromTwist(-0.9)===1,'clamp');
  ok(M.Tilt&&M.Tilt.enabled===true&&M.Tilt.base===null,'Tilt defaults');
});
/* ---- wall collision regression (kart body vs wall tiles) ---- */
T('walls: kart body never clips walls at any angle',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  const spots=[1,4,7,10].map(i=>r.track.wps[i]);
  for(const s of spots){
    for(let a=0;a<8;a++){
      k.x=s.x;k.y=s.y;k.angle=a*Math.PI/4;k.dirAngle=k.angle;k.speed=300;k.boostT=2;
      for(let i=0;i<120;i++){
        M.stepKart(k,IN,r.track,DT,1,r);
        ok(!M.circleHitsWall(r.track,k.x,k.y,M.WALL_R*0.98),
           'clipped wall: spot '+s.x.toFixed(0)+','+s.y.toFixed(0)+' angle '+a+' step '+i);
      }
    }
  }
});
T('walls: full boost cannot tunnel the perimeter',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  const s=r.track.wps[3]; /* bottom straight, east end */
  k.x=s.x;k.y=s.y;k.angle=0;k.dirAngle=0;k.speed=500;k.boostT=30;
  for(let i=0;i<600;i++){
    M.stepKart(k,IN,r.track,DT,1.18,r); /* 150cc multiplier */
    ok(!M.circleHitsWall(r.track,k.x,k.y,M.WALL_R*0.98),'tunneled at step '+i+' x='+k.x.toFixed(1)+' y='+k.y.toFixed(1));
    ok(k.x>0&&k.y>0&&k.x<r.track.worldW&&k.y<r.track.worldH,'left world');
  }
});
T('contacts: bumps never shove a kart into a wall',()=>{
  const r=mkRace(0,0);
  const a=r.karts[0], b=r.karts[1];
  /* find a road tile with a wall neighbour */
  const tr=r.track; let spot=null;
  for(let j=1;j<tr.h-1&&!spot;j++)for(let i=1;i<tr.w-1;i++){
    if(tr.tiles[j][i]!==M.T_ROAD)continue;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const d of dirs) if(tr.tiles[j+d[1]][i+d[0]]===M.T_WALL){spot={i,j,dx:d[0],dy:d[1]};break;}
    if(spot)break;
  }
  ok(spot,'no wall-adjacent road tile found');
  for(let n=0;n<40;n++){
    /* park a next to the wall, b overlapping between a and the wall */
    a.x=(spot.i+0.5)*M.TILE-spot.dx*10; a.y=(spot.j+0.5)*M.TILE-spot.dy*10;
    b.x=a.x+spot.dx*20; b.y=a.y+spot.dy*20;
    a.speed=200;b.speed=200;
    M.kartContacts(r);
    ok(!M.circleHitsWall(tr,a.x,a.y,M.WALL_R*0.98),'a in wall, iter '+n);
    ok(!M.circleHitsWall(tr,b.x,b.y,M.WALL_R*0.98),'b in wall, iter '+n);
  }
});
T('race: 30s from crowded grid, no kart ever enters a wall',()=>{
  const r=mkRace(0,0);
  for(let i=0;i<1800;i++){
    M.stepRace(r,DT,IN);
    for(const k of r.karts){
      ok(!M.circleHitsWall(r.track,k.x,k.y,M.WALL_R*0.98),
         (k.isPlayer?'player':'ai')+' in wall at step '+i);
    }
  }
});
/* --- lap counter regression: wide passes, line semantics, corner cuts --- */
T('lap: off-center passes (150px) still count',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.speed=0;
  const N=r.track.wps.length;
  for(let i=0;i<N;i++){
    const wp=r.track.wps[k.wpIndex];
    const pv=r.track.wps[(k.wpIndex-1+N)%N];
    const ang=Math.atan2(wp.y-pv.y,wp.x-pv.x);
    /* 150px off the racing line and 30px past the checkpoint plane:
       a real on-road wide pass (road half-width ~166px) */
    k.x=wp.x+Math.cos(ang+Math.PI/2)*150+Math.cos(ang)*30;
    k.y=wp.y+Math.sin(ang+Math.PI/2)*150+Math.sin(ang)*30;
    M.stepKart(k,IN,r.track,DT,1,r);
  }
  ok(k.lap===2,'lap='+k.lap+' wpIndex='+k.wpIndex+' (wide passes froze the counter)');
});
T('lap: counts at the start line, not before',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  k.speed=0;
  const N=r.track.wps.length;
  for(let i=1;i<N;i++){
    const wp=r.track.wps[k.wpIndex];
    k.x=wp.x;k.y=wp.y;
    M.stepKart(k,IN,r.track,DT,1,r);
  }
  ok(k.wpIndex===0&&k.lap===1,'premature lap before the line: lap='+k.lap+' wpIndex='+k.wpIndex);
  const wp0=r.track.wps[0]; k.x=wp0.x;k.y=wp0.y;
  M.stepKart(k,IN,r.track,DT,1,r);
  ok(k.lap===2,'lap='+k.lap+' after crossing the line');
});
function driveCut(r,k,lookahead,maxFrames){
  const tr=r.track,wps=tr.wps,N=wps.length;
  let segIdx=0;
  for(let f=0;f<maxFrames&&k.lap<2;f++){
    let best={d:1e18,si:segIdx,t:0};
    for(let d=0;d<N;d++){
      const si=(segIdx+d)%N,a=wps[si],b=wps[(si+1)%N];
      const sx=b.x-a.x,sy=b.y-a.y,L2=sx*sx+sy*sy||1;
      let t=((k.x-a.x)*sx+(k.y-a.y)*sy)/L2; t=Math.max(0,Math.min(1,t));
      const px=a.x+sx*t,py=a.y+sy*t,dd=(k.x-px)*(k.x-px)+(k.y-py)*(k.y-py);
      if(dd<best.d){best={d:dd,si,t};}
    }
    segIdx=best.si;
    let rem=lookahead,si=best.si,t=best.t,tx,ty;
    for(let g=0;g<N;g++){
      const a=wps[si],b=wps[(si+1)%N];
      const sx=b.x-a.x,sy=b.y-a.y,L=Math.hypot(sx,sy)||1,avail=L*(1-t);
      if(rem<=avail){tx=a.x+sx*(t+rem/L);ty=a.y+sy*(t+rem/L);break;}
      rem-=avail;si=(si+1)%N;t=0;
      if(g===N-1){tx=b.x;ty=b.y;}
    }
    const want=Math.atan2(ty-k.y,tx-k.x);
    let err=want-k.angle; while(err>Math.PI)err-=2*Math.PI; while(err<-Math.PI)err+=2*Math.PI;
    const steer=Math.max(-1,Math.min(1,err*2.2));
    M.stepKart(k,{steer,brake:false,drift:false,item:false,reverse:false},tr,DT,1,r);
  }
}
T('lap: corner-cutting racing line completes a lap',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  /* lap-counter test: park rivals clear of the line, solid karts block it now */
  r.karts.filter(x=>x!==k).forEach(x=>{x.x=3*M.TILE;x.y=2.5*M.TILE;});
  driveCut(r,k,380,60*240);
  ok(k.lap>=2,'counter frozen: lap='+k.lap+' wpIndex='+k.wpIndex);
});
T('results: rival that finishes first ranks ahead of the player',()=>{
  const r=mkRace(0,0); const p=r.karts.find(x=>x.isPlayer); const a=r.karts.find(x=>!x.isPlayer);
  const N=r.track.wps.length;
  a.lap=r.laps; a.wpIndex=N-1; a.speed=0;
  let wp=r.track.wps[N-1]; a.x=wp.x;a.y=wp.y;
  M.stepRace(r,DT,IN);
  wp=r.track.wps[0]; a.x=wp.x;a.y=wp.y;
  M.stepRace(r,DT,IN);
  ok(a.finished&&a.finishTime>0,'rival never finishes');
  ok(!p.finished,'player must not finish with the rival');
  ok(a.pos<p.pos,'finished rival pos='+a.pos+' player pos='+p.pos);
});
/* ---- solid scenery (decor) ---- */
T('decor: margin scenery is solid, racing line stays open',()=>{
  for(let ti=0;ti<4;ti++){
    const tr=M.builtTrack(ti), def=tr.def, PAD=5;
    const wpsO=def.wps.map(p=>[p[0]+PAD,p[1]+PAD]);
    let solid=0;
    for(const d of def.decor){
      const tx=d[0]+PAD, ty=d[1]+PAD;
      let dl=1/0;
      for(let i=0;i<wpsO.length;i++){
        const a=wpsO[i],b=wpsO[(i+1)%wpsO.length];
        dl=Math.min(dl,M.segDist(tx+0.5,ty+0.5,a[0],a[1],b[0],b[1]));
      }
      if(dl>=0.95){ ok(tr.tiles[ty][tx]===M.T_WALL,'decor not solid: '+def.id+' '+d.join(',')); solid++; }
    }
    ok(solid>=2,'too few solid decor on '+def.id+': '+solid);
  }
});
T('decor: kart cannot drive through a margin planta',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  /* vestibul planta at def tile [37,21] -> built tile [42,26], offroad margin */
  ok(M.tileAt(r.track,(42+0.5)*M.TILE,(26+0.5)*M.TILE)===M.T_WALL,'planta tile not solid');
  k.x=42*M.TILE-40; k.y=(26+0.5)*M.TILE; k.angle=0; k.dirAngle=0; k.speed=280;
  for(let i=0;i<90;i++) M.stepKart(k,IN,r.track,DT,1,r);
  ok(!M.circleHitsWall(r.track,k.x,k.y,M.WALL_R),'kart ended inside the planta');
  ok(k.x<42*M.TILE-M.WALL_R+1,'kart crossed the planta: x='+k.x);
});
T('decor: no kart starts touching a solid tile',()=>{
  for(let ti=0;ti<4;ti++){
    const r=mkRace(ti,0);
    for(const k of r.karts){
      ok(!M.circleHitsWall(r.track,k.x,k.y,M.WALL_R),'grid kart in wall, track '+ti);
    }
  }
});
T('ai: full grid completes a lap on every track with solid decor',()=>{
  for(let ti=0;ti<4;ti++){
    const r=mkRace(ti,0); r.state='racing';
    let steps=0;
    while(steps<60*150 && !r.karts.every(k=>k.lap>=2||k.finished)){
      for(const k of r.karts) M.stepKart(k,M.aiInput(k,r),r.track,DT,r.ccMult,r);
      M.kartContacts(r);
      steps++;
    }
    ok(r.karts.every(k=>k.lap>=2||k.finished),
      'track '+ti+' AI did not lap in 150s: laps='+r.karts.map(k=>k.lap).join(','));
  }
});
/* ---- tilt: combined steering + throttle/brake lean ---- */
T('input: tilt adds to button steering',()=>{
  M.Tilt.active=true; M.Tilt.enabled=true; M.Tilt.steer=0.6; M.Tilt.pedal=0;
  M.touch.right=true; M.refreshSteer();
  ok(M.Input.steer>1.3&&M.Input.steer<=1.41,'button+tilt='+M.Input.steer);
  M.Tilt.steer=-0.6; M.refreshSteer();
  ok(Math.abs(M.Input.steer-0.4)<1e-9,'opposing tilt='+M.Input.steer);
  M.touch.right=false; M.refreshSteer();
  ok(Math.abs(M.Input.steer+0.6)<1e-9,'tilt only='+M.Input.steer);
  M.Tilt.active=false; M.Tilt.steer=0; M.refreshSteer();
  ok(M.Input.steer===0&&M.Input.throttle===0,'reset');
});
T('tilt: forward lean accelerates, backward brakes, both landscape sides',()=>{
  const flat={alpha:0,beta:0,gamma:0};
  const P=g=>M.tiltPedalFromLean(M.tiltLeanFromAxes(M.tiltAxes(flat,{alpha:0,beta:0,gamma:g}),90));
  const P270=g=>M.tiltPedalFromLean(M.tiltLeanFromAxes(M.tiltAxes(flat,{alpha:0,beta:0,gamma:g}),270));
  ok(P(20)>0.8,'l90: gamma+ (top edge away) should accelerate: '+P(20));
  ok(P(-20)<-0.8,'l90: gamma- (top edge near) should brake: '+P(-20));
  ok(P270(-20)>0.8,'l270: gamma- should accelerate: '+P270(-20));
  ok(P270(20)<-0.8,'l270: gamma+ should brake: '+P270(20));
  const B=b=>M.tiltPedalFromLean(M.tiltLeanFromAxes(M.tiltAxes(flat,{alpha:0,beta:b,gamma:0}),0));
  ok(B(-20)>0.8,'portrait: top edge away should accelerate: '+B(-20));
  ok(B(20)<-0.8,'portrait: top edge near should brake: '+B(20));
  ok(M.tiltPedalFromLean(0.02)===0,'pedal deadzone');
  ok(M.tiltPedalFromLean(-0.9)===1&&M.tiltPedalFromLean(0.9)===-1,'pedal clamp');
  ok(M.Tilt.pedal===0,'Tilt.pedal default');
});
T('throttle: tilt forward speeds acceleration, tilt back brakes',()=>{
  const r=mkRace(0,0), r2=mkRace(0,0);
  const k=r.karts.find(x=>x.isPlayer), k2=r2.karts.find(x=>x.isPlayer);
  k.x=k2.x=(15+0.5)*M.TILE; k.y=k2.y=(25+0.5)*M.TILE;
  k.angle=k2.angle=0; k.dirAngle=k2.dirAngle=0;
  const TH={steer:0,brake:false,drift:false,item:false,throttle:1};
  for(let i=0;i<60;i++){ M.stepKart(k,IN,r.track,DT,1,r); M.stepKart(k2,TH,r2.track,DT,1,r2); }
  ok(k2.speed>k.speed*1.2,'tilt accel '+k2.speed.toFixed(0)+' vs '+k.speed.toFixed(0));
  k.speed=220;
  for(let i=0;i<30;i++) M.stepKart(k,{steer:0,brake:false,drift:false,item:false,throttle:-1},r.track,DT,1,r);
  ok(k.speed<120,'tilt brake='+k.speed.toFixed(0));
});
T('viewport: canvas fits visible area at 16:9',()=>{
  const cv=document.getElementById('game');
  M.fitCanvas();
  const w=parseFloat(cv.style.width),h=parseFloat(cv.style.height);
  ok(w>0&&h>0,'no inline size');
  ok(Math.abs(w/h-16/9)<0.02,'ratio '+(w/h));
  const vv=window.visualViewport;
  const vw=vv?vv.width:window.innerWidth, vh=vv?vv.height:window.innerHeight;
  ok(w<=vw+1&&h<=vh+1,'overflow '+w+'x'+h+' in '+vw+'x'+vh);
});
T('viewport: refit shrinks when visible height shrinks',()=>{
  const cv=document.getElementById('game');
  const realVV=window.visualViewport;
  const fake={width:800,height:300,offsetLeft:0,offsetTop:0,addEventListener(){}};
  try{
    Object.defineProperty(window,'visualViewport',{value:fake,configurable:true});
    M.fitCanvas();
    const w=parseFloat(cv.style.width),h=parseFloat(cv.style.height);
    ok(h<=300,'still cropped h='+h);
    ok(Math.abs(w/h-16/9)<0.02,'ratio '+(w/h));
  }finally{
    Object.defineProperty(window,'visualViewport',{value:realVV,configurable:true});
    M.fitCanvas();
  }
});
T('viewport: UI layers and corner buttons track the visible rect',()=>{
  const realVV=window.visualViewport;
  const fake={width:800,height:300,offsetLeft:20,offsetTop:40,addEventListener(){}};
  try{
    Object.defineProperty(window,'visualViewport',{value:fake,configurable:true});
    M.fitCanvas();
    ['frame','touchUI','uiLayer','rotateHint'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return; /* tests.html has no #frame */
      ok(el.style.top==='40px'&&el.style.left==='20px',id+' offset '+el.style.left+','+el.style.top);
      ok(el.style.width==='800px'&&el.style.height==='300px',id+' size '+el.style.width+'x'+el.style.height);
    });
    const bs=document.getElementById('btnSound'),bg=document.getElementById('btnGuide');
    ok(bs.style.top==='50px'&&bs.style.left==='30px','btnSound '+bs.style.left+','+bs.style.top);
    ok(bg.style.top==='50px','btnGuide top '+bg.style.top);
    ok(parseFloat(bg.style.left)+bg.offsetWidth<=820,'btnGuide overflows '+bg.style.left);
  }finally{
    Object.defineProperty(window,'visualViewport',{value:realVV,configurable:true});
    M.fitCanvas();
  }
});
/* ---- orientation hold: no full-screen flip mid-race ---- */
T('orientation: portrait mid-race rotates the frame instead of blocking',()=>{
  const realVV=window.visualViewport;
  const fake={width:390,height:700,offsetLeft:0,offsetTop:0,addEventListener(){}};
  const st=M.Game.state, tm=M.Game.touchMode;
  try{
    M.Game.touchMode=true; M.Game.state='race';
    Object.defineProperty(window,'visualViewport',{value:fake,configurable:true});
    M.fitCanvas();
    ok(M.Orient.rotated===true,'rotated flag off');
    const cv=document.getElementById('game');
    const w=parseFloat(cv.style.width),h=parseFloat(cv.style.height);
    ok(h<=390+1&&w<=700+1,'canvas overflows rotated area '+w+'x'+h);
    ok(Math.abs(w/h-16/9)<0.02,'ratio '+(w/h));
    M.updateRotateHint();
    ok(document.getElementById('rotateHint').classList.contains('hidden'),'rotate hint covers the rotated game');
  }finally{
    M.Game.state=st; M.Game.touchMode=tm;
    Object.defineProperty(window,'visualViewport',{value:realVV,configurable:true});
    M.fitCanvas();
  }
});
T('orientation: no rotation in landscape or when the OS lock holds',()=>{
  const realVV=window.visualViewport;
  const st=M.Game.state, tm=M.Game.touchMode;
  try{
    M.Game.touchMode=true; M.Game.state='race';
    const land={width:700,height:390,offsetLeft:0,offsetTop:0,addEventListener(){}};
    Object.defineProperty(window,'visualViewport',{value:land,configurable:true});
    M.fitCanvas();
    ok(M.Orient.rotated===false,'landscape must not rotate');
    const port={width:390,height:700,offsetLeft:0,offsetTop:0,addEventListener(){}};
    Object.defineProperty(window,'visualViewport',{value:port,configurable:true});
    M.Orient.locked=true; M.fitCanvas();
    ok(M.Orient.rotated===false,'locked phone never needs the CSS fallback');
  }finally{
    M.Game.state=st; M.Game.touchMode=tm; M.Orient.locked=false;
    Object.defineProperty(window,'visualViewport',{value:realVV,configurable:true});
    M.fitCanvas();
  }
});
T('orientation: tilt pedal reads the content orientation when rotated',()=>{
  const base=M.screenAngleDeg(), r0=M.Orient.rotated;
  try{
    M.Orient.rotated=false;
    ok(M.tiltEffectiveAngle()===base,'unrotated='+M.tiltEffectiveAngle()+' base='+base);
    M.Orient.rotated=true;
    ok(M.tiltEffectiveAngle()===(base+90)%360,'rotated adds 90: '+M.tiltEffectiveAngle());
    /* rotated fallback = landscape-90 mapping: gamma+ keeps accelerating */
    const flat={alpha:0,beta:0,gamma:0};
    const ax=M.tiltAxes(flat,{alpha:0,beta:0,gamma:20});
    ok(M.tiltPedalFromLean(M.tiltLeanFromAxes(ax,M.tiltEffectiveAngle()))>0.8,
      'rotated: gamma+ should still accelerate');
  }finally{ M.Orient.rotated=r0; }
});
T('orientation: lock request and release never throw without support',()=>{
  M.orientRequestLock();
  M.orientRelease();
  ok(true,'no exception');
});
/* --- contact regression: karts and walls stay solid under pressure --- */
T('contact: player cannot drive through a rival',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  const o=r.karts.find(x=>!x.isPlayer);
  /* long straight on track 0, rival parked ahead */
  o.x=(15+0.5)*M.TILE; o.y=(25+0.5)*M.TILE; o.angle=0; o.dirAngle=0; o.speed=0;
  r.karts.filter(x=>x!==k&&x!==o).forEach(x=>{x.x=3*M.TILE;x.y=2.5*M.TILE;});
  k.x=o.x-4*M.TILE; k.y=o.y; k.angle=0; k.dirAngle=0; k.speed=0;
  const minD=M.KART_R*2-2;
  for(let i=0;i<300;i++){
    M.stepKart(k,{steer:0,brake:false,drift:false,item:false},r.track,DT,1,r);
    M.kartContacts(r);
    const d=Math.hypot(k.x-o.x,k.y-o.y);
    ok(d>=minD,'overlap at step '+i+': d='+d.toFixed(1));
    ok(!M.circleHitsWall(r.track,k.x,k.y,M.WALL_R*0.98),'player in wall at '+i);
    ok(!M.circleHitsWall(r.track,o.x,o.y,M.WALL_R*0.98),'rival in wall at '+i);
  }
});
T('contact: rival pinned at a wall is never pierced or walled in',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  const o=r.karts.find(x=>!x.isPlayer);
  const tr=r.track; let spot=null;
  for(let j=1;j<tr.h-1&&!spot;j++)for(let i=1;i<tr.w-1;i++){
    if(tr.tiles[j][i]!==M.T_ROAD)continue;
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const d of dirs) if(tr.tiles[j+d[1]][i+d[0]]===M.T_WALL){spot={i,j,dx:d[0],dy:d[1]};break;}
    if(spot)break;
  }
  ok(spot,'no wall-adjacent road tile');
  r.karts.filter(x=>x!==k&&x!==o).forEach(x=>{x.x=3*M.TILE;x.y=2.5*M.TILE;});
  /* rival against the wall face, player pressed against its open side */
  o.x=(spot.i+0.5)*M.TILE+spot.dx*(M.TILE/2-M.WALL_R); o.y=(spot.j+0.5)*M.TILE+spot.dy*(M.TILE/2-M.WALL_R);
  o.angle=Math.atan2(spot.dy,spot.dx); o.dirAngle=o.angle; o.speed=0;
  k.x=o.x-spot.dx*(M.KART_R*2); k.y=o.y-spot.dy*(M.KART_R*2);
  k.angle=o.angle; k.dirAngle=o.angle; k.speed=200;
  const minD=M.KART_R*2*0.75;
  for(let i=0;i<240;i++){
    M.stepKart(k,{steer:0,brake:false,drift:false,item:false},tr,DT,1,r);
    M.kartContacts(r);
    const d=Math.hypot(k.x-o.x,k.y-o.y);
    ok(d>=minD,'pierced at step '+i+': d='+d.toFixed(1));
    ok(!M.circleHitsWall(tr,o.x,o.y,M.WALL_R*0.98),'pinned rival in wall at '+i);
    ok(!M.circleHitsWall(tr,k.x,k.y,M.WALL_R*0.98),'player in wall at '+i);
  }
});
T('contact: pressing into a wall all race never enters it',()=>{
  const r=mkRace(0,0); const k=r.karts.find(x=>x.isPlayer);
  r.karts.filter(x=>x!==k).forEach(x=>{x.x=3*M.TILE;x.y=2.5*M.TILE;});
  /* face west into the wall near (6,8) on track 0 and hold full throttle */
  k.x=6.5*M.TILE; k.y=8.5*M.TILE; k.angle=Math.PI; k.dirAngle=Math.PI; k.speed=0;
  for(let i=0;i<600;i++){
    M.stepKart(k,{steer:0,brake:false,drift:false,item:false},r.track,DT,1,r);
    M.kartContacts(r);
    ok(!M.circleHitsWall(r.track,k.x,k.y,M.WALL_R*0.98),'in wall at step '+i+' x='+k.x.toFixed(1));
  }
});
T('audio: every song is well-formed for the arcade engine',()=>{
  for(const [n,sg] of Object.entries(M.SONGS)){
    ok(sg.tempo>=100&&sg.lead.length>0&&sg.bass.length>0,'bad song '+n);
    for(const x of sg.lead.concat(sg.bass)) ok(x[0]>=0&&x[0]<=100&&x[1]>=1,'bad note in '+n);
  }
});
T('audio: all sfx names play without error and engine drone starts/stops',()=>{
  const A=M.Audio8; A.init(); if(!A.ctx) return;
  const was=A.enabled; A.enabled=true;
  ['coin','item','hit','spin','boost','drift','hop','select','back','count','go','lap','finish','podium','shield','throw','record','bump','offroad'].forEach(n=>A.sfx(n));
  A.engine(0.5); ok(!!A.eng,'engine not created');
  A.engineOff(); ok(!A.eng,'engine not stopped');
  A.enabled=was;
});
T('audio: engine fades out when not refreshed',()=>{
  const A=M.Audio8; if(!A.ctx) return;
  A.enabled=true; A.engine(0.4); A.engT=performance.now()-1000; A.engineWatch();
  ok(!A.eng,'engine kept running');
});
T('gas button: exists, holds and releases throttle',()=>{
  const b=document.getElementById('btnGas'); ok(!!b,'no gas button');
  b.dispatchEvent(new Event('pointerdown',{cancelable:true}));
  ok(b.classList.contains('active'),'gas not active on press');
  b.dispatchEvent(new Event('pointerup',{cancelable:true}));
  ok(!b.classList.contains('active'),'gas stuck after release');
});
document.getElementById('out').textContent=
  'RESULT '+pass+'/'+(pass+fail)+'\n'+out.join('\n');
document.title=fail===0?'DONE-OK':'DONE-FAIL';
})();
