// SERVER.JS file 
// Place app requiremtns/dependencies here
// DB connection and SQL
// Wire up to routes here

const express = require('express');
const path = require('path');
const app = express();
const mysql = require("mysql");
const pool = dbConnection();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

const bcrypt = require('bcrypt');
const saltRounds = 10;

app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
const session = require('express-session');

// ===================================================================
// MIDDLEWARE
// ===================================================================

// Use express-session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// ===================================================================
// ROUTES 
// ===================================================================

// ---------------------------------------------
// GET ROUTES
// ---------------------------------------------

// ------- ROUTE --------------------
app.get('/', (req, res) => {
    res.render('home', {
      title: 'Paws Connect',
    });
  });

// ------- Login --------------------
app.get('/login', async(req, res) => {
    res.render('login', {
        title: 'Paws Connect'
    });
  });

// ------- Create User --------------------
app.get('/createUser', async(req, res) => {
    res.render('createUser', {
        title: 'Paws Connect'
    });
  });

// ---------- profile user route.---------
// ---------- profile user route.---------

app.get('/profiles', async (req, res) => {
  if (!req.session.user) {
      return res.send('You are not logged in');
  }

  const user = req.session.user;

  // SQL query to fetch user information
  let sql = "SELECT * FROM users_table WHERE id = ?";
  let userData = await executeSQL(sql, [user.id]);

  // SQL query to fetch posts for the user
  sql = "SELECT * FROM posts_table WHERE pet_owner_username = ?";
  let postsData = await executeSQL(sql, [user.user_name]);
  let postCount = postsData.length;

  sql = "SELECT * FROM pets_table WHERE owner_id = ?"; // select everything from table
  let petData = await executeSQL(sql, [user.id]);

  res.render('profiles', {
      title: 'Paws Connect',
      user: user,
      userData: userData[0], // Pass the user data from table to the template
      postsData: postsData, // Pass the user's posts from table to the template
      postCount: postCount, // Pass the post count to the from table to template
      petData: petData,
  });
});






// ------- Update User --------------------
// GET route for rendering updateUser page
app.get('/updateUser', async (req, res) => {
    // Check if user is logged in (user information exists in session)
    if (!req.session.user) {
        return res.send('You are not logged in');
    }

    // Access the user information stored in the session
    const user = req.session.user;

    // Render the updateUser page with the current user's information
    res.render('updateUser', {
        title: 'Paws Connect',
        user: user // Pass the user information to the template
    });
});

//-------Create Pets--------------
app.get('/createPet', async (req, res) =>{
    // Check if user is logged in (user information exists in session)
    if (!req.session.user){
      return res.send('You are not logged in');
    }

    // Render the createPet page with the current user's inforamtion
    res.render('createPet', {
        title: 'PawsConnect'});
});

//-------Create Posts--------------
app.get('/createPost', async (req, res) =>{
  // Check if user is logged in (user information exists in session)
  if (!req.session.user){
    return res.send('You are not logged in');
  }

  // Render the createPost page with the current user's inforamtion
  res.render('createPost', {
      title: 'PawsConnect'});
});

// ---------------------------------------------
// POST ROUTES
// ---------------------------------------------

// ----------POST login route.----------------
// POST route for handling login
app.post('/login', async(req, res) => {
    const user_name = req.body.username;
    const password = req.body.password;

    // Check if the entered username exists in the database
    let sql = "SELECT * FROM users_table WHERE user_name = ?";
    let user = await executeSQL(sql, [user_name]);

    if (user.length === 0) {
        return res.send('Invalid username');
    }

    // Now, you have the user record, you can compare the password
    const storedPassword = user[0].password;

    // Compare storedPassword with the provided password
    const passwordMatch = await bcrypt.compare(password, storedPassword);

    if (!passwordMatch) {
        return res.send('Invalid password');
    }

    // Store the user's information in the session
    req.session.user = user[0];

    // Authentication successful, redirect to dashboard or another page
    res.redirect('/updateUser');
});


// ----------POST create user route.----------
app.post('/createUser', async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    const displayName = req.body.display_name;
    const profilePicture = req.body.profile_picture;
    const preferredLang = req.body.preferred_lang;
    //const confirmPassword = req.body.confirm_password;
  
    // Check if passwords match
    // if (password !== confirmPassword) {
    //   return res.send('Passwords do not match');
    // }
  
    // Check for existing email 
    let userCheckSql = "SELECT * FROM users_table WHERE email = ?";
    let existingUser = await executeSQL(userCheckSql, [email]);
  
    if (existingUser.length > 0) {
      return res.send("Email already exists.");
    }
  
    // SQL query to insert the user into the database
    var sql = "INSERT INTO users_table (email, password, user_name, display_name, profile_img, language) VALUES (?, ?, ?, ?, ?, ?)";
    var values = [email, password, username, displayName, profilePicture, preferredLang];
  
    // Execute the query
    try {
      // Hash and salt the password
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // SQL query to insert the user into the database with hashed password
      var sql = "INSERT INTO users_table (email, password, user_name) VALUES (?, ?, ?)";
      var values = [email, hashedPassword, username];

      // Execute the query
      await executeSQL(sql, values);
      res.send('User created successfully!');
  } catch (error) {
      return res.send('Error creating user: ' + error.message);
  }
  
  });

// ----------POST update user route.----------
app.post('/updateUser', async (req, res) => {
    // Check if user is logged in (user information exists in session)
    if (!req.session.user) {
        return res.send('You are not logged in');
    }

    // Get the new information from the form submission
    const newEmail = req.body.newEmail;
    const newPassword = req.body.newPassword;

    // Update the user's information in the database
    let sql = "UPDATE users_table SET email = ?, password = ? WHERE id = ?";
    try {
        await executeSQL(sql, [newEmail, newPassword, req.session.user.id]);
        // Update the user information in the session as well
        req.session.user.email = newEmail;
        // You might not want to store the new password in the session for security reasons

        res.send('User information updated successfully');
    } catch (error) {
        return res.send('Error updating user information: ' + error.message);
    }
});

//-------------POST Create Pet Profile Route----------------------
app.post('/createPet', async (req, res) => {
// Check if user is logged in (user information exists in session)
if (!req.session.user){
  return res.send('You are not logged in');
}

// Get the new information from the form submission
const petID = req.body.pet_id;    // TODO: Remove this input feild we should auot increment unique pet id's for each pet and the users should never see these
const petName = req.body.pet_name;
const petType = req.body.pet_type;
const petBreed = req.body.pet_breed;
const petProfile = req.body.pet_profile;
const petBio = req.body.pet_bio;

//Check for existing petID
let petCheckSQL = "SELECT * FROM pets_table WHERE pet_id = ?";
let existingPet = await executeSQL(petCheckSQL, [petID]);

if (existingPet.length > 0) {
  return res.send("Pet ID is already taken!");
}

// Insert the information into database table
let sql = `INSERT INTO pets_table (pet_id, pet_name, pet_type, pet_breed, profile_image, pet_bio, owner_id)
           VALUES (?,?,?,?,?,?,?)`;
let values = [petID, petName, petType, petBreed, petProfile, petBio, req.session.user.id];

//Execute the query
try{
  await executeSQL(sql, values);
  res.send('Pet created successfully!');
} catch (error) {
  return res.send ('Error in creating pet: ' + error.message);
}

});
//-------------POST Pet Owner Create Post Route----------------------
app.post('/createPost', async (req, res) => {
  // Check if user is logged in 
  if (!req.session.user){
    return res.send('Not logged in');
  }
  
  const postImage = req.body.posting_image;
  const postText = req.body.post_text;
  const stringTagPet = req.body.post_tag;
  const pet = req.body.pet_petId;
  const timestamp = new Date().valueOf();
  // console.log(timestamp);
  // Insert the information
  let sql = `INSERT INTO posts_table (pet_owner_id,pet_owner_username, posting_image, post_text, stringTagPet,pet_id, post_timeStamp)
             VALUES (?,?,?,?,?,?,?)`;
  let values = [req.session.user.id, req.session.user.user_name, postImage, postText, stringTagPet, pet, timestamp];
  
  //Execute the query
  
  try{
    await executeSQL(sql, values);
    res.send('post created successfully!');
  } catch (error) {
    return res.send ('Error in creating post: ' + error.message);
  }
  
  });

// //-------------GET Pet Owner Create Post Route----------------------
// app.get('/createPost', async (req, res) => {
//     // Check if user is logged in 
//   if (!req.session.user){
//     return res.send('Not logged in');
//   }
//   const owner_id = req.session.user.id;
//   let sql = "SELECT owner_id,pet_name FROM pets_table WHERE owner_id = ?";
//   let params = [owner_id];

//   //Execute the query
//   try{
//     let data = await executeSQL(sql, params);
//     res.render('createPost',{"pets":data[0]})
    
//   } catch (error) {
//     return res.send ('Error in creating data: ' + error.message);
//   }
  
//   // render pet ids 
//   // res.render('createPost',{"pets":data[0]})
// });

// ===================================================================
// DATA BASE SET UP
// ===================================================================
//------------------Execute Sql----------------------------------
function executeSQL(sql, params) {
    return new Promise(function(resolve, reject) {
      pool.query(sql, params, function(err, rows, fields) {
        if (err) throw err;
        resolve(rows);
      });
    });
  }
  
  // ---------------DataBase Connection-------------------------
  function dbConnection(){
    const pool = mysql.createPool({
      connectionLimit: 10,
      host: "hngomrlb3vfq3jcr.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
      user: "r8y141rt6xns3ejq",
      password: "zwv1v6y4c0dffay3",
      database: "bxr2et3njo3yvg0y"
    });
  
    // Check for connection errors
    pool.getConnection((err, connection) => {
      if (err) {
        console.error(".......Error connecting to the database:", err);
        return;
      }
      console.log("......Connected to the database!");
      connection.release(); // Release the connection
    });
    return pool;
  }

// ===================================================================
//  APP RUN
// ===================================================================

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Paws server started on port: ${server.address().port}`);
});