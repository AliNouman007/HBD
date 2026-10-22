/** Yield after a small amount of main-thread work, retaining every original item. */
export async function prepareInBatches<T>(items:Iterable<T>,prepare:(item:T)=>void,options:{budgetMs?:number;cancelled?:()=>boolean;yieldFrame?:()=>Promise<void>;now?:()=>number}={}){
 const now=options.now??(()=>performance.now()),yieldFrame=options.yieldFrame??(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0))));
 let start=now();
 for(const item of items){
  if(options.cancelled?.())return;
  prepare(item);
  if(now()-start>=(options.budgetMs??4)){await yieldFrame();start=now()}
 }
}
