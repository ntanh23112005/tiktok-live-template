// Short one-shot sampled from the user's supplied reference clip, never a looping video soundtrack.
export class ShotAudio {
  constructor() { this.volume = 1; this.musicVolume = .2; this.duckMusic = true; this.enabled = true; this.ready = false; this.shots = 0; this.lastShot = -1; this.musicElement = new Audio(); this.musicElement.loop = true; this.musicElement.preload = 'auto'; }
  async unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.context = new AudioContext(); this.gain = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor(); this.compressor.threshold.value = -10; this.compressor.ratio.value = 8;
      this.gain.connect(this.compressor); this.compressor.connect(this.context.destination); this.gain.gain.value = this.volume;
      this.musicGain=this.context.createGain();this.duckGain=this.context.createGain();this.musicSource=this.context.createMediaElementSource(this.musicElement);
      this.musicSource.connect(this.musicGain);this.musicGain.connect(this.duckGain);this.duckGain.connect(this.compressor);this.musicGain.gain.value=this.enabled?this.musicVolume:0;
      try { const response = await fetch('/audio/reference-shot.wav'); if (!response.ok) throw new Error('shot missing'); this.buffer = await this.context.decodeAudioData(await response.arrayBuffer()); }
      catch { this.buffer = null; }
    }
    try { await this.context.resume(); this.ready = this.context.state === 'running'; } catch { this.ready = false; }
    if(this.ready)this.applyMusic();return this.ready;
  }
  configure(volume, enabled = true) { this.volume = Math.max(0, Math.min(1, Number(volume))); this.enabled = enabled; if (this.gain) { this.gain.gain.setTargetAtTime(enabled ? this.volume : 0, this.context.currentTime, .025);this.musicGain.gain.setTargetAtTime(enabled?this.musicVolume:0,this.context.currentTime,.025); } }
  configureMusic(state, settings, clockOffset=0) {
    this.musicState=state;this.clockOffset=clockOffset;this.musicVolume=Number(settings.musicVolume??.2);this.duckMusic=settings.duckMusic!==false;
    if(this.musicGain)this.musicGain.gain.setTargetAtTime(this.enabled?this.musicVolume:0,this.context.currentTime,.025);
    const id=state?.track?.id;
    if(id!==this.musicTrack){this.musicTrack=id;this.musicElement.pause();if(id){this.musicElement.src=state.track.url;this.musicElement.load();this.musicElement.onloadedmetadata=()=>this.applyMusic();}else{this.musicElement.removeAttribute('src');this.musicElement.load();}}
    this.applyMusic();
  }
  applyMusic() {
    const state=this.musicState,element=this.musicElement;
    if(!state?.track||!state.playing||!this.ready){element.pause();return;}
    if(element.readyState<1)return;
    const seconds=state.offset+Math.max(0,Date.now()+(this.clockOffset??0)-state.startedAt)/1000;
    const target=Number.isFinite(element.duration)&&element.duration>0?seconds%element.duration:seconds;
    if(Math.abs(element.currentTime-target)>.8)try{element.currentTime=target;}catch{}
    element.play().catch(()=>{});
  }
  duck() {
    if(!this.duckGain||!this.duckMusic)return;
    const now=this.context.currentTime;this.duckGain.gain.cancelScheduledValues(now);
    this.duckGain.gain.setTargetAtTime(.12,now,.012);this.duckGain.gain.setTargetAtTime(1,now+.21,.14);
  }
  shot(index) {
    if (!this.ready || !this.enabled || this.volume === 0 || index === this.lastShot) return;
    this.lastShot = index; this.shots++; this.duck(); const time = this.context.currentTime;
    if (this.buffer) {
      const source = this.context.createBufferSource(); source.buffer = this.buffer; source.playbackRate.value = .96 + (index % 5) * .015;
      const envelope = this.context.createGain(); envelope.gain.setValueAtTime(.8, time); envelope.gain.exponentialRampToValueAtTime(.001, time + .085);
      source.connect(envelope); envelope.connect(this.gain); source.start(); source.onended = () => { source.disconnect(); envelope.disconnect(); };
    } else this.synthShot(time);
  }
  synthShot(time) {
    const buffer = this.context.createBuffer(1, Math.floor(this.context.sampleRate * .07), this.context.sampleRate);
    const samples = buffer.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples.length * .16));
    const source = this.context.createBufferSource(); source.buffer = buffer;
    const filter = this.context.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 750;
    source.connect(filter); filter.connect(this.gain); source.start(time); source.onended = () => { source.disconnect(); filter.disconnect(); };
  }
  boom() {
    if (!this.ready || !this.enabled) return;
    this.duck();const time = this.context.currentTime; const oscillator = this.context.createOscillator(); const envelope = this.context.createGain();
    oscillator.frequency.setValueAtTime(100, time); oscillator.frequency.exponentialRampToValueAtTime(25, time + .6);
    envelope.gain.setValueAtTime(.75, time); envelope.gain.exponentialRampToValueAtTime(.001, time + .9);
    oscillator.connect(envelope); envelope.connect(this.gain); oscillator.start(); oscillator.stop(time + .9);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
}
