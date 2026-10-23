'use client';
import type {CSSProperties} from 'react';

const COUNT=17,SWAGS=3;
const swagY=(u:number)=>10+26*Math.sin(Math.PI*((u*SWAGS)%1));
const BULBS=Array.from({length:COUNT},(_,i)=>{const u=i/(COUNT-1);return {x:2+u*96,y:swagY(u)}});
const WIRE=Array.from({length:121},(_,i)=>{const u=i/120;return `${(2+u*96)*10},${swagY(u).toFixed(2)}`}).join(' ');
const COLORS=['#ffd98a','#f7b6c6','#fff3d7','#c9b3dc','#ffe0a3'];

export default function RoomLights({on}:{on:boolean}){
 return <div className={`room-decor${on?' is-on':''}`} aria-hidden="true"><div className="room-glow"/><div className="room-lights"><svg className="room-wire" viewBox="0 0 1000 60" preserveAspectRatio="none"><polyline points={WIRE} fill="none" stroke="#5a4248" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg>{BULBS.map((b,i)=><span key={i} className="room-bulb" style={{left:`${b.x}%`,top:`${b.y+4}px`,'--c':COLORS[i%COLORS.length],'--i':i} as CSSProperties}/>)}</div></div>;
}
