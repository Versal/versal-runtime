// Represents gadget for the player
var VersalGadget = function(iframe){
  this.iframe = iframe;
};

VersalGadget.prototype = {
  // Patches current gadget attributes with attrs
  sendAttributes: function(attrs) {
    Object.getOwnPropertyNames(attrs).forEach(function(key){
      this.sendAttribute(key, attrs[key]);
    }.bind(this));
  },

  sendAttribute: function(name, value) {
    if(name) {
      this.send('setAttribute', { name: value });
    }
  },

  sendAttached: function(){
    this.send('attached');
  },

  send: function(name, detail){
    var data = { name: name };
    if(detail) {
      data.detail = detail;
    }
    this.iframe.contentWindow.postMessage(data, window.location.origin);
  }
};

module.exports = VersalGadget;
