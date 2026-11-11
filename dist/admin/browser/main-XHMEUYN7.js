import{n as s,t as r$1}from"./chunk-C9yOwMO6.js";import{$n as kF,A as Fw,An as cl,B as Hr,Bn as hh,Br as wh,Cn as be$1,D as Fg,Dn as cb,Dr as sE,E as FD,En as by,Er as rw,Et as RD,Fr as tw,G as JD,Gn as jF,Gr as xe$1,Hn as il,I as HF,K as JE,Kn as jI,Kr as ye$2,Lr as uh,Mr as ti,Nn as dh,On as ce$2,P as Gg,Pt as UF,Q as Kg,Qn as kD,Qt as WD,Rn as ew,Tn as bt$4,Tr as rl,U as Ig,Un as iw,Ur as x$4,Ut as Uw,V as Hv,W as Ih,Wn as jD,X as Ka,Xt as Vm,Yr as yr,Z as Kc,Zr as yw,Zt as Vr,_ as Cr,_r as ph,_t as PD,a as $w,at as Ll,b as Dh,cr as me$1,ct as Mw,dt as OF,ei as zg,en as Wf,er as kg,et as LD,ft as OI,gr as oy,hn as Zp,hr as ow,ht as Oi,i as $m,j as G$3,jr as td,jt as S$4,kn as ch,kr as sw,kt as Ru,l as Au,lr as mh,lt as N$3,mr as ol,mt as Og,n as $I,ni as zp,nn as Wr,nr as ko,nt as LI,on as X$2,or as lh,ot as Lr,pr as oi,pt as Oe$1,qn as je$2,r as $e$3,rr as kr,sn as Xh,sr as ln$1,t as $F,ti as zi,tr as kh,u as BF,un as Yg,v as D$4,vn as _h,vt as PF,w as Eh,wr as rb,xn as au,xr as qr,yt as Pg,z as Hn,zn as fe$1,zr as wg,zt as Uo}from"./chunk-CUCVH8se.js";import{S as pc,T as yc,a as J,b as he$1,c as Q,d as Ue$3,f as Vr$1,n as Dc,p as Ws,r as Dr,s as Ne$1,t as Ca,u as Se$1,v as ce$3,w as we$1,y as hc}from"./chunk-5w51_-hs.js";import{S as wt$2,_ as ne$2,a as Ne$2,f as Y$2,g as l,p as dt$1,s as R$2,u as We$3,w as y$1,x as w$3,y as qe$2}from"./chunk-DrgtMvFy.js";import{a as K,c as a,i as H$3,l as j$2,n as F$3,o as V$1,r as G$4,s as W$4,t as A$3}from"./chunk-DPaYt_vW.js";import{a as Z,i as R$3,n as Ie$2,r as Ne$3,s as ne$3}from"./chunk-VuaXk5d-.js";import{t as l$1}from"./chunk-00byOnyU.js";var ot$2={capture:!0};var rt$2=[`focus`,`mousedown`,`mouseenter`,`touchstart`];var w$2=`mat-ripple-loader-uninitialized`;var k$4=`mat-ripple-loader-class-name`;var W$3=`mat-ripple-loader-centered`;var N$2=`mat-ripple-loader-disabled`;var nt$3=(()=>{class a{_document=D$4(Cr);_animationsDisabled=K();_globalRippleOptions=D$4(ne$3,{optional:!0});_platform=D$4(l);_ngZone=D$4(be$1);_injector=D$4(fe$1);_eventCleanups;_hosts=new Map;constructor(){let t=D$4(Lr).createRenderer(null,null);this._eventCleanups=this._ngZone.runOutsideAngular(()=>rt$2.map(n=>t.listen(this._document,n,this._onInteraction,ot$2)))}ngOnDestroy(){let t=this._hosts.keys();for(let n of t)this.destroyRipple(n);this._eventCleanups.forEach(n=>n())}configureRipple(t,n){t.setAttribute(w$2,this._globalRippleOptions?.namespace??``),(n.className||!t.hasAttribute(k$4))&&t.setAttribute(k$4,n.className||``),n.centered&&t.setAttribute(W$3,``),n.disabled&&t.setAttribute(N$2,``)}setDisabled(t,n){let e=this._hosts.get(t);e?(e.target.rippleDisabled=n,!n&&!e.hasSetUpEvents&&(e.hasSetUpEvents=!0,e.renderer.setupTriggerEvents(t))):n?t.setAttribute(N$2,``):t.removeAttribute(N$2)}_onInteraction=t=>{let n=y$1(t);if(n instanceof HTMLElement){let e=n.closest(`[${w$2}="${this._globalRippleOptions?.namespace??``}"]`);e&&this._createRipple(e)}};_createRipple(t){if(!this._document||this._hosts.has(t))return;t.querySelector(`.mat-ripple`)?.remove();let n=this._document.createElement(`span`);n.classList.add(`mat-ripple`,t.getAttribute(k$4)),t.append(n);let e=this._globalRippleOptions,r=this._animationsDisabled?0:e?.animation?.enterDuration??Z.enterDuration,i=this._animationsDisabled?0:e?.animation?.exitDuration??Z.exitDuration,m={rippleDisabled:this._animationsDisabled||e?.disabled||t.hasAttribute(N$2),rippleConfig:{centered:t.hasAttribute(W$3),terminateOnPointerUp:e?.terminateOnPointerUp,animation:{enterDuration:r,exitDuration:i}}},z=new R$3(m,this._ngZone,n,this._platform,this._injector),P=!m.rippleDisabled;P&&z.setupTriggerEvents(t),this._hosts.set(t,{target:m,renderer:z,hasSetUpEvents:P}),t.removeAttribute(w$2)}destroyRipple(t){let n=this._hosts.get(t);n&&(n.renderer._removeTriggerEvents(),this._hosts.delete(t))}static ɵfac=function(n){return new(n||a)};static ɵprov=Vr({token:a,factory:a.ɵfac})}return a})();var it$3=new x$4(`MAT_BUTTON_CONFIG`);function at$2(a){return a==null?void 0:BF(a)}var E$2=(()=>{class a{_elementRef=D$4(Hr);_ngZone=D$4(be$1);_animationsDisabled=K();_config=D$4(it$3,{optional:!0});_focusMonitor=D$4(dt$1);_cleanupClick;_renderer=D$4(Ka);_rippleLoader=D$4(nt$3);_isAnchor;_isFab=!1;color;get disableRipple(){return this._disableRipple}set disableRipple(t){this._disableRipple=t,this._updateRippleDisabled()}_disableRipple=!1;get disabled(){return this._disabled}set disabled(t){this._disabled=t,this._updateRippleDisabled()}_disabled=!1;ariaDisabled;disabledInteractive;tabIndex;set _tabindex(t){this.tabIndex=t}showProgress=OF(!1,{transform:HF});constructor(){D$4(w$3).load(Ie$2);let t=this._elementRef.nativeElement;this._isAnchor=t.tagName===`A`,this.disabledInteractive=this._config?.disabledInteractive??!1,this.color=this._config?.color??null,this._rippleLoader?.configureRipple(t,{className:`mat-mdc-button-ripple`})}ngAfterViewInit(){this._focusMonitor.monitor(this._elementRef,!0),this._isAnchor&&this._setupAsAnchor()}ngOnDestroy(){this._cleanupClick?.(),this._focusMonitor.stopMonitoring(this._elementRef),this._rippleLoader?.destroyRipple(this._elementRef.nativeElement)}focus(t=`program`,n){t?this._focusMonitor.focusVia(this._elementRef.nativeElement,t,n):this._elementRef.nativeElement.focus(n)}_getAriaDisabled(){return this.ariaDisabled!=null?this.ariaDisabled:this._isAnchor?this.disabled||null:this.disabled&&this.disabledInteractive?!0:null}_getDisabledAttribute(){return this.disabledInteractive||!this.disabled?null:!0}_updateRippleDisabled(){this._rippleLoader?.setDisabled(this._elementRef.nativeElement,this.disableRipple||this.disabled)}_getTabIndex(){return this._isAnchor?this.disabled&&!this.disabledInteractive?-1:this.tabIndex:this.tabIndex}_setupAsAnchor(){this._cleanupClick=this._ngZone.runOutsideAngular(()=>this._renderer.listen(this._elementRef.nativeElement,`click`,t=>{this.disabled&&(t.preventDefault(),t.stopImmediatePropagation())}))}static ɵfac=function(n){return new(n||a)};static ɵdir=jI({type:a,hostAttrs:[1,`mat-mdc-button-base`],hostVars:15,hostBindings:function(n,e){n&2&&(ch(`disabled`,e._getDisabledAttribute())(`aria-disabled`,e._getAriaDisabled())(`tabindex`,e._getTabIndex()),yw(e.color?`mat-`+e.color:``),_h(`mat-mdc-button-progress-indicator-shown`,e.showProgress())(`mat-mdc-button-disabled`,e.disabled)(`mat-mdc-button-disabled-interactive`,e.disabledInteractive)(`mat-unthemed`,!e.color)(`_mat-animation-noopable`,e._animationsDisabled))},inputs:{color:`color`,disableRipple:[2,`disableRipple`,`disableRipple`,HF],disabled:[2,`disabled`,`disabled`,HF],ariaDisabled:[2,`aria-disabled`,`ariaDisabled`,HF],disabledInteractive:[2,`disabledInteractive`,`disabledInteractive`,HF],tabIndex:[2,`tabIndex`,`tabIndex`,at$2],_tabindex:[2,`tabindex`,`_tabindex`,at$2],showProgress:[1,`showProgress`]}})}return a})();var mt$1=(()=>{class a extends E$2{constructor(){super(),this._rippleLoader.configureRipple(this._elementRef.nativeElement,{centered:!0})}static ɵfac=function(n){return new(n||a)};static ɵcmp=(function(){let t=[`*`,[[``,`progressIndicator`,``]]],n=[`*`,`[progressIndicator]`];function e(r,i){r&1&&(ol(0,`div`,1),tw(1,1),il())}return OI({type:a,selectors:[[`button`,`mat-icon-button`,``],[`a`,`mat-icon-button`,``],[`button`,`matIconButton`,``],[`a`,`matIconButton`,``]],hostAttrs:[1,`mdc-icon-button`,`mat-mdc-icon-button`],exportAs:[`matButton`,`matAnchor`],features:[zp],ngContentSelectors:n,decls:5,vars:1,consts:[[1,`mat-mdc-button-persistent-ripple`,`mdc-icon-button__ripple`],[1,`mat-mdc-button-progress-indicator-container`],[1,`mat-focus-indicator`],[1,`mat-mdc-button-touch-target`]],template:function(i,m){i&1&&(ew(t),dh(0,`span`,0),tw(1),RD(2,e,2,0,`div`,1),dh(3,`span`,2)(4,`span`,3)),i&2&&(sE(2),kD(m.showProgress()?2:-1))},styles:[`.mat-mdc-icon-button {
  -webkit-user-select: none;
  user-select: none;
  display: inline-block;
  position: relative;
  box-sizing: border-box;
  border: none;
  outline: none;
  background-color: transparent;
  fill: currentColor;
  text-decoration: none;
  cursor: pointer;
  z-index: 0;
  overflow: visible;
  border-radius: var(--%NS%mat-icon-button-container-shape, var(--%NS%mat-sys-corner-full, 50%));
  flex-shrink: 0;
  text-align: center;
  width: var(--%NS%mat-icon-button-state-layer-size, 40px);
  height: var(--%NS%mat-icon-button-state-layer-size, 40px);
  padding: calc(calc(var(--%NS%mat-icon-button-state-layer-size, 40px) - var(--%NS%mat-icon-button-icon-size, 24px)) / 2);
  font-size: var(--%NS%mat-icon-button-icon-size, 24px);
  color: var(--%NS%mat-icon-button-icon-color, var(--%NS%mat-sys-on-surface-variant));
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-icon-button .mat-mdc-button-ripple,
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple,
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple::before {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}
.mat-mdc-icon-button .mat-mdc-button-ripple {
  overflow: hidden;
}
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple::before {
  content: "";
  opacity: 0;
}
.mat-mdc-icon-button .mdc-button__label,
.mat-mdc-icon-button .mat-icon {
  z-index: 1;
  position: relative;
}
.mat-mdc-icon-button .mat-focus-indicator {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  border-radius: inherit;
}
.mat-mdc-icon-button:focus-visible > .mat-focus-indicator::before {
  content: "";
  border-radius: inherit;
}
.mat-mdc-icon-button .mat-ripple-element {
  background-color: var(--%NS%mat-icon-button-ripple-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface-variant) calc(var(--%NS%mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-icon-button-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-icon-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-icon-button-disabled-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-icon-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-icon-button-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-icon-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-icon-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-icon-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-icon-button-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mat-mdc-icon-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-icon-button-pressed-state-layer-opacity, var(--%NS%mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-icon-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--%NS%mat-icon-button-touch-target-size, 48px);
  display: var(--%NS%mat-icon-button-touch-target-display, block);
  left: 50%;
  width: var(--%NS%mat-icon-button-touch-target-size, 48px);
  transform: translate(-50%, -50%);
}
.mat-mdc-icon-button._mat-animation-noopable {
  transition: none !important;
  animation: none !important;
}
.mat-mdc-icon-button[disabled], .mat-mdc-icon-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--%NS%mat-icon-button-disabled-icon-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-icon-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}
.mat-mdc-icon-button img,
.mat-mdc-icon-button svg {
  width: var(--%NS%mat-icon-button-icon-size, 24px);
  height: var(--%NS%mat-icon-button-icon-size, 24px);
  vertical-align: baseline;
}
.mat-mdc-icon-button .mat-mdc-button-progress-indicator-container .mdc-circular-progress__determinate-circle-graphic {
  width: inherit;
  height: inherit;
}
.mat-mdc-icon-button .mat-mdc-button-progress-indicator-container .mdc-circular-progress__indeterminate-circle-graphic {
  height: 100%;
}
.mat-mdc-icon-button .mat-mdc-button-persistent-ripple {
  border-radius: var(--%NS%mat-icon-button-container-shape, var(--%NS%mat-sys-corner-full, 50%));
}
.mat-mdc-icon-button[hidden] {
  display: none;
}
.mat-mdc-icon-button.mat-unthemed:not(.mdc-ripple-upgraded):focus::before, .mat-mdc-icon-button.mat-primary:not(.mdc-ripple-upgraded):focus::before, .mat-mdc-icon-button.mat-accent:not(.mdc-ripple-upgraded):focus::before, .mat-mdc-icon-button.mat-warn:not(.mdc-ripple-upgraded):focus::before {
  background: transparent;
  opacity: 1;
}

.mat-mdc-button-progress-indicator-container {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.mat-mdc-button-progress-indicator-shown mat-icon {
  visibility: hidden;
}
`,`@media (forced-colors: active) {
  .mat-mdc-button:not(.mdc-button--outlined),
  .mat-mdc-unelevated-button:not(.mdc-button--outlined),
  .mat-mdc-raised-button:not(.mdc-button--outlined),
  .mat-mdc-outlined-button:not(.mdc-button--outlined),
  .mat-mdc-button-base.mat-tonal-button,
  .mat-mdc-icon-button.mat-mdc-icon-button,
  .mat-mdc-outlined-button .mdc-button__ripple {
    outline: solid 1px;
  }
}
`],encapsulation:2})})()}return a})();var et$4=new Map([[`text`,[`mat-mdc-button`]],[`filled`,[`mdc-button--unelevated`,`mat-mdc-unelevated-button`]],[`elevated`,[`mdc-button--raised`,`mat-mdc-raised-button`]],[`outlined`,[`mdc-button--outlined`,`mat-mdc-outlined-button`]],[`tonal`,[`mat-tonal-button`]]]);var Mt$2=(()=>{class a extends E$2{get appearance(){return this._appearance}set appearance(t){this.setAppearance(t||this._config?.defaultAppearance||`text`)}_appearance=null;constructor(){super();let t=st$2(this._elementRef.nativeElement);t&&this.setAppearance(t)}setAppearance(t){if(t===this._appearance)return;let n=this._elementRef.nativeElement.classList,e=this._appearance?et$4.get(this._appearance):null,r=et$4.get(t);e&&n.remove(...e),n.add(...r),this._appearance=t}static ɵfac=function(n){return new(n||a)};static ɵcmp=(function(){let t=[[[``,8,`material-icons`,3,`iconPositionEnd`,``],[`mat-icon`,3,`iconPositionEnd`,``],[``,`matButtonIcon`,``,3,`iconPositionEnd`,``],[``,8,`material-symbols-outlined`,3,`iconPositionEnd`,``],[``,8,`material-symbols-rounded`,3,`iconPositionEnd`,``],[``,8,`material-symbols-sharp`,3,`iconPositionEnd`,``]],`*`,[[``,`iconPositionEnd`,``,8,`material-icons`],[`mat-icon`,`iconPositionEnd`,``],[``,`matButtonIcon`,``,`iconPositionEnd`,``],[``,`iconPositionEnd`,``,8,`material-symbols-outlined`],[``,`iconPositionEnd`,``,8,`material-symbols-rounded`],[``,`iconPositionEnd`,``,8,`material-symbols-sharp`]],[[``,`progressIndicator`,``]]],n=[`.material-icons:not([iconPositionEnd]), mat-icon:not([iconPositionEnd]), [matButtonIcon]:not([iconPositionEnd]), .material-symbols-outlined:not([iconPositionEnd]), .material-symbols-rounded:not([iconPositionEnd]), .material-symbols-sharp:not([iconPositionEnd])`,`*`,`.material-icons[iconPositionEnd], mat-icon[iconPositionEnd], [matButtonIcon][iconPositionEnd], .material-symbols-outlined[iconPositionEnd], .material-symbols-rounded[iconPositionEnd], .material-symbols-sharp[iconPositionEnd]`,`[progressIndicator]`];function e(r,i){r&1&&(ol(0,`div`,2),tw(1,3),il())}return OI({type:a,selectors:[[`button`,`matButton`,``],[`a`,`matButton`,``],[`button`,`mat-button`,``],[`button`,`mat-raised-button`,``],[`button`,`mat-flat-button`,``],[`button`,`mat-stroked-button`,``],[`a`,`mat-button`,``],[`a`,`mat-raised-button`,``],[`a`,`mat-flat-button`,``],[`a`,`mat-stroked-button`,``]],hostAttrs:[1,`mdc-button`],inputs:{appearance:[0,`matButton`,`appearance`]},exportAs:[`matButton`,`matAnchor`],features:[zp],ngContentSelectors:n,decls:8,vars:5,consts:[[1,`mat-mdc-button-persistent-ripple`],[1,`mdc-button__label`],[1,`mat-mdc-button-progress-indicator-container`],[1,`mat-focus-indicator`],[1,`mat-mdc-button-touch-target`]],template:function(i,m){i&1&&(ew(t),dh(0,`span`,0),tw(1),ol(2,`span`,1),tw(3,1),il(),tw(4,2),RD(5,e,2,0,`div`,2),dh(6,`span`,3)(7,`span`,4)),i&2&&(_h(`mdc-button__ripple`,!m._isFab)(`mdc-fab__ripple`,m._isFab),sE(5),kD(m.showProgress()?5:-1))},styles:[`.mat-mdc-button-base {
  text-decoration: none;
}
.mat-mdc-button-base .mat-icon {
  min-height: fit-content;
  flex-shrink: 0;
}
@media (hover: none) {
  .mat-mdc-button-base:hover > span.mat-mdc-button-persistent-ripple::before {
    opacity: 0;
  }
}

.mdc-button {
  -webkit-user-select: none;
  user-select: none;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 64px;
  border: none;
  outline: none;
  line-height: inherit;
  -webkit-appearance: none;
  overflow: visible;
  vertical-align: middle;
  background: transparent;
  padding: 0 8px;
}
.mdc-button::-moz-focus-inner {
  padding: 0;
  border: 0;
}
.mdc-button:active {
  outline: none;
}
.mdc-button:hover {
  cursor: pointer;
}
.mdc-button:disabled {
  cursor: default;
  pointer-events: none;
}
.mdc-button[hidden] {
  display: none;
}
.mdc-button .mdc-button__label {
  position: relative;
}

.mat-mdc-button {
  padding: 0 var(--%NS%mat-button-text-horizontal-padding, 12px);
  height: var(--%NS%mat-button-text-container-height, 40px);
  font-family: var(--%NS%mat-button-text-label-text-font, var(--%NS%mat-sys-label-large-font));
  font-size: var(--%NS%mat-button-text-label-text-size, var(--%NS%mat-sys-label-large-size));
  letter-spacing: var(--%NS%mat-button-text-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
  text-transform: var(--%NS%mat-button-text-label-text-transform);
  font-weight: var(--%NS%mat-button-text-label-text-weight, var(--%NS%mat-sys-label-large-weight));
}
.mat-mdc-button, .mat-mdc-button .mdc-button__ripple {
  border-radius: var(--%NS%mat-button-text-container-shape, var(--%NS%mat-sys-corner-full));
}
.mat-mdc-button:not(:disabled) {
  color: var(--%NS%mat-button-text-label-text-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-button[disabled], .mat-mdc-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--%NS%mat-button-text-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}
.mat-mdc-button:has(.material-icons, .material-symbols-outlined, .material-symbols-rounded,
.material-symbols-sharp, mat-icon, [matButtonIcon]) {
  padding: 0 var(--%NS%mat-button-text-with-icon-horizontal-padding, 16px);
}
.mat-mdc-button > .mat-icon {
  margin-right: var(--%NS%mat-button-text-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-text-icon-offset, -4px);
}
[dir=rtl] .mat-mdc-button > .mat-icon {
  margin-right: var(--%NS%mat-button-text-icon-offset, -4px);
  margin-left: var(--%NS%mat-button-text-icon-spacing, 8px);
}
.mat-mdc-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-text-icon-offset, -4px);
  margin-left: var(--%NS%mat-button-text-icon-spacing, 8px);
}
[dir=rtl] .mat-mdc-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-text-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-text-icon-offset, -4px);
}
.mat-mdc-button .mat-ripple-element {
  background-color: var(--%NS%mat-button-text-ripple-color, color-mix(in srgb, var(--%NS%mat-sys-primary) calc(var(--%NS%mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-text-state-layer-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-text-disabled-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-text-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-text-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mat-mdc-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-text-pressed-state-layer-opacity, var(--%NS%mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--%NS%mat-button-text-touch-target-size, 48px);
  display: var(--%NS%mat-button-text-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}

.mat-mdc-unelevated-button {
  transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
  height: var(--%NS%mat-button-filled-container-height, 40px);
  font-family: var(--%NS%mat-button-filled-label-text-font, var(--%NS%mat-sys-label-large-font));
  font-size: var(--%NS%mat-button-filled-label-text-size, var(--%NS%mat-sys-label-large-size));
  letter-spacing: var(--%NS%mat-button-filled-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
  text-transform: var(--%NS%mat-button-filled-label-text-transform);
  font-weight: var(--%NS%mat-button-filled-label-text-weight, var(--%NS%mat-sys-label-large-weight));
  padding: 0 var(--%NS%mat-button-filled-horizontal-padding, 24px);
}
.mat-mdc-unelevated-button > .mat-icon {
  margin-right: var(--%NS%mat-button-filled-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-filled-icon-offset, -8px);
}
[dir=rtl] .mat-mdc-unelevated-button > .mat-icon {
  margin-right: var(--%NS%mat-button-filled-icon-offset, -8px);
  margin-left: var(--%NS%mat-button-filled-icon-spacing, 8px);
}
.mat-mdc-unelevated-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-filled-icon-offset, -8px);
  margin-left: var(--%NS%mat-button-filled-icon-spacing, 8px);
}
[dir=rtl] .mat-mdc-unelevated-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-filled-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-filled-icon-offset, -8px);
}
.mat-mdc-unelevated-button .mat-ripple-element {
  background-color: var(--%NS%mat-button-filled-ripple-color, color-mix(in srgb, var(--%NS%mat-sys-on-primary) calc(var(--%NS%mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-unelevated-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-filled-state-layer-color, var(--%NS%mat-sys-on-primary));
}
.mat-mdc-unelevated-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-filled-disabled-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-unelevated-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-filled-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-unelevated-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-unelevated-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-unelevated-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-filled-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mat-mdc-unelevated-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-filled-pressed-state-layer-opacity, var(--%NS%mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-unelevated-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--%NS%mat-button-filled-touch-target-size, 48px);
  display: var(--%NS%mat-button-filled-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}
.mat-mdc-unelevated-button:not(:disabled) {
  color: var(--%NS%mat-button-filled-label-text-color, var(--%NS%mat-sys-on-primary));
  background-color: var(--%NS%mat-button-filled-container-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-unelevated-button, .mat-mdc-unelevated-button .mdc-button__ripple {
  border-radius: var(--%NS%mat-button-filled-container-shape, var(--%NS%mat-sys-corner-full));
}
.mat-mdc-unelevated-button .mat-mdc-button-progress-indicator-container {
  --%NS%mat-progress-spinner-active-indicator-color: var(--%NS%mat-button-filled-progress-active-indicator-color, var(--%NS%mat-sys-on-primary));
}
.mat-mdc-unelevated-button[disabled], .mat-mdc-unelevated-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--%NS%mat-button-filled-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
  background-color: var(--%NS%mat-button-filled-disabled-container-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mat-mdc-unelevated-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}

.mat-mdc-raised-button {
  transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--%NS%mat-button-protected-container-elevation-shadow, var(--%NS%mat-sys-level1));
  height: var(--%NS%mat-button-protected-container-height, 40px);
  font-family: var(--%NS%mat-button-protected-label-text-font, var(--%NS%mat-sys-label-large-font));
  font-size: var(--%NS%mat-button-protected-label-text-size, var(--%NS%mat-sys-label-large-size));
  letter-spacing: var(--%NS%mat-button-protected-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
  text-transform: var(--%NS%mat-button-protected-label-text-transform);
  font-weight: var(--%NS%mat-button-protected-label-text-weight, var(--%NS%mat-sys-label-large-weight));
  padding: 0 var(--%NS%mat-button-protected-horizontal-padding, 24px);
}
.mat-mdc-raised-button > .mat-icon {
  margin-right: var(--%NS%mat-button-protected-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-protected-icon-offset, -8px);
}
[dir=rtl] .mat-mdc-raised-button > .mat-icon {
  margin-right: var(--%NS%mat-button-protected-icon-offset, -8px);
  margin-left: var(--%NS%mat-button-protected-icon-spacing, 8px);
}
.mat-mdc-raised-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-protected-icon-offset, -8px);
  margin-left: var(--%NS%mat-button-protected-icon-spacing, 8px);
}
[dir=rtl] .mat-mdc-raised-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-protected-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-protected-icon-offset, -8px);
}
.mat-mdc-raised-button .mat-ripple-element {
  background-color: var(--%NS%mat-button-protected-ripple-color, color-mix(in srgb, var(--%NS%mat-sys-primary) calc(var(--%NS%mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-raised-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-protected-state-layer-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-raised-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-protected-disabled-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-raised-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-protected-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-raised-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-raised-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-raised-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-protected-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mat-mdc-raised-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-protected-pressed-state-layer-opacity, var(--%NS%mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-raised-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--%NS%mat-button-protected-touch-target-size, 48px);
  display: var(--%NS%mat-button-protected-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}
.mat-mdc-raised-button:not(:disabled) {
  color: var(--%NS%mat-button-protected-label-text-color, var(--%NS%mat-sys-primary));
  background-color: var(--%NS%mat-button-protected-container-color, var(--%NS%mat-sys-surface));
}
.mat-mdc-raised-button, .mat-mdc-raised-button .mdc-button__ripple {
  border-radius: var(--%NS%mat-button-protected-container-shape, var(--%NS%mat-sys-corner-full));
}
@media (hover: hover) {
  .mat-mdc-raised-button:hover {
    box-shadow: var(--%NS%mat-button-protected-hover-container-elevation-shadow, var(--%NS%mat-sys-level2));
  }
}
.mat-mdc-raised-button:focus {
  box-shadow: var(--%NS%mat-button-protected-focus-container-elevation-shadow, var(--%NS%mat-sys-level1));
}
.mat-mdc-raised-button:active, .mat-mdc-raised-button:focus:active {
  box-shadow: var(--%NS%mat-button-protected-pressed-container-elevation-shadow, var(--%NS%mat-sys-level1));
}
.mat-mdc-raised-button[disabled], .mat-mdc-raised-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--%NS%mat-button-protected-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
  background-color: var(--%NS%mat-button-protected-disabled-container-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mat-mdc-raised-button[disabled].mat-mdc-button-disabled, .mat-mdc-raised-button.mat-mdc-button-disabled.mat-mdc-button-disabled {
  box-shadow: var(--%NS%mat-button-protected-disabled-container-elevation-shadow, var(--%NS%mat-sys-level0));
}
.mat-mdc-raised-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}

.mat-mdc-outlined-button {
  border-style: solid;
  transition: border 280ms cubic-bezier(0.4, 0, 0.2, 1);
  height: var(--%NS%mat-button-outlined-container-height, 40px);
  font-family: var(--%NS%mat-button-outlined-label-text-font, var(--%NS%mat-sys-label-large-font));
  font-size: var(--%NS%mat-button-outlined-label-text-size, var(--%NS%mat-sys-label-large-size));
  letter-spacing: var(--%NS%mat-button-outlined-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
  text-transform: var(--%NS%mat-button-outlined-label-text-transform);
  font-weight: var(--%NS%mat-button-outlined-label-text-weight, var(--%NS%mat-sys-label-large-weight));
  border-radius: var(--%NS%mat-button-outlined-container-shape, var(--%NS%mat-sys-corner-full));
  border-width: var(--%NS%mat-button-outlined-outline-width, 1px);
  padding: 0 var(--%NS%mat-button-outlined-horizontal-padding, 24px);
}
.mat-mdc-outlined-button > .mat-icon {
  margin-right: var(--%NS%mat-button-outlined-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-outlined-icon-offset, -8px);
}
[dir=rtl] .mat-mdc-outlined-button > .mat-icon {
  margin-right: var(--%NS%mat-button-outlined-icon-offset, -8px);
  margin-left: var(--%NS%mat-button-outlined-icon-spacing, 8px);
}
.mat-mdc-outlined-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-outlined-icon-offset, -8px);
  margin-left: var(--%NS%mat-button-outlined-icon-spacing, 8px);
}
[dir=rtl] .mat-mdc-outlined-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-outlined-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-outlined-icon-offset, -8px);
}
.mat-mdc-outlined-button .mat-ripple-element {
  background-color: var(--%NS%mat-button-outlined-ripple-color, color-mix(in srgb, var(--%NS%mat-sys-primary) calc(var(--%NS%mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-mdc-outlined-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-outlined-state-layer-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-outlined-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-outlined-disabled-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-mdc-outlined-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-outlined-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-outlined-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-outlined-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-mdc-outlined-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-outlined-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mat-mdc-outlined-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-outlined-pressed-state-layer-opacity, var(--%NS%mat-sys-pressed-state-layer-opacity));
}
.mat-mdc-outlined-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--%NS%mat-button-outlined-touch-target-size, 48px);
  display: var(--%NS%mat-button-outlined-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}
.mat-mdc-outlined-button:not(:disabled) {
  color: var(--%NS%mat-button-outlined-label-text-color, var(--%NS%mat-sys-primary));
  border-color: var(--%NS%mat-button-outlined-outline-color, var(--%NS%mat-sys-outline));
}
.mat-mdc-outlined-button[disabled], .mat-mdc-outlined-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--%NS%mat-button-outlined-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
  border-color: var(--%NS%mat-button-outlined-disabled-outline-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mat-mdc-outlined-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}

.mat-tonal-button {
  transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
  height: var(--%NS%mat-button-tonal-container-height, 40px);
  font-family: var(--%NS%mat-button-tonal-label-text-font, var(--%NS%mat-sys-label-large-font));
  font-size: var(--%NS%mat-button-tonal-label-text-size, var(--%NS%mat-sys-label-large-size));
  letter-spacing: var(--%NS%mat-button-tonal-label-text-tracking, var(--%NS%mat-sys-label-large-tracking));
  text-transform: var(--%NS%mat-button-tonal-label-text-transform);
  font-weight: var(--%NS%mat-button-tonal-label-text-weight, var(--%NS%mat-sys-label-large-weight));
  padding: 0 var(--%NS%mat-button-tonal-horizontal-padding, 24px);
}
.mat-tonal-button:not(:disabled) {
  color: var(--%NS%mat-button-tonal-label-text-color, var(--%NS%mat-sys-on-secondary-container));
  background-color: var(--%NS%mat-button-tonal-container-color, var(--%NS%mat-sys-secondary-container));
}
.mat-tonal-button, .mat-tonal-button .mdc-button__ripple {
  border-radius: var(--%NS%mat-button-tonal-container-shape, var(--%NS%mat-sys-corner-full));
}
.mat-tonal-button[disabled], .mat-tonal-button.mat-mdc-button-disabled {
  cursor: default;
  pointer-events: none;
  color: var(--%NS%mat-button-tonal-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
  background-color: var(--%NS%mat-button-tonal-disabled-container-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mat-tonal-button.mat-mdc-button-disabled-interactive {
  pointer-events: auto;
}
.mat-tonal-button > .mat-icon {
  margin-right: var(--%NS%mat-button-tonal-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-tonal-icon-offset, -8px);
}
[dir=rtl] .mat-tonal-button > .mat-icon {
  margin-right: var(--%NS%mat-button-tonal-icon-offset, -8px);
  margin-left: var(--%NS%mat-button-tonal-icon-spacing, 8px);
}
.mat-tonal-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-tonal-icon-offset, -8px);
  margin-left: var(--%NS%mat-button-tonal-icon-spacing, 8px);
}
[dir=rtl] .mat-tonal-button .mdc-button__label + .mat-icon {
  margin-right: var(--%NS%mat-button-tonal-icon-spacing, 8px);
  margin-left: var(--%NS%mat-button-tonal-icon-offset, -8px);
}
.mat-tonal-button .mat-ripple-element {
  background-color: var(--%NS%mat-button-tonal-ripple-color, color-mix(in srgb, var(--%NS%mat-sys-on-secondary-container) calc(var(--%NS%mat-sys-pressed-state-layer-opacity) * 100%), transparent));
}
.mat-tonal-button .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-tonal-state-layer-color, var(--%NS%mat-sys-on-secondary-container));
}
.mat-tonal-button.mat-mdc-button-disabled .mat-mdc-button-persistent-ripple::before {
  background-color: var(--%NS%mat-button-tonal-disabled-state-layer-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-tonal-button:hover > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-tonal-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-tonal-button.cdk-program-focused > .mat-mdc-button-persistent-ripple::before, .mat-tonal-button.cdk-keyboard-focused > .mat-mdc-button-persistent-ripple::before, .mat-tonal-button.mat-mdc-button-disabled-interactive:focus > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-tonal-focus-state-layer-opacity, var(--%NS%mat-sys-focus-state-layer-opacity));
}
.mat-tonal-button:active > .mat-mdc-button-persistent-ripple::before {
  opacity: var(--%NS%mat-button-tonal-pressed-state-layer-opacity, var(--%NS%mat-sys-pressed-state-layer-opacity));
}
.mat-tonal-button .mat-mdc-button-touch-target {
  position: absolute;
  top: 50%;
  height: var(--%NS%mat-button-tonal-touch-target-size, 48px);
  display: var(--%NS%mat-button-tonal-touch-target-display, block);
  left: 0;
  right: 0;
  transform: translateY(-50%);
}

.mat-mdc-button,
.mat-mdc-unelevated-button,
.mat-mdc-raised-button,
.mat-mdc-outlined-button,
.mat-tonal-button {
  -webkit-tap-highlight-color: transparent;
}
.mat-mdc-button .mat-mdc-button-ripple,
.mat-mdc-button .mat-mdc-button-persistent-ripple,
.mat-mdc-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-unelevated-button .mat-mdc-button-ripple,
.mat-mdc-unelevated-button .mat-mdc-button-persistent-ripple,
.mat-mdc-unelevated-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-raised-button .mat-mdc-button-ripple,
.mat-mdc-raised-button .mat-mdc-button-persistent-ripple,
.mat-mdc-raised-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-outlined-button .mat-mdc-button-ripple,
.mat-mdc-outlined-button .mat-mdc-button-persistent-ripple,
.mat-mdc-outlined-button .mat-mdc-button-persistent-ripple::before,
.mat-tonal-button .mat-mdc-button-ripple,
.mat-tonal-button .mat-mdc-button-persistent-ripple,
.mat-tonal-button .mat-mdc-button-persistent-ripple::before {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}
.mat-mdc-button .mat-mdc-button-ripple,
.mat-mdc-unelevated-button .mat-mdc-button-ripple,
.mat-mdc-raised-button .mat-mdc-button-ripple,
.mat-mdc-outlined-button .mat-mdc-button-ripple,
.mat-tonal-button .mat-mdc-button-ripple {
  overflow: hidden;
}
.mat-mdc-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-unelevated-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-raised-button .mat-mdc-button-persistent-ripple::before,
.mat-mdc-outlined-button .mat-mdc-button-persistent-ripple::before,
.mat-tonal-button .mat-mdc-button-persistent-ripple::before {
  content: "";
  opacity: 0;
}
.mat-mdc-button .mdc-button__label,
.mat-mdc-button .mat-icon,
.mat-mdc-unelevated-button .mdc-button__label,
.mat-mdc-unelevated-button .mat-icon,
.mat-mdc-raised-button .mdc-button__label,
.mat-mdc-raised-button .mat-icon,
.mat-mdc-outlined-button .mdc-button__label,
.mat-mdc-outlined-button .mat-icon,
.mat-tonal-button .mdc-button__label,
.mat-tonal-button .mat-icon {
  z-index: 1;
  position: relative;
}
.mat-mdc-button .mat-focus-indicator,
.mat-mdc-unelevated-button .mat-focus-indicator,
.mat-mdc-raised-button .mat-focus-indicator,
.mat-mdc-outlined-button .mat-focus-indicator,
.mat-tonal-button .mat-focus-indicator {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  border-radius: inherit;
}
.mat-mdc-button:focus-visible > .mat-focus-indicator::before,
.mat-mdc-unelevated-button:focus-visible > .mat-focus-indicator::before,
.mat-mdc-raised-button:focus-visible > .mat-focus-indicator::before,
.mat-mdc-outlined-button:focus-visible > .mat-focus-indicator::before,
.mat-tonal-button:focus-visible > .mat-focus-indicator::before {
  content: "";
  border-radius: inherit;
}
.mat-mdc-button._mat-animation-noopable,
.mat-mdc-unelevated-button._mat-animation-noopable,
.mat-mdc-raised-button._mat-animation-noopable,
.mat-mdc-outlined-button._mat-animation-noopable,
.mat-tonal-button._mat-animation-noopable {
  transition: none !important;
  animation: none !important;
}
.mat-mdc-button > .mat-icon,
.mat-mdc-unelevated-button > .mat-icon,
.mat-mdc-raised-button > .mat-icon,
.mat-mdc-outlined-button > .mat-icon,
.mat-tonal-button > .mat-icon {
  display: inline-block;
  position: relative;
  vertical-align: top;
  font-size: 1.125rem;
  height: 1.125rem;
  width: 1.125rem;
}

.mat-mdc-outlined-button .mat-mdc-button-ripple,
.mat-mdc-outlined-button .mdc-button__ripple {
  top: -1px;
  left: -1px;
  bottom: -1px;
  right: -1px;
}

.mat-mdc-unelevated-button .mat-focus-indicator::before,
.mat-tonal-button .mat-focus-indicator::before,
.mat-mdc-raised-button .mat-focus-indicator::before {
  margin: calc(calc(var(--%NS%mat-focus-indicator-border-width, 3px) + 2px) * -1);
}

.mat-mdc-outlined-button .mat-focus-indicator::before {
  margin: calc(calc(var(--%NS%mat-focus-indicator-border-width, 3px) + 3px) * -1);
}

.mat-mdc-button-progress-indicator-container {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.mat-mdc-button-progress-indicator-shown mat-icon,
.mat-mdc-button-progress-indicator-shown [matButtonIcon],
.mat-mdc-button-progress-indicator-shown .mdc-button__label {
  visibility: hidden;
}
`,`@media (forced-colors: active) {
  .mat-mdc-button:not(.mdc-button--outlined),
  .mat-mdc-unelevated-button:not(.mdc-button--outlined),
  .mat-mdc-raised-button:not(.mdc-button--outlined),
  .mat-mdc-outlined-button:not(.mdc-button--outlined),
  .mat-mdc-button-base.mat-tonal-button,
  .mat-mdc-icon-button.mat-mdc-icon-button,
  .mat-mdc-outlined-button .mdc-button__ripple {
    outline: solid 1px;
  }
}
`],encapsulation:2})})()}return a})();function st$2(a){return a.hasAttribute(`mat-raised-button`)?`elevated`:a.hasAttribute(`mat-stroked-button`)?`outlined`:a.hasAttribute(`mat-flat-button`)?`filled`:a.hasAttribute(`mat-button`)?`text`:null}var Bt$1=(()=>{class a{static ɵfac=function(n){return new(n||a)};static ɵmod=LI({type:a});static ɵinj=au({imports:[Ne$3,j$2]})}return a})();var ue$1=20;var W$2=(()=>{class n{_ngZone=D$4(be$1);_platform=D$4(l);_renderer=D$4(Lr).createRenderer(null,null);_cleanupGlobalListener;_scrolled=new X$2;_scrolledCount=0;scrollContainers=new Map;register(t){this.scrollContainers.has(t)||this.scrollContainers.set(t,t.elementScrolled().subscribe(()=>this._scrolled.next(t)))}deregister(t){let i=this.scrollContainers.get(t);i&&(i.unsubscribe(),this.scrollContainers.delete(t))}scrolled(t=ue$1){return this._platform.isBrowser?new S$4(i=>{this._cleanupGlobalListener||(this._cleanupGlobalListener=this._ngZone.runOutsideAngular(()=>this._renderer.listen(`document`,`scroll`,()=>this._scrolled.next())));let o=t>0?this._scrolled.pipe(Fg(t)).subscribe(i):this._scrolled.subscribe(i);return this._scrolledCount++,()=>{o.unsubscribe(),this._scrolledCount--,this._scrolledCount||(this._cleanupGlobalListener?.(),this._cleanupGlobalListener=void 0)}}):Ig()}ngOnDestroy(){this._cleanupGlobalListener?.(),this._cleanupGlobalListener=void 0,this.scrollContainers.forEach((t,i)=>this.deregister(i)),this._scrolled.complete()}ancestorScrolled(t,i){let o=this.getAncestorScrollContainers(t);return this.scrolled(i).pipe(ln$1(r=>!r||o.indexOf(r)>-1))}getAncestorScrollContainers(t){let i=[];return this.scrollContainers.forEach((o,r)=>{this._targetContainsElement(r,t)&&i.push(r)}),i}_targetContainsElement(t,i){let o=R$2(i),r=t.getElementRef().nativeElement;do if(o==r)return!0;while(o=o.parentElement);return!1}static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var pe=(()=>{class n{elementRef=D$4(Hr);scrollDispatcher=D$4(W$2);ngZone=D$4(be$1);dir=D$4(A$3,{optional:!0});_scrollElement=this.elementRef.nativeElement;_destroyed=new X$2;_renderer=D$4(Ka);_cleanupScroll;_elementScrolled=new X$2;ngOnInit(){this._cleanupScroll=this.ngZone.runOutsideAngular(()=>this._renderer.listen(this._scrollElement,`scroll`,t=>this._elementScrolled.next(t))),this.scrollDispatcher.register(this)}ngOnDestroy(){this._cleanupScroll?.(),this._elementScrolled.complete(),this.scrollDispatcher.deregister(this),this._destroyed.next(),this._destroyed.complete()}elementScrolled(){return this._elementScrolled}getElementRef(){return this.elementRef}scrollTo(t){let i=this.elementRef.nativeElement,o=this.dir&&this.dir.value==`rtl`;t.left??=o?t.end:t.start,t.right??=o?t.start:t.end,t.bottom!=null&&(t.top=i.scrollHeight-i.clientHeight-t.bottom),o&&H$3()!=a.NORMAL?(t.left!=null&&(t.right=i.scrollWidth-i.clientWidth-t.left),H$3()==a.INVERTED?t.left=t.right:H$3()==a.NEGATED&&(t.left=t.right?-t.right:t.right)):t.right!=null&&(t.left=i.scrollWidth-i.clientWidth-t.right),this._applyScrollToOptions(t)}_applyScrollToOptions(t){let i=this.elementRef.nativeElement;G$4()?i.scrollTo(t):(t.top!=null&&(i.scrollTop=t.top),t.left!=null&&(i.scrollLeft=t.left))}measureScrollOffset(t){let i=`left`,o=`right`,r=this.elementRef.nativeElement;if(t==`top`)return r.scrollTop;if(t==`bottom`)return r.scrollHeight-r.clientHeight-r.scrollTop;let s=this.dir&&this.dir.value==`rtl`;return t==`start`?t=s?o:i:t==`end`&&(t=s?i:o),s&&H$3()==a.INVERTED?t==i?r.scrollWidth-r.clientWidth-r.scrollLeft:r.scrollLeft:s&&H$3()==a.NEGATED?t==i?r.scrollLeft+r.scrollWidth-r.clientWidth:-r.scrollLeft:t==i?r.scrollLeft:r.scrollWidth-r.clientWidth-r.scrollLeft}static ɵfac=function(i){return new(i||n)};static ɵdir=jI({type:n,selectors:[[``,`cdk-scrollable`,``],[``,`cdkScrollable`,``]]})}return n})();var fe=20;var B$2=(()=>{class n{_platform=D$4(l);_listeners;_viewportSize=null;_change=new X$2;_document=D$4(Cr);constructor(){let t=D$4(be$1),i=D$4(Lr).createRenderer(null,null);t.runOutsideAngular(()=>{if(this._platform.isBrowser){let o=r=>this._change.next(r);this._listeners=[i.listen(`window`,`resize`,o),i.listen(`window`,`orientationchange`,o)]}this.change().subscribe(()=>this._viewportSize=null)})}ngOnDestroy(){this._listeners?.forEach(t=>t()),this._change.complete()}getViewportSize(){this._viewportSize||this._updateViewportSize();let t={width:this._viewportSize.width,height:this._viewportSize.height};return this._platform.isBrowser||(this._viewportSize=null),t}getViewportRect(){let t=this.getViewportScrollPosition(),{width:i,height:o}=this.getViewportSize();return{top:t.top,left:t.left,bottom:t.top+o,right:t.left+i,height:o,width:i}}getViewportScrollPosition(){if(!this._platform.isBrowser)return{top:0,left:0};let t=this._document,i=this._getWindow(),o=t.documentElement,r=o.getBoundingClientRect();return{top:-r.top||t.body?.scrollTop||i.scrollY||o.scrollTop||0,left:-r.left||t.body?.scrollLeft||i.scrollX||o.scrollLeft||0}}change(t=fe){return t>0?this._change.pipe(Fg(t)):this._change}_getWindow(){return this._document.defaultView||window}_updateViewportSize(){let t=this._getWindow();this._viewportSize=this._platform.isBrowser?{width:t.innerWidth,height:t.innerHeight}:{width:0,height:0}}static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var wt$1=(()=>{class n{static ɵfac=function(i){return new(i||n)};static ɵmod=LI({type:n});static ɵinj=au({})}return n})();var bt$3=(()=>{class n{static ɵfac=function(i){return new(i||n)};static ɵmod=LI({type:n});static ɵinj=au({imports:[j$2,wt$1,j$2,wt$1]})}return n})();var Y$1=class{_attachedHost=null;attach(e){return this._attachedHost=e,e.attach(this)}detach(){let e=this._attachedHost;e!=null&&(this._attachedHost=null,e.detach())}get isAttached(){return this._attachedHost!=null}setAttachedHost(e){this._attachedHost=e}};var Ct$1=class extends Y$1{component;viewContainerRef;injector;projectableNodes;bindings;directives;constructor(e,t,i,o,r,s){super(),this.component=e,this.viewContainerRef=t,this.injector=i,this.projectableNodes=o,this.bindings=r||null,this.directives=s||null}};var H$2=class extends Y$1{templateRef;viewContainerRef;context;injector;constructor(e,t,i,o){super(),this.templateRef=e,this.viewContainerRef=t,this.context=i,this.injector=o}get origin(){return this.templateRef.elementRef}attach(e,t=this.context){return this.context=t,super.attach(e)}detach(){return this.context=void 0,super.detach()}};var kt$2=class extends Y$1{element;constructor(e){super(),this.element=e instanceof Hr?e.nativeElement:e}};var tt$2=class{_attachedPortal=null;_disposeFn=null;_isDisposed=!1;hasAttached(){return!!this._attachedPortal}attach(e){if(e instanceof Ct$1)return this._attachedPortal=e,this.attachComponentPortal(e);if(e instanceof H$2)return this._attachedPortal=e,this.attachTemplatePortal(e);if(this.attachDomPortal&&e instanceof kt$2)return this._attachedPortal=e,this.attachDomPortal(e)}attachDomPortal=null;detach(){this._attachedPortal&&(this._attachedPortal.setAttachedHost(null),this._attachedPortal=null),this._invokeDisposeFn()}dispose(){this.hasAttached()&&this.detach(),this._invokeDisposeFn(),this._isDisposed=!0}setDisposeFn(e){this._disposeFn=e}_invokeDisposeFn(){this._disposeFn&&(this._disposeFn(),this._disposeFn=null)}};var et$3=class extends tt$2{outletElement;_appRef;_defaultInjector;constructor(e,t,i){super(),this.outletElement=e,this._appRef=t,this._defaultInjector=i}attachComponentPortal(e){let t;if(e.viewContainerRef){let i=e.injector||e.viewContainerRef.injector,o=i.get(Hn,null,{optional:!0})||void 0;t=e.viewContainerRef.createComponent(e.component,{index:e.viewContainerRef.length,injector:i,ngModuleRef:o,projectableNodes:e.projectableNodes||void 0,bindings:e.bindings||void 0,directives:e.directives||void 0}),this.setDisposeFn(()=>t.destroy())}else{let i=this._appRef,o=e.injector||this._defaultInjector||fe$1.NULL,r=o.get(me$1,i.injector);t=UF(e.component,{elementInjector:o,environmentInjector:r,projectableNodes:e.projectableNodes||void 0,bindings:e.bindings||void 0,directives:e.directives||void 0}),i.attachView(t.hostView),this.setDisposeFn(()=>{i.viewCount>0&&i.detachView(t.hostView),t.destroy()})}return this.outletElement.appendChild(this._getComponentRootNode(t)),this._attachedPortal=e,t}attachTemplatePortal(e){let t=e.viewContainerRef,i=t.createEmbeddedView(e.templateRef,e.context,{injector:e.injector});return i.rootNodes.forEach(o=>this.outletElement.appendChild(o)),i.detectChanges(),this.setDisposeFn(()=>{let o=t.indexOf(i);o!==-1&&t.remove(o)}),this._attachedPortal=e,i}attachDomPortal=e=>{let t=e.element;t.parentNode;let i=this.outletElement.ownerDocument.createComment(`dom-portal`);t.parentNode.insertBefore(i,t),this.outletElement.appendChild(t),this._attachedPortal=e,super.setDisposeFn(()=>{i.parentNode&&i.parentNode.replaceChild(t,i)})};dispose(){super.dispose(),this.outletElement.remove()}_getComponentRootNode(e){return e.hostView.rootNodes[0]}};var _i=(()=>{class n extends tt$2{_moduleRef=D$4(Hn,{optional:!0});_document=D$4(Cr);_viewContainerRef=D$4(zi);_isInitialized=!1;_attachedRef=null;get portal(){return this._attachedPortal}set portal(t){this.hasAttached()&&!t&&!this._isInitialized||(this.hasAttached()&&super.detach(),t&&super.attach(t),this._attachedPortal=t||null)}attached=new $e$3;get attachedRef(){return this._attachedRef}ngOnInit(){this._isInitialized=!0}ngOnDestroy(){super.dispose(),this._attachedRef=this._attachedPortal=null}attachComponentPortal(t){t.setAttachedHost(this);let i=t.viewContainerRef!=null?t.viewContainerRef:this._viewContainerRef,o=i.createComponent(t.component,{index:i.length,injector:t.injector||i.injector,projectableNodes:t.projectableNodes||void 0,ngModuleRef:this._moduleRef||void 0,bindings:t.bindings||void 0,directives:t.directives||void 0});return i!==this._viewContainerRef&&this._getRootNode().appendChild(o.hostView.rootNodes[0]),super.setDisposeFn(()=>o.destroy()),this._attachedPortal=t,this._attachedRef=o,this.attached.emit(o),o}attachTemplatePortal(t){t.setAttachedHost(this);let i=this._viewContainerRef.createEmbeddedView(t.templateRef,t.context,{injector:t.injector});return super.setDisposeFn(()=>this._viewContainerRef.clear()),this._attachedPortal=t,this._attachedRef=i,this.attached.emit(i),i}attachDomPortal=t=>{let i=t.element;i.parentNode;let o=this._document.createComment(`dom-portal`);t.setAttachedHost(this),i.parentNode.insertBefore(o,i),this._getRootNode().appendChild(i),this._attachedPortal=t,super.setDisposeFn(()=>{o.parentNode&&o.parentNode.replaceChild(i,o)})};_getRootNode(){let t=this._viewContainerRef.element.nativeElement;return t.nodeType===t.ELEMENT_NODE?t:t.parentNode}static ɵfac=(()=>{let t;return function(o){return(t||(t=by(n)))(o||n)}})();static ɵdir=jI({type:n,selectors:[[``,`cdkPortalOutlet`,``]],inputs:{portal:[0,`cdkPortalOutlet`,`portal`]},outputs:{attached:`attached`},exportAs:[`cdkPortalOutlet`],features:[zp]})}return n})();var Zt$1=(()=>{class n{static ɵfac=function(i){return new(i||n)};static ɵmod=LI({type:n});static ɵinj=au({})}return n})();var Ut$1=G$4();function te$1(n){return new it$2(n.get(B$2),n.get(Cr))}var it$2=class{_viewportRuler;_previousHTMLStyles={top:``,left:``};_previousScrollPosition;_isEnabled=!1;_document;constructor(e,t){this._viewportRuler=e,this._document=t}attach(){}enable(){if(this._canBeEnabled()){let e=this._document.documentElement;this._previousScrollPosition=this._viewportRuler.getViewportScrollPosition(),this._previousHTMLStyles.left=e.style.left||``,this._previousHTMLStyles.top=e.style.top||``,e.style.left=V$1(-this._previousScrollPosition.left),e.style.top=V$1(-this._previousScrollPosition.top),e.classList.add(`cdk-global-scrollblock`),this._isEnabled=!0}}disable(){if(this._isEnabled){let e=this._document.documentElement,t=this._document.body,i=e.style,o=t.style,r=i.scrollBehavior||``,s=o.scrollBehavior||``;this._isEnabled=!1,i.left=this._previousHTMLStyles.left,i.top=this._previousHTMLStyles.top,e.classList.remove(`cdk-global-scrollblock`),Ut$1&&(i.scrollBehavior=o.scrollBehavior=`auto`),window.scroll(this._previousScrollPosition.left,this._previousScrollPosition.top),Ut$1&&(i.scrollBehavior=r,o.scrollBehavior=s)}}_canBeEnabled(){if(this._document.documentElement.classList.contains(`cdk-global-scrollblock`)||this._isEnabled)return!1;let t=this._document.documentElement,i=this._viewportRuler.getViewportSize();return t.scrollHeight>i.height||t.scrollWidth>i.width}};function ee(n,e){return new nt$2(n.get(W$2),n.get(be$1),n.get(B$2),e)}var nt$2=class{_scrollDispatcher;_ngZone;_viewportRuler;_config;_scrollSubscription=null;_overlayRef;_initialScrollPosition;constructor(e,t,i,o){this._scrollDispatcher=e,this._ngZone=t,this._viewportRuler=i,this._config=o}attach(e){this._overlayRef,this._overlayRef=e}enable(){if(this._scrollSubscription)return;let e=this._scrollDispatcher.scrolled(0).pipe(ln$1(t=>!t||!this._overlayRef.overlayElement.contains(t.getElementRef().nativeElement)));this._config&&this._config.threshold&&this._config.threshold>1?(this._initialScrollPosition=this._viewportRuler.getViewportScrollPosition().top,this._scrollSubscription=e.subscribe(()=>{let t=this._viewportRuler.getViewportScrollPosition().top;Math.abs(t-this._initialScrollPosition)>this._config.threshold?this._detach():this._overlayRef.updatePosition()})):this._scrollSubscription=e.subscribe(this._detach)}disable(){this._scrollSubscription&&(this._scrollSubscription.unsubscribe(),this._scrollSubscription=null)}detach(){this.disable(),this._overlayRef=null}_detach=()=>{this.disable(),this._overlayRef.hasAttached()&&this._ngZone.run(()=>this._overlayRef.detach())}};var X$1=class{enable(){}disable(){}attach(){}};function Ot$1(n,e){return e.some(t=>{let i=n.bottom<t.top,o=n.top>t.bottom,r=n.right<t.left,s=n.left>t.right;return i||o||r||s})}function Gt$1(n,e){return e.some(t=>{let i=n.top<t.top,o=n.bottom>t.bottom,r=n.left<t.left,s=n.right>t.right;return i||o||r||s})}function Pt$1(n,e){return new ot$1(n.get(W$2),n.get(B$2),n.get(be$1),e)}var ot$1=class{_scrollDispatcher;_viewportRuler;_ngZone;_config;_scrollSubscription=null;_overlayRef;constructor(e,t,i,o){this._scrollDispatcher=e,this._viewportRuler=t,this._ngZone=i,this._config=o}attach(e){this._overlayRef,this._overlayRef=e}enable(){if(!this._scrollSubscription){let e=this._config?this._config.scrollThrottle:0;this._scrollSubscription=this._scrollDispatcher.scrolled(e).subscribe(()=>{if(this._overlayRef.updatePosition(),this._config&&this._config.autoClose){let t=this._overlayRef.overlayElement.getBoundingClientRect(),{width:i,height:o}=this._viewportRuler.getViewportSize();Ot$1(t,[{width:i,height:o,bottom:o,right:i,top:0,left:0}])&&(this.disable(),this._ngZone.run(()=>this._overlayRef.detach()))}})}}disable(){this._scrollSubscription&&(this._scrollSubscription.unsubscribe(),this._scrollSubscription=null)}detach(){this.disable(),this._overlayRef=null}};var ie$1=(()=>{class n{_injector=D$4(fe$1);noop=()=>new X$1;close=t=>ee(this._injector,t);block=()=>te$1(this._injector);reposition=t=>Pt$1(this._injector,t);static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var j$1=class{positionStrategy;scrollStrategy=new X$1;panelClass=``;hasBackdrop=!1;backdropClass=`cdk-overlay-dark-backdrop`;disableAnimations;width;height;minWidth;minHeight;maxWidth;maxHeight;direction;disposeOnNavigation=!1;usePopover;eventPredicate;constructor(e){if(e){let t=Object.keys(e);for(let i of t)e[i]!==void 0&&(this[i]=e[i])}}};var rt$1=class{connectionPair;scrollableViewProperties;constructor(e,t){this.connectionPair=e,this.scrollableViewProperties=t}};var ne$1=(()=>{class n{_attachedOverlays=[];_document=D$4(Cr);_isAttached=!1;ngOnDestroy(){this.detach()}add(t){this.remove(t),this._attachedOverlays.push(t)}remove(t){let i=this._attachedOverlays.indexOf(t);i>-1&&this._attachedOverlays.splice(i,1),this._attachedOverlays.length===0&&this.detach()}canReceiveEvent(t,i,o){return o.observers.length<1?!1:t.eventPredicate?t.eventPredicate(i):!0}static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var oe$2=(()=>{class n extends ne$1{_ngZone=D$4(be$1);_renderer=D$4(Lr).createRenderer(null,null);_cleanupKeydown;add(t){super.add(t),this._isAttached||(this._ngZone.runOutsideAngular(()=>{this._cleanupKeydown=this._renderer.listen(`body`,`keydown`,this._keydownListener)}),this._isAttached=!0)}detach(){this._isAttached&&(this._cleanupKeydown?.(),this._isAttached=!1)}_keydownListener=t=>{let i=this._attachedOverlays;for(let o=i.length-1;o>-1;o--){let r=i[o];if(this.canReceiveEvent(r,t,r._keydownEvents)){this._ngZone.run(()=>r._keydownEvents.next(t));break}}};static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var re$1=(()=>{class n extends ne$1{_platform=D$4(l);_ngZone=D$4(be$1);_renderer=D$4(Lr).createRenderer(null,null);_cursorOriginalValue;_cursorStyleIsSet=!1;_pointerDownEventTarget=null;_cleanups;add(t){if(super.add(t),!this._isAttached){let i=this._document.body,o={capture:!0},r=this._renderer;this._cleanups=this._ngZone.runOutsideAngular(()=>[r.listen(i,`pointerdown`,this._pointerDownListener,o),r.listen(i,`click`,this._clickListener,o),r.listen(i,`auxclick`,this._clickListener,o),r.listen(i,`contextmenu`,this._clickListener,o)]),this._platform.IOS&&!this._cursorStyleIsSet&&(this._cursorOriginalValue=i.style.cursor,i.style.cursor=`pointer`,this._cursorStyleIsSet=!0),this._isAttached=!0}}detach(){this._isAttached&&(this._cleanups?.forEach(t=>t()),this._cleanups=void 0,this._platform.IOS&&this._cursorStyleIsSet&&(this._document.body.style.cursor=this._cursorOriginalValue,this._cursorStyleIsSet=!1),this._isAttached=!1)}_pointerDownListener=t=>{this._pointerDownEventTarget=y$1(t)};_clickListener=t=>{let i=y$1(t),o=t.type===`click`&&this._pointerDownEventTarget?this._pointerDownEventTarget:i;this._pointerDownEventTarget=null;let r=this._attachedOverlays.slice();for(let s=r.length-1;s>-1;s--){let a=r[s],h=a._outsidePointerEvents;if(!(!a.hasAttached()||!this.canReceiveEvent(a,t,h))){if($t$1(a.overlayElement,i)||$t$1(a.overlayElement,o))break;this._ngZone?this._ngZone.run(()=>h.next(t)):h.next(t)}}};static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();function $t$1(n,e){let t=typeof ShadowRoot<`u`&&ShadowRoot,i=e;for(;i;){if(i===n)return!0;i=t&&i instanceof ShadowRoot?i.host:i.parentNode}return!1}var se$2=(()=>{class n{static ɵfac=function(i){return new(i||n)};static ɵcmp=OI({type:n,selectors:[[`ng-component`]],hostAttrs:[`cdk-overlay-style-loader`,``],decls:0,vars:0,template:function(i,o){},styles:[`.cdk-overlay-container, .cdk-global-overlay-wrapper {
  pointer-events: none;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
}

.cdk-overlay-container {
  position: fixed;
}
@layer cdk-overlay {
  .cdk-overlay-container {
    z-index: 1000;
  }
}
.cdk-overlay-container:empty {
  display: none;
}

.cdk-global-overlay-wrapper {
  display: flex;
  position: absolute;
}
@layer cdk-overlay {
  .cdk-global-overlay-wrapper {
    z-index: 1000;
  }
}

.cdk-overlay-pane {
  position: absolute;
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  max-width: 100%;
  max-height: 100%;
}
@layer cdk-overlay {
  .cdk-overlay-pane {
    z-index: 1000;
  }
}

.cdk-overlay-backdrop {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  opacity: 0;
  touch-action: manipulation;
}
@layer cdk-overlay {
  .cdk-overlay-backdrop {
    z-index: 1000;
    transition: opacity 400ms cubic-bezier(0.25, 0.8, 0.25, 1);
  }
}
@media (prefers-reduced-motion) {
  .cdk-overlay-backdrop {
    transition-duration: 1ms;
  }
}

.cdk-overlay-backdrop-showing {
  opacity: 1;
}
@media (forced-colors: active) {
  .cdk-overlay-backdrop-showing {
    opacity: 0.6;
  }
}

@layer cdk-overlay {
  .cdk-overlay-dark-backdrop {
    background: rgba(0, 0, 0, 0.32);
  }
}

.cdk-overlay-transparent-backdrop {
  transition: visibility 1ms linear, opacity 1ms linear;
  visibility: hidden;
  opacity: 1;
}
.cdk-overlay-transparent-backdrop.cdk-overlay-backdrop-showing, .cdk-high-contrast-active .cdk-overlay-transparent-backdrop {
  opacity: 0;
  visibility: visible;
}

.cdk-overlay-backdrop-noop-animation {
  transition: none;
}

.cdk-overlay-connected-position-bounding-box {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 1px;
  min-height: 1px;
}
@layer cdk-overlay {
  .cdk-overlay-connected-position-bounding-box {
    z-index: 1000;
  }
}

.cdk-global-scrollblock {
  position: fixed;
  width: 100%;
  overflow-y: scroll;
}

.cdk-overlay-popover {
  background: none;
  border: none;
  padding: 0;
  outline: 0;
  overflow: visible;
  position: fixed;
  pointer-events: none;
  white-space: normal;
  color: inherit;
  text-decoration: none;
  width: 100%;
  height: 100%;
  inset: auto;
  top: 0;
  left: 0;
}
.cdk-overlay-popover::backdrop {
  display: none;
}
.cdk-overlay-popover .cdk-overlay-backdrop {
  position: fixed;
  z-index: auto;
}
`],encapsulation:2})}return n})();var ae$2=(()=>{class n{_platform=D$4(l);_containerElement;_document=D$4(Cr);_styleLoader=D$4(w$3);ngOnDestroy(){this._containerElement?.remove()}getContainerElement(){return this._loadStyles(),this._containerElement||this._createContainer(),this._containerElement}_createContainer(){let t=`cdk-overlay-container`;if(this._platform.isBrowser||W$4()){let o=this._document.querySelectorAll(`.${t}[platform="server"], .${t}[platform="test"]`);for(let r=0;r<o.length;r++)o[r].remove()}let i=this._document.createElement(`div`);i.classList.add(t),W$4()?i.setAttribute(`platform`,`test`):this._platform.isBrowser||i.setAttribute(`platform`,`server`),this._document.body.appendChild(i),this._containerElement=i}_loadStyles(){this._styleLoader.load(se$2)}static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var Rt$1=class{_renderer;_ngZone;element;_cleanupClick;_cleanupTransitionEnd;_fallbackTimeout;constructor(e,t,i,o){this._renderer=t,this._ngZone=i,this.element=e.createElement(`div`),this.element.classList.add(`cdk-overlay-backdrop`),this._cleanupClick=t.listen(this.element,`click`,o)}detach(){this._ngZone.runOutsideAngular(()=>{let e=this.element;clearTimeout(this._fallbackTimeout),this._cleanupTransitionEnd?.(),this._cleanupTransitionEnd=this._renderer.listen(e,`transitionend`,this.dispose),this._fallbackTimeout=setTimeout(this.dispose,500),e.style.pointerEvents=`none`,e.classList.remove(`cdk-overlay-backdrop-showing`)})}dispose=()=>{clearTimeout(this._fallbackTimeout),this._cleanupClick?.(),this._cleanupTransitionEnd?.(),this._cleanupClick=this._cleanupTransitionEnd=this._fallbackTimeout=void 0,this.element.remove()}};function Et$1(n){return n&&n.nodeType===1}var St$1=ti([]);var st$1=class{_portalOutlet;_host;_pane;_config;_ngZone;_keyboardDispatcher;_document;_location;_outsideClickDispatcher;_animationsDisabled;_injector;_renderer;_backdropClick=new X$2;_attachments=new X$2;_detachments=new X$2;_positionStrategy;_scrollStrategy;_locationChanges;_backdropRef=null;_detachContentMutationObserver;_detachContentAfterRenderRef;_disposed=!1;_previousHostParent;_keydownEvents=new X$2;_outsidePointerEvents=new X$2;_afterNextRenderRef;constructor(e,t,i,o,r,s,a,h,u,c=!1,d,f){this._portalOutlet=e,this._host=t,this._pane=i,this._config=o,this._ngZone=r,this._keyboardDispatcher=s,this._document=a,this._location=h,this._outsideClickDispatcher=u,this._animationsDisabled=c,this._injector=d,this._renderer=f,o.scrollStrategy&&(this._scrollStrategy=o.scrollStrategy,this._scrollStrategy.attach(this)),this._positionStrategy=o.positionStrategy}get overlayElement(){return this._pane}get backdropElement(){return this._backdropRef?.element||null}get hostElement(){return this._host}get eventPredicate(){return this._config?.eventPredicate||null}attach(e){if(this._disposed)return null;this._attachHost();let t=this._portalOutlet.attach(e);if(this._positionStrategy?.attach(this),this._updateStackingOrder(),this._updateElementSize(),this._updateElementDirection(),Xh(()=>{St$1.update(i=>i.includes(this)?i:[...i,this])}),this._scrollStrategy&&this._scrollStrategy.enable(),this._afterNextRenderRef?.destroy(),this._afterNextRenderRef=Hv(()=>{this.hasAttached()&&this.updatePosition()},{injector:this._injector}),this._togglePointerEvents(!0),this._config.hasBackdrop&&this._attachBackdrop(),this._config.panelClass&&this._toggleClasses(this._pane,this._config.panelClass,!0),this._attachments.next(),this._completeDetachContent(),this._keyboardDispatcher.add(this),this._config.disposeOnNavigation===!0||this._config.disposeOnNavigation===`pop-state`){let i=this._location.subscribe(()=>this.dispose());this._locationChanges=()=>i.unsubscribe()}else this._config.disposeOnNavigation===`url-change`&&(this._locationChanges=this._location.onUrlChange(()=>this.dispose()));return this._outsideClickDispatcher.add(this),typeof t?.onDestroy==`function`&&t.onDestroy(()=>{this.hasAttached()&&this._ngZone.runOutsideAngular(()=>Promise.resolve().then(()=>this.detach()))}),t}detach(){if(!this.hasAttached())return;this.detachBackdrop(),this._togglePointerEvents(!1),this._positionStrategy&&this._positionStrategy.detach&&this._positionStrategy.detach(),this._scrollStrategy&&this._scrollStrategy.disable();let e=this._portalOutlet.detach();return this._detachments.next(),this._completeDetachContent(),this._keyboardDispatcher.remove(this),this._detachContentWhenEmpty(),this._locationChanges?.(),this._outsideClickDispatcher.remove(this),Xh(()=>{St$1.update(t=>t.filter(i=>i!==this))}),e}dispose(){if(this._disposed)return;let e=this.hasAttached();this._positionStrategy&&this._positionStrategy.dispose(),this._disposeScrollStrategy(),this._backdropRef?.dispose(),this._locationChanges?.(),this._keyboardDispatcher.remove(this),this._portalOutlet.dispose(),this._attachments.complete(),this._backdropClick.complete(),this._keydownEvents.complete(),this._outsidePointerEvents.complete(),this._outsideClickDispatcher.remove(this),this._host?.remove(),this._afterNextRenderRef?.destroy(),this._previousHostParent=this._pane=this._host=this._backdropRef=null,e&&this._detachments.next(),this._detachments.complete(),this._completeDetachContent(),this._disposed=!0,Xh(()=>{St$1.update(t=>t.filter(i=>i!==this))})}hasAttached(){return this._portalOutlet.hasAttached()}backdropClick(){return this._backdropClick}attachments(){return this._attachments}detachments(){return this._detachments}keydownEvents(){return this._keydownEvents}outsidePointerEvents(){return this._outsidePointerEvents}getConfig(){return this._config}updatePosition(){this._positionStrategy&&this._positionStrategy.apply()}updatePositionStrategy(e){e!==this._positionStrategy&&(this._positionStrategy&&this._positionStrategy.dispose(),this._positionStrategy=e,this.hasAttached()&&(e.attach(this),this.updatePosition()))}updateSize(e){this._config=r$1(r$1({},this._config),e),this._updateElementSize()}setDirection(e){this._config=s(r$1({},this._config),{direction:e}),this._updateElementDirection()}addPanelClass(e){this._pane&&this._toggleClasses(this._pane,e,!0)}removePanelClass(e){this._pane&&this._toggleClasses(this._pane,e,!1)}getDirection(){let e=this._config.direction;return e?typeof e==`string`?e:e.value:`ltr`}updateScrollStrategy(e){e!==this._scrollStrategy&&(this._disposeScrollStrategy(),this._scrollStrategy=e,this.hasAttached()&&(e.attach(this),e.enable()))}_updateElementDirection(){this._host.setAttribute(`dir`,this.getDirection())}_updateElementSize(){if(!this._pane)return;let e=this._pane.style;e.width=V$1(this._config.width),e.height=V$1(this._config.height),e.minWidth=V$1(this._config.minWidth),e.minHeight=V$1(this._config.minHeight),e.maxWidth=V$1(this._config.maxWidth),e.maxHeight=V$1(this._config.maxHeight)}_togglePointerEvents(e){this._pane.style.pointerEvents=e?``:`none`}_attachHost(){if(!this._host.parentElement){let e=this._config.usePopover?this._positionStrategy?.getPopoverInsertionPoint?.():null;Et$1(e)?e.after(this._host):e?.type===`parent`?e.element.appendChild(this._host):this._previousHostParent?.appendChild(this._host)}if(this._config.usePopover)try{this._host.showPopover()}catch{}}_attachBackdrop(){let e=`cdk-overlay-backdrop-showing`;this._backdropRef?.dispose(),this._backdropRef=new Rt$1(this._document,this._renderer,this._ngZone,t=>{this._backdropClick.next(t)}),this._animationsDisabled&&this._backdropRef.element.classList.add(`cdk-overlay-backdrop-noop-animation`),this._config.backdropClass&&this._toggleClasses(this._backdropRef.element,this._config.backdropClass,!0),this._config.usePopover?this._host.prepend(this._backdropRef.element):this._host.parentElement.insertBefore(this._backdropRef.element,this._host),!this._animationsDisabled&&typeof requestAnimationFrame<`u`?this._ngZone.runOutsideAngular(()=>{requestAnimationFrame(()=>this._backdropRef?.element.classList.add(e))}):this._backdropRef.element.classList.add(e)}_updateStackingOrder(){!this._config.usePopover&&this._host.nextSibling&&this._host.parentNode.appendChild(this._host)}detachBackdrop(){this._animationsDisabled?(this._backdropRef?.dispose(),this._backdropRef=null):this._backdropRef?.detach()}_toggleClasses(e,t,i){let o=Y$2(t||[]).filter(r=>!!r);o.length&&(i?e.classList.add(...o):e.classList.remove(...o))}_detachContentWhenEmpty(){let e=!1;try{this._detachContentAfterRenderRef=Hv(()=>{e=!0,this._detachContent()},{injector:this._injector})}catch(t){if(e)throw t;this._detachContent()}globalThis.MutationObserver&&this._pane&&(this._detachContentMutationObserver||=new globalThis.MutationObserver(()=>{this._detachContent()}),this._detachContentMutationObserver.observe(this._pane,{childList:!0}))}_detachContent(){(!this._pane||!this._host||this._pane.children.length===0)&&(this._pane&&this._config.panelClass&&this._toggleClasses(this._pane,this._config.panelClass,!1),this._host&&this._host.parentElement&&(this._previousHostParent=this._host.parentElement,this._host.remove()),this._completeDetachContent())}_completeDetachContent(){this._detachContentAfterRenderRef?.destroy(),this._detachContentAfterRenderRef=void 0,this._detachContentMutationObserver?.disconnect()}_disposeScrollStrategy(){let e=this._scrollStrategy;e?.disable(),e?.detach?.()}};var Kt$1=`cdk-overlay-connected-position-bounding-box`;var ge=/([A-Za-z%]+)$/;function Dt$1(n,e){return new at$1(e,n.get(B$2),n.get(Cr),n.get(l),n.get(ae$2))}var at$1=class{_viewportRuler;_document;_platform;_overlayContainer;_overlayRef;_isInitialRender=!1;_lastBoundingBoxSize={width:0,height:0};_isPushed=!1;_canPush=!0;_growAfterOpen=!1;_hasFlexibleDimensions=!0;_positionLocked=!1;_originRect;_overlayRect;_viewportRect;_containerRect;_viewportMargin=0;_scrollables=[];_preferredPositions=[];_origin;_pane;_isDisposed=!1;_boundingBox=null;_lastPosition=null;_lastScrollVisibility=null;_positionChanges=new X$2;_resizeSubscription=G$3.EMPTY;_offsetX=0;_offsetY=0;_transformOriginSelector;_appliedPanelClasses=[];_previousPushAmount=null;_popoverLocation=`global`;positionChanges=this._positionChanges;get positions(){return this._preferredPositions}constructor(e,t,i,o,r){this._viewportRuler=t,this._document=i,this._platform=o,this._overlayContainer=r,this.setOrigin(e)}attach(e){this._overlayRef&&this._overlayRef,this._validatePositions(),e.hostElement.classList.add(Kt$1),this._overlayRef=e,this._boundingBox=e.hostElement,this._pane=e.overlayElement,this._isDisposed=!1,this._isInitialRender=!0,this._lastPosition=null,this._resizeSubscription.unsubscribe(),this._resizeSubscription=this._viewportRuler.change().subscribe(()=>{this._isInitialRender=!0,this.apply()})}apply(){if(this._isDisposed||!this._platform.isBrowser)return;if(!this._isInitialRender&&this._positionLocked&&this._lastPosition){this.reapplyLastPosition();return}this._clearPanelClasses(),this._resetOverlayElementStyles(),this._resetBoundingBoxStyles(),this._viewportRect=this._getNarrowedViewportRect(),this._originRect=this._getOriginRect(),this._overlayRect=this._pane.getBoundingClientRect(),this._containerRect=this._getContainerRect();let e=this._originRect,t=this._overlayRect,i=this._viewportRect,o=this._containerRect,r=[],s;for(let a of this._preferredPositions){let h=this._getOriginPoint(e,o,a),u=this._getOverlayPoint(h,t,a),c=this._getOverlayFit(u,t,i,a);if(c.isCompletelyWithinViewport){this._isPushed=!1,this._applyPosition(a,h);return}if(this._canFitWithFlexibleDimensions(c,u,i)){r.push({position:a,origin:h,overlayRect:t,boundingBoxRect:this._calculateBoundingBoxRect(h,a)});continue}(!s||s.overlayFit.visibleArea<c.visibleArea)&&(s={overlayFit:c,overlayPoint:u,originPoint:h,position:a,overlayRect:t})}if(r.length){let a=null,h=-1;for(let u of r){let c=u.boundingBoxRect.width*u.boundingBoxRect.height*(u.position.weight||1);c>h&&(h=c,a=u)}this._isPushed=!1,this._applyPosition(a.position,a.origin);return}if(this._canPush){this._isPushed=!0,this._applyPosition(s.position,s.originPoint);return}this._applyPosition(s.position,s.originPoint)}detach(){this._clearPanelClasses(),this._lastPosition=null,this._previousPushAmount=null,this._resizeSubscription.unsubscribe()}dispose(){this._isDisposed||(this._boundingBox&&V(this._boundingBox.style,{top:``,left:``,right:``,bottom:``,height:``,width:``,alignItems:``,justifyContent:``}),this._pane&&this._resetOverlayElementStyles(),this._overlayRef&&this._overlayRef.hostElement.classList.remove(Kt$1),this.detach(),this._positionChanges.complete(),this._overlayRef=this._boundingBox=null,this._isDisposed=!0)}reapplyLastPosition(){if(this._isDisposed||!this._platform.isBrowser)return;let e=this._lastPosition;e?(this._originRect=this._getOriginRect(),this._overlayRect=this._pane.getBoundingClientRect(),this._viewportRect=this._getNarrowedViewportRect(),this._containerRect=this._getContainerRect(),this._applyPosition(e,this._getOriginPoint(this._originRect,this._containerRect,e))):this.apply()}withScrollableContainers(e){return this._scrollables=e,this}withPositions(e){return this._preferredPositions=e,e.indexOf(this._lastPosition)===-1&&(this._lastPosition=null),this._validatePositions(),this}withViewportMargin(e){return this._viewportMargin=e,this}withFlexibleDimensions(e=!0){return this._hasFlexibleDimensions=e,this}withGrowAfterOpen(e=!0){return this._growAfterOpen=e,this}withPush(e=!0){return this._canPush=e,this}withLockedPosition(e=!0){return this._positionLocked=e,this}setOrigin(e){return this._origin=e,this}withDefaultOffsetX(e){return this._offsetX=e,this}withDefaultOffsetY(e){return this._offsetY=e,this}withTransformOriginOn(e){return this._transformOriginSelector=e,this}withPopoverLocation(e){return this._popoverLocation=e,this}getPopoverInsertionPoint(){return this._popoverLocation===`global`?null:this._popoverLocation!==`inline`?this._popoverLocation:this._origin instanceof Hr?this._origin.nativeElement:Et$1(this._origin)?this._origin:null}_getOriginPoint(e,t,i){let o;if(i.originX==`center`)o=e.left+e.width/2;else{let s=this._isRtl()?e.right:e.left,a=this._isRtl()?e.left:e.right;o=i.originX==`start`?s:a}t.left<0&&(o-=t.left);let r;return i.originY==`center`?r=e.top+e.height/2:r=i.originY==`top`?e.top:e.bottom,t.top<0&&(r-=t.top),{x:o,y:r}}_getOverlayPoint(e,t,i){let o;i.overlayX==`center`?o=-t.width/2:i.overlayX===`start`?o=this._isRtl()?-t.width:0:o=this._isRtl()?0:-t.width;let r;return i.overlayY==`center`?r=-t.height/2:r=i.overlayY==`top`?0:-t.height,{x:e.x+o,y:e.y+r}}_getOverlayFit(e,t,i,o){let r=Qt$1(t),{x:s,y:a}=e,h=this._getOffset(o,`x`),u=this._getOffset(o,`y`);h&&(s+=h),u&&(a+=u);let c=0-s,d=s+r.width-i.width,f=0-a,_=a+r.height-i.height,g=this._subtractOverflows(r.width,c,d),w=this._subtractOverflows(r.height,f,_),At=g*w;return{visibleArea:At,isCompletelyWithinViewport:r.width*r.height===At,fitsInViewportVertically:w===r.height,fitsInViewportHorizontally:g==r.width}}_canFitWithFlexibleDimensions(e,t,i){if(this._hasFlexibleDimensions){let o=i.bottom-t.y,r=i.right-t.x,s=qt$1(this._overlayRef.getConfig().minHeight),a=qt$1(this._overlayRef.getConfig().minWidth),h=e.fitsInViewportVertically||s!=null&&s<=o,u=e.fitsInViewportHorizontally||a!=null&&a<=r;return h&&u}return!1}_pushOverlayOnScreen(e,t,i){if(this._previousPushAmount&&this._positionLocked)return{x:e.x+this._previousPushAmount.x,y:e.y+this._previousPushAmount.y};let o=Qt$1(t),r=this._viewportRect,s=Math.max(e.x+o.width-r.width,0),a=Math.max(e.y+o.height-r.height,0),h=Math.max(r.top-i.top-e.y,0),u=Math.max(r.left-i.left-e.x,0),c=0,d=0;return o.width<=r.width?c=u||-s:c=e.x<this._getViewportMarginStart()?r.left-i.left-e.x:0,o.height<=r.height?d=h||-a:d=e.y<this._getViewportMarginTop()?r.top-i.top-e.y:0,this._previousPushAmount={x:c,y:d},{x:e.x+c,y:e.y+d}}_applyPosition(e,t){if(this._setTransformOrigin(e),this._setOverlayElementStyles(t,e),this._setBoundingBoxStyles(t,e),e.panelClass&&this._addPanelClasses(e.panelClass),this._positionChanges.observers.length){let i=this._getScrollVisibility();if(e!==this._lastPosition||!this._lastScrollVisibility||!_e$1(this._lastScrollVisibility,i)){let o=new rt$1(e,i);this._positionChanges.next(o)}this._lastScrollVisibility=i}this._lastPosition=e,this._isInitialRender=!1}_setTransformOrigin(e){if(!this._transformOriginSelector)return;let t=this._boundingBox.querySelectorAll(this._transformOriginSelector),i,o=e.overlayY;e.overlayX===`center`?i=`center`:this._isRtl()?i=e.overlayX===`start`?`right`:`left`:i=e.overlayX===`start`?`left`:`right`;for(let r=0;r<t.length;r++)t[r].style.transformOrigin=`${i} ${o}`}_calculateBoundingBoxRect(e,t){let i=this._viewportRect,o=this._isRtl(),r,s,a;if(t.overlayY===`top`)s=e.y,r=i.height-s+this._getViewportMarginBottom();else if(t.overlayY===`bottom`)a=i.height-e.y+this._getViewportMarginTop()+this._getViewportMarginBottom(),r=i.height-a+this._getViewportMarginTop();else{let _=Math.min(i.bottom-e.y+i.top,e.y),g=this._lastBoundingBoxSize.height;r=_*2,s=e.y-_,r>g&&!this._isInitialRender&&!this._growAfterOpen&&(s=e.y-g/2)}let h=t.overlayX===`start`&&!o||t.overlayX===`end`&&o,u=t.overlayX===`end`&&!o||t.overlayX===`start`&&o,c,d,f;if(u)f=i.width-e.x+this._getViewportMarginStart()+this._getViewportMarginEnd(),c=e.x-this._getViewportMarginStart();else if(h)d=e.x,c=i.right-e.x-this._getViewportMarginEnd();else{let _=Math.min(i.right-e.x+i.left,e.x),g=this._lastBoundingBoxSize.width;c=_*2,d=e.x-_,c>g&&!this._isInitialRender&&!this._growAfterOpen&&(d=e.x-g/2)}return{top:s,left:d,bottom:a,right:f,width:c,height:r}}_setBoundingBoxStyles(e,t){let i=this._calculateBoundingBoxRect(e,t);!this._isInitialRender&&!this._growAfterOpen&&(i.height=Math.min(i.height,this._lastBoundingBoxSize.height),i.width=Math.min(i.width,this._lastBoundingBoxSize.width));let o={};if(this._hasExactPosition())o.top=o.left=`0`,o.bottom=o.right=`auto`,o.maxHeight=o.maxWidth=``,o.width=o.height=`100%`;else{let r=this._overlayRef.getConfig().maxHeight,s=this._overlayRef.getConfig().maxWidth;o.width=V$1(i.width),o.height=V$1(i.height),o.top=V$1(i.top)||`auto`,o.bottom=V$1(i.bottom)||`auto`,o.left=V$1(i.left)||`auto`,o.right=V$1(i.right)||`auto`,t.overlayX===`center`?o.alignItems=`center`:o.alignItems=t.overlayX===`end`?`flex-end`:`flex-start`,t.overlayY===`center`?o.justifyContent=`center`:o.justifyContent=t.overlayY===`bottom`?`flex-end`:`flex-start`,r&&(o.maxHeight=V$1(r)),s&&(o.maxWidth=V$1(s))}this._lastBoundingBoxSize=i,V(this._boundingBox.style,o)}_resetBoundingBoxStyles(){V(this._boundingBox.style,{top:`0`,left:`0`,right:`0`,bottom:`0`,height:``,width:``,alignItems:``,justifyContent:``})}_resetOverlayElementStyles(){V(this._pane.style,{top:``,left:``,bottom:``,right:``,position:``,transform:``})}_setOverlayElementStyles(e,t){let i={},o=this._hasExactPosition(),r=this._hasFlexibleDimensions,s=this._overlayRef.getConfig();if(o){let c=this._viewportRuler.getViewportScrollPosition();V(i,this._getExactOverlayY(t,e,c)),V(i,this._getExactOverlayX(t,e,c))}else i.position=`static`;let a=``,h=this._getOffset(t,`x`),u=this._getOffset(t,`y`);h&&(a+=`translateX(${h}px) `),u&&(a+=`translateY(${u}px)`),i.transform=a.trim(),s.maxHeight&&(o?i.maxHeight=V$1(s.maxHeight):r&&(i.maxHeight=``)),s.maxWidth&&(o?i.maxWidth=V$1(s.maxWidth):r&&(i.maxWidth=``)),V(this._pane.style,i)}_getExactOverlayY(e,t,i){let o={top:``,bottom:``},r=this._getOverlayPoint(t,this._overlayRect,e);if(this._isPushed&&(r=this._pushOverlayOnScreen(r,this._overlayRect,i)),e.overlayY===`bottom`)o.bottom=`${this._document.documentElement.clientHeight-(r.y+this._overlayRect.height)}px`;else o.top=V$1(r.y);return o}_getExactOverlayX(e,t,i){let o={left:``,right:``},r=this._getOverlayPoint(t,this._overlayRect,e);this._isPushed&&(r=this._pushOverlayOnScreen(r,this._overlayRect,i));let s;if(this._isRtl()?s=e.overlayX===`end`?`left`:`right`:s=e.overlayX===`end`?`right`:`left`,s===`right`)o.right=`${this._document.documentElement.clientWidth-(r.x+this._overlayRect.width)}px`;else o.left=V$1(r.x);return o}_getScrollVisibility(){let e=this._getOriginRect(),t=this._pane.getBoundingClientRect(),i=this._scrollables.map(o=>o.getElementRef().nativeElement.getBoundingClientRect());return{isOriginClipped:Gt$1(e,i),isOriginOutsideView:Ot$1(e,i),isOverlayClipped:Gt$1(t,i),isOverlayOutsideView:Ot$1(t,i)}}_subtractOverflows(e,...t){return t.reduce((i,o)=>i-Math.max(o,0),e)}_getNarrowedViewportRect(){let e=this._document.documentElement.clientWidth,t=this._document.documentElement.clientHeight,i=this._viewportRuler.getViewportScrollPosition();return{top:i.top+this._getViewportMarginTop(),left:i.left+this._getViewportMarginStart(),right:i.left+e-this._getViewportMarginEnd(),bottom:i.top+t-this._getViewportMarginBottom(),width:e-this._getViewportMarginStart()-this._getViewportMarginEnd(),height:t-this._getViewportMarginTop()-this._getViewportMarginBottom()}}_isRtl(){return this._overlayRef.getDirection()===`rtl`}_hasExactPosition(){return!this._hasFlexibleDimensions||this._isPushed}_getOffset(e,t){return t===`x`?e.offsetX==null?this._offsetX:e.offsetX:e.offsetY==null?this._offsetY:e.offsetY}_validatePositions(){}_addPanelClasses(e){this._pane&&Y$2(e).forEach(t=>{t!==``&&this._appliedPanelClasses.indexOf(t)===-1&&(this._appliedPanelClasses.push(t),this._pane.classList.add(t))})}_clearPanelClasses(){this._pane&&(this._appliedPanelClasses.forEach(e=>{this._pane.classList.remove(e)}),this._appliedPanelClasses=[])}_getViewportMarginStart(){return typeof this._viewportMargin==`number`?this._viewportMargin:this._viewportMargin?.start??0}_getViewportMarginEnd(){return typeof this._viewportMargin==`number`?this._viewportMargin:this._viewportMargin?.end??0}_getViewportMarginTop(){return typeof this._viewportMargin==`number`?this._viewportMargin:this._viewportMargin?.top??0}_getViewportMarginBottom(){return typeof this._viewportMargin==`number`?this._viewportMargin:this._viewportMargin?.bottom??0}_getOriginRect(){let e=this._origin;if(e instanceof Hr)return e.nativeElement.getBoundingClientRect();if(e instanceof Element)return e.getBoundingClientRect();let t=e.width||0,i=e.height||0;return{top:e.y,bottom:e.y+i,left:e.x,right:e.x+t,height:i,width:t}}_getContainerRect(){let e=this._overlayRef.getConfig().usePopover&&this._popoverLocation!==`global`,t=this._overlayContainer.getContainerElement();e&&(t.style.display=`block`);let i=t.getBoundingClientRect();return e&&(t.style.display=``),i}};function V(n,e){for(let t in e)Object.hasOwn(e,t)&&(n[t]=e[t]);return n}function qt$1(n){if(typeof n!=`number`&&n!=null){let[e,t]=n.split(ge);return!t||t===`px`?parseFloat(e):null}return n||null}function Qt$1(n){return{top:Math.floor(n.top),right:Math.floor(n.right),bottom:Math.floor(n.bottom),left:Math.floor(n.left),width:Math.floor(n.width),height:Math.floor(n.height)}}function _e$1(n,e){return n===e?!0:n.isOriginClipped===e.isOriginClipped&&n.isOriginOutsideView===e.isOriginOutsideView&&n.isOverlayClipped===e.isOverlayClipped&&n.isOverlayOutsideView===e.isOverlayOutsideView}var Jt$1=`cdk-global-overlay-wrapper`;function le$2(n){return new lt$2}var lt$2=class{_overlayRef;_cssPosition=`static`;_topOffset=``;_bottomOffset=``;_alignItems=``;_xPosition=``;_xOffset=``;_width=``;_height=``;_isDisposed=!1;attach(e){let t=e.getConfig();this._overlayRef=e,this._width&&!t.width&&e.updateSize({width:this._width}),this._height&&!t.height&&e.updateSize({height:this._height}),e.hostElement.classList.add(Jt$1),this._isDisposed=!1}top(e=``){return this._bottomOffset=``,this._topOffset=e,this._alignItems=`flex-start`,this}left(e=``){return this._xOffset=e,this._xPosition=`left`,this}bottom(e=``){return this._topOffset=``,this._bottomOffset=e,this._alignItems=`flex-end`,this}right(e=``){return this._xOffset=e,this._xPosition=`right`,this}start(e=``){return this._xOffset=e,this._xPosition=`start`,this}end(e=``){return this._xOffset=e,this._xPosition=`end`,this}width(e=``){return this._overlayRef?this._overlayRef.updateSize({width:e}):this._width=e,this}height(e=``){return this._overlayRef?this._overlayRef.updateSize({height:e}):this._height=e,this}centerHorizontally(e=``){return this.left(e),this._xPosition=`center`,this}centerVertically(e=``){return this.top(e),this._alignItems=`center`,this}apply(){if(!this._overlayRef||!this._overlayRef.hasAttached())return;let e=this._overlayRef.overlayElement.style,t=this._overlayRef.hostElement.style,{width:o,height:r,maxWidth:s,maxHeight:a}=this._overlayRef.getConfig(),h=(o===`100%`||o===`100vw`)&&(!s||s===`100%`||s===`100vw`),u=(r===`100%`||r===`100vh`)&&(!a||a===`100%`||a===`100vh`),c=this._xPosition,d=this._xOffset,f=this._overlayRef.getConfig().direction===`rtl`,_=``,g=``,w=``;h?w=`flex-start`:c===`center`?(w=`center`,f?g=d:_=d):f?c===`left`||c===`end`?(w=`flex-end`,_=d):(c===`right`||c===`start`)&&(w=`flex-start`,g=d):c===`left`||c===`start`?(w=`flex-start`,_=d):(c===`right`||c===`end`)&&(w=`flex-end`,g=d),e.position=this._cssPosition,e.marginLeft=h?`0`:_,e.marginTop=u?`0`:this._topOffset,e.marginBottom=this._bottomOffset,e.marginRight=h?`0`:g,t.justifyContent=w,t.alignItems=u?`flex-start`:this._alignItems}dispose(){if(this._isDisposed||!this._overlayRef)return;let e=this._overlayRef.overlayElement.style,t=this._overlayRef.hostElement,i=t.style;t.classList.remove(Jt$1),i.justifyContent=i.alignItems=e.marginTop=e.marginBottom=e.marginLeft=e.marginRight=e.position=``,this._overlayRef=null,this._isDisposed=!0}};var ce$1=(()=>{class n{_injector=D$4(fe$1);global(){return le$2()}flexibleConnectedTo(t){return Dt$1(this._injector,t)}static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var Mt$1=new x$4(`OVERLAY_DEFAULT_CONFIG`);function Vt$1(n,e){n.get(w$3).load(se$2);let t=n.get(ae$2),i=n.get(Cr),o=n.get(ne$2),r=n.get(qr),s=n.get(A$3),a=n.get(Ka,null,{optional:!0})||n.get(Lr).createRenderer(null,null),h=new j$1(e),u=n.get(Mt$1,null,{optional:!0})?.usePopover??!0;h.direction=h.direction||s.value,!i.body||!(`showPopover`in i.body)?h.usePopover=!1:h.usePopover=e?.usePopover??u;let c=i.createElement(`div`),d=i.createElement(`div`);c.id=o.getId(`cdk-overlay-`),c.classList.add(`cdk-overlay-pane`),d.appendChild(c),h.usePopover&&(d.setAttribute(`popover`,`manual`),d.classList.add(`cdk-overlay-popover`));let f=h.usePopover?h.positionStrategy?.getPopoverInsertionPoint?.():null;return Et$1(f)?f.after(d):f?.type===`parent`?f.element.appendChild(d):t.getContainerElement().appendChild(d),new st$1(new et$3(c,r,n),d,c,h,n.get(be$1),n.get(oe$2),i,n.get(Ne$1),n.get(re$1),e?.disableAnimations??n.get($m,null,{optional:!0})===`NoopAnimations`,n.get(me$1),a)}var he=(()=>{class n{scrollStrategies=D$4(ie$1);_positionBuilder=D$4(ce$1);_injector=D$4(fe$1);create(t){return Vt$1(this._injector,t)}position(){return this._positionBuilder}static ɵfac=function(i){return new(i||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var ve$1=[{originX:`start`,originY:`bottom`,overlayX:`start`,overlayY:`top`},{originX:`start`,originY:`top`,overlayX:`start`,overlayY:`bottom`},{originX:`end`,originY:`top`,overlayX:`end`,overlayY:`bottom`},{originX:`end`,originY:`bottom`,overlayX:`end`,overlayY:`top`}];var ye$1=new x$4(`cdk-connected-overlay-scroll-strategy`,{providedIn:`root`,factory:()=>{let n=D$4(fe$1);return()=>Pt$1(n)}});var xt$2=(()=>{class n{elementRef=D$4(Hr);static ɵfac=function(i){return new(i||n)};static ɵdir=jI({type:n,selectors:[[``,`cdk-overlay-origin`,``],[``,`overlay-origin`,``],[``,`cdkOverlayOrigin`,``]],exportAs:[`cdkOverlayOrigin`]})}return n})();var de$2=new x$4(`cdk-connected-overlay-default-config`);var me=(()=>{class n{_dir=D$4(A$3,{optional:!0});_injector=D$4(fe$1);_overlayRef;_templatePortal;_backdropSubscription=G$3.EMPTY;_attachSubscription=G$3.EMPTY;_detachSubscription=G$3.EMPTY;_positionSubscription=G$3.EMPTY;_offsetX;_offsetY;_position;_scrollStrategyFactory=D$4(ye$1);_ngZone=D$4(be$1);origin;positions;positionStrategy;get offsetX(){return this._offsetX}set offsetX(t){this._offsetX=t,this._position&&this._updatePositionStrategy(this._position)}get offsetY(){return this._offsetY}set offsetY(t){this._offsetY=t,this._position&&this._updatePositionStrategy(this._position)}width;height;minWidth;minHeight;backdropClass;panelClass;viewportMargin=0;scrollStrategy;open=!1;disableClose=!1;transformOriginSelector;hasBackdrop=!1;lockPosition=!1;flexibleDimensions=!1;growAfterOpen=!1;push=!1;disposeOnNavigation=!1;usePopover;matchWidth=!1;set _config(t){typeof t!=`string`&&this._assignConfig(t)}backdropClick=new $e$3;positionChange=new $e$3;attach=new $e$3;detach=new $e$3;overlayKeydown=new $e$3;overlayOutsideClick=new $e$3;constructor(){let t=D$4(kr),i=D$4(zi),o=D$4(de$2,{optional:!0}),r=D$4(Mt$1,{optional:!0});this.usePopover=r?.usePopover===!1?null:`global`,this._templatePortal=new H$2(t,i),this.scrollStrategy=this._scrollStrategyFactory(),o&&this._assignConfig(o)}get overlayRef(){return this._overlayRef}get dir(){return this._dir?this._dir.value:`ltr`}ngOnDestroy(){this._attachSubscription.unsubscribe(),this._detachSubscription.unsubscribe(),this._backdropSubscription.unsubscribe(),this._positionSubscription.unsubscribe(),this._overlayRef?.dispose()}ngOnChanges(t){this._position&&(this._updatePositionStrategy(this._position),this._overlayRef?.updateSize({width:this._getWidth(),minWidth:this.minWidth,height:this.height,minHeight:this.minHeight}),t.origin&&this.open&&this._position.apply()),t.open&&(this.open?this.attachOverlay():this.detachOverlay())}_createOverlay(){(!this.positions||!this.positions.length)&&(this.positions=ve$1);let t=this._overlayRef=Vt$1(this._injector,this._buildConfig());this._attachSubscription=t.attachments().subscribe(()=>this.attach.emit()),this._detachSubscription=t.detachments().subscribe(()=>this.detach.emit()),t.keydownEvents().subscribe(i=>{this.overlayKeydown.next(i),i.keyCode===27&&!this.disableClose&&!qe$2(i)&&(i.preventDefault(),this.detachOverlay())}),this._overlayRef.outsidePointerEvents().subscribe(i=>{let o=this._getOriginElement(),r=y$1(i);(!o||o!==r&&!o.contains(r))&&this.overlayOutsideClick.next(i)})}_buildConfig(){let t=this._position=this.positionStrategy||this._createPositionStrategy(),i=new j$1({direction:this._dir||`ltr`,positionStrategy:t,scrollStrategy:this.scrollStrategy,hasBackdrop:this.hasBackdrop,disposeOnNavigation:this.disposeOnNavigation,usePopover:!!this.usePopover});return(this.height||this.height===0)&&(i.height=this.height),(this.minWidth||this.minWidth===0)&&(i.minWidth=this.minWidth),(this.minHeight||this.minHeight===0)&&(i.minHeight=this.minHeight),this.backdropClass&&(i.backdropClass=this.backdropClass),this.panelClass&&(i.panelClass=this.panelClass),i}_updatePositionStrategy(t){let i=this.positions.map(o=>({originX:o.originX,originY:o.originY,overlayX:o.overlayX,overlayY:o.overlayY,offsetX:o.offsetX||this.offsetX,offsetY:o.offsetY||this.offsetY,panelClass:o.panelClass||void 0}));return t.setOrigin(this._getOrigin()).withPositions(i).withFlexibleDimensions(this.flexibleDimensions).withPush(this.push).withGrowAfterOpen(this.growAfterOpen).withViewportMargin(this.viewportMargin).withLockedPosition(this.lockPosition).withTransformOriginOn(this.transformOriginSelector).withPopoverLocation(this.usePopover===null?`global`:this.usePopover)}_createPositionStrategy(){let t=Dt$1(this._injector,this._getOrigin());return this._updatePositionStrategy(t),t}_getOrigin(){return this.origin instanceof xt$2?this.origin.elementRef:this.origin}_getOriginElement(){return this.origin instanceof xt$2?this.origin.elementRef.nativeElement:this.origin instanceof Hr?this.origin.nativeElement:typeof Element<`u`&&this.origin instanceof Element?this.origin:null}_getWidth(){return this.width?this.width:this.matchWidth?this._getOriginElement()?.getBoundingClientRect?.().width:void 0}attachOverlay(){this._overlayRef||this._createOverlay();let t=this._overlayRef;t.getConfig().hasBackdrop=this.hasBackdrop,t.updateSize({width:this._getWidth()}),t.hasAttached()||t.attach(this._templatePortal),this.hasBackdrop?this._backdropSubscription=t.backdropClick().subscribe(i=>this.backdropClick.emit(i)):this._backdropSubscription.unsubscribe(),this._positionSubscription.unsubscribe(),this.positionChange.observers.length>0&&(this._positionSubscription=this._position.positionChanges.pipe(Kg(()=>this.positionChange.observers.length>0)).subscribe(i=>{this._ngZone.run(()=>this.positionChange.emit(i)),this.positionChange.observers.length===0&&this._positionSubscription.unsubscribe()})),this.open=!0}detachOverlay(){this._overlayRef?.detach(),this._backdropSubscription.unsubscribe(),this._positionSubscription.unsubscribe(),this.open=!1}_assignConfig(t){this.origin=t.origin??this.origin,this.positions=t.positions??this.positions,this.positionStrategy=t.positionStrategy??this.positionStrategy,this.offsetX=t.offsetX??this.offsetX,this.offsetY=t.offsetY??this.offsetY,this.width=t.width??this.width,this.height=t.height??this.height,this.minWidth=t.minWidth??this.minWidth,this.minHeight=t.minHeight??this.minHeight,this.backdropClass=t.backdropClass??this.backdropClass,this.panelClass=t.panelClass??this.panelClass,this.viewportMargin=t.viewportMargin??this.viewportMargin,this.scrollStrategy=t.scrollStrategy??this.scrollStrategy,this.disableClose=t.disableClose??this.disableClose,this.transformOriginSelector=t.transformOriginSelector??this.transformOriginSelector,this.hasBackdrop=t.hasBackdrop??this.hasBackdrop,this.lockPosition=t.lockPosition??this.lockPosition,this.flexibleDimensions=t.flexibleDimensions??this.flexibleDimensions,this.growAfterOpen=t.growAfterOpen??this.growAfterOpen,this.push=t.push??this.push,this.disposeOnNavigation=t.disposeOnNavigation??this.disposeOnNavigation,this.usePopover=t.usePopover??this.usePopover,this.matchWidth=t.matchWidth??this.matchWidth}static ɵfac=function(i){return new(i||n)};static ɵdir=jI({type:n,selectors:[[``,`cdk-connected-overlay`,``],[``,`connected-overlay`,``],[``,`cdkConnectedOverlay`,``]],inputs:{origin:[0,`cdkConnectedOverlayOrigin`,`origin`],positions:[0,`cdkConnectedOverlayPositions`,`positions`],positionStrategy:[0,`cdkConnectedOverlayPositionStrategy`,`positionStrategy`],offsetX:[0,`cdkConnectedOverlayOffsetX`,`offsetX`],offsetY:[0,`cdkConnectedOverlayOffsetY`,`offsetY`],width:[0,`cdkConnectedOverlayWidth`,`width`],height:[0,`cdkConnectedOverlayHeight`,`height`],minWidth:[0,`cdkConnectedOverlayMinWidth`,`minWidth`],minHeight:[0,`cdkConnectedOverlayMinHeight`,`minHeight`],backdropClass:[0,`cdkConnectedOverlayBackdropClass`,`backdropClass`],panelClass:[0,`cdkConnectedOverlayPanelClass`,`panelClass`],viewportMargin:[0,`cdkConnectedOverlayViewportMargin`,`viewportMargin`],scrollStrategy:[0,`cdkConnectedOverlayScrollStrategy`,`scrollStrategy`],open:[0,`cdkConnectedOverlayOpen`,`open`],disableClose:[0,`cdkConnectedOverlayDisableClose`,`disableClose`],transformOriginSelector:[0,`cdkConnectedOverlayTransformOriginOn`,`transformOriginSelector`],hasBackdrop:[2,`cdkConnectedOverlayHasBackdrop`,`hasBackdrop`,HF],lockPosition:[2,`cdkConnectedOverlayLockPosition`,`lockPosition`,HF],flexibleDimensions:[2,`cdkConnectedOverlayFlexibleDimensions`,`flexibleDimensions`,HF],growAfterOpen:[2,`cdkConnectedOverlayGrowAfterOpen`,`growAfterOpen`,HF],push:[2,`cdkConnectedOverlayPush`,`push`,HF],disposeOnNavigation:[2,`cdkConnectedOverlayDisposeOnNavigation`,`disposeOnNavigation`,t=>t===`url-change`||t===`pop-state`?t:HF(t)],usePopover:[0,`cdkConnectedOverlayUsePopover`,`usePopover`],matchWidth:[2,`cdkConnectedOverlayMatchWidth`,`matchWidth`,HF],_config:[0,`cdkConnectedOverlay`,`_config`]},outputs:{backdropClick:`backdropClick`,positionChange:`positionChange`,attach:`attach`,detach:`detach`,overlayKeydown:`overlayKeydown`,overlayOutsideClick:`overlayOutsideClick`},exportAs:[`cdkConnectedOverlay`],features:[oy]})}return n})();var we=(()=>{class n{static ɵfac=function(i){return new(i||n)};static ɵmod=LI({type:n});static ɵinj=au({providers:[he],imports:[j$2,Zt$1,bt$3,bt$3]})}return n})();var i={XSmall:`(max-width: 599.98px)`,Small:`(min-width: 600px) and (max-width: 959.98px)`,Medium:`(min-width: 960px) and (max-width: 1279.98px)`,Large:`(min-width: 1280px) and (max-width: 1919.98px)`,XLarge:`(min-width: 1920px)`,Handset:`(max-width: 599.98px) and (orientation: portrait), (max-width: 959.98px) and (orientation: landscape)`,Tablet:`(min-width: 600px) and (max-width: 839.98px) and (orientation: portrait), (min-width: 960px) and (max-width: 1279.98px) and (orientation: landscape)`,Web:`(min-width: 840px) and (orientation: portrait), (min-width: 1280px) and (orientation: landscape)`,HandsetPortrait:`(max-width: 599.98px) and (orientation: portrait)`,TabletPortrait:`(min-width: 600px) and (max-width: 839.98px) and (orientation: portrait)`,WebPortrait:`(min-width: 840px) and (orientation: portrait)`,HandsetLandscape:`(max-width: 959.98px) and (orientation: landscape)`,TabletLandscape:`(min-width: 960px) and (max-width: 1279.98px) and (orientation: landscape)`,WebLandscape:`(min-width: 1280px) and (orientation: landscape)`};var pt$1=Math.pow(2,31)-1;var h$2=class{_overlayRef;instance;containerInstance;_afterDismissed=new X$2;_afterOpened=new X$2;_onAction=new X$2;_durationTimeoutId;_dismissedByAction=!1;constructor(f,t){this._overlayRef=t,this.containerInstance=f,f._onExit.subscribe(()=>this._finishDismiss())}dismiss(){this._afterDismissed.closed||this.containerInstance.exit(),clearTimeout(this._durationTimeoutId)}dismissWithAction(){this._onAction.closed||(this._dismissedByAction=!0,this._onAction.next(),this._onAction.complete(),this.dismiss()),clearTimeout(this._durationTimeoutId)}closeWithAction(){this.dismissWithAction()}_dismissAfter(f){this._durationTimeoutId=setTimeout(()=>this.dismiss(),Math.min(f,pt$1))}_open(){this._afterOpened.closed||(this._afterOpened.next(),this._afterOpened.complete())}_finishDismiss(){this._overlayRef.dispose(),this._onAction.closed||this._onAction.complete(),this._afterDismissed.next({dismissedByAction:this._dismissedByAction}),this._afterDismissed.complete(),this._dismissedByAction=!1}afterDismissed(){return this._afterDismissed}afterOpened(){return this.containerInstance._onEnter}onAction(){return this._onAction}};var lt$1=new x$4(`MatSnackBarData`);var d=class{politeness=`polite`;announcementMessage=``;viewContainerRef;duration=0;panelClass;direction;data=null;horizontalPosition=`center`;verticalPosition=`bottom`};var ut$1=(()=>{class i{static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[``,`matSnackBarLabel`,``]],hostAttrs:[1,`mat-mdc-snack-bar-label`,`mdc-snackbar__label`]})}return i})();var bt$2=(()=>{class i{static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[``,`matSnackBarActions`,``]],hostAttrs:[1,`mat-mdc-snack-bar-actions`,`mdc-snackbar__actions`]})}return i})();var ht$1=(()=>{class i{static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[``,`matSnackBarAction`,``]],hostAttrs:[1,`mat-mdc-snack-bar-action`,`mdc-snackbar__action`]})}return i})();var ft$1=(()=>{class i{snackBarRef=D$4(h$2);data=D$4(lt$1);action(){this.snackBarRef.dismissWithAction()}get hasAction(){return!!this.data.action}static ɵfac=function(n){return new(n||i)};static ɵcmp=(function(){function t(n,e){if(n&1){let a=WD();Oi(0,`div`,1)(1,`button`,2),mh(`click`,function(){Au(a);let s=JD();return Ru(s.action())}),Mw(2),rl()()}if(n&2){let a=JD();sE(2),cl(` `,a.data.action,` `)}}return OI({type:i,selectors:[[`simple-snack-bar`]],hostAttrs:[1,`mat-mdc-simple-snack-bar`],exportAs:[`matSnackBar`],decls:3,vars:2,consts:[[`matSnackBarLabel`,``],[`matSnackBarActions`,``],[`matButton`,``,`matSnackBarAction`,``,3,`click`]],template:function(e,a){e&1&&(Oi(0,`div`,0),Mw(1),rl(),RD(2,t,3,1,`div`,1)),e&2&&(sE(),cl(` `,a.data.message,`
`),sE(),kD(a.hasAction?2:-1))},dependencies:[Mt$2,ut$1,bt$2,ht$1],styles:[`.mat-mdc-simple-snack-bar {
  display: flex;
}
.mat-mdc-simple-snack-bar .mat-mdc-snack-bar-label {
  max-height: 50vh;
  overflow: auto;
}
`],encapsulation:2})})()}return i})();var T$5=`_mat-snack-bar-enter`;var R$1=`_mat-snack-bar-exit`;var _t$2=(()=>{class i extends tt$2{_ngZone=D$4(be$1);_elementRef=D$4(Hr);_changeDetectorRef=D$4(jF);_platform=D$4(l);_animationsDisabled=K();snackBarConfig=D$4(d);_document=D$4(Cr);_trackedModals=new Set;_enterFallback;_exitFallback;_injector=D$4(fe$1);_announceDelay=150;_announceTimeoutId;_destroyed=!1;_portalOutlet;_onAnnounce=new X$2;_onExit=new X$2;_onEnter=new X$2;_animationState=`void`;_live;_label;_role;_liveElementId=D$4(ne$2).getId(`mat-snack-bar-container-live-`);constructor(){super();let t=this.snackBarConfig;t.politeness===`assertive`&&!t.announcementMessage?this._live=`assertive`:t.politeness===`off`?this._live=`off`:this._live=`polite`,this._platform.FIREFOX&&(this._live===`polite`&&(this._role=`status`),this._live===`assertive`&&(this._role=`alert`))}attachComponentPortal(t){this._assertNotAttached();let n=this._portalOutlet.attachComponentPortal(t);return this._afterPortalAttached(),n}attachTemplatePortal(t){this._assertNotAttached();let n=this._portalOutlet.attachTemplatePortal(t);return this._afterPortalAttached(),n}attachDomPortal=t=>{this._assertNotAttached();let n=this._portalOutlet.attachDomPortal(t);return this._afterPortalAttached(),n};onAnimationEnd(t){t===R$1?this._completeExit():t===T$5&&(clearTimeout(this._enterFallback),this._ngZone.run(()=>{this._onEnter.next(),this._onEnter.complete()}))}enter(){this._destroyed||(this._animationState=`visible`,this._changeDetectorRef.markForCheck(),this._changeDetectorRef.detectChanges(),this._screenReaderAnnounce(),this._animationsDisabled?Hv(()=>{this._ngZone.run(()=>queueMicrotask(()=>this.onAnimationEnd(T$5)))},{injector:this._injector}):(clearTimeout(this._enterFallback),this._enterFallback=setTimeout(()=>{this._elementRef.nativeElement.classList.add(`mat-snack-bar-fallback-visible`),this.onAnimationEnd(T$5)},200)))}exit(){return this._destroyed?Ig(void 0):(this._ngZone.run(()=>{this._animationState=`hidden`,this._changeDetectorRef.markForCheck(),this._elementRef.nativeElement.setAttribute(`mat-exit`,``),clearTimeout(this._announceTimeoutId),this._animationsDisabled?Hv(()=>{this._ngZone.run(()=>queueMicrotask(()=>this.onAnimationEnd(R$1)))},{injector:this._injector}):(clearTimeout(this._exitFallback),this._exitFallback=setTimeout(()=>this.onAnimationEnd(R$1),200))}),this._onExit)}ngOnDestroy(){this._destroyed=!0,this._clearFromModals(),this._completeExit()}_completeExit(){clearTimeout(this._exitFallback),queueMicrotask(()=>{this._onExit.next(),this._onExit.complete()})}_afterPortalAttached(){let t=this._elementRef.nativeElement,n=this.snackBarConfig.panelClass;n&&(Array.isArray(n)?n.forEach(r=>t.classList.add(r)):t.classList.add(n)),this._exposeToModals();let e=this._label.nativeElement,a=`mdc-snackbar__label`;e.classList.toggle(a,!e.querySelector(`.${a}`))}_exposeToModals(){let t=this._liveElementId,n=this._document.querySelectorAll(`body > .cdk-overlay-container [aria-modal="true"]`);for(let e=0;e<n.length;e++){let a=n[e],r=a.getAttribute(`aria-owns`);this._trackedModals.add(a),r?r.indexOf(t)===-1&&a.setAttribute(`aria-owns`,r+` `+t):a.setAttribute(`aria-owns`,t)}}_clearFromModals(){this._trackedModals.forEach(t=>{let n=t.getAttribute(`aria-owns`);if(n){let e=n.replace(this._liveElementId,``).trim();e.length>0?t.setAttribute(`aria-owns`,e):t.removeAttribute(`aria-owns`)}}),this._trackedModals.clear()}_assertNotAttached(){this._portalOutlet.hasAttached()}_screenReaderAnnounce(){this._announceTimeoutId||this._ngZone.runOutsideAngular(()=>{this._announceTimeoutId=setTimeout(()=>{if(this._destroyed)return;let t=this._elementRef.nativeElement,n=t.querySelector(`[aria-hidden]`),e=t.querySelector(`[aria-live]`);if(n&&e){let a=null;this._platform.isBrowser&&document.activeElement instanceof HTMLElement&&n.contains(document.activeElement)&&(a=document.activeElement),n.removeAttribute(`aria-hidden`),e.appendChild(n),a?.focus(),this._onAnnounce.next(),this._onAnnounce.complete()}},this._announceDelay)})}static ɵfac=function(n){return new(n||i)};static ɵcmp=(function(){let t=[`label`];function n(e,a){}return OI({type:i,selectors:[[`mat-snack-bar-container`]],viewQuery:function(a,r){if(a&1&&Ih(_i,7)(t,7),a&2){let s;rw(s=ow())&&(r._portalOutlet=s.first),rw(s=ow())&&(r._label=s.first)}},hostAttrs:[1,`mdc-snackbar`,`mat-mdc-snack-bar-container`],hostVars:6,hostBindings:function(a,r){a&1&&mh(`animationend`,function(c){return r.onAnimationEnd(c.animationName)})(`animationcancel`,function(c){return r.onAnimationEnd(c.animationName)}),a&2&&_h(`mat-snack-bar-container-enter`,r._animationState===`visible`)(`mat-snack-bar-container-exit`,r._animationState===`hidden`)(`mat-snack-bar-container-animations-enabled`,!r._animationsDisabled)},features:[zp],decls:6,vars:3,consts:[[`label`,``],[1,`mdc-snackbar__surface`,`mat-mdc-snackbar-surface`],[1,`mat-mdc-snack-bar-label`],[`aria-hidden`,`true`],[`cdkPortalOutlet`,``]],template:function(a,r){a&1&&(Oi(0,`div`,1)(1,`div`,2,0)(3,`div`,3),Zp(4,n,0,0,`ng-template`,4),rl(),uh(5,`div`),rl()()),a&2&&(sE(5),ch(`aria-live`,r._live)(`role`,r._role)(`id`,r._liveElementId))},dependencies:[_i],styles:[`@keyframes _mat-snack-bar-enter {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes _mat-snack-bar-exit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
.mat-mdc-snack-bar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  margin: 8px;
}
.mat-mdc-snack-bar-handset .mat-mdc-snack-bar-container {
  width: 100vw;
}

.mat-snack-bar-container-animations-enabled {
  opacity: 0;
}
.mat-snack-bar-container-animations-enabled.mat-snack-bar-fallback-visible {
  opacity: 1;
}
.mat-snack-bar-container-animations-enabled.mat-snack-bar-container-enter {
  animation: _mat-snack-bar-enter 150ms cubic-bezier(0, 0, 0.2, 1) forwards;
}
.mat-snack-bar-container-animations-enabled.mat-snack-bar-container-exit {
  animation: _mat-snack-bar-exit 75ms cubic-bezier(0.4, 0, 1, 1) forwards;
}

.mat-mdc-snackbar-surface {
  box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  padding-left: 0;
  padding-right: 8px;
}
[dir=rtl] .mat-mdc-snackbar-surface {
  padding-right: 0;
  padding-left: 8px;
}
.mat-mdc-snack-bar-container .mat-mdc-snackbar-surface {
  min-width: 344px;
  max-width: 672px;
}
.mat-mdc-snack-bar-handset .mat-mdc-snackbar-surface {
  width: 100%;
  min-width: 0;
}
@media (forced-colors: active) {
  .mat-mdc-snackbar-surface {
    outline: solid 1px;
  }
}
.mat-mdc-snack-bar-container .mat-mdc-snackbar-surface {
  color: var(--%NS%mat-snack-bar-supporting-text-color, var(--%NS%mat-sys-inverse-on-surface));
  border-radius: var(--%NS%mat-snack-bar-container-shape, var(--%NS%mat-sys-corner-extra-small));
  background-color: var(--%NS%mat-snack-bar-container-color, var(--%NS%mat-sys-inverse-surface));
}

.mdc-snackbar__label {
  width: 100%;
  flex-grow: 1;
  box-sizing: border-box;
  margin: 0;
  padding: 14px 8px 14px 16px;
}
[dir=rtl] .mdc-snackbar__label {
  padding-left: 8px;
  padding-right: 16px;
}
.mat-mdc-snack-bar-container .mdc-snackbar__label {
  font-family: var(--%NS%mat-snack-bar-supporting-text-font, var(--%NS%mat-sys-body-medium-font));
  font-size: var(--%NS%mat-snack-bar-supporting-text-size, var(--%NS%mat-sys-body-medium-size));
  font-weight: var(--%NS%mat-snack-bar-supporting-text-weight, var(--%NS%mat-sys-body-medium-weight));
  line-height: var(--%NS%mat-snack-bar-supporting-text-line-height, var(--%NS%mat-sys-body-medium-line-height));
}

.mat-mdc-snack-bar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  box-sizing: border-box;
}

.mat-mdc-snack-bar-handset,
.mat-mdc-snack-bar-container,
.mat-mdc-snack-bar-label {
  flex: 1 1 auto;
}

.mat-mdc-snack-bar-container .mat-mdc-button.mat-mdc-snack-bar-action:not(:disabled).mat-unthemed {
  color: var(--%NS%mat-snack-bar-button-color, var(--%NS%mat-sys-inverse-primary));
}
.mat-mdc-snack-bar-container .mat-mdc-button.mat-mdc-snack-bar-action:not(:disabled) {
  --%NS%mat-button-text-state-layer-color: currentColor;
  --%NS%mat-button-text-ripple-color: currentColor;
}
.mat-mdc-snack-bar-container .mat-mdc-button.mat-mdc-snack-bar-action:not(:disabled) .mat-ripple-element {
  opacity: 0.1;
}
`],encapsulation:2,changeDetection:1})})()}return i})();var kt$1=new x$4(`mat-snack-bar-default-options`,{providedIn:`root`,factory:()=>new d});var Ht$1=(()=>{class i$1{_live=D$4(wt$2);_injector=D$4(fe$1);_breakpointObserver=D$4(Ne$2);_parentSnackBar=D$4(i$1,{optional:!0,skipSelf:!0});_defaultConfig=D$4(kt$1);_animationsDisabled=K();_snackBarRefAtThisLevel=null;simpleSnackBarComponent=ft$1;snackBarContainerComponent=_t$2;handsetCssClass=`mat-mdc-snack-bar-handset`;get _openedSnackBarRef(){let t=this._parentSnackBar;return t?t._openedSnackBarRef:this._snackBarRefAtThisLevel}set _openedSnackBarRef(t){this._parentSnackBar?this._parentSnackBar._openedSnackBarRef=t:this._snackBarRefAtThisLevel=t}openFromComponent(t,n){return this._attach(t,n)}openFromTemplate(t,n){return this._attach(t,n)}open(t,n=``,e){let a=r$1(r$1({},this._defaultConfig),e);return a.data={message:t,action:n},a.announcementMessage===t&&(a.announcementMessage=void 0),this.openFromComponent(this.simpleSnackBarComponent,a)}dismiss(){this._openedSnackBarRef&&this._openedSnackBarRef.dismiss()}ngOnDestroy(){this._snackBarRefAtThisLevel&&this._snackBarRefAtThisLevel.dismiss()}_attachSnackBarContainer(t,n){let e=n&&n.viewContainerRef&&n.viewContainerRef.injector,a=fe$1.create({parent:e||this._injector,providers:[{provide:d,useValue:n}]}),r=new Ct$1(this.snackBarContainerComponent,n.viewContainerRef,a),s=t.attach(r);return s.instance.snackBarConfig=n,s.instance}_attach(t,n){let e=r$1(r$1(r$1({},new d),this._defaultConfig),n),a=this._createOverlay(e),r=this._attachSnackBarContainer(a,e),s=new h$2(r,a);if(t instanceof kr){let c=new H$2(t,null,{$implicit:e.data,snackBarRef:s});s.instance=r.attachTemplatePortal(c)}else{let c=this._createInjector(e,s),mt=new Ct$1(t,void 0,c);s.instance=r.attachComponentPortal(mt).instance}return this._breakpointObserver.observe(i.HandsetPortrait).pipe(Yg(a.detachments())).subscribe(c=>{a.overlayElement.classList.toggle(this.handsetCssClass,c.matches)}),e.announcementMessage&&r._onAnnounce.subscribe(()=>{this._live.announce(e.announcementMessage,e.politeness)}),this._animateSnackBar(s,e),this._openedSnackBarRef=s,this._openedSnackBarRef}_animateSnackBar(t,n){t.afterDismissed().subscribe(()=>{this._openedSnackBarRef==t&&(this._openedSnackBarRef=null),n.announcementMessage&&this._live.clear()}),n.duration&&n.duration>0&&t.afterOpened().subscribe(()=>t._dismissAfter(n.duration)),this._openedSnackBarRef?(this._openedSnackBarRef.afterDismissed().subscribe(()=>{t.containerInstance.enter()}),this._openedSnackBarRef.dismiss()):t.containerInstance.enter()}_createOverlay(t){let n=new j$1;n.direction=t.direction;let e=le$2(this._injector),a=t.direction===`rtl`,r=t.horizontalPosition===`left`||t.horizontalPosition===`start`&&!a||t.horizontalPosition===`end`&&a,s=!r&&t.horizontalPosition!==`center`;return r?e.left(`0`):s?e.right(`0`):e.centerHorizontally(),t.verticalPosition===`top`?e.top(`0`):e.bottom(`0`),n.positionStrategy=e,n.disableAnimations=this._animationsDisabled,Vt$1(this._injector,n)}_createInjector(t,n){let e=t&&t.viewContainerRef&&t.viewContainerRef.injector;return fe$1.create({parent:e||this._injector,providers:[{provide:h$2,useValue:n},{provide:lt$1,useValue:t.data}]})}static ɵfac=function(n){return new(n||i$1)};static ɵprov=Vr({token:i$1,factory:i$1.ɵfac})}return i$1})();var u$1=class n{tone=OF(`dark`);size=OF(`default`);src=cb(()=>this.tone()===`light`?`/brand/logo-full-reversed.png`:`/brand/logo-full.png`);sizeClass=cb(()=>this.size()===`hero`?`block w-44 sm:w-56 lg:w-[70%] h-auto mx-auto`:this.size()===`lg`?this.tone()===`light`?`h-14 w-auto`:`h-12 w-auto`:this.tone()===`light`?`h-12 w-auto`:`h-9 w-auto`);static ɵfac=function(e){return new(e||n)};static ɵcmp=OI({type:n,selectors:[[`cv-logo`]],inputs:{tone:[1,`tone`],size:[1,`size`]},decls:1,vars:3,consts:[[`alt`,`CareVerity`,3,`src`]],template:function(e,s){e&1&&dh(0,`img`,0),e&2&&(yw(s.sizeClass()),hh(`src`,s.src(),Wf))},encapsulation:2})};var h$1=[`*`];var u=(o,r)=>r.label;function b$3(o,r){if(o&1&&(Oi(0,`div`,14)(1,`span`,12),Mw(2),rl(),Oi(3,`span`)(4,`strong`),Mw(5),rl(),Oi(6,`small`),Mw(7),rl()()()),o&2){let i=r.$implicit;sE(),yw(i.tone),sE(),kh(i.icon),sE(3),kh(i.label),sE(2),kh(i.description)}}var v$1=class o{capabilities=[{label:`Care delivery`,description:`Plans & visits`,icon:`favorite`,tone:`care`},{label:`Your people`,description:`Teams & learning`,icon:`groups`,tone:`people`},{label:`Compliance`,description:`Records & evidence`,icon:`verified_user`,tone:`evidence`}];static ɵfac=function(i){return new(i||o)};static ɵcmp=OI({type:o,selectors:[[`cv-auth-split-layout`]],ngContentSelectors:h$1,decls:41,vars:0,consts:[[1,`cv-auth-shell`,`cv-auth-entry`],[1,`cv-entry-frame`],[1,`cv-entry-brand`],[`tone`,`light`,`size`,`lg`,1,`cv-entry-logo`],[1,`cv-entry-story`],[1,`cv-entry-eyebrow`],[1,`cv-entry-description`],[1,`cv-entry-visual`],[1,`cv-entry-photo`],[`src`,`/brand/sign-in-care.jpg`,`alt`,`A care professional and an older woman sharing a warm smile`,`width`,`1536`,`height`,`1024`],[1,`cv-entry-capabilities`],[1,`cv-entry-capabilities-heading`],[`aria-hidden`,`true`,1,`material-symbols-outlined`],[1,`cv-entry-capability-grid`],[1,`cv-entry-capability`],[1,`cv-entry-main`],[1,`cv-entry-mobile-logo`],[1,`cv-entry-content`,`cv-enter`],[1,`cv-entry-support`],[`href`,`mailto:support@careverity.com`,1,`cv-auth-link`],[`aria-hidden`,`true`],[1,`cv-entry-footer`]],template:function(i,f){i&1&&(ew(),Oi(0,`div`,0)(1,`div`,1)(2,`aside`,2),uh(3,`cv-logo`,3),Oi(4,`div`,4)(5,`p`,5),uh(6,`span`),Mw(7,` Connected care. Shared purpose.`),rl(),Oi(8,`h2`),Mw(9,`Better care starts with `),Oi(10,`span`),Mw(11,`connected people.`),rl()(),Oi(12,`p`,6),Mw(13,` Bring care delivery, your workforce and compliance together in one clear workspace. `),rl()(),Oi(14,`div`,7)(15,`div`,8),uh(16,`img`,9),rl(),Oi(17,`div`,10)(18,`p`,11)(19,`span`,12),Mw(20,`hub`),rl(),Mw(21,` One workspace. Better connected. `),rl(),Oi(22,`div`,13),FD(23,b$3,8,5,`div`,14,u),rl()()()(),Oi(25,`main`,15)(26,`div`,16),uh(27,`cv-logo`),rl(),Oi(28,`div`,17),tw(29),Oi(30,`p`,18),Mw(31,` Need a hand? `),Oi(32,`a`,19),Mw(33,`Contact support `),Oi(34,`span`,20),Mw(35,`↗`),rl()()()(),Oi(36,`p`,21),Mw(37,` CareVerity `),Oi(38,`span`,20),Mw(39,`·`),rl(),Mw(40,` People. Purpose. Progress. `),rl()()()()),i&2&&(sE(23),jD(f.capabilities))},dependencies:[u$1],styles:[`[_nghost-%COMP%]{display:block}.cv-auth-entry[_ngcontent-%COMP%]{display:grid;min-height:100svh;align-items:center;padding:24px;background:radial-gradient(ellipse at top left,var(--%NS%color-teal-50) 0,transparent 48%),var(--%NS%color-cloud)}.cv-entry-frame[_ngcontent-%COMP%]{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);width:100%;max-width:1048px;margin-inline:auto;overflow:hidden;border:1px solid var(--%NS%color-line);border-radius:20px;background:#fff;box-shadow:0 20px 70px -28px #0f2d4a47}.cv-entry-brand[_ngcontent-%COMP%]{position:relative;display:flex;flex-direction:column;overflow:hidden;padding:32px 25px 24px;background:var(--%NS%color-navy);color:#fff;isolation:isolate}.cv-entry-logo[_ngcontent-%COMP%]{position:relative;z-index:2;display:block}.cv-entry-story[_ngcontent-%COMP%]{position:relative;z-index:2;margin-top:32px;max-width:540px}.cv-entry-eyebrow[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;margin:0 0 16px;color:#c4e8e5;font-size:12px;font-weight:500;letter-spacing:.035em}.cv-entry-eyebrow[_ngcontent-%COMP%] > span[_ngcontent-%COMP%]{height:6px;width:6px;border-radius:50%;background:#49d6c6}h2[_ngcontent-%COMP%]{margin:0;font-size:clamp(36px,3.5vw,44px);line-height:1.2;letter-spacing:-.04em;font-weight:600}h2[_ngcontent-%COMP%] > span[_ngcontent-%COMP%]{color:#83e3d7}.cv-entry-description[_ngcontent-%COMP%]{max-width:405px;margin:16px 0 0;color:#d0dde8;font-size:14px;line-height:1.7}.cv-entry-visual[_ngcontent-%COMP%]{position:relative;flex:1;display:flex;flex-direction:column;justify-content:flex-end;margin:24px -25px -24px;padding:180px 25px 24px}.cv-entry-photo[_ngcontent-%COMP%]{position:absolute;inset:0;overflow:hidden;z-index:0}.cv-entry-photo[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{position:absolute;inset:0;height:100%;width:100%;object-fit:cover;object-position:48% 40%}.cv-entry-photo[_ngcontent-%COMP%]:after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,var(--%NS%color-navy) 0,rgba(15,45,74,.05) 40%,rgba(15,45,74,.85) 100%)}.cv-entry-capabilities[_ngcontent-%COMP%]{position:relative;z-index:2;margin-top:0;padding:16px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:#0f2d4ae0}.cv-entry-capabilities-heading[_ngcontent-%COMP%]{display:flex;align-items:center;gap:8px;margin:0 0 16px;font-size:12px;color:#dce8f1}.cv-entry-capabilities-heading[_ngcontent-%COMP%] > span[_ngcontent-%COMP%]{color:#83e3d7;font-size:18px}.cv-entry-capability-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.cv-entry-capability[_ngcontent-%COMP%]{display:flex;align-items:flex-start;gap:8px;min-width:0}.cv-entry-capability[_ngcontent-%COMP%] > .material-symbols-outlined[_ngcontent-%COMP%]{display:grid;place-items:center;flex-shrink:0;height:32px;width:32px;border-radius:8px;font-size:20px}.care[_ngcontent-%COMP%]{background:#00a89633;color:#83e3d7}.people[_ngcontent-%COMP%]{background:#3b82f633;color:#a6c8ff}.evidence[_ngcontent-%COMP%]{background:#ad8fff33;color:#d3c1ff}.cv-entry-capability[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%]{display:block;font-size:12px;font-weight:600;line-height:1.5}.cv-entry-capability[_ngcontent-%COMP%]   small[_ngcontent-%COMP%]{display:block;margin-top:2px;color:#c2d1df;font-size:11px;line-height:1.5}.cv-entry-main[_ngcontent-%COMP%]{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:32px 25px 24px}.cv-entry-content[_ngcontent-%COMP%]{width:100%;max-width:368px;margin-inline:auto}.cv-entry-mobile-logo[_ngcontent-%COMP%]{display:none}.cv-entry-support[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;margin:16px 0 0;padding-top:16px;border-top:1px solid var(--%NS%color-line);color:var(--%NS%color-slate);font-size:12px}.cv-entry-support[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{display:inline-flex;align-items:center;gap:4px;min-height:40px}.cv-entry-footer[_ngcontent-%COMP%]{margin:16px 0 0;display:flex;justify-content:center;flex-wrap:wrap;gap:8px;color:var(--%NS%color-slate);font-size:11px}@media(min-width:1024px){.cv-entry-capability[_ngcontent-%COMP%]{flex-direction:column}}@media(max-width:1023px){.cv-entry-frame[_ngcontent-%COMP%]{display:block;max-width:432px;min-height:0;border-radius:20px}.cv-entry-brand[_ngcontent-%COMP%]{display:none}.cv-entry-main[_ngcontent-%COMP%]{padding:32px}.cv-entry-mobile-logo[_ngcontent-%COMP%]{display:block;width:100%;max-width:368px;margin:0 auto 24px}}@media(max-width:599px){.cv-auth-entry[_ngcontent-%COMP%]{padding:0;background:#fff;align-items:start}.cv-entry-frame[_ngcontent-%COMP%]{max-width:none;min-height:100svh;border:0;border-radius:0;box-shadow:none}.cv-entry-main[_ngcontent-%COMP%]{padding:24px;min-height:100svh;justify-content:flex-start}.cv-entry-mobile-logo[_ngcontent-%COMP%]{margin-bottom:24px}.cv-entry-footer[_ngcontent-%COMP%]{margin-top:auto;padding-top:24px}}`]})};var g$1=[`*`];var w$1=class i{width=OF(`sm`);compact=OF(!1,{transform:HF});widthClass(){return this.width()===`lg`?`cv-auth-flow-panel-wide max-w-[38rem]`:this.width()===`md`?`max-w-[30rem]`:`max-w-[28rem]`}static ɵfac=function(n){return new(n||i)};static ɵcmp=OI({type:i,selectors:[[`cv-auth-centered-layout`]],inputs:{width:[1,`width`],compact:[1,`compact`]},ngContentSelectors:g$1,decls:17,vars:5,consts:[[1,`cv-auth-shell`,`cv-auth-flow`],[1,`cv-auth-flow-logo`],[1,`cv-auth-flow-support`],[`href`,`mailto:support@careverity.com`,1,`cv-auth-link`],[`aria-hidden`,`true`],[1,`cv-auth-flow-footer`]],template:function(n,r){n&1&&(ew(),Oi(0,`div`,0)(1,`div`)(2,`header`,1),uh(3,`cv-logo`),rl(),Oi(4,`main`),tw(5),rl(),Oi(6,`p`,2),Mw(7,` Need a hand? `),Oi(8,`a`,3),Mw(9,`Contact support `),Oi(10,`span`,4),Mw(11,`↗`),rl()()(),Oi(12,`p`,5),Mw(13,` CareVerity `),Oi(14,`span`,4),Mw(15,`·`),rl(),Mw(16,` People. Purpose. Progress. `),rl()()()),n&2&&(_h(`cv-auth-flow-compact`,r.compact()),sE(),yw(Fw(`cv-auth-flow-panel cv-enter w-full `,r.widthClass())))},dependencies:[u$1],encapsulation:2})};function U$1(n){n||(n=D$4(ye$2));let e=new S$4(t=>{if(n.destroyed){t.next();return}return n.onDestroy(t.next.bind(t))});return t=>t.pipe(Yg(e))}function T$4(n,e){let d=!e?.manualCleanup?e?.injector?.get(ye$2)??D$4(ye$2):null,l=p(e?.equal),o;e?.requireSync?o=ti({kind:0},{equal:l}):o=ti({kind:1,value:e?.initialValue},{equal:l});let i,b=n.subscribe({next:r=>o.set({kind:1,value:r}),error:r=>{o.set({kind:2,error:r}),i?.()},complete:()=>{i?.()}});if(e?.requireSync&&o().kind===0)throw new N$3(601,!1);return i=d?.onDestroy(b.unsubscribe.bind(b)),cb(()=>{let r=o();switch(r.kind){case 1:return r.value;case 2:throw r.error;case 0:throw new N$3(601,!1)}},{equal:e?.equal})}function p(n=Object.is){return(e,t)=>e.kind===1&&t.kind===1&&n(e.value,t.value)}var f=class n{router=D$4(we$1);pending=ti(null);destination=()=>this.pending()?.url??``;constructor(){let i=this.router.currentNavigation();i&&this.start(i.id,i.extractedUrl.toString()),this.router.events.pipe(U$1()).subscribe(t=>{t instanceof Se$1?this.start(t.id,t.url):(t instanceof J||t instanceof Q||t instanceof Ue$3||t instanceof ce$3)&&t.id===this.pending()?.id&&this.pending.set(null)})}localDestination(i){let t=this.destination();return r(t)===i&&r(this.pending()?.source??``)===i?t:``}rootDestination(){let i=this.destination(),t=r(i);return t&&t===r(this.pending()?.source??``)?``:i}start(i,t){let h=t.split(/[?#]/)[0],m=this.router.url.split(/[?#]/)[0];this.pending.set(h!==m?{id:i,url:t,source:this.router.url}:null)}static ɵfac=function(t){return new(t||n)};static ɵprov=ce$2({token:n,factory:n.ɵfac,providedIn:`root`})};function r(n){let i=n.split(/[?#]/)[0];return/^\/(manage|account)(\/|$)/.test(i)?`management`:/^\/staff-portal(\/|$)/.test(i)?`staff`:/^\/inspector(\/|$)/.test(i)?`inspector`:``}var b$2=()=>[0,1,2,3,4,5,6,7,8];var x$3=()=>[0,1,2];function z$3(e,a){e&1&&(Oi(0,`div`),uh(1,`cv-skeleton`,17),rl())}function M$4(e,a){e&1&&(Oi(0,`section`,0),uh(1,`cv-skeleton`,11),Oi(2,`div`,12)(3,`div`,13),uh(4,`cv-skeleton`,14),rl(),Oi(5,`div`,15),FD(6,z$3,2,0,`div`,null,PD),rl(),uh(8,`cv-skeleton`,16),rl()()),e&2&&(sE(6),jD(Uw(0,x$3)))}function E$1(e,a){e&1&&uh(0,`cv-skeleton`,6)}function S$3(e,a){e&1&&(Oi(0,`div`,18)(1,`div`,19),uh(2,`cv-skeleton`,17)(3,`cv-skeleton`,5),rl(),uh(4,`cv-skeleton`,20),rl(),Oi(5,`div`,21),uh(6,`cv-skeleton`,22)(7,`cv-skeleton`,23),rl())}function L$4(e,a){e&1&&uh(0,`cv-skeleton`,26)}function T$3(e,a){e&1&&(Oi(0,`div`,30),uh(1,`cv-skeleton`,31),rl())}function F$2(e,a){e&1&&(Oi(0,`div`,32),uh(1,`cv-skeleton`,33),Oi(2,`div`),uh(3,`cv-skeleton`,34)(4,`cv-skeleton`,35),rl()(),uh(5,`cv-skeleton`,36))}function P$2(e,a){if(e&1&&(Oi(0,`div`,24)(1,`div`,25),uh(2,`cv-skeleton`,3),Oi(3,`div`),uh(4,`cv-skeleton`,17),RD(5,L$4,1,0,`cv-skeleton`,26),rl(),uh(6,`cv-skeleton`,20),rl(),Oi(7,`div`,27),uh(8,`cv-skeleton`,28)(9,`cv-skeleton`,29),rl(),RD(10,T$3,2,0,`div`,30)(11,F$2,6,0),rl()),e&2){let o=JD();_h(`cm-submodule-card`,o.configuration()),sE(5),kD(o.configuration()?-1:5),sE(5),kD(o.configuration()?10:11)}}function D$3(e,a){e&1&&(Oi(0,`div`,9),uh(1,`cv-skeleton`,37),Oi(2,`div`,38),uh(3,`cv-skeleton`,39)(4,`cv-skeleton`,40)(5,`cv-skeleton`,41),rl()())}var k$3=class e{configuration=OF(!1);showCompany=OF(!1);static ɵfac=function(o){return new(o||e)};static ɵcmp=OI({type:e,selectors:[[`cv-company-modules-loading`]],hostAttrs:[`role`,`status`,`aria-busy`,`true`],hostVars:1,hostBindings:function(o,s){o&2&&ch(`aria-label`,s.configuration()?`Loading submodule configuration`:`Loading modules`)},inputs:{configuration:[1,`configuration`],showCompany:[1,`showCompany`]},decls:15,vars:8,consts:[[`aria-hidden`,`true`,1,`co-summary`,`co-surface`],[`aria-hidden`,`true`,1,`co-surface`,`cm-panel`],[1,`cm-panel-heading`],[`sizeClass`,`h-8 w-8`],[`sizeClass`,`h-4 w-48 max-w-full`],[`sizeClass`,`mt-2 h-2 w-64 max-w-full`],[`sizeClass`,`h-7 w-32`],[1,`cm-module-grid`],[1,`cm-module`,3,`cm-submodule-card`],[1,`cm-callout`,`permissions`],[1,`sr-only`],[`sizeClass`,`h-18 w-22 max-w-full`],[1,`co-summary-content`],[1,`co-summary-header`],[`sizeClass`,`h-5 w-52 max-w-full`],[1,`co-facts`],[`sizeClass`,`mt-2 h-3 w-full`],[`sizeClass`,`h-3 w-32 max-w-full`],[1,`cm-configuration-access`],[1,`cm-configuration-access-copy`],[`sizeClass`,`h-4 w-7`],[1,`cm-submodule-heading`],[`sizeClass`,`h-3 w-36`],[`sizeClass`,`h-3 w-20`],[1,`cm-module`],[1,`cm-module-top`],[`sizeClass`,`mt-2 h-3 w-16`],[1,`card-copy`],[`sizeClass`,`h-2 w-full`],[`sizeClass`,`h-2 w-3/4`],[1,`cm-submodule-footer`],[`sizeClass`,`h-4 w-16`],[1,`cm-permissions`],[`sizeClass`,`h-5 w-5`],[`sizeClass`,`h-3 w-24`],[`sizeClass`,`mt-2 h-2 w-40 max-w-full`],[`sizeClass`,`h-3 w-20`,1,`card-link`],[`sizeClass`,`h-6 w-6`],[1,`permissions-copy`],[`sizeClass`,`h-3 w-32`],[`sizeClass`,`mt-2 h-2 w-full`],[`sizeClass`,`mt-3 h-3 w-40 max-w-full`]],template:function(o,s){o&1&&(RD(0,M$4,9,1,`section`,0),Oi(1,`section`,1)(2,`div`,2),uh(3,`cv-skeleton`,3),Oi(4,`div`),uh(5,`cv-skeleton`,4)(6,`cv-skeleton`,5),rl(),RD(7,E$1,1,0,`cv-skeleton`,6),rl(),RD(8,S$3,8,0),Oi(9,`div`,7),FD(10,P$2,12,4,`div`,8,PD),rl(),RD(12,D$3,6,0,`div`,9),rl(),Oi(13,`span`,10),Mw(14),rl()),o&2&&(kD(s.showCompany()?0:-1),sE(7),kD(s.configuration()?7:-1),sE(),kD(s.configuration()?8:-1),sE(),_h(`cm-submodule-grid`,s.configuration()),sE(),jD(Uw(7,b$2)),sE(2),kD(s.configuration()?12:-1),sE(2),kh(s.configuration()?`Loading saved submodules and feature access.`:`Loading saved modules and feature access.`))},dependencies:[l$1],styles:[`[_nghost-%COMP%]{display:block}.card-copy[_ngcontent-%COMP%]{display:grid;gap:6px;margin:8px 0;flex:1}.card-link[_ngcontent-%COMP%]{align-self:flex-end}.permissions[_ngcontent-%COMP%]{margin-top:12px}.permissions-copy[_ngcontent-%COMP%]{flex:1;min-width:0}`]})};var w=()=>[`General Information`,`Registration & Compliance`,`Contact Information`,`Branches & Locations`,`Branding`,`Modules & Feature Access`,`Roles & Permissions`,`Integrations`];var M$3=()=>[`Create New Company`,`Duplicate Existing Setup`,`Edit Company Profile`,`Manage Modules`,`Invite Admin User`];var h=()=>[0,1,2,3];var O$1=()=>[0,1,2,3,4];var k$2=(e,n)=>n.label;var S$2=(e,n)=>n.title;function T$2(e,n){e&1&&(Oi(0,`div`,0),uh(1,`cv-skeleton`,7),rl())}function L$3(e,n){e&1&&(Oi(0,`div`),uh(1,`cv-skeleton`,12)(2,`cv-skeleton`,13),rl())}function N$1(e,n){if(e&1&&(Oi(0,`section`,1),uh(1,`cv-skeleton`,8),Oi(2,`div`,9),uh(3,`cv-skeleton`,10),Oi(4,`div`,11),FD(5,L$3,3,0,`div`,null,k$2),rl()()()),e&2){let r=JD();sE(5),jD(r.facts())}}function z$2(e,n){e&1&&(Oi(0,`section`,15),uh(1,`cv-skeleton`,16)(2,`cv-skeleton`,17)(3,`cv-skeleton`,18),rl())}function E(e,n){if(e&1&&(Oi(0,`div`,14),FD(1,z$2,4,0,`section`,15,PD),rl()),e&2){let r=JD();_h(`directory-metrics`,r.view()===`directory`),sE(),jD(r.metricLabels())}}function F$1(e,n){e&1&&(Oi(0,`div`,22),uh(1,`cv-skeleton`,16)(2,`cv-skeleton`,24)(3,`cv-skeleton`,25),rl())}function A$2(e,n){e&1&&(Oi(0,`div`,22),uh(1,`cv-skeleton`,16)(2,`cv-skeleton`,26),rl())}function I(e,n){e&1&&(Oi(0,`div`,3)(1,`section`,19),uh(2,`cv-skeleton`,20),Oi(3,`div`,21),FD(4,F$1,4,0,`div`,22,PD),rl()(),Oi(6,`aside`,19),uh(7,`cv-skeleton`,23),FD(8,A$2,3,0,`div`,22,PD),rl()()),e&2&&(sE(4),jD(Uw(0,w)),sE(4),jD(Uw(1,M$3)))}function R(e,n){e&1&&(Oi(0,`div`),uh(1,`cv-skeleton`,33)(2,`cv-skeleton`,34),rl())}function D$2(e,n){if(e&1&&(Oi(0,`section`,28),uh(1,`cv-skeleton`,31),Oi(2,`div`,32),FD(3,R,3,0,`div`,null,LD),rl()()),e&2){let r=n.$implicit;sE(3),jD(r.fields)}}function B$1(e,n){e&1&&uh(0,`cv-skeleton`,30)}function H$1(e,n){if(e&1&&(Oi(0,`div`,4)(1,`div`,27),FD(2,D$2,5,0,`section`,28,S$2),rl(),Oi(4,`aside`,28),uh(5,`cv-skeleton`,23)(6,`cv-skeleton`,29),FD(7,B$1,1,0,`cv-skeleton`,30,PD),rl()()),e&2){let r=JD();sE(),_h(`contact-panels`,r.view()===`contacts`),sE(),jD(r.sections()),sE(5),jD(Uw(2,h))}}function G$2(e,n){e&1&&uh(0,`cv-skeleton`,36)}function U(e,n){e&1&&(Oi(0,`div`,35),FD(1,G$2,1,0,`cv-skeleton`,36,PD),rl()),e&2&&(sE(),jD(Uw(0,h)))}function $$1(e,n){e&1&&(Oi(0,`section`,5),uh(1,`cv-skeleton`,31),FD(2,U,3,1,`div`,35,PD),rl()),e&2&&(sE(2),jD(Uw(0,O$1)))}var b$1=class e{view=OF(`profile`);company=OF();facts=cb(()=>[{label:`Company code`,value:this.company()?.code},{label:`Registration number`,value:this.company()?.registration},{label:`Service type`,value:this.company()?.sector}]);heading=OF(``);metricLabels=cb(()=>this.view()===`directory`?[`Total Companies`,`Active Companies`,`Pending Setup`,`Inactive Companies`]:[`Total Companies`,`Active Companies`,`Pending Setups`,`Profile Completion`,`Open Admin Tasks`]);sections=cb(()=>{switch(this.view()){case`contacts`:return[{title:`Registered Address`,fields:[`Address Line 1`,`Address Line 2`,`City`,`County`,`Postcode`,`Country`]},{title:`Head Office Address`,fields:[`Address Line 1`,`Address Line 2`,`City`,`County`,`Postcode`,`Country`]},{title:`Billing Address`,fields:[`Address Line 1`,`City`,`Postcode`,`Country`]},{title:`Primary Contact Details`,fields:[`Main Phone`,`Secondary Phone`,`General Email`,`Billing Email`,`Website`,`Emergency Contact`,`Out-of-Hours Number`]},{title:`Key Contacts`,fields:[`Registered Manager`,`Nominated Individual`,`Finance Contact`,`Compliance Contact`,`IT/System Contact`]}];case`compliance`:return[{title:`Registration Details`,fields:[`Company Number`,`CQC Registration Number`,`VAT / Tax Number`,`Registered Provider Type`,`Registration Status`,`Inspection Type`,`Insurance Expiry Date`,`Regulatory Region`,`Data Protection Registration`,`Safeguarding Lead`,`Medication Governance Lead`]},{title:`Compliance Mapping`,fields:[`Registration Certificate`,`Insurance Certificate`,`Data Protection Policy`,`Business Continuity Plan`]}];case`branding`:return[{title:`Theme & Appearance`,fields:[`Company Logo`,`Favicon`,`Primary Colour`,`Secondary Colour`,`Accent Colour`,`Font`]},{title:`Branding Preview`,fields:[`Portal Login`,`Portal Header`]}];case`modules`:return[{title:`Modules & Access`,fields:[`Care delivery`,`People & HR`,`Finance`,`Reports & insights`]}];case`access`:return[{title:`Users & Role Permissions`,fields:[`Users`,`Role assignments`,`Permissions`]}];case`integrations`:return[{title:`Integrations & Data`,fields:[`API keys`,`Backup preferences`,`Data exports`]}];case`locations`:return[{title:`Branches & Service Locations`,fields:[`Locations`,`Services`,`Registered places`]}];case`create`:return[{title:`Basic Company Details`,fields:[`Company Name`,`Trading Name`,`Company Code`,`Service Type`,`Company Size`,`Country`,`Region`]}];default:return[{title:`General Information`,fields:[`Company Name`,`Trading Name`,`Company Code`,`Service Type`,`Description / About Company`,`Registration Number`,`Established Date`,`Head Office Name`,`Number of Registered Places`,`Primary Language`,`Status`,`Head Office Address`,`Postcode`,`Company Size`]}]}});static ɵfac=function(r){return new(r||e)};static ɵcmp=OI({type:e,selectors:[[`cv-company-loading`]],hostAttrs:[`role`,`status`,`aria-label`,`Loading company information`,`aria-busy`,`true`],inputs:{view:[1,`view`],company:[1,`company`],heading:[1,`heading`]},decls:8,vars:5,consts:[[1,`co-heading`],[`aria-hidden`,`true`,1,`co-surface`,`summary`],[`aria-hidden`,`true`,1,`metrics`,3,`directory-metrics`],[1,`overview-main`],[`aria-hidden`,`true`,1,`layout`],[`aria-hidden`,`true`,1,`co-surface`,`panel`,`table`],[1,`sr-only`],[`sizeClass`,`mb-4 h-7 w-64 max-w-full`],[`sizeClass`,`h-20 w-20 shrink-0`],[1,`identity`],[`sizeClass`,`h-5 w-52 max-w-full`],[1,`facts`],[`sizeClass`,`mb-2 h-2 w-20`],[`sizeClass`,`h-3 w-24`],[`aria-hidden`,`true`,1,`metrics`],[1,`co-surface`],[`sizeClass`,`h-3 w-28 max-w-full`],[`sizeClass`,`mt-2 h-6 w-16`],[`sizeClass`,`mt-2 h-2 w-28 max-w-full`],[`aria-hidden`,`true`,1,`co-surface`,`panel`],[`sizeClass`,`h-4 w-44 max-w-full`],[1,`checks`],[1,`check`],[`sizeClass`,`h-4 w-28`],[`sizeClass`,`mt-2 h-2 w-full`],[`sizeClass`,`mt-2 h-2 w-20`],[`sizeClass`,`mt-2 h-2 w-24`],[1,`panels`],[1,`co-surface`,`panel`],[`sizeClass`,`mt-3 h-7 w-16`],[`sizeClass`,`mt-5 h-3 w-full`],[`sizeClass`,`h-4 w-40 max-w-full`],[1,`fields`],[`sizeClass`,`mb-2 h-2 w-24 max-w-full`],[`sizeClass`,`h-8 w-full`],[1,`table-row`],[`sizeClass`,`h-3 w-full`]],template:function(r,s){r&1&&(RD(0,T$2,2,0,`div`,0),RD(1,N$1,7,0,`section`,1),RD(2,E,3,2,`div`,2),RD(3,I,10,2,`div`,3)(4,H$1,9,3,`div`,4),RD(5,$$1,4,1,`section`,5),Oi(6,`span`,6),Mw(7,`Loading saved company information.`),rl()),r&2&&(kD(s.heading()?0:-1),sE(),kD(s.view()!==`directory`?1:-1),sE(),kD(s.view()===`overview`||s.view()===`directory`?2:-1),sE(),kD(s.view()===`overview`?3:s.view()!==`directory`?4:-1),sE(2),kD(s.view()===`overview`||s.view()===`directory`||s.view()===`locations`||s.view()===`access`?5:-1))},dependencies:[l$1],styles:[`[_nghost-%COMP%]{display:block}.co-surface[_ngcontent-%COMP%]{background:#fff;border:1px solid var(--%NS%color-line);border-radius:8px}section[_ngcontent-%COMP%], aside[_ngcontent-%COMP%]{padding:12px}.summary[_ngcontent-%COMP%]{display:flex;gap:16px;align-items:center;margin-bottom:12px}.identity[_ngcontent-%COMP%]{flex:1;min-width:0}.facts[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.facts[_ngcontent-%COMP%]   small[_ngcontent-%COMP%], label[_ngcontent-%COMP%]{display:block;font-size:11px;color:var(--%NS%color-slate);margin-bottom:6px}.metrics[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:12px}.overview-main[_ngcontent-%COMP%]{display:grid;grid-template-columns:minmax(0,3fr) minmax(220px,1.2fr);gap:12px}.overview-main[_ngcontent-%COMP%]   aside[_ngcontent-%COMP%]   .check[_ngcontent-%COMP%]{margin-top:8px}.layout[_ngcontent-%COMP%]{display:grid;grid-template-columns:minmax(0,3fr) minmax(220px,1fr);gap:12px}.panels[_ngcontent-%COMP%]{display:grid;gap:12px}.layout[_ngcontent-%COMP%]   aside[_ngcontent-%COMP%]{align-self:start}.directory-metrics[_ngcontent-%COMP%]{grid-template-columns:repeat(4,minmax(0,1fr))}.contact-panels[_ngcontent-%COMP%]{grid-template-columns:repeat(2,minmax(0,1fr))}.contact-panels[_ngcontent-%COMP%] > section[_ngcontent-%COMP%]:last-child{grid-column:1/-1}.contact-panels[_ngcontent-%COMP%]   .fields[_ngcontent-%COMP%]{grid-template-columns:repeat(2,minmax(0,1fr))}.fields[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 12px;margin-top:16px}h2[_ngcontent-%COMP%], h3[_ngcontent-%COMP%]{font-size:12px;font-weight:600;color:var(--%NS%color-navy)}.checks[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.check[_ngcontent-%COMP%]{border:1px solid var(--%NS%color-line);border-radius:7px;padding:12px;min-height:90px}.panel[_ngcontent-%COMP%]{margin-bottom:12px}.table-row[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px;padding:15px 0;border-bottom:1px solid var(--%NS%color-line)}@media(max-width:900px){.layout[_ngcontent-%COMP%], .overview-main[_ngcontent-%COMP%]{grid-template-columns:1fr}.fields[_ngcontent-%COMP%], .facts[_ngcontent-%COMP%], .metrics[_ngcontent-%COMP%]{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:599px){.fields[_ngcontent-%COMP%], .contact-panels[_ngcontent-%COMP%]{grid-template-columns:1fr}.checks[_ngcontent-%COMP%]{grid-template-columns:repeat(2,minmax(0,1fr))}.facts[_ngcontent-%COMP%]{grid-template-columns:1fr}.summary[_ngcontent-%COMP%]{align-items:flex-start}.table[_ngcontent-%COMP%]{overflow:hidden}.table-row[_ngcontent-%COMP%]{gap:12px}.metrics[_ngcontent-%COMP%]   section[_ngcontent-%COMP%]:last-child{grid-column:1/-1}}`]})};var P$1=()=>[0,1,2];var L$2=()=>[0,1,2,3,4,5];function M$2(e,n){e&1&&uh(0,`cv-company-loading`,0),e&2&&lh(`view`,n)}function S$1(e,n){if(e&1&&(Oi(0,`div`,2),uh(1,`cv-skeleton`,3),rl(),uh(2,`cv-company-modules-loading`,4)),e&2){let t=JD();sE(2),lh(`configuration`,t.configuration())}}function T$1(e,n){e&1&&(Oi(0,`section`),uh(1,`cv-skeleton`,13)(2,`cv-skeleton`,14),rl())}function N(e,n){e&1&&uh(0,`cv-skeleton`,15)}function z$1(e,n){e&1&&(Oi(0,`div`,11),FD(1,N,1,0,`cv-skeleton`,15,PD),rl()),e&2&&(sE(),jD(Uw(0,P$1)))}function D$1(e,n){e&1&&(Oi(0,`div`,1)(1,`div`,5),uh(2,`cv-skeleton`,6)(3,`cv-skeleton`,7)(4,`cv-skeleton`,8),Oi(5,`div`,9),FD(6,T$1,3,0,`section`,null,PD),rl(),Oi(8,`section`),uh(9,`cv-skeleton`,10),FD(10,z$1,3,1,`div`,11,PD),rl()(),Oi(12,`span`,12),Mw(13,`Loading the requested screen.`),rl()()),e&2&&(sE(6),jD(Uw(0,P$1)),sE(4),jD(Uw(1,L$2)))}var k$1=class e{url=OF.required();path=cb(()=>this.url().split(/[?#]/)[0]);modules=cb(()=>/\/companies\/[^/]+\/modules\//.test(this.path()));configuration=cb(()=>this.modules()&&!this.path().endsWith(`/overview`));companyView=cb(()=>{let n=this.path();if(!n.startsWith(`/manage/companies`)&&!n.startsWith(`/manage/locations`)||this.modules())return``;if(n===`/manage/companies`)return`overview`;if(n===`/manage/companies/directory`)return`directory`;if(n.startsWith(`/manage/locations`))return`locations`;for(let t of[`contacts`,`compliance`,`branding`,`integrations`,`access`])if(n.endsWith(`/`+t))return t;return`profile`});static ɵfac=function(t){return new(t||e)};static ɵcmp=OI({type:e,selectors:[[`cv-page-loading`]],hostAttrs:[`data-route-loading`,``,1,`module-page`],inputs:{url:[1,`url`]},decls:3,vars:1,consts:[[`heading`,`Loading page`,3,`view`],[`role`,`status`,`aria-label`,`Loading destination page`,`aria-busy`,`true`],[`aria-hidden`,`true`,1,`co-heading`],[`sizeClass`,`mb-4 h-7 w-64 max-w-full`],[3,`configuration`],[`aria-hidden`,`true`],[`sizeClass`,`mb-3 h-3 w-36`],[`sizeClass`,`mb-3 h-6 w-56 max-w-full`],[`sizeClass`,`mb-5 h-3 w-96 max-w-full`],[1,`route-metrics`],[`sizeClass`,`h-4 w-40`],[1,`route-row`],[1,`sr-only`],[`sizeClass`,`h-3 w-28 max-w-full`],[`sizeClass`,`mt-3 h-6 w-16`],[`sizeClass`,`h-4 w-full`]],template:function(t,u){if(t&1&&RD(0,M$2,1,1,`cv-company-loading`,0)(1,S$1,3,1)(2,D$1,14,2,`div`,1),t&2){let g;kD((g=u.companyView())?0:u.modules()?1:2,g)}},dependencies:[b$1,k$3,l$1],styles:[`[_nghost-%COMP%]{display:block;min-width:0}section[_ngcontent-%COMP%]{padding:12px;border:1px solid var(--%NS%color-line);border-radius:8px;background:#fff}.route-metrics[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.route-row[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding-block:16px;border-bottom:1px solid var(--%NS%color-line)}@media(max-width:640px){.route-metrics[_ngcontent-%COMP%]{grid-template-columns:repeat(2,minmax(0,1fr))}}`]})};var je$1=Symbol(`FIELD_TREE`);function O(i){return typeof i==`function`&&i[je$1]===!0}var mn$1=new x$4(``);var oe$1=class{_box;_destroyed=new X$2;_resizeSubject=new X$2;_resizeObserver;_elementObservables=new Map;constructor(m){this._box=m,typeof ResizeObserver<`u`&&(this._resizeObserver=new ResizeObserver(e=>this._resizeSubject.next(e)))}observe(m){return this._elementObservables.has(m)||this._elementObservables.set(m,new S$4(e=>{let n=this._resizeSubject.subscribe(e);return this._resizeObserver?.observe(m,{box:this._box}),()=>{this._resizeObserver?.unobserve(m),n.unsubscribe(),this._elementObservables.delete(m)}}).pipe(ln$1(e=>e.some(n=>n.target===m)),zg({bufferSize:1,refCount:!0}),Yg(this._destroyed))),this._elementObservables.get(m)}destroy(){this._destroyed.next(),this._destroyed.complete(),this._resizeSubject.complete(),this._elementObservables.clear()}};var Ue$2=(()=>{class i{_cleanupErrorListener;_observers=new Map;_ngZone=D$4(be$1);constructor(){}ngOnDestroy(){for(let[,e]of this._observers)e.destroy();this._observers.clear(),this._cleanupErrorListener?.()}observe(e,n){let r=n?.box||`content-box`;return this._observers.has(r)||this._observers.set(r,new oe$1(r)),this._observers.get(r).observe(e)}static ɵfac=function(n){return new(n||i)};static ɵprov=Vr({token:i,factory:i.ɵfac})}return i})();var ae$1=(()=>{class i{static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[`mat-label`]]})}return i})();var de$1=new x$4(`MatError`);var bt$1=(()=>{class i{id=D$4(ne$2).getId(`mat-mdc-error-`);static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[`mat-error`],[``,`matError`,``]],hostAttrs:[1,`mat-mdc-form-field-error`,`mat-mdc-form-field-bottom-align`],hostVars:1,hostBindings:function(n,r){n&2&&hh(`id`,r.id)},inputs:{id:`id`},features:[$w([{provide:de$1,useExisting:i}])]})}return i})();var le$1=(()=>{class i{align=`start`;id=D$4(ne$2).getId(`mat-mdc-hint-`);static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[`mat-hint`]],hostAttrs:[1,`mat-mdc-form-field-hint`,`mat-mdc-form-field-bottom-align`],hostVars:4,hostBindings:function(n,r){n&2&&(hh(`id`,r.id),ch(`align`,null),_h(`mat-mdc-form-field-hint-end`,r.align===`end`))},inputs:{align:`align`,id:`id`}})}return i})();var Ze$2=new x$4(`MatPrefix`);var se$1=new x$4(`MatSuffix`);var xt$1=(()=>{class i{set _isTextSelector(e){this._isText=!0}_isText=!1;static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[``,`matSuffix`,``],[``,`matIconSuffix`,``],[``,`matTextSuffix`,``]],inputs:{_isTextSelector:[0,`matTextSuffix`,`_isTextSelector`]},features:[$w([{provide:se$1,useExisting:i}])]})}return i})();var Je$2=new x$4(`FloatingLabelParent`);var We$2=(()=>{class i{_elementRef=D$4(Hr);get floating(){return this._floating}set floating(e){this._floating=e,this.monitorResize&&this._handleResize()}_floating=!1;get monitorResize(){return this._monitorResize}set monitorResize(e){this._monitorResize=e,this._monitorResize?this._subscribeToResize():this._resizeSubscription.unsubscribe()}_monitorResize=!1;_resizeObserver=D$4(Ue$2);_ngZone=D$4(be$1);_parent=D$4(Je$2);_resizeSubscription=new G$3;ngOnDestroy(){this._resizeSubscription.unsubscribe()}getWidth(){return vt$1(this._elementRef.nativeElement)}get element(){return this._elementRef.nativeElement}_handleResize(){setTimeout(()=>this._parent._handleLabelResized())}_subscribeToResize(){this._resizeSubscription.unsubscribe(),this._ngZone.runOutsideAngular(()=>{this._resizeSubscription=this._resizeObserver.observe(this._elementRef.nativeElement,{box:`border-box`}).subscribe(()=>this._handleResize())})}static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[`label`,`matFormFieldFloatingLabel`,``]],hostAttrs:[1,`mdc-floating-label`,`mat-mdc-floating-label`],hostVars:2,hostBindings:function(n,r){n&2&&_h(`mdc-floating-label--float-above`,r.floating)},inputs:{floating:`floating`,monitorResize:`monitorResize`}})}return i})();function vt$1(i){let m=i;if(m.offsetParent!==null)return m.scrollWidth;let e=m.cloneNode(!0);e.style.setProperty(`position`,`absolute`),e.style.setProperty(`transform`,`translate(-9999px, -9999px)`),document.documentElement.appendChild(e);let n=e.scrollWidth;return e.remove(),n}var Ge$1=`mdc-line-ripple--active`;var B=`mdc-line-ripple--deactivating`;var $e$2=(()=>{class i{_elementRef=D$4(Hr);_cleanupTransitionEnd;constructor(){let e=D$4(be$1),n=D$4(Ka);e.runOutsideAngular(()=>{this._cleanupTransitionEnd=n.listen(this._elementRef.nativeElement,`transitionend`,this._handleTransitionEnd)})}activate(){let e=this._elementRef.nativeElement.classList;e.remove(B),e.add(Ge$1)}deactivate(){this._elementRef.nativeElement.classList.add(B)}_handleTransitionEnd=e=>{let n=this._elementRef.nativeElement.classList,r=n.contains(B);e.propertyName===`opacity`&&r&&n.remove(Ge$1,B)};ngOnDestroy(){this._cleanupTransitionEnd()}static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i,selectors:[[`div`,`matFormFieldLineRipple`,``]],hostAttrs:[1,`mdc-line-ripple`]})}return i})();var Ye$2=(()=>{class i{_elementRef=D$4(Hr);_ngZone=D$4(be$1);open=!1;_notch;ngAfterViewInit(){let e=this._elementRef.nativeElement,n=e.querySelector(`.mdc-floating-label`);n?(e.classList.add(`mdc-notched-outline--upgraded`),typeof requestAnimationFrame==`function`&&(n.style.transitionDuration=`0s`,this._ngZone.runOutsideAngular(()=>{requestAnimationFrame(()=>n.style.transitionDuration=``)}))):e.classList.add(`mdc-notched-outline--no-label`)}_setNotchWidth(e){let n=this._notch.nativeElement;!this.open||!e?n.style.width=``:n.style.width=`calc(${e}px * var(--mat-mdc-form-field-floating-label-scale, 0.75) + 9px)`}_setMaxWidth(e){this._notch.nativeElement.style.setProperty(`--mat-form-field-notch-max-width`,`calc(100% - ${e}px)`)}static ɵfac=function(n){return new(n||i)};static ɵcmp=(function(){let e=[`notch`];return OI({type:i,selectors:[[`div`,`matFormFieldNotchedOutline`,``]],viewQuery:function(s,c){if(s&1&&Ih(e,5),s&2){let y;rw(y=ow())&&(c._notch=y.first)}},hostAttrs:[1,`mdc-notched-outline`],hostVars:2,hostBindings:function(s,c){s&2&&_h(`mdc-notched-outline--notched`,c.open)},inputs:{open:[0,`matFormFieldNotchedOutlineOpen`,`open`]},ngContentSelectors:[`*`],decls:5,vars:0,consts:[[`notch`,``],[1,`mat-mdc-notch-piece`,`mdc-notched-outline__leading`],[1,`mat-mdc-notch-piece`,`mdc-notched-outline__notch`],[1,`mat-mdc-notch-piece`,`mdc-notched-outline__trailing`]],template:function(s,c){s&1&&(ew(),dh(0,`div`,1),ol(1,`div`,2,0),tw(3),il(),dh(4,`div`,3))},encapsulation:2})})()}return i})();var et$2=(()=>{class i{id;ngField=null;ngControl=null;focused=!1;empty=!1;shouldLabelFloat=!1;required=!1;disabled=!1;errorState=!1;controlType;autofilled;userAriaDescribedBy;disableAutomaticLabeling;describedByIds;stateChanges=null;value;static ɵfac=function(n){return new(n||i)};static ɵdir=jI({type:i})}return i})();var tt$1=new x$4(`MatFormField`);var nt$1=new x$4(`MAT_FORM_FIELD_DEFAULT_OPTIONS`);var Qe$2=`fill`;var yt$1=`auto`;var Xe$2=`fixed`;var _t$1=`translateY(-50%)`;var it$1=(()=>{class i{_elementRef=D$4(Hr);_changeDetectorRef=D$4(jF);_platform=D$4(l);_idGenerator=D$4(ne$2);_ngZone=D$4(be$1);_defaults=D$4(nt$1,{optional:!0});_currentDirection;_unwrapMaybeSignal(e){return oi(e)?e():e}_textField;_iconPrefixContainer;_textPrefixContainer;_iconSuffixContainer;_textSuffixContainer;_floatingLabel;_notchedOutline;_lineRipple;_iconPrefixContainerSignal=kF(`iconPrefixContainer`);_textPrefixContainerSignal=kF(`textPrefixContainer`);_iconSuffixContainerSignal=kF(`iconSuffixContainer`);_textSuffixContainerSignal=kF(`textSuffixContainer`);_prefixSuffixContainers=cb(()=>[this._iconPrefixContainerSignal(),this._textPrefixContainerSignal(),this._iconSuffixContainerSignal(),this._textSuffixContainerSignal()].map(e=>e?.nativeElement).filter(e=>e!==void 0));_formFieldControl;_prefixChildren;_suffixChildren;_errorChildren;_hintChildren;_labelChild=PF(ae$1);get hideRequiredMarker(){return this._hideRequiredMarker}set hideRequiredMarker(e){this._hideRequiredMarker=F$3(e)}_hideRequiredMarker=!1;color=`primary`;get floatLabel(){return this._floatLabel||this._defaults?.floatLabel||yt$1}set floatLabel(e){e!==this._floatLabel&&(this._floatLabel=e,this._changeDetectorRef.markForCheck())}_floatLabel;get appearance(){return this._appearanceSignal()}set appearance(e){let n=e||this._defaults?.appearance||Qe$2;this._appearanceSignal.set(n)}_appearanceSignal=ti(Qe$2);get subscriptSizing(){return this._subscriptSizing||this._defaults?.subscriptSizing||Xe$2}set subscriptSizing(e){this._subscriptSizing=e||this._defaults?.subscriptSizing||Xe$2}_subscriptSizing=null;get hintLabel(){return this._hintLabel}set hintLabel(e){this._hintLabel=e,this._processHints()}_hintLabel=``;_hasIconPrefix=!1;_hasTextPrefix=!1;_hasIconSuffix=!1;_hasTextSuffix=!1;_labelId=this._idGenerator.getId(`mat-mdc-form-field-label-`);_hintLabelId=this._idGenerator.getId(`mat-mdc-hint-`);_describedByIds;get _control(){return this._explicitFormFieldControl||this._formFieldControl}set _control(e){this._explicitFormFieldControl=e}_destroyed=new X$2;_isFocused=null;_explicitFormFieldControl;_previousControl=null;_previousControlValidatorFn=null;_stateChanges;_valueChanges;_describedByChanges;_outlineLabelOffsetResizeObserver=null;_animationsDisabled=K();constructor(){let e=this._defaults,n=D$4(A$3);e&&(e.appearance&&(this.appearance=e.appearance),this._hideRequiredMarker=!!e?.hideRequiredMarker,e.color&&(this.color=e.color)),td(()=>this._currentDirection=n.valueSignal()),this._syncOutlineLabelOffset()}ngAfterViewInit(){this._updateFocusState(),this._animationsDisabled||this._ngZone.runOutsideAngular(()=>{setTimeout(()=>{this._elementRef.nativeElement.classList.add(`mat-form-field-animations-enabled`)},300)}),this._changeDetectorRef.detectChanges()}ngAfterContentInit(){this._assertFormFieldControl(),this._initializeSubscript(),this._initializePrefixAndSuffix()}ngAfterContentChecked(){this._assertFormFieldControl(),this._control!==this._previousControl&&(this._initializeControl(this._previousControl),this._control.ngControl&&this._control.ngControl.control&&(this._previousControlValidatorFn=O(this._control.ngField)?null:this._control.ngControl.control.validator),this._previousControl=this._control,this._changeDetectorRef.markForCheck()),this._control.ngControl&&this._control.ngControl.control&&!O(this._control.ngField)&&this._control.ngControl.control.validator!==this._previousControlValidatorFn&&this._changeDetectorRef.markForCheck()}ngOnDestroy(){this._outlineLabelOffsetResizeObserver?.disconnect(),this._stateChanges?.unsubscribe(),this._valueChanges?.unsubscribe(),this._describedByChanges?.unsubscribe(),this._destroyed.next(),this._destroyed.complete()}getLabelId=cb(()=>this._hasFloatingLabel()?this._labelId:null);getConnectedOverlayOrigin(){return this._textField||this._elementRef}_animateAndLockLabel(){this._hasFloatingLabel()&&(this.floatLabel=`always`)}_initializeControl(e){let n=this._control,r=`mat-mdc-form-field-type-`;e&&this._elementRef.nativeElement.classList.remove(r+e.controlType),n.controlType&&this._elementRef.nativeElement.classList.add(r+n.controlType),this._stateChanges?.unsubscribe(),this._stateChanges=n.stateChanges?.subscribe(()=>{this._updateFocusState(),this._changeDetectorRef.markForCheck()}),this._describedByChanges?.unsubscribe(),this._describedByChanges=n.stateChanges?.pipe(Ll([void 0,void 0]),bt$4(()=>[this._unwrapMaybeSignal(n.errorState),n.userAriaDescribedBy]),Gg(),ln$1(([[s,c],[y,R]])=>s!==y||c!==R)).subscribe(()=>this._syncDescribedByIds()),this._valueChanges?.unsubscribe(),n.ngControl&&n.ngControl.valueChanges&&!O(n.ngField)&&(this._valueChanges=n.ngControl.valueChanges.pipe(Yg(this._destroyed)).subscribe(()=>this._changeDetectorRef.markForCheck()))}_checkPrefixAndSuffixTypes(){this._hasIconPrefix=!!this._prefixChildren.find(e=>!e._isText),this._hasTextPrefix=!!this._prefixChildren.find(e=>e._isText),this._hasIconSuffix=!!this._suffixChildren.find(e=>!e._isText),this._hasTextSuffix=!!this._suffixChildren.find(e=>e._isText)}_initializePrefixAndSuffix(){this._checkPrefixAndSuffixTypes(),Pg(this._prefixChildren.changes,this._suffixChildren.changes).subscribe(()=>{this._checkPrefixAndSuffixTypes(),this._changeDetectorRef.markForCheck()})}_initializeSubscript(){this._hintChildren.changes.subscribe(()=>{this._processHints(),this._changeDetectorRef.markForCheck()}),this._errorChildren.changes.subscribe(()=>{this._syncDescribedByIds(),this._changeDetectorRef.markForCheck()}),this._validateHints(),this._syncDescribedByIds()}_assertFormFieldControl(){this._control}_updateFocusState(){let e=this._unwrapMaybeSignal(this._control.focused);e&&!this._isFocused?(this._isFocused=!0,this._lineRipple?.activate()):!e&&(this._isFocused||this._isFocused===null)&&(this._isFocused=!1,this._lineRipple?.deactivate()),this._elementRef.nativeElement.classList.toggle(`mat-focused`,e),this._textField?.nativeElement.classList.toggle(`mdc-text-field--focused`,e)}_syncOutlineLabelOffset(){$F({earlyRead:()=>{if(this._appearanceSignal()!==`outline`)return this._outlineLabelOffsetResizeObserver?.disconnect(),null;if(globalThis.ResizeObserver){this._outlineLabelOffsetResizeObserver||=new globalThis.ResizeObserver(()=>{this._writeOutlinedLabelStyles(this._getOutlinedLabelOffset())});for(let e of this._prefixSuffixContainers())this._outlineLabelOffsetResizeObserver.observe(e,{box:`border-box`})}return this._getOutlinedLabelOffset()},write:e=>this._writeOutlinedLabelStyles(e())})}_shouldAlwaysFloat(){return this.floatLabel===`always`}_hasOutline(){return this.appearance===`outline`}_forceDisplayInfixLabel(){return!this._platform.isBrowser&&this._prefixChildren.length&&!this._shouldLabelFloat()}_hasFloatingLabel=cb(()=>!!this._labelChild());_shouldLabelFloat(){return this._hasFloatingLabel()?this._shouldAlwaysFloat()||this._unwrapMaybeSignal(this._control.shouldLabelFloat):!1}_shouldForward(e){let n=this._control?.ngField||this._control?.ngControl;if(!n)return!1;if(O(n)){let r=n();return e===`valid`?r.valid():e===`dirty`?r.dirty():e===`touched`?r.touched():e===`pending`?r.pending():e===`untouched`?!r.touched():e===`pristine`?!r.dirty():e===`invalid`?!r.valid():!1}else{let r=n;return e===`valid`?r.valid:e===`dirty`?r.dirty:e===`touched`?r.touched:e===`pending`?r.pending:e===`untouched`?r.untouched:e===`pristine`?r.pristine:e===`invalid`?r.invalid:!1}}_getSubscriptMessageType(){return this._errorChildren&&this._errorChildren.length>0&&this._unwrapMaybeSignal(this._control.errorState)?`error`:`hint`}_handleLabelResized(){this._refreshOutlineNotchWidth()}_refreshOutlineNotchWidth(){!this._hasOutline()||!this._floatingLabel||!this._shouldLabelFloat()?this._notchedOutline?._setNotchWidth(0):this._notchedOutline?._setNotchWidth(this._floatingLabel.getWidth())}_processHints(){this._validateHints(),this._syncDescribedByIds()}_validateHints(){this._hintChildren}_syncDescribedByIds(){if(this._control){let e=[];if(this._control.userAriaDescribedBy&&typeof this._control.userAriaDescribedBy==`string`&&e.push(...this._control.userAriaDescribedBy.split(` `)),this._getSubscriptMessageType()===`hint`){let s=this._hintChildren?this._hintChildren.find(y=>y.align===`start`):null,c=this._hintChildren?this._hintChildren.find(y=>y.align===`end`):null;s?e.push(s.id):this._hintLabel&&e.push(this._hintLabelId),c&&e.push(c.id)}else this._errorChildren&&e.push(...this._errorChildren.map(s=>s.id));let n=this._control.describedByIds,r;if(n){let s=this._describedByIds||e;r=e.concat(n.filter(c=>c&&!s.includes(c)))}else r=e;this._control.setDescribedByIds(r),this._describedByIds=e}}_getOutlinedLabelOffset(){if(!this._hasOutline()||!this._floatingLabel)return null;if(!this._iconPrefixContainer&&!this._textPrefixContainer)return[``,null];if(!this._isAttachedToDom())return null;let e=this._iconPrefixContainer?.nativeElement,n=this._textPrefixContainer?.nativeElement,r=this._iconSuffixContainer?.nativeElement,s=this._textSuffixContainer?.nativeElement,c=e?.getBoundingClientRect().width??0,y=n?.getBoundingClientRect().width??0,R=r?.getBoundingClientRect().width??0,j=s?.getBoundingClientRect().width??0;return[`var(--mat-mdc-form-field-label-transform, ${_t$1} translateX(${`calc(${this._currentDirection===`rtl`?`-1`:`1`} * (${`${c+y}px`} + var(--mat-mdc-form-field-label-offset-x, 0px)))`}))`,c+y+R+j]}_writeOutlinedLabelStyles(e){if(e!==null){let[n,r]=e;this._floatingLabel&&(this._floatingLabel.element.style.transform=n),r!==null&&this._notchedOutline?._setMaxWidth(r)}}_isAttachedToDom(){let e=this._elementRef.nativeElement;if(e.getRootNode){let n=e.getRootNode();return n&&n!==e}return document.documentElement.contains(e)}static ɵfac=function(n){return new(n||i)};static ɵcmp=(function(){let e=[`iconPrefixContainer`],n=[`textPrefixContainer`],r=[`iconSuffixContainer`],s=[`textSuffixContainer`],c=[`textField`],y=[`*`,[[`mat-label`]],[[``,`matPrefix`,``],[``,`matIconPrefix`,``]],[[``,`matTextPrefix`,``]],[[``,`matTextSuffix`,``]],[[``,`matSuffix`,``],[``,`matIconSuffix`,``]],[[`mat-error`],[``,`matError`,``]],[[`mat-hint`,3,`align`,`end`]],[[`mat-hint`,`align`,`end`]]],R=[`*`,`mat-label`,`[matPrefix], [matIconPrefix]`,`[matTextPrefix]`,`[matTextSuffix]`,`[matSuffix], [matIconSuffix]`,`mat-error, [matError]`,`mat-hint:not([align='end'])`,`mat-hint[align='end']`];function j(o,a){o&1&&uh(0,`span`,21)}function q(o,a){if(o&1&&(Oi(0,`label`,20),tw(1,1),RD(2,j,1,0,`span`,21),rl()),o&2){let t=JD(2);lh(`floating`,t._shouldLabelFloat())(`monitorResize`,t._hasOutline())(`id`,t._labelId),ch(`for`,t._control.disableAutomaticLabeling?null:t._control.id),sE(2),kD(!t.hideRequiredMarker&&t._unwrapMaybeSignal(t._control.required)?2:-1)}}function H(o,a){if(o&1&&RD(0,q,3,5,`label`,20),o&2){let t=JD();kD(t._hasFloatingLabel()?0:-1)}}function ce(o,a){o&1&&uh(0,`div`,7)}function K(o,a){}function U(o,a){if(o&1&&Zp(0,K,0,0,`ng-template`,13),o&2){JD(2);let t=sw(1);lh(`ngTemplateOutlet`,t)}}function W(o,a){if(o&1&&(Oi(0,`div`,9),RD(1,U,1,1,null,13),rl()),o&2){let t=JD();lh(`matFormFieldNotchedOutlineOpen`,t._shouldLabelFloat()),sE(),kD(t._forceDisplayInfixLabel()?-1:1)}}function rt(o,a){o&1&&(Oi(0,`div`,10,2),tw(2,2),rl())}function ot(o,a){o&1&&(Oi(0,`div`,11,3),tw(2,3),rl())}function at(o,a){}function lt(o,a){if(o&1&&Zp(0,at,0,0,`ng-template`,13),o&2){JD();let t=sw(1);lh(`ngTemplateOutlet`,t)}}function dt(o,a){o&1&&(Oi(0,`div`,14,4),tw(2,4),rl())}function st(o,a){o&1&&(Oi(0,`div`,15,5),tw(2,5),rl())}function ct(o,a){o&1&&uh(0,`div`,16)}function ft(o,a){o&1&&(Oi(0,`div`,18),tw(1,6),rl())}function mt(o,a){if(o&1&&(Oi(0,`mat-hint`,22),Mw(1),rl()),o&2){let t=JD(2);lh(`id`,t._hintLabelId),sE(),kh(t.hintLabel)}}function ut(o,a){if(o&1&&(Oi(0,`div`,19),RD(1,mt,2,2,`mat-hint`,22),tw(2,7),uh(3,`div`,23),tw(4,8),rl()),o&2){let t=JD();sE(),kD(t.hintLabel?1:-1)}}return OI({type:i,selectors:[[`mat-form-field`]],contentQueries:function(a,t,l){if(a&1&&(Dh(l,t._labelChild,ae$1,5),Eh(l,et$2,5)(l,Ze$2,5)(l,se$1,5)(l,de$1,5)(l,le$1,5)),a&2){iw();let u;rw(u=ow())&&(t._formFieldControl=u.first),rw(u=ow())&&(t._prefixChildren=u),rw(u=ow())&&(t._suffixChildren=u),rw(u=ow())&&(t._errorChildren=u),rw(u=ow())&&(t._hintChildren=u)}},viewQuery:function(a,t){if(a&1&&(wh(t._iconPrefixContainerSignal,e,5)(t._textPrefixContainerSignal,n,5)(t._iconSuffixContainerSignal,r,5)(t._textSuffixContainerSignal,s,5),Ih(c,5)(e,5)(n,5)(r,5)(s,5)(We$2,5)(Ye$2,5)($e$2,5)),a&2){iw(4);let l;rw(l=ow())&&(t._textField=l.first),rw(l=ow())&&(t._iconPrefixContainer=l.first),rw(l=ow())&&(t._textPrefixContainer=l.first),rw(l=ow())&&(t._iconSuffixContainer=l.first),rw(l=ow())&&(t._textSuffixContainer=l.first),rw(l=ow())&&(t._floatingLabel=l.first),rw(l=ow())&&(t._notchedOutline=l.first),rw(l=ow())&&(t._lineRipple=l.first)}},hostAttrs:[1,`mat-mdc-form-field`],hostVars:38,hostBindings:function(a,t){a&2&&_h(`mat-mdc-form-field-label-always-float`,t._shouldAlwaysFloat())(`mat-mdc-form-field-has-icon-prefix`,t._hasIconPrefix)(`mat-mdc-form-field-has-icon-suffix`,t._hasIconSuffix)(`mat-form-field-invalid`,t._unwrapMaybeSignal(t._control.errorState))(`mat-form-field-disabled`,t._unwrapMaybeSignal(t._control.disabled))(`mat-form-field-autofilled`,t._unwrapMaybeSignal(t._control.autofilled))(`mat-form-field-appearance-fill`,t.appearance==`fill`)(`mat-form-field-appearance-outline`,t.appearance==`outline`)(`mat-form-field-hide-placeholder`,t._hasFloatingLabel()&&!t._shouldLabelFloat())(`mat-primary`,t.color!==`accent`&&t.color!==`warn`)(`mat-accent`,t.color===`accent`)(`mat-warn`,t.color===`warn`)(`ng-untouched`,t._shouldForward(`untouched`))(`ng-touched`,t._shouldForward(`touched`))(`ng-pristine`,t._shouldForward(`pristine`))(`ng-dirty`,t._shouldForward(`dirty`))(`ng-valid`,t._shouldForward(`valid`))(`ng-invalid`,t._shouldForward(`invalid`))(`ng-pending`,t._shouldForward(`pending`))},inputs:{hideRequiredMarker:`hideRequiredMarker`,color:`color`,floatLabel:`floatLabel`,appearance:`appearance`,subscriptSizing:`subscriptSizing`,hintLabel:`hintLabel`},exportAs:[`matFormField`],features:[$w([{provide:tt$1,useExisting:i},{provide:Je$2,useExisting:i}])],ngContentSelectors:R,decls:18,vars:21,consts:[[`labelTemplate`,``],[`textField`,``],[`iconPrefixContainer`,``],[`textPrefixContainer`,``],[`textSuffixContainer`,``],[`iconSuffixContainer`,``],[1,`mat-mdc-text-field-wrapper`,`mdc-text-field`,3,`click`],[1,`mat-mdc-form-field-focus-overlay`],[1,`mat-mdc-form-field-flex`],[`matFormFieldNotchedOutline`,``,3,`matFormFieldNotchedOutlineOpen`],[1,`mat-mdc-form-field-icon-prefix`],[1,`mat-mdc-form-field-text-prefix`],[1,`mat-mdc-form-field-infix`],[3,`ngTemplateOutlet`],[1,`mat-mdc-form-field-text-suffix`],[1,`mat-mdc-form-field-icon-suffix`],[`matFormFieldLineRipple`,``],[`aria-atomic`,`true`,`aria-live`,`polite`,1,`mat-mdc-form-field-subscript-wrapper`,`mat-mdc-form-field-bottom-align`],[1,`mat-mdc-form-field-error-wrapper`],[1,`mat-mdc-form-field-hint-wrapper`],[`matFormFieldFloatingLabel`,``,3,`floating`,`monitorResize`,`id`],[`aria-hidden`,`true`,1,`mat-mdc-form-field-required-marker`,`mdc-floating-label--required`],[3,`id`],[1,`mat-mdc-form-field-hint-spacer`]],template:function(a,t){if(a&1&&(ew(y),Zp(0,H,1,1,`ng-template`,null,0,rb),Oi(2,`div`,6,1),mh(`click`,function(u){return t._control.onContainerClick(u)}),RD(4,ce,1,0,`div`,7),Oi(5,`div`,8),RD(6,W,2,2,`div`,9),RD(7,rt,3,0,`div`,10),RD(8,ot,3,0,`div`,11),Oi(9,`div`,12),RD(10,lt,1,1,null,13),tw(11),rl(),RD(12,dt,3,0,`div`,14),RD(13,st,3,0,`div`,15),rl(),RD(14,ct,1,0,`div`,16),rl(),Oi(15,`div`,17),RD(16,ft,2,0,`div`,18)(17,ut,5,1,`div`,19),rl()),a&2){let l,u=t._unwrapMaybeSignal(t._control.disabled);sE(2),_h(`mdc-text-field--filled`,!t._hasOutline())(`mdc-text-field--outlined`,t._hasOutline())(`mdc-text-field--no-label`,!t._hasFloatingLabel())(`mdc-text-field--disabled`,u)(`mdc-text-field--invalid`,t._unwrapMaybeSignal(t._control.errorState)),sE(2),kD(!t._hasOutline()&&!u?4:-1),sE(2),kD(t._hasOutline()?6:-1),sE(),kD(t._hasIconPrefix?7:-1),sE(),kD(t._hasTextPrefix?8:-1),sE(2),kD(!t._hasOutline()||t._forceDisplayInfixLabel()?10:-1),sE(2),kD(t._hasTextSuffix?12:-1),sE(),kD(t._hasIconSuffix?13:-1),sE(),kD(t._hasOutline()?-1:14),sE(),_h(`mat-mdc-form-field-subscript-dynamic-size`,t.subscriptSizing===`dynamic`);let ht=t._getSubscriptMessageType();sE(),kD((l=ht)===`error`?16:l===`hint`?17:-1)}},dependencies:[We$2,Ye$2,Ws,$e$2,le$1],styles:[`.mdc-text-field {
  display: inline-flex;
  align-items: baseline;
  padding: 0 16px;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  will-change: opacity, transform, color;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.mdc-text-field__input {
  width: 100%;
  min-width: 0;
  border: none;
  border-radius: 0;
  background: none;
  padding: 0;
  -moz-appearance: none;
  -webkit-appearance: none;
  height: 28px;
}
.mdc-text-field__input::-webkit-calendar-picker-indicator, .mdc-text-field__input::-webkit-search-cancel-button {
  display: none;
}
.mdc-text-field__input::-ms-clear {
  display: none;
}
.mdc-text-field__input:focus {
  outline: none;
}
.mdc-text-field__input:invalid {
  box-shadow: none;
}
.mdc-text-field__input::placeholder {
  opacity: 0;
}
.mdc-text-field__input::-moz-placeholder {
  opacity: 0;
}
.mdc-text-field__input::-webkit-input-placeholder {
  opacity: 0;
}
.mdc-text-field__input:-ms-input-placeholder {
  opacity: 0;
}
.mdc-text-field--no-label .mdc-text-field__input::placeholder, .mdc-text-field--focused .mdc-text-field__input::placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input::-moz-placeholder, .mdc-text-field--focused .mdc-text-field__input::-moz-placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input::-webkit-input-placeholder, .mdc-text-field--focused .mdc-text-field__input::-webkit-input-placeholder {
  opacity: 1;
}
.mdc-text-field--no-label .mdc-text-field__input:-ms-input-placeholder, .mdc-text-field--focused .mdc-text-field__input:-ms-input-placeholder {
  opacity: 1;
}
.mdc-text-field--%NS%disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::placeholder {
  opacity: 0;
}
.mdc-text-field--%NS%disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::-moz-placeholder {
  opacity: 0;
}
.mdc-text-field--%NS%disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive::-webkit-input-placeholder {
  opacity: 0;
}
.mdc-text-field--%NS%disabled:not(.mdc-text-field--no-label) .mdc-text-field__input.mat-mdc-input-disabled-interactive:-ms-input-placeholder {
  opacity: 0;
}
.mdc-text-field--outlined .mdc-text-field__input, .mdc-text-field--filled.mdc-text-field--no-label .mdc-text-field__input {
  height: 100%;
}
.mdc-text-field--outlined .mdc-text-field__input {
  display: flex;
  border: none !important;
  background-color: transparent;
}
.mdc-text-field--disabled .mdc-text-field__input {
  pointer-events: auto;
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input {
  color: var(--%NS%mat-form-field-filled-input-text-color, var(--%NS%mat-sys-on-surface));
  caret-color: var(--%NS%mat-form-field-filled-caret-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input::placeholder {
  color: var(--%NS%mat-form-field-filled-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input::-moz-placeholder {
  color: var(--%NS%mat-form-field-filled-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--%NS%mat-form-field-filled-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-text-field__input:-ms-input-placeholder {
  color: var(--%NS%mat-form-field-filled-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input {
  color: var(--%NS%mat-form-field-outlined-input-text-color, var(--%NS%mat-sys-on-surface));
  caret-color: var(--%NS%mat-form-field-outlined-caret-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::placeholder {
  color: var(--%NS%mat-form-field-outlined-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::-moz-placeholder {
  color: var(--%NS%mat-form-field-outlined-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--%NS%mat-form-field-outlined-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-text-field__input:-ms-input-placeholder {
  color: var(--%NS%mat-form-field-outlined-input-text-placeholder-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled) .mdc-text-field__input {
  caret-color: var(--%NS%mat-form-field-filled-error-caret-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--outlined.mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled) .mdc-text-field__input {
  caret-color: var(--%NS%mat-form-field-outlined-error-caret-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-text-field__input {
  color: var(--%NS%mat-form-field-filled-disabled-input-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mdc-text-field__input {
  color: var(--%NS%mat-form-field-outlined-disabled-input-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
@media (forced-colors: active) {
  .mdc-text-field--disabled .mdc-text-field__input {
    background-color: Window;
  }
}

.mdc-text-field--filled {
  height: 56px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
  border-top-left-radius: var(--%NS%mat-form-field-filled-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-top-right-radius: var(--%NS%mat-form-field-filled-container-shape, var(--%NS%mat-sys-corner-extra-small));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) {
  background-color: var(--%NS%mat-form-field-filled-container-color, var(--%NS%mat-sys-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--disabled {
  background-color: var(--%NS%mat-form-field-filled-disabled-container-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 4%, transparent));
}

.mdc-text-field--outlined {
  height: 56px;
  overflow: visible;
  padding-right: max(16px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)));
  padding-left: max(16px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)) + 4px);
}
[dir=rtl] .mdc-text-field--outlined {
  padding-right: max(16px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)) + 4px);
  padding-left: max(16px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)));
}

.mdc-floating-label {
  position: absolute;
  left: 0;
  transform-origin: left top;
  line-height: 1.15rem;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
  overflow: hidden;
  will-change: transform;
}
[dir=rtl] .mdc-floating-label {
  right: 0;
  left: auto;
  transform-origin: right top;
  text-align: right;
}
.mdc-text-field .mdc-floating-label {
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.mdc-notched-outline .mdc-floating-label {
  display: inline-block;
  position: relative;
  max-width: 100%;
}
.mdc-text-field--outlined .mdc-floating-label {
  left: 4px;
  right: auto;
}
[dir=rtl] .mdc-text-field--outlined .mdc-floating-label {
  left: auto;
  right: 4px;
}
.mdc-text-field--filled .mdc-floating-label {
  left: 16px;
  right: auto;
}
[dir=rtl] .mdc-text-field--filled .mdc-floating-label {
  left: auto;
  right: 16px;
}
.mdc-text-field--disabled .mdc-floating-label {
  cursor: default;
}
@media (forced-colors: active) {
  .mdc-text-field--disabled .mdc-floating-label {
    z-index: 1;
  }
}
.mdc-text-field--filled.mdc-text-field--no-label .mdc-floating-label {
  display: none;
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-label-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-focus-label-text-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-hover-label-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-error-label-text-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-error-focus-label-text-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled):hover .mdc-floating-label {
  color: var(--%NS%mat-form-field-filled-error-hover-label-text-color, var(--%NS%mat-sys-on-error-container));
}
.mdc-text-field--filled .mdc-floating-label {
  font-family: var(--%NS%mat-form-field-filled-label-text-font, var(--%NS%mat-sys-body-large-font));
  font-size: var(--%NS%mat-form-field-filled-label-text-size, var(--%NS%mat-sys-body-large-size));
  font-weight: var(--%NS%mat-form-field-filled-label-text-weight, var(--%NS%mat-sys-body-large-weight));
  letter-spacing: var(--%NS%mat-form-field-filled-label-text-tracking, var(--%NS%mat-sys-body-large-tracking));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-label-text-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-focus-label-text-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-hover-label-text-color, var(--%NS%mat-sys-on-surface));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-disabled-label-text-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-error-label-text-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-error-focus-label-text-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled):hover .mdc-floating-label {
  color: var(--%NS%mat-form-field-outlined-error-hover-label-text-color, var(--%NS%mat-sys-on-error-container));
}
.mdc-text-field--outlined .mdc-floating-label {
  font-family: var(--%NS%mat-form-field-outlined-label-text-font, var(--%NS%mat-sys-body-large-font));
  font-size: var(--%NS%mat-form-field-outlined-label-text-size, var(--%NS%mat-sys-body-large-size));
  font-weight: var(--%NS%mat-form-field-outlined-label-text-weight, var(--%NS%mat-sys-body-large-weight));
  letter-spacing: var(--%NS%mat-form-field-outlined-label-text-tracking, var(--%NS%mat-sys-body-large-tracking));
}

.mdc-floating-label--float-above {
  cursor: auto;
  transform: translateY(-106%) scale(0.75);
}
.mdc-text-field--filled .mdc-floating-label--float-above {
  transform: translateY(-106%) scale(0.75);
}
.mdc-text-field--outlined .mdc-floating-label--float-above {
  transform: translateY(-37.25px) scale(1);
  font-size: 0.75rem;
}
.mdc-notched-outline .mdc-floating-label--float-above {
  text-overflow: clip;
}
.mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  max-width: 133.3333333333%;
}
.mdc-text-field--outlined.mdc-notched-outline--upgraded .mdc-floating-label--float-above, .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  transform: translateY(-34.75px) scale(0.75);
}
.mdc-text-field--outlined.mdc-notched-outline--upgraded .mdc-floating-label--float-above, .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  font-size: 1rem;
}

.mdc-floating-label--%NS%required:not(.mdc-floating-label--hide-required-marker)::after {
  margin-left: 1px;
  margin-right: 0;
  content: "*";
}
[dir=rtl] .mdc-floating-label--%NS%required:not(.mdc-floating-label--hide-required-marker)::after {
  margin-left: 0;
  margin-right: 1px;
}

.mdc-notched-outline {
  display: flex;
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 100%;
  text-align: left;
  pointer-events: none;
}
[dir=rtl] .mdc-notched-outline {
  text-align: right;
}
.mdc-text-field--outlined .mdc-notched-outline {
  z-index: 1;
}

.mat-mdc-notch-piece {
  box-sizing: border-box;
  height: 100%;
  pointer-events: none;
  border: none;
  border-top: 1px solid;
  border-bottom: 1px solid;
}
.mdc-text-field--focused .mat-mdc-notch-piece {
  border-width: 2px;
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled) .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-outline-color, var(--%NS%mat-sys-outline));
  border-width: var(--%NS%mat-form-field-outlined-outline-width, 1px);
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-hover-outline-color, var(--%NS%mat-sys-on-surface));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-focus-outline-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--outlined.mdc-text-field--disabled .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-disabled-outline-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 12%, transparent));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-error-outline-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--%NS%invalid:not(.mdc-text-field--focused):hover .mdc-notched-outline .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-error-hover-outline-color, var(--%NS%mat-sys-on-error-container));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--invalid.mdc-text-field--focused .mat-mdc-notch-piece {
  border-color: var(--%NS%mat-form-field-outlined-error-focus-outline-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-notched-outline .mat-mdc-notch-piece {
  border-width: var(--%NS%mat-form-field-outlined-focus-outline-width, 2px);
}

.mdc-notched-outline__leading {
  border-left: 1px solid;
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-bottom-left-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
}
.mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__leading {
  width: max(12px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small)));
}
[dir=rtl] .mdc-notched-outline__leading {
  border-left: none;
  border-right: 1px solid;
  border-bottom-left-radius: 0;
  border-top-left-radius: 0;
  border-top-right-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-bottom-right-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
}

.mdc-notched-outline__trailing {
  flex-grow: 1;
  border-left: none;
  border-right: 1px solid;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-bottom-right-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
}
[dir=rtl] .mdc-notched-outline__trailing {
  border-left: 1px solid;
  border-right: none;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
  border-bottom-left-radius: var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small));
}

.mdc-notched-outline__notch {
  flex: 0 0 auto;
  width: auto;
}
.mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__notch {
  max-width: min(var(--%NS%mat-form-field-notch-max-width, 100%), calc(100% - max(12px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small))) * 2));
}
.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  max-width: min(100%, calc(100% - max(12px, var(--%NS%mat-form-field-outlined-container-shape, var(--%NS%mat-sys-corner-extra-small))) * 2));
}
.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-top: 1px;
}
.mdc-text-field--focused.mdc-text-field--outlined .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-top: 2px;
}
.mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-left: 0;
  padding-right: 8px;
  border-top: none;
}
[dir=rtl] .mdc-notched-outline--notched .mdc-notched-outline__notch {
  padding-left: 8px;
  padding-right: 0;
}
.mdc-notched-outline--no-label .mdc-notched-outline__notch {
  display: none;
}

.mdc-line-ripple::before, .mdc-line-ripple::after {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-bottom-style: solid;
  content: "";
}
.mdc-line-ripple::before {
  z-index: 1;
  border-bottom-width: var(--%NS%mat-form-field-filled-active-indicator-height, 1px);
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-active-indicator-color, var(--%NS%mat-sys-on-surface-variant));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-hover-active-indicator-color, var(--%NS%mat-sys-on-surface));
}
.mdc-text-field--filled.mdc-text-field--disabled .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-disabled-active-indicator-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--invalid .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-error-active-indicator-color, var(--%NS%mat-sys-error));
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled).mdc-text-field--%NS%invalid:not(.mdc-text-field--focused):hover .mdc-line-ripple::before {
  border-bottom-color: var(--%NS%mat-form-field-filled-error-hover-active-indicator-color, var(--%NS%mat-sys-on-error-container));
}
.mdc-line-ripple::after {
  transform: scaleX(0);
  opacity: 0;
  z-index: 2;
}
.mdc-text-field--filled .mdc-line-ripple::after {
  border-bottom-width: var(--%NS%mat-form-field-filled-focus-active-indicator-height, 2px);
}
.mdc-text-field--%NS%filled:not(.mdc-text-field--disabled) .mdc-line-ripple::after {
  border-bottom-color: var(--%NS%mat-form-field-filled-focus-active-indicator-color, var(--%NS%mat-sys-primary));
}
.mdc-text-field--filled.mdc-text-field--%NS%invalid:not(.mdc-text-field--disabled) .mdc-line-ripple::after {
  border-bottom-color: var(--%NS%mat-form-field-filled-error-focus-active-indicator-color, var(--%NS%mat-sys-error));
}

.mdc-line-ripple--%NS%active::after {
  transform: scaleX(1);
  opacity: 1;
}

.mdc-line-ripple--%NS%deactivating::after {
  opacity: 0;
}

.mdc-text-field--disabled {
  pointer-events: none;
}

.mat-mdc-form-field-textarea-control {
  vertical-align: middle;
  resize: vertical;
  box-sizing: border-box;
  height: auto;
  margin: 0;
  padding: 0;
  border: none;
  overflow: auto;
}

.mat-mdc-form-field-input-control.mat-mdc-form-field-input-control {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font: inherit;
  letter-spacing: inherit;
  text-decoration: inherit;
  text-transform: inherit;
  border: none;
}

.mat-mdc-form-field .mat-mdc-floating-label.mdc-floating-label {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  line-height: normal;
  pointer-events: all;
  will-change: auto;
}

.mat-mdc-form-field:not(.mat-form-field-disabled) .mat-mdc-floating-label.mdc-floating-label {
  cursor: inherit;
}

.mdc-text-field--%NS%no-label:not(.mdc-text-field--textarea) .mat-mdc-form-field-input-control.mdc-text-field__input,
.mat-mdc-text-field-wrapper .mat-mdc-form-field-input-control {
  height: auto;
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-input-control.mdc-text-field__input[type=color] {
  height: 23px;
}

.mat-mdc-text-field-wrapper {
  height: auto;
  flex: auto;
  will-change: auto;
}

.mat-mdc-form-field-has-icon-prefix .mat-mdc-text-field-wrapper {
  padding-left: 0;
  --%NS%mat-mdc-form-field-label-offset-x: -16px;
}

.mat-mdc-form-field-has-icon-suffix .mat-mdc-text-field-wrapper {
  padding-right: 0;
}

[dir=rtl] .mat-mdc-text-field-wrapper {
  padding-left: 16px;
  padding-right: 16px;
}
[dir=rtl] .mat-mdc-form-field-has-icon-suffix .mat-mdc-text-field-wrapper {
  padding-left: 0;
}
[dir=rtl] .mat-mdc-form-field-has-icon-prefix .mat-mdc-text-field-wrapper {
  padding-right: 0;
}

.mat-form-field-disabled .mdc-text-field__input::placeholder {
  color: var(--%NS%mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input::-moz-placeholder {
  color: var(--%NS%mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input::-webkit-input-placeholder {
  color: var(--%NS%mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-disabled .mdc-text-field__input:-ms-input-placeholder {
  color: var(--%NS%mat-form-field-disabled-input-text-placeholder-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}

.mat-mdc-form-field-label-always-float .mdc-text-field__input::placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
  opacity: 1;
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-infix .mat-mdc-floating-label {
  left: auto;
  right: auto;
}

.mat-mdc-text-field-wrapper.mdc-text-field--outlined .mdc-text-field__input {
  display: inline-block;
}

.mat-mdc-form-field .mat-mdc-text-field-wrapper.mdc-text-field .mdc-notched-outline__notch {
  padding-top: 0;
}

.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field .mdc-notched-outline__notch {
  border-left: 1px solid transparent;
}

[dir=rtl] .mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field.mat-mdc-form-field .mdc-notched-outline__notch {
  border-left: none;
  border-right: 1px solid transparent;
}

.mat-mdc-form-field-infix {
  min-height: var(--%NS%mat-form-field-container-height, 56px);
  padding-top: var(--%NS%mat-form-field-filled-with-label-container-padding-top, 24px);
  padding-bottom: var(--%NS%mat-form-field-filled-with-label-container-padding-bottom, 8px);
}
.mdc-text-field--outlined .mat-mdc-form-field-infix, .mdc-text-field--no-label .mat-mdc-form-field-infix {
  padding-top: var(--%NS%mat-form-field-container-vertical-padding, 16px);
  padding-bottom: var(--%NS%mat-form-field-container-vertical-padding, 16px);
}

.mat-mdc-text-field-wrapper .mat-mdc-form-field-flex .mat-mdc-floating-label {
  top: calc(var(--%NS%mat-form-field-container-height, 56px) / 2);
}

.mdc-text-field--filled .mat-mdc-floating-label {
  display: var(--%NS%mat-form-field-filled-label-display, block);
}

.mat-mdc-text-field-wrapper.mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  --%NS%mat-mdc-form-field-label-transform: translateY(calc(calc(6.75px + var(--%NS%mat-form-field-container-height, 56px) / 2) * -1))
    scale(var(--%NS%mat-mdc-form-field-floating-label-scale, 0.75));
  transform: var(--%NS%mat-mdc-form-field-label-transform);
}

@keyframes _mat-form-field-subscript-animation {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.mat-mdc-form-field-subscript-wrapper {
  box-sizing: border-box;
  width: 100%;
  position: relative;
}

.mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field-error-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0 16px;
  opacity: 1;
  transform: translateY(0);
  animation: _mat-form-field-subscript-animation 0ms cubic-bezier(0.55, 0, 0.55, 0.2);
}

.mat-mdc-form-field-subscript-dynamic-size .mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field-subscript-dynamic-size .mat-mdc-form-field-error-wrapper {
  position: static;
}

.mat-mdc-form-field-bottom-align::before {
  content: "";
  display: inline-block;
  height: 16px;
}

.mat-mdc-form-field-bottom-align.mat-mdc-form-field-subscript-dynamic-size::before {
  content: unset;
}

.mat-mdc-form-field-hint-end {
  order: 1;
}

.mat-mdc-form-field-hint-wrapper {
  display: flex;
}

.mat-mdc-form-field-hint-spacer {
  flex: 1 0 1em;
}

.mat-mdc-form-field-error {
  display: block;
  color: var(--%NS%mat-form-field-error-text-color, var(--%NS%mat-sys-error));
}

.mat-mdc-form-field-subscript-wrapper,
.mat-mdc-form-field-bottom-align::before {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-family: var(--%NS%mat-form-field-subscript-text-font, var(--%NS%mat-sys-body-small-font));
  line-height: var(--%NS%mat-form-field-subscript-text-line-height, var(--%NS%mat-sys-body-small-line-height));
  font-size: var(--%NS%mat-form-field-subscript-text-size, var(--%NS%mat-sys-body-small-size));
  letter-spacing: var(--%NS%mat-form-field-subscript-text-tracking, var(--%NS%mat-sys-body-small-tracking));
  font-weight: var(--%NS%mat-form-field-subscript-text-weight, var(--%NS%mat-sys-body-small-weight));
}

.mat-mdc-form-field-focus-overlay {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  position: absolute;
  opacity: 0;
  pointer-events: none;
  background-color: var(--%NS%mat-form-field-state-layer-color, var(--%NS%mat-sys-on-surface));
}
.mat-mdc-text-field-wrapper:hover .mat-mdc-form-field-focus-overlay {
  opacity: var(--%NS%mat-form-field-hover-state-layer-opacity, var(--%NS%mat-sys-hover-state-layer-opacity));
}
.mat-mdc-form-field.mat-focused .mat-mdc-form-field-focus-overlay {
  opacity: var(--%NS%mat-form-field-focus-state-layer-opacity, 0);
}

select.mat-mdc-form-field-input-control {
  -moz-appearance: none;
  -webkit-appearance: none;
  background-color: transparent;
  display: inline-flex;
  box-sizing: border-box;
}
select.mat-mdc-form-field-input-control:not(:disabled) {
  cursor: pointer;
}
select.mat-mdc-form-field-input-control:not(.mat-mdc-native-select-inline) option {
  color: var(--%NS%mat-form-field-select-option-text-color, var(--%NS%mat-sys-neutral10));
}
select.mat-mdc-form-field-input-control:not(.mat-mdc-native-select-inline) option:disabled {
  color: var(--%NS%mat-form-field-select-disabled-option-text-color, color-mix(in srgb, var(--%NS%mat-sys-neutral10) 38%, transparent));
}

.mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-infix::after {
  content: "";
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid;
  position: absolute;
  right: 0;
  top: 50%;
  margin-top: -2.5px;
  pointer-events: none;
  color: var(--%NS%mat-form-field-enabled-select-arrow-color, var(--%NS%mat-sys-on-surface-variant));
}
[dir=rtl] .mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-infix::after {
  right: auto;
  left: 0;
}
.mat-mdc-form-field-type-mat-native-select.mat-focused .mat-mdc-form-field-infix::after {
  color: var(--%NS%mat-form-field-focus-select-arrow-color, var(--%NS%mat-sys-primary));
}
.mat-mdc-form-field-type-mat-native-select.mat-form-field-disabled .mat-mdc-form-field-infix::after {
  color: var(--%NS%mat-form-field-disabled-select-arrow-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-input-control {
  padding-right: 15px;
}
[dir=rtl] .mat-mdc-form-field-type-mat-native-select .mat-mdc-form-field-input-control {
  padding-right: 0;
  padding-left: 15px;
}

@media (forced-colors: active) {
  .mat-form-field-appearance-fill .mat-mdc-text-field-wrapper {
    outline: solid 1px;
  }
}
@media (forced-colors: active) {
  .mat-form-field-appearance-fill.mat-form-field-disabled .mat-mdc-text-field-wrapper {
    outline-color: GrayText;
  }
}

@media (forced-colors: active) {
  .mat-form-field-appearance-fill.mat-focused .mat-mdc-text-field-wrapper {
    outline: dashed 3px;
  }
}

@media (forced-colors: active) {
  .mat-mdc-form-field.mat-focused .mdc-notched-outline {
    border: dashed 3px;
  }
}

.mat-mdc-form-field-input-control[type=date], .mat-mdc-form-field-input-control[type=datetime], .mat-mdc-form-field-input-control[type=datetime-local], .mat-mdc-form-field-input-control[type=month], .mat-mdc-form-field-input-control[type=week], .mat-mdc-form-field-input-control[type=time] {
  line-height: 1;
}
.mat-mdc-form-field-input-control::-webkit-datetime-edit {
  line-height: 1;
  padding: 0;
  margin-bottom: -2px;
}

.mat-mdc-form-field {
  --%NS%mat-mdc-form-field-floating-label-scale: 0.75;
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-family: var(--%NS%mat-form-field-container-text-font, var(--%NS%mat-sys-body-large-font));
  line-height: var(--%NS%mat-form-field-container-text-line-height, var(--%NS%mat-sys-body-large-line-height));
  font-size: var(--%NS%mat-form-field-container-text-size, var(--%NS%mat-sys-body-large-size));
  letter-spacing: var(--%NS%mat-form-field-container-text-tracking, var(--%NS%mat-sys-body-large-tracking));
  font-weight: var(--%NS%mat-form-field-container-text-weight, var(--%NS%mat-sys-body-large-weight));
}
.mat-mdc-form-field .mdc-text-field--outlined .mdc-floating-label--float-above {
  font-size: calc(var(--%NS%mat-form-field-outlined-label-text-populated-size) * var(--%NS%mat-mdc-form-field-floating-label-scale));
}
.mat-mdc-form-field .mdc-text-field--outlined .mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  font-size: var(--%NS%mat-form-field-outlined-label-text-populated-size);
}
[dir=rtl] .mat-mdc-form-field {
  text-align: right;
}

.mat-mdc-form-field-flex {
  display: inline-flex;
  align-items: baseline;
  box-sizing: border-box;
  width: 100%;
}

.mat-mdc-text-field-wrapper {
  width: 100%;
  z-index: 0;
}

.mat-mdc-form-field-icon-prefix,
.mat-mdc-form-field-icon-suffix {
  align-self: center;
  line-height: 0;
  pointer-events: auto;
  position: relative;
  z-index: 1;
}
.mat-mdc-form-field-icon-prefix > .mat-icon,
.mat-mdc-form-field-icon-suffix > .mat-icon {
  padding: 0 12px;
  box-sizing: content-box;
}

.mat-mdc-form-field-icon-prefix {
  color: var(--%NS%mat-form-field-leading-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-form-field-disabled .mat-mdc-form-field-icon-prefix {
  color: var(--%NS%mat-form-field-disabled-leading-icon-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}

.mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-trailing-icon-color, var(--%NS%mat-sys-on-surface-variant));
}
.mat-form-field-disabled .mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-disabled-trailing-icon-color, color-mix(in srgb, var(--%NS%mat-sys-on-surface) 38%, transparent));
}
.mat-form-field-invalid .mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-error-trailing-icon-color, var(--%NS%mat-sys-error));
}
.mat-form-field-invalid:not(.mat-focused):not(.mat-form-field-disabled) .mat-mdc-text-field-wrapper:hover .mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-error-hover-trailing-icon-color, var(--%NS%mat-sys-on-error-container));
}
.mat-form-field-invalid.mat-focused .mat-mdc-text-field-wrapper .mat-mdc-form-field-icon-suffix {
  color: var(--%NS%mat-form-field-error-focus-trailing-icon-color, var(--%NS%mat-sys-error));
}

.mat-mdc-form-field-icon-prefix,
[dir=rtl] .mat-mdc-form-field-icon-suffix {
  padding: 0 4px 0 0;
}

.mat-mdc-form-field-icon-suffix,
[dir=rtl] .mat-mdc-form-field-icon-prefix {
  padding: 0 0 0 4px;
}

.mat-mdc-form-field-subscript-wrapper .mat-icon,
.mat-mdc-form-field label .mat-icon {
  width: 1em;
  height: 1em;
  font-size: inherit;
}

.mat-mdc-form-field-infix {
  flex: auto;
  min-width: 0;
  width: 180px;
  position: relative;
  box-sizing: border-box;
}
.mat-mdc-form-field-infix:has(textarea[cols]) {
  width: auto;
}

.mat-mdc-form-field .mdc-notched-outline__notch {
  margin-left: -1px;
  -webkit-clip-path: inset(-9em -999em -9em 1px);
  clip-path: inset(-9em -999em -9em 1px);
}
[dir=rtl] .mat-mdc-form-field .mdc-notched-outline__notch {
  margin-left: 0;
  margin-right: -1px;
  -webkit-clip-path: inset(-9em 1px -9em -999em);
  clip-path: inset(-9em 1px -9em -999em);
}

.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-floating-label {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input {
  transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::-moz-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input::-webkit-input-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field__input:-ms-input-placeholder {
  transition: opacity 67ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::-moz-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::-moz-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input::-webkit-input-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input::-webkit-input-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--no-label .mdc-text-field__input:-ms-input-placeholder, .mat-mdc-form-field.mat-form-field-animations-enabled.mdc-text-field--focused .mdc-text-field__input:-ms-input-placeholder {
  transition-delay: 40ms;
  transition-duration: 110ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-text-field--%NS%filled:not(.mdc-ripple-upgraded):focus .mdc-text-field__ripple::before {
  transition-duration: 75ms;
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mdc-line-ripple::after {
  transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
.mat-mdc-form-field.mat-form-field-animations-enabled .mat-mdc-form-field-hint-wrapper,
.mat-mdc-form-field.mat-form-field-animations-enabled .mat-mdc-form-field-error-wrapper {
  animation-duration: 300ms;
}

.mdc-notched-outline .mdc-floating-label {
  max-width: calc(100% + 1px);
}

.mdc-notched-outline--upgraded .mdc-floating-label--float-above {
  max-width: calc(133.3333333333% + 1px);
}
`],encapsulation:2})})()}return i})();var Qn$1=(()=>{class i{static ɵfac=function(n){return new(n||i)};static ɵmod=LI({type:i});static ɵinj=au({imports:[We$3,it$1,j$2]})}return i})();var Xe$1=(()=>{class n{_renderer;_elementRef;onChange=e=>{};onTouched=()=>{};constructor(e,r){this._renderer=e,this._elementRef=r}setProperty(e,r){this._renderer.setProperty(this._elementRef.nativeElement,e,r)}registerOnTouched(e){this.onTouched=e}registerOnChange(e){this.onChange=e}setDisabledState(e){this.setProperty(`disabled`,e)}static ɵfac=function(r){return new(r||n)(Wr(Ka),Wr(Hr))};static ɵdir=jI({type:n})}return n})();var G$1=(()=>{class n extends Xe$1{static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,features:[zp]})}return n})();var M$1=new x$4(``);var It={provide:M$1,useExisting:ko(()=>St),multi:!0};var St=(()=>{class n extends G$1{writeValue(e){this.setProperty(`checked`,e)}static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[`input`,`type`,`checkbox`,`formControlName`,``,3,`ngNoCva`,``],[`input`,`type`,`checkbox`,`formControl`,``,3,`ngNoCva`,``],[`input`,`type`,`checkbox`,`ngModel`,``,3,`ngNoCva`,``]],hostBindings:function(r,i){r&1&&mh(`change`,function(a){return i.onChange(a.target.checked)})(`blur`,function(){return i.onTouched()})},standalone:!1,features:[$w([It]),zp]})}return n})();var Ft={provide:M$1,useExisting:ko(()=>Ze$1),multi:!0};function Ot(){let n=he$1()?he$1().getUserAgent():``;return/android (\d+)/.test(n.toLowerCase())}var wt=new x$4(``);var Ze$1=(()=>{class n extends Xe$1{_compositionMode;_composing=!1;constructor(e,r,i){super(e,r),this._compositionMode=i,this._compositionMode??=!Ot()}writeValue(e){let r=e??``;this.setProperty(`value`,r)}_handleInput(e){(!this._compositionMode||this._compositionMode&&!this._composing)&&this.onChange(e)}_compositionStart(){this._composing=!0}_compositionEnd(e){this._composing=!1,this._compositionMode&&this.onChange(e)}static ɵfac=function(r){return new(r||n)(Wr(Ka),Wr(Hr),Wr(wt,8))};static ɵdir=jI({type:n,selectors:[[`input`,`formControlName`,``,3,`type`,`checkbox`,3,`ngNoCva`,``],[`textarea`,`formControlName`,``,3,`ngNoCva`,``],[`input`,`formControl`,``,3,`type`,`checkbox`,3,`ngNoCva`,``],[`textarea`,`formControl`,``,3,`ngNoCva`,``],[`input`,`ngModel`,``,3,`type`,`checkbox`,3,`ngNoCva`,``],[`textarea`,`ngModel`,``,3,`ngNoCva`,``],[``,`ngDefaultControl`,``]],hostBindings:function(r,i){r&1&&mh(`input`,function(a){return i._handleInput(a.target.value)})(`blur`,function(){return i.onTouched()})(`compositionstart`,function(){return i._compositionStart()})(`compositionend`,function(a){return i._compositionEnd(a.target.value)})},standalone:!1,features:[$w([Ft]),zp]})}return n})();function Ae(n){return n==null||be(n)===0}function be(n){return n==null?null:Array.isArray(n)||typeof n==`string`?n.length:n instanceof Set?n.size:null}var y=new x$4(``);var de=new x$4(``);var Rt=/^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;var ye=class{static min(t){return Ke$1(t)}static max(t){return Qe$1(t)}static required(t){return Je$1(t)}static requiredTrue(t){return et$1(t)}static email(t){return tt(t)}static minLength(t){return xt(t)}static maxLength(t){return nt(t)}static pattern(t){return rt(t)}static nullValidator(t){return ne()}static compose(t){return ut(t)}static composeAsync(t){return dt(t)}};function Ke$1(n){return t=>{if(t.value==null||n==null)return null;let e=parseFloat(t.value);return!isNaN(e)&&e<n?{min:{min:n,actual:t.value}}:null}}function Qe$1(n){return t=>{if(t.value==null||n==null)return null;let e=parseFloat(t.value);return!isNaN(e)&&e>n?{max:{max:n,actual:t.value}}:null}}function Je$1(n){return Ae(n.value)?{required:!0}:null}function et$1(n){return n.value===!0?null:{required:!0}}function tt(n){return Ae(n.value)||Rt.test(n.value)?null:{email:!0}}function xt(n){return t=>{let e=t.value?.length??be(t.value);return e===null||e===0?null:e<n?{minlength:{requiredLength:n,actualLength:e}}:null}}function nt(n){return t=>{let e=t.value?.length??be(t.value);return e!==null&&e>n?{maxlength:{requiredLength:n,actualLength:e}}:null}}function rt(n){if(!n)return ne;let t,e;return typeof n==`string`?(e=``,n.charAt(0)!==`^`&&(e+=`^`),e+=n,n.charAt(n.length-1)!==`$`&&(e+=`$`),t=new RegExp(e)):(e=n.toString(),t=n),r=>{if(Ae(r.value))return null;let i=r.value;return t.test(i)?null:{pattern:{requiredPattern:e,actualValue:i}}}}function ne(n){return null}function it(n){return n!=null}function ot(n){return Kc(n)?xe$1(n):n}function st(n){let t={};return n.forEach(e=>{t=e!=null?r$1(r$1({},t),e):t}),Object.keys(t).length===0?null:t}function at(n,t){return t.map(e=>e(n))}function Tt(n){return!n.validate}function lt(n){return n.map(t=>Tt(t)?t:e=>t.validate(e))}function ut(n){if(!n)return null;let t=n.filter(it);return t.length==0?null:function(e){return st(at(e,t))}}function Me(n){return n!=null?ut(lt(n)):null}function dt(n){if(!n)return null;let t=n.filter(it);return t.length==0?null:function(e){let r=at(e,t).map(ot);return kg(r).pipe(bt$4(st))}}function Ee(n){return n!=null?dt(lt(n)):null}function Le$1(n,t){return n===null?[t]:Array.isArray(n)?[...n,t]:[n,t]}function ct(n){return n._rawValidators}function ht(n){return n._rawAsyncValidators}function ve(n){return n?Array.isArray(n)?n:[n]:[]}function re(n,t){return Array.isArray(n)?n.includes(t):n===t}function Be$1(n,t){let e=ve(t);return ve(n).forEach(i=>{re(e,i)||e.push(i)}),e}function Ue$1(n,t){return ve(t).filter(e=>!re(n,e))}var ie=class{get value(){return this.control?this.control.value:null}get valid(){return this.control?this.control.valid:null}get invalid(){return this.control?this.control.invalid:null}get pending(){return this.control?this.control.pending:null}get disabled(){return this.control?this.control.disabled:null}get enabled(){return this.control?this.control.enabled:null}get errors(){return this.control?this.control.errors:null}get pristine(){return this.control?this.control.pristine:null}get dirty(){return this.control?this.control.dirty:null}get touched(){return this.control?this.control.touched:null}get status(){return this.control?this.control.status:null}get untouched(){return this.control?this.control.untouched:null}get statusChanges(){return this.control?this.control.statusChanges:null}get valueChanges(){return this.control?this.control.valueChanges:null}get path(){return null}_composedValidatorFn;_composedAsyncValidatorFn;_rawValidators=[];_rawAsyncValidators=[];_setValidators(t){this._rawValidators=t||[],this._composedValidatorFn=Me(this._rawValidators)}_setAsyncValidators(t){this._rawAsyncValidators=t||[],this._composedAsyncValidatorFn=Ee(this._rawAsyncValidators)}get validator(){return this._composedValidatorFn||null}get asyncValidator(){return this._composedAsyncValidatorFn||null}_onDestroyCallbacks=[];_registerOnDestroy(t){this._onDestroyCallbacks.push(t)}_invokeOnDestroyCallbacks(){this._onDestroyCallbacks.forEach(t=>t()),this._onDestroyCallbacks=[]}reset(t=void 0){this.control?.reset(t)}hasError(t,e){return this.control?this.control.hasError(t,e):!1}getError(t,e){return this.control?this.control.getError(t,e):null}};var _=class extends ie{name;get formDirective(){return null}get path(){return null}};var H=`VALID`;var te=`INVALID`;var x$2=`PENDING`;var $=`DISABLED`;var b=class{};var oe=class extends b{value;source;constructor(t,e){super(),this.value=t,this.source=e}};var W$1=class extends b{pristine;source;constructor(t,e){super(),this.pristine=t,this.source=e}};var z=class extends b{touched;source;constructor(t,e){super(),this.touched=t,this.source=e}};var T=class extends b{status;source;constructor(t,e){super(),this.status=t,this.source=e}};var se=class extends b{source;constructor(t){super(),this.source=t}};var F=class extends b{source;constructor(t){super(),this.source=t}};function Ne(n){return(ce(n)?n.validators:n)||null}function Pt(n){return Array.isArray(n)?Me(n):n||null}function Ie$1(n,t){return(ce(t)?t.asyncValidators:n)||null}function jt(n){return Array.isArray(n)?Ee(n):n||null}function ce(n){return n!=null&&!Array.isArray(n)&&typeof n==`object`}function pt(n,t,e){let r=n.controls;if(!(t?Object.keys(r):r).length)throw new N$3(1e3,``);if(!gt(r,e))throw new N$3(1001,``)}function ft(n,t,e){n._forEachChild((r,i)=>{if(e[i]===void 0)throw new N$3(-1002,``)})}var P=class{_pendingDirty=!1;_hasOwnPendingAsyncValidator=null;_pendingTouched=!1;_onCollectionChange=()=>{};_updateOn;_hasRequired=ti(!1);_parent=null;_asyncValidationSubscription;_composedValidatorFn;_composedAsyncValidatorFn;_rawValidators;_rawAsyncValidators;value;constructor(t,e){this._assignValidators(t),this._assignAsyncValidators(e)}get validator(){return this._composedValidatorFn}set validator(t){this._rawValidators=this._composedValidatorFn=t,this._updateHasRequiredValidator()}get asyncValidator(){return this._composedAsyncValidatorFn}set asyncValidator(t){this._rawAsyncValidators=this._composedAsyncValidatorFn=t}get parent(){return this._parent}get status(){return Xh(this.statusReactive)}set status(t){Xh(()=>this.statusReactive.set(t))}_status=cb(()=>this.statusReactive());statusReactive=ti(void 0);get valid(){return this.status===H}get invalid(){return this.status===te}get pending(){return this.status===x$2}get disabled(){return this.status===$}get enabled(){return this.status!==$}errors;get pristine(){return Xh(this.pristineReactive)}set pristine(t){Xh(()=>this.pristineReactive.set(t))}_pristine=cb(()=>this.pristineReactive());pristineReactive=ti(!0);get dirty(){return!this.pristine}get touched(){return Xh(this.touchedReactive)}set touched(t){Xh(()=>this.touchedReactive.set(t))}_touched=cb(()=>this.touchedReactive());touchedReactive=ti(!1);get untouched(){return!this.touched}_events=new X$2;events=this._events.asObservable();valueChanges;statusChanges;get updateOn(){return this._updateOn?this._updateOn:this.parent?this.parent.updateOn:`change`}setValidators(t){this._assignValidators(t)}setAsyncValidators(t){this._assignAsyncValidators(t)}addValidators(t){this.setValidators(Be$1(t,this._rawValidators))}addAsyncValidators(t){this.setAsyncValidators(Be$1(t,this._rawAsyncValidators))}removeValidators(t){this.setValidators(Ue$1(t,this._rawValidators))}removeAsyncValidators(t){this.setAsyncValidators(Ue$1(t,this._rawAsyncValidators))}hasValidator(t){return re(this._rawValidators,t)}hasAsyncValidator(t){return re(this._rawAsyncValidators,t)}clearValidators(){this.validator=null}clearAsyncValidators(){this.asyncValidator=null}markAsTouched(t={}){let e=this.touched===!1;this.touched=!0;let r=t.sourceControl??this;t.onlySelf||this._parent?.markAsTouched(s(r$1({},t),{sourceControl:r})),e&&t.emitEvent!==!1&&this._events.next(new z(!0,r))}markAllAsDirty(t={}){this.markAsDirty({onlySelf:!0,emitEvent:t.emitEvent,sourceControl:this}),this._forEachChild(e=>e.markAllAsDirty(t))}markAllAsTouched(t={}){this.markAsTouched({onlySelf:!0,emitEvent:t.emitEvent,sourceControl:this}),this._forEachChild(e=>e.markAllAsTouched(t))}markAsUntouched(t={}){let e=this.touched===!0;this.touched=!1,this._pendingTouched=!1;let r=t.sourceControl??this;this._forEachChild(i=>{i.markAsUntouched({onlySelf:!0,emitEvent:t.emitEvent,sourceControl:r})}),t.onlySelf||this._parent?._updateTouched(t,r),e&&t.emitEvent!==!1&&this._events.next(new z(!1,r))}markAsDirty(t={}){let e=this.pristine===!0;this.pristine=!1;let r=t.sourceControl??this;t.onlySelf||this._parent?.markAsDirty(s(r$1({},t),{sourceControl:r})),e&&t.emitEvent!==!1&&this._events.next(new W$1(!1,r))}markAsPristine(t={}){let e=this.pristine===!1;this.pristine=!0,this._pendingDirty=!1;let r=t.sourceControl??this;this._forEachChild(i=>{i.markAsPristine({onlySelf:!0,emitEvent:t.emitEvent})}),t.onlySelf||this._parent?._updatePristine(t,r),e&&t.emitEvent!==!1&&this._events.next(new W$1(!0,r))}markAsPending(t={}){this.status=x$2;let e=t.sourceControl??this;t.emitEvent!==!1&&(this._events.next(new T(this.status,e)),this.statusChanges.emit(this.status)),t.onlySelf||this._parent?.markAsPending(s(r$1({},t),{sourceControl:e}))}disable(t={}){let e=this._parentMarkedDirty(t.onlySelf);this.status=$,this.errors=null,this._forEachChild(i=>{i.disable(s(r$1({},t),{onlySelf:!0}))}),this._updateValue();let r=t.sourceControl??this;t.emitEvent!==!1&&(this._events.next(new oe(this.value,r)),this._events.next(new T(this.status,r)),this.valueChanges.emit(this.value),this.statusChanges.emit(this.status)),this._updateAncestors(s(r$1({},t),{skipPristineCheck:e}),this),this._onDisabledChange.forEach(i=>i(!0))}enable(t={}){let e=this._parentMarkedDirty(t.onlySelf);this.status=H,this._forEachChild(r=>{r.enable(s(r$1({},t),{onlySelf:!0}))}),this.updateValueAndValidity({onlySelf:!0,emitEvent:t.emitEvent}),this._updateAncestors(s(r$1({},t),{skipPristineCheck:e}),this),this._onDisabledChange.forEach(r=>r(!1))}_updateAncestors(t,e){t.onlySelf||(this._parent?.updateValueAndValidity(t),t.skipPristineCheck||this._parent?._updatePristine({},e),this._parent?._updateTouched({},e))}setParent(t){this._parent=t}getRawValue(){return this.value}updateValueAndValidity(t={}){if(this._setInitialStatus(),this._updateValue(),this.enabled){let r=this._cancelExistingSubscription();this.errors=this._runValidator(),this.status=this._calculateStatus(),(this.status===H||this.status===x$2)&&this._runAsyncValidator(r,t.emitEvent)}let e=t.sourceControl??this;t.emitEvent!==!1&&(this._events.next(new oe(this.value,e)),this._events.next(new T(this.status,e)),this.valueChanges.emit(this.value),this.statusChanges.emit(this.status)),t.onlySelf||this._parent?.updateValueAndValidity(s(r$1({},t),{sourceControl:e}))}_updateTreeValidity(t={emitEvent:!0}){this._forEachChild(e=>e._updateTreeValidity(t)),this.updateValueAndValidity({onlySelf:!0,emitEvent:t.emitEvent})}_setInitialStatus(){this.status=this._allControlsDisabled()?$:H}_runValidator(){return this.validator?this.validator(this):null}_runAsyncValidator(t,e){if(this.asyncValidator){this.status=x$2,this._hasOwnPendingAsyncValidator={emitEvent:e!==!1,shouldHaveEmitted:t!==!1};let r=ot(this.asyncValidator(this));this._asyncValidationSubscription=r.subscribe(i=>{this._hasOwnPendingAsyncValidator=null,this.setErrors(i,{emitEvent:e,shouldHaveEmitted:t})})}}_cancelExistingSubscription(){if(this._asyncValidationSubscription){this._asyncValidationSubscription.unsubscribe();let t=(this._hasOwnPendingAsyncValidator?.emitEvent||this._hasOwnPendingAsyncValidator?.shouldHaveEmitted)??!1;return this._hasOwnPendingAsyncValidator=null,t}return!1}setErrors(t,e={}){this.errors=t,this._updateControlsErrors(e.emitEvent!==!1,this,e.shouldHaveEmitted)}get(t){let e=t;return e==null||(Array.isArray(e)||(e=e.split(`.`)),e.length===0)?null:e.reduce((r,i)=>r&&r._find(i),this)}getError(t,e){let r=e?this.get(e):this;return r?.errors?r.errors[t]:null}hasError(t,e){return!!this.getError(t,e)}get root(){let t=this;for(;t._parent;)t=t._parent;return t}_updateControlsErrors(t,e,r){this.status=this._calculateStatus(),t&&this.statusChanges.emit(this.status),(t||r)&&this._events.next(new T(this.status,e)),this._parent&&this._parent._updateControlsErrors(t,e,r)}_initObservables(){this.valueChanges=new $e$3,this.statusChanges=new $e$3}_calculateStatus(){return this._allControlsDisabled()?$:this.errors?te:this._hasOwnPendingAsyncValidator||this._anyControlsHaveStatus(x$2)?x$2:this._anyControlsHaveStatus(te)?te:H}_anyControlsHaveStatus(t){return this._anyControls(e=>e.status===t)}_anyControlsDirty(){return this._anyControls(t=>t.dirty)}_anyControlsTouched(){return this._anyControls(t=>t.touched)}_updatePristine(t,e){let r=!this._anyControlsDirty(),i=this.pristine!==r;this.pristine=r,t.onlySelf||this._parent?._updatePristine(t,e),i&&this._events.next(new W$1(this.pristine,e))}_updateTouched(t={},e){this.touched=this._anyControlsTouched(),this._events.next(new z(this.touched,e)),t.onlySelf||this._parent?._updateTouched(t,e)}_onDisabledChange=[];_registerOnCollectionChange(t){this._onCollectionChange=t}_setUpdateStrategy(t){ce(t)&&t.updateOn!=null&&(this._updateOn=t.updateOn)}_parentMarkedDirty(t){return!t&&!!this._parent?.dirty&&!this._parent._anyControlsDirty()}_find(t){return null}_assignValidators(t){this._rawValidators=Array.isArray(t)?t.slice():t,this._composedValidatorFn=Pt(this._rawValidators),this._updateHasRequiredValidator()}_assignAsyncValidators(t){this._rawAsyncValidators=Array.isArray(t)?t.slice():t,this._composedAsyncValidatorFn=jt(this._rawAsyncValidators)}_updateHasRequiredValidator(){Xh(()=>this._hasRequired.set(this.hasValidator(ye.required)))}};function gt(n,t){return Object.hasOwn(n,t)}function Gt(n){return n.tagName===`INPUT`||n.tagName===`SELECT`||n.tagName===`TEXTAREA`}function kt(n,t,e,r){switch(e){case`name`:n.setAttribute(t,e,r);break;case`disabled`:case`readonly`:case`required`:r?n.setAttribute(t,e,``):n.removeAttribute(t,e);break;case`max`:case`min`:case`minLength`:case`maxLength`:r!==void 0?n.setAttribute(t,e,r.toString()):n.removeAttribute(t,e)}}var _e=class{kind;context;control;message;constructor({kind:t,context:e,control:r}){this.kind=t,this.context=e,this.control=r}};function Lt(n){return typeof n==`number`?n:parseInt(n,10)}function mt(n){return typeof n==`number`?n:parseFloat(n)}var k=(()=>{class n{_validator=ne;_onChange;_enabled;ngOnChanges(e){if(this.inputName in e){let r=this.normalizeInput(e[this.inputName].currentValue);this._enabled=this.enabled(r),this._validator=this._enabled?this.createValidator(r):ne,this._onChange?.()}}validate(e){return this._validator(e)}registerOnValidatorChange(e){this._onChange=e}enabled(e){return e!=null}static ɵfac=function(r){return new(r||n)};static ɵdir=jI({type:n,features:[oy]})}return n})();var Bt={provide:y,useExisting:ko(()=>Ut),multi:!0};var Ut=(()=>{class n extends k{max;inputName=`max`;normalizeInput=e=>mt(e);createValidator=e=>Qe$1(e);static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[`input`,`type`,`number`,`max`,``,`formControlName`,``],[`input`,`type`,`number`,`max`,``,`formControl`,``],[`input`,`type`,`number`,`max`,``,`ngModel`,``]],hostVars:1,hostBindings:function(r,i){r&2&&ch(`max`,i._enabled?i.max:null)},inputs:{max:`max`},standalone:!1,features:[$w([Bt]),zp]})}return n})();var Ht={provide:y,useExisting:ko(()=>$t),multi:!0};var $t=(()=>{class n extends k{min;inputName=`min`;normalizeInput=e=>mt(e);createValidator=e=>Ke$1(e);static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[`input`,`type`,`number`,`min`,``,`formControlName`,``],[`input`,`type`,`number`,`min`,``,`formControl`,``],[`input`,`type`,`number`,`min`,``,`ngModel`,``]],hostVars:1,hostBindings:function(r,i){r&2&&ch(`min`,i._enabled?i.min:null)},inputs:{min:`min`},standalone:!1,features:[$w([Ht]),zp]})}return n})();var qt={provide:y,useExisting:ko(()=>Se),multi:!0};var Wt={provide:y,useExisting:ko(()=>zt),multi:!0};var Se=(()=>{class n extends k{required;inputName=`required`;normalizeInput=HF;createValidator=e=>Je$1;enabled(e){return e}static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[``,`required`,``,`formControlName`,``,3,`type`,`checkbox`],[``,`required`,``,`formControl`,``,3,`type`,`checkbox`],[``,`required`,``,`ngModel`,``,3,`type`,`checkbox`]],hostVars:1,hostBindings:function(r,i){r&2&&ch(`required`,i._enabled?``:null)},inputs:{required:`required`},standalone:!1,features:[$w([qt]),zp]})}return n})();var zt=(()=>{class n extends Se{createValidator=e=>et$1;static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[`input`,`type`,`checkbox`,`required`,``,`formControlName`,``],[`input`,`type`,`checkbox`,`required`,``,`formControl`,``],[`input`,`type`,`checkbox`,`required`,``,`ngModel`,``]],hostVars:1,hostBindings:function(r,i){r&2&&ch(`required`,i._enabled?``:null)},standalone:!1,features:[$w([Wt]),zp]})}return n})();var Yt={provide:y,useExisting:ko(()=>Xt),multi:!0};var Xt=(()=>{class n extends k{email;inputName=`email`;normalizeInput=HF;createValidator=e=>tt;enabled(e){return e}static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[``,`email`,``,`formControlName`,``],[``,`email`,``,`formControl`,``],[``,`email`,``,`ngModel`,``]],inputs:{email:`email`},standalone:!1,features:[$w([Yt]),zp]})}return n})();var Zt={provide:y,useExisting:ko(()=>Kt),multi:!0};var Kt=(()=>{class n extends k{maxlength;inputName=`maxlength`;normalizeInput=e=>Lt(e);createValidator=e=>nt(e);static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[``,`maxlength`,``,`formControlName`,``],[``,`maxlength`,``,`formControl`,``],[``,`maxlength`,``,`ngModel`,``]],hostVars:1,hostBindings:function(r,i){r&2&&ch(`maxlength`,i._enabled?i.maxlength:null)},inputs:{maxlength:`maxlength`},standalone:!1,features:[$w([Zt]),zp]})}return n})();var Qt={provide:y,useExisting:ko(()=>Jt),multi:!0};var Jt=(()=>{class n extends k{pattern;inputName=`pattern`;normalizeInput=e=>e;createValidator=e=>rt(e);static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[``,`pattern`,``,`formControlName`,``],[``,`pattern`,``,`formControl`,``],[``,`pattern`,``,`ngModel`,``]],hostVars:1,hostBindings:function(r,i){r&2&&ch(`pattern`,i._enabled?i.pattern:null)},inputs:{pattern:`pattern`},standalone:!1,features:[$w([Qt]),zp]})}return n})();var en=new x$4(``);var L$1=new x$4(``,{factory:()=>X});var X=`always`;function yt(n,t){return[...t.path,n]}function Ce(n,t,e=X){Fe$1(n,t),t.valueAccessor.writeValue(n.value),(n.disabled||e===`always`)&&t.valueAccessor.setDisabledState?.(n.disabled),nn(n,t),on(n,t),rn(n,t),tn(n,t)}function He$1(n,t,e=!0){let r=()=>{};t?.valueAccessor?.registerOnChange(r),t?.valueAccessor?.registerOnTouched(r),le(n,t),n&&(t._invokeOnDestroyCallbacks(),n._registerOnCollectionChange(()=>{}))}function ae(n,t){n.forEach(e=>{e.registerOnValidatorChange&&e.registerOnValidatorChange(t)})}function tn(n,t){if(t.valueAccessor.setDisabledState){let e=r=>{t.valueAccessor.setDisabledState(r)};n.registerOnDisabledChange(e),t._registerOnDestroy(()=>{n._unregisterOnDisabledChange(e)})}}function Fe$1(n,t){let e=ct(n);t.validator!==null?n.setValidators(Le$1(e,t.validator)):typeof e==`function`&&n.setValidators([e]);let r=ht(n);t.asyncValidator!==null?n.setAsyncValidators(Le$1(r,t.asyncValidator)):typeof r==`function`&&n.setAsyncValidators([r]);let i=()=>n.updateValueAndValidity();ae(t._rawValidators,i),ae(t._rawAsyncValidators,i)}function le(n,t){let e=!1;if(n!==null){if(t.validator!==null){let i=ct(n);if(Array.isArray(i)&&i.length>0){let o=i.filter(a=>a!==t.validator);o.length!==i.length&&(e=!0,n.setValidators(o))}}if(t.asyncValidator!==null){let i=ht(n);if(Array.isArray(i)&&i.length>0){let o=i.filter(a=>a!==t.asyncValidator);o.length!==i.length&&(e=!0,n.setAsyncValidators(o))}}}let r=()=>{};return ae(t._rawValidators,r),ae(t._rawAsyncValidators,r),e}function nn(n,t){t.valueAccessor.registerOnChange(e=>{n._pendingValue=e,n._pendingChange=!0,n._pendingDirty=!0,n.updateOn===`change`&&vt(n,t)})}function rn(n,t){t.valueAccessor.registerOnTouched(()=>{n._pendingTouched=!0,n.updateOn===`blur`&&n._pendingChange&&vt(n,t),n.updateOn!==`submit`&&n.markAsTouched()})}function vt(n,t){n._pendingDirty&&n.markAsDirty(),n.setValue(n._pendingValue,{emitModelToViewChange:!1}),t.viewToModelUpdate(n._pendingValue),n._pendingChange=!1}function on(n,t){let e=(r,i)=>{t.valueAccessor.writeValue(r),i&&t.viewToModelUpdate(r)};n.registerOnChange(e),t._registerOnDestroy(()=>{n._unregisterOnChange(e)})}function _t(n,t){Fe$1(n,t)}function sn(n,t){return le(n,t)}function Ct(n,t){if(!Object.hasOwn(n,`model`))return!1;let e=n.model;return e.isFirstChange()?!0:!Object.is(t,e.currentValue)}function an(n){return Object.getPrototypeOf(n.constructor)===G$1}function Vt(n,t){n._syncPendingControls(),t.forEach(e=>{let r=e.control;r.updateOn===`submit`&&r._pendingChange&&(e.viewToModelUpdate(r._pendingValue),r._pendingChange=!1)})}function ln(n,t){if(!t)return null;let e,r,i;return t.forEach(o=>{o.constructor===Ze$1?e=o:an(o)?r=o:i=o}),i||r||e||null}function un(n,t){let e=n.indexOf(t);e>-1&&n.splice(e,1)}var Dt={provide:en,useFactory:()=>{let n=D$4(C$1,{self:!0});return{setParseErrors:t=>{n.setParseErrorSource(t)},set onReset(t){n.onReset=t}}}};var C$1=class extends ie{_parent=null;name=null;valueAccessor=null;isCustomControlBased=!1;userOnReset;resetSubscription;set onReset(t){this.userOnReset=t,this.resetSubscription?.unsubscribe(),this.resetSubscription=void 0,this.control&&(this.resetSubscription=this.control.events.subscribe(e=>{e instanceof F&&this.control&&this.userOnReset?.(this.control.value)}),this.subscription?.add(this.resetSubscription))}isNativeFormElement=!1;rawValueAccessors;_selectedValueAccessor=null;get selectedValueAccessor(){return this._selectedValueAccessor??=ln(this,this.rawValueAccessors)}parseErrorsValidator=null;renderer;injector;requiredValidatorViaDi;subscription;customControlBindings=null;constructor(t,e,r){super(),this.injector=t,this.renderer=e,this.rawValueAccessors=r,this.injector?.get(ye$2)?.onDestroy(()=>{this.removeParseErrorsValidator(this.control),this.subscription?.unsubscribe()})}setupCustomControl(){this.subscription?.unsubscribe();let t=this.injector?.get(jF);if(!this.control||!t)return;let e=t.markForCheck.bind(t);this.subscription=new G$3,this.subscription.add(this.control.valueChanges.subscribe(e)),this.subscription.add(this.control.statusChanges.subscribe(e)),this.resetSubscription?.unsubscribe(),this.resetSubscription=void 0,this.userOnReset&&(this.resetSubscription=this.control.events.subscribe(r=>{r instanceof F&&this.control&&this.userOnReset?.(this.control.value)}),this.subscription.add(this.resetSubscription)),this.parseErrorsValidator&&this.control.addValidators(this.parseErrorsValidator)}ngControlCreate(t){!t.nativeElement.hasAttribute?.(`ngNoCva`)&&(this.rawValueAccessors&&this.rawValueAccessors.length>0||this.valueAccessor!==null)||!t.customControl||(this.isCustomControlBased=!0,t.listenToCustomControlModel(i=>{this.control?.markAsDirty(),this.control?.setValue(i,{emitModelToViewChange:!1}),this.viewToModelUpdate(i)}),t.listenToCustomControlOutput(`touch`,()=>{this.control?.markAsTouched()}),this.customControlBindings={},this.isNativeFormElement=Gt(t.nativeElement),this.requiredValidatorViaDi=this._rawValidators.find(i=>i instanceof Se))}ngControlUpdate(t,e){if(!this.isCustomControlBased)return;let r=this.control,i=this.customControlBindings;Object.is(i.value,r.value)||(i.value=r.value,t.setCustomControlModelInput(r.value)),this.bindControlProperty(t,i,`touched`,r.touched),this.bindControlProperty(t,i,`dirty`,r.dirty),this.bindControlProperty(t,i,`valid`,r.valid),this.bindControlProperty(t,i,`invalid`,r.invalid),this.bindControlProperty(t,i,`pending`,r.pending),this.bindControlProperty(t,i,`disabled`,r.disabled),this.shouldBindRequired&&this.bindControlProperty(t,i,`required`,this.isRequired);let o=r.errors;if(i.errors!==o){i.errors=o;let a=this._convertErrors(o);t.setInputOnDirectives(`errors`,a)}}get isRequired(){return(this.requiredValidatorViaDi?._enabled||this.control?._hasRequired())??!1}get shouldBindRequired(){return!0}bindControlProperty(t,e,r,i){if(e[r]===i)return;e[r]=i;let o=t.setInputOnDirectives(r,i);this.isNativeFormElement&&!o&&(r===`disabled`||r===`required`)&&this.renderer&&kt(this.renderer,t.nativeElement,r,i)}_convertErrors(t){if(t===null)return[];let e=this.control;return Object.entries(t).map(([r,i])=>new _e({context:i,kind:r,control:e}))}setParseErrorSource(t){if(t===void 0)return;let e=null,r=cb(()=>{let i=t();return i.length===0?null:i.reduce((o,a)=>(o[a.kind]=a,o),{})});this.parseErrorsValidator=(()=>e).bind(this),td(()=>{e=r(),this.control?.updateValueAndValidity({emitEvent:!1})},{injector:this.injector})}removeParseErrorsValidator(t){this.parseErrorsValidator&&(t?.removeValidators(this.parseErrorsValidator),t?.updateValueAndValidity({emitEvent:!1}))}};var ue=class{_cd;constructor(t){this._cd=t}get isTouched(){return this._cd?.control?._touched?.(),!!this._cd?.control?.touched}get isUntouched(){return!!this._cd?.control?.untouched}get isPristine(){return this._cd?.control?._pristine?.(),!!this._cd?.control?.pristine}get isDirty(){return!!this._cd?.control?.dirty}get isValid(){return this._cd?.control?._status?.(),!!this._cd?.control?.valid}get isInvalid(){return!!this._cd?.control?.invalid}get isPending(){return!!this._cd?.control?.pending}get isSubmitted(){return this._cd?._submitted?.(),!!this._cd?.submitted}};var Yn=(()=>{class n extends ue{constructor(e){super(e)}static ɵfac=function(r){return new(r||n)(Wr(C$1,2))};static ɵdir=jI({type:n,selectors:[[``,`formControlName`,``],[``,`ngModel`,``],[``,`formControl`,``]],hostVars:14,hostBindings:function(r,i){r&2&&_h(`ng-untouched`,i.isUntouched)(`ng-touched`,i.isTouched)(`ng-pristine`,i.isPristine)(`ng-dirty`,i.isDirty)(`ng-valid`,i.isValid)(`ng-invalid`,i.isInvalid)(`ng-pending`,i.isPending)},standalone:!1,features:[zp]})}return n})();var Xn=(()=>{class n extends ue{constructor(e){super(e)}static ɵfac=function(r){return new(r||n)(Wr(_,10))};static ɵdir=jI({type:n,selectors:[[``,`formGroupName`,``],[``,`formArrayName`,``],[``,`ngModelGroup`,``],[``,`formGroup`,``],[``,`formArray`,``],[`form`,3,`ngNoForm`,``],[``,`ngForm`,``]],hostVars:16,hostBindings:function(r,i){r&2&&_h(`ng-untouched`,i.isUntouched)(`ng-touched`,i.isTouched)(`ng-pristine`,i.isPristine)(`ng-dirty`,i.isDirty)(`ng-valid`,i.isValid)(`ng-invalid`,i.isInvalid)(`ng-pending`,i.isPending)(`ng-submitted`,i.isSubmitted)},standalone:!1,features:[zp]})}return n})();var j=class extends P{constructor(t,e,r){super(Ne(e),Ie$1(r,e)),this.controls=t,this._initObservables(),this._setUpdateStrategy(e),this._setUpControls(),this.updateValueAndValidity({onlySelf:!0,emitEvent:!!this.asyncValidator})}controls;registerControl(t,e){return this._find(t)||(this.controls[t]=e,e.setParent(this),e._registerOnCollectionChange(this._onCollectionChange),e)}addControl(t,e,r={}){this.registerControl(t,e),this.updateValueAndValidity({emitEvent:r.emitEvent}),this._onCollectionChange()}removeControl(t,e={}){let r=this._find(t);r&&r._registerOnCollectionChange(()=>{}),delete this.controls[t],this.updateValueAndValidity({emitEvent:e.emitEvent}),this._onCollectionChange()}setControl(t,e,r={}){let i=this._find(t);i&&i._registerOnCollectionChange(()=>{}),delete this.controls[t],e&&this.registerControl(t,e),this.updateValueAndValidity({emitEvent:r.emitEvent}),this._onCollectionChange()}contains(t){return this._find(t)?.enabled===!0}setValue(t,e={}){Xh(()=>{ft(this,!0,t),Object.keys(t).forEach(r=>{pt(this,!0,r),this.controls[r].setValue(t[r],{onlySelf:!0,emitEvent:e.emitEvent})}),this.updateValueAndValidity(e)})}patchValue(t,e={}){t!=null&&(Object.keys(t).forEach(r=>{let i=this._find(r);i&&i.patchValue(t[r],{onlySelf:!0,emitEvent:e.emitEvent})}),this.updateValueAndValidity(e))}reset(t={},e={}){this._forEachChild((r,i)=>{r.reset(t?t[i]:null,s(r$1({},e),{onlySelf:!0}))}),this._updatePristine(e,this),this._updateTouched(e,this),this.updateValueAndValidity(e),e?.emitEvent!==!1&&this._events.next(new F(this))}getRawValue(){return this._reduceChildren({},(t,e,r)=>(t[r]=e.getRawValue(),t))}_syncPendingControls(){let t=this._reduceChildren(!1,(e,r)=>r._syncPendingControls()?!0:e);return t&&this.updateValueAndValidity({onlySelf:!0}),t}_forEachChild(t){Object.keys(this.controls).forEach(e=>{let r=this.controls[e];r&&t(r,e)})}_setUpControls(){this._forEachChild(t=>{t.setParent(this),t._registerOnCollectionChange(this._onCollectionChange)})}_updateValue(){this.value=this._reduceValue()}_anyControls(t){for(let[e,r]of Object.entries(this.controls))if(this.contains(e)&&t(r))return!0;return!1}_reduceValue(){return this._reduceChildren({},(e,r,i)=>((r.enabled||this.disabled)&&(e[i]=r.value),e))}_reduceChildren(t,e){let r=t;return this._forEachChild((i,o)=>{r=e(r,i,o)}),r}_allControlsDisabled(){for(let t of Object.keys(this.controls))if(this.controls[t].enabled)return!1;return Object.keys(this.controls).length>0||this.disabled}_find(t){return gt(this.controls,t)?this.controls[t]:null}};var Ve$1=class extends j{};var dn={provide:_,useExisting:ko(()=>cn)};var q=Promise.resolve();var cn=(()=>{class n extends _{callSetDisabledState;get submitted(){return Xh(this.submittedReactive)}_submitted=cb(()=>this.submittedReactive());submittedReactive=ti(!1);_directives=new Set;form;ngSubmit=new $e$3;options;constructor(e,r,i){super(),this.callSetDisabledState=i,this.form=new j({},Me(e),Ee(r))}ngAfterViewInit(){this._setUpdateStrategy()}get formDirective(){return this}get control(){return this.form}get path(){return[]}get controls(){return this.form.controls}addControl(e){q.then(()=>{e.control=this._findContainer(e.path).registerControl(e.name,e.control),e._setupWithForm(this.callSetDisabledState),e.control.updateValueAndValidity({emitEvent:!1}),this._directives.add(e)})}getControl(e){return this.form.get(e.path)}removeControl(e){q.then(()=>{this._findContainer(e.path)?.removeControl(e.name),this._directives.delete(e)})}addFormGroup(e){q.then(()=>{let r=this._findContainer(e.path),i=new j({});_t(i,e),r.registerControl(e.name,i),i.updateValueAndValidity({emitEvent:!1})})}removeFormGroup(e){q.then(()=>{this._findContainer(e.path)?.removeControl?.(e.name)})}getFormGroup(e){return this.form.get(e.path)}updateModel(e,r){q.then(()=>{this.form.get(e.path).setValue(r)})}setValue(e){this.control.setValue(e)}onSubmit(e){return this.submittedReactive.set(!0),Vt(this.form,this._directives),this.ngSubmit.emit(e),this.form._events.next(new se(this.control)),e?.target?.method===`dialog`}onReset(){this.resetForm()}resetForm(e=void 0){this.form.reset(e),this.submittedReactive.set(!1)}_setUpdateStrategy(){this.options&&this.options.updateOn!=null&&(this.form._updateOn=this.options.updateOn)}_findContainer(e){return e.pop(),e.length?this.form.get(e):this.form}static ɵfac=function(r){return new(r||n)(Wr(y,10),Wr(de,10),Wr(L$1,8))};static ɵdir=jI({type:n,selectors:[[`form`,3,`ngNoForm`,``,3,`formGroup`,``,3,`formArray`,``],[`ng-form`],[``,`ngForm`,``]],hostBindings:function(r,i){r&1&&mh(`submit`,function(a){return i.onSubmit(a)})(`reset`,function(){return i.onReset()})},inputs:{options:[0,`ngFormOptions`,`options`]},outputs:{ngSubmit:`ngSubmit`},exportAs:[`ngForm`],standalone:!1,features:[$w([dn]),zp]})}return n})();function $e$1(n,t){let e=n.indexOf(t);e>-1&&n.splice(e,1)}function qe$1(n){return typeof n==`object`&&n!==null&&Object.keys(n).length===2&&`value`in n&&`disabled`in n}var Y=class extends P{defaultValue=null;_onChange=[];_pendingValue;_pendingChange=!1;constructor(t=null,e,r){super(Ne(e),Ie$1(r,e)),this._applyFormState(t),this._setUpdateStrategy(e),this._initObservables(),this.updateValueAndValidity({onlySelf:!0,emitEvent:!!this.asyncValidator}),ce(e)&&(e.nonNullable||e.initialValueIsDefault)&&(qe$1(t)?this.defaultValue=t.value:this.defaultValue=t)}setValue(t,e={}){Xh(()=>{this.value=this._pendingValue=t,this._onChange.length&&e.emitModelToViewChange!==!1&&this._onChange.forEach(r=>r(this.value,e.emitViewToModelChange!==!1)),this.updateValueAndValidity(e)})}patchValue(t,e={}){this.setValue(t,e)}reset(t=this.defaultValue,e={}){this._applyFormState(t),this.markAsPristine(e),this.markAsUntouched(e),this.setValue(this.value,e),e.overwriteDefaultValue&&(this.defaultValue=this.value),this._pendingChange=!1,e?.emitEvent!==!1&&this._events.next(new F(this))}_updateValue(){}_anyControls(t){return!1}_allControlsDisabled(){return this.disabled}registerOnChange(t){this._onChange.push(t)}_unregisterOnChange(t){$e$1(this._onChange,t)}registerOnDisabledChange(t){this._onDisabledChange.push(t)}_unregisterOnDisabledChange(t){$e$1(this._onDisabledChange,t)}_forEachChild(t){}_syncPendingControls(){return this.updateOn===`submit`&&(this._pendingDirty&&this.markAsDirty(),this._pendingTouched&&this.markAsTouched(),this._pendingChange)?(this.setValue(this._pendingValue,{onlySelf:!0,emitModelToViewChange:!1}),!0):!1}_applyFormState(t){qe$1(t)?(this.value=this._pendingValue=t.value,t.disabled?this.disable({onlySelf:!0,emitEvent:!1}):this.enable({onlySelf:!0,emitEvent:!1})):this.value=this._pendingValue=t}};var hn=n=>n instanceof Y;var pn=(()=>{class n extends _{callSetDisabledState;get submitted(){return Xh(this._submittedReactive)}set submitted(e){this._submittedReactive.set(e)}_submitted=cb(()=>this._submittedReactive());_submittedReactive=ti(!1);_oldForm;_onCollectionChange=()=>this._updateDomValue();directives=[];constructor(e,r,i){super(),this.callSetDisabledState=i,this._setValidators(e),this._setAsyncValidators(r)}ngOnChanges(e){this.onChanges(e)}ngOnDestroy(){this.onDestroy()}onChanges(e){this._checkFormPresent(),Object.hasOwn(e,`form`)&&(this._updateValidators(),this._updateDomValue(),this._updateRegistrations(),this._oldForm=this.form)}onDestroy(){this.form&&(le(this.form,this),this.form._onCollectionChange===this._onCollectionChange&&this.form._registerOnCollectionChange(()=>{}))}get formDirective(){return this}get path(){return[]}addControl(e){let r=this.form.get(e.path);return e._setupWithForm(r,this.callSetDisabledState),r.updateValueAndValidity({emitEvent:!1}),this.directives.push(e),r}getControl(e){return this.form.get(e.path)}removeControl(e){He$1(e.control||null,e,!1),un(this.directives,e)}addFormGroup(e){this._setUpFormContainer(e)}removeFormGroup(e){this._cleanUpFormContainer(e)}getFormGroup(e){return this.form.get(e.path)}getFormArray(e){return this.form.get(e.path)}addFormArray(e){this._setUpFormContainer(e)}removeFormArray(e){this._cleanUpFormContainer(e)}updateModel(e,r){this.form.get(e.path).setValue(r)}onReset(){this.resetForm()}resetForm(e=void 0,r={}){this.form.reset(e,r),this._submittedReactive.set(!1)}onSubmit(e){return this.submitted=!0,Vt(this.form,this.directives),this.ngSubmit.emit(e),this.form._events.next(new se(this.control)),e?.target?.method===`dialog`}_updateDomValue(){this.directives.forEach(e=>{let r=e.control,i=this.form.get(e.path);r!==i&&(He$1(r||null,e),hn(i)&&e._setupWithForm(i,this.callSetDisabledState))}),this.form._updateTreeValidity({emitEvent:!1})}_setUpFormContainer(e){let r=this.form.get(e.path);_t(r,e),r.updateValueAndValidity({emitEvent:!1})}_cleanUpFormContainer(e){let r=this.form?.get(e.path);r&&sn(r,e)&&r.updateValueAndValidity({emitEvent:!1})}_updateRegistrations(){this.form._registerOnCollectionChange(this._onCollectionChange),this._oldForm?._registerOnCollectionChange(()=>{})}_updateValidators(){Fe$1(this.form,this),this._oldForm&&le(this._oldForm,this)}_checkFormPresent(){this.form}static ɵfac=function(r){return new(r||n)(Wr(y,10),Wr(de,10),Wr(L$1,8))};static ɵdir=jI({type:n,features:[zp,oy]})}return n})();var fn={provide:_,useExisting:ko(()=>gn)};var gn=(()=>{class n extends pn{form=null;ngSubmit=new $e$3;get control(){return this.form}static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[``,`formGroup`,``]],hostBindings:function(r,i){r&1&&mh(`submit`,function(a){return i.onSubmit(a)})(`reset`,function(){return i.onReset()})},inputs:{form:[0,`formGroup`,`form`]},outputs:{ngSubmit:`ngSubmit`},exportAs:[`ngForm`],standalone:!1,features:[$w([fn]),zp]})}return n})();var mn={provide:C$1,useExisting:ko(()=>yn)};var We$1=Promise.resolve();var yn=(()=>{class n extends C$1{_changeDetectorRef;callSetDisabledState;control=new Y;static ngAcceptInputType_isDisabled;_registered=!1;_ngModelInjector;viewModel;name=``;isDisabled;model;options;update=new $e$3;constructor(e,r,i,o,a,m,V,B){super(V,B,o),this._changeDetectorRef=a,this.callSetDisabledState=m,this._parent=e,this._setValidators(r),this._setAsyncValidators(i)}ngOnChanges(e){if(this._registered,this._checkForErrors(),!this._registered||`name`in e){if(this._registered&&(this._checkName(),this.formDirective)){let r=e.name.previousValue;this.formDirective.removeControl({name:r,path:this._getPath(r)})}this._setUpControl()}`isDisabled`in e&&this._updateDisabled(e),Ct(e,this.viewModel)&&(this._updateValue(this.model),this.viewModel=this.model)}ngOnDestroy(){this.formDirective?.removeControl(this)}ɵngControlCreate(e){super.ngControlCreate(e)}ɵngControlUpdate(e){super.ngControlUpdate(e,!1)}get shouldBindRequired(){return!1}get path(){return this._getPath(this.name)}get formDirective(){return this._parent?this._parent.formDirective:null}viewToModelUpdate(e){this.viewModel=e,this.update.emit(e)}_setUpControl(){this._setUpdateStrategy(),this._isStandalone()?this._setUpStandalone():this.formDirective.addControl(this),this._registered=!0}_setUpdateStrategy(){this.options&&this.options.updateOn!=null&&(this.control._updateOn=this.options.updateOn)}_isStandalone(){return!this._parent||!!(this.options&&this.options.standalone)}_setUpStandalone(){this.isCustomControlBased?this.setupCustomControl():(this.valueAccessor??=this.selectedValueAccessor,Ce(this.control,this,this.callSetDisabledState)),this.control.updateValueAndValidity({emitEvent:!1})}_setupWithForm(e){this.isCustomControlBased?this.setupCustomControl():(this.valueAccessor??=this.selectedValueAccessor,Ce(this.control,this,e))}_checkForErrors(){this._checkName()}_checkName(){this.options&&this.options.name&&(this.name=this.options.name),!this._isStandalone()&&this.name}_updateValue(e){We$1.then(()=>{this.control.setValue(e,{emitViewToModelChange:!1}),this._changeDetectorRef?.markForCheck()})}_updateDisabled(e){let r=e.isDisabled.currentValue,i=r!==0&&HF(r);We$1.then(()=>{i&&!this.control.disabled?this.control.disable():!i&&this.control.disabled&&this.control.enable(),this._changeDetectorRef?.markForCheck()})}_getPath(e){return this._parent?yt(e,this._parent):[e]}static ɵfac=function(r){return new(r||n)(Wr(_,9),Wr(y,10),Wr(de,10),Wr(M$1,10),Wr(jF,8),Wr(L$1,8),Wr(fe$1,8),Wr(Ka,8))};static ɵdir=jI({type:n,selectors:[[``,`ngModel`,``,3,`formControlName`,``,3,`formControl`,``]],inputs:{name:`name`,isDisabled:[0,`disabled`,`isDisabled`],model:[0,`ngModel`,`model`],options:[0,`ngModelOptions`,`options`]},outputs:{update:`ngModelChange`},exportAs:[`ngModel`],standalone:!1,features:[$w([mn,Dt]),zp,oy,$I(null)]})}return n})();var Kn=(()=>{class n{static ɵfac=function(r){return new(r||n)};static ɵdir=jI({type:n,selectors:[[`form`,3,`ngNoForm`,``,3,`ngNativeValidate`,``]],hostAttrs:[`novalidate`,``],standalone:!1})}return n})();var vn={provide:M$1,useExisting:ko(()=>_n),multi:!0};var _n=(()=>{class n extends G$1{writeValue(e){let r=e??``;this.setProperty(`value`,r)}registerOnChange(e){this.onChange=r=>{e(r==``?null:parseFloat(r))}}static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[`input`,`type`,`number`,`formControlName`,``,3,`ngNoCva`,``],[`input`,`type`,`number`,`formControl`,``,3,`ngNoCva`,``],[`input`,`type`,`number`,`ngModel`,``,3,`ngNoCva`,``]],hostBindings:function(r,i){r&1&&mh(`input`,function(a){return i.onChange(a.target.value)})(`blur`,function(){return i.onTouched()})},standalone:!1,features:[$w([vn]),zp]})}return n})();var Cn={provide:M$1,useExisting:ko(()=>Dn),multi:!0};var Vn=(()=>{class n{_accessors=[];add(e,r){this._accessors.push([e,r])}remove(e){for(let r=this._accessors.length-1;r>=0;--r)if(this._accessors[r][1]===e){this._accessors.splice(r,1);return}}select(e){this._accessors.forEach(r=>{this._isSameGroup(r,e)&&r[1]!==e&&r[1].fireUncheck(e.value)})}_isSameGroup(e,r){return e[0].control?e[0]._parent===r._control._parent&&e[1].name===r.name:!1}static ɵfac=function(r){return new(r||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var Dn=(()=>{class n extends G$1{_registry;_injector;_state;_control;_fn;setDisabledStateFired=!1;onChange=()=>{};name;formControlName;value;callSetDisabledState=D$4(L$1,{optional:!0})??X;constructor(e,r,i,o){super(e,r),this._registry=i,this._injector=o}ngOnChanges(e){let r=this._control?.control;e.value&&r&&this.writeValue(r.value)}ngOnInit(){this._control=this._injector.get(C$1),this._checkName(),this._registry.add(this._control,this)}ngOnDestroy(){this._registry.remove(this)}writeValue(e){this._state=e===this.value,this.setProperty(`checked`,this._state)}registerOnChange(e){this._fn=e,this.onChange=()=>{e(this.value),this._registry.select(this)}}setDisabledState(e){(this.setDisabledStateFired||e||this.callSetDisabledState===`whenDisabledForLegacyCode`)&&this.setProperty(`disabled`,e),this.setDisabledStateFired=!0}fireUncheck(e){this.writeValue(e)}_checkName(){this.name&&this.formControlName&&(this.name,this.formControlName),!this.name&&this.formControlName&&(this.name=this.formControlName)}static ɵfac=function(r){return new(r||n)(Wr(Ka),Wr(Hr),Wr(Vn),Wr(fe$1))};static ɵdir=jI({type:n,selectors:[[`input`,`type`,`radio`,`formControlName`,``,3,`ngNoCva`,``],[`input`,`type`,`radio`,`formControl`,``,3,`ngNoCva`,``],[`input`,`type`,`radio`,`ngModel`,``,3,`ngNoCva`,``]],hostBindings:function(r,i){r&1&&mh(`change`,function(){return i.onChange()})(`blur`,function(){return i.onTouched()})},inputs:{name:`name`,formControlName:`formControlName`,value:`value`},standalone:!1,features:[$w([Cn]),zp,oy]})}return n})();var De$1=class extends P{constructor(t,e,r){super(Ne(e),Ie$1(r,e)),this.controls=t,this._initObservables(),this._setUpdateStrategy(e),this._setUpControls(),this.updateValueAndValidity({onlySelf:!0,emitEvent:!!this.asyncValidator})}controls;at(t){return this.controls[this._adjustIndex(t)]}push(t,e={}){Array.isArray(t)?t.forEach(r=>{this.controls.push(r),this._registerControl(r)}):(this.controls.push(t),this._registerControl(t)),this.updateValueAndValidity({emitEvent:e.emitEvent}),this._onCollectionChange()}insert(t,e,r={}){this.controls.splice(t,0,e),this._registerControl(e),this.updateValueAndValidity({emitEvent:r.emitEvent})}removeAt(t,e={}){let r=this._adjustIndex(t);r<0&&(r=0),this.controls[r]&&this.controls[r]._registerOnCollectionChange(()=>{}),this.controls.splice(r,1),this.updateValueAndValidity({emitEvent:e.emitEvent})}setControl(t,e,r={}){let i=this._adjustIndex(t);i<0&&(i=0),this.controls[i]&&this.controls[i]._registerOnCollectionChange(()=>{}),this.controls.splice(i,1),e&&(this.controls.splice(i,0,e),this._registerControl(e)),this.updateValueAndValidity({emitEvent:r.emitEvent}),this._onCollectionChange()}get length(){return this.controls.length}setValue(t,e={}){Xh(()=>{ft(this,!1,t),t.forEach((r,i)=>{pt(this,!1,i),this.at(i).setValue(r,{onlySelf:!0,emitEvent:e.emitEvent})}),this.updateValueAndValidity(e)})}patchValue(t,e={}){t!=null&&(t.forEach((r,i)=>{this.at(i)&&this.at(i).patchValue(r,{onlySelf:!0,emitEvent:e.emitEvent})}),this.updateValueAndValidity(e))}reset(t=[],e={}){this._forEachChild((r,i)=>{r.reset(t[i],s(r$1({},e),{onlySelf:!0}))}),this._updatePristine(e,this),this._updateTouched(e,this),this.updateValueAndValidity(e),e?.emitEvent!==!1&&this._events.next(new F(this))}getRawValue(){return this.controls.map(t=>t.getRawValue())}clear(t={}){this.controls.length<1||(this._forEachChild(e=>e._registerOnCollectionChange(()=>{})),this.controls.splice(0),this.updateValueAndValidity({emitEvent:t.emitEvent}))}_adjustIndex(t){return t<0?t+this.length:t}_syncPendingControls(){let t=this.controls.reduce((e,r)=>r._syncPendingControls()?!0:e,!1);return t&&this.updateValueAndValidity({onlySelf:!0}),t}_forEachChild(t){this.controls.forEach((e,r)=>{t(e,r)})}_updateValue(){this.value=this.controls.filter(t=>t.enabled||this.disabled).map(t=>t.value)}_anyControls(t){return this.controls.some(e=>e.enabled&&t(e))}_setUpControls(){this._forEachChild(t=>this._registerControl(t))}_allControlsDisabled(){for(let t of this.controls)if(t.enabled)return!1;return this.controls.length>0||this.disabled}_registerControl(t){t.setParent(this),t._registerOnCollectionChange(this._onCollectionChange)}_find(t){return this.at(t)??null}};var At=new x$4(``);var An={provide:C$1,useExisting:ko(()=>bn)};var bn=(()=>{class n extends C$1{_ngModelWarningConfig;_added=!1;viewModel;control;name=null;set isDisabled(e){}model;update=new $e$3;static _ngModelWarningSentOnce=!1;_ngModelWarningSent=!1;constructor(e,r,i,o,a,m,V){super(V,m,o),this._ngModelWarningConfig=a,this._parent=e,this._setValidators(r),this._setAsyncValidators(i)}_setupWithForm(e,r){this.control=e,this.isCustomControlBased?this.setupCustomControl():(this.valueAccessor??=this.selectedValueAccessor,Ce(e,this,r))}ngOnChanges(e){this._added||this._setUpControl(),Ct(e,this.viewModel)&&(this.viewModel=this.model,this.formDirective.updateModel(this,this.model))}ngOnDestroy(){this.formDirective?.removeControl(this)}viewToModelUpdate(e){this.viewModel=e,this.update.emit(e)}get path(){return yt(this.name==null?this.name:this.name.toString(),this._parent)}get formDirective(){return this._parent?this._parent.formDirective:null}_setUpControl(){this.control=this.formDirective.addControl(this),this._added=!0}ɵngControlCreate(e){super.ngControlCreate(e)}ɵngControlUpdate(e){this.isCustomControlBased&&(this._added||this._setUpControl(),super.ngControlUpdate(e,!0))}static ɵfac=function(r){return new(r||n)(Wr(_,13),Wr(y,10),Wr(de,10),Wr(M$1,10),Wr(At,8),Wr(Ka,8),Wr(fe$1,8))};static ɵdir=jI({type:n,selectors:[[``,`formControlName`,``]],inputs:{name:[0,`formControlName`,`name`],isDisabled:[0,`disabled`,`isDisabled`],model:[0,`ngModel`,`model`]},outputs:{update:`ngModelChange`},standalone:!1,features:[$w([An,Dt]),zp,oy,$I(null)]})}return n})();var Mn={provide:M$1,useExisting:ko(()=>Mt),multi:!0};function bt(n,t){return n==null?`${t}`:(t&&typeof t==`object`&&(t=`Object`),`${n}: ${t}`.slice(0,50))}function En(n){return n.split(`:`)[0]}var Mt=(()=>{class n extends G$1{value;_optionMap=new Map;_idCounter=0;set compareWith(e){this._compareWith=e}_compareWith=Object.is;appRefInjector=D$4(qr).injector;destroyRef=D$4(ye$2);cdr=D$4(jF);_queuedWrite=!1;_writeValueAfterRender(){this._queuedWrite||this.appRefInjector.destroyed||(this._queuedWrite=!0,Hv({write:()=>{this.destroyRef.destroyed||(this._queuedWrite=!1,this.writeValue(this.value))}},{injector:this.appRefInjector}))}writeValue(e){this.cdr.markForCheck(),this.value=e;let i=bt(this._getOptionId(e),e);this.setProperty(`value`,i)}registerOnChange(e){this.onChange=r=>{this.value=this._getOptionValue(r),e(this.value)}}_registerOption(){return(this._idCounter++).toString()}_getOptionId(e){for(let r of this._optionMap.keys())if(this._compareWith(this._optionMap.get(r),e))return r;return null}_getOptionValue(e){let r=En(e);return this._optionMap.has(r)?this._optionMap.get(r):e}static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[`select`,`formControlName`,``,3,`multiple`,``,3,`ngNoCva`,``],[`select`,`formControl`,``,3,`multiple`,``,3,`ngNoCva`,``],[`select`,`ngModel`,``,3,`multiple`,``,3,`ngNoCva`,``]],hostBindings:function(r,i){r&1&&mh(`change`,function(a){return i.onChange(a.target.value)})(`blur`,function(){return i.onTouched()})},inputs:{compareWith:`compareWith`},standalone:!1,features:[$w([Mn]),zp]})}return n})();var Qn=(()=>{class n{_element;_renderer;_select;id;constructor(e,r,i){this._element=e,this._renderer=r,this._select=i,this._select&&(this.id=this._select._registerOption())}set ngValue(e){this._select!=null&&(this._select._optionMap.set(this.id,e),this._setElementValue(bt(this.id,e)),this._select._writeValueAfterRender())}set value(e){this._setElementValue(e),this._select?._writeValueAfterRender()}_setElementValue(e){this._renderer.setProperty(this._element.nativeElement,`value`,e)}ngOnDestroy(){this._select?._optionMap.delete(this.id),this._select?._writeValueAfterRender()}static ɵfac=function(r){return new(r||n)(Wr(Hr),Wr(Ka),Wr(Mt,9))};static ɵdir=jI({type:n,selectors:[[`option`]],inputs:{ngValue:`ngValue`,value:`value`},standalone:!1})}return n})();var Nn={provide:M$1,useExisting:ko(()=>Et),multi:!0};function ze$1(n,t){return n==null?`${t}`:(typeof t==`string`&&(t=`'${t}'`),t&&typeof t==`object`&&(t=`Object`),`${n}: ${t}`.slice(0,50))}function In(n){return n.split(`:`)[0]}var Et=(()=>{class n extends G$1{value;_optionMap=new Map;_idCounter=0;set compareWith(e){this._compareWith=e}_compareWith=Object.is;writeValue(e){this.value=e;let r;if(Array.isArray(e)){let i=e.map(o=>this._getOptionId(o));r=(o,a)=>{o._setSelected(i.indexOf(a)>-1)}}else r=i=>{i._setSelected(!1)};this._optionMap.forEach(r)}registerOnChange(e){this.onChange=r=>{let i=[],o=r.selectedOptions;if(o!==void 0){let a=o;for(let m=0;m<a.length;m++){let V=a[m],B=this._getOptionValue(V.value);i.push(B)}}else{let a=r.options;for(let m=0;m<a.length;m++){let V=a[m];if(V.selected){let B=this._getOptionValue(V.value);i.push(B)}}}this.value=i,e(i)}}_registerOption(e){let r=(this._idCounter++).toString();return this._optionMap.set(r,e),r}_getOptionId(e){for(let r of this._optionMap.keys())if(this._compareWith(this._optionMap.get(r)._value,e))return r;return null}_getOptionValue(e){let r=In(e);return this._optionMap.has(r)?this._optionMap.get(r)._value:e}static ɵfac=(()=>{let e;return function(i){return(e||(e=by(n)))(i||n)}})();static ɵdir=jI({type:n,selectors:[[`select`,`multiple`,``,`formControlName`,``,3,`ngNoCva`,``],[`select`,`multiple`,``,`formControl`,``,3,`ngNoCva`,``],[`select`,`multiple`,``,`ngModel`,``,3,`ngNoCva`,``]],hostBindings:function(r,i){r&1&&mh(`change`,function(a){return i.onChange(a.target)})(`blur`,function(){return i.onTouched()})},inputs:{compareWith:`compareWith`},standalone:!1,features:[$w([Nn]),zp]})}return n})();var Jn=(()=>{class n{_element;_renderer;_select;id;_value;constructor(e,r,i){this._element=e,this._renderer=r,this._select=i,this._select&&(this.id=this._select._registerOption(this))}set ngValue(e){this._select!=null&&(this._value=e,this._setElementValue(ze$1(this.id,e)),this._select.writeValue(this._select.value))}set value(e){this._select?(this._value=e,this._setElementValue(ze$1(this.id,e)),this._select.writeValue(this._select.value)):this._setElementValue(e)}_setElementValue(e){this._renderer.setProperty(this._element.nativeElement,`value`,e)}_setSelected(e){this._renderer.setProperty(this._element.nativeElement,`selected`,e)}ngOnDestroy(){this._select&&(this._select._optionMap.delete(this.id),this._select.writeValue(this._select.value))}static ɵfac=function(r){return new(r||n)(Wr(Hr),Wr(Ka),Wr(Et,9))};static ɵdir=jI({type:n,selectors:[[`option`]],inputs:{ngValue:`ngValue`,value:`value`},standalone:!1})}return n})();var Nt=(()=>{class n{static ɵfac=function(r){return new(r||n)};static ɵmod=LI({type:n});static ɵinj=au({})}return n})();function Ye$1(n){return!!n&&(n.asyncValidators!==void 0||n.validators!==void 0||n.updateOn!==void 0)}var er=(()=>{class n{useNonNullable=!1;get nonNullable(){let e=new n;return e.useNonNullable=!0,e}group(e,r=null){let i=this._reduceControls(e),o={};return Ye$1(r)?o=r:r!==null&&(o.validators=r.validator,o.asyncValidators=r.asyncValidator),new j(i,o)}record(e,r=null){return new Ve$1(this._reduceControls(e),r)}control(e,r,i){let o={};return this.useNonNullable?(Ye$1(r)?o=r:(o.validators=r,o.asyncValidators=i),new Y(e,s(r$1({},o),{nonNullable:!0}))):new Y(e,r,i)}array(e,r,i){return new De$1(e.map(a=>this._createControl(a)),r,i)}_reduceControls(e){let r={};return Object.keys(e).forEach(i=>{r[i]=this._createControl(e[i])}),r}_createControl(e){if(e instanceof Y)return e;if(e instanceof P)return e;if(Array.isArray(e)){let r=e[0],i=e.length>1?e[1]:null,o=e.length>2?e[2]:null;return this.control(r,i,o)}else return this.control(e)}static ɵfac=function(r){return new(r||n)};static ɵprov=Vr({token:n,factory:n.ɵfac})}return n})();var tr=(()=>{class n{static withConfig(e){return{ngModule:n,providers:[{provide:L$1,useValue:e.callSetDisabledState??X}]}}static ɵfac=function(r){return new(r||n)};static ɵmod=LI({type:n});static ɵinj=au({imports:[Nt]})}return n})();var nr=(()=>{class n{static withConfig(e){return{ngModule:n,providers:[{provide:At,useValue:e.warnOnNgModelWithFormControl??`always`},{provide:L$1,useValue:e.callSetDisabledState??X}]}}static ɵfac=function(r){return new(r||n)};static ɵmod=LI({type:n});static ɵinj=au({imports:[Nt]})}return n})();var x$1={UN:{code:`UN`,label:`Role unavailable`,colorClass:`bg-role-cw`},PO:{code:`PO`,label:`Super Admin`,colorClass:`bg-role-po`},CA:{code:`CA`,label:`Company Admin`,colorClass:`bg-role-ca`},RM:{code:`RM`,label:`Registered Manager`,colorClass:`bg-role-rm`},CC:{code:`CC`,label:`Care Coordinator`,colorClass:`bg-role-cc`},CW:{code:`CW`,label:`Care Worker`,colorClass:`bg-role-cw`},FS:{code:`FS`,label:`Field Supervisor`,colorClass:`bg-role-fs`},QA:{code:`QA`,label:`Quality Assurance`,colorClass:`bg-role-qa`},HR:{code:`HR`,label:`HR Officer`,colorClass:`bg-role-hr`},FN:{code:`FN`,label:`Finance Officer`,colorClass:`bg-role-fn`},TM:{code:`TM`,label:`Training Manager`,colorClass:`bg-role-tm`},CO:{code:`CO`,label:`Compliance Officer`,colorClass:`bg-role-co`},IN:{code:`IN`,label:`Inspector / Commissioner`,colorClass:`bg-role-in`}};var g=`https://care.neuraledge.co.ke/api/v1`;var A$1=new URL(g).pathname;var c=class extends Error{constructor(t,s,r,i={},n){super(t);this.status=s;this.code=r;this.fieldErrors=i;this.response=n}status;code;fieldErrors;response};function S(d){let e=Object.create(null),t=(s,r)=>{if(typeof s==`string`&&r)e[r]=[...e[r]??[],s];else if(Array.isArray(s))for(let i of s)t(i,r);else if(s&&typeof s==`object`)for(let[i,n]of Object.entries(s))t(n,r?`${r}.${i}`:i)};return t(d,``),e}var M=class d{router=D$4(we$1);destroyRef=D$4(ye$2);_session=ti(null);state=ti(`signed_out`);profile=ti(null);enrolment=ti(null);workspaces=ti([]);passwordReason=ti(``);minPasswordLength=ti(8);sessionError=ti(``);access=null;accessExpiresAt=0;idleExpiresAt=0;refreshInFlight;initialization;lastActivity=0;generation=0;serverOffset=0;session=this._session.asReadonly();currentUser=cb(()=>this._session()?.user??null);isAuthenticated=cb(()=>this.state()===`authenticated`&&!!this.access);isSuperAdmin=cb(()=>this.isAuthenticated()&&this.hasRole(`PO`));canSwitchWorkspace=cb(()=>this.isSuperAdmin()&&!!this.profile()?.can_select_workspace);needsWorkspace=cb(()=>this.isAuthenticated()&&this.canSwitchWorkspace()&&!this.session()?.workspaceId);constructor(){try{localStorage.removeItem(`cv_session`)}catch{}let e=()=>{this.recordActivity()};for(let s of[`pointerdown`,`keydown`])document.addEventListener(s,e,{passive:!0});let t=setInterval(()=>{this.isAuthenticated()&&(this.idleExpiresAt&&Date.now()>=this.idleExpiresAt?(this.clear(),this.router.navigateByUrl(`/auth/sign-in`)):Date.now()>=this.accessExpiresAt-3e4&&this.refresh().catch(()=>this.expire()))},15e3);this.destroyRef.onDestroy(()=>{clearInterval(t);for(let s of[`pointerdown`,`keydown`])document.removeEventListener(s,e)})}initialize(){return this.initialization??=this.restore()}async restore(){try{let e=await this.request(`/auth/state`);e.state!==`signed_out`?await this.apply(e):(await this.refresh(),await this.loadProfile())}catch(e){this.clear(),e instanceof c&&e.status===401||this.sessionError.set(e instanceof Error?e.message:`Unable to restore your session.`)}}signIn(e,t){return Og(()=>xe$1((async()=>(this.clear(),this.sessionError.set(``),await this.apply(await this.request(`/auth/login`,{email:e.trim(),password:t})),{requiresMfa:this.state().startsWith(`mfa_`),user:this.currentUser()}))()))}verifyMfa(e,t=!1){return Og(()=>xe$1((async()=>{let s=this.enrolment(),r=this.state()===`mfa_enrolment_required`?`/auth/mfa/confirm`:`/auth/mfa/verify`;if(r.endsWith(`confirm`)&&!s)throw new Error(`Set up your authenticator before continuing.`);return await this.apply(await this.request(r,s?{device_id:s.device_id,code:e}:{code:e})),this.session()})()))}enrolMfa(){return Og(()=>xe$1((async()=>{let e=await this.request(`/auth/mfa/enrol`,{});return this.enrolment.set(e),e})()))}resetPassword(e,t,s=t){return Og(()=>xe$1((async()=>{if(this.access&&Date.now()>=this.accessExpiresAt-1e4)try{await this.refresh()}catch(r){throw this.expire(),r}await this.request(`/auth/password/change`,{current_password:e,new_password:t,confirmation:s}),this.clear()})()))}async loadWorkspaces(){if(!this.profile()?.platform_roles.includes(`PO`))throw new Error(`Workspace selection is limited to Super Admin.`);let e=[],t=`/me/workspaces`;for(;t;){let s=await this.api(t);if(e.push(...s.results),s.next){let r=new URL(s.next,`${g}/me/workspaces`);if(r.pathname.replace(/\/$/,``)!==`${A$1}/me/workspaces`)throw new Error(`Invalid workspace page.`);t=r.pathname.slice(A$1.length)+r.search}else t=null}this.workspaces.set(e)}async selectWorkspace(e){if(!this.canSwitchWorkspace())throw new Error(`Workspace selection is limited to Super Admin.`);let t=await this.api(`/me/workspaces/select`,{company_id:e});if(t.company_id!==e)throw new Error(`The server returned a different company. Please reload your workspaces.`);this.setWorkspace(t.company_id),this.profile.update(s$1=>s$1&&s(r$1({},s$1),{company_id:t.company_id}))}setWorkspace(e){let t=this.session();t&&(this.canSwitchWorkspace()||this.profile()?.company_id===e)&&this._session.set(s(r$1({},t),{workspaceId:e}))}hasRole(...e){return!!this.currentUser()&&e.includes(this.currentUser().roleCode)}canAccessCompany(e){return this.isAuthenticated()&&!!e&&(this.isSuperAdmin()||this.profile()?.company_entry_state===`ready`&&this.profile()?.company_id===e)}nextRoute(e){return this.state().startsWith(`mfa_`)?`/auth/mfa`:this.state()===`password_change_required`?`/auth/change-password`:this.isAuthenticated()?e&&/^\/auth\/invite\/[^/?#]+$/.test(e)?e:this.isSuperAdmin()?`/manage/companies`:this.profile()?.company_entry_state===`ready`?`/manage/rota/overview`:`/access-denied`:`/auth/sign-in`}signOut(){this.sessionError.set(``);let e=this.request(`/auth/logout`,{});this.clear(),e.catch(()=>this.sessionError.set(`Sign-out could not reach the server. Please retry before leaving this device.`))}async apply(e){if(this.state.set(e.state),this.passwordReason.set(e.reason??``),this.minPasswordLength.set(e.password_policy?.min_length??8),e.state===`authenticated`)try{this.acceptToken(e),await this.loadProfile()}catch(t){throw this.clear(),t}else this.access=null,this._session.set(null),this.profile.set(null),this.enrolment.set(null)}acceptToken(e){if(!e.access)throw new Error(`The server did not return an access token.`);this.access=e.access,this.accessExpiresAt=Date.now()+(e.expires_in??300)*1e3,this.state.set(`authenticated`),this.deadlines(e)}deadlines(e){e.server_time&&(this.serverOffset=Date.parse(e.server_time)-Date.now()),e.idle_expires_at&&(this.idleExpiresAt=Math.min(Date.parse(e.idle_expires_at),e.absolute_expires_at?Date.parse(e.absolute_expires_at):1/0)-this.serverOffset)}async loadProfile(){let e=await this.api(`/me`);this.profile.set(e);let t=e.display_name||e.email,s=e.authentication&&Object.hasOwn(e.authentication,`mfa_verified_at`)?!!e.authentication.mfa_verified_at:null,r={id:e.id,name:t,email:e.email,initials:t.split(/\s+/).slice(0,2).map(i=>i[0]).join(``).toUpperCase(),roleCode:e.platform_roles.includes(`PO`)?`PO`:e.platform_roles.includes(`CA`)?`CA`:e.platform_roles.find(i=>Object.hasOwn(x$1,i)&&i!==`UN`)??`UN`,mfaEnabled:s,mfaMethod:null,workspaceIds:e.company_entry_state===`ready`&&e.company_id?[e.company_id]:[]};if(e.platform_roles.includes(`PO`))await this.loadWorkspaces();else if(e.company_entry_state===`ready`){let i=await this.api(`/me/company`);if(i.company_id!==e.company_id||i.company_entry_state!==`ready`)throw new Error(`Your company assignment changed. Please sign in again.`);this.workspaces.set([{id:i.company_id,name:i.name,entryState:i.company_entry_state}])}this._session.set({user:r,workspaceId:e.platform_roles.includes(`PO`)?this.workspaces().some(i=>i.id===e.company_id)?e.company_id:null:e.company_entry_state===`ready`?e.company_id:null,mfaVerified:s,signedInAt:null})}refresh(){if(!this.refreshInFlight){let e=this.generation;this.refreshInFlight=this.request(`/auth/refresh`,{continue_session:!1}).then(t=>{e===this.generation&&this.acceptToken(t)}).finally(()=>{this.refreshInFlight=void 0})}return this.refreshInFlight}async api(e,t,s,r,i=`json`){if(this.access&&Date.now()>=this.accessExpiresAt-1e4)try{await this.refresh()}catch(n){throw this.expire(),n}try{return await this.request(e,t,s,r,i)}catch(n){if(n instanceof c&&n.status===403&&n.code===`password_change_required`)this.state.set(`password_change_required`),this.passwordReason.set(n.response?.reason??``),this.minPasswordLength.set(n.response?.password_policy?.min_length??8),this.router.navigateByUrl(`/auth/change-password`);else if(n instanceof c&&n.status===401&&this.access){try{await this.refresh()}catch(o){throw this.expire(),o}try{return await this.request(e,t,s,r,i)}catch(o){throw o instanceof c&&o.status===401&&this.expire(),o}}throw n}}async recordActivity(){if(!(!this.isAuthenticated()||Date.now()-this.lastActivity<6e4)){this.lastActivity=Date.now();try{this.deadlines(await this.api(`/auth/activity`,void 0,`POST`))}catch{}}}async request(e,t,s$2,r,i=`json`){let n=s(r$1({},r),{Accept:`application/json`});this.access&&(n.Authorization=`Bearer ${this.access}`);let o=s$2??(t===void 0?`GET`:`POST`),b=t instanceof FormData;if(o!==`GET`){let p=await this.request(`/auth/csrf`),y=document.cookie.split(`; `).find(O=>O.startsWith(`csrftoken=`)),k=typeof p.csrf_token==`string`&&p.csrf_token.trim()?p.csrf_token:new URL(`https://care.neuraledge.co.ke/api/v1`).origin===window.location.origin&&y?decodeURIComponent(y.slice(10)):null;if(!k)throw new Error(`The API must return csrf_token from /auth/csrf for cross-origin sign-in.`);n[`X-CSRFToken`]=k,t!==void 0&&!b&&(n[`Content-Type`]=`application/json`)}let l;try{l=await fetch(`${g}${e}`,{method:o,credentials:`include`,signal:AbortSignal.timeout(15e3),headers:n,cache:`no-store`,body:b?t:t===void 0?void 0:JSON.stringify(t)})}catch{throw new Error(`Unable to reach CareVerity. Check your connection and try again.`)}if(l.status===204)return;if(l.ok&&i===`blob`)return await l.blob();let h=await l.json().catch(()=>null);if(!l.ok){let p=S(h?.field_errors);throw new c(Object.values(p).flat().join(` `)||h?.detail||`CareVerity is temporarily unavailable. Please try again.`,l.status,h?.code??`request_failed`,p,h)}if(!h)throw new Error(`The API returned an invalid response. Check the API proxy.`);return h}expire(){this.clear(),this.router.navigateByUrl(`/auth/sign-in`)}clear(){this.generation++,this.access=null,this.accessExpiresAt=0,this.idleExpiresAt=0,this.lastActivity=0,this._session.set(null),this.profile.set(null),this.enrolment.set(null),this.workspaces.set([]),this.state.set(`signed_out`)}acceptInvite(e){return Og(()=>xe$1((async()=>{await this.api(`/auth/invitations/${encodeURIComponent(e)}/accept`,{}),await this.loadProfile()})()))}signInDemoSession(){return wg(()=>new Error(`Local sign-in is disabled. Sign in through the API.`))}static ɵfac=function(t){return new(t||d)};static ɵprov=ce$2({token:d,factory:d.ɵfac,providedIn:`root`})};var Oe=`@`;var Ue=(()=>{class e{doc;delegate;zone;animationType;moduleImpl;_rendererFactoryPromise=null;scheduler=null;injector=D$4(fe$1);loadingSchedulerFn=D$4(Ge,{optional:!0});_engine;constructor(a,n,o,r,s){this.doc=a,this.delegate=n,this.zone=o,this.animationType=r,this.moduleImpl=s}ngOnDestroy(){this._engine?.flush()}loadImpl(){let a=()=>this.moduleImpl??import(`./chunk-BvlmGpJ5.js`).then(o=>o),n;return this.loadingSchedulerFn?n=this.loadingSchedulerFn(a):n=a(),n.catch(o=>{throw new N$3(5300,!1)}).then(({ɵcreateEngine:o,ɵAnimationRendererFactory:r})=>{this._engine=o(this.animationType,this.doc);let s=new r(this.delegate,this._engine,this.zone);return this.delegate=s,s})}createRenderer(a,n){let o=this.delegate.createRenderer(a,n);if(o.ɵtype===0)return o;typeof o.throwOnSyntheticProps==`boolean`&&(o.throwOnSyntheticProps=!1);let r=new G(o);return n?.data?.animation&&!this._rendererFactoryPromise&&(this._rendererFactoryPromise=this.loadImpl()),this._rendererFactoryPromise?.then(s=>{let Ne=s.createRenderer(a,n);r.use(Ne),this.scheduler??=this.injector.get(Oe$1,null,{optional:!0}),this.scheduler?.notify(10)}).catch(s=>{r.use(o)}),r}begin(){this.delegate.begin?.()}end(){this.delegate.end?.()}whenRenderingDone(){return this.delegate.whenRenderingDone?.()??Promise.resolve()}componentReplaced(a){this._engine?.flush(),this.delegate.componentReplaced?.(a)}static ɵfac=function(n){JE()};static ɵprov=ce$2({token:e,factory:e.ɵfac})}return e})();var G=class{delegate;replay=[];ɵtype=1;constructor(t){this.delegate=t}use(t){if(this.delegate=t,this.replay!==null){for(let a of this.replay)a(t);this.replay=null}}get data(){return this.delegate.data}destroy(){this.replay=null,this.delegate.destroy()}createElement(t,a){return this.delegate.createElement(t,a)}createComment(t){return this.delegate.createComment(t)}createText(t){return this.delegate.createText(t)}get destroyNode(){return this.delegate.destroyNode}appendChild(t,a){this.delegate.appendChild(t,a)}insertBefore(t,a,n,o){this.delegate.insertBefore(t,a,n,o)}removeChild(t,a,n,o){this.delegate.removeChild(t,a,n,o)}selectRootElement(t,a){return this.delegate.selectRootElement(t,a)}parentNode(t){return this.delegate.parentNode(t)}nextSibling(t){return this.delegate.nextSibling(t)}setAttribute(t,a,n,o){this.delegate.setAttribute(t,a,n,o)}removeAttribute(t,a,n){this.delegate.removeAttribute(t,a,n)}addClass(t,a){this.delegate.addClass(t,a)}removeClass(t,a){this.delegate.removeClass(t,a)}setStyle(t,a,n,o){this.delegate.setStyle(t,a,n,o)}removeStyle(t,a,n){this.delegate.removeStyle(t,a,n)}setProperty(t,a,n){this.shouldReplay(a)&&this.replay.push(o=>o.setProperty(t,a,n)),this.delegate.setProperty(t,a,n)}setValue(t,a){this.delegate.setValue(t,a)}listen(t,a,n,o){return this.shouldReplay(a)&&this.replay.push(r=>r.listen(t,a,n,o)),this.delegate.listen(t,a,n,o)}shouldReplay(t){return this.replay!==null&&t.startsWith(Oe)}};var Ge=new x$4(``);function Te(e=`animations`){return je$2(`NgAsyncAnimations`),yr([{provide:Lr,useFactory:()=>new Ue(D$4(Cr),D$4(Dr),D$4(be$1),e)},{provide:$m,useValue:e===`noop`?`NoopAnimations`:`BrowserAnimations`}])}var Ve=(e,t)=>{let a=D$4(M),n=D$4(we$1);return!a.isAuthenticated()&&a.state()!==`signed_out`?n.parseUrl(a.nextRoute()):a.isAuthenticated()||n.createUrlTree([`/auth/sign-in`],{queryParams:{redirectTo:t.url}})};var xe=()=>{let e=D$4(M);return!e.isAuthenticated()||D$4(we$1).parseUrl(e.nextRoute())};var De=()=>{let e=D$4(M);return e.state()===`password_change_required`||D$4(we$1).parseUrl(e.nextRoute())};var Le=()=>{let e=D$4(M);return e.canSwitchWorkspace()||D$4(we$1).parseUrl(e.nextRoute())};var v=()=>{let e=D$4(M),t=D$4(we$1);if(!e.isAuthenticated())return t.parseUrl(e.nextRoute());let a=e.profile();return e.isSuperAdmin()||a?.company_entry_state===`ready`&&a.company_id?!0:t.parseUrl(`/access-denied`)};var ke=(e,t)=>{let a=D$4(M),n=D$4(we$1);if(!a.isAuthenticated())return n.parseUrl(a.nextRoute());let o=t.url.split(/[?#]/)[0].replace(/\/$/,``);if(a.isSuperAdmin()){let s=e.routeConfig?.path?.startsWith(`companies/:id`)?e.paramMap.get(`id`):null;return s&&s!==a.session()?.workspaceId?a.selectWorkspace(s).then(()=>!0).catch(()=>n.parseUrl(`/access-denied`)):!a.session()?.workspaceId&&!o.startsWith(`/manage/companies`)?n.parseUrl(`/select-workspace`):!0}let r=a.profile()?.company_id;return!r||a.profile()?.company_entry_state!==`ready`?n.parseUrl(`/access-denied`):o===`/manage/companies`?n.createUrlTree([`/manage/companies`,r]):o===`/manage/companies/new`||o===`/manage/companies/directory`||e.routeConfig?.path?.startsWith(`companies/:id`)&&!a.canAccessCompany(e.paramMap.get(`id`)??``)?n.parseUrl(`/access-denied`):!0};var He=(e,t)=>{if(!t.url.startsWith(`/manage/companies`)&&!t.url.startsWith(`/manage/locations`))return!0;let a=D$4(me$1);return import(`./chunk-D792nOR6.js`).then(n=>Uo(a,()=>{let o=D$4(n.CompaniesApiService),r=o.ensureLoaded(),s=e.paramMap.get(`id`);return[`companies/:id`,`companies/:id/compliance`,`companies/:id/contacts`].includes(e.routeConfig?.path??``)&&s&&r.then(()=>o.loadDetail(s)),!0}))};var C=async(e,t)=>{let a=D$4(me$1);return import(`./chunk-DJixuZoX.js`).then(n=>Uo(a,async()=>{let o=D$4(n.CompanyAccessService),r=D$4(we$1);return await o.refreshForNavigation(),o.canPath(t.url)||r.createUrlTree([`/access-denied`])}))};var A=(e,t)=>{let a=D$4(me$1);return import(`./chunk-DsLEgC5F.js`).then(n=>Uo(a,()=>n.hrGuard(e,t)))};var We=async(e,t)=>{let a=D$4(me$1);return import(`./chunk-DJixuZoX.js`).then(n=>Uo(a,async()=>{let o=D$4(n.CompanyAccessService),r=D$4(we$1);return await o.refreshForNavigation(),o.can(`people`,`recruitment`,`read`)||r.createUrlTree([`/access-denied`])}))};var W=[...[`family-portal`,`family-portal/:page`,`family/:clientId/:accessId/:page`].map(e=>({path:e,canActivate:[v,C],title:`Family Portal · CareVerity`,loadComponent:()=>import(`./chunk-BWqdn3WL.js`).then(t=>t.FamilyPortal)})),{path:`staff-portal`,canActivate:[v,C],canActivateChild:[C],loadComponent:()=>import(`./chunk-D0y6abLm.js`).then(e=>e.PortalShell),loadChildren:()=>import(`./chunk-CDaj2moQ.js`).then(e=>e.PORTAL_ROUTES)},{path:`inspector`,canActivate:[v,C],canActivateChild:[C],loadComponent:()=>import(`./chunk-C25WHkDT.js`).then(e=>e.InspectorLayout),children:[...[`dashboard`,`provider`,`service-users`,`staffing`,`medication`,`incidents`,`quality`,`documents`,`visits`,`reports`,`notes`].map(e=>({path:e,data:{page:e},title:`${e.replaceAll(`-`,` `)} \xB7 Inspector Portal \xB7 CareVerity`,loadComponent:()=>import(`./chunk-Cu4vID-u.js`).then(t=>t.InspectorPage),canDeactivate:[t=>t.canLeave()]})),{path:``,pathMatch:`full`,redirectTo:`dashboard`}]},{path:`apply/:companyId/:vacancyId`,title:`Apply for a vacancy · CareVerity`,loadComponent:()=>import(`./chunk-DAwXtsR0.js`).then(e=>e.PublicApplication)},{path:`auth/invite/:token`,title:`Accept invitation · CareVerity`,loadComponent:()=>import(`./chunk-Be4Zrlt_.js`).then(e=>e.InviteAccept)},{path:`auth`,canActivate:[xe],children:[{path:``,redirectTo:`sign-in`,pathMatch:`full`},{path:`sign-in`,title:`Sign in · CareVerity`,loadComponent:()=>import(`./chunk-C5yW-nP4.js`).then(e=>e.SignIn)},{path:`mfa`,title:`Verify your identity · CareVerity`,loadComponent:()=>import(`./chunk-L9QMe8La.js`).then(e=>e.MfaVerify)},{path:`change-password`,canActivate:[De],title:`Change password · CareVerity`,loadComponent:()=>import(`./chunk-ClsMNxqf.js`).then(e=>e.ResetPassword)},{path:`forgot-password`,title:`Reset your password · CareVerity`,loadComponent:()=>import(`./chunk-BLG-dmp5.js`).then(e=>e.ForgotPassword)},{path:`sso/microsoft`,redirectTo:`sso/google`,pathMatch:`full`},{path:`sso/google`,title:`Sign in with Google · CareVerity`,loadComponent:()=>import(`./chunk-iAnqY1Ll.js`).then(e=>e.SsoGoogle)}]},{path:`select-workspace`,title:`Select your workspace · CareVerity`,canActivate:[Le],loadComponent:()=>import(`./chunk-CX85G4zu.js`).then(e=>e.WorkspaceSelect)},{path:`account/change-password`,title:`Change your password · CareVerity`,canActivate:[Ve],loadComponent:()=>import(`./chunk-C-XEWuKN.js`).then(e=>e.ManagementLayout),children:[{path:``,loadComponent:()=>import(`./chunk-ClsMNxqf.js`).then(e=>e.ResetPassword)}]},{path:`access-denied`,title:`Access restricted · CareVerity`,loadComponent:()=>import(`./chunk-DQxJpR5R.js`).then(e=>e.AccessDenied)},{path:`account`,canActivate:[v,C],children:[{path:`security`,loadComponent:()=>import(`./chunk-C-XEWuKN.js`).then(e=>e.ManagementLayout),children:[{path:``,title:`Security settings · CareVerity`,loadComponent:()=>import(`./chunk-CFdJxM7g.js`).then(e=>e.SecuritySettings)},{path:`login-history`,title:`Login activity · CareVerity`,loadComponent:()=>import(`./chunk-DJNKt5ET.js`).then(e=>e.LoginHistory)}]},{path:``,redirectTo:`security`,pathMatch:`full`}]},{path:`family/:clientId/:accessId`,canActivate:[v,C],title:`Family Portal · CareVerity`,loadComponent:()=>import(`./chunk-BWqdn3WL.js`).then(e=>e.FamilyPortal)},{path:`manage`,canActivate:[v,C],canActivateChild:[ke,He,(e,t)=>{let a=D$4(me$1);return import(`./chunk-V6CcTEcA.js`).then(n=>Uo(a,()=>n.moduleGuard(e,t)))}],loadComponent:()=>import(`./chunk-C-XEWuKN.js`).then(e=>e.ManagementLayout),children:[{path:`companies`,title:`Companies · CareVerity`,loadComponent:()=>import(`./chunk-bPqlJRrB.js`).then(e=>e.Companies)},{path:`companies/directory`,title:`Company directory · CareVerity`,loadComponent:()=>import(`./chunk-CD5jdicK.js`).then(e=>e.CompanyDirectory)},{path:`companies/integrations`,title:`Company integrations & data · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-D6HVkpIo.js`).then(e=>e.IntegrationsSettings)},{path:`companies/access`,title:`Users & role permissions · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-DcxsImQo.js`).then(e=>e.UsersAccess)},{path:`companies/new`,title:`Create company · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-D5bh2n_d.js`).then(e=>e.CompanyCreatePage)},{path:`companies/:id/compliance`,title:`Registration & compliance · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-BTvKJxj_.js`).then(e=>e.CompanyCompliancePage)},{path:`companies/:id/contacts`,title:`Company contacts · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-B-FAdXig.js`).then(e=>e.CompanyContactsPage)},{path:`companies/:id/branding`,title:`Company branding · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-D-5fcWel.js`).then(e=>e.CompanyBrandingPage)},{path:`companies/:id/modules`,pathMatch:`full`,redirectTo:`companies/:id/modules/overview`},{path:`companies/:id/modules/:section`,title:`Modules & Feature Access · CareVerity`,canDeactivate:[(e,t,a,n)=>e.canLeave(n.url)],loadComponent:()=>import(`./chunk-DsOO6LgD.js`).then(e=>e.CompanyModulesPage)},{path:`companies/:id/settings`,title:`Company settings · CareVerity`,loadComponent:()=>import(`./chunk-DKIobULB.js`).then(e=>e.CompanyEditor)},{path:`companies/:id`,title:`Company profile · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-DlHAKHuL.js`).then(e=>e.CompanyProfile)},{path:`locations`,title:`Branches & service locations · CareVerity`,loadComponent:()=>import(`./chunk-BUUr32JH.js`).then(e=>e.LocationsPage)},{path:`access`,pathMatch:`full`,redirectTo:`companies/access`},{path:`workflows`,title:`Approval workflows · CareVerity`,loadComponent:()=>import(`./chunk-DOqyTz0t.js`).then(e=>e.ApprovalWorkflows)},{path:`settings`,pathMatch:`full`,redirectTo:`companies/integrations`},{path:`care-plans/:id`,data:{module:`Care delivery`,carePlanWorkspace:!0},title:`Care plan workspace · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-CUkIi3v6.js`).then(e=>e.CarePlan)},{path:`care-plans`,data:{module:`Care delivery`},title:`Care plan management · CareVerity`,loadComponent:()=>import(`./chunk-DPWf2tWP.js`).then(e=>e.CarePlanRegister)},{path:`clients`,canDeactivate:[e=>e.canLeave()],data:{module:`Care delivery`},title:`Service users · CareVerity`,loadComponent:()=>import(`./chunk-DbCk-Hzp.js`).then(e=>e.ClientFiles)},{path:`clients/:id`,data:{module:`Care delivery`},loadChildren:()=>import(`./chunk-BmczYHgK.js`).then(e=>e.CARE_ROUTES)},{path:`ecm/workflows`,data:{module:`Care delivery`},title:`ECM workflows · CareVerity`,loadComponent:()=>import(`./chunk-DcFtG6Vp.js`).then(e=>e.EcmWorkflows)},{path:`ecm/wallboard`,data:{module:`Care delivery`,wallboard:!0},title:`Live ECM wallboard · CareVerity`,loadComponent:()=>import(`./chunk-DNsApocy.js`).then(e=>e.EcmWallboard)},{path:`ecm`,data:{module:`Care delivery`},title:`Live ECM board · CareVerity`,loadComponent:()=>import(`./chunk-D6jt6ycF.js`).then(e=>e.Ecm)},{path:`rota`,data:{module:`Care delivery`},loadComponent:()=>import(`./chunk-BT5KKJiK.js`).then(e=>e.VisitsWorkspace),loadChildren:()=>import(`./chunk-DqW9i8oC.js`).then(e=>e.VISITS_ROUTES)},{path:`staff-journal`,pathMatch:`full`,redirectTo:`/staff-portal/journal`},{path:`staff-portal`,children:[{path:`**`,redirectTo:({url:e,queryParams:t,fragment:a})=>D$4(we$1).createUrlTree([`/staff-portal`,...e.map(n=>n.path)],{queryParams:t,fragment:a??void 0})}]},{path:`supervisor`,data:{module:`Quality & compliance`,supervisor:!0},title:`Supervisor dashboard · CareVerity`,loadComponent:()=>import(`./chunk-Cj_t5ag0.js`).then(e=>e.Quality)},{path:`quality`,data:{module:`Quality & compliance`},pathMatch:`full`,canActivate:[e=>e.queryParamMap.has(`tab`)?D$4(we$1).createUrlTree([`/manage/quality/workspace`],{queryParams:e.queryParams}):!0],title:`Quality & Compliance · CareVerity`,loadComponent:()=>import(`./chunk-C70naLfd.js`).then(e=>e.QualityDashboardPage)},{path:`quality/workspace`,data:{module:`Quality & compliance`},title:`Quality assessment workspace · CareVerity`,loadComponent:()=>import(`./chunk-Cj_t5ag0.js`).then(e=>e.Quality)},...[`new/:type`,`assessments/:id`].map(e=>({path:`quality/`+e,data:{module:`Quality & compliance`},title:`Quality assessment · CareVerity`,loadComponent:()=>import(`./chunk-CcLH7vs9.js`).then(t=>t.AssessmentEditor),canDeactivate:[t=>!t.isDirty()||window.confirm(`Leave this assessment and discard unsaved changes?`)]})),{path:`quality/:dashboard`,data:{module:`Quality & compliance`},title:`Quality & Compliance · CareVerity`,loadComponent:()=>import(`./chunk-C70naLfd.js`).then(e=>e.QualityDashboardPage)},{path:`payroll`,pathMatch:`full`,redirectTo:`finance/payroll`},{path:`finance`,pathMatch:`full`,redirectTo:`finance/overview`},{path:`finance/:area`,data:{module:`Finance`},title:e=>`${e.paramMap.get(`area`)===`payroll`?`Payroll`:e.paramMap.get(`area`)===`billing`?`Billing & payments`:`Finance overview`} \xB7 CareVerity`,loadComponent:()=>import(`./chunk-Cp-HPUGR.js`).then(e=>e.Payroll)},{path:`people`,pathMatch:`full`,canActivate:[A],data:{module:`People & HR`,hrMode:`overview`},title:`People & HR · CareVerity`,loadComponent:()=>import(`./chunk-vXoOa-Cp.js`).then(e=>e.HrWorkspace)},{path:`people/staff`,pathMatch:`full`,canActivate:[A],data:{module:`People & HR`,hrMode:`directory`},title:`Staff Directory · CareVerity`,loadComponent:()=>import(`./chunk-vXoOa-Cp.js`).then(e=>e.HrWorkspace)},{path:`people/onboarding`,canActivate:[A],data:{module:`People & HR`},title:`Onboarding · CareVerity`,loadComponent:()=>import(`./chunk-Cdb_sLQm.js`).then(e=>e.HrOnboarding)},{path:`people/compliance`,canActivate:[A],data:{module:`People & HR`},title:`Workforce Compliance · CareVerity`,loadComponent:()=>import(`./chunk-D6gb6fpU.js`).then(e=>e.HrCompliance)},{path:`people/staff/new`,canActivate:[A],data:{module:`People & HR`},title:`Create staff · CareVerity`,canDeactivate:[e=>e.canLeave()],loadComponent:()=>import(`./chunk-CX9Sk4El.js`).then(e=>e.StaffCreate)},...[`overview`,`personal`,`employment`,`compliance`,`availability`,`training`,`documents`,`reviews`,`performance`,`notes`,`audit`].map(e=>({path:`people/staff/:id/`+e,canActivate:[A],data:{module:`People & HR`,staffSection:e},title:`Staff profile · CareVerity`,canDeactivate:[t=>t.canLeave()],loadComponent:()=>import(`./chunk-Bh13Pqc3.js`).then(t=>t.StaffProfile)})),{path:`people/staff/:id`,pathMatch:`full`,redirectTo:`people/staff/:id/overview`},...[`staff`,`onboarding`,`compliance`].map(e=>({path:e,pathMatch:`full`,redirectTo:`people/`+e})),{path:`recruitment`,data:{module:`People & HR`},title:`Recruitment · CareVerity`,loadComponent:()=>import(`./chunk-BeYySg-7.js`).then(e=>e.Recruitment)},...[`leave`,`reviews`].map(e=>({path:e,data:{section:e,module:`People & HR`},title:`People & development · CareVerity`,canActivate:[A],loadComponent:()=>import(`./chunk-5iiIELeq.js`).then(t=>t.HrTeam)})),{path:`people/:id`,canActivate:[We],data:{module:`People & HR`},title:`Person profile · CareVerity`,loadComponent:()=>import(`./chunk-D21huAV2.js`).then(e=>e.PersonDetail)},{path:`learning`,data:{module:`Training academy`},title:`CareVerity Academy · CareVerity`,loadChildren:()=>import(`./chunk-DIFVT-KY.js`).then(e=>e.ACADEMY_ADMIN_ROUTES)},{path:``,pathMatch:`full`,redirectTo:()=>D$4(M).hasRole(`CA`)?`/manage/rota/overview`:`/manage/companies`}]},{path:``,pathMatch:`full`,redirectTo:`auth/sign-in`},{path:`**`,title:`Page not found · CareVerity`,loadComponent:()=>import(`./chunk-B4mBHwFz.js`).then(e=>e.NotFound)}];function Fe(e){for(let t of e)(t.canActivate||t.canActivateChild)&&(t.runGuardsAndResolvers=`always`),t.children&&Fe(t.children)}Fe(W);var Ie={providers:[Vm(),hc(W,yc(),Dc({urlUpdateStrategy:`eager`}),pc({anchorScrolling:`enabled`})),Te(),{provide:nt$1,useValue:{appearance:`outline`,hideRequiredMarker:!0}},{provide:kt$1,useValue:{duration:3500,horizontalPosition:`right`,verticalPosition:`bottom`}}]};function je(e,t){if(e&1&&(Oi(0,`cv-auth-split-layout`),uh(1,`cv-skeleton`,2)(2,`cv-skeleton`,3),ph(3,4),rl()),e&2){JD();let a=sw(3);sE(3),lh(`ngTemplateOutlet`,a)}}function qe(e,t){if(e&1&&(Oi(0,`cv-auth-centered-layout`,1),uh(1,`cv-skeleton`,2),ph(2,4),rl()),e&2){JD();let a=sw(3);sE(2),lh(`ngTemplateOutlet`,a)}}function Qe(e,t){e&1&&uh(0,`cv-skeleton`,8)(1,`cv-skeleton`,9)}function ze(e,t){if(e&1&&(Oi(0,`div`,5),FD(1,Qe,2,0,null,null,PD),uh(3,`cv-skeleton`,6),rl(),Oi(4,`span`,7),Mw(5,`Restoring your session.`),rl()),e&2){let a=JD();sE(),jD(a.labels())}}var x=class e{path=OF(`/auth/sign-in`);labels(){let t=this.path();return t.includes(`change-password`)?[`Current password`,`New password`,`Confirm new password`]:t.includes(`mfa`)?[`Authenticator code`]:t.includes(`workspace`)?[`Search companies`]:t.includes(`invite`)?[`Invitation details`]:t.includes(`sign-in`)||t===`/`?[`Email address`,`Password`]:[`Account details`]}static ɵfac=function(a){return new(a||e)};static ɵcmp=OI({type:e,selectors:[[`cv-auth-loading`]],hostAttrs:[`role`,`status`,`aria-label`,`Loading authentication`,`aria-busy`,`true`],inputs:{path:[1,`path`]},decls:4,vars:1,consts:[[`fields`,``],[`width`,`md`],[`sizeClass`,`h-8 w-52 max-w-full`],[`sizeClass`,`mt-3 h-3 w-64 max-w-full`],[3,`ngTemplateOutlet`],[`aria-hidden`,`true`,1,`mt-6`],[`sizeClass`,`mt-5 h-12 w-full`],[1,`sr-only`],[`sizeClass`,`mb-2 h-3 w-24`],[`sizeClass`,`mb-5 h-12 w-full`]],template:function(a,n){a&1&&(RD(0,je,4,1,`cv-auth-split-layout`)(1,qe,3,1,`cv-auth-centered-layout`,1),Zp(2,ze,6,0,`ng-template`,null,0,rb)),a&2&&kD(n.path().includes(`sign-in`)||n.path()===`/`?0:1)},dependencies:[w$1,v$1,l$1,Ws],encapsulation:2})};var Be=()=>[0,1,2,3,4,5,6];function $e(e,t){if(e&1&&uh(0,`cv-auth-loading`,0),e&2){let a=JD();lh(`path`,a.url())}}function Ye(e,t){e&1&&uh(0,`cv-skeleton`,6)}function Ze(e,t){e&1&&(Oi(0,`aside`,3),uh(1,`cv-logo`,5),FD(2,Ye,1,0,`cv-skeleton`,6,PD),rl()),e&2&&(sE(2),jD(Uw(0,Be)))}function Ke(e,t){if(e&1&&(Oi(0,`div`,2),RD(1,Ze,4,1,`aside`,3),Oi(2,`main`)(3,`header`),uh(4,`cv-logo`),rl(),uh(5,`cv-page-loading`,4),rl()()),e&2){let a=JD();_h(`with-navigation`,a.shell()),sE(),kD(a.shell()?1:-1),sE(4),lh(`url`,a.url())}}var D=class e{url=OF.required();shell=cb(()=>r(this.url()));authentication=cb(()=>/^\/(auth(?:\/|$)|select-workspace(?:[/?#]|$))/.test(this.url()));static ɵfac=function(a){return new(a||e)};static ɵcmp=OI({type:e,selectors:[[`cv-page-transition`]],inputs:{url:[1,`url`]},decls:2,vars:1,consts:[[3,`path`],[1,`page-transition`,3,`with-navigation`],[1,`page-transition`],[`aria-hidden`,`true`],[3,`url`],[`tone`,`light`],[`sizeClass`,`mt-6 h-4 w-full`]],template:function(a,n){a&1&&RD(0,$e,1,1,`cv-auth-loading`,0)(1,Ke,6,4,`div`,1),a&2&&kD(n.authentication()?0:1)},dependencies:[x,k$1,u$1,l$1],styles:[`.page-transition[_ngcontent-%COMP%]{min-height:100svh;background:#eff7fb}.with-navigation[_ngcontent-%COMP%]{display:grid;grid-template-columns:240px minmax(0,1fr)}aside[_ngcontent-%COMP%]{padding:24px;background:#0b3050}main[_ngcontent-%COMP%]{padding:16px;min-width:0}header[_ngcontent-%COMP%]{display:flex;align-items:center;margin-bottom:24px}@media(max-width:1023px){.with-navigation[_ngcontent-%COMP%]{display:block}aside[_ngcontent-%COMP%]{display:none}main[_ngcontent-%COMP%]{padding:12px}}`]})};function Xe(e,t){e&1&&uh(0,`cv-page-transition`,1),e&2&&lh(`url`,t)}function Je(e,t){if(e&1&&uh(0,`cv-page-transition`,1),e&2){let a=JD();lh(`url`,a.initialPath)}}function et(e,t){if(e&1){let a=WD();Oi(0,`div`,2)(1,`p`),Mw(2,`This page could not be loaded.`),rl(),Oi(3,`button`,3),mh(`click`,function(){Au(a);let o=JD();return Ru(o.retry())}),Mw(4,`Retry`),rl()()}}var L=class e{router=D$4(we$1);auth=D$4(M);navigation=D$4(f);ready=ti(!1);failed=ti(!1);initialPath=window.location.pathname;constructor(){this.router.events.pipe(ln$1(a=>a instanceof J||a instanceof Ue$3),U$1()).subscribe(a=>{this.failed.set(a instanceof Ue$3),this.ready.set(!0)});let t=()=>this.router.initialNavigation();this.auth.initialize().then(t,t)}retry(){window.location.reload()}static ɵfac=function(a){return new(a||e)};static ɵcmp=OI({type:e,selectors:[[`app-root`]],decls:5,vars:5,consts:[[1,`app-route-content`,3,`hidden`],[3,`url`],[`role`,`alert`,1,`p-6`],[`type`,`button`,3,`click`]],template:function(a,n){if(a&1&&(Oi(0,`div`,0),uh(1,`router-outlet`),rl(),RD(2,Xe,1,1,`cv-page-transition`,1),RD(3,Je,1,1,`cv-page-transition`,1),RD(4,et,5,0,`div`,2)),a&2){let o;lh(`hidden`,!n.ready()||!!n.navigation.rootDestination()),ch(`inert`,!n.ready()||n.navigation.rootDestination()?``:null),sE(2),kD((o=n.ready()&&n.navigation.rootDestination())?2:-1,o),sE(),kD(n.ready()?-1:3),sE(),kD(n.failed()?4:-1)}},dependencies:[Vr$1,D],styles:[`.app-route-content[_ngcontent-%COMP%]{display:contents}.app-route-content[hidden][_ngcontent-%COMP%]{display:none!important}`]})};Ca(L,Ie).catch(e=>console.error(e));export{H$2 as $,yn as A,b$1 as B,bn as C,nr as D,gn as E,it$1 as F,w$1 as G,f as H,mn$1 as I,Ht$1 as J,v$1 as K,tt$1 as L,Qn$1 as M,bt$1 as N,tr as O,et$2 as P,Dt$1 as Q,xt$1 as R,_n as S,er as T,T$4 as U,k$3 as V,U$1 as W,B$2 as X,lt$1 as Y,Ct$1 as Z,Ut as _,Bt$1 as _t,x$1 as a,_i as at,Yn as b,Dn as c,le$2 as ct,Kn as d,st$1 as dt,Mt$1 as et,Kt as f,te$1 as ft,St as g,xt$2 as gt,Se as h,wt$1 as ht,g as i,Zt$1 as it,zt as j,ye as k,Jn as l,me as lt,Qn as m,we as mt,M as n,Vt$1 as nt,$t as o,ae$2 as ot,Mt as p,tt$2 as pt,u$1 as q,c as r,W$2 as rt,C$1 as s,j$1 as st,A$1 as t,Pt$1 as tt,Jt as u,pe as ut,Xn as v,Mt$2 as vt,cn as w,Ze$1 as x,Xt as y,mt$1 as yt,k$1 as z};