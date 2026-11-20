(function () {
  'use strict';
  const M=window.FetchModel;
  const $=id=>document.getElementById(id);
  const board=$('board'),courier=$('courier');
  let state=M.create(0), angles=Array(25).fill(0), epoch=0, focusCell=5;
  let soundOn=false, audio=null;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const svg=inside=>`<svg viewBox="0 0 100 100" aria-hidden="true">${inside}</svg>`;
  const points=[[50,0],[100,50],[50,100],[0,50]];
  const icon=(name)=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  function tracks(mask) {
    const dirs=[0,1,2,3].filter(d=>mask&(1<<d));
    const path=dirs.length===2 ? `M${points[dirs[0]].join(' ')}L50 50L${points[dirs[1]].join(' ')}` : dirs.map(d=>`M50 50L${points[d].join(' ')}`).join('');
    return `<g class="track"><path class="track-bed" d="${path}"/><path class="track-center" d="${path}"/><path class="track-stitch" d="${path}"/></g>`;
  }
  function tile(mask) {
    return svg(`<rect class="tile-face" x="3" y="3" width="94" height="94" rx="10"/>${tracks(mask)}<path d="M13 8h17M8 13v17" fill="none" stroke="#fffaf0" stroke-width="1" opacity=".6"/>`);
  }
  function shelf(mask,id) {
    return svg(`${tracks(mask)}<g class="shelf"><rect x="9" y="23" width="82" height="65" rx="5" fill="#c7ad8e" stroke="#a48e70"/><path d="M17 78h66" stroke="#a58d6e" stroke-width="3"/><path class="shelf-paper" d="M16 9h62l7 8v62H16z"/><path d="M78 9v8h7" fill="#eee4cf" stroke="#b6a88c"/><path class="shelf-rule" d="M24 20h27M24 25h19"/><text class="shelf-number" x="50" y="52" text-anchor="middle">${id}</text><text class="original-label" x="50" y="74" text-anchor="middle">Original</text><path class="shelf-check" d="m69 34 5 5 8-10" fill="none" stroke="#53633b" stroke-width="3" stroke-linecap="round"/><g class="copy-echo"><rect x="30" y="26" width="39" height="49" rx="2" fill="#fff8e9" stroke="#a99a7e"/><text x="50" y="61" text-anchor="middle" class="shelf-number">${id}</text></g></g>`);
  }
  function home(mask) {
    return svg(`${tracks(mask)}<g class="home-book"><rect x="5" y="31" width="90" height="68" rx="4" fill="#465337" stroke="#35422a"/><path d="M25 34h57v48H25z" fill="#f9f1df" stroke="#c0b596"/><path d="M30 44h39M30 51h31M30 58h38M30 65h25" stroke="#d6ccb5" stroke-width="1.5"/><path d="M21 38h9M21 49h9M21 60h9M21 71h9" stroke="#7b8069" stroke-width="2.4" stroke-linecap="round"/><text class="home-word" x="51" y="94" text-anchor="middle">Notebook</text></g>`);
  }
  function buildBoard() {
    const level=M.LEVELS[state.level];
    angles=state.rotations.map(r=>r*90);
    const first=level.masks.findIndex((_,i)=>M.movable(state,i));
    focusCell=first;
    board.innerHTML='';
    level.masks.forEach((mask,cell)=>{
      const original=level.shelves.find(s=>s.cell===cell);
      const el=document.createElement(M.movable(state,cell)?'button':'div');
      el.dataset.cell=String(cell);
      if(M.movable(state,cell)) {
        el.type='button';el.className='tile';el.tabIndex=cell===first?0:-1;
        el.innerHTML=tile(mask);
        el.addEventListener('click',()=>turn(cell));
        el.addEventListener('focus',()=>{focusCell=cell;updateTabStops();});
      } else if(original) {
        el.className='fixed original';el.dataset.original=String(original.id);
        el.setAttribute('role','img');
        el.setAttribute('aria-label',`Original ${original.id}, row ${Math.floor(cell/5)+1}, column ${cell%5+1}: ${original.text} The original stays here.`);
        el.innerHTML=shelf(mask,original.id);
      } else if(cell===level.home) {
        el.className='fixed home';el.setAttribute('role','img');
        el.setAttribute('aria-label',`Clawc’s notebook, row ${Math.floor(cell/5)+1}, column ${cell%5+1}`);
        el.innerHTML=home(mask);
      } else {
        el.className='terrain';el.setAttribute('aria-hidden','true');
        el.innerHTML='';
      }
      board.appendChild(el);
    });
    $('level-name').textContent=level.name;
    $('chapter-count').textContent=`${state.level+1} of ${M.LEVELS.length}`;
    $('world').dataset.theme=level.theme;
    $('world').setAttribute('aria-label',`${level.name} puzzle board`);
    render();
  }
  function updateTabStops() {
    board.querySelectorAll('.tile').forEach(el=>{el.tabIndex=Number(el.dataset.cell)===focusCell?0:-1;});
  }
  function tileLabels() {
    const visited=new Set(state.plan ? state.plan.events.slice(0,state.cursor).filter(e=>e.type==='move').map(e=>e.cell) : []);
    board.querySelectorAll('.tile').forEach(el=>{
      const cell=Number(el.dataset.cell);
      const names=M.DIRS.filter((_,d)=>M.maskAt(state,cell)&(1<<d)).map(d=>d.name);
      el.setAttribute('aria-label',`Row ${Math.floor(cell/5)+1}, column ${cell%5+1}. Path: ${names.join(' and ')}. Turn clockwise.`);
      el.classList.toggle('traversed',visited.has(cell));
      el.classList.toggle('blocked',!!state.stall && (cell===state.stall.cell || cell===state.stall.to));
      el.disabled=state.phase==='running'||state.phase==='success';
      el.querySelector('.track').style.transform=`rotate(${angles[cell]}deg)`;
    });
  }
  function message() {
    if(state.phase==='success')return state.level===2?'All three chapters delivered. The notebook is complete.':'Both parts delivered. The originals never moved.';
    if(state.phase==='failure')return state.delivered.length ? `Only part ${state.delivered[0]} came back. ${state.stall?'Repair the join at the cross.':'Connect the other shelf.'}` : `No copies this time. ${state.stall?'Repair the join at the cross.':'Connect the shelves to the notebook.'}`;
    if(state.phase==='editing')return state.history.length?'Your route, your call. Send Hermy when it joins up.':'Join both shelves to the notebook, then send Hermy.';
    if(state.lastEvent?.type==='pickup')return `Hermy takes copy ${state.lastEvent.id}. The original stays here.`;
    if(state.lastEvent?.type==='deliver')return state.delivered.length===2?'Two copies. One complete reply for Clawc.':state.delivered.length?'Clawc has one part. There is still a gap in the reply.':'Back at the notebook, empty-handed.';
    if(state.stall)return 'A broken join. Hermy brings back what he could reach.';
    if(state.lastEvent?.type==='wait')return 'No route to the other shelf. Hermy is coming back.';
    if(state.carrying.length===2)return 'Both copies safely in hand. Back to Clawc!';
    if(state.carrying.length===1)return `Copy ${state.carrying[0]} in hand. On to the other part…`;
    return 'Hermy is on his way. Follow the connected paths.';
  }
  function render() {
    const running=state.phase==='running', won=state.phase==='success';
    $('game').dataset.phase=state.phase;
    $('game').dataset.level=String(state.level+1);
    if(won||state.phase==='failure')$('game').dataset.result=won?'success':'failure';
    else delete $('game').dataset.result;
    tileLabels();
    $('send').hidden=won;$('send').disabled=running;
    $('send').innerHTML=icon('play')+`<span>${running?'Fetching…':'Send Hermy'}</span>`;
    $('next').hidden=!won;
    $('next').innerHTML=`<span>${state.level===2?'Play again':'Next chapter'}</span>`+icon(state.level===2?'restart':'next');
    $('undo').disabled=running||won||state.history.length===0;
    $('status').textContent=message();
    $('ending').hidden=!(won&&state.level===2);
    [...$('progress').children].forEach((el,i)=>{
      if(i===state.level)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
      const complete=i<state.level || (won&&i===state.level);
      el.classList.toggle('complete',complete);
      el.querySelector('.chapter-number').innerHTML=complete?icon('check'):String(i+1);
      el.setAttribute('aria-label',`Chapter ${i+1}, ${M.LEVELS[i].name}${complete?', complete':i===state.level?', current':', not yet reached'}`);
    });
    let x=state.courier%5*20+10,y=Math.floor(state.courier/5)*20+10;
    if(state.lastEvent?.type==='stall') {
      x+=M.DIRS[state.lastEvent.direction].dc*3.5;y+=M.DIRS[state.lastEvent.direction].dr*3.5;
    }
    courier.style.left=`${x}%`;courier.style.top=`${y}%`;
    courier.dataset.facing=state.facing;
    courier.classList.toggle('walking',running&&state.lastEvent?.type==='move');
    courier.classList.toggle('collecting',running&&state.lastEvent?.type==='pickup');
    courier.classList.toggle('confused',state.lastEvent?.type==='stall'||state.phase==='failure'||state.lastEvent?.type==='wait');
    courier.classList.toggle('happy',won);
    courier.classList.toggle('has-one',state.carrying.includes(1));
    courier.classList.toggle('has-two',state.carrying.includes(2));
    board.querySelectorAll('.original').forEach(el=>{
      const id=Number(el.dataset.original);
      el.classList.toggle('picking',running&&state.lastEvent?.type==='pickup'&&id===state.lastEvent.id);
      el.classList.toggle('copied',state.carrying.includes(id)||state.delivered.includes(id));
    });
    $('snag').hidden=!state.stall;
    if(state.stall) {
      const {cell,direction}=state.stall;
      $('snag').style.left=`${cell%5*20+10+M.DIRS[direction].dc*9}%`;
      $('snag').style.top=`${Math.floor(cell/5)*20+10+M.DIRS[direction].dr*9}%`;
    }
    for(const original of M.LEVELS[state.level].shelves) {
      const el=$(`copy-${original.id}`),present=state.delivered.includes(original.id);
      el.classList.toggle('filled',present);
      el.querySelector('p').textContent=present?original.text:'Waiting for a copy';
      el.setAttribute('aria-label',present?`Copy ${original.id}: ${original.text}`:`Copy ${original.id} is missing`);
    }
    $('reply').classList.toggle('complete',state.delivered.length===2);
    $('copy-count').textContent=`${state.delivered.length} of 2 copies`;
    $('reply-caption').textContent=won?'An invented reply, assembled from both copies.':'The originals stay on the board. Only copies come here.';
  }
  function tone(frequency=300,length=.06,delay=0) {
    if(!soundOn)return;
    try {
      if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended')audio.resume().catch(()=>{});
      const osc=audio.createOscillator(), gain=audio.createGain(), at=audio.currentTime+delay;
      osc.type='sine';osc.frequency.setValueAtTime(frequency,at);
      osc.frequency.exponentialRampToValueAtTime(frequency*.76,at+length);
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.055,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
      osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+length+.01);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    } catch (_) {soundOn=false;updateSound();}
  }
  function updateSound() {
    $('sound').setAttribute('aria-pressed',String(soundOn));
    $('sound').setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');
    $('sound-label').textContent=soundOn?'Sound on':'Sound off';
    $('sound-waves').setAttribute('href',soundOn?'#i-volume-on':'#i-volume-off');
  }
  function turn(cell) {
    const changed=M.turn(state,cell);
    if(changed===state)return;
    state=changed;angles[cell]+=90;tone(290+cell*3);render();
  }
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function run() {
    const changed=M.start(state);
    if(changed===state)return;
    const runEpoch=++epoch;
    state=changed;render();tone(390,.1);
    await wait(160);
    while(epoch===runEpoch&&state.phase==='running') {
      state=M.step(state);render();
      const event=state.lastEvent;
      if(event.type==='pickup'){tone(650,.12);tone(850,.13,.11);}
      if(event.type==='stall')tone(180,.18);
      if(event.type==='deliver')tone(350,.14);
      if(event.type==='finish'&&event.success){tone(520,.2);tone(650,.2,.12);tone(780,.25,.24);}
      const duration=event.type==='move'?(motion.matches?140:360):event.type==='pickup'?850:event.type==='stall'||event.type==='wait'?1100:event.type==='deliver'?700:180;
      await wait(duration);
    }
    if(epoch===runEpoch && state.phase==='success')$('next').focus({preventScroll:true});
  }
  $('send').addEventListener('click',run);
  $('undo').addEventListener('click',()=>{
    const cell=state.history.at(-1)?.cell, changed=M.undo(state);
    if(changed===state)return;
    state=changed;angles[cell]-=90;tone(240);render();
  });
  $('restart').addEventListener('click',()=>{epoch++;state=M.restart(state);buildBoard();tone(260,.1);});
  $('next').addEventListener('click',()=>{
    const changed=M.next(state);if(changed===state)return;
    epoch++;state=changed;buildBoard();tone(450,.1);
    board.querySelector('.tile')?.focus({preventScroll:true});
  });
  $('sound').addEventListener('click',()=>{soundOn=!soundOn;updateSound();if(soundOn)tone(450,.1);});
  board.addEventListener('keydown',event=>{
    if(state.phase==='running'||state.phase==='success'||!event.target.matches('.tile'))return;
    const dir={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3}[event.key];
    let target=-1;
    if(dir!==undefined) {
      event.preventDefault();
      let cell=Number(event.target.dataset.cell);
      while((cell=M.adjacent(cell,dir))>=0)if(M.movable(state,cell)){target=cell;break;}
    } else if(event.key==='Home'||event.key==='End') {
      event.preventDefault();
      const tiles=[...board.querySelectorAll('.tile')];
      target=Number((event.key==='Home'?tiles[0]:tiles.at(-1)).dataset.cell);
    }
    if(target>=0)board.querySelector(`[data-cell="${target}"]`).focus();
  });
  // Diagnostics expose a fresh deeply frozen copy, never live state or a solve/advance hook.
  Object.defineProperty(window,'FetchGame',{value:Object.freeze({getState:()=>M.snapshot(state),version:'2.0.0'}),writable:false,configurable:false});
  document.querySelector('.ending a').addEventListener('click',()=>{
    $('notebook-source').open=true;
  });
  // Same-tab navigation must not resume an abandoned delivery from BFCache.
  window.addEventListener('pagehide',()=>{
    epoch++;
    if(state.phase==='running'){state=M.restart(state);buildBoard();}
    if(audio)audio.suspend().catch(()=>{});
  });
  buildBoard();
})();
