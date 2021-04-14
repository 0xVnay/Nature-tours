const Tour = require("../models/tourModel");
const AppError = require("../utilities/appError");
const catchAsync = require("../utilities/catchAsync");

exports.getOverview = catchAsync(async (req, res) => {
  //1) Get tour data from collection
  const tours = await Tour.find();

  //2) Build template and Render that template using tour data from 1)
  res.status(200).render("overview", {
    title: "All Tours",
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  //1) Get tour data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: "reviews",
    fields: "review rating user",
    populate: {
      path: "user",
      fields: "name photo"
    }
  });

  if (!tour) {
    return next(new AppError("There is no tour with that name!", 404));
  }



  //2) Build template and Render template using data from 1)
  res.status(200).render("tour", {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render("login", { title: "Log into your account" });
};

exports.getAccount = (req, res) => {
  // We do not need to fetch the user details, as it is already fetched and assigned to
  // req.user by the protect middleware.
  res.status(200).render("account", { title: "Your account" });
};
