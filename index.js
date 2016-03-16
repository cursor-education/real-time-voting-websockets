var wsUrl = 'ws://185.69.152.203:4871' // test broadcast ws-server
  , appName = 'realtime-voting-app'
  , appVersion = 0.21
  , debug = true;

var app = {
  init: function () {
    app.peerId = _.random(1,999999999);
    app.ws = new WebSocket(wsUrl);
    
    app.bindEvents();
    app.bindWsEvents();
  },
  
  log: function() {
  	if (!debug) return;
    console.log.apply(console, arguments);
  },
  
  bindEvents: function () {
  	// on close/refresh page
    window.onbeforeunload = function() {
    	if ($('.button.selected').length) {
        // send to all message that we're leaving
        app.ws.send(JSON.stringify({
        	'appName': appName,
          'appVersion': appVersion,
          'senderPeerId': app.peerId,
          'action': 'remove',
          'choise': $('.button.selected').text().toLowerCase()
        }));
      }

      app.ws.close();
    };
  
  	// on choise button click
    $('.button').on('click', function (ev) {
      var prevChoise = $('.button.selected').text() || ''
      	, choise = ev.target.innerText;

      $('.button.selected').removeClass('selected');

      app.ws.send(JSON.stringify({
        'appName': appName,
        'appVersion': appVersion,
        'senderPeerId': app.peerId,
        'action': 'remove',
        'choise': prevChoise.toLowerCase()
      }));

      if (prevChoise == choise) return;

      $(this).addClass('selected');

      app.ws.send(JSON.stringify({
        'appName': appName,
        'appVersion': appVersion,
        'senderPeerId': app.peerId,
        'action': 'add',
        'choise': choise.toLowerCase()
      }));
    });
  },
  
  bindWsEvents: function () {
		// on socket connection established
    app.ws.onopen = function(event) {
      app.chart.init();

			// sent to others welcome message
      // they will respond with chart data
      app.ws.send(JSON.stringify({
        'appName': appName,
        'appVersion': appVersion,
        'senderPeerId': app.peerId,
        'action': 'hey-all'
      }));
    };

		// on message received
    app.ws.onmessage = function(event) {
      try {
        var data = JSON.parse(event.data);
        
        // verify if response-data is related to current app name & version
        if (data.appName != appName) return;
        if (data.appVersion != appVersion) return;

        switch (data.action) {
        	// when somebody is connected
          case 'hey-all':
            // ignore if message is mine
            if (data.senderPeerId == app.peerId) break;
            
            app.log('somebody is connected');

						// respond to him a charts data
            app.ws.send(JSON.stringify({
              'appName': appName,
              'appVersion': appVersion,
          		'senderPeerId': app.peerId,
              'receiverPeerId': data.senderPeerId,
              'action': 'set-data',
              'data': app.chart.getData()
            }));

            break;

          case 'set-data':
          	app.log('set-data', data);
            
            // ignore if message is mine
            if (data.senderPeerId == app.peerId) break;
            
            // ignore is message isn't directed to me
            if (data.receiverPeerId !== app.peerId) break;
            
            app.chart.setData(data.data);

            break;

          case 'add':
          case 'remove':
          	var choise = data.choise.toLowerCase();
            
            app.log(data.action, 'to', data.choise);

            var chartData = app.chart.getData();
            		chartData[choise] += data.action == 'remove' ? -1 : +1;

            app.chart.setData(chartData);

            break;
        }
      }
      catch (e) {}
    };
  },
  
  chart: {
    _data: {
      'yes': 0,
      'no': 0,
      'maybe': 0
    },

    init: function () {
    	app.log('init');
    	app.chart.$chart = $('#chart');

      app.chart.$chart.highcharts({
        title: false,
        series: [{
          type: 'pie',
          innerSize: '40%',
          data: [
            {name:'Yes',   y:app.chart._data.yes,   color:'#0FB90F'},
            {name:'No',    y:app.chart._data.no,    color:'#EB3232'},
            {name:'Maybe', y:app.chart._data.maybe, color:'#eee'}
          ]
        }]
      });
    },

    getData: function () {
      return app.chart._data;
    },

    setData: function (data) {
			_.each(data, function(v, k) {
       	if (parseInt(v) < 0) {
        	data[k] = 0;
        }
      });
      // app.log('setData', data);

      app.chart._data = data;
      app.chart.redraw();
    },

    redraw: function () {
    	var _chart = (app.chart.$chart).highcharts()
      	, _data = _chart.series[0].data;
     
     	// app.log('redraw', app.chart._data);

      _.each(_data, function(s) {
        var serieName = s.name.replace(/\s\(.*$/, '').toLowerCase()
        	, serieValue = app.chart._data[serieName];

        s.y = serieValue;
        s.name = s.name.replace(/\s\(.*$/, '') + ' (' + s.y + ')';
      });

      _chart.series[0].setData(_data);
    }
  }
};

app.init();
