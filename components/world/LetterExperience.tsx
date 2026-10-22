'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,type CSSProperties,type KeyboardEvent,type RefObject} from 'react';
import {MoveRight} from 'lucide-react';
import {BirthdayCompanion} from './BirthdaySticker';
import {burstConfetti,floatHearts} from './celebrate';
import type {PersonalContent} from '@/lib/world/content';

const HUG_END='(if you’d like).';
const writeTime=(text:string)=>Math.min(2600,Math.max(900,text.length*16));
const PETALS:[number,number,number][]=[[6,0,11],[14,3.5,13],[23,1.2,10],[31,6,12],[42,2.4,14],[51,8,11],[59,.6,13],[67,4.8,10],[74,2,12],[82,7,14],[89,3,11],[95,5.5,13]];
type Stage='envelope'|'opening'|'letter'|'closing';
type Props={content:PersonalContent;reduced:boolean;dialogRef:RefObject<HTMLDivElement|null>;onKeyDown:(e:KeyboardEvent)=>void;onOpen:()=>void;onHug:()=>void;onSkip?:()=>void;onFinish:()=>void};

export default function LetterExperience({content,reduced,dialogRef,onKeyDown,onOpen,onHug,onSkip,onFinish:finish}:Props){
  const paragraphs=content.letter.paragraphs;
  const hugIndex=paragraphs.findIndex(p=>p.trim().endsWith(HUG_END));
  const [stage,setStage]=useState<Stage>(reduced?'letter':'envelope');
  const [shown,setShown]=useState(reduced?paragraphs.length:0);
  const [hugged,setHugged]=useState(false);
  const [signed,setSigned]=useState(reduced);
  const [instant,setInstant]=useState(reduced);
  const panel=useRef<HTMLDivElement>(null),seal=useRef<HTMLSpanElement>(null),hugButton=useRef<HTMLButtonElement>(null),stick=useRef(true),touchY=useRef(0);
  const allShown=shown>=paragraphs.length;
  const waitingForHug=hugIndex>=0&&shown===hugIndex+1&&!hugged&&!instant;
  useEffect(()=>{if(stage!=='letter'||allShown||waitingForHug)return;const wait=shown===0?450:shown===hugIndex+1?900:writeTime(paragraphs[shown-1])+250;const t=window.setTimeout(()=>setShown(n=>n+1),wait);return()=>window.clearTimeout(t)},[stage,shown,allShown,waitingForHug,hugIndex,paragraphs]);
  useEffect(()=>{if(!waitingForHug)return;const t=window.setTimeout(()=>setHugged(true),12000);return()=>window.clearTimeout(t)},[waitingForHug]);
  useEffect(()=>{if(stage!=='letter'||!allShown||signed)return;const t=window.setTimeout(()=>setSigned(true),writeTime(paragraphs[paragraphs.length-1]??'')+200);return()=>window.clearTimeout(t)},[stage,allShown,signed,paragraphs]);
  useEffect(()=>{const el=panel.current;if(!el||!stick.current||instant)return;const id=requestAnimationFrame(()=>el.scrollTo({top:el.scrollHeight,behavior:'smooth'}));return()=>cancelAnimationFrame(id)},[shown,hugged,signed,instant]);
  const openEnvelope=()=>{if(stage!=='envelope')return;setStage('opening');onOpen();burstConfetti(seal.current,36);window.setTimeout(()=>setStage('letter'),1500)};
  const acceptHug=()=>{if(hugged)return;setHugged(true);burstConfetti(hugButton.current,50);floatHearts(28);onHug()};
  const skip=()=>{setInstant(true);setShown(paragraphs.length);setSigned(true);onSkip?.()};
  const onFinish=()=>{if(stage==='closing')return;if(reduced){finish();return}setStage('closing');window.setTimeout(finish,1900)};
  return <div className="letter-stage" data-stage={stage} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`A birthday letter for ${content.recipientName}`} onKeyDown={onKeyDown}>
    {!reduced&&<div className="letter-petals" aria-hidden="true">{PETALS.map(([left,delay,dur],i)=><span key={i} style={{left:`${left}%`,animationDelay:`${delay}s`,animationDuration:`${dur}s`}}/>)}</div>}
    {stage!=='letter'?<div className="envelope-wrap"><button type="button" className="envelope" onClick={openEnvelope} aria-label="Open your letter" disabled={stage!=='envelope'}><span className="envelope-back"/><span className="envelope-paper"><em>for</em> {content.recipientName}</span><span className="envelope-front"/><span className="envelope-flap"/><span className="envelope-seal" ref={seal}>{stage==='closing'?'♡':content.recipientName.charAt(0).toUpperCase()}</span></button><p className="envelope-hint">{stage==='opening'?'Opening…':stage==='closing'?'Saved forever 💌':'Someone left you a letter. Tap the seal to open it 💌'}</p></div>:
    <div className="letter-panel" ref={panel} onWheel={e=>{if(e.deltaY<0)stick.current=false}} onTouchStart={e=>{touchY.current=e.touches[0].clientY}} onTouchMove={e=>{if(e.touches[0].clientY>touchY.current+6)stick.current=false}} onScroll={e=>{const el=e.currentTarget;if(el.scrollHeight-el.scrollTop-el.clientHeight<40)stick.current=true}}><div className="letter-greeting"><BirthdayCompanion variant="heart" size={80} message="Okay… this part is straight from the heart 💌" celebrate/></div><h2 id="birthday-letter-heading">{content.letter.title}</h2>{paragraphs.map((p,i)=>i<shown?<div key={i}><p className={instant?'letter-line':'letter-line is-writing'} style={{'--write':`${writeTime(p)}ms`} as CSSProperties}>{p}</p>{i===hugIndex&&<div className="hug-moment" style={{animationDelay:instant?'0ms':`${writeTime(p)}ms`}}><Image className="letter-hug-sticker" src={reduced?'/stickers/birthday-hug-still.webp':'/stickers/birthday-hug.gif'} alt="A little birthday hug from a kitten" width={136} height={136} loading="eager" unoptimized/>{hugged?<p className="hug-done">Hug delivered ✅</p>:<button type="button" ref={hugButton} className="primary-button hug-button" onClick={acceptHug}>🤗 Accept hug</button>}</div>}</div>:null)}{signed&&<p className={instant?'signature letter-signature':'signature letter-signature is-signing'}>{content.letter.signature} <span aria-hidden="true">♡</span></p>}{signed?<button type="button" className="text-button letter-continue" style={{animationDelay:instant?'0ms':'1.6s'}} onClick={onFinish}>Continue to your birthday wishes <MoveRight size={16}/></button>:<button type="button" className="letter-skip" onClick={skip}>Show the whole letter</button>}</div>}
  </div>;
}
