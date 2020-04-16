var dotenv = require('dotenv').config();
var fs = require('fs');
var jsforce = require('jsforce');
// let mkdirp = require('mkdirp');

const LOGIN_URL = process.env.LOGINURL;
const SFDC_USERNAME = process.env.SFDC_USERNAME;
const SFDC_PASSWORD = process.env.SFDC_PASSWORD;
const SFDC_API_VER = process.env.SFDC_API_VER;
const SFDC_QUERY = process.env.QUERY;
const LOGS_DIR = process.env.DIRECTORY;

console.log('SFDC_USERNAME: '+SFDC_USERNAME);
console.log('LOGIN_URL: '+LOGIN_URL);
console.log('SFDC_QUERY: '+SFDC_QUERY);
console.log('LOGS_DIR: '+LOGS_DIR);
console.log('SFDC_API_VER: '+SFDC_API_VER);

var conn = new jsforce.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
  loginUrl : LOGIN_URL
});

conn.login(SFDC_USERNAME, SFDC_PASSWORD, function(err, userInfo) {
    if (err) { return console.error(err); }
    // Now you can get the access token and instance URL information.
    // Save them to establish connection next time.
    // console.log(conn.accessToken);
    console.log('SFDC Instance URL: ', conn.instanceUrl);
    // logged in user property
    console.log("Org ID: " + userInfo.organizationId);
    console.log("User ID: " + userInfo.id);
    
    getRecords(conn);
});

/**
 * This method will query the ApexLogs records.
 * @param {Object} conn 
 */
let getRecords = (conn) => {
    
    conn.query(SFDC_QUERY, function(err, result) {
        if (err) { return console.error(err); }
        console.log("total : " + result.totalSize);
        console.log("fetched : " + result.records.length);
        for(let rec of result.records) {
            // console.log(rec);
            getLog(conn, rec);
        }
    });
    
}

/**
 * This method will get the ApexLog Log raw data
 * @param {Object} conn 
 * @param {Object} logRec 
 */
let getLog = (conn, logRec) => {
    let url = "/services/data/v" + SFDC_API_VER + "/tooling/sobjects/ApexLog/" + logRec.Id + "/Body/";
    console.log(url);

    conn.request({
        method: 'GET',
        url: url,
        headers: {
            'content-type': 'application/json',
        },
    }).then(resp => {
        //console.log(response);
        writeToFile(logRec, resp, 'log'); // writing log data to the file
        writeToFile(logRec, logRec, ''); // writing ApexLog details to the JSON file
    });
}

/**
 * to get the Current date
 */
let getTodayDate = () => {
    const today = new Date();
    return ((today.getMonth()+1)+'-'+today.getDate()+'-'+today.getFullYear());
}

let dir = LOGS_DIR+SFDC_USERNAME+'-logs/'+getTodayDate()+'/';
console.log('Logs path: ', dir);

/**
 * This method will write log data to the file
 * @param {object} logRec 
 * @param {rawData} data 
 * @param {String} type 
 */
const writeToFile = (logRec, data, type) => {
    let dateStamp = logRec.StartTime;
    // To replace : character with . in the date stamp
    while(dateStamp.includes(':')) {
        dateStamp = dateStamp.replace(':','.');
    }

    let filePath = './'+dir+'/'+logRec.Id+dateStamp;
    
    // Appending extension .log/.json to the file name
    if(type === 'log') {
        filePath += '.log';
    } else {
        filePath += '.json';
        data = JSON.stringify(data, null, 2);
    }
    
    // Writing data to the file
    fs.writeFile(filePath, data, function (err) {
        if (err) return console.log(err);
        console.log('File Name: '+filePath);
    });
}

/**
 * This method will create the path
 * @param {String} dirPath 
 */
const createDir = (dirPath) => {
    fs.mkdirSync(process.cwd()+dirPath, {recursive : true}, (err) => {
        if(err) {
            console.log('Error creating '+dirPath+' : '+err);
        } else {
            console.log(dirPath+' path created successfully.');
        }
    });
}

if(!fs.existsSync(dir)) {
    createDir(dir);
}