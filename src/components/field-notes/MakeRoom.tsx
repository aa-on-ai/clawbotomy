'use client';

import { useState } from 'react';

/** An illustrative page, not a screenshot or a reconstruction of the September 22 design. */
export function MakeRoom({ preview = false }: { preview?: boolean }) {
  const [labels, setLabels] = useState(true);
  const [rules, setRules] = useState(true);
  const clean = !labels && !rules;
  return (
    <section className={`makeRoom${preview ? ' makeRoomPreview' : ''}`} aria-label={preview ? 'Preview of the make-room experiment' : 'Make room experiment'}>
      {!preview && <div className="roomIntro"><h3>Same story. Less furniture.</h3><p>Try the edit. Remove the little labels and lines. See what still does the work.</p></div>}
      <div className="roomStage" data-labels={preview ? 'false' : String(labels)} data-rules={preview ? 'false' : String(rules)}>
        <div className="roomSheet">
          <div className="roomHeadingTag" aria-hidden={preview || !labels}>From the notebook</div>
          <div className="roomSampleTitle">Things get weird.<br />We take notes.</div>
          <div className="roomRule" />
          <div className="roomSampleStory">
            <div>
              <div className="roomHeadingTag" aria-hidden={preview || !labels}>Personnel matter</div>
              <div className="roomSampleHeading">A lobster.<br />A notebook.<br />A few corrections.</div>
              <p>The useful mistake is usually the interesting part.</p>
            </div>
            {/* Existing cast art is part of the specimen, not a new generated asset. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/field-notes/portrait-clawc-cutout.webp" alt="Clawc holding his notebook, unchanged by the edit" width="1024" height="1536" />
          </div>
          <div className="roomRule" />
          <div className="roomSampleFoot">Field notes by Clawc</div>
        </div>
        <span className="roomMarginNote" aria-hidden="true">{preview || clean ? 'The story stays.' : 'A little crowded in here.'}</span>
      </div>
      {!preview && <>
        <div className="roomControls" role="group" aria-label="Page edits">
          <button type="button" aria-pressed={!labels} onClick={() => setLabels(!labels)}>{labels ? 'Remove eyebrows' : 'Restore eyebrows'}</button>
          <button type="button" aria-pressed={!rules} onClick={() => setRules(!rules)}>{rules ? 'Clear divider lines' : 'Restore divider lines'}</button>
          <button type="button" className="roomReset" disabled={labels && rules} onClick={() => { setLabels(true); setRules(true); }}>Reset</button>
        </div>
        <p className="roomResult" role="status">{clean ? 'No words lost. No lobster harmed. The headings and space carry the structure now.' : !labels ? 'The headings already introduce themselves. The labels were saying it twice.' : !rules ? 'The lines are gone. Spacing still tells you where one thought ends and another begins.' : 'Two small edits. The words, their order, and the lobster will stay the same.'}</p>
        <p className="roomCaption">An illustrative playground, not a reconstruction of the original page.</p>
      </>}
    </section>
  );
}
