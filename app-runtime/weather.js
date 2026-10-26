import * as THREE from './vendor/three.module.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const WEATHER_MODES=['cycle','golden','rain','night','aurora'];
export function weatherState(seconds,mode='cycle'){
 if(mode==='golden')return {hour:17.35,elevation:.18,day:.68,age:50,rain:0,cloud:.15,rainbow:.35,lightning:0,aurora:0};
 if(mode==='rain')return {hour:15.2,elevation:.45,day:.75,age:15,rain:.88,cloud:.85,rainbow:.42,lightning:0,aurora:0};
 if(mode==='night')return {hour:23.0,elevation:-.85,day:0,age:-1,rain:0,cloud:0,rainbow:0,lightning:0,aurora:0};
 if(mode==='aurora')return {hour:0.5,elevation:-.92,day:0,age:-1,rain:0,cloud:.08,rainbow:0,lightning:0,aurora:1};
 const hour=(14+Math.max(0,seconds)/15)%24,elevation=Math.sin((hour-6)*Math.PI/12),day=smooth(-.12,.28,elevation);
 const age=seconds<240?-1:(seconds-240)%240;
 const rain=age>=0&&age<32?smooth(0,7,age)*(1-smooth(24,32,age)):0;
 const cloud=age>=0&&age<45?smooth(0,6,age)*(1-smooth(29,45,age)):0;
 const rainbow=age>=32&&age<77?smooth(32,39,age)*(1-smooth(62,77,age))*day:0;
 let lightning=0;for(const strike of [11,23])if(age>=strike&&age<strike+1.2)lightning=Math.max(lightning,(1-smooth(strike,strike+1.2,age))*.7);
 return {hour,elevation,day,age,rain,cloud,rainbow,lightning:rain>.3?lightning:0,aurora:0};
}
export class OutdoorWeather {
 constructor(scene,sky,stars,sun,moon){
  Object.assign(this,{scene,sky,stars,sun,moon,mode:'cycle'});
  for(const m of [sky,stars,sun,moon]){m.userData.dynamic=true;m.material.fog=false;}
  stars.material.transparent=true;stars.material.depthWrite=false;
  sky.material.uniforms.cloud={value:0};sky.material.uniforms.time={value:0};sky.material.uniforms.flash={value:0};
  this.dayTop=new THREE.Color('#367fc6');this.nightTop=new THREE.Color('#07132f');this.dayHorizon=new THREE.Color('#c8e7ee');this.nightHorizon=new THREE.Color('#263354');this.sunset=new THREE.Color('#ffa071');this.stormTop=new THREE.Color('#303e54');this.stormHorizon=new THREE.Color('#687887');this.auroraHorizon=new THREE.Color('#194d58');
  const vertices=[];for(let i=0;i<420;i++){
   const x=-10.2-((i*0.6180339)%1)*11,z=((i*.75487766)%1)*24-12,y=((i*.5698403)%1)*11;
   vertices.push(x,y,z,x+.07,y+.36,z+.035);
  }
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const rainMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},opacity:{value:0}},vertexShader:'attribute float baseY;uniform float time;void main(){vec3 p=position;float y0=baseY;float delta=p.y-y0;p.y=mod(y0-time*7.0,11.0)-.5+delta;p.z+=sin(time*.4)*.2;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'uniform float opacity;void main(){gl_FragColor=vec4(.66,.80,.92,opacity);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
  // A per-vertex base avoids relying on gl_VertexID / a particular GLSL version.
  const base=[];for(let i=0;i<420;i++)base.push(((i*.5698403)%1)*11,((i*.5698403)%1)*11);
  rainGeometry.setAttribute('baseY',new THREE.Float32BufferAttribute(base,1));
  this.rain=new THREE.LineSegments(rainGeometry,rainMaterial);this.rain.frustumCulled=false;scene.add(this.rain);
  const rainbowPositions=[],rainbowColors=[],palette=['#f16b79','#ffaf6b','#ffe89b','#97d698','#76cce5','#799aeb','#b494dd'];
  for(let band=0;band<7;band++)for(let j=0;j<64;j++){
   const a=j*Math.PI/64,b=(j+1)*Math.PI/64,r=8-band*.19,r2=r-.20,color=new THREE.Color(palette[band]);
   for(const [angle,radius] of [[a,r],[b,r],[a,r2],[b,r],[b,r2],[a,r2]]){rainbowPositions.push(-23,.25+Math.sin(angle)*radius,Math.cos(angle)*radius);rainbowColors.push(color.r,color.g,color.b);}
  }
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rainbowPositions,3));rg.setAttribute('color',new THREE.Float32BufferAttribute(rainbowColors,3));
  this.rainbow=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,fog:false}));this.rainbow.userData.dynamic=true;scene.add(this.rainbow);
  const auroraGeo=new THREE.PlaneGeometry(56,14,48,1);auroraGeo.rotateY(Math.PI/2);
  const auroraMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0},opacity:{value:0}},vertexShader:'uniform float time;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.x+=sin(p.z*.22+time*.7)*1.8+cos(p.z*.45-time*.4)*.9;p.y+=sin(p.z*.18+time*.5)*.8;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',fragmentShader:'uniform float time;uniform float opacity;varying vec2 vUv;void main(){float wave=sin(vUv.x*18.0+time*1.1)*.5+.5;float fade=smoothstep(0.0,0.28,vUv.y)*smoothstep(1.0,0.18,vUv.y)*smoothstep(0.0,0.12,vUv.x)*smoothstep(1.0,0.88,vUv.x);vec3 col=mix(vec3(0.18,0.92,0.68),vec3(0.52,0.38,0.95),vUv.y*.75+wave*.25);gl_FragColor=vec4(col,fade*(0.35+0.35*wave)*opacity);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
  this.aurora=new THREE.Mesh(auroraGeo,auroraMat);this.aurora.position.set(-25,13,0);this.aurora.userData.dynamic=true;scene.add(this.aurora);
  this.bolt=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[ -24,16,-3],[-24,12,-2],[-24,10,-3.4],[-24,7,-2.6],[-24,5,-3.3]].map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color:0xddeaff,transparent:true,opacity:0,depthWrite:false,fog:false}));scene.add(this.bolt);
  this.update(0);
 }
 setMode(mode){if(WEATHER_MODES.includes(mode))this.mode=mode;}
 update(seconds){
  const w=weatherState(seconds,this.mode),angle=(w.hour-6)*Math.PI/12;
  this.sky.material.uniforms.zenith.value.copy(this.nightTop).lerp(this.dayTop,w.day).lerp(this.stormTop,w.cloud*.72);
  this.sky.material.uniforms.horizon.value.copy(this.nightHorizon).lerp(this.dayHorizon,w.day).lerp(this.sunset,(1-smooth(.05,.5,Math.abs(w.elevation)))*.82).lerp(this.stormHorizon,w.cloud*.78);
  if(w.aurora>0)this.sky.material.uniforms.horizon.value.lerp(this.auroraHorizon,.55);
  this.sky.material.uniforms.cloud.value=w.cloud;this.sky.material.uniforms.time.value=seconds;this.sky.material.uniforms.flash.value=w.lightning*.18;
  this.sun.position.set(-43,Math.sin(angle)*25,Math.cos(angle)*30);this.sun.visible=w.elevation>-.08&&w.cloud<.85;
  this.moon.position.set(-43,-Math.sin(angle)*23,-Math.cos(angle)*30);this.moon.visible=w.elevation<.08&&w.cloud<.85;
  this.stars.material.opacity=(1-w.day)*(1-w.cloud)*.9;this.stars.visible=this.stars.material.opacity>.01;
  this.rain.visible=w.rain>.01;this.rain.material.uniforms.time.value=seconds;this.rain.material.uniforms.opacity.value=w.rain*.5;
  this.rainbow.visible=w.rainbow>.01;this.rainbow.material.opacity=w.rainbow*.38;
  if(this.aurora){this.aurora.visible=w.aurora>.01;this.aurora.material.uniforms.time.value=seconds;this.aurora.material.uniforms.opacity.value=w.aurora;}
  this.bolt.visible=w.lightning>.01;this.bolt.material.opacity=w.lightning;
  // Preserve the room's playable nighttime lighting; only the existing daylight fill changes.
  const sunLight=this.scene.userData.daylight,ambient=this.scene.userData.ambientLight;
  if(sunLight){sunLight.intensity=.60+w.day*1.05-w.cloud*.18;sunLight.color.set(w.aurora>0?0xb8f2e6:w.elevation<.4&&w.elevation>-.1?0xffc294:0xffdfbc);}
  if(ambient)ambient.intensity=1.0+w.day*.18-w.cloud*.06;
  if(this.scene.fog)this.scene.fog.color.copy(this.sky.material.uniforms.horizon.value);
  return w;
 }
}
