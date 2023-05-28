const xmlrpc = require('xmlrpc');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
app.set('view engine', 'ejs');
// Serve the static HTML file
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Set the authentication details
/* const username = 'bjin01';
const password = 'suselinux'; */

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
    pwd
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
  client.methodCall(logout, logoutParams, (error, value) => {
    if (error) {
      console.error('XML-RPC logout call failed:', error);
      
    } else {
      console.log("Logout successful. ", JSON.stringify(value))
    }
  });
}

function logoutMiddleware(req, res, next) {
  const sessionKey = req.sessionKey; // Get the sessionKey from the request object
  //console.log("logout sekey: ", req.sessionKey)
  logout(sessionKey);
  next(); // Proceed to the next middleware or route handler
}

app.get('/getsystems', (req, res) => {
 
  login()
    .then(sessionKey => {
      console.log('Login successful. Session key:', sessionKey);
      req.sessionKey = sessionKey;
      // Use the session key in other functions
      getsystems(sessionKey)
        .then(value => {
          //console.log(`listsystems result is: ${JSON.stringify(value)}`);
          res.render('responses', { data: value, title: 'List of all systems' }); // Pass the value to the HTML template
        })
        .catch(error => {
          console.error('Get listsystems failed:', error);
          res.status(500).send('Failed to get listsystems');
        })
        .finally(() => {
          logout(sessionKey); // Call logout() after getsystems() completes
        });
    })
    .catch(error => {
      console.error('Login failed:', error);
      res.status(500).send('Login failed');
    });
});

app.get('/getchannels', (req, res) => {
 
  login()
    .then(sessionKey => {
      console.log('Login successful. Session key:', sessionKey);
      req.sessionKey = sessionKey;
      // Use the session key in other functions
      getchannels(sessionKey)
        .then(value => {
          //console.log(`getchannels result is: ${JSON.stringify(value)}`);
          res.render('responses', { data: value, title: 'List of all channels' }); // Pass the value to the HTML template
        })
        .catch(error => {
          console.error('Get getchannels failed:', error);
          res.status(500).send('Failed to get getchannels');
        })
        .finally(() => {
          logout(sessionKey); // Call logout() after getsystems() completes
        });
    })
    .catch(error => {
      console.error('Login failed:', error);
      res.status(500).send('Login failed');
    });
});

// Handle the login endpoint
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle the login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`username: ${username}, password: ${password}`)
  login(username, password)
  .then(sessionKey => {
    console.log('Login successful. Session key:', sessionKey);
    req.sessionKey = sessionKey;
  })
  .catch(error => {
    console.error('Login failed:', error);
    res.status(500).send('Login failed');
  })
  .finally(() => {
    logout(sessionKey); // Call logout() after getsystems() completes
  });
  
  // Redirect the user to another page
  res.redirect('/');
});

app.get('/', (req, res) => {
  res.render('main', {title: 'SUMA Info', 
    features:
    [{label: 'Get Systems', href: '/getsystems'},
     {label: 'Get Channels', href: '/getchannels'},
     {label: 'Login SUMA', href: '/login'}
    ]
    });
});

app.use(express.static(__dirname));

const port = 3000; // Replace with the desired port number
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
