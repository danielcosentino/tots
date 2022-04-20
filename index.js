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

// find ALL(assume there can be more than one) instances of [classId] in [userId]'s [scheduleNum]th schedule and delete it
function classSearchAndDestroy(userId, classId, user, res) {
  // sussy?
  let allSchedules = user.schedule;
  //let currSchedule = allSchedules[scheduleNum];
  //let numSemesters = currSchedule.length;
  //let currSemester;

  console.log(allSchedules);

  // loop through each semester, deleting all instances of classId in the current semester
  // for each semester "i"
  // for (i = 0; i < numSemesters; i++) {
  //   // remove all instances of classId in that semester
  //   currSemester = currSchedule[i];
  //   let numClasses = currSemester.length;
  //   for (j = 0; j < numClasses; j++) {
  //     if (currSemester[j] === classId) {
  //       console.log(
  //         "The current semester includes the class which will be deleted"
  //       );
  //       currSemester.splice(j, 1);
  //       // TODO: choice 1: you could update the user's schedule for each class here or ...
  //       //
  //     }
  //   }
  // }
  // TODO: choice 2: ... update it down here as an entire new schedule

  
  User.findByIdAndUpdate(
    { _id: userId, "schedule.semester": {$in: classId} },
    // Delete all instances of the class in a schedule
    { $pull: { "schedule.$.semester": classId } }
  );
    
  console.log(allSchedules);
  console.log(user.schedule);
  console.log("at the end of classSearchAndDestroy");
}

function classAdd(userId, classId, semesterNum, res) {
  User.findOneAndUpdate(
    { _id: { $eq: userId } },
    // Add class to a semester oooOOooooooooOooOOoooOoOoOOo
    { $push: { "schedule.$[semesterNum].semester": classId } },
    (err, result) => {
      if (err) {
        res.send({ error: "An error has occured" });
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

    res.status(400);
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

// get Email
app.post("/api/getEmail", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).lean();

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
  
  const token = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET
  );
  res.status(200);
  return res.json({ data: token });
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
//   res.status(500);
//   return res.json({ data: "This endpoint does not work yet :(" });
// });
  const { userId, semesterNum, classId } = req.body;
  try {
    if (semesterNum <= 0)
    {
      // 400 error, "invalid schedule or semester number", return
      const token = jwt.sign(
        {
          error: "invalid schedule or semester number",
        },
        process.env.JWT_SECRET
      );
      res.status(400);
      return res.json({ data: token });
    }
    const user = await User.findById(userId).lean();
    console.log("got user");

    // if the user does not exist
    if (!user) {
      // 400 error, "User not found", return
      const token = jwt.sign(
        {
          error: "User not found",
        },
        process.env.JWT_SECRET
      );
      res.status(400);
      return res.json({ data: token });
    }
    // SPOOKY GHOST oOoOoOoOoooooOOOO

    const classObj = await Class.findOne({ classId }).lean();
    console.log("got classObj, type of " + typeof classObj);
    console.log(classObj);

    // if class does not exist
    if (!classObj) {
      // 400 error, "No such class exists", return
      const token = jwt.sign(
        {
          error: "No such class exists",
        },
        process.env.JWT_SECRET
      );
      res.status(400);
      return res.json({ data: token });
    }

    // get prereqs of classId, store in array classPrereqs
    const classPrereqs = classObj.preReqs;

    // get postreqs of classId, store in array classPostreqs
    const classPostReqs = classObj.postReqs;

    // get class names of the classes in the semester specified, store in array semClasses
    let semClasses = user.schedule[semesterNum - 1].semester;

    // Check prereqs to classes in semester
    if (classPrereqs && (semesterNum > 1)) {
      for (let i = 0; i < classPrereqs.length; i++) {
        for (let j = 0; j < semClasses.length; j++) {
          // if there are any matches in the arrays "classPrereqs" and "semClasses"
          if (classPrereqs[i] == semClasses[i]) {
            // 400 error, "prerequisite not met", return
            const token = jwt.sign(
              {
                error: "Prerequisite not met",
              },
              process.env.JWT_SECRET
            );
            res.status(400);
            return res.json({ data: token });
          }
        }
      }
    }

    // Check postreqs of class against semester
    if (classPostReqs) {
      for (let i = 0; i < classPostreqs.length; i++) {
        for (let j = 0; j < semClasses.length; j++) {
          // if there are any matches in the arrays "classPrereqs" and "semClasses"
          if (classPostreqs[i] == semClasses[i]) {
            // 400 error, "postrequisite not met", return
            const token = jwt.sign(
              {
                error: "Postrequisite not met",
              },
              process.env.JWT_SECRET
            );
            res.status(400);
            return res.json({ data: token });
          }
        }
      }
    }

    classSearchAndDestroy(userId, classId, user);

    classAdd(userId, classId, semesterNum - 1, user);
    console.log("ping pong");

    const token = jwt.sign(
      {
        error: "WOO IT DOES THE THING",
      },
      process.env.JWT_SECRET
    );
    res.status(200);
    return res.json({ data: token });

    // otherwise, success!
    // users object -> schedule -> add class to semester -> check which semester had the class -> send it
  } catch {
    // catch
    // 500 error, "database fail?"
    const token = jwt.sign(
      {
        error: "Yikes :(",
      },
      process.env.JWT_SECRET
    );
    res.status(500);
    return res.json({ data: token });
  }
});

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

app.post("/api/generateSchedule", async (req, res) => {
  const { userId } = req.body;

  // Grab user
  let user = await User.findById(userId).lean();

  if (!user)
  {
    const token = jwt.sign(
      {
        error: "No user found",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
  }

  console.log("AAAAAAAAAAAAAAAA");
  newSchedule = [
    { semester: ["COP2500", "ANT2000", "ENG1101"] },
    { semester: ["ENG1102", "COP3223"] }
  ];

  console.log(newSchedule.type);

  // newSchedule = JSON.stringify(newSchedule);

  User.findOneAndReplace(userId, { schedule : "a" });


  // User.findOneAndReplace(userId, { schedule: newSchedule }, (err, docs) => {
  //   if (err) {
  //     const token = jwt.sign(
  //       {
  //         error: "Schedule could not be added",
  //       },
  //       process.env.JWT_SECRET
  //     );
  //     // 500 since its a server error
  //     res.status(500); // double check
  //     return res.json({ data: token });
  //   } else {
  //     // it did work woo yay fun time woo party woo
  //     const token = jwt.sign(
  //       {
  //         schedule: newSchedule
  //       },
  //       process.env.JWT_SECRET
  //     );
  //     // 200 since it succeeded
  //     res.status(200);
  //     return res.json({ data: token });
  //   }
  // });
  





  await User.findByIdAndUpdate( userId, { schedule: newSchedule });
  console.log("Updated");
  const token = jwt.sign(
    {
      // Daniel plz give schedule to this user \/\/\/\/\/ -Gaby
      // 624fa445adb7d5549e6f78d7
      schedule: newSchedule
    },
    process.env.JWT_SECRET
  );
  res.status(200);
  return res.json({ data: token });
});

// TODO: make the code work with Gaby's restructure and debug
// Generate Schedule (oh boy)
app.post("/api/test_generateSchedule", async (req, res) => {
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

  const {
    userId = 0,
    scheduleNum = -1,
    nextSemSeason = "",
    creditLimitFall = 17,
    creditLimitSpring = 17,
    creditLimitSummer = 14,
    maxClassCountFall = 4,
    maxClassCountSpring = 4,
    maxClassCountSummer = 4,
    completedClasses: localCompletedClasses = []
  } = req.body;

  // Grab user
  let user = await User.findById(userId).lean();

  let completedClasses = localCompletedClasses; 

  // GEP array
  let gepCheck = new Array (13); 
  gepCheck.fill(false); 

  let numStateCore = 0; 
  let numGRW = 0; 
  let numGRM = 0; 
  let numCivLit = 0;

  // need 12
  let gepsCompleted = false;
  // need
  let stateCoreCompleted = false;
  let grwsCompleted = false;
  let grmsCompleted = false;
  let civLitCompleted = false;

  // Update the users completed classes
  await User.findByIdAndUpdate(userId, { completedClasses: completedClasses });
  
  // Input (required) Variables:
  if (userId === 0) {
    const token = jwt.sign(
      {
        error: "Invalid request: no userId",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
  }
  if (scheduleNum === -1) {
    const token = jwt.sign(
      {
        error: "Invalid request: no scheduleNum",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
  }
  if (nextSemSeason == "") {
    const token = jwt.sign(
      {
        error: "Invalid request: no nextSemSeason",
      },
      process.env.JWT_SECRET
    );
    res.status(400);
    return res.json({ data: token });
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

  // CHRISINE TODONE WITH THIS PART: this needs to be changed after the database restructure
  // checks if every class in target is in arr 
  // let supersetChecker = (arr, target) => target.every(v => arr.includes(v));

  // prerecs is an array of each postrec's prerecs
  function supersetChecker(complete, preReqs) 
  {
    const len = preReqs.length; 
    let preReqMet;
    for (let i = 0; i < len; i++) 
    {
      preReqMet = false;

      // checks possible coreqs
      for (let j = 0; j < preReqs.class.length; j++)
      {
        if (complete.includes(preReqs[i].class[j]))
        {
          preReqMet = true;
        }
      }
      if (!preReqMet)
      {
        return false;
      }
    }
    return true; 
  }


  let currSemPoss = [];
  let numCompletedClasses = completedClasses.length;
  let test = [];

  // if they are a freshman (no classes completed)
    // hardcoded classes lol
    // this should fulfill the number of classes requirement, number of credits, etc.
  
    
  // pog destructure currentClass.postReqs[j].class
  for (let i = 0; i < numCompletedClasses; i++)
  {
    let currentClass = await Class.findOne({ classId : completedClasses[i] }).lean();

    // Class doesnt exist *dies* - What do return???
    // if(typeof currentClass == 'undefined')
    // {
    //   return
    // }

    // test.push(completedClasses[i]);
   
    // Is this skipping the class entirely??? Does it need to be the very first thing?
    if (!currentClass.postReqs)
    {
      continue;
    }

    let numPostReqs = currentClass.postReqs.length;

    // Go through each of the postreqs
    for (let j = 0; j < numPostReqs; j++)
    {
      // edge case where theres no postreq? aaa
      if (!currentClass.postReqs[j].class[0])
      {
        continue; 
      }

        // doesnt account for coreq possibilities lol
      let postRec = await Class.findOne({ classId : currentClass.postReqs[j].class[0] }).lean();

      if (!currSemPoss.includes(postRec.classId)) 
      {
        // if the user can take the class
        // if the prereqs of the current post req have been met
        // if the prereqs of the current post req are all already contained inside of completed classes
        // if the prereqs of the current post req are a subset of completed classes
        // if the completed classes are a superset of the prereqs of the current post req
        
        if (supersetChecker(completedClasses, postRec.preReqs) && !completedClasses.includes(postRec.classId)) 
        {
          currSemPoss.push(postRec);
        }
      }
    }
  }

  // sorts by postreqs
  function classCompare(classA, classB)
  {
    if (!classA.compPostReqs && !classB.compPostReqs)
      return 0;
    
    // sussy? mkake
    // if a is greater than b by some arbitrary metric
    if (!classB.compPostReqs || classA.compPostReqs.length > classB.compPostReqs.length) {
      return -1;
    }
    // if a is less than b by some arbitrary metric
    if (!classA.compPostReqs || classA.compPostReqs.length < classB.compPostReqs.length) {
      return 1;
    }
    // a must be equal to b
    return 0;
  }

  
  let semesterNum = 0;
  // while currSemPoss.length > 0
  let gradReqFulfilled = false;
  while (!gradReqFulfilled) 
  {
    let maxClassCount;
    let creditLimit;
    // switch for the current season
    switch (nextSemSeason)
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
      default:
        const token = jwt.sign(
          {
            error: "Invalid request: no nextSemSeason",
          },
          process.env.JWT_SECRET
        );
        res.status(400);
        return res.json({ data: token });
    }
  
    // THE ~A L G O R I T H M~
    // sort the classes in currSemPoss by compoundedPostRecCount, in decreasing order
    // for each element in currSemPoss:
    // if currCreditCount + currSemPoss[i].creditCount <= creditLimit:
    // add the class to currSemClasses and remove it from currSemPoss
    // if currClassCount >= maxClassCount:
    // break
    // add currSemPoss to the user's schedule
    // TODO: nothing todo here, but I just wanted to say you got this!
    // :)

  
  // TODO: this
  // return res.json(currSemPoss);

  // on the second call theres only 2 classes??? AAaaa
   
  

  // daniel look this breaks on the second loop of the while with a "cant read length of undefined err"
  currSemPoss.sort(classCompare);


  let currCreditCount = 0;
  let currSemClasses = [];
  // loop through currSemPoss
    // add as many core classes as possible to currSemClasses(starting from the left moving right), up to a max of 2 core classes
    // if it is senior design I
      // put it at the end of currSemPoss and don't add it to currSemClasses
        // if current class to add is SeniorDesign1, check length of currSemPoss and then do stuff ?
          // if currSemPoss has other core classes
            // skip over senior design (somehow, you pick)
            // you CAN NOT move senior design to the end, otherwise graduation is delayed
    let coreCount = 0;
    for (let i = 0; i < currSemPoss.length && coreCount < 2; i++)
    {
      if (currSemPoss[i].classType == "core")
      {
        currSemClasses.push(currSemPoss[i]);
        coreCount++;
      }
    }

    for (let i = 0; i < currSemPoss.length; i++)
    {
      if (currCreditCount + currSemPoss[i].creditHours <= creditLimit) 
      {
        if (currSemClasses.length + 1 <= maxClassCount)
        {
          // ----- with the remaining slots in the semester, it prioritizes GEPs that have state core requirements -----
          // ----- then it priorities GRWs and GRMs -----

          // Priorities for classes:
            // Core classes
            // GEPs
              // State Core
              // GRW/GRM
              // non-statecore or non-GRW/GRM

          // TSA - not VIP line
          // if (the class) to be added is a GEP and NOT a core class
          test.push(currSemPoss[i]);
          // if (currSemPoss[i].classType === "gep" && currSemPoss[i].classType !== "core") {
            

          // }
            // if the GEP is NOT already completed
              // ----- check for GRW and GRM -----
              // if the class would not fulfill a GRW  or GRM
                // if the GRW or GRM has not been fulfilled yet
                  // if currSemPoss contains a class in that GEP number that would fulfull the GRW or GRM
                    // swap the class to be added to the class that would fulfill that GRW or GRM requirement
              // ----- check for state core -----
              // if the GEP does not fulfill a state core requirement
                // if there is another class in currSemPoss that is the same GEP but it also fulfills a state core requirement
                  // if the state core requirement that it would fulfill is not yet completed
                    // swap the current class to the class that fulfills the state core requirement
            // else (GEP is already completed)
              // if there are still courses in currSemPoss
                // continue

          currSemClasses.push(currSemPoss[i]);

          // If the class is a GEP, mark that GEP
          if (currentClass.type == "gep")
          {
            for (let i = 0; i < currentClass.gep.length; i++)
            {
              // If the gep is open, fill it
              if (!gepCheck[currentClass.gep[i]])
              {
                gepCheck[currentClass.gep[i]] == true;
                break;
              }
            }
            // Check for if none of the geps are open??? (cant take that gep)

            // If the class fulfills a GRW or GRM, mark it
            for (let i = 0; i < currentClass.gepReqs.length; i++)
            {
              if (currentClass.gepReqs[i] == "State Core")
              {
                numStateCore++;
              }
              else if (currentClass.gepReqs[i] == "GRW")
              {
                numGRW++;
              }
              else if (currentClass.gepReqs[i] == "GRM")
              {
                numGRM++;
              }
              else if (currentClass.gepReqs[i] == "CL")
              {
                numCivLit++;
              }
              else
              {
                console.log("Ya got a typo dummy -Gaby to Gaby");
              }
            }
          }

          currSemPoss.splice(i, 1);
          
          
          // remove the class from currSemPoss(so we don't add the class over and over)

          // -----marks the properties of the schedule completed as necessary from the class's properties-----
          // if that GEP is now completed
            // mark that GEP as completed(locally, in whatever storage you are using to mark GEPs as done)
          // if the class has a GRW or GRM requirement 
            // increment the GRW or GRM counter as necessary
            // mark GRW and GRM completed as necessary
          // if the class has a state core requirement
            // mark it completed as necessary
        } else {
          break;
        }
      }
    }

   // return res.json(test);
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

    
    function currSemClassNerfer(classArr) {
      let idsOnly = []; 

      for (let i = 0; i < classArr.length; i++) {
        idsOnly.push(classArr[i].classId); 
      }
      return idsOnly; 
    }
    
    
    let nerfedSemClasses = currSemClassNerfer(currSemClasses); 
    
    completedClasses = completedClasses.concat(nerfedSemClasses); 


    // removes the contents of currSemClasses from currSemPoss
    currSemPoss = currSemPoss.filter((el) => !currSemClasses.includes(el));
    for (let i = 0; i < currSemClasses.length; i++) {
      currClass = await Class.findOne({ classId : completedClasses[i] }).lean();
      for (let j = 0; j < currClass.postReqs.length; j++) {
        // TODO: if the postreq has all of its prereqs in completed classes
        // this is the same thing as the subsetChecker call from above
        if (supersetChecker(completedClasses, currClass.preReqs) && !completedClasses.includes(currClass.classId)) {
          currSemPoss.push(currClass.postReqs[j].classId);
        }
      }
    }

    if (semesterNum === 0)
     return res.json(currSemPoss); 

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
// app.set('port', process.env.PORT || 5000);

console.log(`I'm listening on ${port}`);
