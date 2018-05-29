"use strict";
define(function(){
	var _postal;
	var _globalEvents = [];
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
		this.subs = {};
		this.stack = [];

		this.__paused = false;

		Object.defineProperty(this.subs, "length", {
			get : function(){
				var result = 0;
				for (var k in this){
					result++;
				}

				return result;
			},
			enumerable : false,
			configurable : false
		});

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
		this.subs = {};
	};

	Emitter.prototype = {
		on : function(){
			return this.addEventListener.apply(this, arguments);
		},
		addEventListener : function(eventname, callback, context){
			var sub = postal.subscribe({
				channel : this.channel,
				topic : eventname,
				callback : callback,
				context : context
			});
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
		set globalEvents(v){
			_globalEvents = _globalEvents.concat(v);

		},
		get globalEvents(){
			return _globalEvents;
		},
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
			return new this.Subscription(this, theme, cb, context, _eventContext);
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
			return new this.Subscription(this, theme, desc.callback, desc.context, desc.eventContext);
		},
		ckeckEvent : function(theme, eventContext){
			if (!this.events[theme]){
				this.events[theme] = new this.Event(this, theme, eventContext)
			}
		},
		createCallback : function(userCB, context){
			context = context || window;

			return function(evt){
				userCB.call(context, evt.detail.data);
			}

		},
		Event : function(postal, name, _eventContext){
			this._eventContext = _eventContext || eventContext;

			this._postal = postal;
			this.triggered = 0;
			this.name = name;
			this.custom = {
				data : null
			};

			this.object = new CustomEvent(name, {
				detail : this.custom
			});
		},
		Subscription : function(postal, theme, callback, context, _eventContext){
			this._uuid = genUUID(theme);
			this._postal = postal;
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
		on : function(theme, callback, immediately){
			var result =  this.listen(theme, callback);
			if (immediately == true && typeof this.storage[theme] != "undefined"){
				callback(this.storage[theme]);
			}

			return result;

		},
		once : function(theme, callback, immediately){
			this.ckeckEvent(theme);
			var sub = this.on(theme, function(data){
				sub.unsubscribe();
				callback(data);
			}, immediately);

			return sub;
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
		$reset : function(){
			this.$unsubscribeAll();

			this.subs = {};

			for (var k in this.events){
				delete this.events[k];
			}

			return this;
		},
		$unsubscribeAll : function(){
			for (var k in this.subs){
				this.subs[k].unsubscribe(true);
			}

			return this;
		},
		$resusbscribeAll : function(){
			for (var k in this.subs){
				this.subs[k].subscribe();
			}
		},
		$pause : function(key){
			this.__paused = !!key;
		}
	};

	Postal.prototype.Event.prototype = {
		trigger : function(data, _eventContext){
			this.triggered++;
			this.custom.data = data || null;
			(_eventContext || this._eventContext).dispatchEvent(this.object);
			if (this._postal.globalEvents.indexOf(this.name) > -1){
				window.dispatchEvent(this.object);
			}
		},
	};

	Postal.prototype.Subscription.prototype = {
		subscribe : function(callback, context){
			this._postal.subs[this._uuid] = this;
			this._callback = callback || this._callback;
			this._context  = context  || this._context;

			this._eventContext.addEventListener(this._event_name, this._wrappedCB, false);
		},
		unsubscribe : function(keep){
			if (keep !== true){
				delete this._postal.subs[this._uuid];
			}

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