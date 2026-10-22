'use client';
import {useEffect,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {RotateCcw} from 'lucide-react';
import type confettiType from 'canvas-confetti';
import BirthdayDate from './BirthdayDate';
import {BirthdayCompanion} from './BirthdaySticker';
import {floatHearts} from './celebrate';
import {birthdayLabel,type PersonalContent} from '@/lib/world/content';
import type {Soundscape} from '@/lib/world/audio';

type Fire=ReturnType<typeof confettiType.create>;
type Shape=ReturnType<typeof confettiType.shapeFromText>;
type Stats={usedMic:boolean;loveTaps:number;hugAccepted:boolean;letterSkipped:boolean};
type Stage='achievements'|'finale'|'blast'|'name'|'goodbye'|'bye';
type Props={content:PersonalContent;reduced:boolean;stats:Stats;sound:Soundscape|null;onSoft:(soft:boolean)=>void;onPause:(paused:boolean)=>void;onReplay:()=>void};

const HOLD_MAX=5000,RING=2*Math.PI*62;
const COLORS=['#f6b8c6','#f9d77e','#c9b3dc','#bfe0c9','#fff1d9','#ef9fb0','#ffffff'];
const TIERS=['Hold me… 🎈','🎈 Cute!','🎉 Party poppers!','🥳 Emoji storm!','🎆 Fireworks!','💥 MAXIMUM BIRTHDAY!'];
const BLAST=['','🎈 A cute little party!','🎉 Party poppers unlocked!','🥳 Emoji storm unlocked!','🎆 Fireworks unlocked!','💥 MAXIMUM BIRTHDAY UNLOCKED!'];
const BLAST_TIME=[0,2600,3400,4400,5600,6400];
const REPLY_TEXT='I opened my birthday surprise 🎂💖';
const EMOJI_FONT='"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
// Google Noto Animated Emoji (CC BY 4.0), served by Google's font CDN. Falls back to a plain emoji if it cannot load.
const ANIMATED={party:{code:'1f389',char:'🎉'},partying:{code:'1f973',char:'🥳'},cake:{code:'1f382',char:'🎂'},balloon:{code:'1f388',char:'🎈'},heart:{code:'1f496',char:'💖'},starstruck:{code:'1f929',char:'🤩'},wave:{code:'1f44b',char:'👋'}} as const;
type EmojiKey=keyof typeof ANIMATED;
const BLAST_SETS:EmojiKey[][]=[['party'],['party'],['party','heart'],['partying','cake','balloon','heart'],['partying','cake','balloon','heart'],['starstruck','partying','cake','balloon','heart']];
const noto=(code:string)=>`https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.webp`;

function AnimatedEmoji({name,size=96,className=''}:{name:EmojiKey;size?:number;className?:string}){
  const [failed,setFailed]=useState(false);const e=ANIMATED[name];
  if(failed)return <span className={`anim-emoji ${className}`} style={{fontSize:size*.8,width:size,height:size}} aria-hidden="true">{e.char}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`anim-emoji ${className}`} src={noto(e.code)} width={size} height={size} alt="" aria-hidden="true" draggable={false} onError={()=>setFailed(true)}/>;
}

function achievementsFor(s:Stats){return [
  {icon:'🚪',text:'Opened the door to your surprise'},
  {icon:'🕯️',text:s.usedMic?'Blew out the candles with a real breath!':'Blew out the candles with a tap… we’ll allow it 😌'},
  s.loveTaps>0?{icon:'💖',text:`Sent love to the garden ×${s.loveTaps}`}:{icon:'🌷',text:'Found the secret garden'},
  {icon:'🧸',text:'Adopted a teddy'},
  {icon:'💌',text:s.letterSkipped?'Speed-read the letter… we saw that 👀':'Read the whole letter'},
  {icon:'🤗',text:s.hugAccepted?'Accepted the hug (the kitten is very proud)':'Hug delivered anyway 😼'},
]}

export default function EndingExperience({content,reduced,stats,sound,onSoft,onPause,onReplay}:Props){
  const list=achievementsFor(stats);
  const [stage,setStage]=useState<Stage>('achievements');
  const [count,setCount]=useState(reduced?list.length+1:0);
  const [tier,setTier]=useState(0);
  const [power,setPower]=useState(0);
  const [holding,setHolding]=useState(false);
  const [flash,setFlash]=useState(false);
  const [dateT,setDateT]=useState(0);
  const [goodbye,setGoodbye]=useState(0);
  const [ps,setPs]=useState(false);
  const [saving,setSaving]=useState(false);
  const canvasRef=useRef<HTMLCanvasElement>(null),ringRef=useRef<SVGCircleElement>(null),holdButton=useRef<HTMLButtonElement>(null);
  const fire=useRef<Fire|null>(null),shapes=useRef<Shape[]>([]),holdStart=useRef(0),holdRaf=useRef(0),tierRef=useRef(0),launched=useRef(false),timers=useRef<number[]>([]);
  const softRef=useRef(onSoft),pauseRef=useRef(onPause);
  useEffect(()=>{softRef.current=onSoft;pauseRef.current=onPause});
  const later=(fn:()=>void,ms:number)=>{timers.current.push(window.setTimeout(fn,ms))};

  // Load confetti, warm up the animated emojis, and pause the static 3D scene behind the ending.
  useEffect(()=>{
    let cancelled=false;
    void import('canvas-confetti').then(mod=>{
      if(cancelled||!canvasRef.current)return;
      const confetti=mod.default;
      fire.current=confetti.create(canvasRef.current,{resize:true,useWorker:false,disableForReducedMotion:true});
      shapes.current=['🎂','🎈','💖','🥳','✨','🎉'].map(text=>confetti.shapeFromText({text,scalar:2.4}));
    }).catch(()=>{});
    Object.values(ANIMATED).forEach(e=>{const img=new Image();img.src=noto(e.code)});
    const pause=window.setTimeout(()=>pauseRef.current(true),1500);
    return()=>{cancelled=true;window.clearTimeout(pause);timers.current.forEach(t=>window.clearTimeout(t));timers.current=[];cancelAnimationFrame(holdRaf.current);fire.current?.reset();fire.current=null;pauseRef.current(false);softRef.current(false)};
  },[]);

  // Act 1: achievements pop in one by one, then the trophy.
  useEffect(()=>{
    if(stage!=='achievements')return;
    if(count>list.length){const t=window.setTimeout(()=>setStage('finale'),2200);return()=>window.clearTimeout(t)}
    const t=window.setTimeout(()=>{const next=count+1;setCount(next);if(next>list.length){sound?.sparkle();fire.current?.({particleCount:90,spread:80,origin:{y:.55},colors:COLORS})}else sound?.ding(count)},count===0?600:850);
    return()=>window.clearTimeout(t);
  },[stage,count,list.length,sound]);

  // Act 2: hold up to 5 seconds. Every second unlocks a bigger party.
  const buttonOrigin=()=>{const b=holdButton.current?.getBoundingClientRect();return b?{x:(b.left+b.width/2)/innerWidth,y:(b.top+b.height/2)/innerHeight}:{x:.5,y:.7}};
  const setRing=(p:number)=>{const c=ringRef.current;if(c)c.style.strokeDashoffset=String(RING*(1-p))};
  const puff=(n:number)=>{fire.current?.({particleCount:10+n*8,spread:50+n*12,startVelocity:22+n*4,scalar:1.6,ticks:90,origin:buttonOrigin(),shapes:shapes.current.length?shapes.current:undefined})};

  const celebrate=(level:number)=>{
    const f=fire.current,s=shapes.current;
    f?.({particleCount:120,spread:100,startVelocity:45,origin:buttonOrigin(),colors:COLORS,scalar:1.1});sound?.sparkle();
    if(level>=2)[0,280].forEach(d=>later(()=>{f?.({particleCount:110,angle:60,spread:55,startVelocity:75,origin:{x:0,y:1},colors:COLORS});f?.({particleCount:110,angle:120,spread:55,startVelocity:75,origin:{x:1,y:1},colors:COLORS});sound?.popper()},d));
    if(level>=3&&s.length)for(let i=0;i<14;i++)later(()=>f?.({particleCount:4,angle:270,spread:40,startVelocity:12,gravity:.9,ticks:260,scalar:2.4,shapes:s,origin:{x:Math.random(),y:-.1}}),500+i*170);
    if(level>=4){sound?.finale();for(let i=0;i<12;i++)later(()=>{f?.({particleCount:45,spread:360,startVelocity:28,ticks:70,gravity:.7,origin:{x:.12+Math.random()*.76,y:.12+Math.random()*.35},colors:COLORS});sound?.pop()},700+i*300)}
    if(level>=5){if(!reduced){setFlash(true);later(()=>setFlash(false),260)}navigator.vibrate?.([60,40,120]);const end=performance.now()+4900;const cannon=()=>{f?.({particleCount:4,angle:60,spread:60,startVelocity:60,origin:{x:0,y:.75},colors:COLORS});f?.({particleCount:4,angle:120,spread:60,startVelocity:60,origin:{x:1,y:.75},colors:COLORS});if(performance.now()<end)later(cannon,80)};later(cannon,900)}
    later(()=>setStage('name'),BLAST_TIME[level]);
  };

  const release=(fromKeyboard=false)=>{
    if(launched.current)return;launched.current=true;
    cancelAnimationFrame(holdRaf.current);holdRaf.current=0;setHolding(false);
    const level=fromKeyboard?3:Math.max(1,tierRef.current);
    setPower(level);setRing(1);setStage('blast');celebrate(level);
  };

  const startHold=(e:ReactPointerEvent<HTMLButtonElement>)=>{
    if(launched.current||holdRaf.current)return;
    try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
    setHolding(true);holdStart.current=performance.now();tierRef.current=0;
    const step=()=>{
      const p=Math.min(1,(performance.now()-holdStart.current)/HOLD_MAX);setRing(p);
      const t=Math.min(5,Math.floor(p*5+1e-6));
      if(t>tierRef.current){tierRef.current=t;setTier(t);sound?.ding(t);puff(t);navigator.vibrate?.(20+t*10)}
      if(p>=1){release();return}
      holdRaf.current=requestAnimationFrame(step);
    };
    holdRaf.current=requestAnimationFrame(step);
  };
  const letGo=()=>{if(holdRaf.current)release()};

  // Her name written by the existing birthday particles.
  useEffect(()=>{if(stage!=='name')return;const start=performance.now(),id=window.setInterval(()=>setDateT((performance.now()-start)/1000),150),end=window.setTimeout(()=>setStage('goodbye'),10500);return()=>{window.clearInterval(id);window.clearTimeout(end)}},[stage]);

  // Act 3: soft goodbye lines, then the final goodbye card.
  useEffect(()=>{if(stage!=='goodbye')return;softRef.current(true);floatHearts(16);const start=performance.now(),id=window.setInterval(()=>setGoodbye((performance.now()-start)/1000),250),end=window.setTimeout(()=>setStage('bye'),10000);return()=>{window.clearInterval(id);window.clearTimeout(end)}},[stage]);
  useEffect(()=>{if(stage!=='bye')return;fire.current?.({particleCount:70,spread:90,origin:{y:.75},colors:COLORS});const t=window.setTimeout(()=>setPs(true),4000);return()=>window.clearTimeout(t)},[stage]);

  const saveKeepsake=async()=>{
    setSaving(true);
    try{
      const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d')!;
      const bg=x.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,'#fbe3e6');bg.addColorStop(.55,'#fff6ec');bg.addColorStop(1,'#f6dcc4');x.fillStyle=bg;x.fillRect(0,0,1080,1350);
      x.strokeStyle='#d9b38c';x.lineWidth=3;x.strokeRect(50,50,980,1250);x.strokeStyle='#e9c7cf';x.lineWidth=2;x.strokeRect(66,66,948,1218);
      x.textAlign='center';x.fillStyle='#b07a86';x.font='28px Georgia';x.fillText(birthdayLabel(content.birthday).toUpperCase(),540,170);
      x.fillStyle='#c99a5b';x.font='italic 84px Georgia';x.fillText('Happy Birthday',540,290);
      x.fillStyle='#7d4a58';x.font='bold 130px Georgia';x.fillText(content.recipientName,540,430,900);
      x.font=`72px ${EMOJI_FONT}`;x.fillText('🎂',540,540);
      x.fillStyle='#8a5a66';x.font='30px Georgia';x.fillText('BIRTHDAY ACHIEVEMENTS',540,640);
      x.textAlign='left';x.font='32px Georgia';list.forEach((a,i)=>x.fillText(`${a.icon}  ${a.text}`,150,715+i*68,800));
      x.fillText(`⭐  Birthday power: ${power}/5`,150,715+list.length*68,800);
      x.textAlign='center';x.fillStyle='#b07a86';x.font='italic 34px Georgia';x.fillText('Made with love, just for you ♡',540,1240);
      const blob=await new Promise<Blob|null>(r=>c.toBlob(r,'image/png'));if(!blob)return;
      const file=new File([blob],`${content.recipientName}-birthday.png`,{type:'image/png'});
      if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'My birthday surprise'}).catch(()=>{});return}
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),2000);
    }finally{setSaving(false)}
  };

  const lineIndex=goodbye<3.3?0:goodbye<6.6?1:2;
  const buttonEmoji:EmojiKey=tier>=5?'starstruck':tier>=3?'partying':'party';

  return <div className="ending-stage" data-stage={stage} style={{'--charge':stage==='finale'?tier/5:0} as CSSProperties}>
    {stage==='name'&&<BirthdayDate label="Happy Birthday" name={content.recipientName} elapsed={dateT} reduced={reduced}/>}
    <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true"/>

    {stage==='achievements'&&<div className="achievements" role="status">
      <p className="achievements-title">Birthday achievements unlocked</p>
      <ul>{list.slice(0,count).map((a,i)=><li key={i} className="achievement"><span className="achievement-icon" aria-hidden="true">{a.icon}</span><span>{a.text}</span></li>)}</ul>
      {count>list.length&&<div className="achievement achievement--trophy">🏆 Birthday: 100% complete</div>}
      {count<=list.length&&<button type="button" className="text-button achievements-skip" onClick={()=>setCount(list.length+1)}>Skip</button>}
    </div>}

    {stage==='finale'&&<div className="finale-prompt">
      <BirthdayCompanion variant="gift" size={68} message="Last surprise! The longer you hold, the bigger the party 👀"/>
      <button type="button" ref={holdButton} className={`power-button${holding?' is-holding':''}`} data-tier={tier} aria-label="Hold for up to 5 seconds to start the party" onPointerDown={startHold} onPointerUp={letGo} onPointerCancel={letGo} onLostPointerCapture={letGo} onContextMenu={e=>e.preventDefault()} onClick={e=>{if(e.detail===0)release(true)}}>
        <svg className="power-ring" viewBox="0 0 140 140" aria-hidden="true"><circle className="power-ring__track" cx="70" cy="70" r="62"/><circle ref={ringRef} className="power-ring__fill" cx="70" cy="70" r="62" style={{strokeDasharray:RING,strokeDashoffset:RING}}/></svg>
        <AnimatedEmoji key={buttonEmoji} name={buttonEmoji} size={72} className="power-emoji"/>
      </button>
      <p className="power-label" aria-live="polite">{TIERS[tier]}</p>
      <div className="power-steps" aria-hidden="true">{[1,2,3,4,5].map(n=><span key={n} className={tier>=n?'is-on':''}/>)}</div>
      <p className="power-hint">{holding?'Keep holding… or let go now!':'Hold up to 5 seconds, let go anytime 🎈'}</p>
    </div>}

    {stage==='blast'&&<div className="blast" role="status">
      <div className="blast-emojis">{BLAST_SETS[power].map(n=><AnimatedEmoji key={n} name={n} size={power>=3?84:120} className="blast-emoji"/>)}</div>
      <p className="blast-title">{BLAST[power]}</p>
      <p className="blast-power">Birthday power: {power}/5 {'⭐'.repeat(power)}</p>
    </div>}
    {flash&&<div className="blast-flash" aria-hidden="true"/>}

    {stage==='goodbye'&&<div className="interaction ending goodbye"><div className="ending-message ending-line" key={lineIndex}><BirthdayCompanion variant={lineIndex===0?'wave':lineIndex===1?'heart':'clap'} size={100} message={lineIndex===0?'Thank you for coming, birthday girl…':lineIndex===1?'You make every day a little sweeter 💗':`Happy Birthday, ${content.recipientName}! 🎂`} celebrate={lineIndex===2}/><h2>{content.ending[lineIndex]}</h2></div></div>}

    {stage==='bye'&&<div className="bye-wrap"><div className="bye-card">
      <AnimatedEmoji name="wave" size={96}/>
      <p className="bye-meta">{birthdayLabel(content.birthday)} · Birthday power {power}/5</p>
      <h2>Bye-bye for now, birthday girl 💗</h2>
      <p className="bye-sub">Happy Birthday, {content.recipientName} 🎂 See you on your next birthday ✨</p>
      <div className="ending-actions">
        <a className="primary-button" href={`https://wa.me/?text=${encodeURIComponent(REPLY_TEXT)}`} target="_blank" rel="noopener noreferrer">💬 Send a reply</a>
        <button type="button" className="secondary-button" onClick={()=>void saveKeepsake()} disabled={saving}>{saving?'Saving…':'📸 Save a keepsake'}</button>
      </div>
      <button type="button" className="text-button ending-replay" onClick={onReplay}><RotateCcw size={14}/> Watch again</button>
      {ps&&<p className="ending-ps">P.S. The kitten says you owe him a hug back. 🐱</p>}
    </div></div>}
  </div>;
}
