const User = require("../models/userModel");
const AppError = require("../utilities/appError");
const catchAsync = require("../utilities/catchAsync");
const factory = require("./handlerFactory");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// GET DATA OF CURRENTLY LOGGED IN USER
exports.getMe = catchAsync(async (req, res, next) => {
  //we will use getOne factory func, but it uses req.params.id and here we have id on
  //req.user.id. So we use this middleware function first on the GET /me route to set
  //req.params.id using req.user.id and then use getUser() to fetch the user details.
  req.params.id = req.user.id;
  next();
});

//-----------------------------------------------------------------------------------
// UPDATES DATA OF CURRENTLY LOGGED IN USER
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword",
        400
      )
    );
  }
  // 2) Update user document

  // this function filter unwanted field names that are not allowed to be
  // updated.For example a user should not be able to update his role in
  // this case, but only his name and email.
  const filteredBody = filterObj(req.body, "name", "email");
  // Here we can use findByIdAndUpdate rather than user.save() because we are not
  // dealing with sensitive data like passwords
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser
    }
  });
});

//-------------------------------------------------------------------------------------
// DEACTIVATE CURRENTLY LOGGED IN USER

// We do not delete a user account, we deactivate it so that in future
// a user can activate again his account.

// We set the active property false and use a QUERY MIDDLEWARE in the
// user model to not use deactivated users before any type of query.
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null
  });
});

//-------------------------------------------------------------------------------------
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
//Do not update passwords with this function as factory function here uses findByIdAndUpdate
//and not the save() method, so the validators and encryption will not rum
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use Signup insted"
  });
};
