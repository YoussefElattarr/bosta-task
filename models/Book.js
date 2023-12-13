const { DataTypes } = require("sequelize");
const sequelize = require("../config/dbConfig");

const Book = sequelize.define(
  "Book",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isbn: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    availableQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    shelfLocation: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    //create indexes for title, author, isbn
    indexes: [
      {
        unique: false,
        fields: ["title"],
      },
      {
        unique: false,
        fields: ["author"],
      },
      {
        unique: true,
        fields: ["isbn"],
      },
    ],
  }
);

module.exports = Book;
