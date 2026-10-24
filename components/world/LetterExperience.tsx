'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,type CSSProperties,type KeyboardEvent,type MouseEvent as ReactMouseEvent,type RefObject} from 'react';
import {MoveRight} from 'lucide-react';
import {BirthdayCompanion} from './BirthdaySticker';
import {burstConfetti,floatHearts} from './celebrate';
import type {PersonalContent} from '@/lib/world/content';

const HUG_END='(if you’d like).';
const writeTime=(text:string)=>Math.min(2600,Math.max(900,text.length*16));
const PETALS:[number,number,number][]=[[6,0,11],[14,3.5,13],[23,1.2,10],[31,6,12],[42,2.4,14],[51,8,11],[59,.6,13],[67,4.8,10],[74,2,12],[82,7,14],[89,3,11],[95,5.5,13]];
type Stage='envelope'|'opening'|'letter'|'closing';
type Hug='choose'|'teddy'|'kitten'|'declined';
type Props={content:PersonalContent;reduced:boolean;dialogRef:RefObject<HTMLDivElement|null>;onKeyDown:(e:KeyboardEvent)=>void;onOpen:()=>void;onHug:()=>void;onSkip?:()=>void;onFinish:()=>void;onHugChoice?:(choice:'teddy'|'kitten'|'declined')=>void};

export default function LetterExperience({content,reduced,dialogRef,onKeyDown,onOpen,onHug,onSkip,onFinish:finish,onHugChoice}:Props){
  const paragraphs=content.letter.paragraphs;
  const hugAt=paragraphs.findIndex(p=>p.trim().endsWith(HUG_END));
  const kittenStill='/stickers/birthday-hug-still.webp';
  const hugImage=(name:string)=>`/stickers/${name}${reduced?'-still':''}.webp`;
  const [stage,setStage]=useState<Stage>(reduced?'letter':'envelope');
  const [shown,setShown]=useState(reduced?paragraphs.length:0),[ready,setReady]=useState(reduced),[hug,setHug]=useState<Hug>('choose'),[squeeze,setSqueeze]=useState(0),[signed,setSigned]=useState(reduced),[instant,setInstant]=useState(reduced);
  const panel=useRef<HTMLDivElement>(null),seal=useRef<HTMLSpanElement>(null),stick=useRef(true),touchY=useRef(0),hugSent=useRef(false);
  const allShown=shown>=paragraphs.length,hugBlocks=hugAt>=0&&shown===hugAt+1&&hug==='choose',canNext=stage==='letter'&&ready&&!allShown&&!hugBlocks&&!instant;
  useEffect(()=>{if(stage!=='letter'||shown>0)return;const t=window.setTimeout(()=>setShown(1),450);return()=>window.clearTimeout(t)},[stage,shown]);
  useEffect(()=>{if(stage!=='letter'||shown===0||instant||ready)return;const atHug=shown===hugAt+1,wait=atHug&&hug!=='choose'?1400:writeTime(paragraphs[shown-1]??'')+(atHug?1300:600);const t=window.setTimeout(()=>setReady(true),wait);return()=>window.clearTimeout(t)},[stage,shown,instant,ready,hug,hugAt,paragraphs]);
  useEffect(()=>{if(stage!=='letter'||!allShown||signed)return;const t=window.setTimeout(()=>setSigned(true),writeTime(paragraphs[paragraphs.length-1]??'')+200);return()=>window.clearTimeout(t)},[stage,allShown,signed,paragraphs]);
  useEffect(()=>{const el=panel.current;if(!el||!stick.current||instant)return;const id=requestAnimationFrame(()=>el.scrollTo({top:el.scrollHeight,behavior:'smooth'}));return()=>cancelAnimationFrame(id)},[shown,hug,ready,signed,instant]);
  const openEnvelope=()=>{if(stage!=='envelope')return;setStage('opening');onOpen();burstConfetti(seal.current,36);window.setTimeout(()=>setStage('letter'),1500)};
  const next=()=>{if(!canNext)return;stick.current=true;setReady(false);setShown(n=>n+1)};
  const panelClick=(e:ReactMouseEvent<HTMLDivElement>)=>{if((e.target as HTMLElement).closest('button,a'))return;next()};
  const keyDown=(e:KeyboardEvent)=>{if(canNext&&[' ','Enter','ArrowDown'].includes(e.key)&&!(e.target as HTMLElement).closest('button,a')){e.preventDefault();next();return}onKeyDown(e)};
  const deliver=(who:'teddy'|'kitten')=>{if(hug!=='choose')return;setHug(who);onHugChoice?.(who);if(who==='teddy')setSqueeze(n=>n+1);else if(!reduced)floatHearts(28);if(shown===hugAt+1)setReady(false);if(!hugSent.current){hugSent.current=true;onHug()}};
  const decline=()=>{if(hug!=='choose')return;setHug('declined');onHugChoice?.('declined');if(shown===hugAt+1)setReady(false)};
  const skip=()=>{setInstant(true);setShown(paragraphs.length);setSigned(true);onSkip?.()};
  const onFinish=()=>{if(stage==='closing')return;if(reduced){finish();return}setStage('closing');window.setTimeout(finish,1900)};
  const hugCard=()=> <div className={`hug-card is-${hug}`}>
    {hug==='choose'?<>
      <p className="hug-tag">A little birthday hug</p>
      <p className="hug-ask">Who would you like a hug from?</p>
      <div className="hug-options">
        <button type="button" className="hug-option" onClick={()=>deliver('teddy')}>
          <span className="hug-face"><Image src={hugImage('hug-me')} alt="" width={112} height={112} unoptimized/></span>
          <strong>Me</strong>
        </button>
        <button type="button" className="hug-option" onClick={()=>deliver('kitten')}>
          <span className="hug-face"><Image src={kittenStill} alt="" width={112} height={112} unoptimized/></span>
          <strong>Kitten</strong>
        </button>
      </div>
      <button type="button" className="hug-decline" onClick={decline}>No hugs today</button>
    </>:<div className="hug-result" role="status" key={hug}>
      {hug==='declined'?<>
        <span className="kitten-sulk"><Image className="hug-kitten is-offended" src={kittenStill} alt="A kitten turning away, offended" width={150} height={150} unoptimized/><span className="sulk-mark" aria-hidden="true">💢</span><span className="sulk-bubble" aria-hidden="true">Hmph.</span><span className="sulk-puff" aria-hidden="true">💨</span></span>
        <p className="hug-line">The kitten is offended… but respects your boundaries 😼</p>
      </>:<>
        <Image className="hug-memory" src={hugImage(hug==='teddy'?'hug-together':'hug-kitten')} alt={hug==='teddy'?'An illustrated couple sharing a warm hug':'A delighted cat celebrating your hug'} width={341} height={341} loading="eager" unoptimized/>
        <p className="hug-line">{hug==='teddy'?'Thank you for the hug. This one means a little extra. 💗':'One very happy kitten, sending a little birthday joy your way. 🐾'}</p>
      </>}
    </div>}
  </div>;
  return <div className="letter-stage" data-stage={stage} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`A birthday letter for ${content.recipientName}`} onKeyDown={keyDown}>
    {!reduced&&<div className="letter-petals" aria-hidden="true">{PETALS.map(([left,delay,dur],i)=><span key={i} style={{left:`${left}%`,animationDelay:`${delay}s`,animationDuration:`${dur}s`}}/>)}</div>}{squeeze>0&&!reduced&&<div key={squeeze} className="hug-squeeze" aria-hidden="true"/>}
    {stage!=='letter'?<div className="envelope-wrap"><button type="button" className="envelope" onClick={openEnvelope} aria-label="Open your letter" disabled={stage!=='envelope'}><span className="envelope-back"/><span className="envelope-paper"><em>for</em> {content.recipientName}</span><span className="envelope-front"/><span className="envelope-flap"/><span className="envelope-seal" ref={seal}>{stage==='closing'?'♡':content.recipientName.charAt(0).toUpperCase()}</span></button><p className="envelope-hint">{stage==='opening'?'Opening…':stage==='closing'?'Saved forever 💌':'Someone left you a letter. Tap the seal to open it 💌'}</p></div>:<div className={`letter-panel${canNext?' can-next':''}`} ref={panel} onClick={panelClick} onWheel={e=>{if(e.deltaY<0)stick.current=false}} onTouchStart={e=>{touchY.current=e.touches[0].clientY}} onTouchMove={e=>{if(e.touches[0].clientY>touchY.current+6)stick.current=false}} onScroll={e=>{const el=e.currentTarget;if(el.scrollHeight-el.scrollTop-el.clientHeight<40)stick.current=true}}><div className="letter-greeting"><BirthdayCompanion variant="heart" size={80} message="Okay… this part is straight from the heart 💌" celebrate/></div><h2 id="birthday-letter-heading">{content.letter.title}</h2>{paragraphs.map((p,i)=>i<shown?<div key={i}><p className={`letter-line${instant?'':' is-writing'}${!allShown&&i<shown-1?' is-past':''}`} style={{'--write':`${writeTime(p)}ms`} as CSSProperties}>{p}</p>{i===hugAt&&hugCard()}</div>:null)}{stage==='letter'&&!allShown&&!instant&&<div className="letter-next" aria-live="polite">{canNext&&<button type="button" className="letter-more" onClick={next}>Keep reading ✦</button>}<span className="letter-dots" aria-hidden="true">{paragraphs.map((_,i)=><i key={i} className={i<shown?'is-on':''}/>)}</span></div>}{signed&&<p className={instant?'signature letter-signature':'signature letter-signature is-signing'}>{content.letter.signature} <span aria-hidden="true">♡</span></p>}{signed?<button type="button" className="text-button letter-continue" style={{animationDelay:instant?'0ms':'1.6s'}} onClick={onFinish}>Continue to your birthday wishes <MoveRight size={16}/></button>:<button type="button" className="letter-skip" onClick={skip}>Show the whole letter</button>}</div>}
  </div>;
}
