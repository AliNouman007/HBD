// Small confetti burst. No libraries. Skipped when the user prefers reduced motion.
const COLORS=['#f6b8c6','#f9d77e','#c9b3dc','#bfe0c9','#fff1d9','#ef9fb0'];
type Origin=HTMLElement|{x:number;y:number}|null|undefined;
export function burstConfetti(from?:Origin,count=70){
  if(typeof window==='undefined')return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let x=innerWidth/2,y=innerHeight/2;
  if(from instanceof HTMLElement){const r=from.getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2}else if(from){x=from.x;y=from.y}
  const layer=document.createElement('div');layer.className='confetti-layer';document.body.appendChild(layer);
  for(let i=0;i<count;i++){
    const p=document.createElement('i');
    const angle=Math.random()*Math.PI*2,dist=120+Math.random()*260;
    p.style.left=`${x}px`;p.style.top=`${y}px`;
    p.style.background=COLORS[i%COLORS.length];
    p.style.setProperty('--dx',`${Math.cos(angle)*dist}px`);
    p.style.setProperty('--dy',`${Math.sin(angle)*dist-160}px`);
    p.style.setProperty('--r',`${Math.random()*720-360}deg`);
    p.style.animationDelay=`${Math.random()*80}ms`;
    if(i%3===0)p.style.borderRadius='50%';
    layer.appendChild(p);
  }
  setTimeout(()=>layer.remove(),1900);
}

// Hearts that float up across the whole screen (used for the letter hug).
export function floatHearts(count=26){
  if(typeof window==='undefined')return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const glyphs=['💗','💖','💕','🤍','✨'];
  const layer=document.createElement('div');layer.className='hearts-layer';document.body.appendChild(layer);
  for(let i=0;i<count;i++){
    const h=document.createElement('span');h.textContent=glyphs[i%glyphs.length];
    h.style.left=`${Math.random()*100}%`;h.style.fontSize=`${18+Math.random()*26}px`;
    h.style.animationDelay=`${Math.random()*600}ms`;h.style.animationDuration=`${2.2+Math.random()*1.4}s`;
    h.style.setProperty('--drift',`${(Math.random()-.5)*120}px`);
    layer.appendChild(h);
  }
  setTimeout(()=>layer.remove(),4400);
}
