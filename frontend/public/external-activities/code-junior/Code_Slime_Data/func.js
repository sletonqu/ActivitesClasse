// the current script folder path
const PATH = document.currentScript.src.split('?')[0].split('/').slice(0, -1).join('/') + '/';
var Sound_arr=[], Img_arr=[];

// game audio library
const AudioHandle = {
  build(can){
    var t = this, local = window.location.protocol=='file:', o = local ? t.local : t.server;
    loadSound = o.loadSound;
    playSound = o.playSound;
    playMusic = o.playMusic;
    stopSound = o.stopSound;
    setSoundVolume = o.setSoundVolume;

    if(!local){
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      AudioHandle.can = can;
      // active the sound after first click, this step necessary for play audio in safari
      AudioHandle.can.addEventListener("mousedown", firstClick);
      AudioHandle.can.addEventListener("touchstart", firstClick);
      function firstClick() {
        for (var i = 0; i < Sound_arr.length; i++) {
          var s = Sound_arr[i];
          playSound(s);
          stopSound(s);
          s.src = s.src_name;
        }
        AudioHandle.can.removeEventListener("mousedown", firstClick);
        AudioHandle.can.removeEventListener("touchstart", firstClick);
      }
    }
  },
  // if you play from PC (not in host or localhost)
  local:{
    loadSound(src, len){
      len=len||1;
      const s = {a:[], i:0, len:len, ready:true, volume:1};
      for(var i = 0; i < len; i++) s.a.push(new Audio(src));
      Sound_arr.push(s);
      return s;
    },
    playSound(s, volume){
      s.a[0].loop=false; s.a[s.i].pause(); s.a[s.i].play();
      s.a[s.i].volume = volume!=undefined ? volume : s.volume;
      s.i=(s.i+1)%s.len;
    },
    playMusic(s, volume){
      s.a[0].loop=true; s.a[0].play();
      s.a[0].volume = volume!=undefined ? volume : s.volume;
    },
    stopSound(s){for (var a of s.a) {a.pause(); a.currentTime = 0;}},
    setSoundVolume(s, volume){
      s.volume = volume;
      for (var a of s.a) {a.volume = volume;}
    },
  },
  // else, if you play from host or localhost
  server:{
    loadSound(filename){
      var sound = {volume: 1, audioBuffer: null, ready:false};
      var ajax = new XMLHttpRequest();
      ajax.open("GET", filename, true);
      ajax.responseType = "arraybuffer";
      ajax.onload = function(){
        audioContext.decodeAudioData(ajax.response, function(buffer) {sound.audioBuffer = buffer; sound.ready=true;},function(error) {debugger});
      }
      ajax.onerror = function() {debugger};
      ajax.send();
      Sound_arr.push(sound);
      return sound;
    },
    playSound(sound, volume){
      if(!sound.audioBuffer) return false;

      var source = audioContext.createBufferSource();
      if(!source) return false;

      source.buffer = sound.audioBuffer;
      if(!source.start) source.start = source.noteOn;

      if(!source.start) return false;
      var gainNode = audioContext.createGain();
      gainNode.gain.value = sound.volume;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      source.loop=false;
      source.start(0);

      sound.gainNode = gainNode;
      sound.gainNode.gain.value = volume!=undefined ? volume : sound.volume;
      return true;
    },
    playMusic(sound, volume){
      if(!sound.audioBuffer) return false;

      var source = audioContext.createBufferSource();
      if(!source) return false;

      source.buffer = sound.audioBuffer;
      if(!source.start) source.start = source.noteOn;
      if(!source.start) return false;
      var gainNode = audioContext.createGain();
      gainNode.gain.value = sound.volume;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      source.loop=true;
      source.start(0);

      sound.gainNode = gainNode;
      sound.gainNode.gain.value = volume!=undefined ? volume : sound.volume;
      return true;
    },
    stopSound(sound){
      if(sound.gainNode) sound.gainNode.gain.value = 0;
    },
    setSoundVolume(sound, volume){
      sound.volume = volume;
      if(sound.gainNode) sound.gainNode.gain.value = volume;
    },
  },
};
AudioHandle.build(canvas);

// craete new image function
function newImage(src) {
  var m = new Image(); // craete image object
  m.src=PATH+src; // load image from the source
  Img_arr.push(m); // put the Img in Img_arr, Img_arr will be used later to check if all images inside it are full loaded from the giving source.
  return m; // return the image
}

// Mouse //
var mld = false, mlu = false, mlp = false, mrd = false, mru = false, mrp = false, mx=0,my=0;
const Mouse = {
  X: 0, Y: 0,
  MouseMove(e) {
    // Get x and y of Mouse on the canvas
    Mouse.GetXandY(e.clientX,e.clientY);
  },
  TouchMove(e){
    // Get x and y of Touch on the canvas
    if (e.type == "touchstart" || e.type == "touchend"){
      Mouse.GetXandY(e.changedTouches[0].pageX,e.changedTouches[0].pageY);
    }
    else if (e.type == "touchmove"){
      Mouse.GetXandY(e.targetTouches[0].pageX,e.targetTouches[0].pageY);
    }
  },
  GetXandY(mx,my){
    // Get x and y of mouse/touch on the canvas
    var s = can.getBoundingClientRect(),X,Y;
    X = Math.floor((mx - s.left) * CW / s.width);
    Y = Math.floor((my - s.top) * CH / s.height);
    // Update Mouse X and Y
    if (X != null && Y != null) { this.X = Math.floor((X-CX)/SCALE); this.Y = Math.floor((Y-CY)/SCALE); } // in case values is null from touch, we not going update Mouse X and Y
  },
  Down(key) { return this[key] == 1;}, // Check if mouse-click down
  Up(key) { return this[key] == 0;}, // Check if mouse-click up
  Press(key) { return this[key] > 0;}, // Check if mouse-click press
  Left:{
    i:-1,
    Down() { return this.i == 1;}, // Check if Left mouse-click down
    Up() { return this.i == 0;}, // Check if Left mouse-click up
    Press() { return this.i > 0;}, // Check if Left mouse-click press
    Update(){
      var t = this;
      if (t.i > 0) t.i = 2; else t.i = -1;
    },
  },
  Right:{
    i:-1,
    Down() { return this.i == 1;}, // Check if Right mouse-click down
    Up() { return this.i == 0;}, // Check if Right mouse-click up
    Press() { return this.i > 0;}, // Check if Right mouse-click press
    Update(){
      var t = this;
      if (t.i > 0) t.i = 2; else t.i = -1;
    },
  },
  UpdateShortKeys(){
    var t = this;
    mld = t.Left.Down(); mlu = t.Left.Up(); mlp = t.Left.Press();
    mrd = t.Right.Down(); mru = t.Right.Up(); mrp = t.Right.Press();
    mx=Math.floor(Mouse.X); my=Math.floor(Mouse.Y);
  },
  Update() {
    var t = this;
    // Update mouse left and right click (1- mean not clicked, 0 mean key is 'up', 1 mean key is 'down' also 'press', 2 mean key is 'press')
    t.Left.Update(); t.Right.Update();
  },
  MouseClick(e) {
    // Update Mouse-key when it is clicked
    // Get the clicked key
    var s;
    switch (e.which) {
      case 1: s = "Left"; break;
      case 3: s = "Right"; break;
      default: return;
    }
    this[s].i = e.type == 'mousedown' ? 1 : 0; // If mouse Event is 'mousedown' set the key to 1, else it should be 0 for 'mouseup'
  },
  /* Touches */TouchClick() { if (event.type == "touchstart") this.Left.i = 1; },
  // Check if mouse coordinates x and y is on the given Square x,y,w,h
  Square(x, y, w, h) { return this.X >= x && this.X < x + w && this.Y >= y && this.Y < y + h },
  newEventListener(cn){
    cn.addEventListener("mousemove", function () { Mouse.MouseMove(event, false) }, !1);
    cn.addEventListener("mousedown", function () { Mouse.MouseClick(event) }, !1);
    cn.addEventListener("mouseup", function () { Mouse.MouseClick(event) }, !1);
    /* Touches */cn.addEventListener("touchmove", function () { Mouse.TouchMove(event, true); event.preventDefault();}, !1);
    /* Touches */cn.addEventListener("touchstart", function () { Mouse.TouchMove(event,true); Mouse.TouchClick(); event.preventDefault(); }, !1);
    /* Touches */cn.addEventListener("touchend", function () { if (Mouse.Left.i != 0 && Mouse.Left.i != 1) { Mouse.Left.i = 0;} event.preventDefault(); }, !1);
    cn.tabIndex = 1;
  }
};

function ImageMeetImage(x1,y1,w1,h1,x2,y2,w2,h2){
  var x, y, w, h, i, j;
  if (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2) return true;
  return false;
};

function irandom(a) { return Math.round(Math.random() * a) }
function get_middle(x,x1,p) { return x*p+x1*(1-p); }
function point_direction(a, b, c, d) { return 180 * Math.atan2(d - b, c - a) / Math.PI }
function point_distance(a, b, c, d) { var e = a - c, f = b - d; return Math.sqrt(e * e + f * f) }
function DrawBtn(x,y,w,h,m){
  var r = Mouse.Square(x,y,w,h);
  ctx.globalAlpha = r?1:0.8;
  ctx.drawImage(m,x,y,w,h);
  ctx.globalAlpha = 1;
  return r;
}

const sys = {
  // Open Fullscreen
  openFullscreen() { var a = document.body; a.requestFullscreen ? a.requestFullscreen() : a.mozRequestFullScreen ? a.mozRequestFullScreen() : a.webkitRequestFullscreen ? a.webkitRequestFullscreen() : a.msRequestFullscreen && a.msRequestFullscreen(); }
  // Close Fullscreen
  , closeFullscreen() { var a = document; a.exitFullscreen ? a.exitFullscreen() : a.mozCancelFullScreen ? a.mozCancelFullScreen() : a.webkitExitFullscreen ? a.webkitExitFullscreen() : a.msExitFullscreen && a.msExitFullscreen(); }
  // Switch Fullscreen, if is in Fullscreen then close Fullscreen, else open Fullscreen
  , swithFullscreen() { sys.IsFullscreen() ? sys.closeFullscreen() : sys.openFullscreen() }
  // check if game in Fullscreen or not
  , IsFullscreen() {
    if(sys.IsMobile) return document.webkitCurrentFullScreenElement != null;
    return window.fullScreen || (window.innerHeight == screen.height);
  }
  // if the game is in mobile device
  ,IsMobile:typeof window.orientation !== 'undefined' ? true : false
}
