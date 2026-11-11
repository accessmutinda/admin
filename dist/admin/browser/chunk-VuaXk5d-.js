import{t as r}from"./chunk-C9yOwMO6.js";import{B as Hr,Cn as be,Kn as jI,Ur as x,ft as OI,nt as LI,v as D$1,vn as _h,xn as au,zn as fe}from"./chunk-CUCVH8se.js";import{C as xe,d as X,g as l$1,o as Q,s as R$1,w as y,x as w}from"./chunk-DrgtMvFy.js";import{a as K,l as j$1}from"./chunk-DPaYt_vW.js";var u;var G=[`color`,`button`,`checkbox`,`date`,`datetime-local`,`email`,`file`,`hidden`,`image`,`month`,`number`,`password`,`radio`,`range`,`reset`,`search`,`submit`,`tel`,`text`,`time`,`url`,`week`];function ae(){if(u)return u;if(typeof document!=`object`||!document)return u=new Set(G),u;let i=document.createElement(`input`);return u=new Set(G.filter(e=>(i.setAttribute(`type`,e),i.type===e))),u}var l=(function(i){return i[i.FADING_IN=0]=`FADING_IN`,i[i.VISIBLE=1]=`VISIBLE`,i[i.FADING_OUT=2]=`FADING_OUT`,i[i.HIDDEN=3]=`HIDDEN`,i})(l||{});var D=class{_renderer;element;config;_animationForciblyDisabledThroughCss;state=l.HIDDEN;constructor(e,t,n,r=!1){this._renderer=e,this.element=t,this.config=n,this._animationForciblyDisabledThroughCss=r}fadeOut(){this._renderer.fadeOutRipple(this)}};var V=xe({passive:!0,capture:!0});var T=class{_events=new Map;addHandler(e,t,n,r){let s=this._events.get(t);if(s){let p=s.get(n);p?p.add(r):s.set(n,new Set([r]))}else this._events.set(t,new Map([[n,new Set([r])]])),e.runOutsideAngular(()=>{document.addEventListener(t,this._delegateEventHandler,V)})}removeHandler(e,t,n){let r=this._events.get(e);if(!r)return;let s=r.get(t);s&&(s.delete(n),s.size===0&&r.delete(t),r.size===0&&(this._events.delete(e),document.removeEventListener(e,this._delegateEventHandler,V)))}_delegateEventHandler=e=>{let t=y(e);t&&this._events.get(e.type)?.forEach((n,r)=>{(r===t||r.contains(t))&&n.forEach(s=>s.handleEvent(e))})}};var Z={enterDuration:225,exitDuration:150};var W=800;var j=xe({passive:!0,capture:!0});var $=[`mousedown`,`touchstart`];var Y=[`mouseup`,`mouseleave`,`touchend`,`touchcancel`];var ee=(()=>{class i{static ɵfac=function(n){return new(n||i)};static ɵcmp=OI({type:i,selectors:[[`ng-component`]],hostAttrs:[`mat-ripple-style-loader`,``],decls:0,vars:0,template:function(n,r){},styles:[`.mat-ripple {
  overflow: hidden;
  position: relative;
}
.mat-ripple:not(:empty) {
  transform: translateZ(0);
}

.mat-ripple.mat-ripple-unbounded {
  overflow: visible;
}

.mat-ripple-element {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  transition: opacity, transform 0ms cubic-bezier(0, 0, 0.2, 1);
  transform: scale3d(0, 0, 0);
  background-color: var(--%NS%mat-ripple-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 10%, transparent));
}
@media (forced-colors: active) {
  .mat-ripple-element {
    display: none;
  }
}
.cdk-drag-preview .mat-ripple-element, .cdk-drag-placeholder .mat-ripple-element {
  display: none;
}
`],encapsulation:2})}return i})();var R=class i{_target;_ngZone;_platform;_containerElement;_triggerElement=null;_isPointerDown=!1;_activeRipples=new Map;_mostRecentTransientRipple=null;_lastTouchStartEvent;_pointerUpEventsRegistered=!1;_containerRect=null;static _eventManager=new T;constructor(e,t,n,r,s){this._target=e,this._ngZone=t,this._platform=r,r.isBrowser&&(this._containerElement=R$1(n)),s&&s.get(w).load(ee)}fadeInRipple(e,t,n={}){let r$1=this._containerRect=this._containerRect||this._containerElement.getBoundingClientRect(),s=r(r({},Z),n.animation);n.centered&&(e=r$1.left+r$1.width/2,t=r$1.top+r$1.height/2);let p=n.radius||te(e,t,r$1),J=e-r$1.left,K=t-r$1.top,m=s.enterDuration,o=document.createElement(`div`);o.classList.add(`mat-ripple-element`),o.style.left=`${J-p}px`,o.style.top=`${K-p}px`,o.style.height=`${p*2}px`,o.style.width=`${p*2}px`,n.color!=null&&(o.style.backgroundColor=n.color),o.style.transitionDuration=`${m}ms`,this._containerElement.appendChild(o);let I=window.getComputedStyle(o),Q=I.transitionProperty,w=I.transitionDuration,_=Q===`none`||w===`0s`||w===`0s, 0s`||r$1.width===0&&r$1.height===0,d=new D(this,o,n,_);o.style.transform=`scale3d(1, 1, 1)`,d.state=l.FADING_IN,n.persistent||(this._mostRecentTransientRipple=d);let f=null;return!_&&(m||s.exitDuration)&&this._ngZone.runOutsideAngular(()=>{let M=()=>{f&&(f.fallbackTimer=null),clearTimeout(N),this._finishRippleTransition(d)},v=()=>this._destroyRipple(d),N=setTimeout(v,m+100);o.addEventListener(`transitionend`,M),o.addEventListener(`transitioncancel`,v),f={onTransitionEnd:M,onTransitionCancel:v,fallbackTimer:N}}),this._activeRipples.set(d,f),(_||!m)&&this._finishRippleTransition(d),d}fadeOutRipple(e){if(e.state===l.FADING_OUT||e.state===l.HIDDEN)return;let t=e.element,n=r(r({},Z),e.config.animation);t.style.transitionDuration=`${n.exitDuration}ms`,t.style.opacity=`0`,e.state=l.FADING_OUT,(e._animationForciblyDisabledThroughCss||!n.exitDuration)&&this._finishRippleTransition(e)}fadeOutAll(){this._getActiveRipples().forEach(e=>e.fadeOut())}fadeOutAllNonPersistent(){this._getActiveRipples().forEach(e=>{e.config.persistent||e.fadeOut()})}setupTriggerEvents(e){let t=R$1(e);!this._platform.isBrowser||!t||t===this._triggerElement||(this._removeTriggerEvents(),this._triggerElement=t,$.forEach(n=>{i._eventManager.addHandler(this._ngZone,n,t,this)}))}handleEvent(e){e.type===`mousedown`?this._onMousedown(e):e.type===`touchstart`?this._onTouchStart(e):this._onPointerUp(),this._pointerUpEventsRegistered||(this._ngZone.runOutsideAngular(()=>{Y.forEach(t=>{this._triggerElement.addEventListener(t,this,j)})}),this._pointerUpEventsRegistered=!0)}_finishRippleTransition(e){e.state===l.FADING_IN?this._startFadeOutTransition(e):e.state===l.FADING_OUT&&this._destroyRipple(e)}_startFadeOutTransition(e){let t=e===this._mostRecentTransientRipple,{persistent:n}=e.config;e.state=l.VISIBLE,!n&&(!t||!this._isPointerDown)&&e.fadeOut()}_destroyRipple(e){let t=this._activeRipples.get(e)??null;this._activeRipples.delete(e),this._activeRipples.size||(this._containerRect=null),e===this._mostRecentTransientRipple&&(this._mostRecentTransientRipple=null),e.state=l.HIDDEN,t!==null&&(e.element.removeEventListener(`transitionend`,t.onTransitionEnd),e.element.removeEventListener(`transitioncancel`,t.onTransitionCancel),t.fallbackTimer!==null&&clearTimeout(t.fallbackTimer)),e.element.remove()}_onMousedown(e){let t=Q(e),n=this._lastTouchStartEvent&&Date.now()<this._lastTouchStartEvent+W;!this._target.rippleDisabled&&!t&&!n&&(this._isPointerDown=!0,this.fadeInRipple(e.clientX,e.clientY,this._target.rippleConfig))}_onTouchStart(e){if(!this._target.rippleDisabled&&!X(e)){this._lastTouchStartEvent=Date.now(),this._isPointerDown=!0;let t=e.changedTouches;if(t)for(let n=0;n<t.length;n++)this.fadeInRipple(t[n].clientX,t[n].clientY,this._target.rippleConfig)}}_onPointerUp(){this._isPointerDown&&(this._isPointerDown=!1,this._getActiveRipples().forEach(e=>{let t=e.state===l.VISIBLE||e.config.terminateOnPointerUp&&e.state===l.FADING_IN;!e.config.persistent&&t&&e.fadeOut()}))}_getActiveRipples(){return Array.from(this._activeRipples.keys())}_removeTriggerEvents(){let e=this._triggerElement;e&&($.forEach(t=>i._eventManager.removeHandler(t,e,this)),this._pointerUpEventsRegistered&&(Y.forEach(t=>e.removeEventListener(t,this,j)),this._pointerUpEventsRegistered=!1))}};function te(i,e,t){let n=Math.max(Math.abs(i-t.left),Math.abs(i-t.right)),r=Math.max(Math.abs(e-t.top),Math.abs(e-t.bottom));return Math.sqrt(n*n+r*r)}var ne=new x(`mat-ripple-global-options`);var De=(()=>{class i{_elementRef=D$1(Hr);_animationsDisabled=K();color;unbounded=!1;centered=!1;radius=0;animation;get disabled(){return this._disabled}set disabled(t){t&&this.fadeOutAllNonPersistent(),this._disabled=t,this._setupTriggerEventsIfEnabled()}_disabled=!1;get trigger(){return this._trigger||this._elementRef.nativeElement}set trigger(t){this._trigger=t,this._setupTriggerEventsIfEnabled()}_trigger;_rippleRenderer;_globalOptions;_isInitialized=!1;constructor(){let t=D$1(be),n=D$1(l$1),r=D$1(ne,{optional:!0}),s=D$1(fe);this._globalOptions=r||{},this._rippleRenderer=new R(this,t,this._elementRef,n,s)}ngOnInit(){this._isInitialized=!0,this._setupTriggerEventsIfEnabled()}ngOnDestroy(){this._rippleRenderer._removeTriggerEvents()}fadeOutAll(){this._rippleRenderer.fadeOutAll()}fadeOutAllNonPersistent(){this._rippleRenderer.fadeOutAllNonPersistent()}get rippleConfig(){return{centered:this.centered,radius:this.radius,color:this.color,animation:r(r(r({},this._globalOptions.animation),this._animationsDisabled?{enterDuration:0,exitDuration:0}:{}),this.animation),terminateOnPointerUp:this._globalOptions.terminateOnPointerUp}}get rippleDisabled(){return this.disabled||!!this._globalOptions.disabled}_setupTriggerEventsIfEnabled(){!this.disabled&&this._isInitialized&&this._rippleRenderer.setupTriggerEvents(this.trigger)}launch(t,n=0,r$2){return typeof t==`number`?this._rippleRenderer.fadeInRipple(t,n,r(r({},this.rippleConfig),r$2)):this._rippleRenderer.fadeInRipple(0,0,r(r({},this.rippleConfig),t))}static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[``,`mat-ripple`,``],[``,`matRipple`,``]],hostAttrs:[1,`mat-ripple`],hostVars:2,hostBindings:function(n,r){n&2&&_h(`mat-ripple-unbounded`,r.unbounded)},inputs:{color:[0,`matRippleColor`,`color`],unbounded:[0,`matRippleUnbounded`,`unbounded`],centered:[0,`matRippleCentered`,`centered`],radius:[0,`matRippleRadius`,`radius`],animation:[0,`matRippleAnimation`,`animation`],disabled:[0,`matRippleDisabled`,`disabled`],trigger:[0,`matRippleTrigger`,`trigger`]},exportAs:[`matRipple`]})}return i})();var Ie=(()=>{class i{static ɵfac=function(n){return new(n||i)};static ɵcmp=OI({type:i,selectors:[[`structural-styles`]],decls:0,vars:0,template:function(n,r){},styles:[`.mat-focus-indicator {
  position: relative;
}
.mat-focus-indicator::before {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  display: var(--%NS%mat-focus-indicator-display, none);
  border-width: var(--%NS%mat-focus-indicator-border-width, 3px);
  border-style: var(--%NS%mat-focus-indicator-border-style, solid);
  border-color: var(--%NS%mat-focus-indicator-border-color, transparent);
  border-radius: var(--%NS%mat-focus-indicator-border-radius, 4px);
}
.mat-focus-indicator:focus-visible::before {
  content: "";
}

@media (forced-colors: active) {
  html {
    --%NS%mat-focus-indicator-display: block;
    --%NS%mat-focus-indicator-fallback-border-style: none;
  }
}
`],encapsulation:2})}return i})();var Ne=(()=>{class i{static ɵfac=function(n){return new(n||i)};static ɵmod=LI({type:i});static ɵinj=au({imports:[j$1]})}return i})();export{Z as a,R as i,Ie as n,ae as o,Ne as r,ne as s,De as t};