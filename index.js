
var Express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser');
var fs = require('fs');
var winston = require('winston')
var zip = require('adm-zip');
var app = Express();
app.use(bodyParser.json());
app.use(Express.static('public'))
var dialogflowFilePath = ""
var writedialogfile = []
writelexfile = []
var lexFilePath = ""
var dataSet = []
var Logger = exports.Logger = {};
var entityDetails = ""
var zipper = new zip();
var zip = require("node-native-zip");
var responseMessage = "dont know"
var fileName = ['entity_sizeone.json','entity_sizetwo.json']
var slots = []
var slotType = []

//To write exception in a file
const transports = {
    console: new winston.transports.Console({ level: 'warn' }),
    file: new winston.transports.File({ filename: 'combined.log', level: 'error' })
};
//To log errors 
const logger = winston.createLogger({
    transports: [
        transports.console,
        transports.file
    ]
});

//To store uploaded files into a folder with a new file name 
var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./DialogflowJsonFiles");
    },
    filename: function (req, file, callback) {
        if (file.fieldname == "intent") {
            dialogflowFilePath = "Dialogflow" + "_" +  Date.now() + file.originalname
            lexFilePath = "Lex" + "_"+ file.originalname
            writelexfile.push(lexFilePath)
        } else {
            dialogflowFilePath = "entity" + "_" + file.originalname
        }
        writedialogfile.push(dialogflowFilePath)
        callback(null, dialogflowFilePath);

    }
});

//To upload more than one files
var upload = multer({
    storage: Storage
}).any();

//Home page API
app.get("/", function (req, res) {
 
    res.sendFile(__dirname + "/index.html");

});

//Post method to write files 
app.post("/", function (req, res) {
    
    upload(req, res, function (err) {
        if (err) {
            console.log(err)
            console.log("something went wrong")
            throw err;
            return res.end("Something went wrong!");
        }
       
        for (i in writedialogfile) {
            fs.readFile("./DialogflowJsonFiles/" + writedialogfile[i], (err, data) => {
                // mistaken assumption: throwing here...
                if (err) {
                    throw err;
                }
                let parsedata = JSON.parse(data)
                var parsedatares =  parsedata.responses
                /*prompt question logic*/
               /* for(resparamindex in parsedatares){
                    var promptparameter = parsedatares[resparamindex].parameters
                    for(promparamindex in promptparameter){
                        var promptques = promptparameter[promparamindex].prompts
                        for (promptindex in promptques){
                            var promptvalue = promptques[promptindex].value
                           
                        }
                    }
                }*/
            
                if (parsedata.entries && parsedata.entries.length > 0) {
                    var entityName = parsedata.name.replace(/[^a-zA-Z0-9]/g, '')
                    var entityValue = ""
                    var ev = []
                    for (i in parsedata.entries) {
                        entityValue = parsedata.entries[i].value
                        ev.push({ 'value': entityValue })
                    }
                 
                    var slotValue = ""
                      slots.push({
                        "name": entityName,
                        "slotConstraint": "Required",
                        "slotType": entityName,
                        "slotTypeVersion": "1",
                        "valueElicitationPrompt": {
                          "messages": [
                            {
                              "contentType": "PlainText",
                              "content": "What size are you looking for?"
                            }
                          ],
                          "maxAttempts": 2
                        },
                        "priority": 1,
                        "sampleUtterances": []
                      })
                      slotType.push(
                        {
                            "description": entityName,
                            "name": entityName,
                            "version": "1",
                            "enumerationValues": ev,
                            "valueSelectionStrategy": "ORIGINAL_VALUE"
                          },
                    
                      )
                    
                
                    var test = JSON.stringify(ev)
                    entityDetails = {
                        "metadata": {
                            "schemaVersion": "1.0",
                            "importType": "LEX",
                            "importFormat": "JSON"
                        },
                        "resource": {
                            "description": entityName,
                            "name": entityName,
                            "version": "1",
                            "enumerationValues": ev,
                            "valueSelectionStrategy": "ORIGINAL_VALUE"
                        }
                    }
                    var entitydataset = JSON.stringify(entityDetails);
                    fs.writeFile("./LexJsonFiles/" + "Slot" + "_" + entityName + ".json", entitydataset, 'utf8', function (err) {

                        if (err) {
                            return console.log(err);
                            throw err;
                        }
                    });
                        var archive = new zip();
                        archive.add("Slot" + "_" + entityName + ".json", new Buffer(entitydataset, "utf8"));
                        var buffer = archive.toBuffer();
                        fs.writeFile("./LexJsonFiles/ZipFiles/" + "Slot" + "_" + entityName + ".zip", buffer, function () {
                            console.log("Finished");
                          
                        });

                        console.log("The Entity file was saved!");
                } 
               
        
            });
        }
        
        for (i in writedialogfile) {
            fs.readFile("./DialogflowJsonFiles/" + writedialogfile[i], (err, data) => {
                // mistaken assumption: throwing here...
                if (err) {
                    throw err;
                }
                parsedata = JSON.parse(data);
                var responseData = parsedata.responses
              console.log("slot" + slotType)
                if (!parsedata.entries) { 
                    var checkentity =  checkEntity(responseData[0])
                    if(checkentity['code'] == 200 || checkentity['code'] == 202){
                        responseMessage = "File uploaded sucessfully"
                        dataSet['intentname'] = parsedata.name.replace(/[^a-zA-Z0-9]/g, '')
                        dataSet['slots'] = slots
                        dataSet['slottype']= slotType
                        var usermsg = parsedata.userSays
                        var utt = ""
                        var allutt = []
                        var responseSpeech = ""
                        var resmsg = responseData.messages
                        var responseSpeech = ""
                        utterences(usermsg, allutt, res)
                        responseSpeech = responseResult(responseData, res)
                        dataSet['utterence'] = allutt
                        data = dataResult(dataSet, responseSpeech, res)
                    
                        var ds = JSON.stringify(data);
                        fs.writeFile("./LexJsonFiles/" + "Lex" + "_" + dataSet['intentname'] + ".json", ds, 'utf8', function (err) {
                        if (err) {
                            return console.log(err);
                            throw err;
                        }
                        console.log("The file was saved!");
                        });
                        archive = new zip();
                        archive.add("lex" + "_" + dataSet['intentname'] + ".json", new Buffer(ds, "utf8"));
                        var buffer = archive.toBuffer();
                        fs.writeFile("./LexJsonFiles/ZipFiles/" + "Lex" + "_" + dataSet['intentname'] + ".zip", buffer, function () {
                            console.log("Finished");
                        });
                        res.status(200).end(`
                        <!DOCTYPE html>
                        <html xmlns="http://www.w3.org/1999/xhtml">
                        
                        <head>
                          <meta charset="utf-8" />
                          <title>Json conversion</title>
                        
                          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
                          <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
                          <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
                          <style>
                            body {
                              margin: 0 auto;
                              width: 100%;
                              margin: 0 auto;
                            }
                        
                            .circ {
                              opacity: 0;
                              stroke-dasharray: 130;
                              stroke-dashoffset: 130;
                              -webkit-transition: all 1s;
                              -moz-transition: all 1s;
                              -ms-transition: all 1s;
                              -o-transition: all 1s;
                              transition: all 1s;
                            }
                        
                            .tick {
                              stroke-dasharray: 50;
                              stroke-dashoffset: 50;
                              -webkit-transition: stroke-dashoffset 1s 0.5s ease-out;
                              -moz-transition: stroke-dashoffset 1s 0.5s ease-out;
                              -ms-transition: stroke-dashoffset 1s 0.5s ease-out;
                              -o-transition: stroke-dashoffset 1s 0.5s ease-out;
                              transition: stroke-dashoffset 1s 0.5s ease-out;
                            }
                        
                            .drawn+svg .path {
                              opacity: 1;
                              stroke-dashoffset: 0;
                            }
                        
                            .wrapper {
                              height: 100vh;
                              background: url('converterBackground.png');
                              background-size: 100% 100%;
                              background-repeat: no-repeat;
                            }
                        
                            svg {
                              width: 250px;
                              height: 250px;
                            }
                        
                            .message {
                              width: 50%;
                              margin: 0 auto;
                              text-align: center;
                              padding-top: 100px;
                            }
                          </style>
                        </head>
                        
                        <body>
                          <div class="wrapper">
                            <div class="message">
                              <div class="trigger"></div>
                              <svg version="1.1" id="tick" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 37 37" style="enable-background:new 0 0 37 37;" xml:space="preserve">
                        <path class="circ path" style="fill:none;stroke:green;stroke-width:3;stroke-linejoin:round;stroke-miterlimit:10;" d="
                            M30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z"
                            />
                        <polyline class="tick path" style="fill:none;stroke:green;stroke-width:3;stroke-linejoin:round;stroke-miterlimit:10;" points="
                            11.6,20 15.9,24.2 26.4,13.8 "/>
                        </svg>
                              <h1>Files uploaded successfully</h1>
                              <a class="btn btn-info" href="/" >Go Back</a>
                            </div>
                            <div>
                        
                            </div>
                          </div>
                          <script>
                            $(document).ready(
                              function() {
                                $(".trigger").toggleClass("drawn")
                              }
                        
                            )
                          </script>
                        </body>
                        <html>
                        
                    `)
                }   
                else{
                    responseMessage = 'Please upload entity';
                    res.end(`<!DOCTYPE html>
                    <html xmlns="http://www.w3.org/1999/xhtml">
                    
                    <head>
                      <meta charset="utf-8" />
                      <title>Json conversion</title>
                    
                      <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
                      <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
                      <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
                      <style>
                        body {
                          margin: 0 auto;
                          width: 100%;
                          margin: 0 auto;
                        }
                    
                        .circ {
                          opacity: 0;
                          stroke-dasharray: 130;
                          stroke-dashoffset: 130;
                          -webkit-transition: all 1s;
                          -moz-transition: all 1s;
                          -ms-transition: all 1s;
                          -o-transition: all 1s;
                          transition: all 1s;
                        }
                    
                        .tick {
                          stroke-dasharray: 50;
                          stroke-dashoffset: 50;
                          -webkit-transition: stroke-dashoffset 1s 0.5s ease-out;
                          -moz-transition: stroke-dashoffset 1s 0.5s ease-out;
                          -ms-transition: stroke-dashoffset 1s 0.5s ease-out;
                          -o-transition: stroke-dashoffset 1s 0.5s ease-out;
                          transition: stroke-dashoffset 1s 0.5s ease-out;
                        }
                    
                        .drawn+svg .path {
                          opacity: 1;
                          stroke-dashoffset: 0;
                        }
                    
                        .wrapper {
                          height: 100vh;
                          background: url('converterBackground.png');
                          background-size: 100% 100%;
                          background-repeat: no-repeat;
                        }
                    
                        svg {
                          width: 250px;
                          height: 250px;
                        }
                    
                        .message {
                          width: 50%;
                          margin: 0 auto;
                          text-align: center;
                          padding-top: 100px;
                        }
                      </style>
                    </head>
                    
                    <body>
                      <div class="wrapper">
                        <div class="message">
                          <div class="trigger"></div>
                          <svg version="1.1" id="tick" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 37 37" style="enable-background:new 0 0 37 37;" xml:space="preserve">
                    <path class="circ path" style="fill:none;stroke:red;stroke-width:3;stroke-linejoin:round;stroke-miterlimit:10;" d="
                        M30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z"
                        />
                             <polyline class="tick path" style="fill:none;stroke:red;stroke-width:3;stroke-linejoin:round;stroke-miterlimit:10;" points="
                        12 25,25 12,12 "/>
                        <polyline class="tick path" style="fill:none;stroke:red;stroke-width:3;stroke-linejoin:round;stroke-miterlimit:10;" points="
                        12,12 25,25 "/>
                    </svg>
                          <h1>Please upload all the entities <b style="color:red">${checkentity['entityFilesMissing']}</b></h1>
                          <a class="btn btn-info" href="/"> Back </a>
                        </div>
                        <div>
                    
                        </div>
                      </div>
                      <script>
                        $(document).ready(
                          function() {
                            $(".trigger").toggleClass("drawn")
                          }
                    
                        )
                      </script>
                    </body>
                    <html>`)
               
        }
    }
            });
        }
        // res.sendFile(__dirname + "/uploadedfile.html")
        
        

    });


});

function utterences(usermsg, allutt, res) {
    try {
        // throw Error("Something went wrong")
        for (i in usermsg) {
            var utterence = usermsg[i].data
            var utt = ""
            for (j in utterence) {
                utt = utt + utterence[j].text
            }
            allutt.push(utt.trim())
        }
    }
    catch (e) {
        transports.file.level = 'info';
        logger.info(e.stack);
        if (e instanceof SyntaxError) {
            console.log("here is an sytex error")
        } else {
            console.log("here is an exception")
        }
        res.sendFile(__dirname + "/error.html")

    }

}

function checkEntity(responseData) {
    let parameter = responseData.parameters
    var entityNames = []
    var responseEntity =[]
    responseEntity['code'] = 200
   
    if(parameter && parameter.length>0){
        for(entity in parameter){
           
            var path = "./DialogflowJsonFiles/" + "entity_" + parameter[entity].name + ".json"
            if (fs.existsSync(path)) {
                entityNames.push(parameter[entity].name)
                responseEntity['code'] = 200
                responseEntity['entityFilesMissing']= "All entity files available"
            }
            else{
                entityNames.push(parameter[entity].name)
                responseEntity['entityFilesMissing']= entityNames
                responseEntity['details']= "Entity not available"
                responseEntity['code'] = 201
            }
        }
     
       
    }else{
    responseEntity['details'] = "Entity not required"
    responseEntity['code'] = 202
    }

    return responseEntity
}

function responseResult(responseData, res) {
    var responseSpeech = "No response"
    try {
        // throw Error("Something went wrong")
        for (i in responseData) {
            let msg = responseData[i].messages
            let parameter = responseData[i].parameters
            var entityNames = []
            for (j in msg) {
                var messageResponse = msg
            }
        }
        for(k in messageResponse){
            console.log("check this"+ messageResponse[k])
        if (messageResponse[k].speech && messageResponse[k].speech.length > 0) {
            responseSpeech = messageResponse[k].speech
        }
    
    }
  
        return responseSpeech

    } catch (e) {
        transports.file.level = 'info';
        logger.info(e.stack);
        if (e instanceof SyntaxError) {
            console.log("here is an sytex error3")
        } else {
            console.log("here is an exception3")
            console.log(e)
        }
        res.sendFile(__dirname + "/error.html")

    }

}
function dataResult(dataSet, responseSpeech, res) {
    try {
        // throw Error("Something went wrong")
        return {
            "metadata": {
                "schemaVersion": "1.0",
                "importType": "LEX",
                "importFormat": "JSON"
            },
            "resource": {
                "name": dataSet['intentname'],
                "version": "1",
                "fulfillmentActivity": {
                    "type": "ReturnIntent"
                },
                "sampleUtterances":
                    dataSet['utterence'],
                    "slots": dataSet['slots'],
                "conclusionStatement": {
                    "messages": [
                        {
                            "contentType": "PlainText",
                            "content": responseSpeech
                        }
                    ]
                },
                 "slotTypes":dataSet['slottype']
            
            }
        }

    }
    catch (e) {
        transports.file.level = 'info';
        logger.info(e.stack);
        if (e instanceof SyntaxError) {
            console.log("here is an sytex error4")
        } else {
            
            console.log("here is an exception4")
            console.log(e)
        }
        res.sendFile(__dirname + "/error.html")

    }

}

app.listen(2000, function (a) {
    console.log("Listening to port 2000");
});
