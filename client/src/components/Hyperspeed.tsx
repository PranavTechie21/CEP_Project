import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from 'postprocessing';

import './Hyperspeed.css';

type EffectOptions = {
  onSpeedUp?: (ev?: any) => void;
  onSlowDown?: (ev?: any) => void;
  distortion?: string;
  length?: number;
  roadWidth?: number;
  islandWidth?: number;
  lanesPerRoad?: number;
  fov?: number;
  fovSpeedUp?: number;
  speedUp?: number;
  carLightsFade?: number;
  totalSideLightSticks?: number;
  lightPairsPerRoadWay?: number;
  shoulderLinesWidthPercentage?: number;
  brokenLinesWidthPercentage?: number;
  brokenLinesLengthPercentage?: number;
  lightStickWidth?: [number, number];
  lightStickHeight?: [number, number];
  movingAwaySpeed?: [number, number];
  movingCloserSpeed?: [number, number];
  carLightsLength?: [number, number];
  carLightsRadius?: [number, number];
  carWidthPercentage?: [number, number];
  carShiftX?: [number, number];
  carFloorSeparation?: [number, number];
  colors?: {
    roadColor: number;
    islandColor: number;
    background: number;
    shoulderLines: number;
    brokenLines: number;
    leftCars: number[];
    rightCars: number[];
    sticks: number | number[];
  };
};

const defaultOptions: Required<EffectOptions> = {
  onSpeedUp: () => { },
  onSlowDown: () => { },
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 50,
  lightPairsPerRoadWay: 100,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [80, 120],
  movingCloserSpeed: [-160, -220],
  carLightsLength: [400 * 0.05, 400 * 0.25],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x060606,
    islandColor: 0x070707,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xff4bd1, 0x8f6cff, 0xfc5ac3],
    rightCars: [0x00eaff, 0x2a7bff, 0x5cc8ff],
    sticks: 0x00eaff,
  },
};

export default function Hyperspeed({ effectOptions = defaultOptions, containerId = 'lights' as string }: { effectOptions?: EffectOptions; containerId?: string }) {
  const appRef = useRef<any>(null);

  useEffect(() => {
    if (appRef.current) {
      appRef.current.dispose();
      const containerOld = document.getElementById(containerId);
      if (containerOld) {
        while (containerOld.firstChild) containerOld.removeChild(containerOld.firstChild);
      }
    }

    // uniforms
    const mountainUniforms = { uFreq: { value: new THREE.Vector3(3, 6, 10) }, uAmp: { value: new THREE.Vector3(30, 30, 20) } };
    const xyUniforms = { uFreq: { value: new THREE.Vector2(5, 2) }, uAmp: { value: new THREE.Vector2(25, 15) } };
    const longRaceUniforms = { uFreq: { value: new THREE.Vector2(2, 3) }, uAmp: { value: new THREE.Vector2(35, 10) } };
    const turbulentUniforms = { uFreq: { value: new THREE.Vector4(4, 8, 8, 1) }, uAmp: { value: new THREE.Vector4(25, 5, 10, 10) } };
    const deepUniforms = { uFreq: { value: new THREE.Vector2(4, 8) }, uAmp: { value: new THREE.Vector2(10, 20) }, uPowY: { value: new THREE.Vector2(20, 2) } };

    const nsin = (v: number) => Math.sin(v) * 0.5 + 0.5;

    const distortions: any = {
      mountainDistortion: {
        uniforms: mountainUniforms,
        getDistortion: `
          uniform vec3 uAmp; uniform vec3 uFreq; #define PI 3.14159265358979
          float nsin(float val){ return sin(val) * 0.5 + 0.5; }
          vec3 getDistortion(float progress){ float m=0.02; return vec3(
            cos(progress*PI*uFreq.x+uTime)*uAmp.x - cos(m*PI*uFreq.x+uTime)*uAmp.x,
            nsin(progress*PI*uFreq.y+uTime)*uAmp.y - nsin(m*PI*uFreq.y+uTime)*uAmp.y,
            nsin(progress*PI*uFreq.z+uTime)*uAmp.z - nsin(m*PI*uFreq.z+uTime)*uAmp.z ); }`,
        getJS: (p: number, t: number) => {
          const m = 0.02, uF = mountainUniforms.uFreq.value, uA = mountainUniforms.uAmp.value;
          const d = new THREE.Vector3(
            Math.cos(p * Math.PI * uF.x + t) * uA.x - Math.cos(m * Math.PI * uF.x + t) * uA.x,
            nsin(p * Math.PI * uF.y + t) * uA.y - nsin(m * Math.PI * uF.y + t) * uA.y,
            nsin(p * Math.PI * uF.z + t) * uA.z - nsin(m * Math.PI * uF.z + t) * uA.z);
          return d.multiply(new THREE.Vector3(2, 2, 2)).add(new THREE.Vector3(0, 0, -5));
        }
      },
      xyDistortion: {
        uniforms: xyUniforms,
        getDistortion: `uniform vec2 uFreq; uniform vec2 uAmp; #define PI 3.14159265358979
          vec3 getDistortion(float progress){ float m=0.02; return vec3(
            cos(progress*PI*uFreq.x+uTime)*uAmp.x - cos(m*PI*uFreq.x+uTime)*uAmp.x,
            sin(progress*PI*uFreq.y+PI/2.+uTime)*uAmp.y - sin(m*PI*uFreq.y+PI/2.+uTime)*uAmp.y, 0. ); }`,
        getJS: (p: number, t: number) => {
          const m = 0.02, uF = xyUniforms.uFreq.value, uA = xyUniforms.uAmp.value;
          const d = new THREE.Vector3(
            Math.cos(p * Math.PI * uF.x + t) * uA.x - Math.cos(m * Math.PI * uF.x + t) * uA.x,
            Math.sin(p * Math.PI * uF.y + t + Math.PI / 2) * uA.y - Math.sin(m * Math.PI * uF.y + t + Math.PI / 2) * uA.y, 0);
          return d.multiply(new THREE.Vector3(2, 0.4, 1)).add(new THREE.Vector3(0, 0, -3));
        }
      },
      LongRaceDistortion: {
        uniforms: longRaceUniforms,
        getDistortion: `uniform vec2 uFreq; uniform vec2 uAmp; #define PI 3.14159265358979
          vec3 getDistortion(float progress){ float c=0.0125; return vec3(
            sin(progress*PI*uFreq.x+uTime)*uAmp.x - sin(c*PI*uFreq.x+uTime)*uAmp.x,
            sin(progress*PI*uFreq.y+uTime)*uAmp.y - sin(c*PI*uFreq.y+uTime)*uAmp.y, 0. ); }`,
        getJS: (p: number, t: number) => { const c = 0.0125, uF = longRaceUniforms.uFreq.value, uA = longRaceUniforms.uAmp.value; const d = new THREE.Vector3(Math.sin(p * Math.PI * uF.x + t) * uA.x - Math.sin(c * Math.PI * uF.x + t) * uA.x, Math.sin(p * Math.PI * uF.y + t) * uA.y - Math.sin(c * Math.PI * uF.y + t) * uA.y, 0); return d.multiply(new THREE.Vector3(1, 1, 0)).add(new THREE.Vector3(0, 0, -5)); }
      },
      turbulentDistortion: {
        uniforms: turbulentUniforms,
        getDistortion: `uniform vec4 uFreq; uniform vec4 uAmp; float nsin(float v){return sin(v)*0.5+0.5;} #define PI 3.14159265358979
          float getX(float p){ return cos(PI*p*uFreq.r+uTime)*uAmp.r + pow(cos(PI*p*uFreq.g+uTime*(uFreq.g/uFreq.r)),2.)*uAmp.g; }
          float getY(float p){ return -nsin(PI*p*uFreq.b+uTime)*uAmp.b - pow(nsin(PI*p*uFreq.a+uTime/(uFreq.b/uFreq.a)),5.)*uAmp.a; }
          vec3 getDistortion(float progress){ return vec3( getX(progress)-getX(0.0125), getY(progress)-getY(0.0125), 0. ); }`,
        getJS: (p: number, t: number) => { const uF = turbulentUniforms.uFreq.value, uA = turbulentUniforms.uAmp.value; const getX = (pp: number) => Math.cos(Math.PI * pp * uF.x + t) * uA.x + Math.pow(Math.cos(Math.PI * pp * uF.y + t * (uF.y / uF.x)), 2) * uA.y; const getY = (pp: number) => -nsin(Math.PI * pp * uF.z + t) * uA.z - Math.pow(nsin(Math.PI * pp * uF.w + t / (uF.z / uF.w)), 5) * uA.w; const d = new THREE.Vector3(getX(p) - getX(p + 0.007), getY(p) - getY(p + 0.007), 0); return d.multiply(new THREE.Vector3(-2, -5, 0)).add(new THREE.Vector3(0, 0, -10)); }
      }
    };

    const distortion_uniforms = { uDistortionX: { value: new THREE.Vector2(80, 3) }, uDistortionY: { value: new THREE.Vector2(-40, 2.5) } };
    const distortion_vertex = `#define PI 3.14159265358979\n uniform vec2 uDistortionX; uniform vec2 uDistortionY; float nsin(float v){return sin(v)*0.5+0.5;} vec3 getDistortion(float p){ p=clamp(p,0.,1.); float xAmp=uDistortionX.r,xFreq=uDistortionX.g,yAmp=uDistortionY.r,yFreq=uDistortionY.g; return vec3(xAmp*nsin(p*PI*xFreq-PI/2.), yAmp*nsin(p*PI*yFreq-PI/2.), 0.);} `;

    const random = (base: number | [number, number]) => Array.isArray(base) ? Math.random() * (base[1] - base[0]) + base[0] : Math.random() * base;
    const pickRandom = (arr: any) => Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr;
    function lerp(current: number, target: number, speed = 0.1, limit = 0.001) { let change = (target - current) * speed; if (Math.abs(change) < limit) { change = target - current; } return change; }

    class CarLights {
      webgl: any; options: any; colors: any; speed: any; fade: any; mesh: any; constructor(webgl: any, options: any, colors: any, speed: any, fade: any) { this.webgl = webgl; this.options = options; this.colors = colors; this.speed = speed; this.fade = fade; }
      init() { const o = this.options; const curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)); const geometry = new THREE.TubeGeometry(curve, 40, 1, 8, false); const instanced = new THREE.InstancedBufferGeometry().copy(geometry); instanced.instanceCount = o.lightPairsPerRoadWay * 2; const laneWidth = o.roadWidth / o.lanesPerRoad; const aOffset: number[] = []; const aMetrics: number[] = []; const aColor: number[] = []; let colors: any = this.colors; colors = Array.isArray(colors) ? colors.map((c: number) => new THREE.Color(c)) : new THREE.Color(colors); for (let i = 0; i < o.lightPairsPerRoadWay; i++) { const radius = random(o.carLightsRadius); const length = random(o.carLightsLength); const speed = random(this.speed); const carLane = i % o.lanesPerRoad; let laneX = carLane * laneWidth - o.roadWidth / 2 + laneWidth / 2; const carWidth = random(o.carWidthPercentage) * laneWidth; const carShiftX = random(o.carShiftX) * laneWidth; laneX += carShiftX; const offsetY = random(o.carFloorSeparation) + (radius as number) * 1.3; const offsetZ = -random(o.length as number); aOffset.push(laneX - carWidth / 2, offsetY, offsetZ, laneX + carWidth / 2, offsetY, offsetZ); aMetrics.push(radius as number, length as number, speed as number, radius as number, length as number, speed as number); const color = pickRandom(colors); aColor.push(color.r, color.g, color.b, color.r, color.g, color.b); } instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3, false)); instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false)); instanced.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false)); const material = new THREE.ShaderMaterial({ fragmentShader: carLightsFragment, vertexShader: carLightsVertex, transparent: true, uniforms: Object.assign({ uTime: { value: 0 }, uTravelLength: { value: o.length }, uFade: { value: this.fade } }, (this.webgl.fogUniforms || {}), o.distortion.uniforms) }); material.onBeforeCompile = (shader: any) => { shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', o.distortion.getDistortion); }; const mesh = new THREE.Mesh(instanced, material); mesh.frustumCulled = false; this.webgl.scene.add(mesh); this.mesh = mesh; }
      update(time: number) { this.mesh.material.uniforms.uTime.value = time; }
    }

    const carLightsFragment = `#define USE_FOG; ${THREE.ShaderChunk['fog_pars_fragment']} varying vec3 vColor; varying vec2 vUv; uniform vec2 uFade; void main(){ vec3 color=vec3(vColor); float alpha=smoothstep(uFade.x, uFade.y, vUv.x); gl_FragColor=vec4(color, alpha); if(gl_FragColor.a < 0.0001) discard; ${THREE.ShaderChunk['fog_fragment']} }`;
    const carLightsVertex = `#define USE_FOG; ${THREE.ShaderChunk['fog_pars_vertex']} attribute vec3 aOffset; attribute vec3 aMetrics; attribute vec3 aColor; uniform float uTravelLength; uniform float uTime; varying vec2 vUv; varying vec3 vColor; #include <getDistortion_vertex> void main(){ vec3 transformed=position.xyz; float radius=aMetrics.r; float myLength=aMetrics.g; float speed=aMetrics.b; transformed.xy*=radius; transformed.z*=myLength; transformed.z += myLength - mod(uTime*speed + aOffset.z, uTravelLength); transformed.xy += aOffset.xy; float progress = abs(transformed.z / uTravelLength); transformed.xyz += getDistortion(progress); vec4 mvPosition=modelViewMatrix*vec4(transformed,1.); gl_Position=projectionMatrix*mvPosition; vUv=uv; vColor=aColor; ${THREE.ShaderChunk['fog_vertex']} }`;

    class LightsSticks { webgl: any; options: any; mesh: any; constructor(w: any, o: any) { this.webgl = w; this.options = o; } init() { const o = this.options; const geometry = new THREE.PlaneGeometry(1, 1); const instanced = new THREE.InstancedBufferGeometry().copy(geometry); const total = o.totalSideLightSticks; instanced.instanceCount = total; const stickoffset = o.length / (total - 1); const aOffset: number[] = []; const aColor: number[] = []; const aMetrics: number[] = []; let colors: any = o.colors.sticks; colors = Array.isArray(colors) ? colors.map((c: number) => new THREE.Color(c)) : new THREE.Color(colors); for (let i = 0; i < total; i++) { const width = random(o.lightStickWidth); const height = random(o.lightStickHeight); aOffset.push((i - 1) * stickoffset * 2 + stickoffset * Math.random()); const color = pickRandom(colors); aColor.push(color.r, color.g, color.b); aMetrics.push(width as number, height as number); } instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false)); instanced.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false)); instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false)); const material = new THREE.ShaderMaterial({ fragmentShader: sideSticksFragment, vertexShader: sideSticksVertex, side: THREE.DoubleSide, uniforms: Object.assign({ uTravelLength: { value: o.length }, uTime: { value: 0 } }, (this.webgl.fogUniforms || {}), o.distortion.uniforms) }); material.onBeforeCompile = (shader: any) => { shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', o.distortion.getDistortion); }; const mesh = new THREE.Mesh(instanced, material); mesh.frustumCulled = false; this.webgl.scene.add(mesh); this.mesh = mesh; } update(time: number) { this.mesh.material.uniforms.uTime.value = time; } }

    const sideSticksVertex = `#define USE_FOG; ${THREE.ShaderChunk['fog_pars_vertex']} attribute float aOffset; attribute vec3 aColor; attribute vec2 aMetrics; uniform float uTravelLength; uniform float uTime; varying vec3 vColor; mat4 rotationY( in float a ){ return mat4(cos(a),0,sin(a),0, 0,1.0,0,0, -sin(a),0,cos(a),0, 0,0,0,1); } #include <getDistortion_vertex> void main(){ vec3 transformed=position.xyz; float width=aMetrics.x; float height=aMetrics.y; transformed.xy*=vec2(width,height); float time=mod(uTime*60.*2.+aOffset, uTravelLength); transformed=(rotationY(3.14/2.)*vec4(transformed,1.)).xyz; transformed.z += -uTravelLength + time; float progress=abs(transformed.z/uTravelLength); transformed.xyz += getDistortion(progress); transformed.y += height/2.; transformed.x += -width/2.; vec4 mvPosition=modelViewMatrix*vec4(transformed,1.); gl_Position=projectionMatrix*mvPosition; vColor=aColor; ${THREE.ShaderChunk['fog_vertex']} }`;
    const sideSticksFragment = `#define USE_FOG; ${THREE.ShaderChunk['fog_pars_fragment']} varying vec3 vColor; void main(){ vec3 color=vec3(vColor); gl_FragColor=vec4(color,1.); ${THREE.ShaderChunk['fog_fragment']} }`;

    class Road {
      webgl: any; options: any; uTime: any; leftRoadWay: any; rightRoadWay: any; island: any; constructor(w: any, o: any) { this.webgl = w; this.options = o; this.uTime = { value: 0 }; }
      createPlane(side: number, width: number, isRoad: boolean) { const o = this.options; const segments = 100; const geometry = new THREE.PlaneGeometry(isRoad ? o.roadWidth : o.islandWidth, o.length, 20, segments); let uniforms: any = { uTravelLength: { value: o.length }, uColor: { value: new THREE.Color(isRoad ? o.colors.roadColor : o.colors.islandColor) }, uTime: this.uTime }; if (isRoad) { uniforms = Object.assign(uniforms, { uLanes: { value: o.lanesPerRoad }, uBrokenLinesColor: { value: new THREE.Color(o.colors.brokenLines) }, uShoulderLinesColor: { value: new THREE.Color(o.colors.shoulderLines) }, uShoulderLinesWidthPercentage: { value: o.shoulderLinesWidthPercentage }, uBrokenLinesLengthPercentage: { value: o.brokenLinesLengthPercentage }, uBrokenLinesWidthPercentage: { value: o.brokenLinesWidthPercentage } }); } const material = new THREE.ShaderMaterial({ fragmentShader: isRoad ? roadFragment : islandFragment, vertexShader: roadVertex, side: THREE.DoubleSide, uniforms: Object.assign(uniforms, (this.webgl.fogUniforms || {}), o.distortion.uniforms) }); material.onBeforeCompile = (shader: any) => { shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', o.distortion.getDistortion); }; const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2; mesh.position.z = -(o.length); mesh.position.x += (o.islandWidth / 2 + o.roadWidth / 2) * side; this.webgl.scene.add(mesh); return mesh; }
      init() { this.leftRoadWay = this.createPlane(-1, this.options.roadWidth, true); this.rightRoadWay = this.createPlane(1, this.options.roadWidth, true); this.island = this.createPlane(0, this.options.islandWidth, false); }
      update(time: number) { this.uTime.value = time; }
    }

    const roadBaseFragment = `#define USE_FOG; varying vec2 vUv; uniform vec3 uColor; uniform float uTime; #include <roadMarkings_vars> ${THREE.ShaderChunk['fog_pars_fragment']} void main(){ vec2 uv=vUv; vec3 color=vec3(uColor); #include <roadMarkings_fragment> gl_FragColor=vec4(color,1.); ${THREE.ShaderChunk['fog_fragment']} }`;
    const islandFragment = roadBaseFragment.replace('#include <roadMarkings_fragment>', '').replace('#include <roadMarkings_vars>', '');
    const roadMarkings_vars = `uniform float uLanes; uniform vec3 uBrokenLinesColor; uniform vec3 uShoulderLinesColor; uniform float uShoulderLinesWidthPercentage; uniform float uBrokenLinesWidthPercentage; uniform float uBrokenLinesLengthPercentage; highp float random(vec2 co){ highp float a=12.9898; highp float b=78.233; highp float c=43758.5453; highp float dt=dot(co.xy, vec2(a,b)); highp float sn=mod(dt, 3.14); return fract(sin(sn)*c);} `;
    const roadMarkings_fragment = `uv.y = mod(uv.y + uTime * 0.05, 1.); float laneWidth = 1.0 / uLanes; float brokenLineWidth = laneWidth * uBrokenLinesWidthPercentage; float laneEmptySpace = 1. - uBrokenLinesLengthPercentage; float brokenLines = step(1.0 - brokenLineWidth, fract(uv.x * 2.0)) * step(laneEmptySpace, fract(uv.y * 10.0)); float sideLines = step(1.0 - brokenLineWidth, fract((uv.x - laneWidth * (uLanes - 1.0)) * 2.0)) + step(brokenLineWidth, uv.x); brokenLines = mix(brokenLines, sideLines, uv.x);`;
    const roadFragment = roadBaseFragment.replace('#include <roadMarkings_fragment>', roadMarkings_fragment).replace('#include <roadMarkings_vars>', roadMarkings_vars);
    const roadVertex = `#define USE_FOG; uniform float uTime; ${THREE.ShaderChunk['fog_pars_vertex']} uniform float uTravelLength; varying vec2 vUv; #include <getDistortion_vertex> void main(){ vec3 transformed=position.xyz; vec3 distortion=getDistortion((transformed.y + uTravelLength/2.)/uTravelLength); transformed.x+=distortion.x; transformed.z+=distortion.y; transformed.y += -1. * distortion.z; vec4 mvPosition=modelViewMatrix*vec4(transformed,1.); gl_Position=projectionMatrix*mvPosition; vUv=uv; ${THREE.ShaderChunk['fog_vertex']} }`;

    function resizeRendererToDisplaySize(renderer: any, setSize: any) { const canvas = renderer.domElement; const width = canvas.clientWidth; const height = canvas.clientHeight; const needResize = canvas.width !== width || canvas.height !== height; if (needResize) { setSize(width, height, false); } return needResize; }

    class App {
      container: any; renderer: any; composer: any; camera: any; scene: any; fogUniforms: any; clock: any; assets: any; disposed: boolean; road: any; leftCarLights: any; rightCarLights: any; leftSticks: any; fovTarget: number; speedUpTarget: number; speedUp: number; timeOffset: number; renderPass: any; bloomPass: any; options: any;
      constructor(container: any, options: any) { this.options = options; if (this.options.distortion == null) { this.options.distortion = { uniforms: distortion_uniforms, getDistortion: distortion_vertex }; } this.container = container; this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false }); this.renderer.setSize(container.offsetWidth, container.offsetHeight, false); this.renderer.setPixelRatio(window.devicePixelRatio); this.composer = new EffectComposer(this.renderer); container.append(this.renderer.domElement); this.camera = new THREE.PerspectiveCamera(options.fov, container.offsetWidth / container.offsetHeight, 0.1, 10000); this.camera.position.set(0, 8, -5); this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x070617); const fog = new THREE.Fog(options.colors.background, options.length * 0.2, options.length * 500); this.scene.fog = fog; this.fogUniforms = { fogColor: { value: fog.color }, fogNear: { value: fog.near }, fogFar: { value: fog.far } }; this.clock = new THREE.Clock(); this.assets = {}; this.disposed = false; this.road = new Road(this, options); this.leftCarLights = new CarLights(this, options, options.colors.leftCars, options.movingAwaySpeed, new THREE.Vector2(0, 1 - options.carLightsFade)); this.rightCarLights = new CarLights(this, options, options.colors.rightCars, options.movingCloserSpeed, new THREE.Vector2(1, 0 + options.carLightsFade)); this.leftSticks = new LightsSticks(this, options); this.fovTarget = options.fov; this.speedUpTarget = 0; this.speedUp = 0; this.timeOffset = 0; this.tick = this.tick.bind(this); this.init = this.init.bind(this); this.setSize = this.setSize.bind(this); this.onMouseDown = this.onMouseDown.bind(this); this.onMouseUp = this.onMouseUp.bind(this); this.onTouchStart = this.onTouchStart.bind(this); this.onTouchEnd = this.onTouchEnd.bind(this); this.onContextMenu = this.onContextMenu.bind(this); window.addEventListener('resize', this.onWindowResize.bind(this)); }
      onWindowResize() { const width = this.container.offsetWidth; const height = this.container.offsetHeight; this.renderer.setSize(width, height); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.composer.setSize(width, height); }
      initPasses() { this.renderPass = new RenderPass(this.scene, this.camera); this.bloomPass = new EffectPass(this.camera, new BloomEffect({ luminanceThreshold: 0.2, luminanceSmoothing: 0, resolutionScale: 1 })); const smaaPass = new EffectPass(this.camera, new SMAAEffect({ preset: SMAAPreset.MEDIUM, searchImage: SMAAEffect.searchImageDataURL, areaImage: SMAAEffect.areaImageDataURL })); this.renderPass.renderToScreen = false; this.bloomPass.renderToScreen = false; smaaPass.renderToScreen = true; this.composer.addPass(this.renderPass); this.composer.addPass(this.bloomPass); this.composer.addPass(smaaPass); }
      async loadAssets() { return Promise.resolve(); }
      init() { this.initPasses(); const o = this.options; this.road.init(); this.leftCarLights.init(); this.leftCarLights.mesh.position.setX(-o.roadWidth / 2 - o.islandWidth / 2); this.rightCarLights.init(); this.rightCarLights.mesh.position.setX(o.roadWidth / 2 + o.islandWidth / 2); this.leftSticks.init(); this.leftSticks.mesh.position.setX(-(o.roadWidth + o.islandWidth / 2)); this.container.addEventListener('mousedown', this.onMouseDown); this.container.addEventListener('mouseup', this.onMouseUp); this.container.addEventListener('mouseout', this.onMouseUp); this.container.addEventListener('touchstart', this.onTouchStart, { passive: true } as any); this.container.addEventListener('touchend', this.onTouchEnd, { passive: true } as any); this.container.addEventListener('touchcancel', this.onTouchEnd, { passive: true } as any); this.container.addEventListener('contextmenu', this.onContextMenu); this.tick(); }
      onMouseDown(ev: any) { if (this.options.onSpeedUp) this.options.onSpeedUp(ev); this.fovTarget = this.options.fovSpeedUp; this.speedUpTarget = this.options.speedUp; }
      onMouseUp(ev: any) { if (this.options.onSlowDown) this.options.onSlowDown(ev); this.fovTarget = this.options.fov; this.speedUpTarget = 0; }
      onTouchStart(ev: any) { if (this.options.onSpeedUp) this.options.onSpeedUp(ev); this.fovTarget = this.options.fovSpeedUp; this.speedUpTarget = this.options.speedUp; }
      onTouchEnd(ev: any) { if (this.options.onSlowDown) this.options.onSlowDown(ev); this.fovTarget = this.options.fov; this.speedUpTarget = 0; }
      onContextMenu(ev: any) { ev.preventDefault(); }
      update(delta: number) { const lerpPercentage = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta); this.speedUp += lerp(this.speedUp, this.speedUpTarget, lerpPercentage, 0.00001); this.timeOffset += this.speedUp * delta; const time = this.clock.elapsedTime + this.timeOffset; this.rightCarLights.update(time); this.leftCarLights.update(time); this.leftSticks.update(time); this.road.update(time); let updateCamera = false; const fovChange = lerp(this.camera.fov, this.fovTarget, lerpPercentage); if (fovChange !== 0) { this.camera.fov += fovChange * delta * 6; updateCamera = true; } if (this.options.distortion.getJS) { const d = this.options.distortion.getJS(0.025, time); this.camera.lookAt(new THREE.Vector3(this.camera.position.x + d.x, this.camera.position.y + d.y, this.camera.position.z + d.z)); updateCamera = true; } if (updateCamera) { this.camera.updateProjectionMatrix(); } }
      render(delta: number) { this.composer.render(delta); }
      dispose() {
        this.disposed = true; try { this.renderer?.dispose(); this.composer?.dispose(); this.scene?.clear(); } catch { } window.removeEventListener('resize', this.onWindowResize as any); if (this.container) { this.container.replaceChildren(); }
      }
      setSize(width: number, height: number, updateStyles: boolean) { this.composer.setSize(width, height, updateStyles); }
      tick() { if (this.disposed || !this) return; if (resizeRendererToDisplaySize(this.renderer, this.setSize)) { const canvas = this.renderer.domElement; this.camera.aspect = canvas.clientWidth / canvas.clientHeight; this.camera.updateProjectionMatrix(); } const delta = this.clock.getDelta(); this.render(delta); this.update(delta); requestAnimationFrame(this.tick); }
    }

    (function () { const container = document.getElementById(containerId)!; const options: any = { ...defaultOptions, ...effectOptions }; options.distortion = distortions[options.distortion || 'turbulentDistortion']; const app = new App(container, options); appRef.current = app; app.loadAssets().then(app.init); })();

    return () => { if (appRef.current) { appRef.current.dispose(); } };
  }, [effectOptions, containerId]);

  return <div id={containerId} className="hyperspeed"></div>;
}


