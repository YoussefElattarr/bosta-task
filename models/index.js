const Book = require("./Book");
const Borrower = require("./Borrower");
const Borrowing = require("./Borrowing");

//defining the associations between models
Borrower.belongsToMany(Book, { through: { model: Borrowing, unique: false } });
Book.belongsToMany(Borrower, { through: { model: Borrowing, unique: false } });
Borrower.hasMany(Borrowing);
Borrowing.belongsTo(Borrower);
Book.hasMany(Borrowing);
Borrowing.belongsTo(Book);

module.exports = {
  Book,
  Borrower,
  Borrowing,
};
