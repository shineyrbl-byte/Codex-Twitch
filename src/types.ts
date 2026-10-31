export type Weather = 'sun' | 'storm' | 'breeze' | 'rain' | 'fog' | 'snow';
export interface Climate { energy:number; positivity:number; chaos:number; quiet:number; weather:Weather; label:string; forecast:string; topEmote:string; }
export interface ChatMessage { user:string; text:string; at:number; emotes:string[]; }
export interface WeatherEvent { kind:'follow'|'sub'|'cheer'|'raid'|'tornado'|'lightning'; name:string; amount?:number; at:number; }
