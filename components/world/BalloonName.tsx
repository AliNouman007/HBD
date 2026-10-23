'use client';
import type {AnimationEvent,CSSProperties,PointerEvent as ReactPointerEvent} from 'react';

// Finale: the name arrives as floating foil letter balloons (distinct from the candle's golden particles).
type Props={name:string;date:string;elapsed:number;reduced:boolean;onBoop?:()=>void};
const FOILS=['gold','rose','gold','lilac'] as const;

export default function BalloonName({name,date,elapsed,reduced,onBoop}:Props){
  const letters=Array.from(name.toUpperCase());
  const leaving=!reduced&&elapsed>=9.4;
  const boop=(e:ReactPointerEvent<HTMLSpanElement>)=>{const b=e.currentTarget;b.classList.remove('is-boop');void b.offsetWidth;b.classList.add('is-boop');onBoop?.()};
  const boopEnd=(e:AnimationEvent<HTMLSpanElement>)=>{if(e.animationName==='balloon-boop')e.currentTarget.classList.remove('is-boop')};
  return <div className={`balloon-name${leaving?' is-leaving':''}${reduced?' is-still':''}`} role="img" aria-label={`Happy Birthday ${name}, ${date}`}>
    <p className="balloon-name-eyebrow" aria-hidden="true">Happy Birthday</p>
    <div className="balloon-name-row" aria-hidden="true">{letters.map((ch,i)=>ch===' '?<span key={i} className="balloon-gap"/>:<span key={i} className={`balloon-letter is-${FOILS[i%FOILS.length]}`} style={{'--i':i} as CSSProperties} onPointerDown={boop} onAnimationEnd={boopEnd}><span className="balloon-glyph">{ch}</span><span className="balloon-string"/></span>)}</div>
    <p className="balloon-name-date" aria-hidden="true">{date}</p>
  </div>;
}
