
var Game = ( function () {

	var Game = {
		FPS:60,
		_loopId:null,
		_lastTime:0,
		_puaseTime:0,
		_resumeTime:0,
		status:"",
		init:function(){
			Game.Assets.init( function(){
				Game.World.init();
				Game.UI.init();
				Game.Input.init();
				$( window ).on( "blur", function(){
					if( Game.status === "run" ) Game.pause();
				})
			})
		},
		startup:function(){
			this._lastTime = new Date().getTime();
			this.run();
		},
		run:function(){
			this.status = "run";
			var that = this;
			this._loopId = setInterval( function(){
				Game.World.render( that.time = new Date().getTime() - that._lastTime );
			}, 1000/that.FPS );
		},
		pause:function(){
			this.status = "pause";
			this._puaseTime = new Date().getTime();
			this._stopLoop();
			Game.UI.show( Game.UI.PAUSE_VIEW );
		},
		resume:function(){
			this.status = "run";
			this._resumeTime = new Date().getTime();
			this._lastTime = this._lastTime+(this._resumeTime-this._puaseTime)
			this.run();
		},
		end:function(){
			this.status = "end";
			this._stopLoop();
			$( ".lbl-time" ).text( (Game.World.getTime()/1000)+" sec" );
			$( "#submit-time" ).val( Game.World.getTime()/1000 );
			Game.Net.getYourRank( Game.World.getTime(), function( data ){
				if( data < 10 ){
					Game.UI.show( Game.UI.SUBMIT_VIEW );
				}else{
					Game.UI.show( Game.UI.END_VIEW );
				}
			});
		},
		_stopLoop:function(){
			if( this._loopId ) clearInterval( this._loopId );
		}
	};

	Game.Net = {
		getYourRank:function( record, handle ){
			$.ajax({ url: "getRanking.php",
					type: "POST",
					cache:false,
					timeout : 30000,
					dataType:"json",
					data: { record:record },
					success: handle
				});
		},
		getRanker10:function( handle ){
			$.ajax({ url: "getRanker10.php",
					type: "POST",
					cache:false,
					timeout : 30000,
					dataType:"json",
					success: handle
				});
		},
		submitYourRecord:function( name, record, handle ){
			$.ajax({
					url: "submitRecord.php",
					type: "POST",
					cache:false,
					timeout : 30000,
					dataType:"json",
					data: { name:name, record:record },
					success: handle
				});
		}
	};

	Game.Util={
		getRandom:function( min, max, isNumber ){
			if( isNumber ){
				return Math.random() * ( max - min ) + min;
			}else{
				return Math.floor( Math.random() * ( (max+1) - min ) ) + min;
			}
		},
		hitTest:function( obj1, obj2 ){
			var bottom = obj1.x - obj2.x;
			var height = obj1.y - obj2.y;
			var hypo = obj1.r + obj2.r;
			return ((bottom*bottom)+(height*height) <= ( hypo*hypo ));
		},
		toRadian:function( d ){
			return d * Math.PI / 180;
		},
		toDegree:function( r ){

		}
	};

	Game.Info = {
		stageWidth:0,
		stageHeight:0
	};

	Game.World = {
		_canvas:null,
		_context:null,
		_ship:null,
		_meteors:[],
		_time:0,
		_lv:1,
		init:function(){
			this._canvas = $( "#world" )[0];
			this._canvas.width = this._canvas.width;
			this._context = this._canvas.getContext( "2d" );
			Game.Info.stageWidth = this._canvas.width;
			Game.Info.stageHeight = this._canvas.height;
			this._createShip();
			this._createMeteor();
			this._lv = 1;
		},
		render:function( time ){
			this._canvas.width = this._canvas.width;
			this._renderMeteors( time );
			this._renderShip( time );
			this._renderTime( time );
			if( this._ship.live ){
				if( time/1000 > this._lv*10 ){
					this._lv++;
					this._addMeteor( 3 );
					this._addGuidedMeteor( 1 );
				}
			}
		},
		getTime:function(){
			return this._time;
		},
		_createShip:function(){
			this._ship = new Game.Spaceship( this._context );
		},
		_createMeteor:function(){
			this._meteors = [];
			this._addMeteor( 10 );
		},
		_addMeteor:function( num ){
			for( var i=0,count=num; i<count ; i+=1 ){
				this._meteors.push( new Game.Meteor( this._context ) )
			}
		},
		_addGuidedMeteor:function( num ){
			for( var i=0,count=num; i<count ; i+=1 ){
				this._meteors.push( new Game.GuidedMeteor( this._context, this._ship, this._time ) )
			}
		},
		_renderTime:function( time ){
			if( this._ship.live ) this._time = time;
			this._context.save();
			this._context.font = "40px impact";
			this._context.fillStyle = "#FFF";
			this._context.fillText( this._time/1000, 10, 40 );
			this._context.restore();
		},
		_renderShip:function( time ){
			this._ship.update( time );
			this._ship.render();
		},
		_renderMeteors:function( time ){
			var meteor;
			for( var i=0, count=this._meteors.length ; i<count ; i+=1 ){
				meteor = this._meteors[ i ];
				if( this._ship.live && meteor.live && Game.Util.hitTest( meteor.getCollisionInfo(), this._ship.getCollisionInfo() ) ){
					this._ship.live = false;
					meteor.live = false;
					this._ship.explosion();
					meteor.explosion();
					setTimeout( function(){ Game.end();}, 1000 )
				}
				meteor.update( time );
				meteor.render();
			}
		}
	};

	Game.UI = {
		START_VIEW:"startView",
		PAUSE_VIEW:"pauseView",
		END_VIEW:"endView",
		SUBMIT_VIEW:"submitView",
		RANK_VIEW:"rankView",
		_$startUi:null,
		_$pauseUi:null,
		_$endUi:null,
		_$submitUi:null,
		_$rankUi:null,
		_$btnStart:null,
		_$btnResume:null,
		_$btnRetry:null,
		_$btnSubmit:null,
		_$txiName:null,
		_$listRank:null,
		_$modal:null,
		_$currentView:null,
		_submitting:false,
		init:function(){
			var that = this;
			this._$startUi = $( "#ui-start").hide();
			this._$pauseUi = $( "#ui-pause").hide();
			this._$endUi = $( "#ui-end").hide();
			this._$submitUi = $( "#ui-submit").hide();
			this._$rankUi = $( "#ui-rank").hide();
			this._$modal = $( "#modal" ).hide();
			this._$txiName = $( "#txi-name" );
			this._$listRank = $( "#list-rank" );
			this._$btnStart = $( "#btn-start").on( "click", function(){
				Game.World.init();
				Game.startup();
				Game.UI.hide();
			});
			this._$btnResume = $( "#btn-resume").on( "click", function(){
				Game.resume();
				Game.UI.hide();
			});
			this._$btnRetry = $( ".btn-retry").on( "click", function(){
				Game.World.init();
				Game.startup();
				Game.UI.hide();
			});
			this._$btnSubmit = $( "#btn-submit").on( "click", function(){
				if( that._submitting ) return;
				Game.Net.submitYourRecord( that._$txiName.val(), Game.World.getTime(), function( data ){
					that._submitting = false;
					that._$txiName.val( "" );
					Game.UI.hide();
					Game.UI.show( Game.UI.RANK_VIEW );
				});
			})
			this.show( Game.UI.RANK_VIEW );
		},
		show:function( type ){
			this._$modal.show();
			var that = this;
			switch( type ){
				case this.START_VIEW: this._$currentView=this._$startUi; this._$currentView.show(); break;
				case this.PAUSE_VIEW: this._$currentView=this._$pauseUi; this._$currentView.show(); break;
				case this.END_VIEW: this._$currentView=this._$endUi; this._$currentView.show(); break;
				case this.SUBMIT_VIEW: this._$currentView=this._$submitUi; this._$currentView.show(); break;
				case this.RANK_VIEW:
					this._$currentView=this._$rankUi;
					Game.Net.getRanker10( function( data ){
						that._$listRank.empty();
						for( var i=0,count=data.length ; i<count ; i+=1 ){
							that._$listRank.append(  '<li><span class="rank-no">'+(i+1)+'.</span><span class="rank-name">'+ data[i].name+'</span><span class="rank-record">'+(data[i].record/1000)+' sec</span> </li>' );
						}
					});
					this._$currentView.show();
					break;
			}
		},
		hide:function(){
			this._$modal.hide();
			if( this._$currentView ) this._$currentView.hide();
		}
	};

	Game.Assets = {
		shipSprite:null,
		emenySprite:null,
		explosionSprite:null,
		_loadedCount:0,
		_completeCallback:null,
		init:function( complete ){
			this._loadAssets();
			this._completeCallback = complete;
		},
		_loadAssets:function(){
			this.shipSprite = new Image();
			this.emenySprite = new Image();
			this.explosionSprite = new Image();
			this.shipSprite.addEventListener( "load", loadCompleteHandler );
			this.emenySprite.addEventListener( "load", loadCompleteHandler );
			this.explosionSprite.addEventListener( "load", loadCompleteHandler );
			this.shipSprite.src = "./assets/ships_36_36.png";
			this.emenySprite.src = "./assets/enemys_32_32.png";
			this.explosionSprite.src = "./assets/explosions_64_64.png";
			var that = this;
			function loadCompleteHandler(){
				that._loadedCount++;
				if( that._loadedCount === 3 ) that._completeCallback();
			}
		}
	};

	Game.Input = {
		UP:"up",
		DOWN:"down",
		RIGHT:"right",
		LEFT:"left",
		keyMap:{},
		init:function(){
			window.addEventListener( "keydown", function(event){
				switch( event.keyCode ){
					case 37: Game.Input.keyMap[ Game.Input.LEFT ] = true; break;
					case 38: Game.Input.keyMap[ Game.Input.UP ] = true; break;
					case 39: Game.Input.keyMap[ Game.Input.RIGHT ] = true; break;
					case 40: Game.Input.keyMap[ Game.Input.DOWN ] = true; break;
				}
			});

			window.addEventListener( "keyup", function( event ){
				switch( event.keyCode ){
					case 37: Game.Input.keyMap[ Game.Input.LEFT ] = false; break;
					case 38: Game.Input.keyMap[ Game.Input.UP ] = false; break;
					case 39: Game.Input.keyMap[ Game.Input.RIGHT ] = false; break;
					case 40: Game.Input.keyMap[ Game.Input.DOWN ] = false; break;
				}
			});
		}
	};

	Game.Unit = function(){};
	Game.Unit.prototype = {
		_cell_start_position:null,
		_cell_size:null,
		_currentSprite:null,
		_tick:0,
		_speed:0,
		_scale:1,
		_lastTime:0,
		_position:null,
		_context:null,
		_vector:{ d:0, r:0, l:0 },
		_radius:0,
		_renderCount:0,
		live:true,
		update:function( time ){},
		render:function(){
			this._context.drawImage(
				this._currentSprite,
				this._cellPosition.x+this._cell_start_position.x,
				this._cellPosition.y+this._cell_start_position.y,
				this._cell_size,
				this._cell_size,
				this._position.x,
				this._position.y,
				this._cell_size*this._scale,
				this._cell_size*this._scale
			);
		},
		getCollisionInfo:function(){
			return { x:this._position.x, y:this._position.y, r:this._radius };
		}
	};

	Game.Spaceship = function( context ){
		this._cell_start_position = { x:0, y:0 };
		this._cell_size = 36;
		this._speed = 0.1;
		this._scale = 1;
		this._acc = 0.98;
		this._tick = 500;
		this._currentSprite = Game.Assets.shipSprite;
		this._radius=( this._cell_size * this._scale )/3;
		this._radianStep = 9;
		this._position = { x:Game.Info.stageWidth/2, y:Game.Info.stageHeight/2 };
		this._context = context;
		this._cellPosition = { x:0, y:0 };
		this._vector={ d:0, r:0, l:0 };
	};

	Game.Spaceship.prototype = new Game.Unit();
	Game.Spaceship.constructor = Game.Spaceship;
	Game.Spaceship.prototype.update = function(){
		if( this.live ){
			if( Game.Input.keyMap[ Game.Input.LEFT ] ) this._vector.d-=this._radianStep;
			if( Game.Input.keyMap[ Game.Input.RIGHT ] ) this._vector.d+=this._radianStep;
			if( Game.Input.keyMap[ Game.Input.UP ] ) this._vector.l+=this._speed;
			if( Game.Input.keyMap[ Game.Input.DOWN ] ) this._vector.l-=this._speed;
			if( this._vector.d >= 360 ) this._vector.d = 0;
			if( this._vector.d < 0 ) this._vector.d = 360;
			var measuerX = Math.floor( this._vector.d / 9 );
			this._cellPosition.x = measuerX * this._cell_size  % 288;
			this._cellPosition.y = Math.floor( measuerX / 8 ) * this._cell_size;
			this._vector.r = Game.Util.toRadian( this._vector.d );
			this._vector.r -= Math.PI/2;
			this._position.x = this._position.x+this._vector.l*Math.cos( this._vector.r );
			this._position.y = this._position.y+this._vector.l*Math.sin( this._vector.r );
			if( this._position.x < 0 ) this._position.x = 0;
			else if( this._position.x > Game.Info.stageWidth-this._cell_size ) this._position.x = Game.Info.stageWidth-this._cell_size;
			if( this._position.y < 0 ) this._position.y = 0;
			else if( this._position.y > Game.Info.stageHeight-this._cell_size ) this._position.y = Game.Info.stageHeight-this._cell_size;
			this._vector.l *= this._acc;
		}else{
			if( this._renderCount >= this._cell_count ) return;
			this._cellPosition.x = this._renderCount * this._cell_size % 512;
			this._cellPosition.y = Math.floor( this._renderCount / 8 ) * this._cell_size;
			this._renderCount++;
		}

	};

	Game.Spaceship.prototype.explosion = function(){
		this._currentSprite = Game.Assets.explosionSprite;
		this._cell_size = 64;
		this._cell_count = 32;
		this._cell_start_position = { x:0, y:0 };
		this._tick = 0;
		this._renderCount = 0;
		this._position.x -= this._radius;
		this._position.y -= this._radius;
	};

	Game.Meteor = function( context ){
		this._cell_start_position = { x:0, y:0 };
		this._cell_size = 32;
		this._cell_count = 32;
		this._currentSprite = Game.Assets.emenySprite;
		this._context = context;
		this._init();
	};

	Game.Meteor.prototype = new Game.Unit();
	Game.Meteor.constructor = Game.Meteor;
	Game.Meteor.prototype._init = function(){
		this._scale = Game.Util.getRandom( 0.5, 1.5, true );
		this._speed = Game.Util.getRandom( 1, 4, true );
		this._tick = Game.Util.getRandom( 10, 40 );
		this._cellPosition = { x:0, y:0 };
		this._renderCount = 0;
		this._inStage = false;
		this._radius=( this._cell_size * this._scale )/3;
		this._position = { x:500, y:200 };
		this._vector = { r:0, l:this._speed };
		var tempPos = Game.Util.getRandom( 1, 4 );
		switch( tempPos ){
			case 1: //left
				this._position = { x:Game.Util.getRandom( -300, -10 ), y:Game.Info.stageHeight/2+Game.Util.getRandom( -50, 50 ) };
				this._vector = { r:Game.Util.getRandom( -2*Math.PI*( 1/8 ), 2*Math.PI*( 1/8 ), true ), l:this._speed };
				break;
			case 2: //up
				this._position = { x:Game.Info.stageWidth/2+Game.Util.getRandom( -50, 50 ), y:Game.Util.getRandom( -300, -10 ) };
				this._vector = { r:Game.Util.getRandom( Math.PI*( 1/4 ), Math.PI*( 3/4 ), true ), l:this._speed };
				break;
			case 3: //right
				this._position = { x:Game.Util.getRandom( Game.Info.stageWidth+10, Game.Info.stageWidth+300 ), y:Game.Info.stageHeight/2+Game.Util.getRandom( -50, 50 ) };
				this._vector = { r:Game.Util.getRandom( 2*Math.PI*( 3/8 ), 2*Math.PI*( 5/8 ), true ), l:this._speed };
				break;
			case 4: //down
				this._position = { x:Game.Info.stageWidth/2+Game.Util.getRandom( -50, 50 ), y:Game.Util.getRandom( Game.Info.stageHeight+10, Game.Info.stageHeight+300 ) };
				this._vector = { r:Game.Util.getRandom( Math.PI*( 1/4 )+3.14, Math.PI*( 3/4 )+3.14, true ), l:this._speed };
				break;
		}
	};

	Game.Meteor.prototype._checkInStage = function(){
		return this._position.x+this._radius > 0 && this._position.x-this._radius < Game.Info.stageWidth && this._position.y+this._radius > 0 && this._position.y-this._radius < Game.Info.stageHeight;
	};

	Game.Meteor.prototype.update = function( time ){
		if( this.live ){
			if( Math.abs( this._lastTime-time ) < this._tick ) return;
			if( this._renderCount >= this._cell_count ) this._renderCount = 0;
			this._lastTime=time;
			this._cellPosition.x = this._renderCount * this._cell_size % 256;
			this._cellPosition.y = Math.floor( this._renderCount / 8 ) * this._cell_size;
			this._position.x = this._position.x+this._vector.l*Math.cos( this._vector.r );
			this._position.y = this._position.y+this._vector.l*Math.sin( this._vector.r );
			if( !this._inStage ){
				this._inStage = this._checkInStage();
			}else{
				if( !this._checkInStage() ) {
					this._init();
					return;
				}
			}
		}else{
			if( this._renderCount >= this._cell_count ) return;
			this._cellPosition.x = this._renderCount * this._cell_size % 512;
			this._cellPosition.y = Math.floor( this._renderCount / 8 ) * this._cell_size;
		}
		this._renderCount++;
	};

	Game.Meteor.prototype.explosion = function(){
		this._currentSprite = Game.Assets.explosionSprite;
		this._cell_size = 64;
		this._cell_count = 40;
		this._cell_start_position = { x:0, y:320 };
		this._tick = 0;
		this._renderCount = 0;
		this._position.x -= this._radius;
		this._position.y -= this._radius;
	};

	Game.GuidedMeteor = function( context, target, time ){
		this._context = context;
		this._target = target;
		this._createTime = time;
		this._init();
	}
	;
	Game.GuidedMeteor.prototype = new Game.Meteor();
	Game.GuidedMeteor.constructor = Game.GuidedMeteor;
	Game.GuidedMeteor.prototype._init = function(){
		this._cell_start_position = { x:0, y:192 };
		this._cell_size = 32;
		this._cell_count = 16;
		this._currentSprite = Game.Assets.emenySprite;
		this._scale = Game.Util.getRandom( 1.5, 2, true );
		this._speed = Game.Util.getRandom( 1, 2, true );
		this._tick = Game.Util.getRandom( 10, 20 );
		this._cellPosition = { x:0, y:0 };
		this._renderCount = 0;
		this._radius=( this._cell_size * this._scale )/3;
		this._vector = { r:0, l:this._speed };
		this.live = true;
		var tempPos = Game.Util.getRandom( 1, 4 );
		switch( tempPos ){
			case 1: this._position = { x:-this._cell_size*this._scale, y:Game.Info.stageHeight/2+Game.Util.getRandom( -50, 50 ) }; break;
			case 2: this._position = { x:Game.Info.stageWidth/2+Game.Util.getRandom( -50, 50 ), y:-this._cell_size*this._scale }; break;
			case 3: this._position = { x:Game.Info.stageWidth, y:Game.Info.stageHeight/2+Game.Util.getRandom( -50, 50 ) }; break;
			case 4: this._position = { x:Game.Info.stageWidth/2+Game.Util.getRandom( -50, 50 ), y:Game.Info.stageHeight }; break;
		}
	};

	Game.GuidedMeteor.prototype.update = function( time ){
		if( time - this._createTime > 6000 && this.live ){
			this.live = false;
			this._createTime = time;
			var that = this;
			setTimeout( function(){
				that._init()
			}, 1000 );
			this.explosion();
			this._cellPosition.x = this._renderCount * this._cell_size % 512;
			this._cellPosition.y = Math.floor( this._renderCount / 8 ) * this._cell_size;
			return;
		}
		if( this.live ){
			if( Math.abs( this._lastTime-time ) < this._tick ) return;
			if( this._renderCount >= this._cell_count ) this._renderCount = 0;
			this._lastTime=time;
			this._cellPosition.x = this._renderCount * this._cell_size % 256;
			this._cellPosition.y = Math.floor( this._renderCount / 8 ) * this._cell_size;
			this._vector.r = Math.atan2( this._target._position.y - this._position.y, this._target._position.x - this._position.x )
			this._position.x = this._position.x+this._vector.l*Math.cos( this._vector.r );
			this._position.y = this._position.y+this._vector.l*Math.sin( this._vector.r );
		}else{
			if( this._renderCount >= this._cell_count ) return;
			this._cellPosition.x = this._renderCount * this._cell_size % 512;
			this._cellPosition.y = Math.floor( this._renderCount / 8 ) * this._cell_size;
		}
		this._renderCount++;
	};

	return Game;
})();



