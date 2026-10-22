'use client';
import {useEffect,useRef} from 'react';
import {buildDateParticles,dateEnvelope,drawDate} from '@/lib/world/date-particles';
export default function BirthdayDate({label,name,elapsed,reduced=false}:{label:string;name?:string;elapsed:number;reduced?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),time=useRef({elapsed,at:0});
 useEffect(()=>{time.current={elapsed,at:performance.now()}},[elapsed]);
 useEffect(()=>{
  const el=canvas.current!,ctx=el.getContext('2d')!,particles=buildDateParticles(label),person=name?{label:name,particles:buildDateParticles(name)}:undefined;let width=0,height=0,raf=0;
  const resize=()=>{const r=el.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);width=r.width;height=r.height;el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const draw=(now:number)=>{drawDate(ctx,particles,label,time.current.elapsed+Math.min(.15,Math.max(0,(now-time.current.at)/1000)),width,height,reduced,person);raf=requestAnimationFrame(draw)};raf=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(raf);observer.disconnect()};
 },[label,name,reduced]);
 return <div className="birthday-date" style={{opacity:reduced?1:dateEnvelope(elapsed)}}><div className="birthday-date-shade"/><canvas ref={canvas} aria-hidden="true" data-testid="birthday-date-canvas"/><span className="sr-only">{label}{name?` ${name}`:''}. A day worth celebrating.</span></div>;
}
