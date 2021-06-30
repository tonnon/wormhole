// placeholders 
const _w = window;
const _s = window.screen;
const _b = document.body;
const _d = document.documentElement;

// global stuff 
const srcBase    = 'https://raw.githubusercontent.com/rainner/wormhole-extreme/master/dist'; 
const fpsCounter = { elm: null, last: 0, fps: 0 };
const initHue    = Math.random(); 
const hueSpeed   = 0.0002;

/**
 * Device screen info helper 
 */
const deviceInfo = {
 screenWidth() {
  return Math.max( 0, _w.innerWidth || _d.clientWidth || _b.clientWidth || 0 );
 },
 screenHeight() {
  return Math.max( 0, _w.innerHeight || _d.clientHeight || _b.clientHeight || 0 );
 },
 screenRatio() {
  return this.screenWidth() / this.screenHeight();
 },
 screenCenterX() {
  return this.screenWidth() / 2;
 },
 screenCenterY() {
  return this.screenHeight() / 2;
 },
 mouseX( e ) {
  return Math.max( 0, e.pageX || e.clientX || 0 );
 },
 mouseY( e ) {
  return Math.max( 0, e.pageY || e.clientY || 0 );
 },
 mouseCenterX( e ) {
  return this.mouseX( e ) - this.screenCenterX();
 },
 mouseCenterY( e ) {
  return this.mouseY( e ) - this.screenCenterY();
 },
}; 

/**
 * Textures loader 
 */
const textureLoader = {
 _list: {}, 
 _loaded: 0, 
 _cb: null, 
 
 // get loaded texture 
 get( name ) {
  return this._list[ name ] || null; 
 }, 
 
 // add ready callback 
 onReady( cb ) {
  this._cb = cb; 
 }, 
 
 // load texture file 
 load( name, file ) {
  if ( !name || !file ) return; 
  this._list[ name ] = new THREE.Texture();
  const loader = new THREE.TextureLoader();
  loader.load( srcBase +'/'+ file, texture => {
   this._list[ name ] = texture; 
   this._loaded += 1; 
   this.checkDone(); 
  });
 }, 
 
 // check if all teaxtures have loaded 
 checkDone() {
  let total  = Object.keys( this._list ).length; 
  let loaded = ( total && this._loaded === total ); 
  let hascb  = ( typeof this._cb === 'function' ); 
  if ( !loaded ) return false;
  if ( hascb ) this._cb( total ); 
  return true;
 }, 
}; 

/**
 * Object loader 
 */
const objLoader = {
 
 // load object model 
 load( name, cb ) {
  const obj = new THREE.OBJLoader();
  obj.load( srcBase +'/'+ name, object3d => cb( object3d ), null, this.onError );
 }, 
 
 // error handler 
 onError( err ) {
  console.error( err.message || err ); 
 }, 
};

/**
 * Background object 
 */
const bgEffect = {
 group: null, 
 color: null, 
 light: null, 
 plane: null, 
 hue: initHue, 
 zoom: 2000, 
 ease: 24, 
 move: { x: 0, y: 0, z: -6000 },
 look: { x: 0, y: 0, z: 0 }, 
 
 // create bg 
 create( scene ) {
  this.group = new THREE.Object3D();
  this.group.position.set( this.move.x, this.move.y, this.move.z );
  this.group.rotation.set( this.look.x, this.look.y, this.look.z );

  let material = new THREE.MeshLambertMaterial({
   color: 0xffffff,
   opacity: 1,
   alphaMap: textureLoader.get( 'bg' ),
   blending: THREE.AdditiveBlending,
   side: THREE.FrontSide,
   transparent: false,
   depthTest: false,
  });
  
  this.color = new THREE.Color();
  this.color.setHSL( this.hue, 1, 0.5 );
  
  this.plane = new THREE.Mesh( new THREE.PlaneGeometry( 20000, 10000, 32 ), material );
  this.plane.position.set( 0, 0, 0 );
  
  this.light = new THREE.DirectionalLight( 0xffffff, .8 );
  this.light.position.set( 0, 0, 10 );
  this.light.castShadow = false;
  this.light.target = this.plane;
  this.light.color = this.color;
  
  this.group.add( this.light );
  this.group.add( this.plane );
  scene.add( this.group );
 },
 
 // zoom in 
 zoomIn() {
  this.move.z += this.zoom;
 }, 
 
 // zoom out 
 zoomOut() {
  this.move.z -= this.zoom;
 }, 
 
 // update 
 update( mouse ) {
  if ( !this.group ) return; 
  
  this.hue += hueSpeed; 
  this.color.setHSL( this.hue, 1, 0.5 );
  this.light.color = this.color;
  if ( this.hue >= 1 ) this.hue = 0; 
  
  this.group.position.x += ( this.move.x - this.group.position.x ) / this.ease;
  this.group.position.y += ( this.move.y - this.group.position.y ) / this.ease;
  this.group.position.z += ( this.move.z - this.group.position.z ) / this.ease;
  this.group.rotation.x += ( this.look.x - this.group.rotation.x ) / this.ease;
  this.group.rotation.y += ( this.look.y - this.group.rotation.y ) / this.ease;
  this.group.rotation.z += ( this.look.z - this.group.rotation.z ) / this.ease;
 },
};

/**
 * Starfield object 
 */
const starField = {
 group: null, 
 total: 600, 
 spread: 6000, 
 zoom: 1000, 
 ease: 12, 
 move: { x: 0, y: 0, z: -2000 },  
 look: { x: 0, y: 0, z: 0 }, 
 
 // create stars 
 create( scene ) {
  this.group = new THREE.Object3D();
  this.group.position.set( this.move.x, this.move.y, this.move.z );
  this.group.rotation.set( this.look.x, this.look.y, this.look.z );
 
  let colors = [];
  let geometry = new THREE.Geometry();
  let material = new THREE.PointsMaterial({
   size: 64,
   color: 0xffffff,
   opacity: 1,
   map: textureLoader.get( 'star' ),
   blending: THREE.AdditiveBlending,
   vertexColors: true,
   transparent: false,
   depthTest: false,
  });
  
  for ( let i = 0; i < this.total; i++ ) {
   let angle = ( Math.random() * Math.PI * 2 );
   let radius = THREE.Math.randInt( 0, this.spread );
   
   let color = new THREE.Color();
   color.setHSL( THREE.Math.randFloat( 0.5, 0.6 ), 1, 0.8 );
   colors.push( color );
  
   geometry.vertices.push( new THREE.Vector3(
    Math.cos( angle ) * radius,
    Math.sin( angle ) * radius,
    THREE.Math.randInt( -this.spread, 0 )
   ));
  }
  
  geometry.colors = colors;
  this.group.add( new THREE.Points( geometry, material ) );
  scene.add( this.group );
 }, 
 
 // zoom in 
 zoomIn() {
  this.move.z += this.zoom;
 }, 
 
 // zoom out 
 zoomOut() {
  this.move.z -= this.zoom;
 }, 
 
 // update 
 update( mouse ) {
  if ( !this.group ) return; 
  
  this.move.x = -( mouse.x * 0.1 );
  this.move.y =  ( mouse.y * 0.1 );
  this.look.y = -( mouse.x * 0.00005 );
  this.look.x = -( mouse.y * 0.00005 );
  this.look.z -= 0.0008;
  
  this.group.position.x += ( this.move.x - this.group.position.x ) / this.ease;
  this.group.position.y += ( this.move.y - this.group.position.y ) / this.ease;
  this.group.position.z += ( this.move.z - this.group.position.z ) / this.ease;
  this.group.rotation.x += ( this.look.x - this.group.rotation.x ) / this.ease;
  this.group.rotation.y += ( this.look.y - this.group.rotation.y ) / this.ease;
  this.group.rotation.z += ( this.look.z - this.group.rotation.z ) / this.ease;
 }, 
}; 

/**
 * Wormhole object 
 */
const wormholeEffect = {
 group: null, 
 light: null, 
 texture: null, 
 cylinder: null, 
 cycle: 0.0005, 
 color: null, 
 hue: initHue, 
 zoom: 800, 
 ease: 16, 
 move: { x: 0, y: 0, z: -1200 },  
 look: { x: 0, y: 0, z: 0 }, 
 
 // create wormhole
 create( scene ) {
  this.group = new THREE.Object3D();
  this.group.position.set( this.move.x, this.move.y, this.move.z );
  this.group.rotation.set( this.look.x, this.look.y, this.look.z );
  
  this.texture = textureLoader.get( 'water' );
  this.texture.wrapT = THREE.RepeatWrapping;
  this.texture.wrapS = THREE.RepeatWrapping;

  let material = new THREE.MeshLambertMaterial({
   color: 0xffffff,
   opacity: 1,
   alphaMap: this.texture,
   blending: THREE.AdditiveBlending,
   side: THREE.BackSide,
   transparent: false,
   depthTest: false,
  });
  
  this.color = new THREE.Color();
  this.color.setHSL( this.hue, 1, 0.5 );

  this.cylinder = new THREE.Mesh( new THREE.CylinderGeometry( 600, 300, 4000, 30, 30, true ), material );
  this.cylinder.position.set( 0, 0, 0 );
  this.cylinder.rotation.x = Math.PI / 2;
  
  this.light = new THREE.PointLight( 0xffffff, 5, 1000 );
  this.light.position.set( 0, 0, 200 );
  this.light.castShadow = false;
  this.light.color = this.color;

  this.group.add( this.light );
  this.group.add( this.cylinder );
  scene.add( this.group );
 },
 
 // zoom in 
 zoomIn() {
  this.move.z += this.zoom;
 }, 
 
 // zoom out 
 zoomOut() {
  this.move.z -= this.zoom;
 }, 
 
 // update 
 update( mouse ) {
  if ( !this.group ) return; 
  
  this.move.x = -( mouse.x * 0.002 );
  this.move.y =  ( mouse.y * 0.002 );
  this.look.y = -( mouse.x * 0.0001 );
  this.look.x = -( mouse.y * 0.0001 );

  this.look.z += this.cycle * 8;
  this.texture.offset.y -= this.cycle;
  this.texture.needsUpdate = true;
  
  this.hue += hueSpeed; 
  this.color.setHSL( this.hue, 1, 0.5 );
  this.light.color = this.color;
  if ( this.hue >= 1 ) this.hue = 0; 
  
  this.group.position.x += ( this.move.x - this.group.position.x ) / this.ease;
  this.group.position.y += ( this.move.y - this.group.position.y ) / this.ease;
  this.group.position.z += ( this.move.z - this.group.position.z ) / this.ease;
  this.group.rotation.x += ( this.look.x - this.group.rotation.x ) / this.ease;
  this.group.rotation.y += ( this.look.y - this.group.rotation.y ) / this.ease;
  this.group.rotation.z += ( this.look.z - this.group.rotation.z ) / this.ease;
 }, 
};

/**
 * Spaceship object 
 */
const spaceShip = {
 group: null, 
 ease: 16, 
 move: { x: 0, y: 0, z: -1400 },  
 look: { x: 0, y: 0, z: 0 }, 
 
 // create spaceship
 create( scene ) {
  this.group = new THREE.Object3D();
  this.group.position.set( this.move.x, this.move.y, this.move.z );
  this.group.rotation.set( this.look.x, this.look.y, this.look.z );
  
  let material = new THREE.MeshLambertMaterial({
   color: 0xffffff,
   opacity: 1,
   blending: THREE.NoBlending,
   side: THREE.FrontSide,
   transparent: false,
   depthTest: false,
  });

 },
 
 // update 
 update( mouse ) {
  if ( !this.group ) return; 
  
  this.move.x = -( mouse.x * 0.8 );
  this.move.y =  ( mouse.y * 0.6 );
  this.look.y = -( mouse.x * 0.0002 );
  this.look.x = -( mouse.y * 0.0002 );
  this.look.z = -( mouse.x * 0.001 );
  
  this.group.position.x += ( this.move.x - this.group.position.x ) / this.ease;
  this.group.position.y += ( this.move.y - this.group.position.y ) / this.ease;
  this.group.position.z += ( this.move.z - this.group.position.z ) / this.ease;
  this.group.rotation.x += ( this.look.x - this.group.rotation.x ) / this.ease;
  this.group.rotation.y += ( this.look.y - this.group.rotation.y ) / this.ease;
  this.group.rotation.z += ( this.look.z - this.group.rotation.z ) / this.ease;
 }, 
};

/**
 * ThreeJS scene 
 */
const setupScene = () => {
 let width    = deviceInfo.screenWidth(); 
 let height   = deviceInfo.screenHeight(); 
 let ratio    = deviceInfo.screenRatio(); 
 let renderer = new THREE.WebGLRenderer( { alpha: true, antialias: true, precision: 'mediump' } );
 let camera   = new THREE.PerspectiveCamera( 60, ratio, 0.1, 20000 );
 let scene    = new THREE.Scene();
 let mouse    = { 
  x: deviceInfo.screenCenterX(), 
  y: deviceInfo.screenCenterY(), 
 };  
 
 // check if the renderer was created 
 if ( !renderer || !renderer.domElement ) {
  return alert( 'It appears that your browser does not have WebGL support.' );
 }
 
 // add renderer to the page 
 renderer.domElement.setAttribute( 'id', 'stageElement' );
 document.body.appendChild( renderer.domElement );
 
 // setup renderer 
 renderer.setSize( width, height );
 renderer.setPixelRatio( window.devicePixelRatio );
 renderer.setClearColor( 0x000000, 0 );
 renderer.sortObjects = true;
 
 // setup camera 
 camera.position.set( 0, 0, 300 );
 camera.rotation.set( 0, 0, 0 );
 camera.lookAt( scene.position );
 
 // add elements to scene 
 bgEffect.create( scene ); 
 starField.create( scene ); 
 wormholeEffect.create( scene ); 
 
 // on page resize
 window.addEventListener( 'resize', e => {
  width  = deviceInfo.screenWidth(); 
  height = deviceInfo.screenHeight(); 
  ratio  = deviceInfo.screenRatio(); 
  renderer.setSize( width, height );
  camera.aspect = ratio; 
  camera.updateProjectionMatrix();
 });
 
 // on mouse move 
 window.addEventListener( 'mousemove', e => {
  mouse.x = deviceInfo.mouseCenterX( e ); 
  mouse.y = deviceInfo.mouseCenterY( e ); 
 });
 
 // on mouse click 
 window.addEventListener( 'mousedown', e => {
  bgEffect.zoomIn();
  starField.zoomOut();
  wormholeEffect.zoomOut();
 });
 
 // on mouse release 
 window.addEventListener( 'mouseup', e => {
  bgEffect.zoomOut();
  starField.zoomIn();
  wormholeEffect.zoomIn();
 });
 
 // update objects and render scene 
 let loop = ( time ) => {
  requestAnimationFrame( loop );
  
  // update objects 
  bgEffect.update( mouse ); 
  starField.update( mouse ); 
  wormholeEffect.update( mouse ); 
  
  // update fps counter 
  fpsCounter.fps = Math.ceil( 1000 / ( time - fpsCounter.last ) );
  fpsCounter.last = time; 
  
  // render scene 
  renderer.render( scene, camera );
 };
 
 loop( Date.now() );
};

/**
 *  Setup audio player 
 */
const setupAudio = () => {
 let audio = document.querySelector( 'footer audio' ); 
 if ( !audio ) return; 
 
 let increment = () => {
  if ( audio.volume < 0.3 ) {
   audio.volume += 0.001; 
   requestAnimationFrame( increment ); 
  }
 };
 audio.volume = 0; 
 audio.play();
 increment();
};

/**
 *  Update fps display 
 */
const updateFpsDisplay = () => {
 if ( !fpsCounter.elm ) return; 
 fpsCounter.elm.textContent = fpsCounter.fps +' FPS'; 
 setTimeout( updateFpsDisplay, 100 ); 
};

/**
 *  On page ready 
 */
window.addEventListener( 'load', e => {
 
 // setup the scene and init 
 textureLoader.onReady( total => {
  console.log( 'Textures loaded,', total );
 
  // setup scene and audio 
  setupScene(); 
  setupAudio();
  
  // setup fps counter 
  fpsCounter.elm = document.querySelector( '#fps-display' ); 
  updateFpsDisplay(); 
 }); 
 
 // load texture files 
 textureLoader.load( 'bg', 'images/bg.jpg' ); 
 textureLoader.load( 'water', 'images/water.jpg' ); 
 textureLoader.load( 'star', 'images/star.png' ); 
});