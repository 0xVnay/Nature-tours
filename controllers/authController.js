const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const catchAsync = require("../utilities/catchAsync");
const AppError = require("../utilities/appError");
const sendEmail = require("../utilities/email");

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// COOKIE is a small piece of test that a server send to a client and when client
// recieves a cookie it automatically saves it and then send it along all future requests
// made to the same server.

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true //cookie cannot be modified or deleted by the browser.
    // If httpOnly is true, the cookie will be sent not via client JS but via HTTP(S)
  };
  //If secure is true cookie will only be sent on an encrypted connection(HTTPS).
  //But we will only use secure option in production so that we can test in development
  //even though as we are not using https in postman
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // to not show password along with the user data, but we do not save it so it persists in DB.
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user
    }
  });
};
//-----------------------------------------------------------------------------------

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt
  });

  //Creating JWT token and loging in user just as he signup
  createSendToken(newUser, 201, res);
});
//-----------------------------------------------------------------------------------

// LOGIN
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist in request body
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  // 2) Check if user exists in database && password is correct
  const user = await User.findOne({ email: email }).select("+password");
  // To select properties which are not selected by default in the schema
  // for ex: password in this case, we use + in front of the field to
  // explicitly select it

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }
  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});
//---------------------------------------------------------------------------------

// LOGOUT
// Generally in the jwt(token system) we just delete the cookie for logout.
// But as we are using extra security and setting httpOnly: true on the cookie, we
// directly delete it.
// SOLUTION: we just send another cookie from the server with the same name so that it
// will get replaced with some dummy data and very short expiration time
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 5 * 1000) //dummy cookie expires after 5 sec
  });
  res.status(200).json({ status: "success" });
};
//---------------------------------------------------------------------------------

// AUTHENTICATION
// a middleware function to protect routes from unauthorised access
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1) Getting token and check if it exist

  // In express request headers are accesssed using req.headers
  // Auth headers are sent on Authorization header like
  // "Authorization" : "Bearer klfspookajgjakljosdfreorjlkajfdoajoeirjoejro"
  // the random string is token. Tokens are sent in auth headers
  if (
    //accessing token using authorization headers
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    //accessing token using cookies
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access", 401)
    );
  }

  // 2) Verification of token

  // Promisify is a funtion in the built in util library
  // It is basically used to convert a method that returns responses using
  // a callback function to return responses in a promise object
  // here jwt.verify accepts a third arguement as a callback function
  // but we are using promises in our, so to keep our code consistent
  // we have used promisify to return the response as a promise rather than
  // a callback function and its resolved value is stored in decoded
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token does no longer exits", 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // After all the above verification steps
  // Now we can grant access to the PROTECTED ROUTE
  req.user = currentUser; //for future use
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // we send the logged user details to the pug template using res.locals
      // all the properties on the res.locals object is accessible by the pug template.
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
//-----------------------------------------------------------------------------------

// AUTHORIZATION
// a middleware function to restrict user actions according to their roles
// and authorize then accordingly

// we cannot pass arguements in middleware functions but here we need to
// roles as arguements. So we use a wrapper funtion that will return the
// middleware function that we want to create
exports.restrictTo = (...roles) => {
  // now our returned middleware function will have access to the roles array
  // because of closures.
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};
//--------------------------------------------------------------------------------------

//RESETTING PASSWORD
exports.forgotPassword = async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There us no user with that email address.", 404));
  }

  // 2) Generate the random token
  const resetToken = user.createPasswordResetToken();
  // saving the reset Token in the db, and turning the validators off
  // beacause we are resetting password, so we are not passing any password
  // and after validators are always executed. So we have to explicitly turn off
  // the validators so there would be no error due to absence of a required
  // field(password)
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/vi/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forgot your password, please ignore this email!`;

  //here we have to use try and catch block because we have to do some things
  //other than showing the error to user using the catchAsync function
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (vaid for 10 min)",
      message
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!"
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
};

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token and check if token has not expired
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) Check if there is a user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  //In cases of passwords and other fields when we want to run validators again
  //we always use save() method rather than using update
  await user.save();

  // 3) Update changedPasswrodAt Property for the user
  // Done using pre save middleware in the usermodel

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

//-------------------------------------------------------------------------------------
//UPDATING PASSWORD FOR LOGGED IN USERS
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  //2) Check if POSTed current passord is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Incorrect password", 401));
  }
  //3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4) Log user in, send JWT
  createSendToken(user, 200, res);
});
