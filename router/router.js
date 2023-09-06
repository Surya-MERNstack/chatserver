const router = require("express").Router();
const User = require("../models/UserData");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_TOKEN || "suryaperumal";
const bcrypt = require("bcrypt");
const message = require("../models/message");
const UserData = require("../models/UserData");
const bcryptSalt = bcrypt.genSaltSync(10);
 
 
router.get("/profile", (req, res) => {
    
  const token = req.cookies?.token;

  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, usersData) => {
      if (err) throw err;
        //  const {id, username} = usersData;
      res.json(usersData); 
    });
  } else {
    res.status(400).json('no token');
  }
});


const getUserData = async (req) => {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
  });
};

router.get("/message/:userId", async (req, res) => {
  const { userId } = req.params;
  const UserData = await getUserData(req);
  const ourUserId = UserData.userId;

  const Messages = await message.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  });
  res.json(Messages); 
}); 
 
router.get("/people", async (req, res) => {
  const users = await User.find({}, { _id: 1, username: 1 });
  res.json(users);
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const findingUser = await User.findOne({ username });

  if (findingUser) { 
    const isCorrectPassword = bcrypt.compareSync(
      password,
      findingUser.password
    );
    if (isCorrectPassword) {
      jwt.sign(
        { userId: findingUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          res.cookie("token", token, { sameSite: "none", secure: true }).json({
            id: findingUser._id,
          });
        }
      );
    }
  } 
});

router.post('/logout', async (req, res) => {
  res.cookie("token", '', { sameSite: "none", secure: true }).json('ok')

})
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);

    const createdUser = await User.create({
      username: username, 
      password: hashedPassword,
    }); 
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          res
            .cookie("token", token, { sameSite: "none", secure: true })
            .status(200)
            .json({
              id: createdUser._id,
              username,
            });
        }
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
 