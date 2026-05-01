// Initialize canvas and 2D drawing context
const urlParams = new URLSearchParams(window.location.search);
const STORAGE_KEY = urlParams.get('storageKey') || "code_slime";

const can = canvas;
const ctx = can.getContext("2d");
// Define canvas dimensions and scaling variables
const W = 1280, H = 720, W2 = W / 2, H2 = H / 2;
// Define canvas dimensions and scaling variables
var CW = W, CH = H, CX, CY, DW = W, DH = H, DX = 1, DY = 1, SCALE = 1;
// Trigger resize adjustment on window resize
window.onresize = () => { G.needResize = true };

// Initialize custom mouse event listeners on the canvas
Mouse.newEventListener(can);

// Game state controller containing lifecycle methods and flags
const G = {
  state: "load",         // Main game state: 'load', 'game', 'menu', etc.
  state2: "main",        // Sub-state for detailed control: 'idle', 'drop', 'wheel', etc.

  sound: true,           // Whether game sound is enabled

  btn_c: {               // Central button state (used on title screen or in-game)
    x: 0,                // X position of the button
    y: 0,                // Y position of the button
    i: 0,                // Animation frame or visual state index
    active: false        // Whether the button is currently visible/usable
  },

  bg_y: 0,               // Background Y-offset for scrolling/parallax effect

  needResize: true,      // Flag to indicate canvas needs resizing on next frame

  now: 0,                // Current time snapshot for use in the main loop

  // Initializes and starts a new game session
  newGame() {
    // Set the main game state to 'game' to indicate active gameplay
    G.state = 'game';

    // Reset sub-state to 'idle', allowing player input or waiting for an action
    G.state2 = 'idle';

    // Deactivate central button (likely a start or interaction button)
    G.btn_c.active = false;

    // Reset the code system or command blocks
    C.reset();

    // Start or load the current level (usually based on level.i)
    Level.start();
  },

  // Called repeatedly until all assets are fully loaded
  run() { G.check_if_all_loaded() },

  // Continuously checks whether all image and sound assets have finished loading.
  // This function is called repeatedly each frame until all resources are ready.
  check_if_all_loaded() {
    // Loop through the image array and exit if any image is still not fully loaded
    for (const image of Img_arr) {
      if (!(image.complete && image.naturalHeight !== 0)) return;
    }

    // Loop through the sound array and exit if any sound isn't ready yet
    for (const sound of Sound_arr) {
      if (!sound.ready) return;
    }

    // All assets are now fully loaded
    // Replace G.run with G.loop to begin the main game loop
    G.run = G.loop;

    // Create a repeating texture pattern from a loaded image asset
    G.texture1 = ctx.createPattern(img.texture1, 'repeat');
  },

  // Main game loop: runs every frame after all assets are loaded
  loop() {
    G.now = new Date();         // Store current time snapshot (could be used for timers or animations)

    G.resizeCan();              // Resize canvas if flagged (maintains responsive layout)
    resetTransform();           // Reset and re-apply canvas transform for consistent rendering

    G.DrawBG();                 // Draw background (could be static or scrolling)

    // Call appropriate scene renderer based on current state
    if (G.state === 'game') G.DrawGame();   // In-game rendering
    else if (G.state === 'main') G.DrawMain();   // Level selection screen
    else if (G.state === 'load') G.DrawLoad();   // Title screen

    // Top-right buttons (fullscreen and sound toggle)
    // Fullscreen button
    if (DrawBtn(W - 65, 5, 60, 60, img.btn_fullscreen) && mld) {
      sys.swithFullscreen();    // Toggle fullscreen if clicked
    }

    // Sound toggle button
    if (DrawBtn(W - 130, 5, 60, 60, G.sound ? img.btn_sound_on : img.btn_sound_off) && mld) {
      G.sound = !G.sound;       // Toggle sound on/off
    }

    G.clear_borders();
  },

  // Renders the title screen before the player enters the main menu
  DrawLoad() {
    // Create a subtle bounce effect for the slime image
    let y = G.bg_y;
    y = (y > 50 ? 100 - y : y) / 2;

    // Draw bouncing slime mascot
    ctx.drawImage(img.big_slime, W / 2 - 247, 100 + y / 2);

    // Draw game title image with bounce
    ctx.drawImage(img.title, W / 2 - 350, 100 + y);

    // Draw the start button; if clicked, move to the main menu
    if (DrawBtn(W / 2 - 250, 500, 500, 130, img.start) && mld) {
      G.state = 'main';
    }
  },

  // Renders the main menu where player selects levels
  DrawMain() {
    const c = ctx;
    c.textAlign = "center";
    c.textBaseline = "top";
    c.font = "bold 60px font1";

    // Draw level selection title
    c.drawImage(img.select_level, W / 2 - 350, 15);

    // Draw grid of level buttons (8 columns x 4 rows)
    const levelData = Level.data;
    let n = 0;  // level index

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        const x = 85 + col * 140;
        const y = 150 + row * 140;
        G.draw_level_btn(x, y, n);  // Draw level button
        n++;
      }
    }
  },

  getMouseInCode() {
    const arr = C.arr;
    let closest = null;
    let minDistance = 1000;

    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];

      // Ignore if it's a code block
      if (a.t === 'code') continue;

      const baseX = a.x + 110;
      const baseY = a.y + 22 - wheel.y;

      // Check if mouse is over the main body of the item
      if (Mouse.Square(baseX, baseY, a.w, 69)) {

        // Handle 'repeat' type drop interaction
        if (a.t === 'repeat' && Mouse.Square(baseX + 150, a.y + 35 - wheel.y, 36, 36) && mld) {
          drop.start(a, 1, baseX + 150, a.y + 35 - wheel.y);
          return;
        }

        // Handle 'jump' type drop interactions
        if (a.t === 'jump') {
          if (Mouse.Square(baseX + 222, a.y + 40 - wheel.y, 36, 36) && mld) {
            drop.start(a, 2, baseX + 222, a.y + 40 - wheel.y);
            return;
          } else if (Mouse.Square(baseX + 310, a.y + 40 - wheel.y, 36, 36) && mld) {
            drop.start(a, 3, baseX + 310, a.y + 40 - wheel.y);
            return;
          }
        }

        // Track the closest interactable item
        const dist = point_distance(baseX, baseY, mx, my);
        if (dist < minDistance) {
          closest = a;
          minDistance = dist;
        }
      }
    }

    // Start dragging the closest item if clicked
    if (closest && mld) {
      C.startDrag(closest);
    }
  },

  getCodeInCode() {
    const arr = C.arr;
    const dragged = C.drag;
    const dragX = dragged.x;
    const dragY = dragged.y - 69; // Adjust drag Y to match block alignment
    const dragW = 69;
    let closest = null;
    let minDistance = 1000;
    let dragInInside = false;

    for (let i = 0; i < arr.length; i++) {
      const target = arr[i];
      if (target === dragged) continue; // Skip self

      const targetX = target.x;
      const targetY = target.y;
      const targetH = target.h;

      if (target.t === 'repeat') {
        // Check top-insert area (inside the repeat block)
        if (ImageMeetImage(dragX, dragY, dragW, 69, targetX + 45, targetY, 100, 30)) {
          const dist = point_distance(dragX, dragY, targetX, targetY);
          if (dist < minDistance) {
            closest = target;
            minDistance = dist;
            dragInInside = true;
          }
        }

        // Check bottom-insert area (after the repeat block)
        if (ImageMeetImage(dragX, dragY, dragW, 69, targetX, targetY + targetH - 69, 100, 30)) {
          const dist = point_distance(dragX, dragY, targetX, targetY);
          if (dist < minDistance) {
            closest = target;
            minDistance = dist;
            dragInInside = false;
          }
        }
      } else {
        // For non-repeat blocks, only check bottom insert area
        if (ImageMeetImage(dragX, dragY, dragW, 69, targetX, targetY, 100, 30)) {
          const dist = point_distance(dragX, dragY, targetX, targetY);
          if (dist < minDistance) {
            closest = target;
            minDistance = dist;
            dragInInside = false;
          }
        }
      }
    }

    // Set pointer position based on where the insert will happen
    if (closest) {
      if (dragInInside) {
        pointer.start(closest.x + 110 + 45, closest.y + 69); // Inside repeat block
      } else {
        pointer.start(closest.x + 110, closest.y + closest.h); // Below the block
      }
    } else {
      pointer.end(); // No valid target, hide pointer
    }

    // Save state for use elsewhere
    C.dragInCode = closest;
    C.dragInInside = dragInInside;
  },

  // Renders the main game interface, including block editing, drag-drop, and toolbars
  DrawGame() {
    // Setup drawing context
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "bold 40px font1";
    ctx.fillStyle = "#000";

    // Check for block hovering or selection when idle
    if (G.state2 === 'idle') G.getMouseInCode();

    // Dragging logic for a code block
    if (G.state2 === 'drag') {
      const block = C.drag;
      block.x = mx + C.drag_x;
      block.y = my + C.drag_y;

      // Update internal counting reference (for nested code logic)
      C.reCount2(block, { x: block.x, y: block.y, cnt: 0 });

      // Check where the block is being dragged to
      G.getCodeInCode();

      // If mouse released during drag, drop the block
      if (mlu) {
        C.endDrag();
        pointer.end();
      }
    }

    // Scroll logic: activate wheel if clicked inside scroll zone
    if (G.state2 === 'idle' && mld && Mouse.Square(110, 0, 520, H)) {
      wheel.start();
    }

    if (G.state2 === 'wheel') {
      wheel.update();
      if (mlu) wheel.end();
    }

    // Draw static background images
    ctx.drawImage(img.bg_left, 0, 0);
    C.Draw();         // Draw all code blocks
    wheel.draw();     // Draw scrollbar if active

    // Draw insertion pointer (used during dragging)
    if (pointer.active) {
      const p = pointer;
      ctx.drawImage(img.code_pointer, p.x, p.y - wheel.y);
    }

    // Draw dropdown menu if active
    if (G.state2 === 'drop') {
      drop.draw();
    }

    // Right-side UI panel
    ctx.drawImage(img.bg_right, W - 650, 0, 650, H);

    // Draw vertical block toolbar on the left
    for (let i = 0, len = Level.limit_types; i < len; i++) {
      G.btn(left_btn[i].m, 5, 5 + i * 104);

      // On click, activate toolbar button
      if (Mouse.Square(5, 5 + i * 104, 100, 100) && mld && G.state2 === 'idle') {
        G.btn_c.active = true;
        G.btn_c.x = mx;
        G.btn_c.y = my;
        G.btn_c.i = i;
      }
    }

    // Handle block drag from toolbar
    if (G.btn_c.active) {
      if (mlu) {
        G.btn_c.active = false;
      } else if (mlp && point_distance(mx, my, G.btn_c.x, G.btn_c.y) > 10) {
        G.btn_c.active = false;

        // Add new block at calculated position
        const newBlock = C.addNew(left_btn[G.btn_c.i].t, mx - 130, my - 40 + wheel.y);
        C.startDrag(newBlock);
      }
    }

    // Draw delete button
    ctx.drawImage(img.delete, obj_delete.x, obj_delete.y, 65, 65);

    // Update current level state (block execution, target checking, etc.)
    Level.update();

    // Start executing code if player clicks the first block
    if ((G.state2 === 'idle' || G.state2 === 'wheel') && Mouse.Square(C.list[0].x + 110, C.list[0].y + 22 - wheel.y, C.list[0].w, 69) && mld) {
      G.StartCode();
    }

    // Update tutorial overlay if present
    Tutorial.update();

    // Draw home button (bottom-right corner)
    if (DrawBtn(W - 65, H - 65, 60, 60, img.btn_home) && mld) {
      G.state = 'main'; // Return to main menu
    }
  },

  // Draws a layered background with a texture scrolling effect
  DrawBG() {
    // Draw base background
    ctx.drawImage(img.bg, 0, 0, W, H);

    // Apply scrolling texture overlay
    ctx.translate(0, G.bg_y);           // Shift Y for parallax
    ctx.fillStyle = G.texture1;         // Use repeating texture
    ctx.fillRect(0, -G.bg_y, W, H);     // Fill with texture
    G.bg_y = (G.bg_y + 0.75) % 98;      // Loop background Y movement

    // Reset canvas transform so it doesn't affect other drawings
    resetTransform();
  },

  // Draws a toolbar button with a base and overlay icon
  btn(iconKey, x, y) {
    ctx.drawImage(img.btn, x, y);               // Draw button background
    ctx.drawImage(img[iconKey], x + 15, y + 12); // Draw specific icon inside the button
  },


  // Draws a level selection button at (x, y) for level number n
  draw_level_btn(x, y, n) {
    const data = Level.data[n];
    const c = ctx;
    const isUnlocked = data.win;
    const boxSize = 130;
    const centerX = x + boxSize / 2;
    const labelY = y + 10;
    const levelNum = n + 1;

    // If the level is locked
    if (!isUnlocked) {
      // Draw the inactive box
      c.drawImage(img.level_box_deactivate, x, y, boxSize, boxSize);

      // Draw level number with a stroked outline
      c.strokeStyle = "#fff";
      c.lineWidth = 2;
      c.strokeText(levelNum, centerX, labelY);

      // Fill the level number with dark red
      c.fillStyle = "#200";
      c.fillText(levelNum, centerX, labelY);
      return;
    }

    // If the level is unlocked
    // Draw the active level box
    c.drawImage(img.level_box_active, x, y, boxSize, boxSize);

    // Check if mouse is hovering over the button
    const isHovered = Mouse.Square(x, y, boxSize, boxSize);
    c.fillStyle = isHovered ? "#0f0" : "#fff";

    if (isHovered) {
      // Highlight the number on hover
      c.strokeStyle = "#0a6";
      c.lineWidth = 5;
      c.strokeText(levelNum, centerX, labelY);

      // If clicked, set this level and start the game
      if (mld) {
        Level.i = n;
        // Start a new game: set state, reset UI, and begin level
        G.newGame();
      }
    }

    // Draw the level number
    c.fillText(levelNum, centerX, labelY);

    // Draw stars based on performance (filled or empty)
    for (let i = 0; i < 3; i++) {
      const starX = x + 35 * i + 10;
      const starY = y + 60 + (i % 2) * 10;
      const starImg = i < data.star ? img.star : img.star_x;
      c.drawImage(starImg, starX, starY, 40, 40);
    }
  },

  StartCode() { C.getMovement() },

  // Resizes the canvas to match the window while maintaining aspect ratio
  resizeCan() {
    if (G.needResize) {
      let w, h;

      // Get actual window size
      w = CW = can.width = window.innerWidth;
      h = CH = can.height = window.innerHeight;

      // Maintain the aspect ratio (W / H is the original game resolution ratio)
      if (w / h > W / H) {
        // Window is wider than game's aspect ratio → adjust width
        const ratioScale = (W / H) / (w / h);
        w = Math.floor(w * ratioScale);
        SCALE = h / H;
      } else {
        // Window is taller or equal → adjust height
        const ratioScale = (H / W) / (h / w);
        h = Math.floor(h * ratioScale);
        SCALE = w / W;
      }

      // Compute top-left offset to center game canvas inside available space
      CX = Math.floor((CW - w) / 2);   // Canvas X offset
      CY = Math.floor((CH - h) / 2);   // Canvas Y offset

      // DX and DY are used in drawing transforms (offset in scaled space)
      DX = Math.floor(CX / SCALE);
      DY = Math.floor(CY / SCALE);

      // Scaled drawing width and height
      DW = w;
      DH = h;

      // Mark resizing as done
      G.needResize = false;
    }
  },

  clear_borders() {
    var c = ctx;
    c.fillStyle = '#000';
    c.globalCompositeOperation = 'destination-in';
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  },
};

// Plays a sound by key 's' only if sound is enabled
function Psound(s) {
  if (G.sound) playSound(sound[s]); // Play sound from sound[s] if G.sound is true
}

// Resets and reapplies the canvas transformation (position and zoom)
function resetTransform() {
  var c = ctx;
  c.resetTransform();     // Clear all previous transforms (scale, translate, etc.)
  c.translate(CX, CY);    // Move origin to center or defined offset (CX, CY)
  c.scale(SCALE, SCALE);  // Apply scaling (zoom)
}

const drop = {
  x: 0,
  y: 0,
  c: null,
  type: 1,
  active: false,

  // Initialize the drop menu
  start(component, type, x, y) {
    this.c = component;
    this.type = type;
    this.x = x;
    this.y = y;
    this.active = true;
    G.state2 = 'drop';
    mld = mlu = mlp = false;
  },

  // End the drop menu
  end() {
    this.active = false;
    G.state2 = 'idle';
  },

  // Draw the drop menu
  draw() {
    const d = this;
    const ctxYStart = d.y + 36;

    // Utility to draw a row and handle click
    const drawRow = (count, getKey) => {
      ctx.fillStyle = 'white';
      ctx.fillRect(d.x, ctxYStart, 36, 36 * count);

      for (let i = 0; i < count; i++) {
        const value = getKey(i);
        const imgKey = typeof value === 'number' ? `n_${value}` : `n_${value}`;
        const itemY = ctxYStart + 36 * (i + 1);

        ctx.drawImage(img[imgKey], d.x, itemY);

        if (mld && Mouse.Square(d.x, itemY, 36, 36)) {
          if (d.type === 1 || d.type === 2) d.c.times = value;
          else if (d.type === 3) d.c.way = value;
        }
      }
    };

    // Handle different dropdown types
    if (d.type === 1) drawRow(4, i => i + 2); // times: 2 to 5
    else if (d.type === 2) drawRow(2, i => i + 1); // times: 1 to 2
    else if (d.type === 3) drawRow(4, i => ['u', 'd', 'l', 'r'][i]); // directions

    // Close menu if clicked
    if (mld) d.end();
  },
};
const pointer = {
  active: false,
  x: 0,
  y: 0,

  // Activate the pointer at a specific position
  start(x, y) {
    this.active = true;
    this.x = x;
    this.y = y;
  },

  // Deactivate the pointer
  end() {
    this.active = false;
  },
};
const left_btn = [
  { m: 'symbol_u', t: 'u' },
  { m: 'symbol_d', t: 'd' },
  { m: 'symbol_r', t: 'r' },
  { m: 'symbol_l', t: 'l' },
  { m: 'symbol_repeat', t: 'repeat' },
  { m: 'symbol_jump', t: 'jump' },
];
const obj_delete = { x: 20, y: 650, w: 75 };
const wheel = {
  active: false,
  y: 0,        // Current scroll position
  y2: 0,       // Starting scroll position before drag
  max: 400,    // Maximum scroll limit
  my: 0,       // Mouse Y at scroll start

  // Resets the scroll state
  reset() {
    this.active = false;
    this.y = 0;
    this.max = 0;
  },

  // Begins a scroll action
  start() {
    this.active = true;
    this.my = my;
    this.y2 = this.y;
    G.state2 = 'wheel';
  },

  // Ends the scroll action
  end() {
    this.active = false;
    G.state2 = 'idle';
  },

  // Updates scroll position based on mouse movement
  update() {
    this.y = this.y2 - (my - this.my);
    if (this.y < 0) this.y = 0;
    else if (this.y > this.max) this.y = this.max;
  },

  // Draws the scroll bar
  draw() {
    if (this.max <= 0) return;

    const barWidth = 25;
    const x = 605; // 630 - barWidth
    const h = H - (H * (this.max / H)); // Scaled height based on scrollable area
    const y = this.y;

    // Draw top cap
    ctx.drawImage(img.wheel, 0, 0, 25, 13, x, y, barWidth, 13);

    // Draw bottom cap
    ctx.drawImage(img.wheel, 0, 12, 25, 13, x, y + h - 12, barWidth, 13);

    // Draw middle stretch
    ctx.drawImage(img.wheel, 0, 12, 25, 1, x, y + 13, barWidth, h - 25);
  },

  // Recalculates max scroll distance based on elements
  reMax(y) {
    const arr = C.arr;
    let maxScroll = 0;

    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const bottom = item.y + item.h + 150;
      if (bottom > H + maxScroll) {
        maxScroll = bottom - H;
      }
    }

    this.max = maxScroll;
    if (this.y > maxScroll) this.y = maxScroll;
  },
};
const C = {
  list: [],            // Top-level code blocks currently active in the editor
  arr: [],             // All code blocks created (used for global access or cleanup)

  drag: null,          // Block currently being dragged by the user
  dragInCode: null,    // Potential drop target block during drag operation
  dragInInside: false, // True if the dragged block is targeting an "inside" slot (e.g. inside a repeat)

  isDrag: false,       // Whether a block is currently being dragged

  cnt: 0,              // Number of code blocks in the active sequence (used for execution prep)
  id: 0,               // Unique ID assigned to each newly created block

  // Resets the block system to its initial state
  reset() {
    // Clear current blocks from the workspace
    this.list = [];

    // Clear all blocks that were ever created
    this.arr = [];

    // Clear any dragging state
    this.drag = null;
    this.isDrag = false;
    this.dragInCode = null;
    this.dragInInside = false;

    // Reset the block execution counter
    this.cnt = 0;

    // Add the root 'code' block at position (10, 10)
    // This is the base block that all others connect to
    const b_code = this.addNew('code', 10, 10);

    // Set its ID explicitly to "code" so it can be referenced later by name
    b_code.id = "code";
  },

  // Deletes a block and any linked blocks (next or inside)
  delete(c) {
    // Remove the block from the global array
    const i = this.arr.indexOf(c);
    if (i > -1) this.arr.splice(i, 1);

    // Recursively delete any block connected as "next"
    if (c.next) C.delete(c.next);

    // Recursively delete any block inside (used for 'repeat')
    if (c.inside) C.delete(c.inside);
  },

  // Initiates dragging of a block
  startDrag(c) {
    // Prevent dragging the root 'code' block
    if (c.t === 'code') return;

    // Clear previous drag target
    this.dragInCode = null;
    this.dragInInside = false;

    // Activate dragging
    this.isDrag = true;
    this.drag = c;

    // Save drag offset to maintain cursor alignment
    this.drag_x = c.x - mx;
    this.drag_y = c.y - my;

    // If block is attached to another, detach it
    if (c.parent) {
      if (c.inInside) {
        c.parent.inside = undefined;
        c.inInside = false;
      } else {
        c.parent.next = undefined;
      }
      c.parent = undefined;

      // Promote to top-level block so it's still tracked
      this.list.push(c);
    }

    // Switch to 'drag' mode
    G.state2 = 'drag';

    // Recalculate block positions
    C.reCount();
  },

  // Ends the current drag action and determines where to place or discard the block
  endDrag() {
    this.isDrag = false;
    const d = this.drag;

    if (this.dragInCode) {
      // Drop the block into its new parent (inside or next)
      if (this.dragInInside) this.addInside(d, this.dragInCode);
      else this.addTo(d, this.dragInCode);
    } else if (Mouse.Square(obj_delete.x, obj_delete.y, obj_delete.w, obj_delete.w)) {
      // If dropped over the trash/delete area, remove it
      const i = this.list.indexOf(d);
      if (i > -1) this.list.splice(i, 1);
      C.delete(d);
    } else {
      // Otherwise, just drop it freely in bounds
      if (d.x < 0) d.x = 0;
      if (d.x > 350) d.x = 350;
      if (d.y < 0) d.y = 0;
    }

    // Switch back to idle mode
    G.state2 = 'idle';

    // Recalculate layout
    C.reCount();
  },

  // Recursively returns the last connected block in a sequence
  getLastCode(c) {
    return c.next ? C.getLastCode(c.next) : c;
  },

  // Adds block 'c' as a sequential block (next) after target block 't'
  addTo(c, t) {
    if (t.next === undefined) {
      // If target has no next, just attach directly
      t.next = c;
    } else {
      // If target already has a next block, push existing chain after new one
      const last = C.getLastCode(c);
      t.next.parent = last;
      last.next = t.next;
      t.next = c;
    }

    // Remove from top-level list if it was not already inside something
    if (c.parent === undefined) {
      const i = this.list.indexOf(c);
      if (i > -1) this.list.splice(i, 1);
    }

    c.parent = t;
    c.inInside = false;

    // Recalculate all block positions
    this.reCount();
  },

  // Adds block 'c' inside the repeat block 't' (if applicable)
  addInside(c, t) {
    if (t.t !== 'repeat') return; // Only repeat blocks can hold "inside"

    if (t.inside === undefined) {
      // If inside slot is empty, attach directly
      t.inside = c;
    } else {
      // Otherwise, push existing inside chain after new one
      const last = C.getLastCode(c);
      t.inside.parent = last;
      t.inside.inInside = false;
      last.next = t.inside;
      t.inside = c;
    }

    // Remove from top-level list if necessary
    if (c.parent === undefined) {
      const i = this.list.indexOf(c);
      if (i > -1) this.list.splice(i, 1);
    }

    c.parent = t;
    c.inInside = true;

    // Recalculate all block positions
    this.reCount();
  },

  // Creates a new code block of type 't' at position (x, y)
  addNew(t, x, y) {
    let obj;

    switch (t) {
      case 'u':
      case 'd':
      case 'l':
      case 'r':
        obj = { t: 'arrow', h: 74, w: 200, t1: t }; break;
      case 'repeat':
        obj = { t: 'repeat', h: 134, w: 260, times: 2 }; break;
      case 'jump':
        obj = { t: 'jump', h: 74, w: 355, way: 'u', times: 1 }; break;
      case 'code':
        obj = { t: 'code', h: 74, w: 200 }; break;
    }

    // Set block position and metadata
    obj.x = x;
    obj.y = y;
    obj.id = this.id++;
    obj.inInside = false;

    // Track it globally and as top-level
    this.list.push(obj);
    this.arr.push(obj);

    // Recalculate block layout
    this.reCount();

    return obj;
  },

  // Builds a predefined tutorial sequence of blocks
  addnew_tutorial(tl) {
    const t = this;

    // Create first block
    let base = t.addNew(tl.pieces[0].t, tl.x, tl.y);
    base.id = tl.id;

    // Attach it to the main block if required
    if (tl.insideMainBlock) {
      const mainBlock = t.arr.find(o => o.id === "code");
      t.addTo(base, mainBlock);
    }

    // Handle nested blocks (inside repeat)
    if (tl.pieces[0].inside) {
      let current = base;
      for (let j = 0; j < tl.pieces[0].inside.length; j++) {
        const subType = tl.pieces[0].inside[j];
        const newInside = t.addNew(subType, tl.x, tl.y);
        t.addInside(newInside, current);
        current = newInside;
      }
    }

    // Attach remaining blocks sequentially
    for (let i = 1; i < tl.pieces.length; i++) {
      const part = tl.pieces[i];
      const newBlock = t.addNew(part.t, tl.x, tl.y);
      t.addTo(newBlock, base);
      base = newBlock;
    }
  },

  // Draws all top-level blocks from the workspace list
  Draw() {
    const blocks = this.list;

    // Loop through and draw each block by type
    for (let i = 0, len = blocks.length; i < len; i++) {
      const block = blocks[i];
      switch (block.t) {
        case 'arrow': this.DrawArrow(block); break;
        case 'repeat': this.DrawRepeat(block); break;
        case 'jump': this.DrawJump(block); break;
        case 'code': this.DrawCode(block); break;
      }
    }

    // Legacy debug map (disabled with early return)
    return;

    // Optional: draw internal structure as text for debugging
    const loc = { x: 400, y: 100 };
    ctx.fillStyle = 'black';
    for (let i = 0; i < blocks.length; i++) {
      this.DrawAMap(blocks[i], loc);
      loc.y += 20;
    }
  },

  // Draws the main 'code' block and its next connection
  DrawCode(c) {
    ctx.drawImage(img.code_start, 110 + c.x, c.y - wheel.y);

    // Draw connected next block if exists
    if (c.next !== undefined) {
      switch (c.next.t) {
        case 'arrow': this.DrawArrow(c.next); break;
        case 'repeat': this.DrawRepeat(c.next); break;
        case 'jump': this.DrawJump(c.next); break;
      }
    }
  },

  // Draws an 'arrow' movement block and its label
  DrawArrow(c) {
    ctx.drawImage(img.code_arrow, 110 + c.x, c.y - wheel.y);

    // Draw directional symbol and label (e.g., up/down/left/right)
    ctx.drawImage(img['symbol_' + c.t1], 110 + c.x + 40, c.y + 30 - wheel.y, 60, 60);
    ctx.drawImage(img['w_' + c.t1], 110 + c.x + 100, c.y + 40 - wheel.y);

    // Draw next block if connected
    if (c.next !== undefined) {
      switch (c.next.t) {
        case 'arrow': this.DrawArrow(c.next); break;
        case 'repeat': this.DrawRepeat(c.next); break;
        case 'jump': this.DrawJump(c.next); break;
      }
    }
  },

  // Draws a 'repeat' loop block, its nested content, and next connection
  DrawRepeat(c) {
    ctx.drawImage(img.code_repeat, 110 + c.x, c.y - wheel.y);
    ctx.drawImage(img.symbol_repeat, 110 + c.x + 10, c.y + 30 - wheel.y, 50, 50);
    ctx.drawImage(img['n_' + c.times], 110 + c.x + 150, c.y + 35 - wheel.y);

    const innerHeight = c.h - (74 + 60);

    // Stretch middle section if needed
    if (innerHeight > 0) {
      ctx.drawImage(img.code_repeat_p1, 110 + c.x, c.y + 106 - wheel.y - 1, 46, innerHeight + 1);
    }

    // Draw repeat bottom cap
    ctx.drawImage(img.code_repeat_p2, 110 + c.x, c.y + 106 + innerHeight - wheel.y - 1);

    // Draw nested inside block if exists
    if (c.inside !== undefined) {
      switch (c.inside.t) {
        case 'arrow': this.DrawArrow(c.inside); break;
        case 'repeat': this.DrawRepeat(c.inside); break;
        case 'jump': this.DrawJump(c.inside); break;
      }
    }

    // Draw connected next block if exists
    if (c.next !== undefined) {
      switch (c.next.t) {
        case 'arrow': this.DrawArrow(c.next); break;
        case 'repeat': this.DrawRepeat(c.next); break;
        case 'jump': this.DrawJump(c.next); break;
      }
    }
  },

  // Draws a 'jump' block with direction and times, plus next if any
  DrawJump(c) {
    ctx.drawImage(img.code_jump, 110 + c.x, c.y - wheel.y);

    // Draw the jump symbol and settings
    ctx.drawImage(img.symbol_jump, 110 + c.x + 40, c.y + 20 - wheel.y, 60, 60);
    ctx.drawImage(img['n_' + c.times], 110 + c.x + 222, c.y + 40 - wheel.y);
    ctx.drawImage(img['n_' + c.way], 110 + c.x + 310, c.y + 40 - wheel.y);

    // Draw next block if exists
    if (c.next !== undefined) {
      switch (c.next.t) {
        case 'arrow': this.DrawArrow(c.next); break;
        case 'repeat': this.DrawRepeat(c.next); break;
        case 'jump': this.DrawJump(c.next); break;
      }
    }
  },

  // Recursively prints the structure of a code chain (for debugging)
  DrawAMap(c, loc) {
    // Print current block type, id, next id, and parent id
    ctx.fillText(
      `${c.t}[${c.id}]  n[${c.next ? c.next.id : ''}]  p[${c.parent ? c.parent.id : ''}]`,
      loc.x,
      loc.y
    );
    loc.y += 20;

    // Print inside structure if present (for repeat blocks)
    if (c.inside) {
      loc.x += 5;
      ctx.fillText('[', loc.x, loc.y); loc.y += 20;
      this.DrawAMap(c.inside, loc);
      ctx.fillText(']', loc.x, loc.y); loc.y += 20;
      loc.x -= 5;
    }

    // Recursively print next connected blocks
    if (c.next) {
      loc.x += 5;
      this.DrawAMap(c.next, loc);
      loc.x -= 5;
    }
  },

  // Recalculates position and height of all blocks, and updates block count
  reCount() {
    const topBlocks = this.list;

    for (let i = 0; i < topBlocks.length; i++) {
      const block = topBlocks[i];

      // Start positioning from the block's x/y, and count from 0
      const loc = { x: block.x, y: block.y, cnt: 0 };
      this.reCount2(block, loc);

      // Store total block count (used for execution)
      if (i === 0) this.cnt = loc.cnt;
    }

    // Update scrollbar range based on layout
    wheel.reMax();
  },

  // Recursively updates block position and height based on layout
  reCount2(c, loc) {
    c.x = loc.x;
    c.y = loc.y;

    // Increment execution count (excluding the root code block)
    if (c.t !== 'code') loc.cnt++;

    if (c.t === 'repeat') {
      const baseHeight = 74 + 60;
      loc.y += baseHeight;

      if (c.inside) {
        // Position inside block with indentation
        loc.y -= 60; loc.x += 45;
        this.reCount2(c.inside, loc);
        loc.y += 60; loc.x -= 45;

        // Adjust container height based on inside content
        const innerHeight = loc.y - c.y - baseHeight;
        loc.y = c.y + baseHeight + innerHeight;
        c.h = baseHeight + innerHeight;
      } else {
        c.h = baseHeight;
      }
    } else {
      loc.y += c.h;
    }

    // Recurse into the next block
    if (c.next) {
      this.reCount2(c.next, loc);
    }
  },

  // Generates the execution movement sequence based on current code chain
  getMovement() {
    if (this.cnt === 0) return; // No code blocks present

    const start = this.list[0].next;
    const sequence = { m: [] };

    this.getMovement2(start, sequence);

    // Store execution sequence in Level object
    Level.o = sequence;

    // Set state to play mode (start simulation)
    G.state2 = 'play';
  },

  // Recursively builds movement instructions from the code blocks
  getMovement2(c, o) {
    switch (c.t) {
      case 'arrow':
        o.m.push({ t: 'arrow', way: c.t1, time: 20 });
        break;

      case 'repeat':
        for (let i = 0; i < c.times; i++) {
          if (c.inside) this.getMovement2(c.inside, o);
        }
        break;

      case 'jump':
        o.m.push({ t: 'jump', times: c.times, way: c.way, time: 20 });
        break;
    }

    // Continue to next block in chain
    if (c.next) this.getMovement2(c.next, o);
  },
}

// =====================================
// Tutorial System – Interactive Guidance
// =====================================
const Tutorial = {
  // Mapping from block types to their position index in the toolbar
  left_btn: { 'u': 0, 'd': 1, 'r': 2, 'l': 3, 'repeat': 4, 'jump': 5 },

  active: false, // Whether the tutorial is currently active

  // Starts the tutorial with given tutorial data (tl)
  start(tl) {
    const t = this;
    t.active = true;
    t.tl = tl;             // Store tutorial data
    t.step_i = 0;          // Start at the first step
    t.step = tl.step[0];   // Load the first step

    // If not just an info display, create blocks required for the tutorial
    if (!tl.justInfo) {
      C.addnew_tutorial(tl);
    }
  },

  // Proceeds to the next tutorial step or ends if none left
  next_step() {
    const t = this;
    const tl = t.tl;

    t.step_i++;

    if (tl.step[t.step_i]) {
      t.step = tl.step[t.step_i]; // Load next step
    } else {
      t.active = false; // Tutorial finished
    }
  },

  // Resets and deactivates the tutorial
  reset() {
    this.active = false;
  },

  // Updates the tutorial visuals every frame
  update() {
    if (!Tutorial.active) return;

    const t = this;
    const { tl, step } = t;

    t.draw_info(); // Show instruction text

    if (!tl.justInfo) {
      t.draw_step(); // Show animated hand movement (if applicable)
    }
  },

  // Draws instructional text at the bottom right
  draw_info() {
    const t = this;
    const { tl, step } = t;
    const c = ctx;

    c.textAlign = "center";
    c.textBaseline = "top";
    c.font = "bold 30px font1";
    c.fillStyle = "#fff";

    const x1 = W2 + W2 / 2;
    let y1 = H - 90;

    for (const line of step.text) {
      c.fillText(line, x1, y1);
      y1 += 35;
    }
  },

  // Draws animated visual instruction (moving hand icon)
  draw_step() {
    const t = this;
    const { step } = t;
    const c = ctx;

    const from = t.get_target(step.from);
    const to = t.get_target(step.to);

    if (from.exist && to.exist) {
      // Animation alpha pulsing (fades in and out)
      let alphaPulse = (G.now / 1000) % 1;
      alphaPulse = alphaPulse > 0.5 ? 1 - alphaPulse : alphaPulse;
      c.globalAlpha = 0.25 + alphaPulse;

      // Interpolated hand position between from and to
      const pct = (G.now / 2000) % 1;
      const x1 = from.x * (1 - pct) + to.x * pct;
      const y1 = from.y * (1 - pct) + to.y * pct;

      // Draw hand icon
      c.drawImage(img.hand, x1 - 20, y1 - 15, 100, 100);

      // Step auto-progression checks
      if (step.test.type === "addTo") {
        if (to.b.next?.t === step.test.t) t.next_step();
      } else if (step.test.type === "runCode") {
        if (G.state2 === 'play') t.next_step();
      } else if (step.test.type === "repeat") {
        if (from.b.times === step.test.n) t.next_step();
      }

      c.globalAlpha = 1;
    }
  },

  // Gets a visual target location for the tutorial step
  get_target(d) {
    const t = this;
    const result = {};

    if (d.type === "new") {
      // Target is a button in the left toolbar
      const i = t.left_btn[d.t];
      const x = 5, y = 5 + i * 104;
      result.x = x + 45;
      result.y = y + 45;
      result.exist = true;

    } else if (d.type === "block") {
      // Target is an existing block in the workspace
      const block = C.arr.find(o => o.id === d.id);
      if (block) {
        result.x = block.x + 110 + 25;
        result.y = block.y - wheel.y + 40;
        result.b = block;
        result.exist = true;
      }
    }

    return result;
  },
};

// Load all Sounds effects
var sound = {
  win: loadSound(PATH + "sounds/win.wav"),
  lose: loadSound(PATH + "sounds/lose.mp3"),
  walk: loadSound(PATH + "sounds/walk.wav", 3),
  coin: loadSound(PATH + "sounds/coin.wav", 3),
  jump: loadSound(PATH + "sounds/jump.wav", 3),
};

// Load all Images
var img = {
  btn_home: newImage('btn_home.png'),
  btn_sound_off: newImage('btn_sound_off.png'),
  btn_sound_on: newImage('btn_sound_on.png'),
  btn_fullscreen: newImage('btn_fullscreen.png'),
  star: newImage('star.png'),
  star_x: newImage('star_x.png'),
  shadow: newImage('shadow.png'),
  coin: newImage('coin.png'),
  win: newImage('win.png'),
  block: newImage('block.png'),
  code_pointer: newImage('code_pointer.png'),
  bg: newImage('bg.png'),
  texture1: newImage('texture1.png'),
  table: newImage('table.png'),
  btn: newImage('btn.png'),
  code_start: newImage('code_start.png'),
  code_arrow: newImage('code_arrow.png'),
  code_jump: newImage('code_jump.png'),
  code_repeat: newImage('code_repeat.png'), code_repeat_p1: newImage('code_repeat_p1.png'), code_repeat_p2: newImage('code_repeat_p2.png'),
  symbol_u: newImage('symbol_u.png'),
  symbol_d: newImage('symbol_d.png'),
  symbol_r: newImage('symbol_r.png'),
  symbol_l: newImage('symbol_l.png'),
  symbol_repeat: newImage('symbol_repeat.png'),
  symbol_jump: newImage('symbol_jump.png'),
  w_u: newImage('w_u.png'),
  w_d: newImage('w_d.png'),
  w_r: newImage('w_r.png'),
  w_l: newImage('w_l.png'),
  n_1: newImage('n_1.png'), n_2: newImage('n_2.png'), n_3: newImage('n_3.png'), n_4: newImage('n_4.png'), n_5: newImage('n_5.png'),
  n_u: newImage('n_u.png'), n_d: newImage('n_d.png'), n_r: newImage('n_r.png'), n_l: newImage('n_l.png'),
  bg_left: newImage('bg_left.png'),
  bg_right: newImage('bg_right.png'),
  delete: newImage('delete.png'),
  wheel: newImage('wheel.png'),
  slime: {
    d1: newImage('slime/d1.png'),
    d2: newImage('slime/d2.png'),
    d3: newImage('slime/d3.png'),
    u1: newImage('slime/u1.png'),
    u2: newImage('slime/u2.png'),
    u3: newImage('slime/u3.png'),
    l1: newImage('slime/l1.png'),
    l2: newImage('slime/l2.png'),
    l3: newImage('slime/l3.png'),
    r1: newImage('slime/r1.png'),
    r2: newImage('slime/r2.png'),
    r3: newImage('slime/r3.png'),
  },
  big_slime: newImage('big_slime.png'),
  title: newImage('title.png'),
  start: newImage('start.png'),
  select_level: newImage('select_level.png'),
  box: newImage('box.png'),
  btn_replay: newImage('btn_replay.png'),
  btn_next: newImage('btn_next.png'),
  btn_main: newImage('btn_main.png'),

  level_box_active: newImage('level_box_active.png'),
  level_box_deactivate: newImage('level_box_deactivate.png'),
  hand: newImage('hand.png'),
};

const slime_img = {
  m: 'down',            // Current facing direction: 'up', 'down', 'left', 'right'
  state: 'idle',        // Current animation state: 'idle', 'walk', 'jump'
  i: 0,                 // Animation frame index (can be float for smoother walk cycle)

  // Animation frame arrays for each direction
  down: [img.slime.d1, img.slime.d2, img.slime.d3, img.slime.d2],
  up: [img.slime.u1, img.slime.u2, img.slime.u3, img.slime.u2],
  left: [img.slime.l1, img.slime.l2, img.slime.l3, img.slime.l2],
  right: [img.slime.r1, img.slime.r2, img.slime.r3, img.slime.r2],

  // Updates animation frame based on current state
  update() {
    switch (this.state) {
      case 'idle':
        this.i = 1;
        break;
      case 'jump':
        this.i = 2;
        break;
      case 'walk':
        this.i = (this.i + 0.5) % 4;
        break;
    }
  },

  // Draws the current slime image at (x, y)
  draw(x, y) {
    const frameList = this[this.m];
    const frameIndex = Math.floor(this.i);
    ctx.drawImage(frameList[frameIndex], x - 20, y, 170, 120);
    // Optional alternative size:
    // ctx.drawImage(frameList[frameIndex], x, y + 10, 130, 87);
  },

  // Resets slime direction and animation state
  reset() {
    this.m = 'down';
    this.state = 'idle';
    this.i = 0;
  },

  // Changes slime direction if different
  change_image(direction) {
    if (this.m !== direction) {
      this.m = direction;
    }
  },

  // Changes slime animation state if different, and adjusts frame accordingly
  change_state(newState) {
    if (this.state !== newState) {
      this.state = newState;
      switch (newState) {
        case 'idle':
        case 'walk':
          this.i = 1;
          break;
        case 'jump':
          this.i = 2;
          break;
      }
    }
  },
};

const Level = {
  i: 0,              // Current level index
  move: 0,           // Movement index or step counter during execution
  m: null,           // The current movement object or array (set during execution)
  player: {          // Player's in-game character state
    x: 0,            // Grid X position
    y: 0,            // Grid Y position
    way: 'd'         // Facing direction: 'u' (up), 'd' (down), 'l' (left), 'r' (right)
  },
  an: 0,             // Animation frame counter (for smooth transitions or effects)
  an2: 0,            // Secondary animation tracker (used in jumping or staggered steps)
  time: 30,          // Total time (seconds) to complete the level

  // Move to the next level and start a new game session
  next() {
    this.i++;          // Go to the next level index
    G.newGame();       // Call game engine to start the level
  },

  start() {
    var x, y,
      a = LEVELS[this.i],                        // Current level data
      m = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // Internal map representation
      total_coin = 0;

    for (y = 0; y < 4; y++) {
      for (x = 0; x < 4; x++) {
        switch (a.m[y][x]) {
          case 'x': m[y][x] = 1; break;             // Wall
          case 'o': m[y][x] = 2; total_coin++; break; // Coin
          case 'w': m[y][x] = 3; break;             // Win tile
          case 'p': this.setPlayer(x, y); break;    // Player start
        }
      }
    }

    this.m = m;                      // Map data for current level
    this.move = a.tm;               // Total movement allowed (or steps)
    this.total_coin = total_coin;   // Coins on map
    this.coin = 0;                  // Coins collected so far
    this.limit_types = a.limit || left_btn.length; // Limit on block types, fallback to all

    Tutorial.reset();               // Reset any running tutorial
    var tl = TUTORIAL[`level_${this.i}`]; // Fetch tutorial for this level
    if (tl) Tutorial.start(tl);     // Start tutorial if exists
  },

  setPlayer(x, y) {
    var p = this.player;
    p.x = x;               // Set player X position
    p.y = y;               // Set player Y position
    p.way = 'd';           // Default facing direction: down
    p.state = 'idle';      // Initial state
    slime_img.reset();     // Reset animation sprite for slime (the player)
  },

  // Main game loop for the Level object.
  // Handles drawing either the live game (during play) or results screen (win/lose).
  // Triggers animated transitions, win/lose UI, and manages time-based effects.
  update() {
    // Game rendering based on play or idle state
    if (G.state2 === 'play') {
      this.drawPlay(); // Actively playing
    } else {
      this.draw();     // Idle or paused view
    }

    // Show end-of-level screen (Win/Lose)
    if (G.state2 === 'win' || G.state2 === 'lose') {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "bold 80px font1";
      ctx.fillStyle = "#000";

      let txt = '';
      let yOffset = this.time;
      let animOffset = yOffset * 27;

      // Dimmed background based on timer
      ctx.globalAlpha = (30 - yOffset) / 70;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // Draw message box
      ctx.drawImage(img.box, W / 2 - 250, 200 + animOffset);

      if (G.state2 === 'win') {
        txt = 'Bravo!';

        // Main Menu Button
        if (DrawBtn(W / 2 - 230, 400 + animOffset, 140, 60, img.btn_main) && mld)
          G.state = 'main';

        // Replay Button
        if (DrawBtn(W / 2 - 70, 400 + animOffset, 140, 60, img.btn_replay) && mld)
          G.newGame();

        // Next Level Button (max level capped at 31)
        if (this.i < 31 && DrawBtn(W / 2 + 90, 400 + animOffset, 140, 60, img.btn_next) && mld)
          Level.next();

        // Draw stars earned
        let i = 0;
        for (; i < this.game_star; i++)
          ctx.drawImage(img.star, W / 2 - 110 + 70 * i, 325 + animOffset);

        for (; i < 3; i++)
          ctx.drawImage(img.star_x, W / 2 - 110 + 70 * i, 325 + animOffset);

      } else if (G.state2 === 'lose') {
        txt = 'Essaie encore!';

        // Main Menu Button
        if (DrawBtn(W / 2 + 30, 400 + animOffset, 140, 60, img.btn_main) && mld)
          G.state = 'main';

        // Replay Button
        if (DrawBtn(W / 2 - 170, 400 + animOffset, 140, 60, img.btn_replay) && mld)
          G.newGame();
      }

      // Draw result text
      ctx.fillStyle = "#333";
      ctx.fillText(txt, W / 2, 250 + animOffset);

      // Countdown animation timer
      if (this.time > 0) this.time--;
    }
  },

  // Draw the game board and animate player movement during gameplay.
  // Handles movement progression, collisions, sounds, and win/lose checks.
  drawPlay() {
    var x2 = W - 575, y2 = 100, x, y, i, len, m = this.m, p = this.player;

    // Draw background table
    ctx.drawImage(img.table, x2, y2);

    // Draw blocks, coins, and win tiles
    for (y = 0; y < 4; y++) {
      for (x = 0; x < 4; x++) {
        switch (m[y][x]) {
          case 1: ctx.drawImage(img.block, x2 + x * 130, y2 + y * 130 - 20); break;
          case 2: this.drawCoin(x2 + x * 130, y2 + y * 130); break;
          case 3: this.drawWin(x2 + x * 130, y2 + y * 130); break;
        }
      }
    }

    // Animate player movement
    var o = this.o.m; len = o.length; x = p.x; y = p.y;

    if (len > 0) {
      var o2 = o[0], t1 = o2.time / 20, way = this.getWay(o2.way);

      // Set player state and image based on movement type
      switch (o2.t) {
        case 'arrow':
          slime_img.change_state('walk');
          slime_img.change_image(way.img);
          break;
        case 'jump':
          way.x *= (1 + o2.times);
          way.y *= (1 + o2.times);
          slime_img.change_state('jump');
          slime_img.change_image(way.img);
          break;
      }

      // Smooth transition between positions
      x = get_middle(x, x + way.x, t1);
      y = get_middle(y, y + way.y, t1);

      // Draw shadow during jump
      if (o2.t == 'jump') {
        ctx.drawImage(img.shadow, x2 + x * 130, (y2 + y * 130) + 30);
        y -= (t1 > 0.5 ? 1 - t1 : t1) * 1;
      }

      // Check for out-of-bounds or collision with block
      if (o2.time == 20) {
        var xx = p.x + way.x, yy = p.y + way.y;
        if (xx < 0 || xx >= 4 || yy < 0 || yy >= 4 || m[yy][xx] == 1) this.setLose();
      }

      // Finalize movement step
      if (--o2.time == 0) {
        o.shift(); // Remove current move
        p.x += way.x;
        p.y += way.y;
        this.take(p.x, p.y); // Handle coin or win tile
      }

      // Movement sound effects
      if (o2.time == 18 && o2.t == 'arrow') Psound("walk");
      if (o2.time == 8 && o2.t == 'arrow') Psound("walk");
      if (o2.time == 18 && o2.t == 'jump') Psound("jump");

    } else {
      // No more movement, check fail condition
      slime_img.reset();
      this.setLose();
    }

    // Update and draw slime
    slime_img.update();
    slime_img.draw(x2 + x * 130, y2 + y * 130);

    // Animation frame counter for effects
    this.an = (this.an + 1) % 20;
    this.an2 = ((this.an > 10 ? 20 - this.an : this.an) - 5) / 2;

    // Draw top UI (move/coin counter)
    this.drawtop();
  },

  // Draw the static game board when not in active gameplay (e.g., before start or during pause)
  // Shows all elements (blocks, coins, goal) and renders player in current position
  draw() {
    var x2 = W - 575, y2 = 100, i, len, m = this.m, p = this.player;

    // Draw background table
    ctx.drawImage(img.table, x2, y2);

    // Draw all tiles: block, coin, or win tile
    for (y = 0; y < 4; y++) {
      for (x = 0; x < 4; x++) {
        switch (m[y][x]) {
          case 1:
            ctx.drawImage(img.block, x2 + x * 130, y2 + y * 130 - 20);
            break;
          case 2:
            this.drawCoin(x2 + x * 130, y2 + y * 130);
            break;
          case 3:
            this.drawWin(x2 + x * 130, y2 + y * 130);
            break;
        }
      }
    }

    // Update and draw the idle player slime
    slime_img.update();
    slime_img.draw(x2 + p.x * 130, y2 + p.y * 130);

    // Animate slime's idle bounce effect
    this.an = (this.an + 1) % 20;
    this.an2 = ((this.an > 10 ? 20 - this.an : this.an) - 5) / 2;

    // Draw top UI (moves used vs allowed, coin counter if any)
    this.drawtop();
  },

  // Draw the top UI bar showing player’s move usage and coin collection status
  drawtop() {
    // Prepare text style and alignment
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "bold 50px font1";

    // If the player exceeded the move limit, show move count in orange
    ctx.fillStyle = this.move < C.cnt ? "orange" : "#fff";

    // Draw the arrow icon and move counter (e.g., "3 / 10")
    ctx.drawImage(img.code_arrow, 660, 10, 90, 40);
    ctx.fillText(C.cnt + ' / ' + this.move, 730, 10);

    // If the level contains coins, draw coin icon and collected/total counter
    if (this.total_coin > 0) {
      ctx.fillStyle = "#fff";
      ctx.drawImage(img.coin, 890, 10, 50, 50);
      ctx.fillText(this.coin + ' / ' + this.total_coin, 950, 10);
    }
  },

  // Convert direction key ('u','d','l','r') to movement delta and image identifier
  getWay(w) {
    switch (w) {
      case 'u': return { x: 0, y: -1, img: 'up' };    // Move up
      case 'd': return { x: 0, y: 1, img: 'down' };   // Move down
      case 'l': return { x: -1, y: 0, img: 'left' };  // Move left
      case 'r': return { x: 1, y: 0, img: 'right' };  // Move right
    }
  },

  // Draw the animated coin and shadow at given board position
  drawCoin(x, y) {
    var i = this.an2; // Vertical animation offset
    ctx.drawImage(img.shadow, x, y + 30);       // Coin shadow
    ctx.drawImage(img.coin, x, y + i - 20);     // Coin with float effect
  },

  // Draw the win portal with animation and shadow
  drawWin(x, y) {
    var i = this.an2; // Vertical animation offset
    ctx.drawImage(img.shadow, x, y + 30);     // Portal shadow
    ctx.drawImage(img.win, x, y + i - 20);    // Animated win portal
  },

  // Trigger lose state: play sound, change slime state, and set game state
  setLose() {
    Psound("lose");                          // Play lose sound
    slime_img.change_state('idle');         // Reset slime animation
    G.state2 = 'lose';                      // Mark game as lost
    this.time = 20;                         // Time before showing result screen
  },

  // Trigger win state, calculate stars, update and save progress
  setWin() {
    Psound("win");                                        // Play win sound
    slime_img.change_state('idle');                      // Stop slime movement
    slime_img.change_image('down');                      // Show downward-facing slime
    G.state2 = 'win';                                    // Mark game as won
    this.time = 20;                                      // Time before showing result screen

    var i = this.i, d = this.data, star = 1;
    if (this.coin == this.total_coin) star++;            // +1 star for collecting all coins
    if (this.move >= C.cnt) star++;                      // +1 star for using equal or fewer moves

    d[i].win = true;                                     // Mark current level as completed
    this.game_star = star;                               // Save stars earned

    if (star > d[i].star) d[i].star = star;              // Update best score
    if (i < 31) d[i + 1].win = true;                     // Unlock next level

    this.saveData();                                     // Save updated data
  },

  // Handle logic when player steps on a tile (collect coin or trigger win)
  take(x, y) {
    var m = this.m, b = m[y][x]; // Get tile type at position

    if (b == 2) {
      m[y][x] = 0; this.coin++;  // Collect coin and clear tile
      Psound("coin");            // Play coin sound
    }
    else if (b == 3) {
      m[y][x] = 0; this.setWin(); // Trigger win
    }
  },

  // Initialize level progress data and load saved state if available
  buildData() {
    var data = [];
    for (var i = 0; i < 32; i++) {
      data.push({ win: false, star: 0 }); // Default: level locked and 0 stars
    }
    data[0].win = true; // Unlock first level

    // Load progress from localStorage (if supported and available)
    if (typeof (Storage) !== "undefined") {
      var nd = localStorage.getItem(STORAGE_KEY);
      if (nd != null) {
        nd = JSON.parse(nd);
        for (var i = 0, len = nd.length; i < len; i++) {
          data[i] = nd[i]; // Restore saved level data
        }
      }
    }

    this.data = data;
    this.saveData(); // Save data to make sure it’s synced
  },

  // Save progress to localStorage if supported by the browser
  saveData() {
    if (typeof (Storage) !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }
  }
};
// Generates or initializes all levels with default values and objectives
Level.buildData();


// ------------------------
// Main game animation loop
// ------------------------

// Target 30 frames per second
var fpsInterval = 1000 / 30,
  then = Date.now(),
  elapsed;

// Animation frame loop
function animate() {
  // Request next frame (this keeps the loop going)
  requestAnimationFrame(animate);

  var now = Date.now();
  elapsed = now - then;

  // Check if it's time to render the next frame
  if (elapsed > fpsInterval) {
    // Adjust 'then' to compensate for dropped frames and maintain smooth timing
    then = now - (elapsed % fpsInterval);

    /* Mouse input - handle keyboard shortcuts like undo/delete */
    Mouse.UpdateShortKeys();

    // Run core game logic (drawing, updates, etc.)
    G.run();

    /* Mouse input - update mouse position, clicks, etc. */
    Mouse.Update();
  }
}

// Start the loop
animate();
