const express = require('express');
const path = require('path');
const generatePassword = require('password-generator');
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const User = require("./model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");

const app = express();

require("dotenv").config();

// user did something wrong 400
// server did something wrong 500

if (process.env.ENV_CHECKER == "true")
{
	console.log("The env file is hooked up");
}


// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));
mongoose.connect(process.env.MONGO_CONNECTION_STRING, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});
app.use(bodyParser.json());
app.use(session({
	secret: "foo",
	store: MongoStore.create({
		mongoUrl: process.env.MONGO_CONNECTION_STRING,

		// time in seconds that session will expire 
		ttl: 30 * 60
	}),
	resave: true,
	saveUninitialized: true
}));
sgMail.setApiKey(process.env.REGISTER_AUTH_KEY);


// generates a random verificationCode
function makeVerifCode()
{
	let result = "";
	let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let charactersLength = characters.length;
	for ( let i = 0; i < 4; i++ )
	{
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}


// 
// endpoint prison
// ------------------------------------------------------------------------------------------------------------------------------------

// login
app.post("/api/login", async(req, res) =>
{
	const { email, password } = req.body;
	const user = await User.findOne({ email }).lean();

	if (!user)
	{
    res.status(400);
		return res.json({ error: "Invalid email/password" });
	}

	if (await bcrypt.compare(password, user.password).catch(
    err => {
    res.status(400);
		return res.json({ error: "Failed to hash password" });
    }
  ))
	{
		// email password is successful
		const token = jwt.sign({
			id: user._id,
			email: user.email
		}, process.env.JWT_SECRET);
    res.status(200);
		return res.json({ data: token });
	}
  // password is incorrect
  else
  {
    res.status(400);
    return res.json({ error: "Invalid email/password" });
  }

  res.status(400);
	res.json({ error: "Unknown error" });
});

// register
app.post("/api/register", async(req, res) =>
{
	const { email, password: plainTextPassword } = req.body;

	// if the email is empty or it is not a string
	if (!email || typeof email !== "string")
	{
    res.status(400);
		return res.json({ error: "Invalid Email" });
	}

	if (email.match(/\S+@\S+\.\S+/) == null)
	{
    res.status(400);
		return res.json({ error: "Invalid Email, must be in email format" });
	}

	// if the password is empty or it is not a string
	if (!plainTextPassword || typeof plainTextPassword !== "string")
	{
    res.status(400);
		return res.json({ error: "Invalid Password" });
	}

	// if the password is not the correct length
	if (plainTextPassword.length <= 5)
	{
    res.status(400);
		return res.json({
			error: "Password  too small. Should be at least 6 characters"
		});
	}

	const password = await bcrypt.hash(plainTextPassword, 10);
	const verifCode = makeVerifCode();

	try
	{
		const user = await User.create({
			email,
			password,
			verified: false,
			verifCode
		});
		console.log("user created successfully" + user);
    
    // this is for email sending stuff
		const msg =
    {
    	to: "daniel.cosentinofl@gmail.com",
    	from: "Top.of.the.schedule.inc.inc@gmail.com",
    	subject: "Your Top o' the Schedule Registration Key",
    	text: "Here is your Verification Code: " + verifCode
    };

    const token = jwt.sign({
			id: user._id,
			email: user.email
		}, process.env.JWT_SECRET);
    
    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(error);
  
      if (error.response) {
        console.error(error.response.body)
      }
      // delete the user
      await User.deleteOne({ _id: user._id });
      res.status(500);
      return res.json({ error: "Failed to create user" });
    }
    res.json({ status: "ok", data: token });

	}
	catch (error)
	{
		if (error.code === 11000)
		{
			// duplicate key
      res.status(400);
			return res.json({ error: "Email already in use" });
		}
		throw error;
	}
	res.status(200);
});


// Put all API endpoints under '/api'
app.get('/api/passwords', (req, res) => {
  const count = 5;

  // Generate some passwords
  const passwords = Array.from(Array(count).keys()).map(i =>
    generatePassword(12, false)
  )

  passwords.push("Pa55w0rd123!")

  // Return them as json
  res.json(passwords);

  console.log(`Sent ${count} passwords`);
});


// ------------------------------------------------------------------------------------------------------------------------------------

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Password generator listening on ${port}`);

