var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({dest: 'public/images'})
var type = upload.single('fileUpLoaded')
var fs = require('fs');

// 1. Connet to MongoDB.
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var mongoUrl = 'mongodb://localhost:27017/electric'
var db; //Global so all of our routes have access to the db connection

mongoClient.connect(mongoUrl, (error, database) => {
	if(error){
		console.log(error) //Print out the error because there is one
	}else{
		db = database; //Set the database object that was passed back to our callback
		console.log("Connected to Mongo successfully.");
	}
})

router.post('/form_submit', type, (req, res, next) => {
	// res.json(req.file);
	var tmp_path = req.file.path;
	var target_path = 'public/images/' + req.file.originalname;
	fs.readFile(tmp_path, (error, data) => {
		fs.writeFile(target_path, data, (error) => {
			res.json('File Uploaded to ' + target_path);

			// db.insert

		})
	})
})


router.get('/form_submit', (req, res, next) => {
	res.render('form_submit', {})
});

/* GET home page. */
router.get('/', (req, res, next) => {

	var userIP = req.ip;
	// 5. Find all the photos the user has voted on and load an array up with them.
	db.collection('votes').find({ip:userIP}).toArray(function(error, userResult){
		var photosVoted = [];
		if(error){
			console.log("There was an error fetching user votes.");
		}else{
			// console.log(userResult);
			for(var i=0; i<userResult.length; i++){
				photosVoted.push(userResult[i].image);
			}
		}

		// 2. Get pictures from Mongo and store them in an array to pass to view
		// 6. Limit the query to photos not voted on
		db.collection('images').find({imgSrc: { $nin: photosVoted } }).toArray(function(error, photos){
			if (photos.length === 0){
				res.redirect('/standings')
			}else{
				// 3. Grab a random image from that array
				var randomNum = Math.floor(Math.random() * photos.length);
				var randomPhoto = photos[randomNum].imgSrc;
				// 4. Send that image to the view
				res.render('index', { imageToRender: randomPhoto });
			}
		})
	})
});

router.post('/electric', function(req, res, next){
	// res.json(req.body);
	// 1. We know whether they voted electric or poser because it's in req.body
	// 2. WE know what image they voted on because it's in req.body.image
	// 3. We know who they are because we have their IP address.

	if(req.body.submit == "Golfer"){
		var upDownVote = 1;
	}else if(req.body.submit == "Ladie's Tees"){
		var upDownVote = -1;
	}

	db.collection('votes').insertOne({
		ip: req.ip,
		vote: req.body.submit,
		image: req.body.image
	});

	// 7. Update the images collection so that the image voted on will have a new totalVotes
	db.collection('images').find({imgSrc: req.body.image}).toArray(function(error,result){
		var total;
		console.log(result);
		if(isNaN(result[0].totalVotes)){
			total = 0;
		}else{
			total = result[0].totalVotes;
		}

		db.collection('images').updateOne(
			{ imgSrc: req.body.image },
			{
				$set: {"totalVotes": (total + upDownVote)}
			}, function(error, results){
				//Check to see if there is an error
				//Check to see if the document was updated
			}
		)
	})

	res.redirect("/");

});

router.get('/standings', function(req, res, next){
	db.collection('images').find().toArray(function(error, allResults){
		var standingsArray = [];
		allResults.sort(function(a,b){
			return (b.totalVotes - a.totalVotes);
		});
		res.render('standings', {theStandings: allResults});
	});
})

router.get('/resetUserVotes', (req, res, next) => {
	db.collection('votes').deleteMany(
		{ip: req.ip},
		function(error, results){


		}
	);
	res.redirect('/');
})


module.exports = router;
