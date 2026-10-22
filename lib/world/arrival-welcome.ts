import {Box3,CanvasTexture,Group,Mesh,MeshBasicMaterial,PlaneGeometry,SRGBColorSpace,Vector3} from 'three';
import {birthdayLabel,type PersonalContent} from './content.ts';

/** Flat artwork owned by the courtyard, so the existing scene disposal covers it. */
export class ArrivalWelcome {
 readonly root=new Group();
 private elapsed=0;
 private lettering:MeshBasicMaterial;
 private stars:MeshBasicMaterial[]=[];
 constructor(niche:Mesh,content:PersonalContent){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const c=canvas.getContext('2d')!;c.textAlign='center';c.lineCap='round';
  // Draw once; only material opacity changes during the short arrival animation.
  c.strokeStyle='#e8c58f';c.lineWidth=5;
  c.beginPath();c.moveTo(512,228);c.bezierCurveTo(355,110,362,291,512,228);c.bezierCurveTo(662,110,669,291,512,228);c.stroke();
  c.beginPath();c.moveTo(501,235);c.quadraticCurveTo(476,292,432,311);c.moveTo(523,235);c.quadraticCurveTo(548,292,592,311);c.stroke();
  c.fillStyle='#f8e2d7';c.beginPath();c.ellipse(512,228,13,17,0,0,Math.PI*2);c.fill();
  c.fillStyle='#f9e9df';c.font='italic 100px Georgia';c.fillText('For you,',512,365);
  c.font='166px Georgia';c.fillText(`${content.recipientName} ♡`,512,535,930);
  c.fillStyle='#f2d5bf';c.font='italic 88px Georgia';c.fillText('A little world,',512,665);c.fillText('made with love.',512,758);
  c.strokeStyle='#e8c58f';c.lineWidth=2;c.beginPath();c.moveTo(422,815);c.lineTo(602,815);c.stroke();
  c.fillStyle='#f6dfb8';c.font='86px Georgia';c.fillText(birthdayLabel(content.birthday),512,920);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;
  this.lettering=new MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,opacity:0});
  niche.updateWorldMatrix(true,false);const box=new Box3().setFromObject(niche),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
  const width=size.x*.93,geometry=new PlaneGeometry(width,width);
  const art=new Mesh(geometry,this.lettering);art.name='Arrival welcome lettering';this.root.add(art);
  const starCanvas=document.createElement('canvas');starCanvas.width=starCanvas.height=64;
  const s=starCanvas.getContext('2d')!;s.fillStyle='#f4d49a';s.beginPath();
  for(const [x,y]of [[32,1],[39,25],[63,32],[39,39],[32,63],[25,39],[1,32],[25,25]])s.lineTo(x,y);s.closePath();s.fill();
  const starTexture=new CanvasTexture(starCanvas);starTexture.colorSpace=SRGBColorSpace;
  const starGeometry=new PlaneGeometry(width*.065,width*.065);
  for(const [x,y]of [[-.39,.17],[.38,.30],[.34,-.21]]){
   const material=new MeshBasicMaterial({map:starTexture,transparent:true,depthWrite:false,toneMapped:false,opacity:0});
   const star=new Mesh(starGeometry,material);star.position.set(x*width,y*width,.001);this.root.add(star);this.stars.push(material);
  }
  this.root.name='Musfira arrival welcome';this.root.position.set(center.x,center.y+.025,box.max.z+.014);
 }
 update(dt:number,doorOpen:boolean,reduced:boolean){
  this.elapsed=doorOpen?Math.min(6,this.elapsed+Math.max(0,Math.min(dt,.1))):0;
  const t=reduced?(doorOpen?1:0):Math.min(1,this.elapsed/1.1),opacity=t*t*(3-2*t);
  this.root.visible=doorOpen;this.lettering.opacity=opacity;
  this.stars.forEach((m,i)=>{m.opacity=opacity*(reduced||this.elapsed>=6?.82:.76+.24*Math.sin(this.elapsed*2.4+i*2.1))});
 }
}
