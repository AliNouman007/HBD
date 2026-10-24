'use client';
import {useEffect,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {MoveRight,RotateCcw} from 'lucide-react';
import type confettiType from 'canvas-confetti';
import BalloonName from './BalloonName';
import {BirthdayCompanion} from './BirthdaySticker';
import {floatHearts} from './celebrate';
import {birthdayLabel,type PersonalContent} from '@/lib/world/content';
import type {Soundscape} from '@/lib/world/audio';

type Fire=ReturnType<typeof confettiType.create>;
type Shape=ReturnType<typeof confettiType.shapeFromText>;
type HugChoice='teddy'|'kitten'|'both'|'declined';
// loveTaps = number of courtyard stars collected.
type Stats={usedMic:boolean;loveTaps:number;hugAccepted:boolean;letterSkipped:boolean;hugChoice?:HugChoice|null};
const TILTS=[-4,3,-2,4,-3,2];
const TONES=['linear-gradient(135deg,#fde2e4,#fbd3c9)','linear-gradient(135deg,#fff1c9,#fde2b8)','linear-gradient(135deg,#e6dcf5,#d7c8ee)','linear-gradient(135deg,#dff1e6,#cbe8d6)','linear-gradient(135deg,#fde7ef,#f7c9d8)','linear-gradient(135deg,#fff3e0,#f9dcc1)'];
type Stage='achievements'|'finale'|'blast'|'name'|'goodbye'|'bye';
type Props={content:PersonalContent;reduced:boolean;stats:Stats;sound:Soundscape|null;onSoft:(soft:boolean)=>void;onPause:(paused:boolean)=>void;onReplay:()=>void};

const HOLD_MAX=5000,RING=2*Math.PI*62;
const COLORS=['#f6b8c6','#f9d77e','#c9b3dc','#bfe0c9','#fff1d9','#ef9fb0','#ffffff'];
const TIERS=['Hold me… 🎈','🎈 Ooh, balloons…','🎉 Now poppers…','🥳 A whole party…','🎆 Fireworks?!','💛 Okay, all of it!'];
const BLAST=['','A tiny party, just for you 🎈','Pop pop! This one’s for you 🎉','Now that’s a birthday party! 🥳','The sky is celebrating you 🎆','All of this, just for you 💛'];
const BLAST_TIME=[0,2600,3400,4400,5600,6400];
// WhatsApp number for "Send a reply": digits only, international format, no +, no leading 0, no spaces.
// Example: 0300 1234567 → '923001234567'. While empty, the button falls back to the general WhatsApp share.
const REPLY_NUMBER='923427745746';
const REPLY_TEXT='I just finished my birthday surprise 🎂✨';
// The wish printed on the keepsake card. Edit freely.
const CARD_WISH='May this year be gentle with you, generous with joy, and full of little adventures.';
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

// Wraps centred text onto multiple lines.
function wrapText(x:CanvasRenderingContext2D,text:string,cx:number,y:number,max:number,lh:number){const words=text.split(' ');let line='',yy=y;for(const w of words){const t=line?`${line} ${w}`:w;if(x.measureText(t).width>max&&line){x.fillText(line,cx,yy);line=w;yy+=lh}else line=t}if(line)x.fillText(line,cx,yy)}
// The keepsake: a 1080×1350 "night star" birthday card with the courtyard heart of five stars.
async function drawCard(name:string,date:string,signature:string){
  await document.fonts?.ready;
  const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');if(!x)return null;
  const serif='Georgia,"Times New Roman",serif';
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#24142b');bg.addColorStop(1,'#4a2a3d');x.fillStyle=bg;x.fillRect(0,0,W,H);
  const glow=x.createRadialGradient(W/2,330,20,W/2,330,560);glow.addColorStop(0,'#ffd98a40');glow.addColorStop(1,'#ffd98a00');x.fillStyle=glow;x.fillRect(0,0,W,H);
  x.fillStyle='#fff3d7';for(let i=0;i<70;i++){x.globalAlpha=.2+(i%5)*.12;x.beginPath();x.arc((i*197+83)%W,(i*311+47)%H,(i%3)*.8+1,0,Math.PI*2);x.fill()}x.globalAlpha=1;
  const frame=(m:number,a:number)=>{x.globalAlpha=a;x.strokeStyle='#e9c98a';x.lineWidth=2;x.beginPath();if(typeof x.roundRect==='function')x.roundRect(m,m,W-m*2,H-m*2,28);else x.rect(m,m,W-m*2,H-m*2);x.stroke();x.globalAlpha=1};frame(48,.75);frame(64,.3);
  const star=(cx:number,cy:number,r:number)=>{x.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rr=k%2?r*.45:r;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.closePath();x.fill()};
  const hx=W/2,hy=330,sc=3;
  x.save();x.translate(hx,hy);x.scale(sc,sc);x.beginPath();x.moveTo(0,-18);x.bezierCurveTo(-8,-34,-40,-30,-40,-8);x.bezierCurveTo(-40,14,-12,26,0,40);x.bezierCurveTo(12,26,40,14,40,-8);x.bezierCurveTo(40,-30,8,-34,0,-18);x.closePath();
  x.fillStyle='#f7b6c61f';x.fill();x.shadowColor='#ffd98a';x.shadowBlur=18;x.strokeStyle='#ffe2a6';x.lineWidth=3/sc;x.stroke();x.restore();
  x.fillStyle='#ffe2a6';x.shadowColor='#ffd98a';x.shadowBlur=24;[[-23,-27],[23,-27],[-40,-8],[40,-8],[0,40]].forEach(([px,py])=>star(hx+px*sc,hy+py*sc,16));x.shadowBlur=0;
  x.textAlign='center';x.textBaseline='alphabetic';
  x.fillStyle='#ffd98a';x.font=`italic 64px ${serif}`;x.fillText('Happy Birthday',W/2,600);
  x.fillStyle='#fff3e5';x.font=`bold 132px ${serif}`;x.fillText(name,W/2,750,900);
  x.globalAlpha=.6;x.strokeStyle='#e9c98a';x.lineWidth=2;x.beginPath();x.moveTo(W/2-150,815);x.lineTo(W/2-24,815);x.moveTo(W/2+24,815);x.lineTo(W/2+150,815);x.stroke();x.globalAlpha=1;x.fillStyle='#ffe2a6';star(W/2,815,10);
  x.fillStyle='#f6e6dc';x.font=`italic 40px ${serif}`;wrapText(x,CARD_WISH,W/2,905,800,60);
  x.fillStyle='#e9c98a';x.font=`600 28px ${serif}`;x.fillText(date.toUpperCase().split('').join('\u2009'),W/2,1165);
  x.globalAlpha=.75;x.fillStyle='#f6e6dc';x.font=`italic 30px ${serif}`;x.fillText(`${signature} ♡`,W/2,1225,860);x.globalAlpha=1;
  return new Promise<Blob|null>(r=>c.toBlob(r,'image/png'));
}

// Polaroids for "Today's little moments". text = front caption, back = note on the back.
function momentsFor(s:Stats){
  const stars=s.loveTaps;
  const hug={teddy:{icon:'🧸',text:'Shared a birthday hug with me',back:'A little moment to keep close 💗'},kitten:{icon:'🐱',text:'Got a birthday hug from the kitten',back:'The kitten is still smiling 🐾'},both:{icon:'🤗',text:'Took both hugs. Fair enough 😄',back:'Teddy and the kitten are rivals now 🧸🐱'},declined:{icon:'😼',text:'Politely declined a hug',back:'The kitten is still recovering 😼'}};
  return [
    {icon:'🚪',text:'You stepped into your birthday room',back:'The fairy lights were waiting just for you ✨'},
    {icon:'🕯️',text:s.usedMic?'Blew out the candles with a real breath 🌬️':'Made a wish (with a tap, we’ll allow it 😌)',back:'Your wish is still a secret. I didn’t peek 🤫'},
    stars>=5?{icon:'⭐',text:'Found all 5 stars & made a heart',back:'If you didn’t open the locket… there’s a secret inside 👀'}:stars>0?{icon:'⭐',text:`Found ${stars} little star${stars>1?'s':''}`,back:'The rest are still out there, glowing for you ✨'}:{icon:'⭐',text:'The stars waited for you anyway',back:'They’re patient. Like me. Mostly 😄'},
    {icon:'🧸',text:'A teddy came home with you',back:'Take good care of him, he’s a little shy 🧸'},
    {icon:'💌',text:s.letterSkipped?'Read your letter (a little fast 👀)':'Read a letter written just for you',back:s.letterSkipped?'Read it slowly someday, okay? 💌':'Every word meant it 💌'},
    s.hugChoice?hug[s.hugChoice]:s.hugAccepted?{icon:'🤗',text:'Got a birthday hug',back:'Officially delivered 🐾'}:{icon:'😼',text:'Hug delivered anyway',back:'You can’t escape a birthday hug 🐾'},
  ];
}

export default function EndingExperience({content,reduced,stats,sound,onSoft,onPause,onReplay}:Props){
  const list=momentsFor(stats);
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
  const [byeStep,setByeStep]=useState<'invite'|'card'|'farewell'>('invite');
  const [cardUrl,setCardUrl]=useState<string|null>(null),[saved,setSaved]=useState(false);
  const cardBlob=useRef<Blob|null>(null),cardUrlRef=useRef<string|null>(null);
  useEffect(()=>()=>{if(cardUrlRef.current)URL.revokeObjectURL(cardUrlRef.current)},[]);
  const [flipped,setFlipped]=useState<number[]>([]);
  const flip=(i:number)=>{setFlipped(f=>f.includes(i)?f.filter(x=>x!==i):[...f,i]);sound?.ding(i)};
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
  // Polaroids drop in one by one. No confetti, and the finale starts only from its button.
  useEffect(()=>{
    if(stage!=='achievements'||count>list.length)return;
    const t=window.setTimeout(()=>{const next=count+1;setCount(next);if(next<=list.length)sound?.ding(count);else sound?.sparkle()},count===0?700:900);
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
  useEffect(()=>{if(stage!=='bye')return;fire.current?.({particleCount:70,spread:90,origin:{y:.75},colors:COLORS})},[stage]);
  useEffect(()=>{if(stage!=='bye'||byeStep!=='farewell'||ps)return;const t=window.setTimeout(()=>setPs(true),2500);return()=>window.clearTimeout(t)},[stage,byeStep,ps]);

  const openCard=async()=>{setByeStep('card');if(cardBlob.current)return;const blob=await drawCard(content.recipientName,birthdayLabel(content.birthday),content.letter.signature);if(!blob)return;cardBlob.current=blob;const url=URL.createObjectURL(blob);cardUrlRef.current=url;setCardUrl(url)};
  const download=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),2000)};
  // iPhone: share sheet → "Save Image" puts it in Photos. Android/desktop: direct download (shows in gallery / Downloads).
  const saveCard=async()=>{const blob=cardBlob.current;if(!blob||saving)return;setSaving(true);try{const name=`${content.recipientName}-birthday-card.png`,file=new File([blob],name,{type:'image/png'});const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(ios&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'My birthday card'});setSaved(true)}catch(e){if((e as Error).name!=='AbortError'){download(blob,name);setSaved(true)}}return}download(blob,name);setSaved(true)}finally{setSaving(false)}};
  const replyHref=REPLY_NUMBER?`https://wa.me/${REPLY_NUMBER}?text=${encodeURIComponent(REPLY_TEXT)}`:`https://wa.me/?text=${encodeURIComponent(REPLY_TEXT)}`;
  const psLine=stats.hugChoice==='kitten'?'P.S. The kitten says he’s available for hugs anytime. Bookings open 🐱':stats.hugChoice==='teddy'?'P.S. Thank you for the hug. I’m keeping that little moment close. 💗':stats.hugChoice==='both'?'P.S. Teddy and the kitten are still arguing over who hugs better 🧸🐱':stats.hugChoice==='declined'?'P.S. The kitten has forgiven you. Mostly. 😼':'P.S. The kitten is still waiting to give you that hug 🐱';

  const lineIndex=goodbye<3.3?0:goodbye<6.6?1:2;
  const buttonEmoji:EmojiKey=tier>=5?'starstruck':tier>=3?'partying':'party';

  return <div className="ending-stage" data-stage={stage} style={{'--charge':stage==='finale'?tier/5:0} as CSSProperties}>
    {stage==='name'&&<BalloonName name={content.recipientName} date={birthdayLabel(content.birthday)} elapsed={dateT} reduced={reduced} onBoop={()=>sound?.pop()}/>}
    <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true"/>

    {stage==='achievements'&&<div className="scrapbook" role="region" aria-label="Today’s little moments"><div className="scrapbook-page"><p className="scrapbook-title">Today’s little moments</p><p className="scrapbook-sub">a few things that happened on your birthday 📸</p><ul className="polaroids">{list.map((m,i)=>i<count?<li key={i} className="polaroid-slot" style={{'--tilt':`${TILTS[i%TILTS.length]}deg`,'--tone':TONES[i%TONES.length]} as CSSProperties}><button type="button" className={`polaroid${flipped.includes(i)?' is-flipped':''}`} onClick={()=>flip(i)} aria-pressed={flipped.includes(i)}><span className="polaroid-face polaroid-front"><span className="polaroid-photo" aria-hidden="true"><span className="polaroid-icon">{m.icon}</span></span><span className="polaroid-caption">{m.text}</span></span><span className="polaroid-face polaroid-back"><span className="polaroid-note">{m.back}</span></span></button></li>:null)}</ul>{count>list.length?<div className="scrapbook-end"><p className="scrapbook-hint">Tap a photo to flip it</p><p className="scrapbook-close">…and the day isn’t over yet 🎈</p><button type="button" className="primary-button scrapbook-next" onClick={()=>setStage('finale')}>One last surprise ✦</button></div>:<button type="button" className="text-button achievements-skip" onClick={()=>setCount(list.length+1)}>Show all</button>}</div></div>}

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
    </div>}
    {flash&&<div className="blast-flash" aria-hidden="true"/>}

    {stage==='goodbye'&&<div className="interaction ending goodbye"><div className="ending-message ending-line" key={lineIndex}><BirthdayCompanion variant={lineIndex===0?'wave':lineIndex===1?'heart':'clap'} size={100} message={lineIndex===0?'Thank you for coming, birthday girl…':lineIndex===1?'You make every day a little sweeter 💗':`Happy Birthday, ${content.recipientName}! 🎂`} celebrate={lineIndex===2}/><h2>{content.ending[lineIndex]}</h2></div></div>}

    {stage==='bye'&&<div className="bye-wrap">
      {byeStep==='invite'&&<div className="bye-card keepsake-invite" key="invite">
        <div className="keepsake-envelope" aria-hidden="true"><span className="keepsake-envelope-flap"/><span className="keepsake-envelope-seal">✦</span></div>
        <p className="bye-meta">Before you go…</p>
        <h2>I made you a little card to keep 💌</h2>
        <p className="bye-sub">Something small from today, for your phone.</p>
        <div className="ending-actions"><button type="button" className="primary-button" onClick={()=>void openCard()}>Open my card ✨</button></div>
        <button type="button" className="text-button keepsake-skip" onClick={()=>setByeStep('farewell')}>Maybe later</button>
      </div>}
      {byeStep==='farewell'&&<div className="bye-card" key="farewell">
        <AnimatedEmoji name="wave" size={96}/>
        <p className="bye-meta">{birthdayLabel(content.birthday)}</p>
        <h2>Bye-bye for now, birthday girl 💗</h2>
        <p className="bye-sub">Happy Birthday, {content.recipientName} 🎂 See you on your next birthday ✨</p>
        <div className="ending-actions"><a className="primary-button" href={replyHref} target="_blank" rel="noopener noreferrer">💬 Send a reply</a></div>
        <div className="bye-links"><button type="button" className="text-button" onClick={()=>void openCard()}>💌 See your card again</button><button type="button" className="text-button ending-replay" onClick={onReplay}><RotateCcw size={14}/> Watch it all again</button></div>
        {ps&&<p className="ending-ps">{psLine}</p>}
      </div>}
    </div>}
    {stage==='bye'&&byeStep==='card'&&<div className="keepsake-overlay" role="dialog" aria-modal="true" aria-label="Your birthday card">
      <div className="keepsake-frame">{cardUrl?<img className="keepsake-img" src={cardUrl} alt={`A birthday card for ${content.recipientName}`}/>:<div className="keepsake-loading">Making your card… ✨</div>}</div>
      <p className="keepsake-tip">On your phone, you can also long-press the card to save it</p>
      <div className="keepsake-actions"><button type="button" className="primary-button" onClick={()=>void saveCard()} disabled={!cardUrl||saving}>{saving?'Saving…':saved?'Saved ✓':'Save to my phone 📲'}</button><button type="button" className="text-button keepsake-continue" onClick={()=>setByeStep('farewell')}>Continue <MoveRight size={16}/></button></div>
    </div>}
  </div>;
}
