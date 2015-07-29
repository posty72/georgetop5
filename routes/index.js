var express = require('express');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var AWS = require('aws-sdk');
var crontab = require('node-crontab');
var config = require('../config');

AWS.config.region = 'us-west-2';
AWS.config.accessKeyId = config.AWSaccessKeyId;
AWS.config.secretAccessKey = config.AWSaccessKeyId;

var ses = new AWS.SES({apiVersion: '2010-12-01'});
var to = [config.email1];
var from = config.email2;

var currTop5 = [];
var newTop5 = [];


request('http://www.georgefm.co.nz/Music/OfficialTop5.aspx', function (error, response, html) {
  if (!error && response.statusCode == 200) {
    var $ = cheerio.load(html);

    $('#top5-no1, .top5-no2,.top5-no3,.top5-no4,.top5-no5').each(function(key, index){

    	currTop5.push({
	    	"artist": $(this).find('p').text().split('-')[0],
	    	"song": $(this).find('p').text().split('-')[1]
	    });

    });
  }
});

var top5Job = crontab.scheduleJob("00 11,16 * * 1-5", checkAndNotify);

function checkAndNotify(){
	request('http://www.georgefm.co.nz/Music/OfficialTop5.aspx', function (error, response, html) {
    console.log('Requesting top5 data');
	  if (!error && response.statusCode == 200) {
	    var $ = cheerio.load(html),
	    	emailData = 'GeorgeFM Top 5\n\n';
	    	console.log('Recieved top5 data');

	    $('#top5-no1, .top5-no2,.top5-no3,.top5-no4,.top5-no5').each(function(key, index){

	    	newTop5.push({
		    	"artist": $(this).find('p').text().split('-')[0],
		    	"song": $(this).find('p').text().split('-')[1]
		    });

		    emailData += $(this).find('p').text() + '\n';

    	});

	    (JSON.stringify(newTop5) !== JSON.stringify(currTop5)) ? console.log('New Top 5!') : console.log('Top 5 is unchanged');
	    console.log(JSON.stringify(newTop5));
	    console.log(JSON.stringify(currTop5));

	    if(currTop5.length < 1){
				currTop5 = newTop5;
	    } else if(JSON.stringify(newTop5) !== JSON.stringify(currTop5)) {

	    	ses.sendEmail( { 
					Source: from, 
					Destination: { ToAddresses: to },
					Message: {
						Subject: {
							Data: 'GeorgeFM Top 5'
						},
						Body: {
							Text: {
								Data: emailData,
							}
						}
					}
				}, function(err, data) {
					if(err) throw err
					console.log('Email sent.');
				});

	    	currTop5 = newTop5;

	    } else {

	    }
	  }
	});
}
checkAndNotify();

router.get('/', function(req, res, next) {

	var top5 = {
		songs: []
	};

	request('http://www.georgefm.co.nz/Music/OfficialTop5.aspx', function (error, response, html) {
	  if (!error && response.statusCode == 200) {
	    var $ = cheerio.load(html);
    	var emailData = 'GeorgeFM Top 5\n\n';

	    $('#top5-no1, .top5-no2, .top5-no3, .top5-no4, .top5-no5').each(function(key, index){
	    	var artist = $(this).find('p').text().split('-')[0];
	    	var song = $(this).find('p').text().split('-')[1]

	    	emailData += $(this).find('p').text() + '\n';

	    	top5.songs.push({
		    	"artist": artist,
		    	"song": song
		    });

	    });

    	res.render('top5', top5);

	  }
	});

});

module.exports = router;
