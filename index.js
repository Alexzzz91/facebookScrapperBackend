const express = require('express');
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const bodyParser = require('body-parser')

let sheet;

var app = express();

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.get('/', function (req, res) {
  console.log('req.query', req.query);
  res.send('Hello World!');
});

app.get('/goauthcallback', function (req, res) {
  if(!!req.query.code){
    res.send('code      |     ' + req.query.code);
  }
  res.send('Error not has code');
});

app.post('/resendToSpreadSheets', function (req, res) {
  const data = req.body.data;
  const spreadsheetId = req.body.spreadsheetsUrl.match(/\/d\/([\w-]+)\//)[1];
  // If modifying these scopes, delete token.json.
  const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
  ];
  const TOKEN_PATH = 'token.json';

  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), reading);
  });

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.web;
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
          if (err) console.error(err);
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
  function reading(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    var request = {
      spreadsheetId,
      ranges: [],  // TODO: Update placeholder value.
      includeGridData: false,  // TODO: Update placeholder value.
    };
    sheets.spreadsheets.get(request, function(err, response) {
      let sheetOld = '';
      if (err) {
        console.error(err);
        return;
      }
      sheet = response.data.sheets[0].properties.title;
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "A1:Z1000",
      }, (err, res) => {
        if (err) console.log('sheets.spreadsheets.get The API returned an error: ' + err);
        const rows = res.data.values;
        if(!!rows && !!rows.length){
          range = rows.length;
        }else{
          range = 1;
        }
        writing(auth, range, sheet)
      });
    });
  }

  function writing(auth, range, sheet) {
    const resource = { values: data };
    const sheets = google.sheets({version: 'v4', auth});
    range = range+1
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "A"+range,
      valueInputOption: "RAW",
      resource,
    }, (err, result) => {
      if (err) {
        // Handle error
        console.log('sheets.spreadsheets.values.update The API returned an error: ' + err);
      } else {
        //console.log('result', result);
      }
    });
  }

  res.send('Got a POST request');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});