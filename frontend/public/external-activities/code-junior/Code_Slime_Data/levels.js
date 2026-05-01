// ---------------------
// LEVEL DATA STRUCTURE
// ---------------------
// Each object represents one level.
// Symbols in the `m` matrix:
//   '-' = empty tile (0)
//   'x' = block/wall (1)
//   'o' = coin (2)
//   'w' = win tile (3)
//   'p' = player start position
// `limit` = number of available command types from the UI (optional)
// `tm` = target number of moves (used for star rating)

const LEVELS = [
  { limit:1, tm:2, m:[
    "--w-",
    "x--x",
    "x-px",
    "xxxx"]
  }, // 1

  { limit:4, tm:4, m:[
    "xpxx",
    "x-x-",
    "x--w",
    "x-xx"]
  }, // 2

  { limit:4, tm:6, m:[
    "xx-p",
    "-x--",
    "xwx-",
    "x---"]
  }, // 3

  { limit:4, tm:7, m:[
    "p---",
    "xxx-",
    "-x--",
    "--w-"]
  }, // 4

  { limit:5, tm:2, m:[
    "xxxx",
    "p--w",
    "xxxx",
    "xxxx"]
  }, // 5

  { limit:5, tm:4, m:[
    "wxxx",
    "--xx",
    "--x-",
    "---p"]
  }, // 6

  { limit:5, tm:5, m:[
    "p--x",
    "x---",
    "-x-x",
    "-x-w"]
  }, // 7

  { limit:5, tm:3, m:[
    "xxxw",
    "xx--",
    "x--x",
    "p-xx"]
  }, // 8

  { limit:5, tm:3, m:[
    "--w-",
    "x-ox",
    "x-op",
    "xx-x"]
  }, // 9

  { tm:1, m:[
    "-wx-",
    "xxxx",
    "-p--",
    "----"]
  }, // 10

  { tm:2, m:[
    "--p-",
    "xx-x",
    "-xxx",
    "-wx-"]
  }, // 11

  { tm:3, m:[
    "-wxx",
    "-x--",
    "-xxp",
    "----"]
  }, // 12

  { tm:4, m:[
    "---w",
    "x-ox",
    "xop-",
    "x---"]
  }, // 13

  { tm:4, m:[
    "xxxx",
    "x--x",
    "xxoo",
    "xpwo"]
  }, // 14

  { tm:5, m:[
    "wx--",
    "oxxo",
    "-x--",
    "pxoo"]
  }, // 15

  { tm:6, m:[
    "poo-",
    "-x--",
    "wx--",
    "-ooo"]
  }, // 16

  { tm:4, m:[
    "-o-p",
    "wxxx",
    "oxxx",
    "xxxx"]
  }, // 17

  { tm:5, m:[
    "p-x-",
    "wo--",
    "oxo-",
    "----"]
  }, // 18

  { tm:4, m:[
    "oxwp",
    "-xxx",
    "xxx-",
    "o--o"]
  }, // 19

  { tm:7, m:[
    "ox--",
    "-xw-",
    "oxxo",
    "-po-"]
  }, // 20

  { tm:6, m:[
    "xx-o",
    "--o-",
    "wo--",
    "p--x"]
  }, // 21

  { tm:4, m:[
    "pxow",
    "-o--",
    "oo--",
    "-xxx"]
  }, // 22

  { tm:6, m:[
    "--o-",
    "oxow",
    "o-x-",
    "pxo-"]
  }, // 23

  { tm:7, m:[
    "ooow",
    "ox-p",
    "oxxx",
    "oo--"]
  }, // 24

  { tm:6, m:[
    "w-xo",
    "-x-x",
    "oxx-",
    "ooxp"]
  }, // 25

  { tm:6, m:[
    "xx-p",
    "xoo-",
    "ooox",
    "o-w-"]
  }, // 26

  { tm:6, m:[
    "o-xp",
    "-x-o",
    "xxxx",
    "oowx"]
  }, // 27

  { tm:5, m:[
    "-x-o",
    "x-o-",
    "xpo-",
    "woxx"]
  }, // 28

  { tm:5, m:[
    "-w-x",
    "po--",
    "-oo-",
    "xxox"]
  }, // 29

  { tm:6, m:[
    "xx-x",
    "pooo",
    "wx-o",
    "ox-x"]
  }, // 30

  { tm:5, m:[
    "oxox",
    "xxox",
    "wxx-",
    "p-o-"]
  }, // 31

  { tm:8, m:[
    "ooxp",
    "oo-x",
    "oo-o",
    "ow-o"]
  }, // 32
];


// ------------------------
// TUTORIAL INSTRUCTION SET
// ------------------------
// Each tutorial is keyed as `level_<index>` (zero-based)
// Shows hints or scripted guidance steps for that level

const TUTORIAL = {
  level_0: { // Level 1 tutorial
    x:10, y:230, id:"block_1", insideMainBlock:true,
    pieces: [ {t:'u'} ],
    step: [
      {
        text: ["Déplace cette brique ici", "et connecte-la aux autres"],
        from: { type:"new", t:"u" },
        to: { type:"block", id:"block_1" },
        test: { type:"addTo", t:"arrow" },
      },
      {
        text: ["Appuie sur le bouton rouge", "pour lancer Slim !"],
        from: { type:"block", id:"code" },
        to: { type:"block", id:"code" },
        test: { type:"runCode" },
      },
    ],
  },

  level_1: { // Level 2 - no pieces, just info
    justInfo: true,
    step: [{ text: ["Aide Slim à", "attraper le bijou"] }],
  },

  level_4: { // Level 5 tutorial - using repeat blocks
    x:10, y:230, id:"block_1",
    pieces: [ { t:'repeat', inside:["r"] } ],
    step: [
      {
        text: ["La brique Répéter t’aide à", "utiliser moins de briques"],
        from: { type:"block", id:"block_1" },
        to: { type:"block", id:"code" },
        test: { type:"addTo", t:"repeat" },
      },
      {
        text: ["Change le nombre de répétitions à 3", "pour voir ce que ça fait"],
        from: { type:"block", id:"block_1" },
        to: { type:"block", id:"block_1" },
        test: { type:"repeat", n:3 },
      },
      {
        text: ["Lance ton code", "pour voir ce que ça donne"],
        from: { type:"block", id:"code" },
        to: { type:"block", id:"code" },
        test: { type:"runCode" },
      },
    ],
  },

  level_8: { // Level 9 - tip about collecting coins
    justInfo: true,
    step: [{ text: ["Récupère toutes les pièces", "pour gagner une étoile"] }],
  },

  level_9: { // Level 10 - intro to jump block
    x:10, y:230, id:"block_1", insideMainBlock:true,
    pieces: [ {t:'jump'} ],
    step: [
      {
        text: ["Slim peut sauter par-dessus les obstacles", "avec la brique SAUTE"],
        from: { type:"block", id:"code" },
        to: { type:"block", id:"code" },
        test: { type:"runCode" },
      },
    ],
  },
};
