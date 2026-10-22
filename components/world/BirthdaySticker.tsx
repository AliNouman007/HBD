import './birthday-sticker.css';

export type BirthdayStickerVariant='wave'|'wish'|'clap'|'heart'|'gift';

export default function BirthdaySticker({variant='wave',size=96,className=''}:{variant?:BirthdayStickerVariant;size?:number;className?:string}){
 const wish=variant==='wish',clap=variant==='clap';
 return <svg className={`birthday-sticker birthday-sticker--${variant} ${className}`.trim()} width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">
  <ellipse className="birthday-sticker__shadow" cx="60" cy="112" rx="29" ry="3.5" fill="#735449" opacity=".12"/>
  <g className="birthday-sticker__float birthday-sticker__float--one" fill="#eda7b0">
   <path d="M17 39C5 32 8 24 14 25C17 25 18 28 18 28C22 22 29 26 26 31C24 35 17 39 17 39Z"/>
  </g>
  <g className="birthday-sticker__float birthday-sticker__float--two" stroke="#dfaf67" strokeWidth="2.3" strokeLinecap="round">
   <path d="M99 22V32M94 27H104M104 43V49M101 46H107"/>
  </g>
  <g className="birthday-sticker__character" stroke="#79574c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
   <path d="M40 74C33 82 31 99 39 105C49 112 72 113 81 103C87 94 84 79 77 74Z" fill="#fff1d9"/>
   <ellipse cx="60" cy="94" rx="16" ry="14" fill="#fffbef" stroke="none"/>
   <ellipse cx="42" cy="106" rx="12" ry="7" fill="#fff1d9"/>
   <ellipse cx="77" cy="106" rx="12" ry="7" fill="#fff1d9"/>
   <path d="M40 104V108M77 104V108" stroke="#d9b79e" strokeWidth="1.5"/>
   {variant==='wave'&&<>
    <path d="M37 78C24 78 24 91 30 95C34 98 40 95 44 88" fill="#fff1d9"/>
    <g className="birthday-sticker__wave">
     <path d="M80 79C89 88 101 77 104 65C108 54 100 47 94 53C90 56 92 62 90 67L82 69" fill="#fff1d9"/>
     <ellipse cx="98" cy="60" rx="3.5" ry="4.2" fill="#edb5a7" stroke="none"/>
    </g>
   </>}
   <g className="birthday-sticker__head">
    <circle cx="35" cy="34" r="14" fill="#fff1d9"/>
    <circle cx="85" cy="34" r="14" fill="#fff1d9"/>
    <circle cx="35" cy="34" r="7.5" fill="#edb5a7" stroke="none"/>
    <circle cx="85" cy="34" r="7.5" fill="#edb5a7" stroke="none"/>
    <path d="M25 58C25 36 38 27 60 27C82 27 95 38 95 60C96 78 82 88 60 88C39 88 24 78 25 58Z" fill="#fff1d9"/>
    <path d="M48 31C52 29 55 30 56 33" stroke="#fffcf4" strokeWidth="3"/>
    <ellipse cx="38" cy="65" rx="7" ry="4.5" fill="#f0b1aa" stroke="none"/>
    <ellipse cx="82" cy="65" rx="7" ry="4.5" fill="#f0b1aa" stroke="none"/>
    {wish||clap?<g strokeWidth="2.8"><path d="M41 56Q46 51 50 56M70 56Q75 51 79 56"/></g>:<g className="birthday-sticker__eyes" fill="#654a42" stroke="none"><ellipse cx="46" cy="56" rx="3" ry="4"/><ellipse cx="74" cy="56" rx="3" ry="4"/><circle cx="46.8" cy="54.8" r=".8" fill="#fff"/><circle cx="74.8" cy="54.8" r=".8" fill="#fff"/></g>}
    <ellipse cx="60" cy="65" rx="12" ry="9" fill="#fffaf0" stroke="none"/>
    <path d="M57 62Q60 60 63 62Q62 65 60 65Q58 65 57 62Z" fill="#79574c" stroke="none"/>
    {wish?<ellipse cx="60" cy="70" rx="2.5" ry="2.8" fill="#c68a7d" stroke="none"/>:<path d="M54 68Q57 73 60 68Q63 73 66 68" strokeWidth="1.8"/>}
   </g>
   <path d="M60 85C49 77 44 80 48 87C50 91 56 88 60 87C69 94 77 87 71 81C67 79 63 83 60 85Z" fill="#c9b3dc" stroke="#a487b5" strokeWidth="1.4"/>
   <circle cx="60" cy="86" r="3" fill="#e1cdee" stroke="#a487b5" strokeWidth="1.2"/>
   {wish&&<>
    <path d="M37 80C38 72 46 76 50 86M83 80C82 72 74 76 70 86" fill="#fff1d9"/>
    <path d="M48 107H72" stroke="#cea995"/>
    <rect x="55" y="89" width="10" height="18" rx="2.5" fill="#e7b1b2"/>
    <path d="M56 99L64 94M57 106L64 102" stroke="#fff5e7" strokeWidth="2"/>
    <path d="M60 89V86" strokeWidth="1.6"/>
    <path className="birthday-sticker__flame" d="M60 74C60 78 66 80 64 84C62 88 55 86 56 81C56 78 59 77 60 74Z" fill="#f9c466" stroke="#dda060" strokeWidth="1.3"/>
   </>}
   {clap&&<>
    <path className="birthday-sticker__clap-left" d="M34 81C32 72 40 70 46 77L55 87C62 96 49 104 41 95Z" fill="#fff1d9"/>
    <path className="birthday-sticker__clap-right" d="M86 81C88 72 80 70 74 77L65 87C58 96 71 104 79 95Z" fill="#fff1d9"/>
    <g className="birthday-sticker__clap-sparks" stroke="#d8a66a" strokeWidth="2"><path d="M54 96L50 101M60 98V104M66 96L70 101"/></g>
   </>}
   {variant==='heart'&&<>
    <path className="birthday-sticker__heart" d="M60 107C55 102 40 94 43 84C46 76 56 80 60 85C64 79 74 77 77 85C81 95 66 104 60 107Z" fill="#ed9daa" stroke="#b77281"/>
    <path d="M48 85Q51 81 55 85" stroke="#ffd6da" strokeWidth="2.5"/>
    <ellipse cx="41" cy="92" rx="7" ry="9" transform="rotate(-28 41 92)" fill="#fff1d9"/>
    <ellipse cx="79" cy="92" rx="7" ry="9" transform="rotate(28 79 92)" fill="#fff1d9"/>
   </>}
   {variant==='gift'&&<>
    <g className="birthday-sticker__gift">
     <rect x="43" y="88" width="34" height="22" rx="3" fill="#c1d7c0"/>
     <path d="M57 90H63V109H57Z" fill="#e4afb4" stroke="none"/>
     <rect x="41" y="84" width="38" height="7" rx="2" fill="#d8e7cd"/>
     <path d="M60 84C40 84 47 71 55 78ZM60 84C80 84 73 71 65 78Z" fill="#edbdc3" stroke="#b77d8a" strokeWidth="1.7"/>
     <circle cx="60" cy="84" r="3" fill="#e4afb4" stroke="#b77d8a" strokeWidth="1.5"/>
    </g>
    <ellipse cx="39" cy="94" rx="6.5" ry="8" transform="rotate(-20 39 94)" fill="#fff1d9"/>
    <ellipse cx="81" cy="94" rx="6.5" ry="8" transform="rotate(20 81 94)" fill="#fff1d9"/>
   </>}
  </g>
 </svg>;
}

export function BirthdayCompanion({message,variant='wave',size=76,celebrate=false}:{message:string;variant?:BirthdayStickerVariant;size?:number;celebrate?:boolean}){
 return <div className={`birthday-companion${celebrate?' birthday-companion--celebrate':''}`} key={message}><BirthdaySticker variant={variant} size={size}/><span className="birthday-companion__bubble">{message}</span></div>;
}
