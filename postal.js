"use strict";
define(function(){
	var _postal;
	var eventContext = document.createElement("div");

	function genUUID(prefix){
		return [prefix, Math.random().toString(32).substring(3, 12)].join("-");
	};

	var Postal = function(){
		if (_postal instanceof Postal){
			return _postal;
		}

		_postal = this;
		console.log("new postal instance created");

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
		set eventContext(context){
			eventContext = context;
		},
		get eventContext(){
			return eventContext;
		},
		Emitter : Emitter,
		_getEventName : function(channel, topic){
			return [channel, "::", topic].join("");
		},
		listen : function(theme, cb, context, _eventContext){
			this.ckeckEvent(theme);
			return new this.Subscription(theme, cb, context, _eventContext);
		},
		say : function(theme, data, _eventContext){
			if (this.events[theme]) this.events[theme].trigger(data, _eventContext)
		},
 		publish : function(desc){
			var event_name = this._getEventName(desc.channel, desc.topic);
			if (this.events[event_name]) this.events[event_name].trigger(desc.data, desc.eventContext);
		},
		subscribe : function(desc){
			var event_name = this._getEventName(desc.channel, desc.topic);
			this.ckeckEvent(event_name, desc.eventContext);
			return new this.Subscription(event_name, desc.callback, desc.context, desc.eventContext);
		},
		ckeckEvent : function(event_name, eventContext){
			if (!this.events[event_name]){
				this.events[event_name] = new this.Event(event_name, eventContext)
			}
		},
		createCallback : function(userCB, context){
			context = context || window;

			return function(evt){
				userCB.call(context, evt.detail.data);
			}

		},
		Event : function(name, _eventContext){
			this._eventContext = _eventContext || eventContext;

			this.triggered = 0;
			this.name = name;
			this.custom = {
				data : null
			};

			this.object = new CustomEvent(name, {
				detail : this.custom
			});
		},
		Subscription : function(event_name, callback, context, _eventContext){
			this._event_name = event_name;
			this._context = context || this;
			this._callback = callback;
			this._eventContext = _eventContext || eventContext;

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
		trigger : function(data, _eventContext){
			this.triggered++;
			this.custom.data = data || null;
			(_eventContext || this._eventContext).dispatchEvent(this.object);
		},
	};

	Postal.prototype.Subscription.prototype = {
		subscribe : function(callback, context){
			this._callback = callback || this._callback;
			this._context  = context  || this._context;

			this._eventContext.addEventListener(this._event_name, this._wrappedCB, false);
		},
		unsubscribe : function(){
			this._eventContext.removeEventListener(this._event_name, this._wrappedCB, false);
		},
		resubscribe : function(callback, context){
			this.subscribe(callback, context);
		},
		_wrappedCB : function(evt){
			this._callback.call(this._context, evt.detail.data);
		}
	};

	return new Postal();

});