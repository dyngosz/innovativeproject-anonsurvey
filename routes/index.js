var express = require('express');
var router = express.Router();
var CryptoJS= require('crypto-js');

var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').pure().BSON,
    assert = require('assert');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Annonymous Surveys' });
});

/* GET Hello World page. */
router.get('/helloworld', function(req, res) {
    res.render('helloworld', { title: 'Hello, World!' })
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
    var db = req.db;
    var collection = db.get('usercollection');
    collection.find({},{},function(e,docs){
        res.render('userlist', {
        	title: 'User list',
            "userlist" : docs
        });
    });
});

/* GET New User page. */
router.get('/newuser', function(req, res) {
    res.render('newuser', { title: 'Add New User' });
});


/* POST to Add User Service */
router.post('/adduser',adduserFunction);


function adduserFunction(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var userName = String(req.body.username);
    var userSurname = String(req.body.usersurname);
    var userEmail = String(req.body.useremail);
    var userPassword = String(req.body.userpassword);
    var userRepeatPassword = String(req.body.userrepeatpassword);

    var reg = /^[a-zA-ZąćęłńóśżźĄĆĘŁŃÓŚŻŹ]{2,20}$/;
    var regMail = /^[a-zA-Z0-9]{1,30}@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/;

    if((userName.match(reg)) && (userSurname.match(reg)) && (userEmail.match(regMail)) && (userPassword==userRepeatPassword) ){
    
        // Set our collection
        var collection = db.get('usercollection');

        collection.count({"useremail" : userEmail},function(err, count){
            if(count==0){
                var userid=0;
                collection.count({},function(err, count){
                    userid = count+1;  
                // Submit to the DB
                    collection.insert({
                        "userid" : userid,
                        "userstatus" : "A",  //user is active
                        "username" : userName,
                        "usersurname" : userSurname,
                        "useremail" : userEmail,
                        "userpassword" : String(CryptoJS.SHA3(userPassword))
                    }, function (err, doc) {
                        if (err) {
                            // If it failed, return error
                            res.send("There was a problem adding the information to the database.");
                        }
                        else {
                            // If it worked, set the header so the address bar doesn't still say /adduser
                            res.location("/");
                            // And forward to success page
                            res.redirect("/");
                        }
                    });
                });
            }
            else
            {var ecom = "Account already exists";
                res.render('newuser', { "error" : ecom });}
        });
    }
    else
    {var ecom = "Incorrect data.. Please, try again";
                res.render('newuser', { "error" : ecom });}
}


/* GET Sign In page. */
router.get('/signin', function(req, res) {
    res.render('signin', { title: 'Sign In' });
});


function profileFunction(req,res){
        // Set our internal DB variable
    var db = req.db;
    // Get our form values. These rely on the "name" attributes
    //console.log(req.body.useremail);
    if(req.body.useremail != undefined){    
        var userEmail = req.body.useremail;
        var userPassword = req.body.userpassword;
    }
    else {
        //console.log(req.cookies.useremail);
        var userEmail = req.cookies.useremail;;
        var userPassword = req.cookies.userpassword; 
    }   
    // Set our collection
    var collection = db.get('usercollection');

    collection.count({"useremail" : userEmail, "userpassword" : String(CryptoJS.SHA3(userPassword))},function(err, count){
        if(count==1)
        {
            res.cookie('useremail', userEmail, { maxAge: 900000, httpOnly: true });
            res.cookie('userpassword', userPassword, { maxAge: 900000, httpOnly: true });
            collection.find({"useremail" : userEmail, "userpassword" : userPassword},function(e,docs){
            
                var collection2 = db.get('usersurveycollection');

                collection2.find({"email" : userEmail},function(e,docs2) {
                    var list = [];
                    for (i=0; i<docs2.length; i++) {
                
                        list[list.length] = parseInt(docs2[i].surveyid);
                    }
                    //console.log(list);
                    //console.log(docs2.length);

                    var collection3 = db.get('surveycollection');

                    collection3.find({"surveyid" : {$in : list}},function(e, docs3) {

                        collection3.find({"surveyowner" : userEmail}, function(e, docs4){
                            console.log(docs3);

                            res.render('profile', {
                            title: 'Your Profile',
                                "profile" : docs,
                                "surveys" : docs3,
                                "surveysowner" : docs4,
                            });
                        });
                    });
                });
            });
        }
        else
        {
                var ecom = "Incorrect data. If you don't have an account - Sign up";
                res.render('index', { "error" : ecom });
        }
    });
};
/* GET to Verify Sign In Service */
router.get('/profile', profileFunction);

/* POST to Verify Sign In Service */
router.post('/profile', profileFunction);

/* GET Creator page. */
router.get('/creator', function(req, res) {
    res.render('creator', { title: 'Survey Creator' });
});

/* POST to Add Survey Service */
router.post('/addsurvey', function(req, res) {

    var surveyname = req.body.surveyname;
    var question = req.body.question;
    var answertype = req.body.answertype;
    var useremail = req.cookies.useremail;
    //console.log(answertype);
    //console.log(question);
    //console.log(surveyname);
    //console.log(useremail);

    var db = req.db;
    var collection = db.get('surveycollection');
        collection.count({},function(err, count){
            surveyid = count+1;  
            // Submit to the DB
            collection.insert({
                "surveyname" : surveyname,
                "surveyowner" : useremail,
                "surveyid" : surveyid,
                "questions" : [{
                    "questionnumber" : 1,
                    "question" : question,    
                    "answertype" : answertype,
                    "availbeanswers" : ["yes","no"],
                    "answercount" : 2,
                    "otheranswer" : false, 
                }],
                "questionscount" : 1
            }, function (err, doc) {
                if (err) {
                    // If it failed, return error
                    res.send("There was a problem adding the information to the database.");
                }
                else {
                    // If it worked, set the header so the address bar doesn't still say /adduser
                    res.location("/chooseuser");
                    // And forward to success page
                    res.redirect("/chooseuser?survey="+surveyid);
                }
            });
        });
});

router.get('/chooseuser', function(req, res) {
    var db = req.db;
    var collection = db.get('usercollection');
    var surveyid = req.query['survey'];
    //console.log(surveyid);
    collection.find({},{},function(e,docs){
        res.render('chooseuser', {title: 'Choose users who can answer from the list', getsurveyid : surveyid});
    });
});

router.post('/adduserstosurvey', function(req, res) {
    //console.log(req.body);
    //console.log(req.body.email.length);
    var db = req.db;
    var collection = db.get('usersurveycollection');
    var surveyid = req.body.surveyid;
    var emails = req.body.email;
    if( typeof emails === 'string' ) {
        emails = [ emails ];
    }
    //console.log(emails);
    //console.log(emails.length);
    for (i in emails) {
        //console.log(emails[i]);
        collection.insert({
            "surveyid" : surveyid, 
            "email" : emails[i]
        }, function (err, doc) {});
    }
    res.render('adduserstosurvey', {title: 'Survey made'});
});

router.post('/fillorcheck', function(req,res){

        var db = req.db;

        var useremail = req.cookies.useremail;

        var userPassword = req.body.yourpassword;
        var surveyId = req.body.yoursurveyid; 
       
        var stringToCheck = useremail + userPassword + surveyId;

        var collection = db.get('surveyanswers');
        collection.count( {"user" : stringToCheck },function(err, count){

            if( count == 1 )
                {    
                    var collection = db.get('surveyanswers');
                    var number = String(surveyId);
                    
                    collection.find( { surveyid : number, user : stringToCheck  } ,  function(e,docs) {
                        console.log(docs);
                        res.render('checkuseranswer', { 
                            "answerlist" : docs
                        }); 
                    });

                }
                else //tutaj może się okazać że użytkownik wpisze złe hasło - wtedy go przekieruje i tak, do poprawy
                {
                    var collection = db.get('surveycollection');
                    var number = parseInt(surveyId);
                    collection.find({ "surveyid" : number }, function(e,docs) {
                        res.render('fillingsurvey', {
                            "question" : docs ,
                            "user" : stringToCheck,
                        });
                    });
                }
        });

});

router.post('/answertobase', function(req,res){

    var db = req.db;

    var ans = req.body.answer;
    var user = req.body.user;
    var surveyid = req.body.surveyid;
    var question = req.body.question;

    var collection = db.get('surveyanswers');

    collection.insert({
                "user" : user,
                "surveyid" : surveyid,
                "question" : question,
                "answer" : ans
            }, function (err, doc) {
                if (err) {
                    res.send("There was a problem adding the information to the database.");
                }
            });
    res.location("/profile");
    res.redirect("/profile");

});

router.get('/result', function(req, res){

    var surveyid = req.query['survey']; //Pobieranie numeru ankiety
    var db = req.db;

    var collection = db.get('surveyanswers');

    collection.count({ "surveyid" :surveyid }, function(err, count){
        if(count > 0)
        {
            collection.find( { "surveyid" : surveyid }, { "question" : 1 }, function(err, docs){
                var question = docs;
                var allResults = count;
                    collection.count({ "surveyid" : surveyid, "answer" : "Yes"}, function(err, count){
                        count = String(parseInt((count/allResults)*100)) + "%";
                        var results = [question[0].question, allResults, count ];
                        res.render('seeresults', {
                            "result" : results 
                        });

                });
            });
        }
        else
        {

        }
        

    });

});

module.exports = router;
