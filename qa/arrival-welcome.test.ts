import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial} from 'three';
import {ArrivalWelcome} from '../lib/world/arrival-welcome.ts';
import type {PersonalContent} from '../lib/world/content.ts';

test('arrival art reveals after the courtyard door, respects reduced motion, and resets on replay',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document'),words:string[]=[];
 const context=new Proxy({fillText:(text:string)=>words.push(text)},{get:(target,key)=>Reflect.get(target,key)??(()=>{})});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>context})}});
 try{
  const niche=new Mesh(new BoxGeometry(1.4,1.79,.001));niche.position.set(1.82,1.365,-10.015);
  const courtyard=new Group();courtyard.add(niche);
  const content={recipientName:'Musfira',birthday:{day:25,month:10}} as PersonalContent;
  const welcome=new ArrivalWelcome(niche,content);courtyard.add(welcome.root);
  const materials=welcome.root.children.map(o=>(o as Mesh).material as MeshBasicMaterial);
  assert.deepEqual(words,['For you,','Musfira ♡','A little world,','made with love.','25 October']);
  assert.equal(welcome.root.children.length,4,'one greeting and three small stars');
  assert(niche.children.length===0,'a renderable with children disables shared room rendering');
  assert(welcome.root.position.z>niche.position.z,'art must sit in front of the existing arch');
  assert(materials.every(m=>m.transparent&&!m.depthWrite),'art must not occlude the physical room');
  welcome.update(.1,false,false);assert(!welcome.root.visible);assert(materials.every(m=>m.opacity===0));
  welcome.update(.1,true,false);assert(welcome.root.visible);assert(materials[0].opacity>0&&materials[0].opacity<1);
  for(let i=0;i<70;i++)welcome.update(.1,true,false);
  assert.equal(materials[0].opacity,1);const settled=materials.map(m=>m.opacity);
  welcome.update(.1,true,false);assert.deepEqual(materials.map(m=>m.opacity),settled,'twinkles settle instead of running forever');
  welcome.update(0,false,false);assert(!welcome.root.visible);assert(materials.every(m=>m.opacity===0));
  welcome.update(0,true,true);assert.equal(materials[0].opacity,1);
  const reduced=materials.map(m=>m.opacity);welcome.update(.1,true,true);assert.deepEqual(materials.map(m=>m.opacity),reduced);
  welcome.update(0,false,true);assert(!welcome.root.visible);
 }finally{if(descriptor)Object.defineProperty(globalThis,'document',descriptor);else Reflect.deleteProperty(globalThis,'document')}
});
