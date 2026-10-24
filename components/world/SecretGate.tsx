'use client';
import {useEffect,useRef,useState,type CSSProperties,type FormEvent,type ReactNode} from 'react';

const QUESTION='What do I lovingly call you? 🧸';
const HINTS=['It’s a cute little nickname.','Think of the name that makes you smile.'];
// Hash of the accepted answer; the plain answer is intentionally not stored in the app.
const ANSWER_HASHES=['5d6dd28b03bf6'];
const HELP_NUMBER='923427745746';
const STORE_KEY='hbd-unlocked';

export const normalizeAnswer=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');
const cyrb53=(str:string,seed=25)=>{let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0;i<str.length;i++){const ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(16)};
export const hashAnswer=(s:string)=>cyrb53(`hbd:${normalizeAnswer(s)}`);

// Reactive gatekeeper: Google Noto animated emoji (CC BY 4.0). Falls back to the plain emoji if an image fails to load.
const MOODS={peek:{code:'1fae3',char:'🫣'},eyes:{code:'1f440',char:'👀'},oops:{code:'1f648',char:'🙈'},think:{code:'1f914',char:'🤔'},giggle:{code:'1f92d',char:'🤭'},please:{code:'1f97a',char:'🥺'},shh:{code:'1f92b',char:'🤫'},party:{code:'1f973',char:'🥳'}} as const;
type Mood=keyof typeof MOODS;
const LINES:Record<Mood,string>={peek:'Who’s there? This surprise is for one birthday girl only.',eyes:'Ooh… let me see…',oops:'Nope! Try again 🙈',think:'Hmm… think, birthday girl.',giggle:'Hehe, not quite. Here’s a little hint ↓',please:'Need a bit of help?',shh:'Shh… no free answers 🤫',party:'It’s really you! Happy birthday 🎉'};
const notoGif=(code:string)=>`https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.webp`;
function GateFace({mood}:{mood:Mood}){const [failed,setFailed]=useState(false);const m=MOODS[mood];return failed?<span className="gate-face-char" aria-hidden="true">{m.char}</span>:<img className="gate-face-img" src={notoGif(m.code)} width={88} height={88} alt="" aria-hidden="true" draggable={false} onError={()=>setFailed(true)}/>}

const STARS:[number,number,number,number][]=Array.from({length:28},(_,i)=>[(i*37+7)%100,(i*53+11)%100,1+(i%3),(i%7)*.6]);
type Phase='locked'|'opening'|'open';

export default function SecretGate({children}:{children:ReactNode}){
  const [phase,setPhase]=useState<Phase>('locked');
  const [ready,setReady]=useState(false);
  const [value,setValue]=useState('');
  const [tries,setTries]=useState(0);
  const [boop,setBoop]=useState(false);
  const app=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),form=useRef<HTMLFormElement>(null),lockWrap=useRef<HTMLDivElement>(null);
  const face=useRef<HTMLButtonElement>(null),boopT=useRef(0);
  useEffect(()=>{const timer=window.setTimeout(()=>{let ok=false;try{const saved=sessionStorage.getItem(STORE_KEY);ok=!!saved&&ANSWER_HASHES.includes(saved)}catch{}const dev=['localhost','127.0.0.1'].includes(window.location.hostname)&&new URLSearchParams(window.location.search).has('qa');if(ok||dev)setPhase('open');setReady(true)},0);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{const el=app.current;if(!el)return;if(phase==='open')el.removeAttribute('inert');else el.setAttribute('inert','')},[phase]);
  useEffect(()=>{if(ready&&phase==='locked'&&window.matchMedia('(pointer:fine)').matches)input.current?.focus({preventScroll:true})},[ready,phase]);
  useEffect(()=>{Object.values(MOODS).forEach(m=>{const i=new Image();i.src=notoGif(m.code)});return()=>window.clearTimeout(boopT.current)},[]);
  const chime=()=>{try{const AC=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;const ctx=new AC();[783.99,987.77,1318.51].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.12;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+1.2);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+1.3)});window.setTimeout(()=>void ctx.close(),2000)}catch{}}
  const burst=()=>{const host=lockWrap.current;if(!host)return;const cx=host.clientWidth/2,cy=host.clientHeight/2;for(let i=0;i<14;i++){const s=document.createElement('span');s.className='wish-spark';s.textContent=i%3?'✦':'✧';const a=i/14*Math.PI*2,d=60+Math.random()*50;s.style.left=`${cx}px`;s.style.top=`${cy}px`;s.style.setProperty('--dx',`${Math.cos(a)*d}px`);s.style.setProperty('--dy',`${Math.sin(a)*d}px`);host.appendChild(s);window.setTimeout(()=>s.remove(),900)}};
  const wrong=()=>{[form.current,lockWrap.current,face.current].forEach(el=>{if(!el)return;el.classList.remove('is-wrong');void el.offsetWidth;el.classList.add('is-wrong')});navigator.vibrate?.(60)};
  const submit=(e:FormEvent)=>{e.preventDefault();if(phase!=='locked'||!normalizeAnswer(value))return;const h=hashAnswer(value);if(ANSWER_HASHES.includes(h)){try{sessionStorage.setItem(STORE_KEY,h)}catch{}input.current?.blur();setPhase('opening');chime();window.setTimeout(burst,350);window.setTimeout(()=>setPhase('open'),2600)}else{setTries(n=>n+1);setValue('');wrong()}};
  const mood:Mood=phase!=='locked'?'party':boop?'shh':value.trim()?'eyes':tries===0?'peek':tries===1?'oops':tries===2?'think':tries<5?'giggle':'please';
  const booper=()=>{if(phase!=='locked')return;setBoop(true);window.clearTimeout(boopT.current);boopT.current=window.setTimeout(()=>setBoop(false),1800)};
  const hint=tries>=5&&HINTS[1]?HINTS[1]:tries>=3&&HINTS[0]?HINTS[0]:'';
  return <><div ref={app} className="gate-app" aria-hidden={phase!=='open'||undefined}>{children}</div>{phase!=='open'&&<div className={`secret-gate is-${phase}`} role="dialog" aria-modal="true" aria-label="This birthday surprise is locked"><div className="gate-stars" aria-hidden="true">{STARS.map(([x,y,s,d],i)=><span key={i} style={{left:`${x}%`,top:`${y}%`,width:s,height:s,animationDelay:`${d}s`}}/>)}</div>{ready&&<div className="gate-card"><div className="gate-lock-wrap" ref={lockWrap}><div className="gate-lock" aria-hidden="true"><svg viewBox="0 0 120 140"><defs><linearGradient id="gate-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1c9"/><stop offset=".5" stopColor="#e9b75a"/><stop offset="1" stopColor="#fbe3a1"/></linearGradient><linearGradient id="gate-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f9c6d2"/><stop offset="1" stopColor="#c8657e"/></linearGradient></defs><path className="gate-shackle" d="M34 64 V40 a26 26 0 0 1 52 0 V64" fill="none" stroke="url(#gate-gold)" strokeWidth="10" strokeLinecap="round"/><path d="M60 132 C30 112 12 96 12 76 C12 62 23 52 36 52 C46 52 54 57 60 65 C66 57 74 52 84 52 C97 52 108 62 108 76 C108 96 90 112 60 132 Z" fill="url(#gate-body)" stroke="#fff3e5" strokeOpacity=".35" strokeWidth="1.5"/><ellipse cx="40" cy="70" rx="12" ry="7" fill="#fff" opacity=".28" transform="rotate(-25 40 70)"/><g className="gate-keyhole" fill="#6b2f45"><circle cx="60" cy="84" r="7"/><path d="M56 88 L54 104 H66 L64 88 Z"/></g></svg></div></div><div className={`gate-guard is-${mood}`}><button type="button" ref={face} className="gate-face" onClick={booper} onAnimationEnd={e=>{if(e.animationName==='face-no')e.currentTarget.classList.remove('is-wrong')}} aria-label="Boop the gatekeeper" style={{'--look':`${Math.min(value.length,12)*1.4-8}px`} as CSSProperties}><GateFace key={mood} mood={mood}/></button><p className="gate-bubble" key={LINES[mood]} role="status">{LINES[mood]}</p></div>{phase==='locked'&&<form className="gate-form" ref={form} onSubmit={submit}><p className="gate-eyebrow">🔐 Secret question</p><label className="gate-question" htmlFor="gate-answer">{QUESTION}</label><div className="gate-field"><input id="gate-answer" ref={input} value={value} onChange={e=>setValue(e.target.value)} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go" placeholder="One word…" maxLength={40}/><button type="submit" className="gate-submit" disabled={!normalizeAnswer(value)}>Unlock ✨</button></div>{hint&&<p className="gate-hint" key={hint}>Hint: {hint}</p>}{tries>=5&&<a className="gate-help" href={`https://wa.me/${HELP_NUMBER}?text=${encodeURIComponent('Help! I can’t unlock my birthday surprise 🙈')}`} target="_blank" rel="noopener noreferrer">Still stuck? Ask me on WhatsApp 💬</a>}</form>}</div>}<p className="gate-foot" aria-hidden="true">made for one birthday girl only 🎂</p></div>}</>;
}
