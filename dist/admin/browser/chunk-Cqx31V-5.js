import{n as s,t as r}from"./chunk-C9yOwMO6.js";import{B as Hr,Bn as hh,Cn as be,En as by,Er as rw,Ft as UI,Gn as jF,Kn as jI,Mn as cs,Mr as ti,Tr as rl,Ur as x,V as Hv,W as Ih,X as Ka,Zt as Vr,_ as Cr,at as Ll,cn as Xn,ft as OI,hn as Zp,hr as ow,ht as Oi,kn as ch,mt as Og,ni as zp,nt as LI,on as X$1,r as $e,rr as kr,sr as ln,v as D,vn as _h,xn as au,yt as Pg,zn as fe}from"./chunk-CUCVH8se.js";import{E as zt$1,T as ze$1,_ as ne,c as Re$1,g as l,m as ft,p as dt,r as Ft$1,y as qe}from"./chunk-DrgtMvFy.js";import{a as K$1,l as j$1,t as A}from"./chunk-DPaYt_vW.js";import{$ as H,Z as Ct,at as _i,ct as le,dt as st,ft as te,it as Zt,mt as we,nt as Vt$1,ot as ae,pt as tt,st as j$2,ut as pe}from"./main-XHMEUYN7.js";var u=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;positionStrategy;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;scrollStrategy;closeOnNavigation=!0;closeOnDestroy=!0;closeOnOverlayDetachments=!0;disableAnimations=!1;providers;container;templateContext;bindings};var K=(()=>{class i extends tt{_elementRef=D(Hr);_focusTrapFactory=D(ze$1);_config;_interactivityChecker=D(ft);_ngZone=D(be);_focusMonitor=D(dt);_renderer=D(Ka);_changeDetectorRef=D(jF);_injector=D(fe);_platform=D(l);_document=D(Cr);_portalOutlet;_focusTrapped=new X$1;_focusTrap=null;_elementFocusedBeforeDialogWasOpened=null;_closeInteractionType=null;_ariaLabelledByQueue=[];_isDestroyed=!1;constructor(){super(),this._config=D(u,{optional:!0})||new u,this._config.ariaLabelledBy&&this._ariaLabelledByQueue.push(this._config.ariaLabelledBy)}_addAriaLabelledBy(t){this._ariaLabelledByQueue.push(t),this._changeDetectorRef.markForCheck()}_removeAriaLabelledBy(t){let e=this._ariaLabelledByQueue.indexOf(t);e>-1&&(this._ariaLabelledByQueue.splice(e,1),this._changeDetectorRef.markForCheck())}_contentAttached(){this._initializeFocusTrap(),this._captureInitialFocus()}_captureInitialFocus(){this._trapFocus()}ngOnDestroy(){this._focusTrapped.complete(),this._isDestroyed=!0,this._restoreFocus()}attachComponentPortal(t){this._portalOutlet.hasAttached();let e=this._portalOutlet.attachComponentPortal(t);return this._contentAttached(),e}attachTemplatePortal(t){this._portalOutlet.hasAttached();let e=this._portalOutlet.attachTemplatePortal(t);return this._contentAttached(),e}attachDomPortal=t=>{this._portalOutlet.hasAttached();let e=this._portalOutlet.attachDomPortal(t);return this._contentAttached(),e};_recaptureFocus(){this._containsFocus()||this._trapFocus()}_forceFocus(t,e){this._interactivityChecker.isFocusable(t)||(t.tabIndex=-1,this._ngZone.runOutsideAngular(()=>{let n=()=>{a(),l(),t.removeAttribute(`tabindex`)},a=this._renderer.listen(t,`blur`,n),l=this._renderer.listen(t,`mousedown`,n)})),t.focus(e)}_focusByCssSelector(t,e){let n=this._elementRef.nativeElement.querySelector(t);n&&this._forceFocus(n,e)}_trapFocus(t){this._isDestroyed||Hv(()=>{let e=this._elementRef.nativeElement;switch(this._config.autoFocus){case!1:case`dialog`:this._containsFocus()||e.focus(t);break;case!0:case`first-tabbable`:this._focusTrap?.focusInitialElement(t)||this._focusDialogContainer(t);break;case`first-heading`:this._focusByCssSelector(`h1, h2, h3, h4, h5, h6, [role="heading"]`,t);break;default:this._focusByCssSelector(this._config.autoFocus,t)}this._focusTrapped.next()},{injector:this._injector})}_restoreFocus(){let t=this._config.restoreFocus,e=null;if(typeof t==`string`?e=this._document.querySelector(t):typeof t==`boolean`?e=t?this._elementFocusedBeforeDialogWasOpened:null:t&&(e=t),this._config.restoreFocus&&e&&typeof e.focus==`function`){let n=Re$1(),a=this._elementRef.nativeElement;(!n||n===this._document.body||n===a||a.contains(n))&&(this._focusMonitor?(this._focusMonitor.focusVia(e,this._closeInteractionType),this._closeInteractionType=null):e.focus())}this._focusTrap&&this._focusTrap.destroy()}_focusDialogContainer(t){this._elementRef.nativeElement.focus?.(t)}_containsFocus(){let t=this._elementRef.nativeElement,e=Re$1();return t===e||t.contains(e)}_initializeFocusTrap(){this._platform.isBrowser&&(this._focusTrap=this._focusTrapFactory.create(this._elementRef.nativeElement),this._document&&(this._elementFocusedBeforeDialogWasOpened=Re$1()))}static ɵfac=function(e){return new(e||i)};static ɵcmp=(function(){function t(e,n){}return OI({type:i,selectors:[[`cdk-dialog-container`]],viewQuery:function(n,a){if(n&1&&Ih(_i,7),n&2){let l;rw(l=ow())&&(a._portalOutlet=l.first)}},hostAttrs:[`tabindex`,`-1`,1,`cdk-dialog-container`],hostVars:6,hostBindings:function(n,a){n&2&&ch(`id`,a._config.id||null)(`role`,a._config.role)(`aria-modal`,a._config.ariaModal)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null)},features:[zp],decls:1,vars:0,consts:[[`cdkPortalOutlet`,``]],template:function(n,a){n&1&&Zp(0,t,0,0,`ng-template`,0)},dependencies:[_i],styles:[`.cdk-dialog-container {
  display: block;
  width: 100%;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
}
`],encapsulation:2,changeDetection:1})})()}return i})();var p=class{overlayRef;config;componentInstance=null;componentRef=null;containerInstance;disableClose;closed=new X$1;backdropClick;keydownEvents;outsidePointerEvents;id;_detachSubscription;constructor(o,t){this.overlayRef=o,this.config=t,this.disableClose=t.disableClose,this.backdropClick=o.backdropClick(),this.keydownEvents=o.keydownEvents(),this.outsidePointerEvents=o.outsidePointerEvents(),this.id=t.id,this.keydownEvents.subscribe(e=>{e.keyCode===27&&!this.disableClose&&!qe(e)&&(e.preventDefault(),this.close(void 0,{focusOrigin:`keyboard`}))}),this.backdropClick.subscribe(()=>{!this.disableClose&&this._canClose()?this.close(void 0,{focusOrigin:`mouse`}):this.containerInstance._recaptureFocus?.()}),this._detachSubscription=o.detachments().subscribe(()=>{t.closeOnOverlayDetachments!==!1&&this.close()})}close(o,t){if(this._canClose(o)){let e=this.closed;this.containerInstance._closeInteractionType=t?.focusOrigin||`program`,this._detachSubscription.unsubscribe(),this.overlayRef.dispose(),e.next(o),e.complete(),this.componentInstance=this.containerInstance=null}}updatePosition(){return this.overlayRef.updatePosition(),this}updateSize(o=``,t=``){return this.overlayRef.updateSize({width:o,height:t}),this}addPanelClass(o){return this.overlayRef.addPanelClass(o),this}removePanelClass(o){return this.overlayRef.removePanelClass(o),this}_canClose(o){let t=this.config;return!!this.containerInstance&&(!t.closePredicate||t.closePredicate(o,t,this.componentInstance))}};var Bt=new x(`DialogScrollStrategy`,{providedIn:`root`,factory:()=>{let i=D(fe);return()=>te(i)}});var jt=new x(`DialogData`);var zt=new x(`DefaultDialogConfig`);function Vt(i){let o=ti(i),t=new $e;return{valueSignal:o,get value(){return o()},change:t,ngOnDestroy(){t.complete()}}}var X=(()=>{class i{_injector=D(fe);_defaultOptions=D(zt,{optional:!0});_parentDialog=D(i,{optional:!0,skipSelf:!0});_overlayContainer=D(ae);_idGenerator=D(ne);_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new X$1;_afterOpenedAtThisLevel=new X$1;_ariaHiddenElements=new Map;_scrollStrategy=D(Bt);get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}afterAllClosed=Og(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(Ll(void 0)));open(t,e){let n=this._defaultOptions||new u;e=r(r({},n),e),e.id=e.id||this._idGenerator.getId(`cdk-dialog-`),e.id&&this.getDialogById(e.id);let a=this._getOverlayConfig(e),l=Vt$1(this._injector,a),r$1=new p(l,e),d=this._attachContainer(l,r$1,e);if(r$1.containerInstance=d,!this.openDialogs.length){let H=this._overlayContainer.getContainerElement();d._focusTrapped?d._focusTrapped.pipe(cs(1)).subscribe(()=>{this._hideNonDialogContentFromAssistiveTechnology(H)}):this._hideNonDialogContentFromAssistiveTechnology(H)}return this._attachDialogContent(t,r$1,d,e),this.openDialogs.push(r$1),r$1.closed.subscribe(()=>this._removeOpenDialog(r$1,!0)),this.afterOpened.next(r$1),r$1}closeAll(){Z(this.openDialogs,t=>t.close())}getDialogById(t){return this.openDialogs.find(e=>e.id===t)}ngOnDestroy(){Z(this._openDialogsAtThisLevel,t=>{t.config.closeOnDestroy===!1&&this._removeOpenDialog(t,!1)}),Z(this._openDialogsAtThisLevel,t=>t.close()),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete(),this._openDialogsAtThisLevel=[]}_getOverlayConfig(t){let e=new j$2({positionStrategy:t.positionStrategy||le().centerHorizontally().centerVertically(),scrollStrategy:t.scrollStrategy||this._scrollStrategy(),panelClass:t.panelClass,hasBackdrop:t.hasBackdrop,direction:t.direction,minWidth:t.minWidth,minHeight:t.minHeight,maxWidth:t.maxWidth,maxHeight:t.maxHeight,width:t.width,height:t.height,disposeOnNavigation:t.closeOnNavigation,disableAnimations:t.disableAnimations});return t.backdropClass&&(e.backdropClass=t.backdropClass),e}_attachContainer(t,e,n){let a=n.injector||n.viewContainerRef?.injector,l=[{provide:u,useValue:n},{provide:p,useValue:e},{provide:st,useValue:t}],r;n.container?typeof n.container==`function`?r=n.container:(r=n.container.type,l.push(...n.container.providers(n))):r=K;let d=new Ct(r,n.viewContainerRef,fe.create({parent:a||this._injector,providers:l}));return t.attach(d).instance}_attachDialogContent(t,e,n,a){if(t instanceof kr){let l=this._createInjector(a,e,n,void 0),r$2={$implicit:a.data,dialogRef:e};a.templateContext&&(r$2=r(r({},r$2),typeof a.templateContext==`function`?a.templateContext():a.templateContext)),n.attachTemplatePortal(new H(t,null,r$2,l))}else{let l=this._createInjector(a,e,n,this._injector),r=n.attachComponentPortal(new Ct(t,a.viewContainerRef,l,null,a.bindings));e.componentRef=r,e.componentInstance=r.instance}}_createInjector(t,e,n,a){let l=t.injector||t.viewContainerRef?.injector,r=[{provide:jt,useValue:t.data},{provide:p,useValue:e}];return t.providers&&(typeof t.providers==`function`?r.push(...t.providers(e,t,n)):r.push(...t.providers)),t.direction&&(!l||!l.get(A,null,{optional:!0}))&&r.push({provide:A,useValue:Vt(t.direction)}),fe.create({parent:l||a,providers:r})}_removeOpenDialog(t,e){let n=this.openDialogs.indexOf(t);n>-1&&(this.openDialogs.splice(n,1),this.openDialogs.length||(this._ariaHiddenElements.forEach((a,l)=>{a?l.setAttribute(`aria-hidden`,a):l.removeAttribute(`aria-hidden`)}),this._ariaHiddenElements.clear(),e&&this._getAfterAllClosed().next()))}_hideNonDialogContentFromAssistiveTechnology(t){if(t.parentElement){let e=t.parentElement.children;for(let n=e.length-1;n>-1;n--){let a=e[n];a!==t&&a.nodeName!==`SCRIPT`&&a.nodeName!==`STYLE`&&!a.hasAttribute(`aria-live`)&&!a.hasAttribute(`popover`)&&(this._ariaHiddenElements.set(a,a.getAttribute(`aria-hidden`)),a.setAttribute(`aria-hidden`,`true`))}}}_getAfterAllClosed(){let t=this._parentDialog;return t?t._getAfterAllClosed():this._afterAllClosedAtThisLevel}static ɵfac=function(e){return new(e||i)};static ɵprov=Vr({token:i,factory:i.ɵfac})}return i})();function Z(i,o){let t=i.length;for(;t--;)o(i[t])}var Tt=(()=>{class i{static ɵfac=function(e){return new(e||i)};static ɵmod=LI({type:i});static ɵinj=au({providers:[X],imports:[we,Zt,Ft$1,Zt]})}return i})();var z=class{viewContainerRef;injector;id;role=`dialog`;panelClass=``;hasBackdrop=!0;backdropClass=``;disableClose=!1;closePredicate;width=``;height=``;minWidth;minHeight;maxWidth;maxHeight;position;data=null;direction;ariaDescribedBy=null;ariaLabelledBy=null;ariaLabel=null;ariaModal=!1;autoFocus=`first-tabbable`;restoreFocus=!0;delayFocusTrap=!0;scrollStrategy;closeOnNavigation=!0;enterAnimationDuration;exitAnimationDuration;bindings};var J=`mdc-dialog--open`;var Mt=`mdc-dialog--opening`;var It=`mdc-dialog--closing`;var Ht=150;var Gt=75;var Wt=(()=>{class i extends K{_animationStateChanged=new $e;_animationsEnabled=!K$1();_actionSectionCount=0;_hostElement=this._elementRef.nativeElement;_enterAnimationDuration=this._animationsEnabled?Lt(this._config.enterAnimationDuration)??Ht:0;_exitAnimationDuration=this._animationsEnabled?Lt(this._config.exitAnimationDuration)??Gt:0;_animationTimer=null;_contentAttached(){super._contentAttached(),this._startOpenAnimation()}_startOpenAnimation(){this._animationStateChanged.emit({state:`opening`,totalTime:this._enterAnimationDuration}),this._animationsEnabled?(this._hostElement.style.setProperty(Et,`${this._enterAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(Mt,J)),this._waitForAnimationToComplete(this._enterAnimationDuration,this._finishDialogOpen)):(this._hostElement.classList.add(J),Promise.resolve().then(()=>this._finishDialogOpen()))}_startExitAnimation(){this._animationStateChanged.emit({state:`closing`,totalTime:this._exitAnimationDuration}),this._hostElement.classList.remove(J),this._animationsEnabled?(this._hostElement.style.setProperty(Et,`${this._exitAnimationDuration}ms`),this._requestAnimationFrame(()=>this._hostElement.classList.add(It)),this._waitForAnimationToComplete(this._exitAnimationDuration,this._finishDialogClose)):Promise.resolve().then(()=>this._finishDialogClose())}_updateActionSectionCount(t){this._actionSectionCount+=t,this._changeDetectorRef.markForCheck()}_finishDialogOpen=()=>{this._clearAnimationClasses(),this._openAnimationDone(this._enterAnimationDuration)};_finishDialogClose=()=>{this._clearAnimationClasses(),this._animationStateChanged.emit({state:`closed`,totalTime:this._exitAnimationDuration})};_clearAnimationClasses(){this._hostElement.classList.remove(Mt,It)}_waitForAnimationToComplete(t,e){this._animationTimer!==null&&clearTimeout(this._animationTimer),this._animationTimer=setTimeout(e,t)}_requestAnimationFrame(t){this._ngZone.runOutsideAngular(()=>{typeof requestAnimationFrame==`function`?requestAnimationFrame(t):t()})}_captureInitialFocus(){this._config.delayFocusTrap||this._trapFocus()}_openAnimationDone(t){this._config.delayFocusTrap&&this._trapFocus(),this._animationStateChanged.next({state:`opened`,totalTime:t})}ngOnDestroy(){super.ngOnDestroy(),this._animationTimer!==null&&clearTimeout(this._animationTimer)}attachComponentPortal(t){let e=super.attachComponentPortal(t);return e.location.nativeElement.classList.add(`mat-mdc-dialog-component-host`),e}static ɵfac=(()=>{let t;return function(n){return(t||(t=by(i)))(n||i)}})();static ɵcmp=(function(){function t(e,n){}return OI({type:i,selectors:[[`mat-dialog-container`]],hostAttrs:[`tabindex`,`-1`,1,`mat-mdc-dialog-container`,`mdc-dialog`],hostVars:10,hostBindings:function(n,a){n&2&&(hh(`id`,a._config.id),ch(`aria-modal`,a._config.ariaModal)(`role`,a._config.role)(`aria-labelledby`,a._config.ariaLabel?null:a._ariaLabelledByQueue[0])(`aria-label`,a._config.ariaLabel)(`aria-describedby`,a._config.ariaDescribedBy||null),_h(`_mat-animation-noopable`,!a._animationsEnabled)(`mat-mdc-dialog-container-with-actions`,a._actionSectionCount>0))},features:[zp],decls:3,vars:0,consts:[[1,`mat-mdc-dialog-inner-container`,`mdc-dialog__container`],[1,`mat-mdc-dialog-surface`,`mdc-dialog__surface`],[`cdkPortalOutlet`,``]],template:function(n,a){n&1&&(Oi(0,`div`,0)(1,`div`,1),Zp(2,t,0,0,`ng-template`,2),rl()())},dependencies:[_i],styles:[`.mat-mdc-dialog-container {
  width: 100%;
  height: 100%;
  display: block;
  box-sizing: border-box;
  max-height: inherit;
  min-height: inherit;
  min-width: inherit;
  max-width: inherit;
  outline: 0;
}

.cdk-overlay-pane.mat-mdc-dialog-panel {
  max-width: var(--%NS%mat-dialog-container-max-width, 560px);
  min-width: var(--%NS%mat-dialog-container-min-width, 280px);
}
@media (max-width: 599px) {
  .cdk-overlay-pane.mat-mdc-dialog-panel {
    max-width: var(--%NS%mat-dialog-container-small-max-width, calc(100vw - 32px));
  }
}

.mat-mdc-dialog-inner-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  box-sizing: border-box;
  height: 100%;
  opacity: 0;
  transition: opacity linear var(--%NS%mat-dialog-transition-duration, 0ms);
  max-height: inherit;
  min-height: inherit;
  min-width: inherit;
  max-width: inherit;
}
.mdc-dialog--closing .mat-mdc-dialog-inner-container {
  transition: opacity 75ms linear;
  transform: none;
}
.mdc-dialog--open .mat-mdc-dialog-inner-container {
  opacity: 1;
}
._mat-animation-noopable .mat-mdc-dialog-inner-container {
  transition: none;
}

.mat-mdc-dialog-surface {
  display: flex;
  flex-direction: column;
  flex-grow: 0;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  position: relative;
  overflow-y: auto;
  outline: 0;
  transform: scale(0.8);
  transition: transform var(--%NS%mat-dialog-transition-duration, 0ms) cubic-bezier(0, 0, 0.2, 1);
  max-height: inherit;
  min-height: inherit;
  min-width: inherit;
  max-width: inherit;
  box-shadow: var(--%NS%mat-dialog-container-elevation-shadow, none);
  border-radius: var(--%NS%mat-dialog-container-shape, var(--%NS%mat-sys-corner-extra-large, 4px));
  background-color: var(--%NS%mat-dialog-container-color, var(--%NS%mat-sys-surface, white));
}
[dir=rtl] .mat-mdc-dialog-surface {
  text-align: right;
}
.mdc-dialog--open .mat-mdc-dialog-surface, .mdc-dialog--closing .mat-mdc-dialog-surface {
  transform: none;
}
._mat-animation-noopable .mat-mdc-dialog-surface {
  transition: none;
}
.mat-mdc-dialog-surface::before {
  position: absolute;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border: 2px solid transparent;
  border-radius: inherit;
  content: "";
  pointer-events: none;
}

.mat-mdc-dialog-title {
  display: block;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  margin: 0 0 1px;
  padding: var(--%NS%mat-dialog-headline-padding, 6px 24px 13px);
}
.mat-mdc-dialog-title::before {
  display: inline-block;
  width: 0;
  height: 40px;
  content: "";
  vertical-align: 0;
}
[dir=rtl] .mat-mdc-dialog-title {
  text-align: right;
}
.mat-mdc-dialog-container .mat-mdc-dialog-title {
  color: var(--%NS%mat-dialog-subhead-color, var(--%NS%mat-sys-on-surface, rgba(0, 0, 0, 0.87)));
  font-family: var(--%NS%mat-dialog-subhead-font, var(--%NS%mat-sys-headline-small-font, inherit));
  line-height: var(--%NS%mat-dialog-subhead-line-height, var(--%NS%mat-sys-headline-small-line-height, 1.5rem));
  font-size: var(--%NS%mat-dialog-subhead-size, var(--%NS%mat-sys-headline-small-size, 1rem));
  font-weight: var(--%NS%mat-dialog-subhead-weight, var(--%NS%mat-sys-headline-small-weight, 400));
  letter-spacing: var(--%NS%mat-dialog-subhead-tracking, var(--%NS%mat-sys-headline-small-tracking, 0.03125em));
}

.mat-mdc-dialog-content {
  display: block;
  flex-grow: 1;
  box-sizing: border-box;
  margin: 0;
  overflow: auto;
  max-height: 65vh;
}
.mat-mdc-dialog-content > :first-child {
  margin-top: 0;
}
.mat-mdc-dialog-content > :last-child {
  margin-bottom: 0;
}
.mat-mdc-dialog-container .mat-mdc-dialog-content {
  color: var(--%NS%mat-dialog-supporting-text-color, var(--%NS%mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6)));
  font-family: var(--%NS%mat-dialog-supporting-text-font, var(--%NS%mat-sys-body-medium-font, inherit));
  line-height: var(--%NS%mat-dialog-supporting-text-line-height, var(--%NS%mat-sys-body-medium-line-height, 1.5rem));
  font-size: var(--%NS%mat-dialog-supporting-text-size, var(--%NS%mat-sys-body-medium-size, 1rem));
  font-weight: var(--%NS%mat-dialog-supporting-text-weight, var(--%NS%mat-sys-body-medium-weight, 400));
  letter-spacing: var(--%NS%mat-dialog-supporting-text-tracking, var(--%NS%mat-sys-body-medium-tracking, 0.03125em));
}
.mat-mdc-dialog-container .mat-mdc-dialog-content {
  padding: var(--%NS%mat-dialog-content-padding, 20px 24px);
}
.mat-mdc-dialog-container-with-actions .mat-mdc-dialog-content {
  padding: var(--%NS%mat-dialog-with-actions-content-padding, 20px 24px 0);
}
.mat-mdc-dialog-container .mat-mdc-dialog-title + .mat-mdc-dialog-content {
  padding-top: 0;
}

.mat-mdc-dialog-actions {
  display: flex;
  position: relative;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  box-sizing: border-box;
  min-height: 52px;
  margin: 0;
  border-top: 1px solid transparent;
  padding: var(--%NS%mat-dialog-actions-padding, 16px 24px);
  justify-content: var(--%NS%mat-dialog-actions-alignment, flex-end);
}
@media (forced-colors: active) {
  .mat-mdc-dialog-actions {
    border-top-color: CanvasText;
  }
}
.mat-mdc-dialog-actions.mat-mdc-dialog-actions-align-start, .mat-mdc-dialog-actions[align=start] {
  justify-content: start;
}
.mat-mdc-dialog-actions.mat-mdc-dialog-actions-align-center, .mat-mdc-dialog-actions[align=center] {
  justify-content: center;
}
.mat-mdc-dialog-actions.mat-mdc-dialog-actions-align-end, .mat-mdc-dialog-actions[align=end] {
  justify-content: flex-end;
}
.mat-mdc-dialog-actions .mat-button-base + .mat-button-base,
.mat-mdc-dialog-actions .mat-mdc-button-base + .mat-mdc-button-base {
  margin-left: 8px;
}
[dir=rtl] .mat-mdc-dialog-actions .mat-button-base + .mat-button-base,
[dir=rtl] .mat-mdc-dialog-actions .mat-mdc-button-base + .mat-mdc-button-base {
  margin-left: 0;
  margin-right: 8px;
}

.mat-mdc-dialog-component-host {
  display: contents;
}
`],encapsulation:2,changeDetection:1})})()}return i})();var Et=`--mat-dialog-transition-duration`;function Lt(i){return i==null?null:typeof i==`number`?i:i.endsWith(`ms`)?zt$1(i.substring(0,i.length-2)):i.endsWith(`s`)?zt$1(i.substring(0,i.length-1))*1e3:i===`0`?0:null}var j=(function(i){return i[i.OPEN=0]=`OPEN`,i[i.CLOSING=1]=`CLOSING`,i[i.CLOSED=2]=`CLOSED`,i})(j||{});var V=class{_ref;_config;_containerInstance;componentInstance;componentRef=null;disableClose;id;_afterOpened=new Xn(1);_beforeClosed=new Xn(1);_result;_closeFallbackTimeout;_state=j.OPEN;_closeInteractionType;constructor(o,t,e){this._ref=o,this._config=t,this._containerInstance=e,this.disableClose=t.disableClose,this.id=o.id,o.addPanelClass(`mat-mdc-dialog-panel`),e._animationStateChanged.pipe(ln(n=>n.state===`opened`),cs(1)).subscribe(()=>{this._afterOpened.next(),this._afterOpened.complete()}),e._animationStateChanged.pipe(ln(n=>n.state===`closed`),cs(1)).subscribe(()=>{clearTimeout(this._closeFallbackTimeout),this._finishDialogClose()}),o.overlayRef.detachments().subscribe(()=>{this._beforeClosed.next(this._result),this._beforeClosed.complete(),this._finishDialogClose()}),Pg(this.backdropClick(),this.keydownEvents().pipe(ln(n=>n.keyCode===27&&!this.disableClose&&!qe(n)))).subscribe(n=>{this.disableClose||(n.preventDefault(),Qt(this,n.type===`keydown`?`keyboard`:`mouse`))})}close(o){let t=this._config.closePredicate;t&&!t(o,this._config,this.componentInstance)||(this._result=o,this._containerInstance._animationStateChanged.pipe(ln(e=>e.state===`closing`),cs(1)).subscribe(e=>{this._beforeClosed.next(o),this._beforeClosed.complete(),this._ref.overlayRef.detachBackdrop(),this._closeFallbackTimeout=setTimeout(()=>this._finishDialogClose(),e.totalTime+100)}),this._state=j.CLOSING,this._containerInstance._startExitAnimation())}afterOpened(){return this._afterOpened}afterClosed(){return this._ref.closed}beforeClosed(){return this._beforeClosed}backdropClick(){return this._ref.backdropClick}keydownEvents(){return this._ref.keydownEvents}updatePosition(o){let t=this._ref.config.positionStrategy;return o&&(o.left||o.right)?o.left?t.left(o.left):t.right(o.right):t.centerHorizontally(),o&&(o.top||o.bottom)?o.top?t.top(o.top):t.bottom(o.bottom):t.centerVertically(),this._ref.updatePosition(),this}updateSize(o=``,t=``){return this._ref.updateSize(o,t),this}addPanelClass(o){return this._ref.addPanelClass(o),this}removePanelClass(o){return this._ref.removePanelClass(o),this}getState(){return this._state}_finishDialogClose(){this._state=j.CLOSED,this._ref.close(this._result,{focusOrigin:this._closeInteractionType}),this.componentInstance=null}};function Qt(i,o,t){return i._closeInteractionType=o,i.close(t)}var qt=new x(`MatMdcDialogData`);var Ut=new x(`mat-mdc-dialog-default-options`);var Yt=new x(`mat-mdc-dialog-scroll-strategy`,{providedIn:`root`,factory:()=>{let i=D(fe);return()=>te(i)}});var Ft=(()=>{class i{_defaultOptions=D(Ut,{optional:!0});_scrollStrategy=D(Yt);_parentDialog=D(i,{optional:!0,skipSelf:!0});_idGenerator=D(ne);_injector=D(fe);_dialog=D(X);_animationsDisabled=K$1();_openDialogsAtThisLevel=[];_afterAllClosedAtThisLevel=new X$1;_afterOpenedAtThisLevel=new X$1;dialogConfigClass=z;_dialogRefConstructor;_dialogContainerType;_dialogDataToken;get openDialogs(){return this._parentDialog?this._parentDialog.openDialogs:this._openDialogsAtThisLevel}get afterOpened(){return this._parentDialog?this._parentDialog.afterOpened:this._afterOpenedAtThisLevel}_getAfterAllClosed(){let t=this._parentDialog;return t?t._getAfterAllClosed():this._afterAllClosedAtThisLevel}afterAllClosed=Og(()=>this.openDialogs.length?this._getAfterAllClosed():this._getAfterAllClosed().pipe(Ll(void 0)));constructor(){this._dialogRefConstructor=V,this._dialogContainerType=Wt,this._dialogDataToken=qt}open(t,e){let n;e=r(r({},this._defaultOptions||new z),e),e.id=e.id||this._idGenerator.getId(`mat-mdc-dialog-`),e.scrollStrategy=e.scrollStrategy||this._scrollStrategy();let a=this._dialog.open(t,s(r({},e),{positionStrategy:le(this._injector).centerHorizontally().centerVertically(),disableClose:!0,closePredicate:void 0,closeOnDestroy:!1,closeOnOverlayDetachments:!1,disableAnimations:this._animationsDisabled||e.enterAnimationDuration?.toLocaleString()===`0`||e.exitAnimationDuration?.toString()===`0`,container:{type:this._dialogContainerType,providers:()=>[{provide:this.dialogConfigClass,useValue:e},{provide:u,useValue:e}]},templateContext:()=>({dialogRef:n}),providers:(l,r,d)=>(n=new this._dialogRefConstructor(l,e,d),n.updatePosition(e?.position),[{provide:this._dialogContainerType,useValue:d},{provide:this._dialogDataToken,useValue:r.data},{provide:this._dialogRefConstructor,useValue:n},{provide:p,useValue:null}])}));return n.componentRef=a.componentRef,n.componentInstance=a.componentInstance,this.openDialogs.push(n),this.afterOpened.next(n),n.afterClosed().subscribe(()=>{let l=this.openDialogs.indexOf(n);l>-1&&(this.openDialogs.splice(l,1),this.openDialogs.length||this._getAfterAllClosed().next())}),n}closeAll(){this._closeDialogs(this.openDialogs)}getDialogById(t){return this.openDialogs.find(e=>e.id===t)}ngOnDestroy(){this._closeDialogs(this._openDialogsAtThisLevel),this._afterAllClosedAtThisLevel.complete(),this._afterOpenedAtThisLevel.complete()}_closeDialogs(t){let e=t.length;for(;e--;)t[e].close()}static ɵfac=function(e){return new(e||i)};static ɵprov=Vr({token:i,factory:i.ɵfac})}return i})();var Nt=(()=>{class i{_dialogRef=D(V,{optional:!0});_elementRef=D(Hr);_dialog=D(Ft);ngOnInit(){this._dialogRef||(this._dialogRef=$t(this._elementRef,this._dialog.openDialogs)),this._dialogRef&&Promise.resolve().then(()=>{this._onAdd()})}ngOnDestroy(){this._dialogRef?._containerInstance&&Promise.resolve().then(()=>{this._onRemove()})}static ɵfac=function(e){return new(e||i)};static ɵdir=jI({type:i})}return i})();var Re=(()=>{class i extends Nt{id=D(ne).getId(`mat-mdc-dialog-title-`);_onAdd(){this._dialogRef._containerInstance?._addAriaLabelledBy?.(this.id)}_onRemove(){this._dialogRef?._containerInstance?._removeAriaLabelledBy?.(this.id)}static ɵfac=(()=>{let t;return function(n){return(t||(t=by(i)))(n||i)}})();static ɵdir=jI({type:i,selectors:[[``,`mat-dialog-title`,``],[``,`matDialogTitle`,``]],hostAttrs:[1,`mat-mdc-dialog-title`,`mdc-dialog__title`],hostVars:1,hostBindings:function(e,n){e&2&&hh(`id`,n.id)},inputs:{id:`id`},exportAs:[`matDialogTitle`],features:[zp]})}return i})();var Be=(()=>{class i{static ɵfac=function(e){return new(e||i)};static ɵdir=jI({type:i,selectors:[[``,`mat-dialog-content`,``],[`mat-dialog-content`],[``,`matDialogContent`,``]],hostAttrs:[1,`mat-mdc-dialog-content`,`mdc-dialog__content`],features:[UI([pe])]})}return i})();var je=(()=>{class i extends Nt{align;_onAdd(){this._dialogRef._containerInstance?._updateActionSectionCount?.(1)}_onRemove(){this._dialogRef._containerInstance?._updateActionSectionCount?.(-1)}static ɵfac=(()=>{let t;return function(n){return(t||(t=by(i)))(n||i)}})();static ɵdir=jI({type:i,selectors:[[``,`mat-dialog-actions`,``],[`mat-dialog-actions`],[``,`matDialogActions`,``]],hostAttrs:[1,`mat-mdc-dialog-actions`,`mdc-dialog__actions`],hostVars:6,hostBindings:function(e,n){e&2&&_h(`mat-mdc-dialog-actions-align-start`,n.align===`start`)(`mat-mdc-dialog-actions-align-center`,n.align===`center`)(`mat-mdc-dialog-actions-align-end`,n.align===`end`)},inputs:{align:`align`},features:[zp]})}return i})();function $t(i,o){let t=i.nativeElement.parentElement;for(;t&&!t.classList.contains(`mat-mdc-dialog-container`);)t=t.parentElement;return t?o.find(e=>e.id===t.id):null}var ze=(()=>{class i{static ɵfac=function(e){return new(e||i)};static ɵmod=LI({type:i});static ɵinj=au({providers:[Ft],imports:[Tt,we,Zt,j$1]})}return i})();export{je as a,V as i,Ft as n,qt as o,Re as r,ze as s,Be as t};