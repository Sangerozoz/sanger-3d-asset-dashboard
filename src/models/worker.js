import * as THREE from 'three';
import { V,mat,add,ell,box,bone,tube,loft,ribbon,canvasTexture,clothTexture,surfaceGeometry } from './geometry.js';

// Independent model. Front = +Z, soles = Y0; proportions measured from supplied four-view.
export function createWorker(){
 const g=new THREE.Group();g.name='参考人物 · 小工匠 (Sanger)';
 const weave=clothTexture();
 const skin=mat('#f5a36e',{roughness:.8}),inner=mat('#e99562'),hair=mat('#30251d',{roughness:.86});
 const red=mat('#d82332',{roughness:.83,bumpMap:weave,bumpScale:.007}),redSeam=mat('#e34446');
 const white=mat('#f6f2e9',{roughness:.87,bumpMap:weave,bumpScale:.006});
 const denim=mat('#245291',{roughness:.91,bumpMap:weave,bumpScale:.01}),edge=mat('#254775'),cuff=mat('#6286b1',{bumpMap:weave,bumpScale:.01});
 const stitch=mat('#b7a16b'),gold=mat('#d3a13c',{metalness:.62,roughness:.34}),sole=mat('#443123'),leather=mat('#704329',{roughness:.7}),bootEdge=mat('#9c673d');
 const glove=mat('#fff9e9',{roughness:.94}),gloveLine=mat('#d5d0c4');
 // Neck is visible between collar and chin.
 bone(g,skin,[0,3.94,0],[0,4.34,0],.255,.255,'neck');
 // Continuous shirt torso, rounded shoulders, shaped waist.
 loft(g,white,[[2.72,0,0,.34,.31],[2.80,0,0,.54,.39],[3.04,0,0,.62,.43],[3.42,0,-.02,.60,.41],[3.78,0,-.02,.57,.39],[3.99,0,-.02,.44,.33],[4.04,0,-.02,.25,.25]],'white tee body');
 // Soft collar seam with full back continuity.
 const collarPts=Array.from({length:33},(_,i)=>{const a=i/32*Math.PI*2;return [.27*Math.sin(a),4.005-.055*Math.cos(a),.22*Math.cos(a)];});tube(g,white,collarPts,.034,'ribbed collar');
 // Arms follow image: model right (screen left) elbow out, wrist forward at waist.
 sleeve([-0.53,3.80,0],[-.87,3.55,.01]);
 sleeve([.53,3.80,0],[.83,3.49,0]);
 bone(g,skin,[-.84,3.57,.01],[-1.11,3.34,.10],.19,.18,'right upper arm');ell(g,skin,[-1.11,3.34,.10],[.18,.18,.18]);
 bone(g,skin,[-1.11,3.34,.10],[-1.03,3.10,.39],.18,.15,'bent right forearm');
 bone(g,skin,[.81,3.52,0],[.95,3.15,.03],.18,.145,'left upper arm');ell(g,skin,[.95,3.15,.03],[.15,.16,.15]);bone(g,skin,[.95,3.15,.03],[1.03,2.62,.12],.145,.12,'relaxed left forearm');
 function sleeve(a,b){bone(g,white,a,b,.265,.23,'white short sleeve');ell(g,white,a,[.26,.245,.245]);const d=V(b).sub(V(a)).normalize();const c=V(b).addScaledVector(d,-.04);bone(g,white,c.toArray(),V(b).addScaledVector(d,.02).toArray(),.245,.245,'folded sleeve edge');}
 // Blue trouser hips. Long legs are shaped and splayed a little, with a clear crotch.
 loft(g,denim,[[2.26,0,-.01,.41,.26],[2.45,0,-.015,.62,.36],[2.72,0,-.015,.65,.37],[2.96,0,-.015,.58,.34],[3.04,0,0,.52,.30]],'overall waist and hips');
 for(const s of [-1,1]){
  loft(g,denim,[[.63,s*.53,-.005,.29,.27],[.80,s*.53,-.005,.34,.29],[1.02,s*.52,-.01,.34,.30],[1.45,s*.48,-.025,.32,.31],[1.90,s*.40,-.02,.35,.33],[2.30,s*.34,-.02,.34,.34],[2.62,s*.32,-.02,.30,.32]],s<0?'right trouser leg':'left trouser leg');
  const c=box(g,cuff,[s*.53,.75,.005],[.73,.27,.65],.085,'rolled denim cuff');c.rotation.z=s*.035;
  tube(g,edge,[[s*.87,.84,.07],[s*.86,.77,.20],[s*.79,.69,.29]],.009,'cuff fold');
  tube(g,stitch,[[s*.83,.95,.07],[s*.78,1.40,.11],[s*.70,1.98,.14],[s*.62,2.45,.17],[s*.61,2.74,.20]],.009,'outer trouser double stitch');
  
  // Curved front hip pocket and rear five-sided patch pocket.
  tube(g,edge,[[s*.30,2.91,.333],[s*.37,2.69,.306],[s*.52,2.54,.23],[s*.60,2.52,.16]],.014,'hip pocket binding');
  tube(g,stitch,[[s*.33,2.90,.335],[s*.40,2.70,.303],[s*.54,2.57,.23],[s*.61,2.56,.16]],.006,'hip pocket stitch');
  patchPocket(s*.34,2.59,-.355,.37,.42,true);
  boots(s*.54);
 }
 // Fly and waistband, belt loops; no exposed underwear gap.
 tube(g,stitch,[[.05,2.90,.367],[.06,2.58,.371],[.05,2.43,.354],[-.02,2.39,.34]],.008,'fly stitching');
 loft(g,denim,[[2.84,0,-.01,.642,.381],[2.91,0,-.01,.63,.375],[2.97,0,-.01,.61,.36]],'waistband');
 for(const a of [-2.5,-1.4,-.5,.5,1.4,2.5]){const x=.632*Math.sin(a),z=.38*Math.cos(a);const m=box(g,edge,[x,2.91,z],[.065,.21,.025],.01,'belt loop');m.rotation.y=a;}
 // Bib itself is a real bowed fabric shell, contoured at the sides.
 const bibFn=(u,v,back=false)=>{const y=2.96+v*.79,w=.50-v*.08;const x=(u-.5)*2*w;const z=(back?-1:1)*(.355+Math.sin(u*Math.PI)*.055-(v*.01));return [x,y,z];};
 add(g,surfaceGeometry((u,v)=>bibFn(u,v),24,24),denim,[0,0,0],'front bib').material.side=THREE.DoubleSide;
 for(const s of [-1,1])tube(g,edge,[[s*.50,2.96,.36],[s*.46,3.35,.37],[s*.42,3.75,.35]],.025,'bib piped edge');
 tube(g,stitch,[[-.40,3.72,.37],[0,3.72,.405],[.40,3.72,.37]],.009,'bib top stitch');
 patchPocket(0,3.32,.419,.52,.32,false);
 // Broad shoulder straps follow both shoulder and back. Attachment back matches image H shape.
 for(const s of [-1,1]){
  const p=[[s*.35,3.65,.38],[s*.40,3.89,.30],[s*.44,4.025,.04],[s*.44,3.98,-.20],[s*.32,3.64,-.35],[s*.25,3.53,-.38]];
  ribbon(g,denim,p,.17,.018,'continuous suspender');
  tube(g,stitch,p.map(a=>[a[0]+s*.062,a[1],a[2]+(a[2]>0?.015:-.015)]),.006,'suspender stitch');
  ell(g,gold,[s*.35,3.67,.421],[.092,.092,.030],'brass suspender button');
  const ring=new THREE.TorusGeometry(.071,.009,8,32);add(g,ring,mat('#f2c65f',{metalness:.6,roughness:.3}),[s*.35,3.67,.451],'button rim');
 }
 add(g,surfaceGeometry((u,v)=>[(u-.5)*(.94-v*.24),2.98+v*.58,-.38-Math.sin(u*Math.PI)*.02],24,24),denim,[0,0,0],'back bib').material.side=THREE.DoubleSide;
 tube(g,stitch,[[-.35,3.54,-.403],[0,3.54,-.418],[.35,3.54,-.403]],.008,'rear bib top');
 // Rounded continuous head, independent front/back geometry.
 const headGeo=new THREE.SphereGeometry(1,96,72);const hp=headGeo.attributes.position,huv=headGeo.attributes.uv;
 for(let i=0;i<hp.count;i++){
  const ny=hp.getY(i),width=.80*(1+.095*Math.exp(-Math.pow((ny+.28)/.48,2))-.06*Math.max(0,-ny));
  const x=hp.getX(i)*width,y=4.93+ny*.79,z=hp.getZ(i)*.73;
  const angle=Math.atan2(x/width,z/.59);hp.setXYZ(i,x,y,z);huv.setXY(i,.5+angle/(Math.PI*2),(y-4.12)/1.58);
 }
 headGeo.computeVertexNormals();
 const head=add(g,headGeo,mat('#ffffff',{map:faceTexture(),roughness:.81}),[0,0,0],'continuous sculpted rounded face');
 // Ears have concha and a curved helix, not separate cheek balls.
 for(const s of [-1,1]){
  const ear=new THREE.Group();ear.name='ear';ear.position.set(s*.805,4.66,-.005);ear.rotation.y=s*.12;g.add(ear);
  ell(ear,skin,[s*.07,0,0],[.19,.235,.125]);ell(ear,inner,[s*.085,0,.094],[.105,.15,.035]);
  tube(ear,skin,[[s*.01,-.12,.118],[s*.11,-.13,.115],[s*.155,.01,.10],[s*.11,.14,.095],[s*.02,.13,.11]],.036,'ear helix',28);
 }
 // Nose and tiny lower-lip ridge blend into the head surface.
 ell(g,skin,[0,4.75,.567],[.145,.117,.135],'soft button nose');
 // Hair cap sits behind face; scalloped locks describe nape and temples.
 const hairCap=ell(g,hair,[0,5.01,-.18],[.76,.70,.60],'hair foundation');
 // Overlapping locks make one continuous nape silhouette instead of a bead chain.
 for(let row=0;row<3;row++)for(let i=0;i<7-row;i++){
   const a=Math.PI*.54+(i/(6-row))*Math.PI*.92;
   const x=Math.sin(a)*(.67-row*.045),z=Math.cos(a)*(.56-row*.02)-.15;
   const m=ell(g,hair,[x,5.03-row*.205,z],[.235,.25,.18],'nape hair lock');m.rotation.z=-Math.sin(a)*.24;
 }
 ell(g,hair,[0,4.72,-.47],[.55,.34,.22],'continuous lower nape');
 for(const s of [-1,1]){ell(g,hair,[s*.70,5.08,.10],[.14,.22,.17],'temple hair');const m=ell(g,hair,[s*.71,4.96,.255],[.073,.18,.105],'sideburn');m.rotation.z=s*.2;}
 // Curved fringe locks are kept clear of the eye/eyebrow area.
 const fringe=[[-.48,5.38,.39,.18],[-.26,5.45,.50,-.22],[.01,5.44,.55,-.25],[.25,5.46,.50,.20],[.47,5.39,.39,-.18]];
 for(const [x,y,z,r]of fringe){const m=ell(g,hair,[x,y,z],[.20,.135,.075],'swept fringe');m.rotation.z=r;}
 // Trim the hair mass to the inner cap band, eliminating hair/crown intersections.
 g.updateMatrixWorld(true);g.traverse(m=>{if(m.isMesh && m.material===hair){const p=m.geometry.attributes.position;const inv=m.matrixWorld.clone().invert();for(let i=0;i<p.count;i++){const q=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);const a=Math.atan2(q.x,q.z+.025);q.y=Math.min(q.y,5.25+.19*Math.max(0,Math.cos(a))-.022);q.applyMatrix4(inv);p.setXYZ(i,q.x,q.y,q.z);}p.needsUpdate=true;m.geometry.computeVertexNormals();}});
 cap();
 // Hammer is genuinely horizontal, held at the waist by one glove.
 const woodTex=canvasTexture((c,w,h)=>{c.fillStyle='#ae692f';c.fillRect(0,0,w,h);for(let i=0;i<80;i++){const y=i*h/80;c.strokeStyle=i%3?'rgba(84,37,13,.19)':'rgba(245,191,106,.28)';c.lineWidth=1+(i%3);c.beginPath();for(let x=0;x<=w;x+=8){const yy=y+Math.sin(x*.012+i*.72)*3+Math.sin(x*.033+i)*1.5;x?c.lineTo(x,yy):c.moveTo(x,yy);}c.stroke();}},1024,256);
 const wood=mat('#ffffff',{map:woodTex,roughness:.65});
 bone(g,wood,[-1.48,2.98,.59],[1.09,2.98,.59],.139,.139,'horizontal wooden hammer handle');ell(g,wood,[-1.48,2.98,.59],[.09,.138,.138],'rounded handle butt');
 const metalNoise=canvasTexture((c,w,h)=>{c.fillStyle='#969696';c.fillRect(0,0,w,h);let n=12345;for(let i=0;i<11000;i++){n=(n*16807)%2147483647;const x=n%w;n=(n*16807)%2147483647;const y=n%h;c.fillStyle=i%2?'#a0a0a0':'#898989';c.fillRect(x,y,2,2);}},256,256);
 const steel=mat('#9a9da0',{metalness:.72,roughness:.48,bumpMap:metalNoise,bumpScale:.04});
 box(g,steel,[.76,3.01,.59],[.72,.84,.76],.095,'beveled steel hammer head');
 // Small face chamfer inset reads a single cast solid, not a black sticker.
 box(g,mat('#92979a',{metalness:.73,roughness:.46,bumpMap:metalNoise,bumpScale:.03}),[.76,3.01,.97],[.57,.67,.014],.045,'hammer forged face');
 graspGlove(); relaxedGlove();
 g.userData={label:'小工匠 (Sanger)',height:6.18,reference:'public/reference.png',source:'procedural geometry',front:'+Z'};
 return g;

 function patchPocket(x,y,z,w,h,back){
  const shape=new THREE.Shape();shape.moveTo(-w/2,h/2);shape.lineTo(w/2,h/2);shape.lineTo(w*.45,-h*.32);shape.quadraticCurveTo(0,-h*.70,-w*.45,-h*.32);shape.closePath();
  const mesh=add(g,new THREE.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.008}),denim,[x,y,z],'stitched patch pocket');if(back)mesh.rotation.y=Math.PI;
  const sign=back?-1:1;const zz=z+sign*.038;
  tube(g,stitch,[[x-w*.43,y+h*.39,zz],[x-w*.39,y-h*.27,zz],[x,y-h*.49,zz],[x+w*.39,y-h*.27,zz],[x+w*.43,y+h*.39,zz]],.006,'pocket saddle stitch');
  tube(g,edge,[[x-w*.47,y+h*.48,zz],[x,y+h*.48,zz],[x+w*.47,y+h*.48,zz]],.013,'pocket opening');
 }
 function boots(x){
  const foot=new THREE.Group();foot.position.set(x,0,.075);foot.rotation.y=x>0?.06:-.06;g.add(foot);foot.name='constructed leather work boot';
  const outline=(a,rx,rz,cz)=>[Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.80)*rx*(.90+.10*Math.cos(a)),cz+Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.85)*rz];
  function shoeShell(name,sections,material){const profile=new THREE.CatmullRomCurve3(sections.map(r=>new THREE.Vector3(r[1],r[0],r[2])));const centers=new THREE.CatmullRomCurve3(sections.map(r=>new THREE.Vector3(r[3],0,0)));return add(foot,surfaceGeometry((u,v)=>{const p=profile.getPoint(v),a=u*Math.PI*2;let [x,z]=outline(a,p.x,p.z,centers.getPoint(v).x);if(name==='shaped rubber outsole'&&p.y<.12){const dent=Math.pow(Math.max(0,Math.cos(a*16)),14)*.025;x*=1-dent/.4;z=centers.getPoint(v).x+(z-centers.getPoint(v).x)*(1-dent/.52);}return [x,p.y,z];},64,40),material,[0,0,0],name);}
  shoeShell('shaped rubber outsole',[[.015,.37,.51,.075],[.035,.40,.54,.075],[.17,.40,.54,.075],[.205,.38,.525,.075]],sole);
  shoeShell('stitched leather welt',[[.183,.39,.53,.075],[.215,.40,.54,.075],[.24,.38,.515,.075]],bootEdge);
  shoeShell('continuous leather toe heel and ankle',[[.22,.375,.505,.075],[.30,.38,.50,.065],[.43,.36,.45,.03],[.56,.30,.33,-.08],[.70,.265,.25,-.13],[.79,.25,.23,-.13]],leather);
  const tongue=box(foot,leather,[0,.58,.15],[.32,.29,.07],.06,'padded tongue');tongue.rotation.x=-.35;
  for(let i=0;i<3;i++){let y=.42+i*.065,z=.405-i*.078;for(const s of [-1,1])ell(foot,sole,[s*.14,y,z],[.026,.025,.013],'lace eyelet');tube(foot,sole,[[-.14,y,z],[0,y+.012,z+.026],[.14,y+.015,z]],.016,'boot lace');}
  tube(foot,bootEdge,[[-.33,.29,.31],[-.26,.37,.44],[0,.43,.48],[.26,.37,.44],[.33,.29,.31]],.009,'toe seam');
  tube(foot,bootEdge,[[-.27,.62,-.31],[-.28,.42,-.32],[-.30,.27,-.33]],.008,'heel seam');
 }
 function cap(){
   // Tailored dome: x radius .79; high forehead arch, low back edge.
   const brimY=phi=>5.25+.19*Math.max(0,Math.cos(phi));
   const dome=(u,v)=>{const phi=(u-.5)*Math.PI*2,theta=v*Math.PI/2;const rr=Math.sin(theta),base=brimY(phi);return [.86*rr*Math.sin(phi),base+(6.14-base)*Math.cos(theta),-.025+.72*rr*Math.cos(phi)];};
   const crown=add(g,surfaceGeometry(dome,96,40),red,[0,0,0],'six panel fitted baseball crown');crown.material.side=THREE.DoubleSide;
   const bandPts=Array.from({length:81},(_,i)=>dome(i/80,1));tube(g,red,bandPts,.03,'cap lower piping');
   for(let k=0;k<6;k++){const u=k/6;const points=Array.from({length:30},(_,i)=>{const p=dome(u,.035+i/29*.965);p[0]*=1.004;p[2]*=1.004;p[1]+=.006;return p;});tube(g,redSeam,points,.008,'cap panel seam');}
   ell(g,red,[0,6.16,-.025],[.10,.042,.087],'cap top button');
   // Curved visor shell with top, underside, and stitched perimeter. No flat rectangle.
   const visor=(u,v,offset=0)=>{const a=(u-.5)*2;const x=.84*a;const innerZ=.39+.25*Math.sqrt(Math.max(0,1-a*a));const outerZ=.43+.83*Math.sqrt(Math.max(0,1-a*a));const y=5.44-.20*Math.pow(Math.abs(a),1.7)-.075*Math.sin(v*Math.PI*.75)+offset;return [x,y,innerZ+(outerZ-innerZ)*v];};
   add(g,surfaceGeometry((u,v)=>visor(u,v),64,20),red,[0,0,0],'curved visor top').material.side=THREE.DoubleSide;
   add(g,surfaceGeometry((u,v)=>visor(u,v,-.038),64,20),mat('#aa1d28'),[0,0,0],'visor underside').material.side=THREE.DoubleSide;
   const outer=Array.from({length:61},(_,i)=>visor(i/60,1,-.018));tube(g,red,outer,.023,'thin rounded visor edge');
   const seam=Array.from({length:61},(_,i)=>visor(.025+i/60*.95,.88,.007));tube(g,redSeam,seam,.007,'visor stitched arc');
 }
 function graspGlove(){
  // Right wrist joins a broad palm, with four fingers curling over the wood.
  bone(g,glove,[-1.04,3.18,.35],[-1.02,3.08,.46],.174,.177,'right glove cuff');
  ell(g,glove,[-1.00,3.01,.57],[.265,.235,.14],'gripping palm');
  for(let i=0;i<4;i++){
   const x=-1.20+i*.135;const drop=i===0?.025:i===3?.04:0;
   tube(g,glove,[[x,3.10,.62],[x,2.99,.745],[x,2.84+drop,.737],[x+.015,2.81+drop,.64]],.077,'curled glove finger',20);
  }
  tube(g,glove,[[-.79,3.09,.53],[-.75,3.00,.66],[-.84,2.94,.74]],.085,'opposing grasp thumb',20);
  for(const x of [-1.12,-1.00,-.88])tube(g,gloveLine,[[x,3.155,.633],[x+.015,3.08,.689]],.004,'glove back seam',8);
 }
 function relaxedGlove(){
  bone(g,glove,[1.02,2.65,.12],[1.035,2.54,.14],.145,.16,'left glove cuff');
  const hand=new THREE.Group();hand.name='relaxed five digit glove';hand.position.set(1.05,2.37,.15);hand.rotation.z=.08;g.add(hand);
  ell(hand,glove,[0,0,0],[.19,.24,.13],'left palm');
  for(let i=0;i<4;i++){const x=-.115+i*.082;const end=-.32+(i===0?.04:i===3?.06:0);tube(hand,glove,[[x,-.09,.015],[x+.025,-.22,.025],[x+.005,end,.095],[x-.015,end+.035,.14]],.052,'relaxed finger',18);}
  tube(hand,glove,[[-.15,.05,.015],[-.225,-.06,.07],[-.22,-.17,.105]],.072,'relaxed thumb',20);
 }
}

function faceTexture(){
 return canvasTexture((c,w,h)=>{
  c.fillStyle='#f5a36e';c.fillRect(0,0,w,h);
  const pt=(x,y)=>[w*(.5+Math.asin(Math.max(-.99,Math.min(.99,x/.72)))/(Math.PI*2)),h*(1-(y-4.12)/1.58)];
  const ellipse=(x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();};
  for(const s of [-1,1]){
   const [x,y]=pt(s*.46,4.65);const grad=c.createRadialGradient(x,y,2,x,y,75);grad.addColorStop(0,'rgba(233,118,91,.30)');grad.addColorStop(.6,'rgba(236,126,95,.17)');grad.addColorStop(1,'rgba(248,175,121,0)');c.save();c.translate(x,y);c.scale(1,1.15);c.fillStyle=grad;c.translate(-x,-y);c.fillRect(x-85,y-85,170,170);c.restore();
   const [ex,ey]=pt(s*.245,4.98),rx=65,ry=178;
   // Upper lash line and barely warm lower lid are painted into the skin surface.
   ellipse(ex,ey,rx+4,ry+5,'#a97552');ellipse(ex,ey+2,rx,ry,'#fffaf0');
   c.beginPath();c.ellipse(ex,ey-2,rx+2,ry+3,0,Math.PI,Math.PI*2);c.strokeStyle='#433126';c.lineWidth=7;c.stroke();
   const ix=ex+s*5,iy=ey+12;
   let ir=c.createRadialGradient(ix-10,iy-45,8,ix,iy,108);ir.addColorStop(0,'#75462a');ir.addColorStop(.65,'#382820');ir.addColorStop(1,'#1c1a18');ellipse(ix,iy,45,145,ir);
   ellipse(ix+2,iy+4,30,111,'#211d19');ellipse(ix-11,iy-58,14,35,'#fffdf8');ellipse(ix+15,iy+60,5,14,'rgba(255,251,232,.72)');
   const brow=[pt(s*.12,5.24),pt(s*.24,5.30),pt(s*.38,5.24)];c.beginPath();c.moveTo(...brow[0]);c.quadraticCurveTo(...brow[1],...brow[2]);c.strokeStyle='#3b2a1e';c.lineWidth=25;c.lineCap='round';c.stroke();
  }
  const left=pt(-.28,4.59),middle=pt(0,4.39),right=pt(.28,4.59);c.beginPath();c.moveTo(...left);c.quadraticCurveTo(...middle,...right);c.lineWidth=21;c.strokeStyle='#8d2e23';c.lineCap='round';c.stroke();
  const ll=pt(-.15,4.48),mm=pt(0,4.435),rr=pt(.15,4.48);c.beginPath();c.moveTo(...ll);c.quadraticCurveTo(...mm,...rr);c.strokeStyle='rgba(255,201,153,.7)';c.lineWidth=9;c.stroke();
 },2048,1536);
}
