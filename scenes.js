// Pixel scene renderer for the Edward's World concept board.
const C={cream:'#EFE7D3',paper:'#E6DCC4',sky:'#E9E0C8',sky2:'#DFD4B6',stone:'#C4BAA3',stone2:'#A29A83',stone3:'#7E7763',green:'#9AA478',green2:'#75825A',green3:'#5E6B4B',green4:'#3E4832',brown:'#A08466',brown2:'#7C6450',brown3:'#57473A',soil:'#6B5646',char:'#2B2823',ink:'#1E1B17',blue:'#93A8B0',blue2:'#6F8892',blue3:'#54707C',orange:'#C98A52',orange2:'#A96E3D',warm:'#F3E3B2',glow:'#F7F1E2',skin:'#D8B28A',smoke:'#CFC8B4'};

function spr(r,x,y,rows,map){rows.forEach((row,j)=>{for(let i=0;i<row.length;i++){const k=row[i];if(k!=='.'&&map[k])r(x+i,y+j,1,1,map[k]);}});}
function hills(r,pts,c,base){for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];for(let x=a[0];x<b[0];x++){const y=Math.round(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));r(x,y,1,base-y,c);}}}
function roofPitch(r,x,y,w,h,c){for(let i=0;i<h;i++){const inset=h-1-i;r(x+inset,y+i,w-2*inset,1,c);}}
function win(r,x,y,w,h,fill,cross){r(x-1,y-1,w+2,h+2,C.brown3);r(x,y,w,h,fill);if(cross){r(x+(w>>1),y,1,h,C.brown3);r(x,y+(h>>1),w,1,C.brown3);}}
function smoke(r,x,y,f){for(let i=0;i<3;i++){const k=(f*2+i*3)%10;r(x+(i%2)-((k>5)?1:0),y-k,2,2,C.smoke);}}
function dashes(r,x,y,w,c){for(let i=0;i<w-1;i+=4)r(x+i,y,((i>>2)%3===2)?1:2,1,c);}
function tree(r,x,g,s,f){const h=s===2?16:11,cw=s===2?12:8;r(x+(cw>>1)-1,g-h+5,2,h-5,C.brown3);r(x,g-h+1,cw,5,C.green3);r(x+1+(f%2),g-h-1,cw-2,2,C.green3);r(x+2,g-h+1,2,1,C.green2);r(x+cw-3,g-h+3,2,1,C.green2);}
function lamp(r,x,g){r(x,g-18,1,18,C.char);r(x,g-18,3,1,C.char);r(x+2,g-17,2,2,C.warm);}
function wheel(r,x,y,d,c){r(x,y,d,1,c);r(x,y+d-1,d,1,c);r(x,y,1,d,c);r(x+d-1,y,1,d,c);r(x+(d>>1),y+(d>>1),1,1,c);}
const DIG={'3':['XXX','..X','.XX','..X','XXX'],'2':['XXX','..X','XXX','X..','XXX']};
function digit(r,x,y,ch,c){DIG[ch].forEach((row,j)=>{for(let i=0;i<3;i++)if(row[i]==='X')r(x+i,y+j,1,1,c);});}

const AVATAR=['....hhhh....','...hhhhhh...','..hhhhhhhh..','..hhffffhh..','..hffffffh..','..hfeffefh..','...ffffff...','...cffffc...','..cccccccc..','.cccccccccc.','.cccccccccc.','.fccccccccf.','..pppppppp..','..ppp..ppp..','..ppp..ppp..','..sss..sss..'];
const AVMAP={h:'#26221D',f:C.skin,e:C.ink,c:'#7B7669',p:'#3A362F',s:'#26221D'};
const TINY=['.hhhh.','.hffh.','cccccc','cccccc','.cccc.','.pppp.','.p..p.','.s..s.'];
function tinyAvatar(r,x,y,shirt){spr(r,x,y,TINY,{h:'#26221D',f:C.skin,c:shirt||'#7B7669',p:'#3A362F',s:'#26221D'});}
const PLAYER=['..hhhh..','..ffff..','.tttttt.','.tttttt.','f.tttt.f','.tttttt.','..pppp..','..p..p..','..p..p..','..s..s..'];
function player(r,x,y,shirt){spr(r,x,y,PLAYER,{h:'#26221D',f:C.skin,t:shirt,p:'#3A362F',s:'#26221D'});}
const TINYTOMO=['.bbbbbbbbbb.','bzzzzzzzzzzb','bzsssssssszb','bzsEEE..e.zb','bzsEoE....zb','bzsEEE.m..zb','bzzzzzzzzzzb','.ff......ff.'];
const TOMOMAP={b:'#C9BC9C',z:C.cream,s:'#26221D',E:C.cream,o:C.cream,e:C.cream,m:'#7E7763',f:'#26221D'};
const GLY=[
['.XXXXX.','.X...X.','.X.o.X.','.XXXXX.','...X...','...X...','..XX...','..X....','.XX....'],
['..XXX..','.X...X.','.X.o.X.','..XXX..','....X..','...X...','..X....','.X.....','XX.....'],
['.XXXXX.','.X.....','.X.o...','.XXXX..','....X..','....X..','.XXXX..','.X.....','.XX....'],
['.XX.XX.','.X...X.','.X.o.X.','.X...X.','.X...X.','.XX.XX.','..X.X..','..X.X..','.XX.XX.'],
['...X...','..XX...','.XXXXX.','.X...X.','.X.o.X.','.XXXX..','...X...','..XX...','..X.X..']];
const GLYMAP={X:C.ink,o:C.cream};

function title(r,f){
 r(0,0,240,50,C.sky);r(0,50,240,30,C.sky2);
 for(let i=0;i<2;i++){const x=((60+i*130+(f>>1))%270)-15;r(x,16+i*10,12,2,'#F2EAD6');r(x+3,14+i*10,6,2,'#F2EAD6');}
 const bx=((f*3)%280)-20;r(bx,34,2,1,C.brown3);r(bx+3,33,2,1,C.brown3);
 hills(r,[[0,86],[50,78],[110,84],[170,76],[240,84]],'#B9B29B',96);
 hills(r,[[0,94],[70,89],[150,94],[210,88],[240,92]],'#A9A188',104);
 // ruin on right hill
 r(184,68,16,22,C.stone3);r(189,76,6,14,C.brown3);r(190,74,4,2,C.brown3);r(184,68,3,2,C.sky2);r(196,68,4,1,C.sky2);r(191,71,2,1,(f%4<2)?C.warm:C.stone);
 // distant village
 const vb=[[52,7,88],[62,9,88],[74,6,89],[84,8,88]];
 vb.forEach((b,i)=>{r(b[0],b[2]-b[1],9,b[1],C.paper);r(b[0]-1,b[2]-b[1]-1,11,2,C.brown3);r(b[0]+3,b[2]-3,2,2,(i===1&&f%3===0)?C.cream:C.warm);});
 smoke(r,65,77,f);
 // treeline
 for(let x=0;x<240;x+=7){const h=6+((x*13)%5);r(x,102-h,7,h,'#5A664C');}
 for(let x=3;x<240;x+=21)r(x,98,1,4,C.brown3);
 // lake
 r(0,102,240,17,C.blue2);
 for(let i=0;i<12;i++)r((i*23+f*2)%234,105+(i*29)%12,4,1,C.blue);
 // foreground silhouette
 r(0,119,240,16,'#2C3126');
 for(let x=0;x<240;x+=3)r(x,117-((x*7)%3),1,3+((x*7)%3),'#2C3126');
 for(let i=0;i<8;i++){const x=i*31+9;r(x+(f%2),113-((i*5)%3),1,4,'#3A422F');}
}

function intro(r,f){
 r(0,0,200,92,'#252822');
 [[20,10],[50,22],[90,8],[130,16],[170,6],[185,26],[110,30],[30,34],[152,12],[68,28]].forEach((s,i)=>{r(s[0],s[1],1,1,(i%4===f%4)?C.cream:'#4A4A3C');});
 r(0,92,200,28,'#20241D');r(0,92,200,1,'#333A2C');
 for(let x=0;x<34;x+=8){r(x,72-((x*7)%8),8,20+((x*7)%8),'#1B1E18');}
 for(let x=172;x<200;x+=8){r(x,70-((x*5)%9),8,22+((x*5)%9),'#1B1E18');}
 // sealed structure
 r(115,42,50,50,'#5A5546');r(115,42,50,2,'#6E6857');r(115,42,2,50,'#6E6857');r(117,38,46,4,'#6E6857');r(120,35,40,3,'#5A5546');
 r(132,62,16,30,'#14110D');r(134,58,12,4,'#14110D');
 const pw=(f%2)?2:1;r(140-(pw>>1),58,pw,34,C.warm);r(138,57,4,1,'#C9BC8F');r(136,91,8,1,'#3D3A2C');
 // carved slots (3 lit)
 [[120,48,1],[120,58,0],[120,68,1],[158,48,0],[158,58,1],[158,68,0]].forEach(s=>{r(s[0],s[1],3,3,'#3A3529');r(s[0]+1,s[1]+1,1,1,s[2]?C.warm:'#4A4438');});
 // glyph creatures
 [[64,44,0],[80,32,1],[95,52,2],[54,60,4]].forEach((g,i)=>{const bob=((f+i)%4<2)?0:1;spr(r,g[0],g[1]+bob,GLY[g[2]],GLYMAP);});
 tinyAvatar(r,44,84);
 r(40,94,20,1,'#2A2E24');
}

function world(r,f){
 const W=480,H=200;
 r(0,0,W,70,C.sky);r(0,70,W,30,C.sky2);
 [[40,18],[190,30],[350,14],[430,36]].forEach((cd)=>{const x=((cd[0]+(f>>1))%(W+40))-20;r(x,cd[1],16,3,'#F2EAD6');r(x+3,cd[1]-2,9,2,'#F2EAD6');});
 const bx=((f*3)%(W+40))-20;r(bx,44,2,1,C.brown3);r(bx+3,43,2,1,C.brown3);
 hills(r,[[0,96],[60,88],[130,94],[210,86],[290,93],[370,88],[440,95],[480,92]],'#BEB69C',110);
 hills(r,[[0,104],[80,99],[180,104],[300,98],[420,104],[480,101]],'#A9A188',118);
 const gy=x=>x<85?118:x<90?122:x<95?128:x<100?134:x<105?140:146;
 for(let x=0;x<W;x++){const g=gy(x);const dirt=x>=434;r(x,g,1,1,dirt?'#8B7358':C.green);r(x,g+1,1,3,dirt?C.brown2:C.green2);r(x,g+4,1,H-g-4,C.soil);if((x*13+7)%37<2)r(x,g+9+((x*7)%20),1,1,C.brown3);}
 r(0,184,W,16,'#5A4839');
 for(let x=30;x<434;x++){if(x>=230&&x<250)continue;r(x,gy(x),1,2,((x*11)%23<3)?C.stone2:C.stone);}
 // stream + bridge
 r(231,146,1,54,C.brown3);r(248,146,1,54,C.brown3);r(232,146,16,54,C.blue3);
 for(let i=0;i<7;i++)r(233+((i*5+f)%13),150+i*7,3,1,C.blue);
 r(228,143,24,1,C.brown);r(228,144,24,2,C.brown2);r(230,146,2,4,C.brown3);r(248,146,2,4,C.brown3);
 // EDWARD'S HOUSE (hill)
 roofPitch(r,20,88,38,8,C.brown3);r(22,95,34,1,'#6B5A4A');
 r(24,96,30,22,C.paper);r(24,96,30,1,C.stone);
 r(46,82,4,8,C.brown2);smoke(r,47,79,f);
 win(r,29,102,7,6,C.warm,true);
 r(42,106,6,12,C.brown3);r(46,111,1,1,C.orange);
 r(50,113,2,3,C.orange2);r(50,111,2,2,C.green3);
 r(61,110,1,8,C.brown3);r(59,107,5,4,C.orange);r(63,105,1,2,C.orange2);
 wheel(r,8,111,5,C.char);wheel(r,14,111,5,C.char);r(10,110,6,1,C.char);r(12,108,1,2,C.char);
 spr(r,70,110,TINYTOMO,TOMOMAP);
 tree(r,2,118,1,f);
 // slope trees + sign
 tree(r,88,gy(88),1,f);tree(r,97,gy(97),1,f);
 r(108,132,1,14,C.brown3);r(104,131,9,4,C.paper);dashes(r,105,132,7,C.ink);
 // WARDROBE
 r(114,115,38,31,C.brown3);r(115,116,36,30,C.paper);r(115,116,36,5,C.char);dashes(r,118,118,30,C.cream);
 for(let i=0;i<9;i++)r(116+i*4,124,3,2,(i%2)?C.stone:C.cream);r(116,126,36,1,'#B5AB92');
 win(r,119,129,24,13,'#DED7C2',false);
 r(121,133,13,1,C.brown3);
 [[122,C.orange],[126,C.blue2],[130,C.green3]].forEach(g=>{r(g[0],134,3,4,g[1]);r(g[0]+1,133,1,1,C.brown3);});
 r(138,131,2,2,C.cream);r(137,133,4,6,C.cream);r(138,139,1,3,C.brown3);
 r(145,132,5,14,C.char);r(146,133,3,5,'#4A4438');
 r(108,142,6,4,C.brown);r(109,139,5,3,C.paper);
 // TOWN
 lamp(r,157,146);lamp(r,226,146);
 for(let x=158;x<=226;x+=2){const t=(x-158)/68;r(x,128+Math.round(16*t*(1-t)),1,1,C.char);}
 r(163,134,1,12,C.brown3);r(171,134,1,12,C.brown3);r(161,129,13,7,C.paper);r(161,129,13,1,C.brown3);dashes(r,163,131,9,C.ink);dashes(r,163,133,7,C.ink);
 r(177,142,10,1,C.brown);r(178,143,1,3,C.brown3);r(185,143,1,3,C.brown3);
 r(188,133,1,13,C.brown3);r(184,131,9,3,C.paper);dashes(r,185,132,7,C.ink);
 tinyAvatar(r,196,138);
 r(204,140,10,6,C.stone2);r(205,140,8,1,C.stone);r(206,142,6,2,C.blue2);r(208+(f%2),139,1,1,C.blue);
 tree(r,214,146,1,f);
 // SPORTSGANG
 r(252,143,48,3,'#A97F52');r(275,143,2,3,C.cream);
 for(let x=252;x<=300;x+=8)r(x,132,1,11,C.brown2);r(252,134,48,1,C.brown2);
 r(258,126,2,8,C.char);r(253,117,13,9,C.char);digit(r,255,119,'3',C.cream);r(259,121,1,1,C.stone3);digit(r,261,119,'2',C.orange);
 tinyAvatar(r,266,135,C.orange2);tinyAvatar(r,284,135,C.blue2);
 r(276,135+((f%2)*2),2,2,C.orange);
 r(295,136,1,10,C.brown3);r(292,130,8,7,C.paper);r(293,131,2,2,C.cream);r(296,131,2,2,C.orange);r(293,134,2,2,C.blue2);
 // AFL LAB
 r(304,117,40,3,C.brown3);r(306,120,36,26,C.stone2);r(306,120,36,1,C.stone);
 r(322,104,1,16,C.char);r(320,106,5,1,C.char);r(321,110,3,1,C.char);r(322,103,1,1,(f%2)?C.orange:C.stone3);
 r(334,113,5,3,C.stone);r(336,116,1,4,C.char);
 [[310,126],[319,126],[328,126]].forEach((wp,i)=>{win(r,wp[0],wp[1],6,5,C.blue2,false);if(f%3===i)r(wp[0]+1,wp[1]+1,4,1,C.blue);});
 r(335,132,6,14,C.char);r(339,139,1,1,C.orange);
 r(352,132,1,14,C.char);
 for(let x=344;x<=352;x+=2){const t=(x-344)/8;r(x,120+Math.round(10*t),1,1,C.char);}
 // AFL oval + posts
 r(348,146,36,3,'#8FA06B');for(let x=350;x<382;x+=5)r(x,146,2,1,C.cream);
 [[358,9],[362,13],[366,13],[370,9]].forEach(p=>{r(p[0],146-p[1],1,p[1],C.glow);r(p[0]+1,146-p[1],1,1,C.brown3);});
 // ARCADE
 r(392,120,32,26,'#3A362F');
 r(390,114,36,6,C.orange);dashes(r,393,116,30,C.ink);r(390,114,36,1,'#DBA06B');
 for(let i=0;i<9;i++)r(392+i*4,121,1,1,((i+f)%2)?C.warm:C.orange2);
 win(r,396,128,10,12,C.warm,false);r(398,132,5,8,C.char);r(399,133,3,2,[C.blue2,C.orange,C.cream][f%3]);
 r(412,128,8,18,'#14110D');r(412,128,1,18,'#6B5A3C');r(419,128,1,18,'#6B5A3C');
 // UNDER CONSTRUCTION
 for(let x=436;x<458;x+=3)r(x,138,2,8,C.stone);r(436,139,22,1,C.stone3);r(436,144,22,1,C.stone3);
 r(438,134,10,3,C.orange);r(439,134,2,3,C.cream);r(444,134,2,3,C.cream);
 r(462,124,1,22,C.brown3);r(469,124,1,22,C.brown3);r(476,124,1,22,C.brown3);
 r(462,128,15,1,C.brown3);r(462,136,15,1,C.brown3);r(462,127,15,1,C.brown);r(462,135,15,1,C.brown);
 r(464,140,11,6,C.paper);r(464,140,4,1,'#8B7358');r(471,140,2,1,'#8B7358');
 r(447,140,1,6,C.brown3);r(442,132,11,8,C.cream);r(442,132,11,1,C.brown3);dashes(r,444,134,7,C.ink);dashes(r,444,136,7,C.ink);r(442,138,11,2,C.orange);
 r(430,145,2,2,C.stone);r(427,146,2,1,C.stone2);
 tree(r,308,146,0,f);tree(r,386,146,1,f);
}

function cardBase(r,f){r(0,0,96,32,C.sky);r(0,32,96,24,C.sky2);hills(r,[[0,36],[30,31],[60,35],[96,30]],'#B9B29B',40);r(0,56,96,1,C.green);r(0,57,96,4,C.green2);r(0,61,96,11,C.soil);}
function house(r,f){
 cardBase(r,f);
 roofPitch(r,16,14,54,11,C.brown3);r(19,24,48,1,'#6B5A4A');
 r(21,24,46,32,'#6B5A4A');r(22,25,44,31,C.paper);r(22,25,44,1,C.stone);
 r(54,7,5,10,C.brown2);smoke(r,55,4,f);
 win(r,28,33,12,10,C.warm,false);r(30,40,8,1,C.brown3);r(32,35,4,3,C.blue2);r(33,36,2,1,(f%2)?C.blue:C.blue2);r(28,33,12,1,C.brown3);
 r(46,38,9,18,C.brown3);r(53,46,1,1,C.orange);
 r(57,52,4,2,C.glow);r(57,52,1,2,C.orange);
 r(62,49,7,7,C.brown2);r(63,48,5,1,C.brown2);r(64,47,3,1,C.brown3);
 r(73,45,1,11,C.brown3);r(70,41,7,5,C.orange);r(76,39,1,3,C.orange2);
 wheel(r,4,47,7,C.char);wheel(r,13,47,7,C.char);r(7,46,8,1,C.char);r(10,43,1,3,C.char);r(6,43,3,1,C.char);
 r(40,52,3,3,C.orange2);r(40,50,3,2,C.green3);
 [[44,58],[48,60],[52,58]].forEach(s=>r(s[0],s[1],3,1,C.stone));
 tree(r,82,57,2,f);
}
function sports(r,f){
 cardBase(r,f);
 r(6,52,84,4,'#A97F52');r(46,52,2,4,C.cream);r(10,52,1,4,C.cream);r(85,52,1,4,C.cream);
 for(let x=6;x<=90;x+=8)r(x,38,1,14,C.brown2);r(6,40,85,1,C.brown2);r(6,46,85,1,C.brown2);
 r(13,32,2,10,C.char);r(21,32,2,10,C.char);r(8,18,20,14,C.char);r(9,19,18,12,'#37332B');
 digit(r,12,22,'3',C.cream);r(17,24,1,1,C.stone3);digit(r,20,22,'2',C.orange);dashes(r,11,29,14,C.stone3);
 player(r,32,42,C.orange2);player(r,58,42,C.blue2);
 const by=34+((f%3===1)?2:0);r(48,by,3,3,C.orange);r(46,by+2,1,1,'#DBA06B');
 r(74,36,1,20,C.brown3);r(84,36,1,20,C.brown3);r(71,26,17,12,C.paper);r(71,26,17,1,C.brown3);
 [[73,29,C.cream],[78,29,C.orange],[83,29,C.cream],[75,33,C.cream],[80,33,C.blue2]].forEach(n=>{r(n[0],n[1],3,3,n[2]);r(n[0]+1,n[1],1,1,C.ink);});
 r(92,36,1,20,C.char);r(88,36,4,3,C.orange);
}
function wardrobe(r,f){
 cardBase(r,f);
 r(9,17,78,39,C.brown3);r(10,18,76,38,C.paper);r(10,18,76,1,C.stone);
 r(10,10,76,8,C.char);dashes(r,16,13,50,C.cream);r(72,12,4,4,C.cream);r(73,13,2,2,C.char);
 for(let i=0;i<14;i++)r(12+i*5,26,4,3,(i%2)?C.stone:C.cream);r(12,29,70,1,'#B5AB92');
 win(r,14,32,42,22,'#DED7C2',false);
 r(17,37,32,1,C.brown3);
 [[19,C.orange],[27,C.blue2],[35,'#5E6B4B'],[43,C.cream]].forEach(g=>{r(g[0],38,5,7,g[1]);r(g[0]+2,37,1,1,C.brown3);if(g[1]===C.cream){r(g[0],38,5,1,C.stone2);r(g[0],44,5,1,C.stone2);}});
 r(49,34,3,3,C.cream);r(48,37,5,9,C.cream);r(50,46,1,6,C.brown3);r(48,52,5,1,C.brown3);
 r(62,34,11,22,C.char);r(63,35,9,8,'#4A4438');r(70,45,1,1,C.orange);
 [[76,50,8,4],[77,45,7,4],[78,41,6,3]].forEach(b=>{r(b[0],b[1],b[2],b[3],C.brown);r(b[0],b[1],b[2],1,C.brown2);r(b[0]+2,b[1]+1,3,1,C.paper);});
 r(4,50,4,3,C.orange2);r(4,46,4,4,C.green3);
}
function afl(r,f){
 cardBase(r,f);
 r(12,22,52,4,C.brown3);r(14,26,48,30,C.stone2);r(14,26,48,1,C.stone);
 r(22,6,1,16,C.char);r(19,8,7,1,C.char);r(20,12,5,1,C.char);r(21,16,3,1,C.char);r(22,5,1,1,(f%2)?C.orange:C.stone3);
 r(40,12,1,10,C.char);r(38,14,5,1,C.char);
 r(50,16,7,4,C.stone);r(53,20,1,2,C.char);r(51,15,5,1,C.cream);
 [[18,32],[30,32],[42,32]].forEach((wp,i)=>{win(r,wp[0],wp[1],8,7,C.blue2,false);if(f%3===i){r(wp[0]+1,wp[1]+1,6,1,C.blue);r(wp[0]+1,wp[1]+4,6,1,'#7E97A1');}});
 r(26,41,3,2,C.orange);r(29,42,1,1,C.orange);
 r(52,38,8,18,C.char);r(58,47,1,1,C.orange);
 r(78,30,1,26,C.char);
 for(let x=64;x<=78;x+=2){const t=(x-64)/14;r(x,25+Math.round(9*t),1,1,C.char);}
 for(let x=64;x<=78;x+=2){const t=(x-64)/14;r(x,28+Math.round(7*t),1,1,C.char);}
 r(64,42,12,10,C.paper);r(64,42,12,1,C.brown3);for(let j=0;j<3;j++)dashes(r,66,44+j*3,8,C.ink);
 r(4,58,88,3,'#8FA06B');for(let x=6;x<92;x+=6)r(x,58,2,1,C.cream);
 [[8,8],[13,12],[18,12],[23,8]].forEach(p=>{r(p[0],56-p[1],1,p[1]+2,C.glow);r(p[0]+1,56-p[1],1,1,C.brown3);});
}
function arcade(r,f){
 cardBase(r,f);
 r(12,22,72,34,'#37332B');r(12,22,72,1,'#4A4438');
 r(8,12,80,10,C.orange);r(8,12,80,1,'#DBA06B');r(8,21,80,1,C.orange2);dashes(r,14,15,66,C.ink);dashes(r,20,18,54,C.ink);
 for(let i=0;i<19;i++)r(10+i*4,23,1,1,((i+f)%2)?C.warm:C.orange2);
 win(r,18,30,18,18,C.warm,false);
 r(21,33,11,14,C.char);r(22,34,8,6,[C.blue2,C.orange,'#5E6B4B'][f%3]);r(24,36,3,1,C.cream);r(24,42,2,1,C.orange);r(28,42,2,1,C.cream);
 r(44,30,14,26,'#14110D');r(44,30,1,26,'#6B5A3C');r(57,30,1,26,'#6B5A3C');r(47,36,7,10,'#26221D');r(48,37,5,4,(f%2)?C.blue3:'#3A4A52');
 for(let i=0;i<6;i++){const x=62+i*5;r(x,26,3,3,(i%2)?C.orange:C.cream);r(x+1,29,1,1,C.char);}
 r(66,44,1,12,C.brown3);r(72,44,1,12,C.brown3);r(63,38,13,7,C.cream);r(63,38,13,1,C.brown3);dashes(r,65,40,9,C.orange2);dashes(r,65,42,7,C.ink);
 tree(r,88,57,1,f);
}
function anatomy(r,f){
 r(0,0,70,42,C.sky);r(0,42,70,1,C.green);r(0,43,70,4,C.green2);r(0,47,70,5,C.soil);
 r(14,13,42,29,C.brown3);r(15,14,40,28,C.paper);r(15,14,40,1,C.stone);
 r(15,8,40,6,C.char);dashes(r,19,10,30,C.cream);
 r(13,40,44,2,C.stone2);
 win(r,22,24,7,7,C.warm,true);
 r(40,28,7,14,C.brown3);r(45,34,1,1,C.orange);
 r(58,36,6,6,C.brown);r(58,36,6,1,C.brown2);r(60,38,3,1,C.paper);
 r(8,30,1,12,C.brown3);r(4,26,9,5,C.paper);dashes(r,5,28,6,C.ink);
}
function avatar(r,f){spr(r,1,1,AVATAR,AVMAP);}
function tomo(r,f){
 const rows=['..bbbbbbbbbbbbbb..','.bbbbbbbbbbbbbbbb.','.bzzzzzzzzzzzzzzb.','.bzsssssssssssszb.','.bzs..EEE.....szb.','.bzs.E...E..e.szb.','.bzs.E.o.E....szb.','.bzs.E...E....szb.','.bzs..EEE.mm..szb.','.bzsssssssssssszb.','.bzzzzzzzzzzzzzzb.','.bbbbbbbbbbbbbbbb.','...ff........ff...'];
 spr(r,1,1,rows,TOMOMAP);
 if(f%5===0){r(6,6,5,3,'#26221D');} // blink big eye
 if(f%7===0){r(13,6,1,1,'#26221D');}
}
function glyphs(r,f){GLY.forEach((g,i)=>{spr(r,2+i*12,2+(((f+i)%4<2)?0:1),g,GLYMAP);});}

const SCENES={title:{w:240,h:135,fn:title},intro:{w:200,h:120,fn:intro},world:{w:480,h:200,fn:world},house:{w:96,h:72,fn:house},sports:{w:96,h:72,fn:sports},wardrobe:{w:96,h:72,fn:wardrobe},afl:{w:96,h:72,fn:afl},arcade:{w:96,h:72,fn:arcade},anatomy:{w:70,h:52,fn:anatomy},avatar:{w:14,h:18,fn:avatar},tomo:{w:20,h:15,fn:tomo},glyphs:{w:62,h:13,fn:glyphs}};
export function draw(name,cv,f,u){
 const sc=SCENES[name];if(!sc)return;
 if(cv.width!==sc.w*u)cv.width=sc.w*u;
 if(cv.height!==sc.h*u)cv.height=sc.h*u;
 const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,cv.width,cv.height);
 const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x*u),Math.round(y*u),Math.round(w*u),Math.round(h*u));};
 sc.fn(r,f||0);
}
