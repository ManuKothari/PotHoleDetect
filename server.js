var express = require('express'),
    multer  = require('multer');
var path 	= require('path');
var logger  = require('morgan');
var mongoose = require('mongoose');
var EventModel = require('./models/eventSchema');
var multer  = require('multer');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');

mongoose.connect('mongodb://manu:manuk@ds033163.mongolab.com:33163/potholedetect', { server: { poolSize: 5 } });

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

function getMSG(counter, fail, result, msg) {
    var STAT = null;
    if(fail == 0) STAT = 'SUCCESS';
    else if(fail == counter.length) STAT = 'ERROR';
    else STAT = 'WARNING';
    var MSG = {
        "Status" : STAT,
        "Pass Count" : counter.length - fail,
        "Fail Count" : fail,
        "Message" : (counter.length - fail) + " record(s) have been " + msg + "."
    };
    if(result.length > 0)
        MSG["Details"] = result;
    return MSG;
}

function callPostMultiple(req, response, request) {
    var result = [];
    var fail = 0;
    var counter = [];
    var status = 201;
    for(i = 0; i < request.body.length; ++i) {
        if(request.body[i]["IMEI"] == undefined || request.body[i]["Latitude"] == undefined || request.body[i]["Longitude"] == undefined || request.body[i]["x"] == undefined || request.body[i]["y"] == undefined || request.body[i]["z"] == undefined || request.body[i]["Time"] == undefined) {
            ++fail;
            result[result.length] = { message:"IMEI, Latitude, Longitude, x, y, z and Time must be defined in JSON body" };
            counter.push(true);
            if(counter.length === request.body.length) {
                response.status(status).json(getMSG(counter, fail, result, "created"));
            }
        }
        else {
            var eventModel    = new EventModel();   // create a new instance of the test case model
            eventModel.imei   = request.body[i]["IMEI"];
            eventModel.lat    = request.body[i]["Latitude"];
            eventModel.long   = request.body[i]["Longitude"];
            eventModel.x      = request.body[i]["x"];
            eventModel.y      = request.body[i]["y"];
            eventModel.z      = request.body[i]["z"];
            eventModel.time   = request.body[i]["Time"];
            eventModel.save(function(err) {
                if (err) {
                    result[result.length] = err;
                    log.error("POST ERROR: " + err);
                    console.log("POST ERROR: " + err);
                    status = 400;
                    ++fail;
                }
                counter.push(true);
                if(counter.length === request.body.length) {
                    response.status(status).json(getMSG(counter, fail, result, "created"));
                }
            });
        }
    }
}

//=============================================

app.get('/', function(req, res){
    EventModel.find({}, function(err, events) {
        if(err) {
            console.log(err);
            res.status(400).json(err);
        }
        else {
            res.status(200).json(events);
        }
    });
});


var upload = multer({
    dest:'./uploads/',
    onFileUploadStart: function (file) {
        console.log(file.originalname + ' is starting ...')
    },
    onFileUploadComplete: function (file) {
        console.log("completed....");
    }
});

app.post('/',upload, function(req, res){
   // console.log(req.body); // form fields
   // console.log(req.files); // form files
   // for(i = 0; i < req.files.length; ++i) {
    mobj = [];
    if(req.files["DATA"].extension == 'csv') {
        var contents = fs.readFileSync(req.files["DATA"].path, 'utf8');
        contents = contents.split('\n');
        console.log(JSON.stringify("Contents: " + contents))
        m_imei = contents[0];
        for (j = 2; j < contents.length; ++j) {
            var arr = contents[j].split(',');
            if(arr[0] == "")
                continue;
            mobj[mobj.length] = {
            "IMEI": m_imei,
            "Time": arr[0],
            "Latitude": arr[1],
            "Longitude": arr[2],
            "x": arr[3],
            "y": arr[4],
            "z": arr[5]
            }
        }
        console.log("Myobj: " + JSON.stringify(mobj));
        callPostMultiple(req,res,{body:mobj})
    }
    else
        res.status(204).send("Not a CSV File");
});


//=============================================
app.listen(3000, function() {
    console.log("Working on port 3000");
});
