'use client';
import {useState,type CSSProperties} from 'react';
import {burstConfetti} from './celebrate';

const BALLOONS=[
  {left:58,delay:-2,dur:14,color:'#f3b4c2',size:58},
  {left:68,delay:-7,dur:16,color:'#f8d98a',size:50},
  {left:78,delay:-4,dur:13,color:'#cdb7e0',size:62},
  {left:88,delay:-10,dur:15,color:'#bfe0c9',size:48},
  {left:63,delay:-12,dur:17,color:'#fbe3d0',size:54},
  {left:84,delay:-1,dur:14,color:'#f0a5b5',size:56},
];

export default function LandingBalloons(){
  const [popped,setPopped]=useState<number[]>([]);
  return <div className="landing-balloons" aria-hidden="true">
    {BALLOONS.map((b,i)=>popped.includes(i)?null:
      <button key={i} type="button" tabIndex={-1} className="landing-balloon"
        style={{left:`${b.left}%`,animationDelay:`${b.delay}s`,animationDuration:`${b.dur}s`,width:b.size,height:Math.round(b.size*1.22),'--balloon':b.color} as CSSProperties}
        onClick={e=>{burstConfetti(e.currentTarget,26);setPopped(p=>[...p,i]);setTimeout(()=>setPopped(p=>p.filter(x=>x!==i)),2500)}}/>) }
  </div>;
}
