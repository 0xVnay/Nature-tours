const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"]
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"]
  },
  photo: String,
  role: {
    type: String,
    // enum is used to allow only certain values
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user"
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    //To not send password whenever there is a get request to the user
    select: false,
    minlength: 8
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // This only works on 'CREATE' and 'SAVE'
      validator: function(el) {
        return el === this.password;
      },
      message: "Passwords are not the same!"
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  //keep track whether user account is active or deactive
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});
//--------------------------------------------------------------------------------------
// DOCUMENT MIDDLEWARES

// middleware to store password in encrypted form in the database, when
// creating the user first time
userSchema.pre("save", async function(next) {
  //this pre save middeleware not runs if password was not actually modified.
  if (!this.isModified("password")) return next();

  // Hash the password
  this.password = await bcrypt.hash(this.password, 12);

  //We only need passwordConfirm to confirm that user entered correct password.
  //After validation we do not want it to persist in the database that is why
  //we set it to undefined
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function(next) {
  //this pre save middeleware not runs if password was not modified or
  // the document is new.
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // 1sec early to ensure that password is changed early than the token is created.
  next();
});

//---------------------------------------------------------------------------------
// QUERY MIDDLEWARES
// middleware to not show deactivated users before any type of find query
// '/^find/' is a regex to find all queries starting from find

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

//---------------------------------------------------------------------------------
//INSTANCE METHODS

//we create instance methods in this way so that it is available for all User instances
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  //as in password property select is set to false we cannot access password
  //using this.password that is why we pass the password while calling the function
  return bcrypt.compare(candidatePassword, userPassword);
};

// this method checks whether the password has been changed after token was
// issued or not. It uses 'passwordChangedAt' property which is initially
// undefined for all user and every time password is changed for a user
// 'passwordChangedAt' is updated to that time.

// changedPasswordAfter -> input: JWT timestamp when the token was issued
// return: true if password was changed after the JWT timestamp, else false
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

//this method create a random token to be send to user email for resetting password
userSchema.methods.createPasswordResetToken = function() {
  // this random token does not need to be very cyptographically strong because
  // we only use it as an OTP. So we use built in crypto module
  const resetToken = crypto.randomBytes(32).toString("hex");

  // save encypted version of reset token in database and send the user normal
  // random token(OTP) to his email and then compare encypted version of the
  // token(OTP) to saved token in the database.
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // passwordResetExpires = current time + 10min
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
