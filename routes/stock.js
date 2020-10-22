var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './routes/token.json';
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */

var rows; var rowID;
function listMajors(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: '1lv8H2Nsij3yTbePxkd54Q1y9ubPAd_NmYW1H1c0p1N4',
    range: ['Form responses 1!A:Z']
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    rows = [];
    for (i = 0; i < res.data.values.length; i++) {
      if (res.data.values[i][7] == checkID) {
        rows = [(res.data.values[i])];
        rowID=i;
      }
    };
  });
}

var projects;
function listProjects(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: '1T0eu5_KgGlb8OmVQz7-8SrhNuELEzV-hTQh0yCPsl1Y',
    range: ['projectSummary!A:G']
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    projects = [];
    for (i = 0; i < res.data.values.length; i++) {
      projects.push(res.data.values[i][1]);
    };
  });
}


// Load client secrets from a local file.
var checkID;
router.post('/stock', function (req, res, next) {
  checkID = (req.body).barcode;
  res.redirect('/stock');
});


router.get('/stock', function (req, res, next) {
  fs.readFile('./routes/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), listMajors);
    authorize(JSON.parse(content), listProjects);
  });
  setTimeout(function () {
    res.render('stock', { page: 'Home', menuId: 'home', rows: rows, projects: projects })
      ;
  }, 2000);

});


var requestProject;
var requestQuantity;
var requestDate;

//////////////////////////////////////////////////////////////////////////////////////////////
function stockOut(auth) {
  //update delivery form
  const sheets = google.sheets({ version: 'v4', auth });
  var values = [[rows[0][7], rows[0][8], requestProject, requestQuantity, requestDeliveryman, requestDate]];
  var resource = {
    values,
  };
  sheets.spreadsheets.values.append({
    spreadsheetId: '1lv8H2Nsij3yTbePxkd54Q1y9ubPAd_NmYW1H1c0p1N4',
    range: 'stockout!A:Z',
    valueInputOption: 'RAW',
    resource,
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
  });

  //update storage quantity
   values = [[parseInt(rows[0][9])-requestQuantity]];
   resource = {
    values,
  };
  sheets.spreadsheets.values.update({
    spreadsheetId: '1lv8H2Nsij3yTbePxkd54Q1y9ubPAd_NmYW1H1c0p1N4',
    range: 'Form responses 1!J'.concat(rowID+1),
    valueInputOption: 'RAW',
    resource,
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
  });
}


router.post('/stock-out', function (req, res, next) {

  requestProject = (req.body).project;
  requestQuantity = (req.body).quantity;
  requestDeliveryman = (req.body).deliveryman;
  requestDate = new Date();;


  fs.readFile('./routes/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
     authorize(JSON.parse(content), stockOut);
    res.redirect('/');
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
function stockIn(auth) {
  //update delivery form
  const sheets = google.sheets({ version: 'v4', auth });
  var values = [[rows[0][7], rows[0][8], requestProject, requestQuantity, requestDeliveryman, requestDate]];
  var resource = {
    values,
  };
  sheets.spreadsheets.values.append({
    spreadsheetId: '1lv8H2Nsij3yTbePxkd54Q1y9ubPAd_NmYW1H1c0p1N4',
    range: 'stockin!A:Z',
    valueInputOption: 'RAW',
    resource,
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
  });

  //update storage quantity
   values = [[parseInt(rows[0][9])+parseInt(requestQuantity)]];
   resource = {
    values,
  };
  sheets.spreadsheets.values.update({
    spreadsheetId: '1lv8H2Nsij3yTbePxkd54Q1y9ubPAd_NmYW1H1c0p1N4',
    range: 'Form responses 1!J'.concat(rowID+1),
    valueInputOption: 'RAW',
    resource,
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
  });
}


router.post('/stock-in', function (req, res, next) {

  requestProject = (req.body).project;
  requestQuantity = (req.body).quantity;
  requestDeliveryman = (req.body).deliveryman;
  requestDate = new Date();;


  fs.readFile('./routes/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
     authorize(JSON.parse(content), stockIn);
    res.redirect('/');
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////

module.exports = router;


