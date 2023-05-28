const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = 3000; // Replace with your desired port number

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var authToken = ''; // Variable to store the token

async function performLogin(username, password, eauth) {
  const url = 'http://192.168.100.31:8008/login';
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  const data = new URLSearchParams();
  data.append('username', username);
  data.append('password', password);
  data.append('eauth', eauth);

  try {
    const response = await axios.post(url, data.toString(), { headers });
    console.log(response.data);
    authToken = response.data.return[0].token;
    console.log(`authToken is: ${authToken}`);
    return authToken;
  } catch (error) {
    console.error(error);
    throw new Error('Login failed');
  }
}

// Middleware to check if authToken is available
const checkAuthToken = (req, res, next) => {
  if (!authToken) {
    performLogin('bojin', 'test1', 'sharedsecret')
      .then(() => {
        next();
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Login failed');
      });
  } else {
    next();
  }
};

app.post('/login', async (req, res) => {
  const { username, password, eauth } = req.body;

  try {
    await performLogin(username, password, eauth);
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).send('Login failed');
  }
});

app.post('/run', checkAuthToken, async (req, res) => {
  const { fun, client, username, password, eauth, timeout, gather_job_timeout } = req.body;

  const url = 'http://192.168.100.31:8008/run';
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Auth-Token': authToken
  };
  const data_run = new URLSearchParams();
  data_run.append('fun', fun);
  data_run.append('client', client);
  data_run.append('username', username);
  data_run.append('password', password);
  data_run.append('eauth', eauth);
  data_run.append('timeout', timeout);
  data_run.append('gather_job_timeout', gather_job_timeout);

  try {
    const response = await axios.post(url, data_run.toString(), { headers });
    console.log(response.data);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
