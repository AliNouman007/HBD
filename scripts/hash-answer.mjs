// Usage: node scripts/hash-answer.mjs "answer"
// Must stay identical to normalizeAnswer/hashAnswer in components/world/SecretGate.tsx.
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');
const cyrb53=(str,seed=25)=>{let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0;i<str.length;i++){const ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(16)};
const answer=process.argv.slice(2).join(' ');
if(!answer){console.error('Usage: node scripts/hash-answer.mjs "answer"');process.exit(1)}
console.log(cyrb53(`hbd:${normalize(answer)}`));
