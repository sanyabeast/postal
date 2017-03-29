'use strict';
define(function(){

	var nPostal = function(){
		this.events = {

		};
	};

	nPostal.prototype = {
		_getEventName : function(channel, topic){
			return channel + '::' + topic;
		},
 		publish : function(desc){
			var event_name = this._getEventName(desc.channel, desc.topic);

			this.ckeckEvent(event_name);

			this.events[event_name].trigger(desc.data);
		},
		subscribe : function(desc){
			var event_name = this._getEventName(desc.channel, desc.topic);
			this.ckeckEvent(event_name);
			window.addEventListener(event_name, this.createCallback(desc.callback, desc.context), false);

			return this.events[event_name];
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
			this.name = name;
			this.custom = {
				data : null
			};

			this.object = new CustomEvent(name, {
				detail : this.custom
			});
		}
	};

	nPostal.prototype.Event.prototype = {
		trigger : function(data){
			this.custom.data = data;
			window.dispatchEvent(this.object);
		},
	};

	return new nPostal();

});