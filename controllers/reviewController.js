const Review = require("../models/reviewModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utilities/catchAsync");

// a middleware to run before the createReview to set the Ids on req.body
// if there is no tourId and userID on the request body.
exports.setTourUserIds = (req, res, next) => {
  // allow nested routes.
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
