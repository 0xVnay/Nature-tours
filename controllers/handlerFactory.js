const catchAsync = require("../utilities/catchAsync");
const AppError = require("../utilities/appError");
const APIFeatures = require("../utilities/apiFeatures");

//FACTORY FUNCTIONS are general funtions that return some other funtions according to
//the input given

//this function provide a getAll functions for various models like User,Tours,Reviews
exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    //To allow for nested GET reviews on tour(the 3 lines code below is only for
    //get all reviews on a tour)
    //IT'S BASICALLY A SMALL HACK OR WORKAROUND FOR NOT WRITTING THE GET ALL REVIEWS SEPARATELY
    let filter = {};
    //for GET /api/v1/reviews all reviews are fetched.
    //for GET /api/v1/tours/:tourId/reviews only reviews for "tourId" are fetched
    if (req.params.tourId) filter = { tour: req.params.tourId };
    //for all other cases filter = {} and we fetch all the documents.

    //BUILD QUERY
    //We build our query by chaining different query methods to features.query
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    //EXECUTE QUERY
    const doc = await features.query;

    //SEND RESPONSE
    res.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc
      }
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    // populate is used to populate the referenced fields with the data according
    // to IDs stored in them.
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query.populate("reviews");

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc
      }
    });
  });

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      data: null
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: {
        data: doc
      }
    });
  });
