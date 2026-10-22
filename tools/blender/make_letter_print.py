"""Typeset configurable text onto scene texture assets; no photographic image editing."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,sys
root=Path(sys.argv[1]).resolve();content=json.loads((root/'public/personal-content.json').read_text());dest=root/'public/personal';dest.mkdir(exist_ok=True)
font='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
im=Image.new('RGB',(1448,1024),'#f5eddf');d=ImageDraw.Draw(im);d.rectangle((55,55,1393,969),outline='#d3b598',width=2)
d.text((724,160),content['letter']['title'],font=ImageFont.truetype(font,66),fill='#59403d',anchor='mm')
y=290;body=ImageFont.truetype(font,37)
for paragraph in content['letter']['paragraphs']:
 line=''
 for word in paragraph.split():
  trial=(line+' '+word).strip()
  if d.textlength(trial,font=body)>1200:d.text((124,y),line,font=body,fill='#59403d');y+=56;line=word
  else:line=trial
 d.text((124,y),line,font=body,fill='#59403d');y+=100
d.text((124,840),content['letter']['signature'],font=ImageFont.truetype(font,35),fill='#59403d');im.save(dest/'letter-print.png')
for i,memory in enumerate(content['memories']):
 im=Image.new('RGB',(768,384),'#f3e9da');d=ImageDraw.Draw(im);d.text((384,190),memory['caption'],font=ImageFont.truetype(font,51),fill='#634846',anchor='mm');im.save(dest/f'note-{i+1}.png')
