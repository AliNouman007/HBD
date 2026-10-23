'use client';
import {useRef,useState,type CSSProperties} from 'react';
import {BirthdayCompanion} from './BirthdaySticker';

type Props={collected:number[];skipped:boolean;reduced:boolean;onCollect:(i:number)=>void;onSkip:()=>void;onNote:(step:number)=>void};
type Locket='closed'|'opening'|'open';
const NOTES=['You make ordinary days feel golden ✨','Your laugh is my favourite sound 🎶','The world feels softer with you in it 🌷','You deserve every good thing, always 💛','And this whole little world? I made it for you 💌'];
const SECRET='Out of every star in the sky, you’re still my favourite wish 💛';
const HOMES:[number,number][]=[[13,42],[86,36],[20,60],[80,58],[62,50]];
const SLOTS:[number,number][]=[[-.23,-.27],[.23,-.27],[-.4,-.08],[.4,-.08],[0,.4]];
const HEART='M0,-18 C-8,-34 -40,-30 -40,-8 C-40,14 -12,26 0,40 C12,26 40,14 40,-8 C40,-30 8,-34 0,-18 Z';
const STAR='M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.2 20.1l1.5-6.5-5-4.4 6.6-.6z';
const DRIFT:[number,number,number,number,number][]=Array.from({length:22},(_,i)=>[(i*37+11)%70+15,(i%7)*.35,5+(i%5)*.8,10+(i%4)*4,((i%6)-2.5)*24]);
const DRIFT_CHARS=['♥','❀','✦','♥','❁'],DRIFT_COLORS=['#f7b6c6','#ffd98a','#fff3d7','#f4a3b8','#ffe0a3'];

export default function CourtyardStars({collected,skipped,reduced,onCollect,onSkip,onNote}:Props){
 const [open,setOpen]=useState<number|null>(null),[locket,setLocket]=useState<Locket>('closed');
 const root=useRef<HTMLDivElement>(null),btns=useRef<(HTMLButtonElement|null)[]>([]);
 const count=collected.length,total=NOTES.length,done=count>=total;
 const centre=(b:HTMLElement|null|undefined)=>{const el=root.current;if(!el||!b)return null;const r=el.getBoundingClientRect(),q=b.getBoundingClientRect();return {x:q.left+q.width/2-r.left,y:q.top+q.height/2-r.top}};
 const spark=(i:number,n:number)=>{const el=root.current,p=centre(btns.current[i]);if(!el||!p||reduced)return;for(let k=0;k<n;k++){const s=document.createElement('span');s.className='wish-spark';s.textContent=k%3?'✦':'✧';const a=k/n*Math.PI*2+(k%4)*.1,d=28+(k%5)*7;s.style.left=`${p.x}px`;s.style.top=`${p.y}px`;s.style.setProperty('--dx',`${Math.cos(a)*d}px`);s.style.setProperty('--dy',`${Math.sin(a)*d}px`);el.appendChild(s);window.setTimeout(()=>s.remove(),900)}};
 const trail=(i:number)=>{const el=root.current;if(!el||reduced)return;let ticks=0;const id=window.setInterval(()=>{const p=centre(btns.current[i]);if(!p||ticks++>28){window.clearInterval(id);return}const s=document.createElement('span');s.className='court-trail';s.style.left=`${p.x}px`;s.style.top=`${p.y}px`;el.appendChild(s);window.setTimeout(()=>s.remove(),700)},40)};
 const pick=(i:number)=>{if(open!==null||collected.includes(i)||skipped)return;onNote(count);setOpen(i);spark(i,8)};
 const keep=()=>{if(open===null)return;const i=open,last=count+1>=total;setOpen(null);onCollect(i);trail(i);window.setTimeout(()=>spark(i,6),1100);if(last){window.setTimeout(()=>onNote(5),1100);window.setTimeout(()=>onNote(6),2800)}};
 const openLocket=()=>{if(locket!=='closed')return;setLocket('opening');onNote(7);window.setTimeout(()=>setLocket('open'),900)};
 return <div ref={root} className={`court-stars${done?' is-done':''} is-locket-${locket}`} style={{'--warm':count/total} as CSSProperties} data-reduced={reduced||undefined}>
  <div className="court-warm" aria-hidden="true"/>
  {!skipped&&<div className="court-count" role="img" aria-label={`${count} of ${total} stars found`}>{NOTES.map((_,i)=><span key={i} className={i<count?'is-on':''}>★</span>)}</div>}
  <div className="court-heart"><svg className="court-outline" viewBox="-50 -50 100 100" aria-hidden="true"><defs><radialGradient id="court-heart-fill" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#fff6e0"/><stop offset=".5" stopColor="#ffcfa8"/><stop offset="1" stopColor="#ee8fae"/></radialGradient></defs><path d={HEART} pathLength={1}/></svg>{done&&<button type="button" className="court-locket" onClick={openLocket} disabled={locket!=='closed'} aria-label="Open the heart locket"><span className="locket-light" aria-hidden="true"/><span className="locket-half is-left" aria-hidden="true"><svg viewBox="-50 -50 100 100"><path d={HEART}/></svg></span><span className="locket-half is-right" aria-hidden="true"><svg viewBox="-50 -50 100 100"><path d={HEART}/></svg></span></button>}</div>
  {done&&!reduced&&<div className="court-drift" aria-hidden="true">{DRIFT.map(([l,d,dur,s,dx],i)=><span key={i} style={{left:`${l}%`,animationDelay:`${2.9+d}s`,animationDuration:`${dur}s`,fontSize:s,color:DRIFT_COLORS[i%5],'--dx':`${dx}px`} as CSSProperties}>{DRIFT_CHARS[i%5]}</span>)}</div>}
  {HOMES.map(([x,y],i)=>{const slot=collected.indexOf(i),got=slot>=0;if(!got&&skipped)return null;const [sx,sy]=got?SLOTS[slot]:[0,0];return <button key={i} ref={el=>{btns.current[i]=el}} type="button" className={`court-star${got?' is-got':''}${open===i?' is-open':''}`} style={{left:got?`calc(50% + var(--hs) * ${sx})`:`${x}%`,top:got?`calc(var(--heart-y) + var(--hs) * ${sy})`:`${y}%`,'--i':i} as CSSProperties} disabled={got} onClick={()=>pick(i)} aria-label={got?'Collected star':'Collect this star'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR}/></svg></button>})}
  <div className="court-caption" role="status">{open!==null?<div className="court-note"><span className="court-note-tag">Star {count+1} of {total}</span><p>{NOTES[count]}</p><button type="button" className="court-keep" onClick={keep} autoFocus>Keep this ✨</button></div>:locket!=='closed'?<><div className="court-note is-secret"><span className="court-note-tag">A secret, just for you</span><p>{SECRET}</p></div><p className="court-hint is-late">Keep walking, there’s more waiting for you 🎁</p></>:done?<BirthdayCompanion variant="clap" size={64} celebrate message="Your heart is full of stars ✨ Tap it, Cutie… it’s a locket 💛"/>:skipped?<p className="court-hint">Keep walking, there’s more waiting for you 🎁</p>:<><BirthdayCompanion variant="wave" size={64} message={count===0?'Cutie, your wish landed out here… and 5 little stars got lost 🌟':`${total-count} more to find, you’re doing great 💫`}/><p className="court-hint">Tap a glowing star to collect it</p><button type="button" className="court-skip" onClick={onSkip}>Skip for now</button></>}</div>
 </div>;
}
