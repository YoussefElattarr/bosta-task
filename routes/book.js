const express = require("express");
const jwt = require("jsonwebtoken");
const { Borrowing, Book, Borrower } = require("../models");
require("dotenv").config({ path: "../.env" });
const { Op } = require("sequelize");
const tokenSecret = process.env.TOKEN_SECRET;

const bookRoutes = express.Router();

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

//get all books
bookRoutes.get("/", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const books = await Book.findAll();
        res.send({ data: books });
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//get overdue books
bookRoutes.get("/getoverduebooks", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const books = await Book.findAll({
          include: [
            {
              model: Borrower,
              required: true,
              through: {
                where: { dueDate: { [Op.lt]: new Date() }, returnDate: null },
              },
            },
          ],
        });
        //structure the response
        result = [];
        for (let i = 0; i < books.length; i++) {
          result.push({
            id: books[i].id,
            title: books[i].title,
            author: books[i].author,
            isbn: books[i].isbn,
            borrowerId: books[i].Borrowers[0].id,
            borrowerName: books[i].Borrowers[0].name,
            borrowerEmail: books[i].Borrowers[0].email,
            dueDate: books[i].Borrowers[0].Borrowing.dueDate,
            borrowedDate: books[i].Borrowers[0].Borrowing.borrowedDate,
          });
        }
        res.send({ data: result });
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//export overdue books of the last month
bookRoutes.get("/exportoverduebooks", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const firstDayOfPreviousMonth = new Date();
        firstDayOfPreviousMonth.setMonth(
          firstDayOfPreviousMonth.getMonth() - 1
        );
        firstDayOfPreviousMonth.setDate(1);
        firstDayOfPreviousMonth.setHours(0, 0, 0, 0);

        const lasttDayOfPreviousMonth = new Date();
        // Set the date to the first day of the current month
        lasttDayOfPreviousMonth.setDate(1);
        // Subtract one day to get the last day of the last month
        lasttDayOfPreviousMonth.setDate(0);

        const books = await Book.findAll({
          include: [
            {
              model: Borrower,
              required: true,
              through: {
                where: {
                  dueDate: { [Op.lt]: new Date() },
                  returnDate: null,
                  borrowedDate: {
                    [Op.between]: [firstDayOfPreviousMonth, lasttDayOfPreviousMonth],
                  },
                },
              },
            },
          ],
        });
        //structure the response 
        result = [];
        for (let i = 0; i < books.length; i++) {
          result.push({
            id: books[i].id,
            title: books[i].title,
            borrowerName: books[i].Borrowers[0].name,
            dueDate: books[i].Borrowers[0].Borrowing.dueDate,
            borrowedDate: books[i].Borrowers[0].Borrowing.borrowedDate,
          });
        }
        //function that formats and creates csv file
        const formatCSV = (data) => {
          const header = [
            "ID",
            "Book Title",
            "Borrower Name",
            "Borrowed Date",
            "Due Date",
          ];
          const rows = data.map((record) => [
            record.id,
            record.Book ? record.Book.title : "",
            record.Borrower ? record.Borrower.name : "",
            record.borrowedDate,
            record.dueDate,
            record.returnDate,
          ]);

          const csvContent = [
            header.join(","),
            ...rows.map((row) => row.join(",")),
          ].join("\n");
          return csvContent;
        };

        const csvData = formatCSV(result);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=borrowing_data.csv"
        );
        res.status(200).send(csvData);
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//get book by title
bookRoutes.get("/bytitle/:title", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let books = await Book.findAll({
          where: {
            title: req.params.title,
          },
        });
        if (books.length === 0) {
          res.status(400).send({ error: "No book found by that title" });
        } else {
          res.send({ data: books });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//get book by author
bookRoutes.get("/byauthor/:author", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let books = await Book.findAll({
          where: {
            author: req.params.author,
          },
        });
        if (books.length === 0) {
          res.status(400).send({ error: "No book found by that author" });
        } else {
          res.send({ data: books });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//get book by isbn
bookRoutes.get("/byisbn/:isbn", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let book = await Book.findOne({
          where: {
            isbn: req.params.isbn,
          },
        });
        if (!book) {
          res.status(400).send({ error: "Book does not exist" });
        } else {
          res.send({ data: book });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//get specific book by id
bookRoutes.get("/:id", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let book = await Book.findByPk(req.params.id);
        if (!book) {
          res.status(404).send({ error: "Book not found" });
        } else {
          res.send({ data: book });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//create a new book
bookRoutes.post("/", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const newBook = await Book.create(req.body);
        res.send({
          message: "Book created successfully",
          data: newBook,
        });
      } catch (err) {
        if (err.name === "SequelizeUniqueConstraintError") {
          res.status(400).send({ error: "ISBN already exists" });
        } else {
          res.status(500).send({ error: err.message });
        }
      }
    }
  });
});

//edit a specific book
bookRoutes.put("/:id", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let book = await Book.findByPk(req.params.id);
        if (!book) {
          res.status(400).send({ error: "Book not found" });
        } else {
          await Book.update(req.body, {
            where: {
              id: req.params.id,
            },
          });
          res.send({ message: "Book updated successfully" });
        }
      } catch (err) {
        if (err.name === "SequelizeUniqueConstraintError") {
          res.status(500).send({ error: "ISBN already exists" });
        } else {
          console.log(err);
          res.status(500).send({ error: "Internal Server Error" });
        }
      }
    }
  });
});

//delete a specific book
bookRoutes.delete("/:id", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        let book = await Book.findByPk(req.params.id);
        if (!book) {
          res.status(400).send({ error: "Book not found" });
        } else {
          await Book.destroy({
            where: {
              id: req.params.id,
            },
          });
          res.send({ message: "Book deleted successfully" });
        }
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

module.exports = bookRoutes;
