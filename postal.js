"use strict";
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else if (typeof module === "object" && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(true);
    } else {
    	var postal = factory();
    	window.postal = postal;
    }
}(this, function(){

	var postal;

	function genUUID(prefix){
		return [prefix, Math.random().toString(32).substring(3, 12)].join("-");
	};

	var Postal = function(){
		this.events = {

		};
	};

	var Emitter = function(channel){
		this.channel = [channel, genUUID("emitter")].join("-");
		this.subscribtions = {};
	};

	Emitter.prototype = {
		on : function(){
			return this.addEventListener.apply(this, arguments);
		},
		addEventListener : function(eventname, callback, context){
			var uuid = genUUID("sub-" + eventname);
			var sub = postal.subscribe({
				channel : this.channel,
				topic : eventname,
				callback : callback,
				context : context
			});

			this.subscribtions[eventname] = this.subscribtions[eventname] || {};
			this.subscribtions[eventname][uuid] = sub;
		},
		dispatch : function(eventname, data){
			postal.publish({
				channel : this.channel,
				topic : eventname,
				data : data
			});
		},
	};

	Postal.prototype = {
		Emitter : Emitter,
		_getEventName : function(channel, topic){
			return [channel, "::", topic].join("");
		},
		listen : function(theme, cb, context){
			this.ckeckEvent(theme);
			return new this.Subscription(theme, cb, context);
		},
		say : function(theme, data){
			if (this.events[theme]) this.events[theme].trigger(data)
		},
 		publish : function(desc){
			var event_name = this._getEventName(desc.channel, desc.topic);
			if (this.events[event_name]) this.events[event_name].trigger(desc.data);
		},
		subscribe : function(desc){
			var event_name = this._getEventName(desc.channel, desc.topic);
			this.ckeckEvent(event_name);
			return new this.Subscription(event_name, desc.callback, desc.context);
		},
		ckeckEvent : function(event_name){
			if (!this.events[event_name]){
				this.events[event_name] = new this.Event(event_name)
			}
		},
		createCallback : function(userCB, context){
			context = context || window;

			return function(evt){
				userCB.call(context, evt.detail.data);
			}

		},
		Event : function(name){
			this.triggered = 0;
			this.name = name;
			this.custom = {
				data : null
			};

			this.object = new CustomEvent(name, {
				detail : this.custom
			});
		},
		Subscription : function(event_name, callback, context){
			this._event_name = event_name;
			this._context = context || this;
			this._callback = callback;

			this._wrappedCB = this._wrappedCB.bind(this);

			this.subscribe();
		},
		filterEvents : function(param, value){
			var result = [];
			for (var k in this.events){
				if (this.events[k][param] == value){
					result.push(this.events[k]);
				}
			}

			return result;
		}
	};

	Postal.prototype.Event.prototype = {
		trigger : function(data){
			this.triggered++;
			this.custom.data = data || null;
			window.dispatchEvent(this.object);
		},
	};

	Postal.prototype.Subscription.prototype = {
		subscribe : function(callback, context){
			this._callback = callback || this._callback;
			this._context  = context  || this._context;

			window.addEventListener(this._event_name, this._wrappedCB, false);
		},
		unsubscribe : function(){
			window.removeEventListener(this._event_name, this._wrappedCB, false);
		},
		resubscribe : function(callback, context){
			this.subscribe(callback, context);
		},
		_wrappedCB : function(evt){
			this._callback.call(this._context, evt.detail.data);
		}
	};

	postal = new Postal();

	return postal;

}));
