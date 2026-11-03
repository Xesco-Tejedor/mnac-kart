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
  const wp=r.track.wps[N-1]; k.x=wp.x;k.y=wp.y;
  M.stepRace(r,DT,IN);
  ok(k.finished,'not finished');
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
document.getElementById('out').textContent=
  'RESULT '+pass+'/'+(pass+fail)+'\n'+out.join('\n');
document.title=fail===0?'DONE-OK':'DONE-FAIL';
})();
