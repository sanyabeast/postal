# nuPostal

## Postal scheme 

### Subscribing

```javascript
var subscription = postal.subscribe({
  channel : "kek",
  topic : "lol",
  callback : function(data){
    console.log("Hello!", data);
  },
  context : window
});
```

### Publishing

```javascript
postal.publish({
  channel : "kek",
  topic : "lol",
  data : "Goodbye!"
});

//Hello!, Goodbye!

```

### Unsubscribing

```javascript
subscription.unsubscribe();
```

### Resubscribing

```javascript
subscription.resubscribe();
```

## Signals scheme 

### Listening

```javascript
var subscription = postal.listen("logdata", function(data){
  console.log(data);
});
```

### Saying

```javascript
postal.say("logdata", { random : Math.random() });
//{random : 0.2943779978464365 }
```
## Emitter scheme

```javascript
class BlackBox {
  constructor(){
    this.emitter = new postal.Emitter(/*uid*/"blackbox");
  }
  
  addEventListener(eventname, cb cbcontext){
    this.emitter.on(eventname, cb, cbcontext);
  }
  
  sayHello(){
    console.log("hello!");
    this.emitter.dispatch("hello");
  }
}

var box = new BlackBox();
box.addEventListener("hello", function(){
  console.log("blackbox just said `hello`");
});

box.sayHello();
//hello!
//blackbox just said `hello`

```
