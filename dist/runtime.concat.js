/**
 * requestAnimationFrame version: "0.0.17" Copyright (c) 2011-2012, Cyril Agosta ( cyril.agosta.dev@gmail.com) All Rights Reserved.
 * Available via the MIT license.
 * see: http://github.com/cagosta/requestAnimationFrame for details
 *
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 * http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 * requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
 * MIT license
 *
 */


( function() {



    if ( typeof window === 'undefined' )
        return

    if ( window.requestAnimationFrame )
        return window.requestAnimationFrame


    if ( window.webkitRequestAnimationFrame ) { // Chrome <= 23, Safari <= 6.1, Blackberry 10
        window.requestAnimationFrame = window[ 'webkitRequestAnimationFrame' ];
        window.cancelAnimationFrame = window[ 'webkitCancelAnimationFrame' ] || window[ 'webkitCancelRequestAnimationFrame' ];
        return window.requestAnimationFrame
    }

    // IE <= 9, Android <= 4.3, very old/rare browsers

    var lastTime = 0;

    window.requestAnimationFrame = function( callback, element ) {

        var currTime = new Date().getTime();
        var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
        var id = window.setTimeout( function() {
                callback( currTime + timeToCall );
            },
            timeToCall );
        lastTime = currTime + timeToCall;
        return id; // return the id for cancellation capabilities
    };

    window.cancelAnimationFrame = function( id ) {
        clearTimeout( id );
    };

    if ( typeof define === 'function' ) {
        define( function() {
            return window.requestAnimationFrame;
        } )
    }

} )();

// Promise polyfill
(function(global) {
  if(typeof module !== 'undefined' && module.exports) {
    module.exports = global.Promise ? global.Promise : Promise;
  } else if (!global.Promise) {
    global.Promise = Promise;
  }

  var asap = global.setImmediate || function(fn){ setTimeout(fn, 0) };
  function bind(fn, thisArg) {
    return function() {
      fn.apply(thisArg, arguments);
    }
  }

  function isArray(value) {
    return Array.isArray ? Array.isArray(value) : Object.prototype.toString.call(value) === "[object Array]"
  }

  function Promise(fn) {
    if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
    if (typeof fn !== 'function') throw new TypeError('not a function')
    this._state = null
    this._value = null
    this._deferreds = []

    doResolve(fn, bind(resolve, this), bind(reject, this))
  }

  function handle(deferred) {
    var me = this;
    if (this._state === null) {
      this._deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = me._state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (me._state ? deferred.resolve : deferred.reject)(me._value)
        return
      }
      var ret
      try {
        ret = cb(me._value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === this) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(bind(then, newValue), bind(resolve, this), bind(reject, this))
          return
        }
      }
      this._state = true
      this._value = newValue
      finale.call(this)
    } catch (e) { reject.call(this, e) }
  }

  function reject(newValue) {
    this._state = false
    this._value = newValue
    finale.call(this)
  }

  function finale() {
    for (var i = 0, len = this._deferreds.length; i < len; i++)
      handle.call(this, this._deferreds[i])
    this._deferreds = null
  }

  function Handler(onFulfilled, onRejected, resolve, reject){
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
    this.onRejected = typeof onRejected === 'function' ? onRejected : null
    this.resolve = resolve
    this.reject = reject
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, onFulfilled, onRejected) {
    var done = false;
    try {
      fn(function (value) {
        if (done) return
        done = true
        onFulfilled(value)
      }, function (reason) {
        if (done) return
        done = true
        onRejected(reason)
      })
    } catch (ex) {
      if (done) return
      done = true
      onRejected(ex)
    }
  }

  Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
  };

  Promise.prototype.then = function(onFulfilled, onRejected) {
    var me = this;
    return new Promise(function(resolve, reject) {
      handle.call(me, new Handler(onFulfilled, onRejected, resolve, reject))
    })
  };

  Promise.all = function () {
    var args = Array.prototype.slice.call(arguments.length === 1 && isArray(arguments[0]) ? arguments[0] : arguments);

    return new Promise(function (resolve, reject) {
      if (args.length === 0) return resolve([]);
      var remaining = args.length;
      function res(i, val) {
        try {
          if (val && (typeof val === 'object' || typeof val === 'function')) {
            var then = val.then;
            if (typeof then === 'function') {
              then.call(val, function (val) { res(i, val) }, reject);
              return;
            }
          }
          args[i] = val;
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex);
        }
      }
      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise.resolve = function (value) {
    return new Promise(function (resolve) {
      resolve(value);
    });
  };

  Promise.reject = function (value) {
    return new Promise(function (resolve, reject) {
      reject(value);
    });
  };

  Promise.race = function (values) {
    return new Promise(function (resolve, reject) {
      values.map(function(value){
        value.then(resolve, reject);
      })
    });
  };
})(this);

// CustomEvent constructor polyfill from MDN
(function () {
  function CustomEvent ( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
   };

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();

// Copyright (c) 2012 The Polymer Authors. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//    * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//    * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
"undefined"==typeof WeakMap&&!function(){var a=Object.defineProperty,b=Date.now()%1e9,c=function(){this.name="__st"+(1e9*Math.random()>>>0)+(b++ +"__")};c.prototype={set:function(b,c){var d=b[this.name];d&&d[0]===b?d[1]=c:a(b,this.name,{value:[b,c],writable:!0})},get:function(a){var b;return(b=a[this.name])&&b[0]===a?b[1]:void 0},"delete":function(a){this.set(a,void 0)}},window.WeakMap=c}(),function(a){function b(a){u.push(a),t||(t=!0,q(d))}function c(a){return window.ShadowDOMPolyfill&&window.ShadowDOMPolyfill.wrapIfNeeded(a)||a}function d(){t=!1;var a=u;u=[],a.sort(function(a,b){return a.uid_-b.uid_});var b=!1;a.forEach(function(a){var c=a.takeRecords();e(a),c.length&&(a.callback_(c,a),b=!0)}),b&&d()}function e(a){a.nodes_.forEach(function(b){var c=p.get(b);c&&c.forEach(function(b){b.observer===a&&b.removeTransientObservers()})})}function f(a,b){for(var c=a;c;c=c.parentNode){var d=p.get(c);if(d)for(var e=0;e<d.length;e++){var f=d[e],g=f.options;if(c===a||g.subtree){var h=b(g);h&&f.enqueue(h)}}}}function g(a){this.callback_=a,this.nodes_=[],this.records_=[],this.uid_=++v}function h(a,b){this.type=a,this.target=b,this.addedNodes=[],this.removedNodes=[],this.previousSibling=null,this.nextSibling=null,this.attributeName=null,this.attributeNamespace=null,this.oldValue=null}function i(a){var b=new h(a.type,a.target);return b.addedNodes=a.addedNodes.slice(),b.removedNodes=a.removedNodes.slice(),b.previousSibling=a.previousSibling,b.nextSibling=a.nextSibling,b.attributeName=a.attributeName,b.attributeNamespace=a.attributeNamespace,b.oldValue=a.oldValue,b}function j(a,b){return w=new h(a,b)}function k(a){return x?x:(x=i(w),x.oldValue=a,x)}function l(){w=x=void 0}function m(a){return a===x||a===w}function n(a,b){return a===b?a:x&&m(a)?x:null}function o(a,b,c){this.observer=a,this.target=b,this.options=c,this.transientObservedNodes=[]}var p=new WeakMap,q=window.msSetImmediate;if(!q){var r=[],s=String(Math.random());window.addEventListener("message",function(a){if(a.data===s){var b=r;r=[],b.forEach(function(a){a()})}}),q=function(a){r.push(a),window.postMessage(s,"*")}}var t=!1,u=[],v=0;g.prototype={observe:function(a,b){if(a=c(a),!b.childList&&!b.attributes&&!b.characterData||b.attributeOldValue&&!b.attributes||b.attributeFilter&&b.attributeFilter.length&&!b.attributes||b.characterDataOldValue&&!b.characterData)throw new SyntaxError;var d=p.get(a);d||p.set(a,d=[]);for(var e,f=0;f<d.length;f++)if(d[f].observer===this){e=d[f],e.removeListeners(),e.options=b;break}e||(e=new o(this,a,b),d.push(e),this.nodes_.push(a)),e.addListeners()},disconnect:function(){this.nodes_.forEach(function(a){for(var b=p.get(a),c=0;c<b.length;c++){var d=b[c];if(d.observer===this){d.removeListeners(),b.splice(c,1);break}}},this),this.records_=[]},takeRecords:function(){var a=this.records_;return this.records_=[],a}};var w,x;o.prototype={enqueue:function(a){var c=this.observer.records_,d=c.length;if(c.length>0){var e=c[d-1],f=n(e,a);if(f)return void(c[d-1]=f)}else b(this.observer);c[d]=a},addListeners:function(){this.addListeners_(this.target)},addListeners_:function(a){var b=this.options;b.attributes&&a.addEventListener("DOMAttrModified",this,!0),b.characterData&&a.addEventListener("DOMCharacterDataModified",this,!0),b.childList&&a.addEventListener("DOMNodeInserted",this,!0),(b.childList||b.subtree)&&a.addEventListener("DOMNodeRemoved",this,!0)},removeListeners:function(){this.removeListeners_(this.target)},removeListeners_:function(a){var b=this.options;b.attributes&&a.removeEventListener("DOMAttrModified",this,!0),b.characterData&&a.removeEventListener("DOMCharacterDataModified",this,!0),b.childList&&a.removeEventListener("DOMNodeInserted",this,!0),(b.childList||b.subtree)&&a.removeEventListener("DOMNodeRemoved",this,!0)},addTransientObserver:function(a){if(a!==this.target){this.addListeners_(a),this.transientObservedNodes.push(a);var b=p.get(a);b||p.set(a,b=[]),b.push(this)}},removeTransientObservers:function(){var a=this.transientObservedNodes;this.transientObservedNodes=[],a.forEach(function(a){this.removeListeners_(a);for(var b=p.get(a),c=0;c<b.length;c++)if(b[c]===this){b.splice(c,1);break}},this)},handleEvent:function(a){switch(a.stopImmediatePropagation(),a.type){case"DOMAttrModified":var b=a.attrName,c=a.relatedNode.namespaceURI,d=a.target,e=new j("attributes",d);e.attributeName=b,e.attributeNamespace=c;var g=a.attrChange===MutationEvent.ADDITION?null:a.prevValue;f(d,function(a){return!a.attributes||a.attributeFilter&&a.attributeFilter.length&&-1===a.attributeFilter.indexOf(b)&&-1===a.attributeFilter.indexOf(c)?void 0:a.attributeOldValue?k(g):e});break;case"DOMCharacterDataModified":var d=a.target,e=j("characterData",d),g=a.prevValue;f(d,function(a){return a.characterData?a.characterDataOldValue?k(g):e:void 0});break;case"DOMNodeRemoved":this.addTransientObserver(a.target);case"DOMNodeInserted":var h,i,d=a.relatedNode,m=a.target;"DOMNodeInserted"===a.type?(h=[m],i=[]):(h=[],i=[m]);var n=m.previousSibling,o=m.nextSibling,e=j("childList",d);e.addedNodes=h,e.removedNodes=i,e.previousSibling=n,e.nextSibling=o,f(d,function(a){return a.childList?e:void 0})}l()}},a.JsMutationObserver=g,a.MutationObserver||(a.MutationObserver=g)}(this),window.CustomElements=window.CustomElements||{flags:{}},function(a){function b(a,c,d){var e=a.firstElementChild;if(!e)for(e=a.firstChild;e&&e.nodeType!==Node.ELEMENT_NODE;)e=e.nextSibling;for(;e;)c(e,d)!==!0&&b(e,c,d),e=e.nextElementSibling;return null}function c(a,b){for(var c=a.shadowRoot;c;)d(c,b),c=c.olderShadowRoot}function d(a,d){b(a,function(a){return d(a)?!0:void c(a,d)}),c(a,d)}function e(a){return h(a)?(i(a),!0):void l(a)}function f(a){d(a,function(a){return e(a)?!0:void 0})}function g(a){return e(a)||f(a)}function h(b){if(!b.__upgraded__&&b.nodeType===Node.ELEMENT_NODE){var c=b.getAttribute("is")||b.localName,d=a.registry[c];if(d)return A.dom&&console.group("upgrade:",b.localName),a.upgrade(b),A.dom&&console.groupEnd(),!0}}function i(a){l(a),r(a)&&d(a,function(a){l(a)})}function j(a){if(E.push(a),!D){D=!0;var b=window.Platform&&window.Platform.endOfMicrotask||setTimeout;b(k)}}function k(){D=!1;for(var a,b=E,c=0,d=b.length;d>c&&(a=b[c]);c++)a();E=[]}function l(a){C?j(function(){m(a)}):m(a)}function m(a){(a.attachedCallback||a.detachedCallback||a.__upgraded__&&A.dom)&&(A.dom&&console.group("inserted:",a.localName),r(a)&&(a.__inserted=(a.__inserted||0)+1,a.__inserted<1&&(a.__inserted=1),a.__inserted>1?A.dom&&console.warn("inserted:",a.localName,"insert/remove count:",a.__inserted):a.attachedCallback&&(A.dom&&console.log("inserted:",a.localName),a.attachedCallback())),A.dom&&console.groupEnd())}function n(a){o(a),d(a,function(a){o(a)})}function o(a){C?j(function(){p(a)}):p(a)}function p(a){(a.attachedCallback||a.detachedCallback||a.__upgraded__&&A.dom)&&(A.dom&&console.group("removed:",a.localName),r(a)||(a.__inserted=(a.__inserted||0)-1,a.__inserted>0&&(a.__inserted=0),a.__inserted<0?A.dom&&console.warn("removed:",a.localName,"insert/remove count:",a.__inserted):a.detachedCallback&&a.detachedCallback()),A.dom&&console.groupEnd())}function q(a){return window.ShadowDOMPolyfill?ShadowDOMPolyfill.wrapIfNeeded(a):a}function r(a){for(var b=a,c=q(document);b;){if(b==c)return!0;b=b.parentNode||b.host}}function s(a){if(a.shadowRoot&&!a.shadowRoot.__watched){A.dom&&console.log("watching shadow-root for: ",a.localName);for(var b=a.shadowRoot;b;)t(b),b=b.olderShadowRoot}}function t(a){a.__watched||(w(a),a.__watched=!0)}function u(a){if(A.dom){var b=a[0];if(b&&"childList"===b.type&&b.addedNodes&&b.addedNodes){for(var c=b.addedNodes[0];c&&c!==document&&!c.host;)c=c.parentNode;var d=c&&(c.URL||c._URL||c.host&&c.host.localName)||"";d=d.split("/?").shift().split("/").pop()}console.group("mutations (%d) [%s]",a.length,d||"")}a.forEach(function(a){"childList"===a.type&&(G(a.addedNodes,function(a){a.localName&&g(a)}),G(a.removedNodes,function(a){a.localName&&n(a)}))}),A.dom&&console.groupEnd()}function v(){u(F.takeRecords()),k()}function w(a){F.observe(a,{childList:!0,subtree:!0})}function x(a){w(a)}function y(a){A.dom&&console.group("upgradeDocument: ",a.baseURI.split("/").pop()),g(a),A.dom&&console.groupEnd()}function z(a){a=q(a);for(var b,c=a.querySelectorAll("link[rel="+B+"]"),d=0,e=c.length;e>d&&(b=c[d]);d++)b.import&&b.import.__parsed&&z(b.import);y(a)}var A=window.logFlags||{},B=window.HTMLImports?HTMLImports.IMPORT_LINK_TYPE:"none",C=!window.MutationObserver||window.MutationObserver===window.JsMutationObserver;a.hasPolyfillMutations=C;var D=!1,E=[],F=new MutationObserver(u),G=Array.prototype.forEach.call.bind(Array.prototype.forEach);a.IMPORT_LINK_TYPE=B,a.watchShadow=s,a.upgradeDocumentTree=z,a.upgradeAll=g,a.upgradeSubtree=f,a.insertedNode=i,a.observeDocument=x,a.upgradeDocument=y,a.takeRecords=v}(window.CustomElements),function(a){function b(b,g){var h=g||{};if(!b)throw new Error("document.registerElement: first argument `name` must not be empty");if(b.indexOf("-")<0)throw new Error("document.registerElement: first argument ('name') must contain a dash ('-'). Argument provided was '"+String(b)+"'.");if(c(b))throw new Error("Failed to execute 'registerElement' on 'Document': Registration failed for type '"+String(b)+"'. The type name is invalid.");if(n(b))throw new Error("DuplicateDefinitionError: a type with name '"+String(b)+"' is already registered");if(!h.prototype)throw new Error("Options missing required prototype property");return h.__name=b.toLowerCase(),h.lifecycle=h.lifecycle||{},h.ancestry=d(h.extends),e(h),f(h),l(h.prototype),o(h.__name,h),h.ctor=p(h),h.ctor.prototype=h.prototype,h.prototype.constructor=h.ctor,a.ready&&a.upgradeDocumentTree(document),h.ctor}function c(a){for(var b=0;b<y.length;b++)if(a===y[b])return!0}function d(a){var b=n(a);return b?d(b.extends).concat([b]):[]}function e(a){for(var b,c=a.extends,d=0;b=a.ancestry[d];d++)c=b.is&&b.tag;a.tag=c||a.__name,c&&(a.is=a.__name)}function f(a){if(!Object.__proto__){var b=HTMLElement.prototype;if(a.is){var c=document.createElement(a.tag);b=Object.getPrototypeOf(c)}for(var d,e=a.prototype;e&&e!==b;){var d=Object.getPrototypeOf(e);e.__proto__=d,e=d}}a.native=b}function g(a){return h(B(a.tag),a)}function h(b,c){return c.is&&b.setAttribute("is",c.is),b.removeAttribute("unresolved"),i(b,c),b.__upgraded__=!0,k(b),a.insertedNode(b),a.upgradeSubtree(b),b}function i(a,b){Object.__proto__?a.__proto__=b.prototype:(j(a,b.prototype,b.native),a.__proto__=b.prototype)}function j(a,b,c){for(var d={},e=b;e!==c&&e!==HTMLElement.prototype;){for(var f,g=Object.getOwnPropertyNames(e),h=0;f=g[h];h++)d[f]||(Object.defineProperty(a,f,Object.getOwnPropertyDescriptor(e,f)),d[f]=1);e=Object.getPrototypeOf(e)}}function k(a){a.createdCallback&&a.createdCallback()}function l(a){if(!a.setAttribute._polyfilled){var b=a.setAttribute;a.setAttribute=function(a,c){m.call(this,a,c,b)};var c=a.removeAttribute;a.removeAttribute=function(a){m.call(this,a,null,c)},a.setAttribute._polyfilled=!0}}function m(a,b,c){var d=this.getAttribute(a);c.apply(this,arguments);var e=this.getAttribute(a);this.attributeChangedCallback&&e!==d&&this.attributeChangedCallback(a,d,e)}function n(a){return a?z[a.toLowerCase()]:void 0}function o(a,b){z[a]=b}function p(a){return function(){return g(a)}}function q(a,b,c){return a===A?r(b,c):C(a,b)}function r(a,b){var c=n(b||a);if(c){if(a==c.tag&&b==c.is)return new c.ctor;if(!b&&!c.is)return new c.ctor}if(b){var d=r(a);return d.setAttribute("is",b),d}var d=B(a);return a.indexOf("-")>=0&&i(d,HTMLElement),d}function s(a){if(!a.__upgraded__&&a.nodeType===Node.ELEMENT_NODE){var b=a.getAttribute("is"),c=n(b||a.localName);if(c){if(b&&c.tag==a.localName)return h(a,c);if(!b&&!c.extends)return h(a,c)}}}function t(b){var c=D.call(this,b);return a.upgradeAll(c),c}a||(a=window.CustomElements={flags:{}});var u=a.flags,v=Boolean(document.registerElement),w=!u.register&&v&&!window.ShadowDOMPolyfill;if(w){var x=function(){};a.registry={},a.upgradeElement=x,a.watchShadow=x,a.upgrade=x,a.upgradeAll=x,a.upgradeSubtree=x,a.observeDocument=x,a.upgradeDocument=x,a.upgradeDocumentTree=x,a.takeRecords=x,a.reservedTagList=[]}else{var y=["annotation-xml","color-profile","font-face","font-face-src","font-face-uri","font-face-format","font-face-name","missing-glyph"],z={},A="http://www.w3.org/1999/xhtml",B=document.createElement.bind(document),C=document.createElementNS.bind(document),D=Node.prototype.cloneNode;document.registerElement=b,document.createElement=r,document.createElementNS=q,Node.prototype.cloneNode=t,a.registry=z,a.upgrade=s}var E;E=Object.__proto__||w?function(a,b){return a instanceof b}:function(a,b){for(var c=a;c;){if(c===b.prototype)return!0;c=c.__proto__}return!1},a.instanceof=E,a.reservedTagList=y,document.register=document.registerElement,a.hasNative=v,a.useNative=w}(window.CustomElements),function(a){function b(a){return"link"===a.localName&&a.getAttribute("rel")===c}var c=a.IMPORT_LINK_TYPE,d={selectors:["link[rel="+c+"]"],map:{link:"parseLink"},parse:function(a){if(!a.__parsed){a.__parsed=!0;var b=a.querySelectorAll(d.selectors);e(b,function(a){d[d.map[a.localName]](a)}),CustomElements.upgradeDocument(a),CustomElements.observeDocument(a)}},parseLink:function(a){b(a)&&this.parseImport(a)},parseImport:function(a){a.import&&d.parse(a.import)}},e=Array.prototype.forEach.call.bind(Array.prototype.forEach);a.parser=d,a.IMPORT_LINK_TYPE=c}(window.CustomElements),function(a){function b(){CustomElements.parser.parse(document),CustomElements.upgradeDocument(document);var a=window.Platform&&Platform.endOfMicrotask?Platform.endOfMicrotask:setTimeout;a(function(){CustomElements.ready=!0,CustomElements.readyTime=Date.now(),window.HTMLImports&&(CustomElements.elapsed=CustomElements.readyTime-HTMLImports.readyTime),document.dispatchEvent(new CustomEvent("WebComponentsReady",{bubbles:!0})),window.HTMLImports&&(HTMLImports.__importsParsingHook=function(a){CustomElements.parser.parse(a.import)})})}if("function"!=typeof window.CustomEvent&&(window.CustomEvent=function(a){var b=document.createEvent("HTMLEvents");return b.initEvent(a,!0,!0),b}),"complete"===document.readyState||a.flags.eager)b();else if("interactive"!==document.readyState||window.attachEvent||window.HTMLImports&&!window.HTMLImports.ready){var c=window.HTMLImports&&!HTMLImports.ready?"HTMLImportsLoaded":"DOMContentLoaded";window.addEventListener(c,b)}else b()}(window.CustomElements);
(function(){
  'use strict'
  // If `content` is in HTMLTemplateElement.prototype,
  // then polyfill is not required
  if(window.HTMLTemplateElement && 'content' in window.HTMLTemplateElement.prototype){ return; }

  setTemplateDisplayToNone();
  createHTMLTemplateElementPrototype();
  createTemplateHostDocument();
  polyfillContentProperty();
  upgradeExistingElements();
  setUpObserver();

  function createHTMLTemplateElementPrototype() {
    window.HTMLTemplateElement = function(){
      throw new TypeError('Illegal constructor');
    };
    HTMLTemplateElement.prototype = Object.create(HTMLElement.prototype);
  };

  function setTemplateDisplayToNone(){
    var style = document.createElement('style');
    style.textContent = 'template { display: none; }';
    document.head.appendChild(style);
  };

  function createTemplateHostDocument() {
    // Create inert document to host template's document fragments
    HTMLTemplateElement.prototype._templateHostDocument = document.implementation.createHTMLDocument('');
  };

  function polyfillContentProperty() {
    Object.defineProperty(HTMLTemplateElement.prototype, 'content', {
      get: function(){
        if(!this._contentFragment) {
          this._createContentFragment();
        };
        return this._contentFragment;
      }
    });

    // If HTMLTemplateElement is unknown, then
    HTMLTemplateElement.prototype._createContentFragment = function(){
      this._contentFragment = this._templateHostDocument.createDocumentFragment();
      while(this.firstChild) {
        this._contentFragment.appendChild(this.removeChild(this.firstChild));
      }
    };
  };

  function applyPolyfill(template){
    if(template.htmlTemplatePolyfillApplied) { return; }

    template.htmlTemplatePolyfillApplied = true;
    // TODO: or mixin?
    template.__proto__ = HTMLTemplateElement.prototype;
    template._createContentFragment();
  };

  function upgradeExistingElements() {
    Array.prototype.forEach.call(document.querySelectorAll('template'), applyPolyfill);
  };

  function setUpObserver(){
    function childListCallback(mutations){
      Array.prototype.forEach.call(mutations, function(mx){
        if(mx.addedNodes) {
          Array.prototype.forEach.call(mx.addedNodes, function(node) {
            if(node.tagName && node.tagName == 'TEMPLATE') {
              applyPolyfill(node);
            }
          });
        };
      });
    };

    new MutationObserver(childListCallback).observe(document, { subtree: true, childList: true });
  };

})();

// Copyright (c) 2012 The Polymer Authors. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//    * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//    * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

window.HTMLImports=window.HTMLImports||{flags:{}},function(a){var b=(a.path,a.xhr),c=a.flags,d=function(a,b){this.cache={},this.onload=a,this.oncomplete=b,this.inflight=0,this.pending={}};d.prototype={addNodes:function(a){this.inflight+=a.length;for(var b,c=0,d=a.length;d>c&&(b=a[c]);c++)this.require(b);this.checkDone()},addNode:function(a){this.inflight++,this.require(a),this.checkDone()},require:function(a){var b=a.src||a.href;a.__nodeUrl=b,this.dedupe(b,a)||this.fetch(b,a)},dedupe:function(a,b){if(this.pending[a])return this.pending[a].push(b),!0;return this.cache[a]?(this.onload(a,b,this.cache[a]),this.tail(),!0):(this.pending[a]=[b],!1)},fetch:function(a,d){if(c.load&&console.log("fetch",a,d),a.match(/^data:/)){var e=a.split(","),f=e[0],g=e[1];g=f.indexOf(";base64")>-1?atob(g):decodeURIComponent(g),setTimeout(function(){this.receive(a,d,null,g)}.bind(this),0)}else{var h=function(b,c){this.receive(a,d,b,c)}.bind(this);b.load(a,h)}},receive:function(a,b,c,d){this.cache[a]=d;for(var e,f=this.pending[a],g=0,h=f.length;h>g&&(e=f[g]);g++)this.onload(a,e,d),this.tail();this.pending[a]=null},tail:function(){--this.inflight,this.checkDone()},checkDone:function(){this.inflight||this.oncomplete()}},b=b||{async:!0,ok:function(a){return a.status>=200&&a.status<300||304===a.status||0===a.status},load:function(c,d,e){var f=new XMLHttpRequest;return(a.flags.debug||a.flags.bust)&&(c+="?"+Math.random()),f.open("GET",c,b.async),f.addEventListener("readystatechange",function(){4===f.readyState&&d.call(e,!b.ok(f)&&f,f.response||f.responseText,c)}),f.send(),f},loadDocument:function(a,b,c){this.load(a,b,c).responseType="document"}},a.xhr=b,a.Loader=d}(window.HTMLImports),function(a){function b(a){return"link"===a.localName&&a.rel===g}function c(a){var b,c=d(a);try{b=btoa(c)}catch(e){b=btoa(unescape(encodeURIComponent(c))),console.warn("Script contained non-latin characters that were forced to latin. Some characters may be wrong.",a)}return"data:text/javascript;base64,"+b}function d(a){return a.textContent+e(a)}function e(a){var b=a.__nodeUrl;if(!b){b=a.ownerDocument.baseURI;var c="["+Math.floor(1e3*(Math.random()+1))+"]",d=a.textContent.match(/Polymer\(['"]([^'"]*)/);c=d&&d[1]||c,b+="/"+c+".js"}return"\n//# sourceURL="+b+"\n"}function f(a){var b=a.ownerDocument.createElement("style");return b.textContent=a.textContent,n.resolveUrlsInStyle(b),b}var g="import",h=a.flags,i=/Trident/.test(navigator.userAgent),j=window.ShadowDOMPolyfill?window.ShadowDOMPolyfill.wrapIfNeeded(document):document,k={documentSelectors:"link[rel="+g+"]",importsSelectors:["link[rel="+g+"]","link[rel=stylesheet]","style","script:not([type])",'script[type="text/javascript"]'].join(","),map:{link:"parseLink",script:"parseScript",style:"parseStyle"},parseNext:function(){var a=this.nextToParse();a&&this.parse(a)},parse:function(a){if(this.isParsed(a))return void(h.parse&&console.log("[%s] is already parsed",a.localName));var b=this[this.map[a.localName]];b&&(this.markParsing(a),b.call(this,a))},markParsing:function(a){h.parse&&console.log("parsing",a),this.parsingElement=a},markParsingComplete:function(a){a.__importParsed=!0,a.__importElement&&(a.__importElement.__importParsed=!0),this.parsingElement=null,h.parse&&console.log("completed",a),this.parseNext()},parseImport:function(a){if(a.import.__importParsed=!0,HTMLImports.__importsParsingHook&&HTMLImports.__importsParsingHook(a),a.dispatchEvent(a.__resource?new CustomEvent("load",{bubbles:!1}):new CustomEvent("error",{bubbles:!1})),a.__pending)for(var b;a.__pending.length;)b=a.__pending.shift(),b&&b({target:a});this.markParsingComplete(a)},parseLink:function(a){b(a)?this.parseImport(a):(a.href=a.href,this.parseGeneric(a))},parseStyle:function(a){var b=a;a=f(a),a.__importElement=b,this.parseGeneric(a)},parseGeneric:function(a){this.trackElement(a),document.head.appendChild(a)},trackElement:function(a,b){var c=this,d=function(d){b&&b(d),c.markParsingComplete(a)};if(a.addEventListener("load",d),a.addEventListener("error",d),i&&"style"===a.localName){var e=!1;if(-1==a.textContent.indexOf("@import"))e=!0;else if(a.sheet){e=!0;for(var f,g=a.sheet.cssRules,h=g?g.length:0,j=0;h>j&&(f=g[j]);j++)f.type===CSSRule.IMPORT_RULE&&(e=e&&Boolean(f.styleSheet))}e&&a.dispatchEvent(new CustomEvent("load",{bubbles:!1}))}},parseScript:function(b){var d=document.createElement("script");d.__importElement=b,d.src=b.src?b.src:c(b),a.currentScript=b,this.trackElement(d,function(){d.parentNode.removeChild(d),a.currentScript=null}),document.head.appendChild(d)},nextToParse:function(){return!this.parsingElement&&this.nextToParseInDoc(j)},nextToParseInDoc:function(a,c){for(var d,e=a.querySelectorAll(this.parseSelectorsForNode(a)),f=0,g=e.length;g>f&&(d=e[f]);f++)if(!this.isParsed(d))return this.hasResource(d)?b(d)?this.nextToParseInDoc(d.import,d):d:void 0;return c},parseSelectorsForNode:function(a){var b=a.ownerDocument||a;return b===j?this.documentSelectors:this.importsSelectors},isParsed:function(a){return a.__importParsed},hasResource:function(a){return b(a)&&!a.import?!1:!0}},l=/(url\()([^)]*)(\))/g,m=/(@import[\s]+(?!url\())([^;]*)(;)/g,n={resolveUrlsInStyle:function(a){var b=a.ownerDocument,c=b.createElement("a");return a.textContent=this.resolveUrlsInCssText(a.textContent,c),a},resolveUrlsInCssText:function(a,b){var c=this.replaceUrls(a,b,l);return c=this.replaceUrls(c,b,m)},replaceUrls:function(a,b,c){return a.replace(c,function(a,c,d,e){var f=d.replace(/["']/g,"");return b.href=f,f=b.href,c+"'"+f+"'"+e})}};a.parser=k,a.path=n,a.isIE=i}(HTMLImports),function(a){function b(a){return c(a,m)}function c(a,b){return"link"===a.localName&&a.getAttribute("rel")===b}function d(a,b){var c=a;c instanceof Document||(c=document.implementation.createHTMLDocument(m)),c._URL=b;var d=c.createElement("base");d.setAttribute("href",b),c.baseURI||(c.baseURI=b);var e=c.createElement("meta");return e.setAttribute("charset","utf-8"),c.head.appendChild(e),c.head.appendChild(d),a instanceof Document||(c.body.innerHTML=a),window.HTMLTemplateElement&&HTMLTemplateElement.bootstrap&&HTMLTemplateElement.bootstrap(c),c}function e(a,b){b=b||n,g(function(){h(a,b)},b)}function f(a){return"complete"===a.readyState||a.readyState===u}function g(a,b){if(f(b))a&&a();else{var c=function(){("complete"===b.readyState||b.readyState===u)&&(b.removeEventListener(v,c),g(a,b))};b.addEventListener(v,c)}}function h(a,b){function c(){f==g&&requestAnimationFrame(a)}function d(){f++,c()}var e=b.querySelectorAll("link[rel=import]"),f=0,g=e.length;if(g)for(var h,j=0;g>j&&(h=e[j]);j++)i(h)?d.call(h):(h.addEventListener("load",d),h.addEventListener("error",d));else c()}function i(a){return k?a.import&&"loading"!==a.import.readyState:a.__importParsed}var j="import"in document.createElement("link"),k=j,l=a.flags,m="import",n=window.ShadowDOMPolyfill?ShadowDOMPolyfill.wrapIfNeeded(document):document;if(k)var o={};else var p=(a.xhr,a.Loader),q=a.parser,o={documents:{},documentPreloadSelectors:"link[rel="+m+"]",importsPreloadSelectors:["link[rel="+m+"]"].join(","),loadNode:function(a){r.addNode(a)},loadSubtree:function(a){var b=this.marshalNodes(a);r.addNodes(b)},marshalNodes:function(a){return a.querySelectorAll(this.loadSelectorsForNode(a))},loadSelectorsForNode:function(a){var b=a.ownerDocument||a;return b===n?this.documentPreloadSelectors:this.importsPreloadSelectors},loaded:function(a,c,e){if(l.load&&console.log("loaded",a,c),c.__resource=e,b(c)){var f=this.documents[a];f||(f=d(e,a),f.__importLink=c,this.bootDocument(f),this.documents[a]=f),c.import=f}q.parseNext()},bootDocument:function(a){this.loadSubtree(a),this.observe(a),q.parseNext()},loadedAll:function(){q.parseNext()}},r=new p(o.loaded.bind(o),o.loadedAll.bind(o));var s={get:function(){return HTMLImports.currentScript||document.currentScript},configurable:!0};if(Object.defineProperty(document,"_currentScript",s),Object.defineProperty(n,"_currentScript",s),!document.baseURI){var t={get:function(){return window.location.href},configurable:!0};Object.defineProperty(document,"baseURI",t),Object.defineProperty(n,"baseURI",t)}var u=HTMLImports.isIE?"complete":"interactive",v="readystatechange";a.hasNative=j,a.useNative=k,a.importer=o,a.whenImportsReady=e,a.IMPORT_LINK_TYPE=m,a.isImportLoaded=i,a.importLoader=r}(window.HTMLImports),function(a){function b(a){for(var b,d=0,e=a.length;e>d&&(b=a[d]);d++)"childList"===b.type&&b.addedNodes.length&&c(b.addedNodes)}function c(a){for(var b,e=0,g=a.length;g>e&&(b=a[e]);e++)d(b)&&f.loadNode(b),b.children&&b.children.length&&c(b.children)}function d(a){return 1===a.nodeType&&g.call(a,f.loadSelectorsForNode(a))}function e(a){h.observe(a,{childList:!0,subtree:!0})}var f=(a.IMPORT_LINK_TYPE,a.importer),g=HTMLElement.prototype.matches||HTMLElement.prototype.matchesSelector||HTMLElement.prototype.webkitMatchesSelector||HTMLElement.prototype.mozMatchesSelector||HTMLElement.prototype.msMatchesSelector,h=new MutationObserver(b);a.observe=e,f.observe=e}(HTMLImports),function(){function a(){HTMLImports.importer.bootDocument(b)}"function"!=typeof window.CustomEvent&&(window.CustomEvent=function(a,b){var c=document.createEvent("HTMLEvents");return c.initEvent(a,b.bubbles===!1?!1:!0,b.cancelable===!1?!1:!0,b.detail),c});var b=window.ShadowDOMPolyfill?window.ShadowDOMPolyfill.wrapIfNeeded(document):document;HTMLImports.whenImportsReady(function(){HTMLImports.ready=!0,HTMLImports.readyTime=(new Date).getTime(),b.dispatchEvent(new CustomEvent("HTMLImportsLoaded",{bubbles:!0}))}),HTMLImports.useNative||("complete"===document.readyState||"interactive"===document.readyState&&!window.attachEvent?a():document.addEventListener("DOMContentLoaded",a))}();

//# sourceMappingURL=runtime.concat.js.map