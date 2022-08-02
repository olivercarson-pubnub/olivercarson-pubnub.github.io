/*
Codoodler: A collaboration app where you can draw and doodle on a canvas with strangers using PubNub.
Original Author: Tomomi Imura
Last Updated by: Oliver Carson
Last Update: 8/2/2022
*/

(function() {
	/* Canvas */
	var canvas = document.getElementById('drawCanvas');
	var ctx = canvas.getContext('2d');
	var color = document.querySelector(':checked').getAttribute('data-color');

	canvas.width = Math.min(document.documentElement.clientWidth, window.innerWidth || 300);
	canvas.height = Math.min(document.documentElement.clientHeight, window.innerHeight || 300);
	 
	ctx.strokeStyle = color;
	ctx.lineWidth = '3';
	ctx.lineCap = ctx.lineJoin = 'round';

	/* Mouse and touch events */	
	document.getElementById('colorSwatch').addEventListener('click', function() {
		color = document.querySelector(':checked').getAttribute('data-color');
	}, false);
	
	var isTouchSupported = 'ontouchstart' in window;
	var isPointerSupported = navigator.pointerEnabled;
	var isMSPointerSupported =  navigator.msPointerEnabled;
	
	var downEvent = isTouchSupported ? 'touchstart' : (isPointerSupported ? 'pointerdown' : (isMSPointerSupported ? 'MSPointerDown' : 'mousedown'));
	var moveEvent = isTouchSupported ? 'touchmove' : (isPointerSupported ? 'pointermove' : (isMSPointerSupported ? 'MSPointerMove' : 'mousemove'));
	var upEvent = isTouchSupported ? 'touchend' : (isPointerSupported ? 'pointerup' : (isMSPointerSupported ? 'MSPointerUp' : 'mouseup'));
	 	  
	canvas.addEventListener(downEvent, startDraw, false);
	canvas.addEventListener(moveEvent, draw, false);
	canvas.addEventListener(upEvent, endDraw, false);
	/*
	let input = prompt("Please enter your name to join the channel.");
	if (input == null || input == "") {
		username = "ANON_"+self.crypto.randomUUID(); // If they dont give a name and no saved name then make them anonymous 
	} else {
		username = input;
	}*/



	/* PubNub */

	var channels = ['draw'];

	var pubnub = new PubNub({
		publishKey     : "pub-c-cbacfd26-94ef-4e01-afe8-95d5a9dfb915",
		subscribeKey   : "sub-c-3d473a61-adac-4915-8856-00b11b96a559",
		uuid: self.crypto.randomUUID()
	});

	//Listener events
	pubnub.addListener({		
		message: (messageEvent) => {
			// Update canvas when other users draw.
			drawFromStream(messageEvent.message)
		},
		presence: (presenceEvent) => {
			// Handle presence by updating how many doodlers are present animation.
			var occupancy = presenceEvent.occupancy
			if(occupancy > 1){ 
				document.getElementById('unit').textContent = 'doodlers';
			}
   			document.getElementById('occupancy').textContent = occupancy;
   			var p = document.getElementById('occupancy').parentNode;
   			p.classList.add('anim');
   			p.addEventListener('transitionend', function(){p.classList.remove('anim');}, false);
		},
	});

	pubnub.subscribe({
		channels: channels,
		withPresence: true		
	});

	async function publish(data) {	
		try {
			const result = await pubnub.publish({
				message: data,
				channel: channels[0]				
			});
		} catch (status) {
			console.log(status);
		}		
    }

	//Handle Users closing or refreshing browser.
	window.onbeforeunload = function(event)
    {
		//Current user has either closed browser or refreshed. Unsubscribe.
		pubnub.unsubscribe({
			channels: channels
		});
    };

    /* Draw on canvas */
    function drawOnCanvas(color, plots) {
    	ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(plots[0].x, plots[0].y);

    	for(var i=1; i<plots.length; i++) {
	    	ctx.lineTo(plots[i].x, plots[i].y);
	    }
	    ctx.stroke();
    }

	//Update canvas when other users draw.
    function drawFromStream(message) {
		if(!message || message.plots.length < 1) return;
		drawOnCanvas(message.color, message.plots);
    }
    
    // Get Older and Past Drawings
    if(drawHistory) {
	    pubnub.history({
	    	channel  : channels[0],
	    	count    : 50,
	    	callback : function(messages) {
	    		pubnub.each( messages[0], drawFromStream );
	    	}
	    });
	}
    var isActive = false;
    var plots = [];

	function draw(e) {
		e.preventDefault(); // prevent continuous touch event process e.g. scrolling!
	  	if(!isActive) return;

    	var x = isTouchSupported ? (e.targetTouches[0].pageX - canvas.offsetLeft) : (e.offsetX || e.layerX - canvas.offsetLeft);
    	var y = isTouchSupported ? (e.targetTouches[0].pageY - canvas.offsetTop) : (e.offsetY || e.layerY - canvas.offsetTop);

    	plots.push({x: (x << 0), y: (y << 0)}); // round numbers for touch screens

    	drawOnCanvas(color, plots);
	}
	
	function startDraw(e) {
	  	e.preventDefault();
	  	isActive = true;
	}
	
	function endDraw(e) {
	  	e.preventDefault();
	  	isActive = false;
	  
	  	publish({
	  		color: color,
	  		plots: plots
	  	});

	  	plots = [];
	}
})();
