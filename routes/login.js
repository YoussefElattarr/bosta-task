const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "../.env" });
const Borrower = require("../models").Borrower;
const tokenSecret = process.env.TOKEN_SECRET;
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { email, password } = req.body;
    //get the borrower with the given email
    let borrower = await Borrower.findOne({ where: { email: email } });
    if (borrower) {
      //check if passwords matched
      if (borrower.password === password) {
        const payload = {
          id: borrower.id,
          email: email,
        };
        //create a jwt token and send it to the user
        jwt.sign(payload, tokenSecret, { expiresIn: "1h" }, (err, token) => {
          return res.json({ message: "Logged in successfully", token: token });
        });
      } else {
        res.status(400).send({ error: "wrong password" });
      }
    } else {
      return res.status(400).json({ error: "email does not exist" });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
