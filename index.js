const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config({ path: "./.env" });
const sequelize = require("./config/dbConfig");
const borrowerRoutes = require("./routes/borrower");
const bookRoutes = require("./routes/book");
const borrowingRoutes = require("./routes/borrowing");
const login = require("./routes/login");
const port = process.env.PORT || 3000;

sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
    return sequelize.sync({ alter: true }); // Synchronize database schema with models
  })
  .then(() => {
    console.log("Database synchronized");
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

//connectToDB();
const app = express();
//allow cors
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("<h3>HOMEPAGE<h3>");
});

app.use("/borrower", borrowerRoutes);
app.use("/book", bookRoutes);
app.use("/borrowing", borrowingRoutes);
app.use("/login", login);

//default routing
app.use((req, res) => {
  res
    .status(404)
    .send({ error: "Obi-Wan: You don't need to see this page..." });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
