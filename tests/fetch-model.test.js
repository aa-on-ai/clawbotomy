'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const M = require('../content/games/fetch/model.js');

// QA fixtures, not shipped in the playable HTML. Coordinates are zero-based cells.
const SOLUTIONS = [
  [[11,1],[12,2],[7,3],[9,1]],
  [[11,1],[12,3],[7,3],[13,1],[8,1],[6,1]],
  [[10,3],[15,1],[0,1],[11,3],[17,2],[13,1],[9,3],[19,2],[23,1]]
];
function solved(level) {
  let s = M.create(level);
  for (const [cell, turns] of SOLUTIONS[level]) for (let i=0;i<turns;i++) s=M.turn(s,cell);
  return s;
}
function finish(s) {
  s = M.start(s);
  let guard = 0;
  while (s.phase === 'running' && guard++ < 300) s = M.step(s);
  assert.ok(guard < 300, 'every run terminates');
  return s;
}
function deeplyFrozen(value) {
  if (value && typeof value==='object') {
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(deeplyFrozen);
  }
}
for(let level=0;level<3;level++) {
  test(`puzzle ${level+1}: initial route fails physically, solution fetches both`,()=>{
    const initial=M.create(level);
    const bad=M.evaluate(initial);
    assert.equal(bad.success,false);
    assert.ok(bad.events.some(e=>e.type==='stall'));
    assert.ok(bad.missing.length>0);
    const failed=finish(initial);
    assert.equal(failed.phase,'failure');
    assert.equal(failed.courier,M.LEVELS[level].home);
    assert.deepEqual(failed.delivered,bad.found);
    const correct=solved(level);
    const good=M.evaluate(correct);
    assert.equal(good.success,true);
    assert.deepEqual(good.found,[1,2]);
    assert.equal(good.events.some(e=>e.type==='stall'),false);
    const won=finish(correct);
    assert.equal(won.phase,'success');
    assert.deepEqual(won.delivered,[1,2]);
    assert.deepEqual(won.carrying,[]);
    assert.equal(won.courier,M.LEVELS[level].home);
    assert.equal(won.unlocked,Math.min(level+1,2));
  });
  test(`puzzle ${level+1}: all rendered moves are reciprocal paths; pickup and delivery are spatial`,()=>{
    for(const state of [M.create(level),solved(level)]) {
      const plan=M.evaluate(state);
      let position=M.LEVELS[level].home;
      const picked=[];
      for(const event of plan.events) {
        if(event.type==='move') {
          assert.equal(event.from,position);
          assert.ok(M.neighbors(state,position).includes(event.cell),`illegal ${position} -> ${event.cell}`);
          position=event.cell;
        }
        if(event.type==='pickup') {
          assert.equal(position,M.LEVELS[level].shelves.find(x=>x.id===event.id).cell);
          picked.push(event.id);
        }
        if(event.type==='stall') {
          assert.equal(event.cell,position);
          assert.ok(!M.neighbors(state,position).includes(event.to));
          assert.ok(M.maskAt(state,position)&(1<<event.direction));
        }
        if(event.type==='deliver') {
          assert.equal(position,M.LEVELS[level].home);
          assert.deepEqual([...event.ids].sort(),[...picked].sort());
        }
      }
      assert.equal(position,M.LEVELS[level].home);
    }
  });
  test(`puzzle ${level+1}: immutable originals survive failure, success, undo and restart`,()=>{
    const originals=JSON.stringify(M.LEVELS[level].shelves);
    const initial=M.create(level);
    const [cell]=SOLUTIONS[level][0];
    const turned=M.turn(initial,cell);
    assert.notDeepEqual(turned.rotations,initial.rotations);
    assert.deepEqual(M.undo(turned).rotations,initial.rotations);
    assert.deepEqual(M.restart(solved(level)).rotations,initial.rotations);
    assert.deepEqual(M.restart(finish(initial)).delivered,[]);
    assert.deepEqual(M.restart(M.start(initial)).rotations,initial.rotations);
    finish(solved(level));
    assert.equal(JSON.stringify(M.LEVELS[level].shelves),originals);
    deeplyFrozen(M.LEVELS);
    deeplyFrozen(turned);
    deeplyFrozen(finish(solved(level)));
    assert.throws(()=>{M.LEVELS[level].shelves[0].text='lost';},TypeError);
  });
  test(`puzzle ${level+1}: one real wrong turn breaks an otherwise successful route`,()=>{
    const s=solved(level);
    // The first solution cell is on a required route, not a cosmetic decoy.
    const changed=M.turn(s,SOLUTIONS[level][0][0]);
    assert.equal(M.evaluate(changed).success,false);
    assert.equal(M.evaluate(M.undo(changed)).success,true);
  });
}
test('puzzle one starts with exactly one obtainable half, and failed copies do not accumulate across runs',()=>{
  const s=M.create(0);
  assert.deepEqual(M.evaluate(s).found,[1]);
  const failed=finish(s);
  assert.deepEqual(failed.delivered,[1]);
  assert.deepEqual(M.start(failed).delivered,[]);
});
test('four quarter turns restore geometry; fixed shelves, home and scenery cannot rotate',()=>{
  const initial=M.create(0);
  let s=initial;
  for(let i=0;i<4;i++)s=M.turn(s,11);
  assert.equal(M.maskAt(s,11),M.maskAt(initial,11));
  for(const cell of [0,4,20,1,-1,25,1.5])assert.equal(M.turn(initial,cell),initial);
});
test('running state blocks edits; restart cancels run; progression requires a current win',()=>{
  const initial=M.create(0);
  assert.equal(M.next(initial),initial);
  assert.equal(M.next(finish(initial)).level,0);
  const running=M.start(solved(0));
  assert.equal(M.turn(running,11),running);
  assert.equal(M.undo(running),running);
  assert.equal(M.start(running),running);
  assert.equal(M.restart(running).phase,'editing');
  let s=finish(solved(0));
  assert.equal(M.next(s).level,1);
  s=finish(solved(2));
  assert.equal(M.next(s).level,0);
  assert.equal(M.next(s).unlocked,2);
});
test('a copied diagnostic snapshot cannot mutate the canonical state',()=>{
  const s=finish(solved(0));
  const snapshot=M.snapshot(s);
  deeplyFrozen(snapshot);
  assert.notEqual(snapshot,s);
  assert.notEqual(snapshot.rotations,s.rotations);
  assert.throws(()=>{snapshot.rotations[1]=3;},TypeError);
  assert.throws(()=>{snapshot.plan.events.push({type:'finish'});},TypeError);
});

test('all four rotations of every movable tile retain legal deterministic traversals',()=>{
  for(let level=0;level<3;level++)for(let cell=0;cell<25;cell++) {
    let s=solved(level);
    for(let rotation=0;rotation<4;rotation++) {
      s=M.turn(s,cell);
      const plan=M.evaluate(s);
      assert.deepEqual(M.evaluate(s),plan);
      let position=M.LEVELS[level].home;
      for(const event of plan.events)if(event.type==='move') {
        assert.equal(event.from,position);
        assert.ok(M.neighbors(s,position).includes(event.cell));
        position=event.cell;
      }
      assert.equal(position,M.LEVELS[level].home);
      assert.ok(plan.events.length<200);
    }
  }
});


test('courier facing follows actual reciprocal movement, and survives pickups and delivery',()=>{
  const observed=new Set();
  for(let level=0;level<3;level++) {
    let s=M.start(solved(level));
    let facing=s.facing;
    while(s.phase==='running') {
      s=M.step(s);
      const e=s.lastEvent;
      if(e.type==='move') {
        const delta=e.cell-e.from;
        facing=({1:'east','-1':'west',5:'south','-5':'north'})[delta];
        observed.add(facing);
      }
      assert.equal(s.facing,facing);
    }
    assert.equal(M.restart(s).facing,'north');
  }
  assert.deepEqual([...observed].sort(),['east','north','south','west']);
});

test('editing after a partial delivery clears stale copies and the blocked-junction receipt',()=>{
  const failed=finish(M.turn(M.create(0),23));
  assert.deepEqual(failed.delivered,[1]);
  assert.ok(failed.stall);
  for(const revised of [M.turn(failed,11),M.undo(failed)]) {
    assert.equal(revised.phase,'editing');
    assert.deepEqual(revised.delivered,[]);
    assert.deepEqual(revised.carrying,[]);
    assert.equal(revised.stall,null);
    assert.equal(revised.plan,null);
    assert.equal(revised.facing,'north');
  }
});

test('each chapter assembles its own two fragments only after physically collecting both',()=>{
  const replies=new Set();
  for(let level=0;level<3;level++) {
    const s=finish(solved(level));
    const fragments=s.delivered.map(id=>M.LEVELS[level].shelves.find(x=>x.id===id).text);
    assert.equal(fragments.length,2);
    assert.ok(fragments.every(x=>typeof x==='string'&&x.length>0));
    replies.add(fragments.join(' '));
  }
  assert.equal(replies.size,3);
});
