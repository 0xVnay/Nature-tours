const path = require("path");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const AppError = require("./utilities/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const viewRouter = require("./routes/viewRoutes");

const app = express();

//setting up TEMPLATING ENGINE: PUG
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// 1.GLOBAL MIDDLEWARES
// Implement CORS
app.use(cors());
app.options("*", cors());

// for Serving static files
app.use(express.static(path.join(__dirname, "public")));

//using HELMET to set security HTTP Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// using MORGAN for Development Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// using Express Rate Limiter middleware to limit request and protect our API from DDOS
// and Brute Force attacks
const limiter = rateLimit({
  // limiting request to 100 requests per hour. Rate can vary for different websites and apis
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour",
});
app.use("/api", limiter);

//using BODY PARSER(express middleware) for reading data from body into req.body and
//limit the size of body so that larger data will not be accepted
app.use(express.json({ limit: "10kb" }));
//to parse form data sent to the server
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
//using COOKIE PARSER to parse cookies onto req.cookies.
app.use(cookieParser());

// Data sanitization against NoSQL query injection attacks
app.use(mongoSanitize());

// Data sanitization against XSS attacks
app.use(xss());

//Prevent HTTP Parameter Pollution by removing duplicate params and whitelisting
//some params which we need to be duplicated
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsAverage",
      "ratingsQuantity",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

app.use(compression());

//definig our own middlewares and using them
// app.use((req, res, next) => {
//   console.log("hello from the middleware!!!");
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //In express request headers are accesssed using req.headers
  // console.log(req.cookies);
  next();
});

// 2. ROUTES
app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

//this route middleware will only be reached only when the above two routes
//are not accessible
app.all("*", (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl} on this server`);
  // err.status = "fail";
  // err.statusCode = 404;
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
