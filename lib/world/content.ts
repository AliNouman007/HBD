export type Photo={image:string;alt:string;placeholder?:boolean;fallback?:string;crop?:number[];transcription?:string};
export type PersonalContent={schemaVersion?:number;recipientName:string;birthday?:{day:number;month:number};portrait:Photo;bedroomPhotos:Photo[];receivedCard:Photo;memories:(Photo&{caption:string})[];gift:{tag:string};letter:{title:string;paragraphs:string[];signature:string};ending:string[];audio:{birthday:string;credits:string}};
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function birthdayLabel(birthday:PersonalContent['birthday']){const {day,month}=birthday??{day:25,month:10};return `${day} ${months[month-1]}`}
export function localAsset(path:unknown){if(typeof path!=='string'||!/^\/(?!\/)/.test(path)||/[\\\x00-\x1f]/.test(path)||path.includes('..'))throw Error('Personal assets must use a path inside this website.');return path}
export function validateContent(raw:unknown):PersonalContent {
 if(!raw||typeof raw!=='object')throw Error('The personal content configuration could not be read.');const c=raw as PersonalContent;
 const text=(v:unknown,max=300)=>typeof v==='string'&&v.length<=max;
 if(!text(c.recipientName,80)||!c.letter||!text(c.letter.title,160)||!text(c.letter.signature,200)||!Array.isArray(c.letter.paragraphs)||!c.letter.paragraphs.every(p=>text(p,3000))||c.letter.paragraphs.join('').length>18000)throw Error('Check the name and birthday letter configuration.');
 const {day,month}=c.birthday??{day:25,month:10};if(!Number.isInteger(day)||!Number.isInteger(month)||month<1||month>12||day<1||day>new Date(2000,month,0).getDate())throw Error('Use a valid birthday day and month.');
 c.birthday={day,month};c.memories??=[];c.bedroomPhotos??=[];
 c.receivedCard??={image:'/personal/received-card-placeholder.png',alt:'Placeholder for the card you gave me.',placeholder:true};
 c.gift??={tag:`Just for you, ${c.recipientName}.`};c.ending??=[`Thank you for being here, ${c.recipientName}.`,'I hope this little world made you smile.','Happy Birthday.'];
 c.audio??={birthday:'/audio/happy-birthday.mp3',credits:'/audio/credits.json'};
 if(!text(c.gift.tag,180)||c.ending.length!==3||!c.ending.every(l=>text(l,180)))throw Error('Check the gift and ending text.');
 for(const photo of [c.portrait,c.receivedCard,...c.bedroomPhotos,...c.memories]){
  if(!photo||!text(photo.alt,500))throw Error('Each photo needs descriptive alternative text.');localAsset(photo.image);if(photo.fallback)localAsset(photo.fallback);
  if(photo.crop&&(!Array.isArray(photo.crop)||photo.crop.length!==4||photo.crop.some(v=>!Number.isFinite(v)||v<0||v>1)||photo.crop[2]<=0||photo.crop[3]<=0||photo.crop[0]+photo.crop[2]>1.00001||photo.crop[1]+photo.crop[3]>1.00001))throw Error('Photo crop must fit inside its original image.');
 }
 localAsset(c.audio.birthday);localAsset(c.audio.credits);return c;
}
export function photoForSlot(c:PersonalContent,slot:string):Photo|undefined{if(slot==='heroPortrait')return c.portrait;if(slot==='receivedCard')return c.receivedCard;if(slot.startsWith('bedroomPhotos.'))return c.bedroomPhotos[Number(slot.split('.')[1])];}
