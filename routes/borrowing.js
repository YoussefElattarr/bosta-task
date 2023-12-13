const express = require("express");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const sequelize = require("../config/dbConfig");
require("dotenv").config({ path: "../.env" });
const { Borrower, Book, Borrowing } = require("../models");
const tokenSecret = process.env.TOKEN_SECRET;
const { createObjectCsvStringifier } = require("csv-writer");

const borrowingRoutes = express.Router();

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

//get total borrowed books in a specific time
const getTotalBorrowedBooks = async (startDate, endDate) => {
  const totalBooksBorrowed = await Borrowing.count({
    where: {
      borrowedDate: {
        [Op.between]: [startDate, endDate],
      },
      returnDate: null,
    },
  });
  return totalBooksBorrowed;
};

//get most borrowed books in a specific time
const getMostBorrowedBooks = async (startDate, endDate) => {
  const mostBorrowedBooks = await Borrowing.findAll({
    where: {
      borrowedDate: {
        [Op.between]: [startDate, endDate],
      },
    },
    attributes: [[sequelize.literal("COUNT(*)"), "borrowCount"]],
    include: [
      {
        model: Book,
        attributes: ["id", "title", "author", "isbn"],
      },
    ],
    group: ["Book.id"],
    order: [[sequelize.literal("COUNT(*)"), "DESC"]],
    limit: 5, // Limit to the top 5 most borrowed books
  });

  return mostBorrowedBooks;
};

//get books borrowed by borrower in a specific time
const getBooksBorrowedByBorrower = async (startDate, endDate) => {
  const booksBorrowedByBorrower = await Borrowing.findAll({
    where: {
      borrowedDate: {
        [Op.between]: [startDate, endDate],
      },
    },
    attributes: ["Borrower.id", [sequelize.literal("COUNT(*)"), "borrowCount"]],
    include: [{ model: Borrower, attributes: ["id", "name", "email"] }],
    group: ["Borrower.id"],
  });
  return booksBorrowedByBorrower.map((item) => ({
    borrower: item.Borrower,
    borrowCount: item.get("borrowCount"),
  }));
};

//get average borrowing duration of books in a specific time
const getAverageBorrowingDuration = async (startDate, endDate) => {
  const averageBorrowingDuration = await Borrowing.findAll({
    where: {
      borrowedDate: {
        [Op.between]: [startDate, endDate],
      },
      //get only returned books
      returnDate: {
        [Op.ne]: null,
      },
    },
    attributes: [
      [
        sequelize.fn("AVG", sequelize.literal('("returnDate"-"borrowedDate")')),
        "avgDuration",
      ],
    ],
  });

  return averageBorrowingDuration[0].get("avgDuration");
};

//get analytics report in a specific time
borrowingRoutes.get("/analyticsreports", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
          return res
            .status(400)
            .send({ message: "Please add start and end date" });
        }
        const totalBooksBorrowed = await getTotalBorrowedBooks(
          new Date(startDate),
          new Date(endDate)
        );
        const mostBorrowedBooks = await getMostBorrowedBooks(
          new Date(startDate),
          new Date(endDate)
        );
        const booksBorrowedByBorrower = await getBooksBorrowedByBorrower(
          new Date(startDate),
          new Date(endDate)
        );
        const averageBorrowingDuration = await getAverageBorrowingDuration(
          new Date(startDate),
          new Date(endDate)
        );
        res.send({
          totalBooksBorrowed,
          mostBorrowedBooks,
          booksBorrowedByBorrower,
          averageBorrowingDuration,
        });
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//export borrowing processes in a specific time
//if now time is specified, export processes of last month
borrowingRoutes.get("/export", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const { startDate, endDate } = req.query;
        let result;
        //if no date is specified 
        if (!startDate || !endDate) {
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

          const borrowingData = await Borrowing.findAll({
            attributes: ["id", "borrowedDate", "dueDate", "returnDate"],
            include: [
              { model: Book, attributes: ["title"] },
              { model: Borrower, attributes: ["name"] },
            ],
            where: {
              borrowedDate: {
                [Op.between]: [firstDayOfPreviousMonth, lasttDayOfPreviousMonth],
              },
            },
          });
          result = borrowingData.map((item) => item.toJSON());
        } 
        //if date is specified 
        else {
          const borrowingData = await Borrowing.findAll({
            attributes: ["id", "borrowedDate", "dueDate", "returnDate"],
            where: {
              borrowedDate: {
                [Op.between]: [startDate, endDate],
              },
            },
            include: [
              { model: Book, attributes: ["title"] },
              { model: Borrower, attributes: ["name"] },
            ],
          });
          result = borrowingData.map((item) => item.toJSON());
        }

        //function that formats and creates csv file
        const formatCSV = (data) => {
          const header = [
            "ID",
            "Book Title",
            "Borrower Name",
            "Borrowed Date",
            "Due Date",
            "Return Date",
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

//checkout a book by a borrower
borrowingRoutes.post("/checkout", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const { borrowerId, bookId, dueDate } = req.body;
        if (new Date(dueDate) < new Date()) {
          return res.status(400).send({ message: "Due date already passed." });
        }
        const book = await Book.findByPk(bookId);
        //if book is not found or there is not quantity
        if (!book || book.quantity === 0) {
          return res
            .status(400)
            .send({ message: "Book not available for checkout." });
        }
        const borrower = await Borrower.findByPk(borrowerId);
        if (!borrower) {
          return res.status(400).send({ message: "Borrower not found." });
        }
        const borrowing = await Borrowing.findOne({
          where: { BorrowerId: borrowerId, BookId: bookId, returnDate: null },
        });
        //if this book is already borrowed by this borrower and not returned
        if (borrowing) {
          return res.status(400).send({
            message:
              "Borrower already borrowed this book before and not return it.",
          });
        }

        await Borrowing.create({
          dueDate,
          BookId: bookId,
          BorrowerId: borrowerId,
        });
        //decrement quantity by 1
        book.decrement("availableQuantity");
        res.status(200).send({ message: "Book checked out successfully." });
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});

//return a book
borrowingRoutes.post("/return", checkTocken, (req, res) => {
  jwt.verify(req.token, tokenSecret, async (err, payload) => {
    if (err) {
      res.status(401).send(err);
    } else {
      try {
        const { borrowerId, bookId } = req.body;
        const book = await Book.findByPk(bookId);
        if (!book) {
          return res
            .status(400)
            .send({ message: "Book not available for checkout." });
        }
        const borrower = await Borrower.findByPk(borrowerId);
        if (!borrower) {
          return res.status(400).send({ message: "Borrower not found." });
        }
        const borrowing = await Borrowing.findOne({
          where: { BorrowerId: borrowerId, BookId: bookId, returnDate: null },
        });
        //check if the book is borrowed 
        if (!borrowing) {
          return res.status(400).send({
            message:
              "Borrower can't return this book as there is no record of it being borrowed.",
          });
        }
        await Borrowing.update(
          { returnDate: new Date() },
          {
            where: {
              BorrowerId: borrowerId,
              BookId: bookId,
              returnDate: null,
            },
          }
        );
        //increment quantity by 1 
        book.increment("availableQuantity");
        res.status(200).send({ message: "Book returned successfully." });
      } catch (err) {
        console.log(err);
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  });
});
module.exports = borrowingRoutes;
