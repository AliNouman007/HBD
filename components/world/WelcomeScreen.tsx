'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Eye,Gift} from 'lucide-react';
import BirthdaySticker from './BirthdaySticker';
import {burstConfetti} from './celebrate';
import {birthdayLabel,type PersonalContent} from '@/lib/world/content';

type Props={name:string;birthday:PersonalContent['birthday'];muted:boolean;reduced:boolean;onOpen:()=>void;onLookAround:()=>void};

const GREETING='Cutie… I’ve been hiding a surprise for you! 🎁';
const PEEKS=['Not yet, cutie 😌 Open your surprise first!','Still no peeking 🙈','Okay okay, you’re VERY curious 😂'];
const delay=(ms:number)=>({'--d':`${ms}ms`} as CSSProperties);

export default function WelcomeScreen({name,birthday,muted,reduced,onOpen,onLookAround}:Props){
 const [bubble,setBubble]=useState(GREETING),[typed,setTyped]=useState(reduced?999:0),[peek,setPeek]=useState(false),[peeks,setPeeks]=useState(0),[opening,setOpening]=useState(false);
 const gift=useRef<HTMLButtonElement>(null),openButton=useRef<HTMLButtonElement>(null),resetBubble=useRef(0);
 const chars=[...bubble],letters=[...name];
 const now=new Date(),isToday=!!birthday&&now.getDate()===birthday.day&&now.getMonth()+1===birthday.month;
 useEffect(()=>{const resetTimers:number[]=[];if(reduced){resetTimers.push(window.setTimeout(()=>setTyped(999),0));return()=>resetTimers.forEach(id=>window.clearTimeout(id))}resetTimers.push(window.setTimeout(()=>setTyped(0),0));const total=[...bubble].length;let n=0;const start=window.setTimeout(()=>{const id=window.setInterval(()=>{n+=1;setTyped(n);if(n>=total)window.clearInterval(id)},38);resetTimers.push(id)},bubble===GREETING&&peeks===0?500:0);resetTimers.push(start);return()=>{resetTimers.forEach(id=>window.clearTimeout(id));resetTimers.forEach(id=>window.clearInterval(id))}},[bubble,reduced,peeks]);
 useEffect(()=>()=>window.clearTimeout(resetBubble.current),[]);
 const peekGift=()=>{if(opening)return;setPeek(true);window.setTimeout(()=>setPeek(false),900);burstConfetti(gift.current,18);setBubble(PEEKS[Math.min(peeks,PEEKS.length-1)]);setPeeks(p=>p+1);window.clearTimeout(resetBubble.current);resetBubble.current=window.setTimeout(()=>setBubble(GREETING),3200)};
 const open=()=>{if(opening)return;setOpening(true);burstConfetti(openButton.current,80);burstConfetti(gift.current,30);onOpen()};
 return <div className={`invitation welcome${opening?' is-opening':''}`}>
  <div className="welcome-card">
   <span className="welcome-twinkle welcome-twinkle--1" aria-hidden="true">✦</span><span className="welcome-twinkle welcome-twinkle--2" aria-hidden="true">✦</span><span className="welcome-twinkle welcome-twinkle--3" aria-hidden="true">✦</span>
   <button type="button" ref={gift} className={`welcome-gift${peek?' is-peek':''}${opening?' is-open':''}`} onClick={peekGift} disabled={opening} aria-label="Peek at the gift"><svg viewBox="0 0 100 100" aria-hidden="true"><g className="gift-body"><rect x="18" y="48" width="64" height="42" rx="7" fill="#f6c7d3"/><rect x="18" y="48" width="64" height="9" fill="#efb3c3"/><rect x="45" y="48" width="10" height="42" fill="#f3d29a"/></g><ellipse className="gift-glow" cx="50" cy="47" rx="30" ry="9" fill="#fff3c4"/><g className="gift-lid"><rect x="12" y="36" width="76" height="15" rx="5" fill="#f9dbe3"/><rect x="45" y="36" width="10" height="15" fill="#f3d29a"/><path d="M50 36C38 16 20 24 40 36Z" fill="#f3d29a"/><path d="M50 36C62 16 80 24 60 36Z" fill="#f3d29a"/><circle cx="50" cy="35" r="5" fill="#e8b96f"/></g></svg></button>
   <div className="welcome-teddy w-in" style={delay(0)}><BirthdaySticker variant="wave" size={64}/><p className="welcome-bubble"><span aria-hidden="true">{chars.slice(0,typed).join('')}</span><span className="welcome-caret" aria-hidden="true"/><span className="sr-only">{bubble}</span></p></div>
   <span className="welcome-date w-in" style={delay(250)}>{isToday?'Today · ':''}{birthdayLabel(birthday)} · made just for you</span>
   <h1 className="welcome-title" aria-label={`Happy Birthday, ${name}`}><span className="welcome-title__top w-in" style={delay(400)} aria-hidden="true">Happy Birthday,</span><span className="welcome-title__name" aria-hidden="true">{letters.map((ch,i)=><span key={i} className="welcome-letter" style={{'--i':i} as CSSProperties}>{ch}</span>)}<span className="welcome-heart" style={{'--i':letters.length} as CSSProperties}>♡</span></span></h1>
   <p className="welcome-line w-in" style={delay(1300)}>Your birthday surprise is waiting inside. Come, let’s open it together.</p>
   <button type="button" ref={openButton} className="primary-button welcome-open" style={delay(1500)} onClick={open} disabled={opening}><Gift size={18} className="welcome-open__icon"/> {opening?'Opening…':'Open your surprise'}</button>
   {!muted&&<p className="welcome-sound w-in" style={delay(1700)}><span className="welcome-eq" aria-hidden="true"><i/><i/><i/></span> Sound on, there’s music inside</p>}
   <button type="button" className="text-button welcome-peek w-in" style={delay(1850)} data-inspect-entry="freeLook" onClick={onLookAround} disabled={opening}><Eye size={16}/> Peek around the room first</button>
  </div>
 </div>;
}
