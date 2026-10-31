import type { ChatMessage, Climate, Weather } from './types';

const hype = ['pog','pogchamp','poggers','kekw','lul','lets go','hype','insane','🔥','💀','😂'];
const positive = ['love','great','good','amazing','nice','beautiful','awesome','win','❤️','💖','💯','👏','😊'];
const negative = ['hate','bad','boring','awful','terrible','sad','worst','😡','👎','🤮'];
const emotePattern = /\b(PogChamp|POG|Pog|KEKW|LUL|Kappa|OMEGALUL|Pepega|FeelsGoodMan|FeelsBadMan)\b|[\p{Extended_Pictographic}]/gu;
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));

export function analyze(messages:ChatMessage[], now=Date.now()):Climate {
  const recent=messages.filter(m=>now-m.at<30_000); const n=recent.length;
  if(!n) return {energy:0,positivity:50,chaos:0,quiet:100,weather:'fog',label:'Quiet skies',forecast:'🌫️ Chat is quiet. Fog is rolling in.',topEmote:'—'};
  const text=recent.map(m=>m.text.toLowerCase());
  const rate=Math.min(1,n/90);
  const hypeHits=recent.reduce((a,m)=>{const t=m.text.toLowerCase();return a+hype.filter(k=>t.includes(k)).length+Number(/\bw\b/i.test(m.text));},0);
  const caps=recent.filter(m=>{const letters=m.text.replace(/[^a-z]/gi,'');return letters.length>4&&letters===letters.toUpperCase()}).length;
  const exclaims=recent.filter(m=>/!!!+/.test(m.text)).length;
  const energy=clamp(rate*65+Math.min(25,hypeHits*4)+Math.min(10,caps*2+exclaims*2));
  let p=0; for(const m of recent){const t=m.text.toLowerCase();p+=positive.filter(k=>t.includes(k)).length-negative.filter(k=>t.includes(k)).length-Number(/\bl\b/i.test(m.text));}
  const positivity=clamp(50+p*12);
  const counts=new Map<string,number>(); for(const t of text)counts.set(t,(counts.get(t)||0)+1);
  const duplicate=[...counts.values()].reduce((a,c)=>a+Math.max(0,c-1),0);
  const wall=recent.filter(m=>{const words=m.text.trim().split(/\s+/);return words.length>=5&&words.every(w=>{emotePattern.lastIndex=0;return emotePattern.test(w)});}).length;
  const unique=new Set(recent.map(m=>m.user.toLowerCase())).size;
  const chaos=clamp(Math.min(40,duplicate*8)+Math.min(25,wall*10)+Math.min(35,unique/Math.max(1,n)*35)+(n>25?10:0));
  const quiet=clamp(100-rate*100);
  let weather:Weather='breeze',label='Calm breeze';
  if(n<3||quiet>92){weather='fog';label='Quiet skies';}
  else if(positivity<38){weather='rain';label='Drizzle';}
  else if(energy>34&&chaos>48){weather='storm';label='Thunderstorm';}
  else if(energy>34&&positivity>58){weather='sun';label='Sunshine';}
  else if(energy<22&&positivity>=48){weather='breeze';label='Calm breeze';}
  else if(chaos>60){weather='snow';label='Emote flurry';}
  const emotes=new Map<string,number>(); for(const m of recent){emotePattern.lastIndex=0;for(const e of m.text.match(emotePattern)||[])emotes.set(e,(emotes.get(e)||0)+1);}
  const topEmote=[...emotes].sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  const pct=weather==='storm'?chaos:weather==='rain'?100-positivity:weather==='sun'?energy:quiet;
  const phrase=weather==='storm'?'Chat is unhinged':weather==='rain'?'A little negativity in the air':weather==='sun'?'Hype levels are rising':weather==='fog'?'Chat has gone quiet':weather==='snow'?'Emotes are piling up':'A calm breeze is passing through';
  return {energy,positivity,chaos,quiet,weather,label,forecast:`${weather==='storm'?'⛈️':weather==='sun'?'☀️':weather==='rain'?'🌧️':weather==='fog'?'🌫️':weather==='snow'?'❄️':'🌤️'} ${phrase}. ${Math.round(pct)}% chance of ${weather==='storm'?'chaos':weather==='sun'?'hype':weather==='fog'?'fog':weather}.`,topEmote};
}
