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

		this.events = {};
		this.storage = {};
		this.subscribtions = {};

		var funcy = function(theme, value){
			if (typeof value === "undefined"){
				return this.get(theme);
			} else {
				return this.set(theme, value);
			}
		}.bind(this);

		for (var k in this){
			funcy[k]= this[k];
		}

		return funcy;

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
		once : function(theme, cb, context, _eventContext){
			this.ckeckEvent(theme);
			var sub = new this.Subscription(theme, function(){
				sub.unsubscribe();
				cb.apply(this, arguments);
			}, context, _eventContext);
		},
		say : function(theme, data, _eventContext){
			if (typeof data == "function" && _eventContext === true){
				_eventContext = null;
				Object.defineProperty(this.storage, theme, {
					get : data,
					configurable : true,
				});

				data = data();
			} else {
				Object.defineProperty(this.storage, theme, {
					value : data,
					configurable : true,
					writable : true
				});
			}
			
			if (this.events[theme]) this.events[theme].trigger(data, _eventContext)
		},
 		publish : function(desc){
 			// console.warn(new Error("postal publish"));
			var theme = this._getEventName(desc.channel, desc.topic);
			this.say(theme, desc.data, desc.eventContext);
		},
		subscribe : function(desc){
			// console.warn(new Error("postal subscribe"));
			var theme = this._getEventName(desc.channel, desc.topic);
			this.ckeckEvent(theme, desc.eventContext);
			return new this.Subscription(theme, desc.callback, desc.context, desc.eventContext);
		},
		ckeckEvent : function(theme, eventContext){
			if (!this.events[theme]){
				this.events[theme] = new this.Event(theme, eventContext)
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
		Subscription : function(theme, callback, context, _eventContext){
			this._event_name = theme;
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
		},
		extract : function(desc){
			var theme = this._getEventName(desc.channel, desc.topic);
			return this.get(theme);
		},
		inject : function(desc){
			var theme = this._getEventName(desc.channel, desc.topic);
			this.set(theme, desc.data);
		},	
		get : function(theme){
			return this.storage[theme];
		},
		set : function(theme, data){
			this.say(theme, data);
		},
		on : function(theme, eventName, callback, immediately){
			if (typeof eventName == "function"){
				immediately = callback;
				callback = eventName;
			}

			var result =  this.listen(theme, callback);
			if (immediately == true && typeof this.storage[theme] != "undefined"){
				callback(this.storage[theme]);
			}

			return result;

		},
		off : function(subscription){
			if (subscription){
				subscription.unsubscribe();
			} else {
				if (window.__DEBUG){
					console.warn(new Error("[postal] cannot unsubscribe"));
				}
			}
		},
		restObject : function(basePath, data, options){
			basePath = basePath || "";
			options = options || { deep : false };

			if (options.deep === false){
				for (var k in data){
					this.set(basePath + "::" + k, data[k]);
				}
			} else {
				for (var k in data){
					if (typeof data[k] == "object"){
						this.restObject(basePath + "." + k, data[k]);
					} else {
						this.set(basePath + "::" + k, data[k]);
					}
				}
				
			}

		},
		reach : function(source, path){
		  	var result = source;
		  	path = path.split(".");
	
		  	for (var a = 0; a < path.length; a++){
		  	    if (typeof result[path[a]] != "undefined"){
		  	      result = result[path[a]];
		  	    } else {
		  	      return null;
		  	    }
		  	}
	
		  	return result;
		},
		path : function(){
			console.log("path", arguments, this.storage);
		},
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
		},

	};

	return new Postal();

});