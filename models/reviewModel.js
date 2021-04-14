const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty!"]
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour."]
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user."]
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: "tour",
  //   select: "name"
  // }).populate({
  //   path: "author",
  //   select: "name photo"
  // });

  this.populate({
    path: "author",
    select: "name photo"
  });
  next();
});

// Here we used static method because we want to use aggregate method which is available
// on model itself and in static methods this points to the model and in instance methods
// this points to the document.
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  //In statics methods this points to the Model
  //1) Calculating the stats
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" }
      }
    }
  ]);
  console.log(stats);

  //2) Updating it in the Tour document
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5 // default when there is no rating.
    });
  }
};

//PREVENT DUPLICATE REVIEWS: A user can have only one review on each tour, it means 
//combination of user & tour must be unique which can be achieved using COMPOSITE INDEX 
//and setting unique to true
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//This doc. middleware call calcAverageRatings() every time a review doc. is CREATED.
//Here we are using post save, because for the above cal...() function we want to match
//all the reviews including the current one, which can only be accessed once the document
//is saved.
reviewSchema.post("save", function(next) {
  //this points to current document (review)

  //Below we wanted to use Review.calcAverageRatings(this.tour) but Review is defined
  //after this function so we use this.constructor which also points to this model withourt
  //using the name Review
  this.constructor.calcAverageRatings(this.tour);
});

//Now when a review is UPDATED or DELETED
//findByIdAndUpdate is bts findOneAndUpdate(), and similarly findByIdAndDelete.
//for both these hooks we do not have document middleware, we have query middlewares
//for these.So we cannot use this.constructor to access the model as this points to the query
//not the doc. So below is the solution around this situation
reviewSchema.pre(/^findOneAnd/, async function(next) {
  //we execute the cuurent query and that will return the currect document being processed.
  this.r = await this.findOne(); //r is the current review document
  //ANOTHER PROBLEM: now here we cannot use r.constructor.calcAverageRatings() as we will
  //be processing non updated document beasuse in r data is not updated at this point.
  //Also we cannot use a post query middleware here because we will not have access to the
  //query object as it will already be executed completely.
  //SOLUTION: we use another post query middleware after this and PASS THE 'R' DOCUMENT
  //FROM PRE MIDDLEWARE TO THE POST MIDDLEWARE.
  console.log(this.r);
  next();
});
//now document is updated and query has also finished.
//WE CREATE A PROPERTY(this.r) ON THIS VAIRABLE ON THE ABOVE FUNCTION WHICH MEANS
//'r' is accessible in both pre and post qaery middlewares.
reviewSchema.post(/^findOneAnd/, async function(next) {
  // this.r : review document (instance)
  // this.r.constructor: Review model
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
