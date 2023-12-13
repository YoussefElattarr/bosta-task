const { DataTypes } = require("sequelize");
const sequelize = require("../config/dbConfig");

const Borrower = sequelize.define(
  "Borrower",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: { msg: "Please enter a valid email" } },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    registeredDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    //create indexes for name and email
    indexes: [
      {
        unique: false,
        fields: ["name"],
      },
      {
        unique: true,
        fields: ["email"],
      },
    ],
  }
);

// Borrower.associate = (models) => {
//   Borrower.hasMany(models.Borrowing, {
//     onDelete: "CASCADE",
//   });
// };

module.exports = Borrower;
