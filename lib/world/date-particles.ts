// Exact typography becomes a deterministic particle field, without a video
// download, stock footage, a generated text image, or extra 3D asset detail.
export type DateParticle={x:number;y:number;seed:number;angle:number;radius:number;colour:number};
const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)};
export function dateEnvelope(t:number){return smooth(0,.7,t)*(1-smooth(9.5,11,t))}
export function buildDateParticles(label:string):DateParticle[]{
 const mask=document.createElement('canvas');mask.width=1200;mask.height=300;
 const ctx=mask.getContext('2d')!;ctx.font='bold 222px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,600,153,1110);
 const pixels=ctx.getImageData(0,0,1200,300).data,result:DateParticle[]=[];
 let seed=251025;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let y=24;y<278;y+=4)for(let x=30;x<1170;x+=4)if(pixels[(y*1200+x)*4+3]>120){
  result.push({x:(x-600+(random()-.5)*2.8)/1200,y:(y-150+(random()-.5)*2.8)/1200,seed:random(),angle:random()*Math.PI*2,radius:.45+random()*.75,colour:Math.floor(random()*3)});
 }
 return result;
}
export function drawDate(ctx:CanvasRenderingContext2D,particles:DateParticle[],label:string,t:number,width:number,height:number,reduced:boolean,name?:{label:string;particles:DateParticle[]}){
 ctx.clearRect(0,0,width,height);const strength=dateEnvelope(t);if(strength<=0)return;
 const span=Math.min(width*.91,1040),centreY=height*(name?.49:.43),labelY=name?centreY-span*.18:centreY;
 if(reduced){ctx.globalAlpha=strength;ctx.fillStyle='#f5e3bd';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${span*.15}px Georgia`;ctx.fillText(label,width/2,labelY,span);if(name){ctx.font=`${span*.11}px Georgia`;ctx.fillText(name.label,width/2,centreY,span*.8)}ctx.globalAlpha=1;return;}
 const scatter=smooth(9,11,t),alpha=strength;
 const colours=['#f5e3bd','#d5b476','#fff3d7'];
 const lettering=(points:DateParticle[],size:number,cy:number,gather:number)=>{
 for(let colour=0;colour<3;colour++){
  ctx.beginPath();
  for(const p of points){if(p.colour!==colour)continue;
   const swirl=(1-gather)*(2.8-t*.5),angle=p.angle+swirl;
   const x=p.x*gather+Math.cos(angle)*p.radius*(1-gather)+Math.cos(p.angle)*scatter*(.25+p.seed*.8);
   const y=p.y*gather+Math.sin(angle)*p.radius*(1-gather)*.55-Math.abs(Math.sin(p.angle))*scatter*.55;
   const px=width/2+x*size,py=cy+y*size;
   const r=Math.max(.55,Math.min(1.7,size/760))*(.65+p.seed*.65)*(1+scatter*.55);
   ctx.moveTo(px+r,py);ctx.arc(px,py,r,0,Math.PI*2);
  }
  ctx.fillStyle=colours[colour];ctx.globalAlpha=alpha*(colour===1?.65:.95);ctx.fill();
 }
 };
 lettering(particles,span,labelY,smooth(.15,2.6,t));
 if(name)lettering(name.particles,span*.63,centreY,smooth(1.8,4.4,t));
 // Sparse, slow surrounding dust. There is no flashing or camera shake.
 ctx.fillStyle='#f3d7a1';ctx.globalAlpha=alpha*.34;ctx.beginPath();
 const fract=(n:number)=>n-Math.floor(n);
 for(let i=0;i<75;i++){const x=fract(Math.sin(i*127.1+19)*43758.5453)*width,y=fract(Math.sin(i*311.7+93)*96271.33+t*.011)*height,r=i%7===0?1.6:.7;ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2)}ctx.fill();ctx.globalAlpha=1;
}
