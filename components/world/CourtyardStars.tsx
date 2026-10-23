'use client';
import {useState,type CSSProperties} from 'react';
import {BirthdayCompanion} from './BirthdaySticker';

type Props={collected:number[];skipped:boolean;reduced:boolean;onCollect:(i:number)=>void;onSkip:()=>void;onNote:(step:number)=>void};
const NOTES=['You make ordinary days feel golden ✨','Your laugh is my favourite sound 🎶','The world feels softer with you in it 🌷','You deserve every good thing, always 💛','And this whole little world? I made it for you 💌'];
const HOMES:[number,number][]=[[13,42],[86,36],[20,60],[80,58],[62,50]];
const SLOTS:[number,number][]=[[-.23,-.27],[.23,-.27],[-.4,-.08],[.4,-.08],[0,.4]];
const HEART='M0,-18 C-8,-34 -40,-30 -40,-8 C-40,14 -12,26 0,40 C12,26 40,14 40,-8 C40,-30 8,-34 0,-18 Z';
const STAR='M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.2 20.1l1.5-6.5-5-4.4 6.6-.6z';

export default function CourtyardStars({collected,skipped,reduced,onCollect,onSkip,onNote}:Props){
 const [open,setOpen]=useState<number|null>(null),count=collected.length,total=NOTES.length,done=count>=total;
 const pick=(i:number)=>{if(open!==null||collected.includes(i)||skipped)return;onNote(count);setOpen(i)};
 const keep=()=>{if(open===null)return;const i=open,last=count+1>=total;setOpen(null);onCollect(i);if(last)window.setTimeout(()=>onNote(5),1100)};
 return <div className={`court-stars${done?' is-done':''}`} data-reduced={reduced||undefined}>
  {!skipped&&<div className="court-count" aria-live="polite">★ {count} / {total}</div>}
  <div className="court-heart" aria-hidden="true"><svg viewBox="-50 -50 100 100"><path d={HEART} pathLength={1}/></svg></div>
  {HOMES.map(([x,y],i)=>{const slot=collected.indexOf(i),got=slot>=0;if(!got&&skipped)return null;const [sx,sy]=got?SLOTS[slot]:[0,0];return <button key={i} type="button" className={`court-star${got?' is-got':''}${open===i?' is-open':''}`} style={{left:got?`calc(50% + var(--hs) * ${sx})`:`${x}%`,top:got?`calc(var(--heart-y) + var(--hs) * ${sy})`:`${y}%`,'--i':i} as CSSProperties} disabled={got} onClick={()=>pick(i)} aria-label={got?'Collected star':'Collect this star'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR}/></svg></button>})}
  <div className="court-caption" role="status">{open!==null?<div className="court-note"><span className="court-note-tag">Star {count+1} of {total}</span><p>{NOTES[count]}</p><button type="button" className="court-keep" onClick={keep} autoFocus>Keep this ✨</button></div>:done?<><BirthdayCompanion variant="clap" size={64} celebrate message="All your stars are home, Cutie ✨"/><p className="court-hint">Keep walking, there’s more waiting for you 🎁</p></>:skipped?<p className="court-hint">Keep walking, there’s more waiting for you 🎁</p>:<><BirthdayCompanion variant="wave" size={64} message={count===0?'Cutie, your wish landed out here… and 5 little stars got lost 🌟':`${total-count} more to find, you’re doing great 💫`}/><p className="court-hint">Tap a glowing star to collect it</p><button type="button" className="court-skip" onClick={onSkip}>Skip for now</button></>}</div>
 </div>;
}
