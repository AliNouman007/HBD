'use client';
import {useEffect,useRef,useState} from 'react';
import BirthdayDate from '@/components/world/BirthdayDate';
export default function CelebrationReview(){
 const [elapsed,setElapsed]=useState(5.5),[playing,setPlaying]=useState(false),[mobile,setMobile]=useState(false),[reduced,setReduced]=useState(false),[recorded,setRecorded]=useState(''),[recording,setRecording]=useState(false);
 const stage=useRef<HTMLDivElement>(null),recorder=useRef<MediaRecorder|null>(null),recordURL=useRef(''),anchor=useRef(0);
 const play=()=>{anchor.current=performance.now();setElapsed(0);setPlaying(true)};
 useEffect(()=>{if(!playing)return;let raf=0;const tick=(now:number)=>{const t=(now-anchor.current)/1000;setElapsed(Math.min(11,t));if(t<11)raf=requestAnimationFrame(tick);else{setPlaying(false);if(recorder.current?.state==='recording')recorder.current.stop()}};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[playing]);
 useEffect(()=>()=>{if(recorder.current?.state==='recording')recorder.current.stop();if(recordURL.current)URL.revokeObjectURL(recordURL.current)},[]);
 const record=()=>{const canvas=stage.current?.querySelector('canvas');if(!canvas)return;const stream=canvas.captureStream(30),chunks:BlobPart[]=[];const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});recorder.current=rec;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=()=>{if(recordURL.current)URL.revokeObjectURL(recordURL.current);recordURL.current=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}));setRecorded(recordURL.current);setRecording(false);stream.getTracks().forEach(t=>t.stop())};rec.start(250);setRecording(true);play()};
 const button={background:'#f2e3cd',color:'#47353b',border:0,padding:'10px 15px',margin:4,cursor:'pointer'};
 return <main style={{position:'absolute',inset:0,overflow:'auto',background:'#1e1a20',color:'#f4e9d8',padding:16}}>
  <div style={{maxWidth:1150,margin:'0 auto 16px',fontSize:14}}><strong>Happy Birthday Musfira · isolated browser effect review</strong><p>The Happy Birthday Musfira particle overlay is shown over an actual Blender still for context. This page does not render the 3D world.</p>
   <button style={button} onClick={play}>Play animation</button><button style={button} onClick={()=>{setPlaying(false);setElapsed(5.5)}}>Hold message</button><button style={button} onClick={()=>setMobile(v=>!v)}>{mobile?'Desktop viewport':'Mobile viewport'}</button><button style={button} onClick={()=>setReduced(v=>!v)}>{reduced?'Animated motion':'Reduced motion'}</button><button disabled={recording} style={button} onClick={record}>{recording?'Recording…':'Record celebration animation'}</button>{recorded&&<a style={{...button,display:'inline-block'}} download="happy-birthday-musfira-browser-effect.webm" href={recorded}>Download effect recording</a>}
  </div>
  <div ref={stage} data-testid="date-review-stage" style={{position:'relative',width:mobile?390:'100%',maxWidth:1150,height:mobile?844:650,margin:'auto',overflow:'hidden',background:'#32242a url(/qa/wish-source.jpg) center/cover'}}><BirthdayDate label="Happy Birthday" name="Musfira" elapsed={elapsed} reduced={reduced}/><p style={{position:'absolute',bottom:'12%',width:'100%',textAlign:'center',zIndex:2,font:'italic 24px Georgia'}}>A day worth celebrating.</p></div>
  <p style={{textAlign:'center',fontSize:13}}>Captured video contains only the particle canvas. It is not a six-scene browser walkthrough.</p>
 </main>;
}
