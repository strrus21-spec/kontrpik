// Сцены анимаций к фишкам. Ключ — русский заголовок фишки (поле `t` в tips.json). Перенесены из прототипа без изменений.
import { COL, ez, lp, seg, type Pt, type Scene } from './engine.ts';

export const SCENES: Record<string, Scene> = {
'BKB не спасает от этих ульт':(g,t)=>{g.bg();const k=seg(t,.15,.45);g.hero('Faceless Void',50,70,'dire');
  g.circle(190,70,lp(0,48,ez(k)),'#c8b4ff','rgba(150,120,230,.22)',1,2);
  g.circle(190,70,17,COL.gold,null,.9,3);g.hero('Sven',190,70,'rad',{grey:t>.45});
  if(t>.5)g.text('BKB',190,38,COL.gold,11);if(t>.6){g.cross(220,38,6)}if(t>.7)g.text(g.T('ульта проходит','goes through'),190,118,'#c8b4ff',11)},
'Echo Slam сильнее от каждого юнита':(g,t)=>{g.bg();const n=Math.min(6,Math.floor(seg(t,0,.5)*7));const pts=[[90,40],[200,45],[70,95],[215,100],[120,115],[175,25]];
  pts.slice(0,n).forEach(([x,y],i)=>i%2?g.creep(x,y,'rad'):g.hero('Phantom Lancer',x,y,'rad',{r:9}));g.hero('Earthshaker',140,72,'dire');
  const k=seg(t,.55,.85);if(k>0){g.circle(140,72,k*110,COL.gold,null,1-k,3);g.text(`${g.T('урон','dmg')} ×${n}`,140,128,COL.gold,12)}},
'Ульта Zeus бьёт по всей карте':(g,t)=>{g.bg(true);g.trees([[40,30],[55,40],[230,105],[245,95],[250,112]]);
  const hs:[string,number,number][]=[['Lion',48,36],['Crystal Maiden',240,104],['Sniper',150,80]];hs.forEach(([n,x,y])=>g.hero(n,x,y,'rad',{r:9}));
  const k=seg(t,.35,.55);if(k>0&&k<1)hs.forEach(([n,x,y])=>{for(let i=0;i<3;i++)g.line(x+(i-1)*3,0,x,y,'#bfe3ff',2,null,1-k)});
  if(t>.55)hs.forEach(([n,x,y])=>g.cross(x+10,y-10,4));g.text(g.T('деревья не спасут','trees won’t save you'),140,128,'#bfe3ff',11)},
'Против Pudge стой за крипами':(g,t)=>{g.bg();g.hero('Pudge',235,70,'dire');g.creep(110,70,'rad');g.hero('Crystal Maiden',70,70,'rad');
  const out=seg(t,.1,.45),back=seg(t,.5,.8);const tip=out<1?lp(222,115,out):lp(115,222,back);g.line(222,70,tip,70,'#c9b28a',2,[4,3]);g.dot(tip,70,3,'#c9b28a');
  if(out>=1&&back<1)g.text(g.T('попал в крипа','hits the creep'),110,46,COL.gold,11);if(t>.5)g.creep(lp(110,210,back),70,'rad',1-seg(t,.8,.9));g.check(70,102,7)},
'Смерть от Reaper\'s Scythe дольше':(g,t)=>{g.bg();g.text(g.T('возрождение','respawn'),140,22,COL.white,11);g.text(g.T('обычно','normal'),40,58,COL.grey,10,'left');g.bar(100,52,140,10,.5,COL.grey);
  g.text('Scythe',40,88,COL.violet,10,'left');g.bar(100,82,140,10,lp(.5,.85,ez(seg(t,.2,.6))),COL.violet);g.hero('Necrophos',140,118,'dire',{r:10})},
'Sentry Ward видит мины':(g,t)=>{g.bg();const k=seg(t,.25,.45);g.dot(140,70,4,COL.blue);g.circle(140,70,lp(0,70,ez(k)),COL.blue,'rgba(90,176,240,.08)',1,1.5);
  [[110,50],[175,85],[160,40],[100,95]].forEach(([x,y])=>{const a=k>0?seg(t,.35,.5):0;g.circle(x,y,6,COL.dire,'rgba(226,85,63,.5)',a,2)});g.text(g.T('мины видно','mines revealed'),140,128,COL.blue,11)},
'Break снимает пассивки':(g,t)=>{g.bg();g.hero('Bristleback',170,70,'dire',{r:16});const br=t>.45;g.circle(170,70,24,br?COL.grey:COL.gold,null,br?.5:1,4,br?[3,4]:null);
  const k=seg(t,.15,.45);g.hero('Slark',lp(40,140,ez(k)),70,'rad');if(br){g.text('BREAK',170,30,COL.dire,13);g.text(g.T('защита отключена','passive off'),170,120,COL.white,11)}},
'Иллюзии — урон по площади':(g,t)=>{g.bg();const pts=[[110,50],[150,45],[130,90],[170,95],[190,60]];const k=seg(t,.3,.55);
  pts.forEach(([x,y],i)=>{if(i===2||k<1)g.hero('Phantom Lancer',x,y,'dire',{r:10,a:i===2?1:1-k})});g.circle(150,70,lp(0,60,k),COL.blue,'rgba(90,176,240,.15)',k<1?1:0,2);
  if(t>.6)g.text(g.T('остался настоящий','only the real one left'),140,124,COL.white,11)},
'Manta уворачивает от снарядов':(g,t)=>{g.bg();g.hero('Sven',40,70,'dire');const k=seg(t,.05,.5);const split=t>.42;
  if(!split)g.dot(lp(55,180,k),70,6,COL.blue);else{g.text('MANTA',200,30,COL.blue,12)}
  if(!split)g.hero('Anti-Mage',200,70,'rad');else[[200,70],[200,40],[200,100]].forEach(([x,y],i)=>g.hero('Anti-Mage',lp(200,x,seg(t,.42,.5)),lp(70,y,seg(t,.42,.5)),'rad',{a:i?.6:1}));
  if(t>.55)g.text(g.T('снаряд потерян','projectile lost'),110,124,COL.white,11)},
'Lotus Orb отражает ульту':(g,t)=>{g.bg();g.hero('Lion',40,70,'dire');g.circle(220,70,19,'#ff9de0','rgba(255,157,224,.15)',.9,2);g.hero('Crystal Maiden',220,70,'rad');
  const a=seg(t,.1,.4),b=seg(t,.45,.75);if(a<1)g.dot(lp(55,205,a),70,5,'#9be27e');else if(b<1)g.dot(lp(205,55,b),70,5,'#9be27e');
  if(b>=1){g.text('HEX',40,40,'#9be27e',12);g.circle(40,70,15,'#9be27e','rgba(155,226,126,.35)',1,2)}},
'Linken ломай дешёвым заклинанием':(g,t)=>{g.bg();g.hero('Lion',40,50,'rad');g.hero('Anti-Mage',210,70,'dire');const pop=t>.35;
  if(!pop)g.circle(210,70,20,COL.blue,'rgba(90,176,240,.15)',1,2);const a=seg(t,.1,.35),b=seg(t,.45,.7);
  if(a<1)g.dot(lp(55,190,a),lp(50,70,a),3,COL.white);if(pop&&b<1)g.dot(lp(55,195,b),lp(50,70,b),6,'#9be27e');
  if(pop)g.text(g.T('1. сфера','1. sphere'),210,34,COL.blue,10);if(b>=1){g.text(g.T('2. ульта прошла','2. ult lands'),210,114,'#9be27e',11);g.stars(210,70,t)}},
'Refresher больше не обновляет предметы':(g,t)=>{g.bg();const k=seg(t,.3,.5);g.text('Refresher',140,20,COL.gold,12);
  g.item(85,62,g.T('способность','ability'),COL.blue,1,80);g.item(195,62,'BKB',COL.gold,1,80);
  g.bar(45,80,80,5,k<1?1-k*0:0,'rgba(200,200,200,.7)');if(k>=1){g.check(85,104,8)}else g.bar(45,80,80,5,1-k,COL.grey);
  g.bar(155,80,80,5,1,COL.grey);if(k>=1)g.cross(195,104,7)},
'Shiva\'s Guard теперь про радиус':(g,t)=>{g.bg();const k=ez(seg(t,.2,.6));g.hero('Witch Doctor',140,70,'rad');g.circle(140,70,35,COL.grey,null,.6,1.5,[3,3]);
  g.circle(140,70,lp(35,58,k),COL.blue,'rgba(90,176,240,.1)',1,2.5);g.text(g.T('больше радиус','bigger area'),140,128,COL.blue,11)},
'Blade Mail теперь через Splintmail':(g,t)=>{g.bg();const k=seg(t,.3,.6);g.item(lp(55,120,k),45,'Splintmail',COL.white,1-seg(t,.6,.7),70);g.item(lp(55,120,k),95,'Broadsword',COL.white,1-seg(t,.6,.7),70);
  g.text('+',lp(55,120,k),70,COL.gold,14,'center',1-k);g.item(205,70,'Blade Mail',COL.gold,seg(t,.6,.75),78);g.text('→',150,70,COL.gold,18,'center',seg(t,.5,.6))},
'Денай свою башню':(g,t)=>{g.bg();const hp=lp(.3,.06,seg(t,0,.35));g.tower(140,62,'rad',t<.65?hp:0,t<.65?1:.25);g.hero('Sven',200,75,'dire');g.hero('Lion',90,85,'rad');
  if(t>.4&&t<.65){g.line(98,80,130,66,COL.rad,2);}if(t>.65){g.text(g.T('денай! меньше золота врагу','denied! less gold for them'),140,124,COL.gold,11)}},
'Аегис можно денайнуть':(g,t)=>{g.bg();const gone=t>.55;if(!gone){g.circle(140,70,10,COL.gold,'rgba(232,184,74,.35)',1,2);g.text('Aegis',140,50,COL.gold,10)}
  g.hero('Slark',lp(240,175,seg(t,0,.6)),70,'dire');g.hero('Lion',90,90,'rad');if(t>.3&&!gone)g.line(98,86,132,74,COL.rad,2);if(gone)g.text(g.T('Аегис уничтожен','Aegis denied'),140,70,COL.gold,12)},
'Стан прерывает телепорт':(g,t)=>{g.bg();const ch=seg(t,0,.7);const stun=t>.45;g.hero('Sniper',170,70,'dire');
  if(!stun){const c=g.c;c.save();c.strokeStyle=COL.blue;c.lineWidth=4;c.beginPath();c.arc(170,70,22,-Math.PI/2,-Math.PI/2+ch*2*Math.PI);c.stroke();c.restore();g.text('TP',170,34,COL.blue,11)}
  const k=seg(t,.2,.45);if(!stun)g.dot(lp(60,160,k),70,4,COL.gold);g.hero('Sven',50,70,'rad');if(stun){g.stars(170,70,t);g.text(g.T('ТП сорван','TP cancelled'),170,118,COL.gold,11)}},
'Корень прерывает Twin Gates':(g,t)=>{g.bg();g.circle(180,70,24,COL.violet,'rgba(160,122,232,.2)',1,3);g.hero('Slark',180,70,'dire');const root=t>.4;
  if(!root){g.text(g.T('переход…','warping…'),180,34,COL.violet,11)}const k=seg(t,.15,.4);if(!root)g.dot(lp(60,170,k),70,4,'#9be27e');g.hero('Treant Protector',50,70,'rad');
  if(root){for(let i=0;i<6;i++){const a=i*1.05;g.line(180+Math.cos(a)*8,70+Math.sin(a)*8,180+Math.cos(a)*18,70+Math.sin(a)*18,'#7bc75f',3)}g.text(g.T('рут — телепорт отменён','root — warp cancelled'),150,120,'#9be27e',11)}},
'Смок слетает рядом с врагом':(g,t)=>{g.bg();g.circle(220,70,48,COL.dire,null,.5,1.5,[4,4]);g.hero('Sniper',220,70,'dire');const x=lp(30,170,seg(t,0,.7));const inR=x>172-0.1;
  const sm=x<175&&t<.7;g.circle(x,70,22,null,'rgba(150,140,190,.35)',sm?1:0);g.hero('Pudge',x-6,64,'rad',{r:9,a:sm?.6:1});g.hero('Lion',x+6,78,'rad',{r:9,a:sm?.6:1});
  if(t>.7)g.text(g.T('смок пропал','smoke broken'),120,124,COL.white,11)},
'Агр крипов: ударь и отойди':(g,t)=>{g.bg();g.tower(25,70,'rad');const back=seg(t,.35,.8);const hx=lp(150,95,ez(back));g.hero('Lion',hx,95,'rad');g.hero('Sniper',215,95,'dire');
  if(t>.1&&t<.35)g.line(hx+10,95,203,95,COL.rad,2,[3,3]);[0,1,2].forEach(i=>{const cx=lp(185,hx+20+i*12,back*(t>.35?1:0));g.creep(cx,45+i*10+(back*40),'dire')});
  [0,1].forEach(i=>g.creep(110+i*10,45,'rad'));if(t>.8)g.text(g.T('линия ближе к башне','lane pulled to your tower'),140,128,COL.rad,11)},
'Сброс агра — атака по своему крипу':(g,t)=>{g.bg();g.hero('Lion',120,90,'rad');g.creep(150,60,'rad');const sw=t>.45;
  [0,1,2].forEach(i=>{const x=200+i*8,y=55+i*10;g.creep(x,y,'dire');g.line(x,y,sw?150:120,sw?60:90,'rgba(226,85,63,.6)',1.5,[3,3])});
  if(t>.3&&t<.5)g.line(120,90,150,60,COL.gold,2);if(sw)g.text(g.T('агр сброшен','aggro dropped'),120,124,COL.gold,11)},
'Отдай танго союзнику':(g,t)=>{g.bg();g.hero('Crystal Maiden',60,70,'rad');g.hero('Anti-Mage',210,70,'rad');const k=ez(seg(t,.15,.6));
  const c=g.c;c.save();c.translate(lp(75,195,k),70-Math.sin(k*Math.PI)*30);c.fillStyle='#6fbf4a';c.beginPath();c.ellipse(0,0,7,4,-.6,0,7);c.fill();c.restore();if(t>.65)g.text('+1 Tango',210,40,'#9be27e',11)},
'Стак на :53':(g,t)=>{g.bg();g.trees([[30,30],[250,30],[30,110],[250,110]]);const sec=Math.floor(lp(50,62,t))%60;g.text(`0:${String(sec).padStart(2,'0')}`,140,16,sec>=53&&sec<56?COL.gold:COL.white,13);
  const pull=seg(t,.25,.7);[0,1,2].forEach(i=>g.neutral(lp(130+i*10,40+i*10,pull),lp(70,110,pull),1));g.hero('Lion',lp(150,60,pull),lp(80,115,pull),'rad',{r:10});
  if(t>.8){[0,1,2].forEach(i=>g.neutral(130+i*10,70,1));g.text('×2',190,70,COL.gold,16)}},
'Стак древних для AoE-керри':(g,t)=>{g.bg();const st=1+Math.min(2,Math.floor(seg(t,0,.5)*3));for(let i=0;i<st*3;i++)g.neutral(110+(i%5)*12,55+Math.floor(i/5)*12);
  g.text('×'+st,200,62,COL.gold,16);const k=seg(t,.6,.85);if(k>0){g.circle(135,65,k*55,COL.dire,'rgba(226,85,63,.15)',1-k*.5,2);g.hero('Sven',135,110,'rad')}},
'Двойное нажатие — каст на себя':(g,t)=>{g.bg();const p1=t>.2&&t<.28,p2=t>.33&&t<.41;g.key(60,70,'G',p1||p2);g.text('×2',60,104,COL.gold,12);
  g.hero('Crystal Maiden',190,70,'rad',{a:t>.45?.45:1});if(t>.42)g.circle(190,70,20,'#b6d8ff','rgba(182,216,255,.18)',1,2);if(t>.45)g.text('Glimmer',190,108,'#b6d8ff',11)},
'Shift ставит команды в очередь':(g,t)=>{g.bg();const P:Pt[]=[[40,100],[110,40],[180,95],[240,45]];for(let i=0;i<3;i++){g.line(...P[i],...P[i+1],COL.gold,1.5,[4,4],.7);g.text(String(i+1),P[i+1][0],P[i+1][1]-14,COL.gold,11)}
  const k=t*3;const i=Math.min(2,Math.floor(k)),f=k-i;g.hero('Lion',lp(P[i][0],P[i+1][0],f),lp(P[i][1],P[i+1][1],f),'rad',{r:10});g.key(30,25,'⇧',true)},
'Alt-клик пишет команде':(g,t)=>{g.bg();g.item(70,70,'Black Hole',COL.violet,1,84);g.key(70,32,'Alt',t>.15&&t<.4);
  if(t>.35){g.c.fillStyle='rgba(0,0,0,.6)';g.c.fillRect(140,52,128,36);g.text(g.T('Black Hole: через 23 с','Black Hole: 23s left'),204,70,COL.white,10)}},
'Blink не дальше радиуса':(g,t)=>{g.bg();g.circle(70,70,70,COL.blue,null,.6,1.5,[4,4]);const second=t>.5;const k=seg(t,second?.6:.1,second?.75:.25);
  const target=second?[120,60]:[200,70];g.cross(target[0],target[1],5,COL.gold);const land=second?target:[115,70];g.hero('Anti-Mage',lp(70,land[0],k>0?1:0),lp(70,land[1],k>0?1:0),'rad',{r:10});
  g.text(second?g.T('внутри круга — точно','inside — exact'):g.T('за кругом — короче','outside — shorter'),140,126,second?COL.rad:COL.dire,11)},
'Бери контрпик последним':(g,t)=>{g.bg();const n=Math.min(5,Math.floor(seg(t,0,.6)*6));['Phantom Assassin','Pudge','Invoker','Axe','Crystal Maiden'].slice(0,n).forEach((h,i)=>g.hero(h,40+i*50,38,'dire',{r:13}));
  if(t>.7){g.hero('Earth Spirit',140,100,'rad',{r:15});g.check(172,100,8)}else g.text('?',140,100,COL.gold,22)},
'Первым — гибкого героя':(g,t)=>{g.bg();g.hero('Pangolier',60,70,'rad',{r:16});['Pos 1','Pos 2','Pos 3'].forEach((p,i)=>{const y=30+i*40;g.line(80,70,160,y,COL.gold,1.5,[3,3],seg(t,i*.15,i*.15+.2));g.item(195,y,p,COL.gold,seg(t,i*.15,i*.15+.2),50)});
  if(t>.6)g.text('?',255,70,COL.dire,22)}
};
