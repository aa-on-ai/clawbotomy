/* Fetch: dependency-free canonical game model. N/E/S/W = bits 1/2/4/8. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.defineProperty(root, 'FetchModel', { value: api, writable: false });
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  // Invented reply fragments, never presented as quotes from the historical account.
  const WORDS = [
    ['Both messages arrived.', 'Keep a reference to each.'],
    ['The originals are still here.', 'Bring back both copies.'],
    ['One part is not the whole story.', 'Now we can read it together.']
  ];
  const LEVELS = freeze([
    { name: 'The first reply', theme: 'reply', home: 20,
      masks: [4,0,0,0,4, 5,0,12,10,12, 7,5,6,0,0, 5,3,9,0,0, 1,0,0,10,0],
      shelves: [{id:1,cell:0,text:WORDS[0][0]},{id:2,cell:4,text:WORDS[0][1]}] },
    { name: 'A longer thread', theme: 'thread', home: 22,
      masks: [4,0,0,0,4, 3,5,9,3,9, 6,3,7,12,9, 0,3,12,12,0, 0,5,1,0,0],
      shelves: [{id:1,cell:0,text:WORDS[1][0]},{id:2,cell:4,text:WORDS[1][1]}] },
    { name: 'The whole story', theme: 'story', home: 20,
      masks: [3,10,8,10,0, 5,0,0,6,9, 14,9,6,12,5, 10,3,6,6,6, 1,0,0,9,8],
      shelves: [{id:1,cell:2,text:WORDS[2][0]},{id:2,cell:24,text:WORDS[2][1]}] }
  ]);
  const DIRS = freeze([{dr:-1,dc:0,name:'north'},{dr:0,dc:1,name:'east'},{dr:1,dc:0,name:'south'},{dr:0,dc:-1,name:'west'}]);
  function rotate(mask, turns) {
    for (let i=0; i<((turns%4)+4)%4; i++) mask=((mask<<1)&15)|(mask>>3);
    return mask;
  }
  function maskAt(state, cell) { return rotate(LEVELS[state.level].masks[cell] || 0,state.rotations[cell] || 0); }
  function adjacent(cell, direction) {
    const r=Math.floor(cell/5)+DIRS[direction].dr, c=cell%5+DIRS[direction].dc;
    return r>=0 && r<5 && c>=0 && c<5 ? r*5+c : -1;
  }
  function neighbors(state, cell) {
    const mask=maskAt(state,cell), result=[];
    for (let d=0;d<4;d++) {
      const next=adjacent(cell,d);
      if ((mask&(1<<d)) && next>=0 && (maskAt(state,next)&(1<<((d+2)%4)))) result.push(next);
    }
    return result;
  }
  function search(state, start) {
    const queue=[start], parent=new Map([[start,null]]);
    for(let i=0;i<queue.length;i++) for(const next of neighbors(state,queue[i])) {
      if(!parent.has(next)) { parent.set(next,queue[i]); queue.push(next); }
    }
    return {queue,parent};
  }
  function route(state,start,end) {
    const {parent}=search(state,start);
    if(!parent.has(end)) return [];
    const path=[];
    for(let cell=end;cell!==null;cell=parent.get(cell)) path.push(cell);
    return path.reverse();
  }
  function movable(state, cell) {
    const level=LEVELS[state.level];
    return Number.isInteger(cell) && cell>=0 && cell<25 && level.masks[cell]>0 && cell!==level.home && !level.shelves.some(s=>s.cell===cell);
  }
  function create(level=0, unlocked=level) {
    if(!Number.isInteger(level) || level<0 || level>=LEVELS.length) throw new RangeError('Unknown puzzle');
    return freeze({level,unlocked:Math.max(level,Math.min(2,unlocked)),rotations:Array(25).fill(0),history:[],phase:'editing',courier:LEVELS[level].home,facing:'north',carrying:[],delivered:[],cursor:0,plan:null,lastEvent:null,stall:null});
  }
  function resetRun(state, changes) {
    return freeze({...state,...changes,phase:'editing',courier:LEVELS[state.level].home,facing:'north',carrying:[],delivered:[],cursor:0,plan:null,lastEvent:null,stall:null});
  }
  function turn(state, cell) {
    if(state.phase==='running' || state.phase==='success' || !movable(state,cell)) return state;
    const rotations=state.rotations.slice();
    const before=rotations[cell];
    rotations[cell]=(before+1)%4;
    return resetRun(state,{rotations,history:[...state.history,{cell,before}]});
  }
  function undo(state) {
    if(state.phase==='running' || state.phase==='success' || !state.history.length) return state;
    const history=state.history.slice(), last=history.pop(), rotations=state.rotations.slice();
    rotations[last.cell]=last.before;
    return resetRun(state,{history,rotations});
  }
  function restart(state) { return create(state.level,state.unlocked); }
  function next(state) {
    if(state.phase!=='success') return state;
    return create((state.level+1)%LEVELS.length,state.unlocked);
  }
  function distance(a,b) { return Math.abs(Math.floor(a/5)-Math.floor(b/5))+Math.abs(a%5-b%5); }
  function evaluate(state) {
    const level=LEVELS[state.level], reachable=search(state,level.home).queue;
    const found=level.shelves.filter(s=>reachable.includes(s.cell)).map(s=>s.id);
    const missing=level.shelves.filter(s=>!found.includes(s.id)).map(s=>s.id);
    const events=[{type:'depart',cell:level.home}], picked=new Set();
    let current=level.home;
    function walkTo(target) {
      for(const cell of route(state,current,target).slice(1)) {
        events.push({type:'move',from:current,cell});
        current=cell;
        for(const shelf of level.shelves) if(shelf.cell===cell && !picked.has(shelf.id)) {
          picked.add(shelf.id);
          events.push({type:'pickup',cell,id:shelf.id});
        }
      }
    }
    // A real, legal shortest route to each reachable shelf; never a decorative scripted lap.
    for(const id of found) if(!picked.has(id)) walkTo(level.shelves.find(s=>s.id===id).cell);
    if(missing.length) {
      const targets=level.shelves.filter(s=>missing.includes(s.id));
      const frontier=[];
      for(const cell of reachable) for(let d=0;d<4;d++) {
        const to=adjacent(cell,d);
        if((maskAt(state,cell)&(1<<d)) && !neighbors(state,cell).includes(to)) {
          const score=Math.min(...targets.map(s=>distance(cell,s.cell))) * 10 + route(state,current,cell).length;
          frontier.push({cell,direction:d,to,score});
        }
      }
      frontier.sort((a,b)=>a.score-b.score || a.cell-b.cell || a.direction-b.direction);
      const stop=frontier[0];
      if(stop) {
        walkTo(stop.cell);
        events.push({type:'stall',cell:stop.cell,direction:stop.direction,to:stop.to});
      } else {
        // A closed reachable loop still cannot cross empty space to an unreachable shelf.
        events.push({type:'wait',cell:current});
      }
    }
    walkTo(level.home);
    events.push({type:'deliver',cell:level.home,ids:[...picked].sort()});
    events.push({type:'finish',cell:level.home,success:missing.length===0});
    return freeze({reachable,found,missing,events,success:missing.length===0});
  }
  function start(state) {
    if(state.phase==='running' || state.phase==='success') return state;
    return freeze({...state,phase:'running',plan:evaluate(state),cursor:0,courier:LEVELS[state.level].home,carrying:[],delivered:[],lastEvent:null,stall:null});
  }
  function step(state) {
    if(state.phase!=='running') return state;
    const event=state.plan.events[state.cursor];
    if(!event) throw new Error('Run exhausted without finish');
    let changed={cursor:state.cursor+1,lastEvent:event};
    if(event.type==='move') {
      changed.courier=event.cell;
      changed.facing=DIRS.find(d=>d.dr===(Math.floor(event.cell/5)-Math.floor(event.from/5)) && d.dc===event.cell%5-event.from%5).name;
    }
    if(event.type==='pickup') changed.carrying=[...state.carrying,event.id].sort();
    if(event.type==='stall') changed.stall=event;
    if(event.type==='deliver') {changed.delivered=event.ids;changed.carrying=[];}
    if(event.type==='finish') {
      changed.phase=event.success?'success':'failure';
      changed.unlocked=event.success ? Math.max(state.unlocked,Math.min(state.level+1,2)) : state.unlocked;
    }
    return freeze({...state,...changed});
  }
  function snapshot(state) { return freeze(JSON.parse(JSON.stringify(state))); }
  return freeze({LEVELS,DIRS,rotate,maskAt,neighbors,adjacent,movable,create,turn,undo,restart,next,evaluate,start,step,snapshot});
});
