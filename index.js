const express = require("express");
const path = require("path");
const generatePassword = require("password-generator");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const User = require("./model/user");
const Class = require("./model/class");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const cors = require("cors");

const app = express();

require("dotenv").config();

// user did something wrong 400
// server did something wrong 500

if (process.env.ENV_CHECKER == "true") {
  console.log("The env file is hooked up");
} else {
  console.log(
    "ERROR ERROR ERROR ERROR\nThe env is NOT hooked up\nERROR ERROR ERROR ERROR"
  );
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));
mongoose.connect(process.env.MONGO_CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
app.use(cors());
app.use(bodyParser.json());
app.use(
  session({
    secret: "foo",
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_CONNECTION_STRING,

      // time in seconds that session will expire
      ttl: 30 * 60,
    }),
    resave: true,
    saveUninitialized: true,
  })
);
sgMail.setApiKey(process.env.REGISTER_AUTH_KEY);

// generates a random verificationCode
function makeVerifCode() {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function classSearchAndDestroy(userId, classId, scheduleNum, user, res) {
  // TODO: count number of semesters in a schedule and store that
  let allSchedules = user.schedules;
  let currSchedule = allSchedules[scheduleNum];
  let numSemesters = currSchedule.length;
  let currSemester;

  console.log(allSchedules);

  // loop through each semester, deleting all instances of classId in the current semester
  // for each semester "i"
  for (i = 0; i < numSemesters; i++)
  {
    // remove all instances of classId in that semester
    currSemester = currSchedule[i];
    let numClasses = currSemester.length;
    for (j = 0; j < numClasses; j++)
    {
      if (currSemester[j] === classId)
      {
        console.log("The current semester includes the class which will be deleted");
        currSemester.splice(j, 1);
      }
    }
    // User.collection.updateMany( { _id: userId }, { $set: { "currSemester": [ classId ] } } )
  }

  console.log(allSchedules);

  User.findByIdAndUpdate(userId, { $set: {schedules: allSchedules } }, (err, docs) => {
    if (err) {
      console.log(err.message);
    } else {
      console.log("no error in updating the schedule");
    }
  });


  // User.findByIdAndUpdate(
  //   { _id: userId },
  //   // Delete all instances of the class in a schedule
  //   { $pullAll: { "schedules.$[scheduleNum]": [classId] } }
  // );

  console.log("at the end of classSearchAndDestroy");
}

function classAdd(userId, classId, scheduleNum, semesterNum, res) {
  db.collection('User').findOneAndUpdate(
    { _id: {$eq: userId }},
    // Add class to a semester oooOOooooooooOooOOoooOoOoOOo
    { $push: { "schedules.$[scheduleNum].$[semesterNum]": classId } },
    (err, result) => {
      if (err) {
        res.send({ 'error': 'An error has occured' });
      } else {
        res.send(result.ops[0]);
      }
    }
  );

  console.log("YAY! ADD WORKY!");
}

// ------------------------------------------------------------------------------------------------------------------------------------
// endpoint prison
// ------------------------------------------------------------------------------------------------------------------------------------

// login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).lean();

  if (!user) {
    res.status(400);
    const token = jwt.sign(
      {
        error: "Invalid email/password",
      },
      process.env.JWT_SECRET
    );
    return res.json({ data: token });
  }

  if (!user.verified) {
    res.status(400);
    const token = jwt.sign(
      {
        error: "User not verified",
      },
      process.env.JWT_SECRET
    );
    return res.json({ data: token });
  }

  if (
    await bcrypt.compare(password, user.password).catch((err) => {
      res.status(400);
      const token = jwt.sign(
        {
          error: "Failed to hash password",
        },
        process.env.JWT_SECRET
      );
      return res.json({ data: token });
    })
  ) {
    // email password is successful
    res.status(200);
    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET
    );
    return res.json({ data: token });
  }
  // password is incorrect
  else {
    res.status(400);
    const token = jwt.sign(
      {
        error: "Invalid email/password",
      },
      process.env.JWT_SECRET
    );
    return res.json({ data: token });
  }

  res.status(500);
  const token = jwt.sign(
    {
      error: "Unknown error",
    },
    process.env.JWT_SECRET
  );
  return res.json({ data: token });
});

// register
app.post("/api/register", async (req, res) => {
  const { email, password: plainTextPassword } = req.body;

  // if the email is empty or it is not a string
  if (
    !email ||
    typeof email !== "string" ||
    email.match(/\S+@\S+\.\S+/) == null
  ) {
    res.status(400);
    const token = jwt.sign(
      {
        error: "Invalid Email, must be in email format",
      },
      process.env.JWT_SECRET
    );
    return res.json({ data: token });
  }

  // if the password is empty or it is not a string
  if (!plainTextPassword || typeof plainTextPassword !== "string") {
    res.status(400);
    const token = jwt.sign(
      {
        error: "Invalid Password",
      },
      process.env.JWT_SECRET
    );
    return res.json({ data: token });
  }

  // if the password is not the correct length
  if (plainTextPassword.length <= 5) {
    res.status(400);
    const token = jwt.sign(
      {
        error: "Password too small",
      },
      process.env.JWT_SECRET
    );
    return res.json({ data: token });
  }

  const password = await bcrypt.hash(plainTextPassword, 10);
  const verifCode = makeVerifCode();

  try {
    const user = await User.create({
      email,
      password,
      verified: false,
      verifCode,
      schedules: [],
      completedClasses: [],
    });
    console.log("user created successfully" + user);

    // this is for email sending stuff
    const msg = {
      // to: email
      to: "Top.of.the.schedule.inc.inc@gmail.com",
      from: "Top.of.the.schedule.inc.inc@gmail.com",
      subject: "Your Top o' the Schedule Registration Key",
      text: "Here is your Verification Code: " + verifCode,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(error);

      if (error.response) {
        console.error(error.response.body);
      }
      // delete the user
      await User.deleteOne({ _userId: user._id });
      res.status(500);
      const token = jwt.sign(
        {
          error: "Failed to create user",
        },
        process.env.JWT_SECRET
      );
      return res.json({ data: token });
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET
    );

    res.status(200);
    res.json({ data: token });
  } catch (error) {
    if (error.code === 11000) {
      // duplicate key
      const token = jwt.sign(
        {
          error: "Email already in use",
        },
        process.env.JWT_SECRET
      );
      res.status(400);
      return res.json({ data: token });
    }
    throw error;
  }
  res.status(200);
});

// Verify User
app.post("/api/verifyUser", async (req, res) => {
  // yoink
  const { userId, verifCode } = req.body;
  const user = await User.findById(userId).lean();

  // If userId doesn't match any user - ree
  if (!user) {
    const token = jwt.sign(
      {
        error: "User does not exist",
      },
      process.env.JWT_SECRET
    );

    res.status(400); // double check
    return res.json({ data: token });
  }

  // if wrong verification code
  if (user.verifCode != verifCode) {
    const token = jwt.sign(
      {
        userId: user._id,
        error: "Invalid Verification Code",
      },
      process.env.JWT_SECRET
    );

    res.status(400); // double check
    return res.json({ data: token });
  }

  // user has already been verified
  if (user.verified) {
    const token = jwt.sign(
      {
        error: "User already verified",
      },
      process.env.JWT_SECRET
    );

    res.status(400); // double check
    return res.json({ data: token });
  }

  // yoinks scoob, the user has not been verified
  if (!user.verified) {
    // all good raggy
    // B) swag
    // TEST THIS
    User.findByIdAndUpdate(userId, { verified: true }, (err, docs) => {
      if (err) {
        const token = jwt.sign(
          {
            error: "User could not be verified",
          },
          process.env.JWT_SECRET
        );
        // 500 since its a server error
        res.status(500); // double check
        return res.json({ data: token });
      } else {
        // it did work woo yay fun time woo party woo
        const token = jwt.sign(
          {
            userId: userId,
          },
          process.env.JWT_SECRET
        );
        // 200 since it succeeded
        res.status(200);
        return res.json({ data: token });
      }
    });
  }
});

// reset password
app.post("/api/resetPassword", async (req, res) => {
  // yoink
  const { userId, password: plainTextPassword } = req.body;
  const user = await User.findOne({ userId }).lean();

  // if the user was not found
  if (!user) {
    const token = jwt.sign(
      {
        error: "User not found",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
  }

  // yoinks scoob, the user has not been verified
  if (!user.verified) {
    const token = jwt.sign(
      {
        error: "User not verified",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
  }
  // change the password in the database
  const hashedPassword = await bcrypt.hash(plainTextPassword, 10);
  User.findByIdAndUpdate(userId, { password: hashedPassword }, (err, docs) => {
    if (err) {
      // Could not update user
      const token = jwt.sign(
        {
          error: "Could not update user",
        },
        process.env.JWT_SECRET
      );
      res.status(500);
      return res.json({ data: token });
    } else {
      // updated user correctly
      const token = jwt.sign(
        {
          userId: userId,
        },
        process.env.JWT_SECRET
      );
      res.status(200);
      return res.json({ data: token });
    }
  });
});

// TODO: this, but after the fifteenth database restructure
// Edit Class
app.post("/api/editClass", async (req, res) => {
  res.status(500);
  return res.json({ data: "This endpoint does not work yet :(" });
});
//   const { userId, scheduleNum, semesterNum, classId } = req.body;
//   try {
//     if (semesterNum <= 0 || scheduleNum <= 0)
//     {
//       // 400 error, "invalid schedule or semester number", return
//       const token = jwt.sign(
//         {
//           error: "invalid schedule or semester number",
//         },
//         process.env.JWT_SECRET
//       );
//       res.status(400);
//       return res.json({ data: token });
//     }
//     const user = await User.findById(userId).lean();
//     console.log("got user");

//     // if the user does not exist
//     if (!user) {
//       // 400 error, "User not found", return
//       const token = jwt.sign(
//         {
//           error: "User not found",
//         },
//         process.env.JWT_SECRET
//       );
//       res.status(400);
//       return res.json({ data: token });
//     }
//     // SPOOKY GHOST oOoOoOoOoooooOOOO

//     const classObj = await Class.findOne({ classId }).lean();
//     console.log("got classObj, type of " + typeof classObj);
//     console.log(classObj);

//     // if class does not exist
//     if (!classObj) {
//       // 400 error, "No such class exists", return
//       const token = jwt.sign(
//         {
//           error: "No such class exists",
//         },
//         process.env.JWT_SECRET
//       );
//       res.status(400);
//       return res.json({ data: token });
//     }

//     // get prereqs of classId, store in array classPrereqs
//     const classPrereqs = classObj.preReqs;

//     // get postreqs of classId, store in array classPostreqs
//     const classPostReqs = classObj.postReqs;

//     // get class names of the classes in the semester specified, store in array semClasses
//     let semClasses = user.schedules[scheduleNum - 1][semesterNum - 1];

//     // Check prereqs to classes in semester
//     if (classPrereqs && (semesterNum > 1)) {
//       for (let i = 0; i < classPrereqs.length; i++) {
//         for (let j = 0; j < semClasses.length; j++) {
//           // if there are any matches in the arrays "classPrereqs" and "semClasses"
//           if (classPrereqs[i] == semClasses[i]) {
//             // 400 error, "prerequisite not met", return
//             const token = jwt.sign(
//               {
//                 error: "Prerequisite not met",
//               },
//               process.env.JWT_SECRET
//             );
//             res.status(400);
//             return res.json({ data: token });
//           }
//         }
//       }
//     }

//     // Check postreqs of class against semester
//     if (classPostReqs) {
//       for (let i = 0; i < classPostreqs.length; i++) {
//         for (let j = 0; j < semClasses.length; j++) {
//           // if there are any matches in the arrays "classPrereqs" and "semClasses"
//           if (classPostreqs[i] == semClasses[i]) {
//             // 400 error, "postrequisite not met", return
//             const token = jwt.sign(
//               {
//                 error: "Postrequisite not met",
//               },
//               process.env.JWT_SECRET
//             );
//             res.status(400);
//             return res.json({ data: token });
//           }
//         }
//       }
//     }

    
//     classSearchAndDestroy(userId, classId, scheduleNum - 1, user);

//     classAdd(userId, classId, scheduleNum - 1, semesterNum - 1, user);
//     console.log("ping pong");

//     const token = jwt.sign(
//       {
//         error: "WOO IT DOES THE THING",
//       },
//       process.env.JWT_SECRET
//     );
//     res.status(200);
//     return res.json({ data: token });

//     // otherwise, success!
//     // users object -> schedule -> add class to semester -> check which semester had the class -> send it
//   } catch {
//     // catch
//     // 500 error, "database fail?"
//     const token = jwt.sign(
//       {
//         error: "Yikes :(",
//       },
//       process.env.JWT_SECRET
//     );
//     res.status(500);
//     return res.json({ data: token });
//   }
// });

//getElectives + with each prerecs
app.get("/api/getElectives", async (req, res) => {
  // find a
  const classObj = await Class.find({ classType: "elective" }).lean();

  try {
    const token = jwt.sign(
      {
        electives: classObj,
      },
      process.env.JWT_SECRET
    );
    res.status(200);
    return res.json({ data: token });
  } catch {
    const token = jwt.sign(
      {
        error: "Something Bad Happened",
      },
      process.env.JWT_SECRET
    );
    res.status(500);
    return res.json({ data: token });
  }
});

// TODO: this
app.post("/api/getSchedule", async (req, res) => {
  res.status(500);
  return res.json({ data: "This endpoint does not work yet :(" });
});

// TODO: this but like actual code lol
// Generate Schedule (oh boy)
app.post("/api/generateSchedule", async (req, res) => {
  // Input (required) Variables:
  // note: userId
  // note: scheduleNum (frontend needs to know what schedule number they are making... is this actually required?)
  // note: nextSemSeason represents the season of the next semester to be processed

  // Input (parameter) Variables:
  // note: creditLimitFall means the max hours for Fall, default is 17
  // note: creditLimitSpring means the max hours for Spring, default is 17
  // note: creditLimitSummer means the max hours for Summer, default is 14
  // note: maxClassCountFall means the max amount of classes in Fall, default is 4
  // note: maxClassCountSpring means the max amount of classes in Spring, default is 4
  // note: maxClassCountSummer means the max amount of classes in Summer, default is 2

  const { userId, scheduleNum, nextSemSeason, 
    creditLimitFall, creditLimitSpring, creditLimitSummer, 
    maxClassCountFall, maxClassCountSpring, maxClassCountSummer } = req.body;

  // Input (required) Variables:
  if (!userId || userId == "")
  {
    const token = jwt.sign(
      {
        error: "Invalid request: no userId",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
  }
  if (!scheduleNum || scheduleNum == "")
  {
    const token = jwt.sign(
      {
        error: "Invalid request: no scheduleNum",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
  }
  if (!nextSemSeason || nextSemSeason == "")
  {
    const token = jwt.sign(
      {
        error: "Invalid request: no nextSemSeason",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
  }

  // Input (parameter) Variables:
  if (!creditLimitFall || creditLimitFall == "")
  {
    console.log("Default creditLimitFall");
    creditLimitFall = 17;
  }
  if (!creditLimitSpring || creditLimitSpring == "")
  {
    console.log("Default creditLimitSpring");
    creditLimitSpring = 17;
  }
  if (!creditLimitSummer || creditLimitSummer == "")
  {
    console.log("Default creditLimitSummer");
    creditLimitSummer = 14;
  }
  if (!maxClassCountFall || maxClassCountFall == "")
  {
    console.log("Default maxClassCountFall");
    maxClassCountFall = 4;
  }
  if (!maxClassCountSpring || maxClassCountSpring == "")
  {
    console.log("Default maxClassCountSpring");
    maxClassCountSpring = 4;
  }
  if (!maxClassCountSummer || maxClassCountSummer == "")
  {
    console.log("Default maxClassCountSummer");
    maxClassCountSummer = 4;
  }

  // Generated Variables:
  // note: currSemPoss is a set of classes which can be taken in the next semester
  // note: currSemClasses is a set of classes representing the generated semester

  // SETUP FOR THE FIRST SEMESTER
  // for each class in completedClasses
    // for each postreq of the class
      // if the postrequisite is not in currSemPoss
        // if the prereqs are all in completedClasses
          // add the class to currSemPoss


  // TODO: this needs to be changed after the database restructure
  let supersetChecker = (arr, target) => target.every(v => arr.includes(v));

  let currSemPoss = [];
  let numCompletedClasses = completedClasses.length;
  for (let i = 0; i < numCompletedClasses; i++)
  {
    currentClass = /*Class.*/searchAndReturnClassByName(completedClasses[i]);
    numPostReqs = currentClass.postReqs.length;
    for (let j = 0; j < numPostReqs; j++)
    {
      currPostReq = /*Class.*/searchAndReturnClassByName(currentClass.postReqs[j]);
      if (!currSemPoss.includes(currPostReq.classId))
      {
        // TODO: this needs to be changed after the database restructure
        if (supersetChecker(completedClasses, currPostReq.preReqs))
        {
          currSemPoss.push(currPostReq.classId);
        }
      }
    }
  }

  function classCompare(classA, classB) {
    // TODO: ensure that these keywords match the database
    if (classA.compoundedPostReqs.length < classB.compoundedPostReqs.length) {
      return -1;
    }
    if (classA.compoundedPostReqs.length > classB.compoundedPostReqs.length) {
      return 1;
    }
    // a must be equal to b
    return 0;
  }
  
  let semesterNum = 0;
  // while currSemPoss.length > 0
  while (currSemPoss.length > 0)
  {
    let maxClassCount;
    let creditLimit;
    // switch for the current season
    switch(nextSemSeason)
    {
      case "Fall":
        maxClassCount = maxClassCountFall;
        creditLimit = creditLimitFall;
        break;
      case "Spring":
        maxClassCount = maxClassCountSpring;
        creditLimit = creditLimitSpring;
        break;
      case "Summer":
        maxClassCount = maxClassCountSummer;
        creditLimit = creditLimitSummer;
        break;
    }

    // THE ~A L G O R I T H M~
    // sort the classes in currSemPoss by compoundedPostRecCount, in decreasing order
    // for each element in currSemPoss:
      // if currCreditCount + currSemPoss[i].creditCount <= creditLimit:
        // add the class to currSemClasses and remove it from currSemPoss
        // if currClassCount >= maxClassCount:
          // break
    // add currSemPoss to the user's schedule
    currSemPoss.sort(classCompare);
    let currCreditCount = 0;
    let currSemClasses = [];
    for (let i = 0; i < currSemPoss.length; i++)
    {
      if (currCreditCount + currSemPoss[i].creditHours <= creditLimit)
      {
        if (currSemClasses.length < maxClassCount)
        {
          currSemClasses.push(currSemPoss[i].classId);
        }
        else 
        {
          break;
        }
      }
    }
    // user.add(scheduleNum, semesterNum, currSemClasses)

    
    // SETUP FOR THE FOLLOWING SEMESTER
    // add the classes in currSemClasses to completedClasses
    // for each class in currSemClasses:
      // remove the class from currSemPoss
      // for each postreq of the class:
        // if the postreq has all of its prereqs in completed classes
          // add the postreq to currSemPoss
    // move the season up one
    // clear currSemClasses


    completedClasses = completedClasses.concat(currSemClasses);
    // removes the contents of currSemClasses from currSemPoss
    currSemPoss = currSemPoss.filter( ( el ) => !currSemClasses.includes( el ) );
    for (let i = 0; i < currSemClasses.length; i++)
    {
      currClass = /*Class.*/searchAndReturnClassByName(currSemClasses);
      for (let j = 0; j < currClass.postReqs.length; j++)
      {
        // TODO: if the postreq has all of its prereqs in completed classes
        if (true)
        {
          // TODO: add the postreq to currSemPoss
        }
      }
    }

    semesterNum++;
    currSemClasses = [];
  }

  res.status(500);
  return res.json({ data: "This endpoint does not work yet :(" });
});

// passwords
app.get("/api/passwords", (req, res) => {
  const count = 5;

  // Generate some passwords
  const passwords = [];
  passwords.push(":stares:");

  // Return them as json
  res.json(passwords);

  console.log(`Sent ${count} passwords`);
});


// ------------------------------------------------------------------------------------------------------------------------------------

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`I'm listening on ${port}`);
