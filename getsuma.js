const xmlrpc = require('xmlrpc');
const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
app.set('view engine', 'ejs');
// Serve the static HTML file
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
const saltModuleRouter = require('./salt');

// Configure the session middleware
app.use(
  session({
    secret: 'your-secret-key', // Replace with your own secret key
    resave: false,
    saveUninitialized: true
  })
);


// Create an XML-RPC client with authentication options
const client = xmlrpc.createClient({
  host: 'suma1.bo2go.home',
  port: 80, // Replace with the appropriate port number
  path: '/rpc/api', // Replace with the actual XML-RPC endpoint path
});

// Make the first XML-RPC call to obtain the session key
function login(user, pwd) {
  // Set the method and parameters for the first XML-RPC call
  const loginMethod = 'auth.login'; // Replace with the method name for login
  const loginParams = [
    user,
    pwd,
    60
  ];
  return new Promise((resolve, reject) => {
    client.methodCall(loginMethod, loginParams, (error, sessionKey) => {
      if (error) {
        console.error('XML-RPC login call failed:', error);
        reject(error);
      } else {
        resolve(sessionKey);
      }
    });
  });
}

function getsystems(sessionKey) {

  // Set the method and parameters for the second XML-RPC call
  const listsystems = 'system.listSystems'; // Replace with the method name you want to call
  const listsystemsParams = [
    sessionKey
  ];

  // Make the second XML-RPC call using the session key
  return new Promise((resolve, reject) => {
    client.methodCall(listsystems, listsystemsParams, (error, value) => {
      if (error) {
        console.error('XML-RPC listsystems call failed:', error);
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

function getchannels(sessionKey) {
  const listchannels = 'channel.listAllChannels'; // Replace with the method name you want to call
  const listchannelsParams = [
    sessionKey
  ];

  // Make the second XML-RPC call using the session key
  return new Promise((resolve, reject) => {
    client.methodCall(listchannels, listchannelsParams, (error, value) => {
      if (error) {
        console.error('XML-RPC listchannels call failed:', error);
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

function logout(sessionKey) {
  const logout = 'auth.logout'; 
  const logoutParams = [
    sessionKey
  ];
  return new Promise((resolve, reject) => {
    client.methodCall(logout, logoutParams, (error, value) => {
      if (error) {
        console.error('XML-RPC logout call failed:', error);
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

// Middleware to check if the user is authenticated
function requireLogin(req, res, next) {
  if (req.session.sessionKey) {
    next();
  } else {
    //res.render('error', { title: 'Error', message: 'You need to log in first' });
    res.redirect('/');
  }
}

// Use the routes from salt.js
app.use('/salt', requireLogin, saltModuleRouter);

function logoutMiddleware(req, res, next) {
  const sessionKey = req.sessionKey; // Get the sessionKey from the request object
  //console.log("logout sekey: ", req.sessionKey)
  logout(sessionKey);
  next(); // Proceed to the next middleware or route handler
}

app.get('/getsystems', requireLogin, (req, res) => {
  
  const sessionKey = req.session.sessionKey;
  getsystems(sessionKey)
    .then(value => {
      //console.log(`listsystems result is: ${JSON.stringify(value)}`);
      res.render('responses', { data: value, title: 'List of all systems' }); // Pass the value to the HTML template
    })
    .catch(error => {
      console.error('Get listsystems failed:', error);
      res.status(500).send('Failed to get listsystems');
    });
    
});

app.get('/getchannels', requireLogin, (req, res) => {
  const sessionKey = req.session.sessionKey;
 
  // Use the session key in other functions
  getchannels(sessionKey)
    .then(value => {
      //console.log(`getchannels result is: ${JSON.stringify(value)}`);
      res.render('responses', { data: value, title: 'List of all channels' }); // Pass the value to the HTML template
    })
    .catch(error => {
      console.error('Get getchannels failed:', error);
      res.status(500).send('Failed to get getchannels');
    });
   
});

// Handle the login endpoint
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/logout', requireLogin, (req, res) => {
  const sessionKey = req.session.sessionKey;
  logout(sessionKey)
  .then(result => {
    console.log('Logout successful. ', result);
    req.session.destroy(); // Destroy the session
    res.render('logout', { data: result, title: 'Logout', message: 'Logout successful' }); // Pass the value to the HTML template
    //res.redirect('/');
  })
  .catch(error => {
    console.error('Logout failed:', error);
    res.status(500).send('Logout failed');
  });
});

// Handle the login endpoint
app.post('/login', (req, res) => {
  console.log(req.body)
  const { username, password } = req.body;
  console.log(`username: ${username}, password: ${password}`)
  login(username, password)
  .then(sessionKey => {
    console.log('Login successful.');
    req.session.sessionKey = sessionKey; // Store the session key in the session
    
    res.redirect('/');
  })
  .catch(error => {
    console.error('Login failed:', error);
    res.status(500).send('Login failed');
    // Wait for 2 seconds before redirecting
    setTimeout(() => {
      if (!res.headersSent) {
        res.statusCode = 302;
        res.setHeader('Location', '/');
        res.end();
      }
    }, 2000);
  });
});

app.get('/mysalt', requireLogin, (req, res) => {
  res.render('mysalt');
});

app.get('/', (req, res) => {
  if (req.session.sessionKey) {
    console.log(`sessionkey is: ${JSON.stringify(req.session)}`);
    res.render('main', {title: 'SUMA Info', 
    features:
    [{label: 'Get Systems', href: '/getsystems'},
     {label: 'Get Channels', href: '/getchannels'},
     {label: 'Get online minions', href: '/mysalt'}
    ],
    session: req.session, // Pass the session object to the template
    req: req.path
    });
  } else {
    console.log(`sessionkey is not here. ${JSON.stringify(req.session)}`);
    res.render('main', {title: 'SUMA Info', 
    features: [],
    session: req.session, // Pass the session object to the template
    req: req.path
    });
  }
  
});

app.use(express.static(__dirname));

const port = 3000; // Replace with the desired port number
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
