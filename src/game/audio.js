export class GameAudio {
 constructor(volume=.45){this.volume=volume;this.ctx=null}
 unlock(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume().catch(()=>{})}
 tone(freq,duration,volume=.2,type='sine',end=0){if(!this.ctx||!this.volume)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);if(end)o.frequency.exponentialRampToValueAtTime(end,c.currentTime+duration);g.gain.setValueAtTime(volume*this.volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration)}
 shot(weapon,local=true){if(!this.ctx||!this.volume)return;const c=this.ctx,len=weapon==='awp'?.28:.13,buffer=c.createBuffer(1,Math.floor(c.sampleRate*len),c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const noise=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=weapon==='mp5'?2500:1800;gain.gain.setValueAtTime((local?.36:.07)*this.volume,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+len);noise.connect(filter);filter.connect(gain);gain.connect(c.destination);noise.start();this.tone(weapon==='awp'?95:140,.11,local?.2:.04,'triangle',40)}
 hit(){this.tone(1100,.055,.11,'sine',700)}
 reload(){this.tone(420,.09,.08,'square',200)}
 step(){this.tone(80,.055,.07,'triangle',30)}
 dispose(){this.ctx?.close().catch(()=>{})}
}
