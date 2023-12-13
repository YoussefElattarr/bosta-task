const express = require("express");
const jwt = require("jsonwebtoken");
const { Book, Borrower, Borrowing } = require("../models");
require("dotenv").config({ path: "../.env" });
const tokenSecret = process.env.TOKEN_SECRET;

const borrowerRoutes = express.Router();

//a function to check and verify the token sent with the request
const checkTocken = (req, res, next) => {
  const header = req.headers["authorization"];
  if (typeof header !== "undefined") {
    const bearer = header.split(" ");
    const token = bearer[1];
    req.token = token;
    next();
  } else {
    res.status(401).send({ error: "You are not authorized to see this" });
  }
};

//get all borrowers
borrowerRoutes.get("/", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const borrowers = await Borrower.findAll();
        res.send({ data: borrowers });
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//get specific borrower by id
borrowerRoutes.get("/:id", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let borrower = await Borrower.findByPk(req.params.id);
        if (!borrower) {
          res.status(400).send({ error: "Borrower not found" });
        } else {
          res.send({ data: borrower });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//get books currently borrowed by the borrower
borrowerRoutes.get("/getbooks/:id", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let borrower = await Borrower.findByPk(req.params.id);
        if (!borrower) {
          res.status(400).send({ error: "Borrower not found" });
        } else {
          let books = await borrower.getBooks();
          let result = [];
          for (let i = 0; i < books.length; i++) {
            //if the book is not returned, add to the array
            if (books[i].Borrowing.returnDate === null) {
              result.push({
                id: books[i].id,
                title: books[i].title,
                author: books[i].author,
                isbn: books[i].isbn,
                dueDate: books[i].Borrowing.dueDate,
                borrowedDate: books[i].Borrowing.borrowedDate,
              });
            }
          }
          res.send({ data: result });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//create a new borrower
borrowerRoutes.post("/", async (req, res) => {
  try {
    const newBorrower = await Borrower.create(req.body);
    res.send({ message: "Borrower created successfully", data: newBorrower });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      res.status(500).send({ error: "email already exists" });
    } else {
      res.status(500).send({ error: err.message });
    }
  }
});

//edit a specific borrower
borrowerRoutes.put("/:id", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let borrower = await Borrower.findByPk(req.params.id);
        if (!borrower) {
          res.status(400).send({ error: "Borrower not found" });
        } else {
          await Borrower.update(req.body, {
            where: {
              id: req.params.id,
            },
          });
          res.send({ message: "Borrower updated successfully" });
        }
      } catch (err) {
        if (err.name === "SequelizeUniqueConstraintError") {
          res.status(400).send({ error: "email already exists" });
        } else {
          console.log(err);
          res.status(500).send({ error: "Internal Server Error" });
        }
      }
    }
  });
});

//delete a specific borrower
borrowerRoutes.delete("/:id", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let borrower = await Borrower.findByPk(req.params.id);
        if (!borrower) {
          res.status(400).send({ error: "Borrower not found" });
        } else {
          await Borrower.destroy({
            where: {
              id: req.params.id,
            },
          });
          res.send({ message: "Borrower deleted successfully" });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

module.exports = borrowerRoutes;
