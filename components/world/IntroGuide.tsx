'use client';
import {useState} from 'react';
import {BirthdayCompanion} from './BirthdaySticker';

export default function IntroGuide({stage,name}:{stage:'welcome'|'hint';name:string}){
  const [touch]=useState(()=>typeof window!=='undefined'&&matchMedia('(pointer: coarse)').matches);
  if(stage==='welcome')return <div className="intro-welcome" role="status">
    <BirthdayCompanion variant="clap" size={84} celebrate message="Yay, you’re here! 🎉"/>
    <h2>Welcome to your birthday, <em>{name}</em> 🎂</h2>
    <p>Every corner of this place is a little surprise for you.</p>
  </div>;
  return <div className="intro-hint" role="status">
    {touch?<span className="hint-hand" aria-hidden="true">👆</span>:<span className="hint-mouse" aria-hidden="true"><i/></span>}
    <p>{touch?'Swipe up to walk inside':'Scroll down to walk inside'}</p>
    <span className="hint-sub">Your first surprise is just ahead ✨</span>
  </div>;
}
