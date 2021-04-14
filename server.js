const mongoose = require("mongoose");
const dotenv = require("dotenv");

//UNCAUGHT EXCEPTION HANDLER should be placed before all other codes so that
//it can catch the errors.
// process.on("uncaughtException", err => {
//   console.log("UNCAUGHT EXCEPTION 💣 Shutting down...");
//   console.log(err.name, err.message);
//   process.exit(1);
// });

dotenv.config({ path: "./config.env" });

const app = require("./app");
const { listeners } = require("./models/userModel");

//Replacing <PASSWORD> in config.env file with DATABASE_PASSWORD
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(connection => console.log("DB connection successful! "))
  .catch(err => console.log(err))

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// process.on("unhandledRejection", err => {
//   console.log(err.name, err.message);
//   console.log("UNHANDLED REJECTION 💣 Shutting down...");
//   server.close(() => {
//     process.exit(1);
//   });
// });
