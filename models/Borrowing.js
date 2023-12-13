const { DataTypes } = require("sequelize");
const sequelize = require("../config/dbConfig");

const Borrowing = sequelize.define(
  "Borrowing",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    borrowedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    returnDate: {
      type: DataTypes.DATEONLY,
    },
  },
);

module.exports = Borrowing;
